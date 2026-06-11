import { createRequire } from "module";
import { pathToFileURL } from "url";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Load compiled modules from dist by running through a small inline build
// Use tsx to run TypeScript directly
const markdownPath =
  process.argv[2] ??
  "C:\\Connectors\\application\\studio\\runtime\\docs\\FACTORY-31881-AppVersion-SDD.md";

const { exportMarkdownToPdf } = await import(
  pathToFileURL(path.join(__dirname, "..", "src", "pdfExporter.ts")).href
).catch(async () => {
  // fallback: dynamic require won't work for ts; use child process
  const { execSync } = await import("child_process");
  execSync(`npx tsx "${path.join(__dirname, "run-export.ts")}" "${markdownPath}"`, {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
  });
  process.exit(0);
});

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
};

const outputPath = await exportMarkdownToPdf({ markdownPath, config });
console.log("OK:", outputPath);
