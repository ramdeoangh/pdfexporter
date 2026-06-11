import * as fs from "fs";
import * as path from "path";
import MarkdownIt from "markdown-it";
import type Renderer from "markdown-it/lib/renderer.mjs";
import type Token from "markdown-it/lib/token.mjs";
import type { Options } from "markdown-it";
import hljs from "highlight.js";

export interface ProcessMarkdownOptions {
  markdownPath: string;
  renderMermaid: boolean;
}

function toFileUrl(filePath: string): string {
  const resolved = path.resolve(filePath);
  const normalized = resolved.replace(/\\/g, "/");
  if (/^[a-zA-Z]:\//.test(normalized)) {
    return `file:///${encodeURI(normalized)}`;
  }
  return `file://${encodeURI(normalized)}`;
}

function resolveImageSrc(src: string, markdownDir: string): string {
  if (!src || src.startsWith("data:") || /^https?:\/\//i.test(src)) {
    return src;
  }

  const absolutePath = path.isAbsolute(src)
    ? src
    : path.resolve(markdownDir, src);

  if (!fs.existsSync(absolutePath)) {
    return src;
  }

  return toFileUrl(absolutePath);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createMarkdownIt(
  markdownDir: string,
  renderMermaid: boolean
): MarkdownIt {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight(code: string, language: string): string {
      if (language && hljs.getLanguage(language)) {
        try {
          return `<pre class="hljs"><code>${hljs.highlight(code, {
            language,
            ignoreIllegals: true,
          }).value}</code></pre>`;
        } catch {
          // fall through
        }
      }

      return `<pre class="hljs"><code>${escapeHtml(code)}</code></pre>`;
    },
  });

  const defaultImageRule =
    md.renderer.rules.image ??
    ((tokens: Token[], idx: number, options: Options, _env, self: Renderer) =>
      self.renderToken(tokens, idx, options));

  md.renderer.rules.image = (
    tokens: Token[],
    idx: number,
    options: Options,
    env,
    self: Renderer
  ) => {
    const token = tokens[idx];
    const src = token.attrGet("src");
    if (src) {
      token.attrSet("src", resolveImageSrc(src, markdownDir));
    }
    return defaultImageRule(tokens, idx, options, env, self);
  };

  const defaultFenceRule =
    md.renderer.rules.fence ??
    ((tokens: Token[], idx: number, options: Options, _env, self: Renderer) =>
      self.renderToken(tokens, idx, options));

  md.renderer.rules.fence = (
    tokens: Token[],
    idx: number,
    options: Options,
    env,
    self: Renderer
  ) => {
    const token = tokens[idx];
    const info = (token.info || "").trim().toLowerCase();

    if (renderMermaid && info === "mermaid") {
      const diagram = token.content.trim();
      return `<div class="mermaid-block"><pre class="mermaid">${md.utils.escapeHtml(diagram)}</pre></div>`;
    }

    return defaultFenceRule(tokens, idx, options, env, self);
  };

  return md;
}

export function processMarkdown(
  markdown: string,
  options: ProcessMarkdownOptions
): string {
  const markdownDir = path.dirname(options.markdownPath);
  const md = createMarkdownIt(markdownDir, options.renderMermaid);
  return md.render(markdown);
}
