import * as fs from "fs";
import { ExporterConfig } from "./config";
import { exportMarkdownToPdf } from "./pdfExporter";

const [markdownPath, outputPath] = process.argv.slice(2);
const configJson = process.env.PDFEXPORTER_CONFIG;
const extensionPath = process.env.PDFEXPORTER_EXTENSION_PATH;
// Optional file holding the Markdown to export instead of markdownPath's content.
const contentFile = process.env.PDFEXPORTER_CONTENT_FILE;

if (!markdownPath || !configJson) {
  console.error(
    "Usage: exportCli <markdownPath> [outputPath] (with PDFEXPORTER_CONFIG env set)"
  );
  process.exit(1);
}

const config = JSON.parse(configJson) as ExporterConfig;

exportMarkdownToPdf({
  markdownPath,
  markdownContent: contentFile ? fs.readFileSync(contentFile, "utf8") : undefined,
  outputPath,
  config,
  extensionPath,
})
  .then((writtenPath) => {
    console.log(writtenPath);
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
