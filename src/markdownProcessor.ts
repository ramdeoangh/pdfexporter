import * as fs from "fs";
import * as path from "path";
import { pathToFileURL } from "url";
import MarkdownIt from "markdown-it";
import type Renderer from "markdown-it/lib/renderer.mjs";
import type Token from "markdown-it/lib/token.mjs";
import type { Options } from "markdown-it";
import hljs from "highlight.js";

type ImageSrcResolver = (src: string, markdownDir: string) => string;

export interface ProcessMarkdownOptions {
  markdownPath: string;
  renderMermaid: boolean;
}

/**
 * markdown-it percent-encodes link targets (`my chart.png` -> `my%20chart.png`),
 * so try the decoded path first and fall back to the literal one.
 */
function resolveLocalImagePath(
  src: string,
  markdownDir: string
): string | undefined {
  if (!src || /^(data:|https?:|file:|vscode-)/i.test(src)) {
    return undefined;
  }

  const withoutQuery = src.replace(/[?#].*$/, "");
  let decoded = withoutQuery;
  try {
    decoded = decodeURI(withoutQuery);
  } catch {
    // malformed escape sequence; use as written
  }

  for (const candidate of [decoded, withoutQuery]) {
    const absolutePath = path.isAbsolute(candidate)
      ? candidate
      : path.resolve(markdownDir, candidate);
    if (fs.existsSync(absolutePath)) {
      return absolutePath;
    }
  }

  return undefined;
}

function resolveImageSrc(src: string, markdownDir: string): string {
  const absolutePath = resolveLocalImagePath(src, markdownDir);
  return absolutePath ? pathToFileURL(absolutePath).href : src;
}

/** Rewrites `src` of `<img>` tags written as raw HTML inside the Markdown. */
function resolveHtmlImageSources(
  html: string,
  markdownDir: string,
  resolveImage: ImageSrcResolver
): string {
  return html.replace(
    /(<img\b[^>]*?\ssrc\s*=\s*)(["'])(.*?)\2/gi,
    (_match, prefix: string, quote: string, src: string) =>
      `${prefix}${quote}${resolveImage(src, markdownDir)}${quote}`
  );
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
  renderMermaid: boolean,
  resolveImage: ImageSrcResolver
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
      token.attrSet("src", resolveImage(src, markdownDir));
    }
    return defaultImageRule(tokens, idx, options, env, self);
  };

  for (const rule of ["html_block", "html_inline"] as const) {
    const defaultHtmlRule = md.renderer.rules[rule];
    md.renderer.rules[rule] = (tokens, idx, options, env, self) =>
      resolveHtmlImageSources(
        defaultHtmlRule
          ? defaultHtmlRule(tokens, idx, options, env, self)
          : tokens[idx].content,
        markdownDir,
        resolveImage
      );
  }

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
  const md = createMarkdownIt(
    markdownDir,
    options.renderMermaid,
    resolveImageSrc
  );
  return md.render(markdown);
}
