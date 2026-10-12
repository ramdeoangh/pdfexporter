import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { pathToFileURL } from "url";
import puppeteer, { Browser } from "puppeteer-core";
import { ExporterConfig } from "./config";
import { getBrowserLaunchArgs, resolveBrowserExecutable } from "./browser";
import { resolveExportSettings } from "./exportSettings";
import { parseMarkdownDocument } from "./frontMatter";
import { buildHtmlDocument } from "./htmlTemplate";
import { processMarkdown } from "./markdownProcessor";
import { buildPdfHeaderFooterTemplates } from "./pdfHeaderFooter";
import {
  applyPrintBreakRules,
  fitMermaidDiagramsForPrint,
  getPrintableAreaPx,
  rasterizeEmojiForPrint,
  wrapDiagramSectionsForPrint,
} from "./printLayout";

/** Longest wait for images before printing without the ones still loading. */
const IMAGE_LOAD_TIMEOUT_MS = 15000;

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
    try {
      browser = await puppeteer.launch({
        executablePath: browserExecutable,
        headless: true,
        args: getBrowserLaunchArgs(userDataDir),
        timeout: settings.exportTimeout,
      });
    } catch (error) {
      throw new Error(
        `Could not start the browser (${browserExecutable}): ${errorMessage(error)}\n\n` +
          "Set pdfexporter.executablePath to Chrome or Edge if auto-detection fails."
      );
    }

    const page = await browser.newPage();
    const printableArea = getPrintableAreaPx(settings);

    // Render, measure and print with the same CSS: print media, light theme,
    // and a viewport as wide as the printable column.
    await page.emulateMediaType("print");
    await page.emulateMediaFeatures([
      { name: "prefers-color-scheme", value: "light" },
    ]);
    await page.setViewport({
      width: printableArea.widthPx,
      height: Math.max(printableArea.heightPx * 3, 2400),
    });

    // "networkidle0" never settles if a remote image hangs (proxy, VPN), which
    // failed the whole export. Wait for the DOM, then give images a bounded wait.
    await page.goto(pathToFileURL(tempHtmlPath).href, {
      waitUntil: "domcontentloaded",
      timeout: settings.exportTimeout,
    });

    try {
      await page.waitForFunction("window.__mermaidReady === true", {
        timeout: settings.exportTimeout,
      });
    } catch {
      throw new Error(
        `Mermaid diagrams did not finish rendering within ${Math.round(settings.exportTimeout / 1000)}s. ` +
          "Increase pdfexporter.exportTimeout for very large diagrams."
      );
    }

    await page.evaluate(rasterizeEmojiForPrint);

    await page.evaluate(async (imageTimeoutMs: number) => {
      const images = Array.from(document.images);
      images.forEach((image) => {
        image.loading = "eager";
      });

      const pending = images
        .filter((image) => !image.complete)
        .map(
          (image) =>
            new Promise<void>((resolve) => {
              image.addEventListener("load", () => resolve(), { once: true });
              image.addEventListener("error", () => resolve(), { once: true });
            })
        );

      await Promise.race([
        Promise.all(pending),
        new Promise((resolve) => setTimeout(resolve, imageTimeoutMs)),
      ]);

      // Drop requests still hanging so printing is not held up by them. Must run
      // before fonts.ready, which otherwise waits for the whole page to load.
      window.stop();
      await document.fonts.ready;
    }, Math.min(IMAGE_LOAD_TIMEOUT_MS, settings.exportTimeout));

    await page.evaluate(wrapDiagramSectionsForPrint);
    await page.evaluate(applyPrintBreakRules, printableArea.heightPx);
    await page.evaluate(
      fitMermaidDiagramsForPrint,
      printableArea.widthPx,
      printableArea.heightPx
    );

    // Allow scaled diagram layout to settle before print.
    await new Promise((resolve) => setTimeout(resolve, 100));

    const pdf = await page.pdf({
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
      // Default is 30s, which long documents with many diagrams can exceed.
      timeout: Math.max(settings.exportTimeout, 30000),
    });

    writePdf(outputPath, pdf);

    return outputPath;
  } finally {
    if (browser) {
      await browser.close().catch(() => browser?.process()?.kill());
    }

    cleanupPath(tempHtmlPath);
    cleanupDir(userDataDir);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function writePdf(outputPath: string, pdf: Uint8Array): void {
  try {
    fs.writeFileSync(outputPath, pdf);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EBUSY" || code === "EPERM" || code === "EACCES") {
      throw new Error(
        `Cannot write ${path.basename(outputPath)}: the file is open in another program ` +
          "(for example a PDF viewer) or the folder is read-only. Close it and export again."
      );
    }
    throw error;
  }
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
  // Relative paths are relative to the Markdown file, not the process cwd
  // (which is the extension's install folder when exporting in a subprocess).
  const outputDir = config.outputDirectory
    ? path.resolve(path.dirname(markdownPath), config.outputDirectory)
    : path.dirname(markdownPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  return path.join(outputDir, `${baseName}.pdf`);
}
