import * as fs from "fs";
import * as path from "path";
import { getLogoPath } from "./paths";

function getExtensionRoot(extensionPath?: string): string {
  if (extensionPath) {
    return extensionPath;
  }

  return path.resolve(__dirname, "..", "..");
}

function readAsset(relativePath: string, extensionPath?: string): string {
  const assetPath = path.join(getExtensionRoot(extensionPath), relativePath);
  return fs.readFileSync(assetPath, "utf8");
}

function readImageAsDataUri(imagePath: string): string | undefined {
  if (!fs.existsSync(imagePath)) {
    return undefined;
  }

  const buffer = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath).slice(1).toLowerCase();
  const mime =
    ext === "png"
      ? "image/png"
      : ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : ext === "svg"
          ? "image/svg+xml"
          : "application/octet-stream";

  return `data:${mime};base64,${buffer.toString("base64")}`;
}

export function buildHtmlDocument(options: {
  title: string;
  bodyHtml: string;
  renderMermaid: boolean;
  mermaidTheme: string;
  extensionPath?: string;
  showLogo?: boolean;
}): string {
  const githubCss = readAsset(
    path.join("node_modules", "github-markdown-css", "github-markdown.css"),
    options.extensionPath
  );
  const highlightCss = readAsset(
    path.join("node_modules", "highlight.js", "styles", "github.css"),
    options.extensionPath
  );
  const mermaidScript = options.renderMermaid
    ? readAsset(
        path.join("node_modules", "mermaid", "dist", "mermaid.min.js"),
        options.extensionPath
      )
    : "";

  const logoDataUri =
    options.showLogo !== false
      ? readImageAsDataUri(getLogoPath(options.extensionPath))
      : undefined;

  const logoHeader = logoDataUri
    ? `<header class="pdf-header"><img src="${logoDataUri}" alt="MD-PDF Exporter" class="pdf-logo" /></header>`
    : "";

  const mermaidInit = options.renderMermaid
    ? `
      <script>
        (async function () {
          const blocks = Array.from(document.querySelectorAll(".mermaid"));
          if (!blocks.length) {
            window.__mermaidReady = true;
            return;
          }

          mermaid.initialize({
            startOnLoad: false,
            theme: ${JSON.stringify(options.mermaidTheme)},
            securityLevel: "loose",
            flowchart: { htmlLabels: true, useMaxWidth: true },
            sequence: { useMaxWidth: true },
          });

          try {
            await mermaid.run({ nodes: blocks });
          } catch (error) {
            console.error("Mermaid render failed", error);
            blocks.forEach((block) => {
              if (!block.querySelector("svg")) {
                block.innerHTML =
                  '<pre class="mermaid-error">Failed to render diagram</pre>';
              }
            });
          }

          window.__mermaidReady = true;
        })();
      </script>
    `
    : `<script>window.__mermaidReady = true;</script>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(options.title)}</title>
  <style>
    ${githubCss}
    ${highlightCss}

    @page {
      margin: 0;
    }

    body {
      margin: 0;
      background: #ffffff;
      color: #24292f;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    }

    .page {
      box-sizing: border-box;
      max-width: 980px;
      margin: 0 auto;
      padding: 24px;
    }

    .pdf-header {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid #d0d7de;
      page-break-after: avoid;
    }

    .pdf-logo {
      height: 36px;
      width: auto;
      max-width: 180px;
      object-fit: contain;
    }

    .markdown-body {
      box-sizing: border-box;
      min-width: 200px;
      max-width: 100%;
    }

    .markdown-body img,
    .markdown-body svg {
      max-width: 100%;
      height: auto;
    }

    .mermaid-block {
      margin: 16px 0;
      text-align: center;
      page-break-inside: avoid;
    }

    .mermaid-block svg {
      display: inline-block;
      max-width: 100%;
    }

    .mermaid-error {
      color: #cf222e;
      background: #fff8f8;
      border: 1px solid #ff818266;
      padding: 12px;
      border-radius: 6px;
      text-align: left;
      white-space: pre-wrap;
    }

    pre.hljs {
      overflow-x: auto;
      page-break-inside: avoid;
    }

    table {
      page-break-inside: avoid;
    }

    h1, h2, h3, h4, h5, h6 {
      page-break-after: avoid;
    }
  </style>
  ${options.renderMermaid ? `<script>${mermaidScript}</script>` : ""}
</head>
<body>
  <div class="page markdown-body">
    ${logoHeader}
    ${options.bodyHtml}
  </div>
  ${mermaidInit}
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
