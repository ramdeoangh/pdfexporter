import * as fs from "fs";
import * as path from "path";

function readAsset(relativePath: string): string {
  const extensionRoot = path.resolve(__dirname, "..");
  const assetPath = path.join(extensionRoot, relativePath);
  return fs.readFileSync(assetPath, "utf8");
}

export function buildHtmlDocument(options: {
  title: string;
  bodyHtml: string;
  renderMermaid: boolean;
  mermaidTheme: string;
}): string {
  const githubCss = readAsset(
    path.join("node_modules", "github-markdown-css", "github-markdown.css")
  );
  const highlightCss = readAsset(
    path.join("node_modules", "highlight.js", "styles", "github.css")
  );
  const mermaidScript = options.renderMermaid
    ? readAsset(
        path.join("node_modules", "mermaid", "dist", "mermaid.min.js")
      )
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
