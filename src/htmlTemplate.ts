import * as fs from "fs";
import * as path from "path";
import { getLogoPath, getVendorAssetPath } from "./paths";

function readAsset(assetPath: string): string {
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
  author?: string;
  documentDate?: string;
  bodyHtml: string;
  renderMermaid: boolean;
  mermaidTheme: string;
  extensionPath?: string;
  showLogo?: boolean;
  customLogoPath?: string;
}): string {
  const githubCss = readAsset(
    getVendorAssetPath(options.extensionPath, "github-markdown.css")
  );
  const highlightCss = readAsset(
    getVendorAssetPath(options.extensionPath, "highlight-github.css")
  );
  const mermaidScript = options.renderMermaid
    ? readAsset(getVendorAssetPath(options.extensionPath, "mermaid.min.js"))
    : "";

  const brandingLogoPath =
    options.showLogo !== false ? getLogoPath(options.extensionPath) : undefined;

  const brandingLogoDataUri = brandingLogoPath
    ? readImageAsDataUri(brandingLogoPath)
    : undefined;

  const coverLogoDataUri = options.customLogoPath
    ? readImageAsDataUri(options.customLogoPath)
    : undefined;

  const hasCover =
    Boolean(options.author || options.documentDate || coverLogoDataUri);

  const coverBlock = hasCover
    ? `<section class="doc-cover">
      ${coverLogoDataUri ? `<img src="${coverLogoDataUri}" alt="Document logo" class="doc-cover-logo" />` : ""}
      <h1 class="doc-cover-title">${escapeHtml(options.title)}</h1>
      ${options.author ? `<p class="doc-cover-meta">${escapeHtml(options.author)}</p>` : ""}
      ${options.documentDate ? `<p class="doc-cover-meta">${escapeHtml(options.documentDate)}</p>` : ""}
    </section>`
    : "";

  const poweredByFooter =
    brandingLogoDataUri
      ? `<footer class="pdf-powered-by">
      <img src="${brandingLogoDataUri}" alt="MD-PDF Exporter" class="pdf-powered-by-logo" />
      <span>Powered by MD-PDF Exporter</span>
    </footer>`
      : "";

  // __mermaidReady is set in `finally` so the exporter never waits out the full
  // timeout because of one bad diagram or a script that failed to load.
  const mermaidInit = options.renderMermaid
    ? `
      <script>
        (async function () {
          function showError(block, source, error) {
            const box = document.createElement("div");
            box.className = "mermaid-error";
            const title = document.createElement("strong");
            title.textContent = "Mermaid diagram could not be rendered";
            const detail = document.createElement("div");
            detail.className = "mermaid-error-detail";
            detail.textContent = String((error && error.message) || error || "Unknown error");
            const code = document.createElement("pre");
            code.textContent = source;
            box.append(title, detail, code);
            block.replaceWith(box);
          }

          const blocks = Array.from(document.querySelectorAll("pre.mermaid"));
          const sources = new Map(blocks.map((block) => [block, block.textContent || ""]));

          try {
            if (!blocks.length) {
              return;
            }

            if (typeof mermaid === "undefined") {
              blocks.forEach((block) =>
                showError(block, sources.get(block), "Mermaid library failed to load")
              );
              return;
            }

            mermaid.initialize({
              startOnLoad: false,
              theme: ${JSON.stringify(options.mermaidTheme)},
              securityLevel: "loose",
              flowchart: { htmlLabels: true, useMaxWidth: true },
              sequence: { useMaxWidth: true },
            });

            const valid = [];
            for (const block of blocks) {
              try {
                await mermaid.parse(sources.get(block));
                valid.push(block);
              } catch (error) {
                showError(block, sources.get(block), error);
              }
            }

            if (valid.length) {
              try {
                await mermaid.run({ nodes: valid, suppressErrors: true });
              } catch (error) {
                console.error("Mermaid render failed", error);
              }
            }

            valid.forEach((block) => {
              if (block.isConnected && !block.querySelector("svg")) {
                showError(block, sources.get(block), "Diagram did not render");
              }
            });
          } catch (error) {
            console.error("Mermaid setup failed", error);
          } finally {
            window.__mermaidReady = true;
          }
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
      size: auto;
    }

    * {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #24292f;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
    }

    .page {
      width: 100%;
      margin: 0;
      padding: 0;
    }

    .markdown-body {
      min-width: 0 !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
      font-size: 11pt;
      line-height: 1.6;
      word-wrap: break-word;
      overflow-wrap: anywhere;
    }

    .markdown-body > :first-child {
      margin-top: 0;
    }

    .markdown-body h1 {
      font-size: 1.75em;
      margin-top: 0;
      margin-bottom: 0.6em;
      padding-bottom: 0.25em;
      border-bottom: 1px solid #d0d7de;
      page-break-after: avoid;
    }

    .markdown-body h2 {
      font-size: 1.4em;
      margin-top: 1.4em;
      margin-bottom: 0.5em;
      padding-bottom: 0.2em;
      border-bottom: 1px solid #d0d7de;
      page-break-after: avoid;
    }

    .markdown-body h3,
    .markdown-body h4 {
      margin-top: 1.2em;
      margin-bottom: 0.4em;
      page-break-after: avoid;
    }

    .markdown-body p,
    .markdown-body ul,
    .markdown-body ol,
    .markdown-body blockquote,
    .markdown-body pre {
      margin-top: 0;
      margin-bottom: 0.75em;
    }

    .markdown-body ul,
    .markdown-body ol {
      padding-left: 1.5em;
    }

    .markdown-body li + li {
      margin-top: 0.25em;
    }

    .markdown-body li > p {
      margin-bottom: 0.35em;
    }

    /* Long tables may span pages (rows stay whole, header repeats);
       applyPrintBreakRules keeps short ones together. */
    .markdown-body table {
      display: table;
      width: 100%;
      max-width: 100%;
      border-collapse: collapse;
      margin: 1em 0;
      font-size: 0.92em;
    }

    .markdown-body thead {
      display: table-header-group;
    }

    .markdown-body tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .markdown-body th,
    .markdown-body td {
      border: 1px solid #d0d7de;
      padding: 6px 10px;
      text-align: left;
      vertical-align: top;
      word-break: break-word;
    }

    .markdown-body th {
      background: #f6f8fa;
      font-weight: 600;
    }

    .markdown-body img,
    .markdown-body svg {
      max-width: 100%;
      height: auto;
    }

    /* An image is one unbreakable box: cap it at a page so it is not sliced. */
    .markdown-body img {
      max-height: var(--print-max-height, 240mm);
      object-fit: contain;
      break-inside: avoid;
    }

    /* Emoji drawn as images by rasterizeEmojiForPrint: sized inline, sit in text. */
    .markdown-body img.emoji-glyph {
      display: inline;
      max-width: none;
      max-height: none;
      margin: 0;
      background: transparent;
    }

    .markdown-body code {
      font-size: 0.9em;
    }

    .doc-cover {
      margin-bottom: 2em;
      padding-bottom: 1.5em;
      border-bottom: 1px solid #d0d7de;
      page-break-after: always;
      text-align: center;
    }

    .markdown-body img.doc-cover-logo {
      height: 48px;
      width: auto;
      max-width: 200px;
      object-fit: contain;
      margin-bottom: 1em;
    }

    .doc-cover-title {
      margin: 0 0 0.5em;
      font-size: 2em;
      line-height: 1.2;
      border-bottom: none;
    }

    .doc-cover-meta {
      margin: 0.25em 0 0;
      color: #57606a;
      font-size: 0.95em;
    }

    .mermaid-block {
      margin: 1.25em 0 1.75em;
      padding: 0;
      text-align: center;
      clear: both;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .mermaid-print-block {
      display: block;
      width: 100%;
    }

    /* Keep section headings with the diagram that follows them. */
    .markdown-body h2:has(+ h3 + .mermaid-block),
    .markdown-body h2:has(+ .mermaid-block) {
      page-break-after: avoid;
      break-after: avoid-page;
    }

    .markdown-body h3:has(+ .mermaid-block) {
      page-break-after: avoid;
      break-after: avoid-page;
    }

    .markdown-body h3 + .mermaid-block {
      margin-top: 0.35em;
    }

    .diagram-section {
      margin: 1em 0 1.75em;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .mermaid-block pre.mermaid {
      margin: 0;
      padding: 0;
      border: none;
      background: transparent;
      overflow: visible;
    }

    .mermaid-block svg {
      display: block;
      margin: 0 auto;
      max-width: 100%;
      height: auto;
    }

    .mermaid-error {
      color: #cf222e;
      background: #fff8f8;
      border: 1px solid #ff818266;
      padding: 12px;
      border-radius: 6px;
      margin: 1em 0;
      text-align: left;
      white-space: pre-wrap;
      break-inside: avoid;
    }

    .mermaid-error-detail {
      margin: 0.35em 0 0.6em;
      font-size: 0.9em;
    }

    .markdown-body .mermaid-error pre {
      margin: 0;
      color: #24292f;
      font-size: 0.8em;
    }

    pre.hljs {
      overflow-x: auto;
      font-size: 0.85em;
      line-height: 1.45;
    }

    /* Paper cannot scroll: wrap long code lines instead of clipping them. */
    @media print {
      .markdown-body pre,
      .markdown-body pre code {
        white-space: pre-wrap !important;
        overflow-wrap: anywhere;
        overflow: visible !important;
      }
    }

    .pdf-powered-by {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 2.5em;
      padding-top: 1em;
      border-top: 1px solid #d0d7de;
      color: #57606a;
      font-size: 9pt;
      page-break-inside: avoid;
    }

    /* Needs .markdown-body img specificity, or the logo renders full width. */
    .markdown-body img.pdf-powered-by-logo {
      height: 20px;
      width: auto;
      object-fit: contain;
      opacity: 0.85;
    }
  </style>
  ${options.renderMermaid ? `<script>${mermaidScript}</script>` : ""}
</head>
<body>
  <div class="page markdown-body">
    ${coverBlock}
    ${options.bodyHtml}
    ${poweredByFooter}
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
