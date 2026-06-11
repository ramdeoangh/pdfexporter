import { ExporterConfig } from "./config";
import { exportMarkdownToPdf } from "./pdfExporter";

const markdownPath = process.argv[2];
const configJson = process.env.PDFEXPORTER_CONFIG;
const extensionPath = process.env.PDFEXPORTER_EXTENSION_PATH;

if (!markdownPath || !configJson) {
  console.error("Usage: exportCli <markdownPath> (with PDFEXPORTER_CONFIG env set)");
  process.exit(1);
}

const config = JSON.parse(configJson) as ExporterConfig;

exportMarkdownToPdf({
  markdownPath,
  config,
  extensionPath,
})
  .then((outputPath) => {
    console.log(outputPath);
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
