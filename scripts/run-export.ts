import { exportMarkdownToPdf } from "../src/pdfExporter";

const markdownPath =
  process.argv[2] ??
  "C:\\Connectors\\application\\studio\\runtime\\docs\\FACTORY-31881-AppVersion-SDD.md";

const config = {
  outputDirectory: "",
  executablePath: "",
  pageFormat: "A4",
  marginTop: "20mm",
  marginBottom: "20mm",
  marginLeft: "15mm",
  marginRight: "15mm",
  renderMermaid: true,
  mermaidTheme: "default",
  exportTimeout: 60000,
  showLogo: true,
};

exportMarkdownToPdf({
  markdownPath,
  config,
  extensionPath: process.cwd(),
})
  .then((outputPath) => {
    console.log("OK:", outputPath);
  })
  .catch((error: unknown) => {
    console.error(
      "FAILED:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  });
