import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import puppeteer, { Browser } from "puppeteer-core";
import { ExporterConfig } from "./config";
import { getBrowserLaunchArgs, resolveBrowserExecutable } from "./browser";
import { resolveExportSettings } from "./exportSettings";
import { parseMarkdownDocument } from "./frontMatter";
import { buildHtmlDocument } from "./htmlTemplate";
import { processMarkdown } from "./markdownProcessor";
import { buildPdfHeaderFooterTemplates } from "./pdfHeaderFooter";
import {
  fitMermaidDiagramsForPrint,
  getPrintableAreaPx,
} from "./printLayout";

export interface ExportPdfOptions {
  markdownPath: string;
  outputPath?: string;
  config: ExporterConfig;
  extensionPath?: string;
}

export async function exportMarkdownToPdf(
  options: ExportPdfOptions
): Promise<string> {
  const markdownPath = path.resolve(options.markdownPath);
  const rawMarkdown = fs.readFileSync(markdownPath, "utf8");
  const fallbackTitle = path.basename(
    markdownPath,
    path.extname(markdownPath)
  );

  const { content, frontMatter } = parseMarkdownDocument(rawMarkdown);
  const settings = resolveExportSettings({
    config: options.config,
    frontMatter,
    markdownPath,
    fallbackTitle,
  });

  const bodyHtml = processMarkdown(content, {
    markdownPath,
    renderMermaid: settings.renderMermaid,
  });

  const html = buildHtmlDocument({
    title: settings.documentTitle,
    author: settings.author,
    documentDate: settings.documentDate,
    bodyHtml,
    renderMermaid: settings.renderMermaid,
    mermaidTheme: settings.mermaidTheme,
    extensionPath: options.extensionPath,
    showLogo: settings.showLogo,
    customLogoPath: settings.customLogoPath,
  });

  const outputPath =
    options.outputPath ?? resolveOutputPath(markdownPath, settings);

  const browserExecutable = resolveBrowserExecutable(
    settings.executablePath
  );

  if (!browserExecutable) {
    throw new Error(
      "No Chrome or Edge installation found. Set pdfexporter.executablePath in settings."
    );
  }

  const tempHtmlPath = path.join(
    os.tmpdir(),
    `pdfexporter-${Date.now()}-${Math.random().toString(36).slice(2)}.html`
  );

  const userDataDir = path.join(
    os.tmpdir(),
    `pdfexporter-browser-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  fs.writeFileSync(tempHtmlPath, html, "utf8");

  const headerFooter = buildPdfHeaderFooterTemplates(settings);

  let browser: Browser | undefined;

  try {
    browser = await puppeteer.launch({
      executablePath: browserExecutable,
      headless: true,
      args: getBrowserLaunchArgs(userDataDir),
      timeout: settings.exportTimeout,
    });

    const page = await browser.newPage();
    const printableArea = getPrintableAreaPx(settings);

    await page.setViewport({
      width: printableArea.widthPx,
      height: Math.max(printableArea.heightPx * 3, 2400),
    });

    const fileUrl = toFileUrl(tempHtmlPath);

    await page.goto(fileUrl, {
      waitUntil: "networkidle0",
      timeout: settings.exportTimeout,
    });

    await page.waitForFunction("window.__mermaidReady === true", {
      timeout: settings.exportTimeout,
    });

    await page.evaluate(async () => {
      const images = Array.from(document.images);
      await Promise.all(
        images.map(
          (image) =>
            image.complete ||
            new Promise<void>((resolve) => {
              image.addEventListener("load", () => resolve());
              image.addEventListener("error", () => resolve());
            })
        )
      );
    });

    await page.evaluate(fitMermaidDiagramsForPrint, printableArea.widthPx, printableArea.heightPx);

    // Allow scaled diagram layout to settle before print.
    await new Promise((resolve) => setTimeout(resolve, 100));

    await page.pdf({
      path: outputPath,
      format: settings.pageFormat,
      printBackground: true,
      displayHeaderFooter: Boolean(headerFooter),
      headerTemplate: headerFooter?.headerTemplate ?? "<span></span>",
      footerTemplate: headerFooter?.footerTemplate ?? "<span></span>",
      margin: {
        top: settings.marginTop,
        bottom: settings.marginBottom,
        left: settings.marginLeft,
        right: settings.marginRight,
      },
    });

    return outputPath;
  } catch (error) {
    const hint =
      `Browser: ${browserExecutable}. ` +
      "Set pdfexporter.executablePath to Chrome or Edge if auto-detection fails.";
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}\n\n${hint}`);
  } finally {
    if (browser) {
      await browser.close();
    }

    cleanupPath(tempHtmlPath);
    cleanupDir(userDataDir);
  }
}

function toFileUrl(filePath: string): string {
  const normalized = path.resolve(filePath).replace(/\\/g, "/");
  return `file:///${encodeURI(normalized).replace(/#/g, "%23")}`;
}

function cleanupPath(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // ignore cleanup errors
  }
}

function cleanupDir(dirPath: string): void {
  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
}

function resolveOutputPath(
  markdownPath: string,
  config: ExporterConfig
): string {
  const baseName = path.basename(markdownPath, path.extname(markdownPath));
  const outputDir = config.outputDirectory
    ? path.resolve(config.outputDirectory)
    : path.dirname(markdownPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  return path.join(outputDir, `${baseName}.pdf`);
}
