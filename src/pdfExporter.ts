import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import puppeteer, { Browser } from "puppeteer-core";
import { ExporterConfig } from "./config";
import { resolveBrowserExecutable } from "./browser";
import { buildHtmlDocument } from "./htmlTemplate";
import { processMarkdown } from "./markdownProcessor";

export interface ExportPdfOptions {
  markdownPath: string;
  outputPath?: string;
  config: ExporterConfig;
}

export async function exportMarkdownToPdf(
  options: ExportPdfOptions
): Promise<string> {
  const markdownPath = path.resolve(options.markdownPath);
  const markdown = fs.readFileSync(markdownPath, "utf8");
  const title = path.basename(markdownPath, path.extname(markdownPath));

  const bodyHtml = processMarkdown(markdown, {
    markdownPath,
    renderMermaid: options.config.renderMermaid,
  });

  const html = buildHtmlDocument({
    title,
    bodyHtml,
    renderMermaid: options.config.renderMermaid,
    mermaidTheme: options.config.mermaidTheme,
  });

  const outputPath =
    options.outputPath ?? resolveOutputPath(markdownPath, options.config);

  const browserExecutable = resolveBrowserExecutable(
    options.config.executablePath
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

  fs.writeFileSync(tempHtmlPath, html, "utf8");

  let browser: Browser | undefined;

  try {
    browser = await puppeteer.launch({
      executablePath: browserExecutable,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto(`file:///${tempHtmlPath.replace(/\\/g, "/")}`, {
      waitUntil: "networkidle0",
      timeout: options.config.exportTimeout,
    });

    await page.waitForFunction("window.__mermaidReady === true", {
      timeout: options.config.exportTimeout,
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

    await page.pdf({
      path: outputPath,
      format: options.config.pageFormat,
      printBackground: true,
      margin: {
        top: options.config.marginTop,
        bottom: options.config.marginBottom,
        left: options.config.marginLeft,
        right: options.config.marginRight,
      },
    });

    return outputPath;
  } finally {
    if (browser) {
      await browser.close();
    }

    try {
      fs.unlinkSync(tempHtmlPath);
    } catch {
      // ignore cleanup errors
    }
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
