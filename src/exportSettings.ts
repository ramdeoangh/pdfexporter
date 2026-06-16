import * as path from "path";
import { ExporterConfig } from "./config";
import { DocumentFrontMatter } from "./frontMatter";

export interface ResolvedExportSettings extends ExporterConfig {
  documentTitle: string;
  author?: string;
  documentDate?: string;
  customLogoPath?: string;
  headerText: string;
  footerText: string;
}

function toOptionalString(value: unknown): string | undefined {
  if (value == null) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const text = String(value).trim();
  return text || undefined;
}

export function resolveExportSettings(options: {
  config: ExporterConfig;
  frontMatter: DocumentFrontMatter;
  markdownPath: string;
  fallbackTitle: string;
}): ResolvedExportSettings {
  const pdf = options.frontMatter.pdf ?? {};
  const markdownDir = path.dirname(options.markdownPath);

  const documentTitle =
    toOptionalString(options.frontMatter.title) || options.fallbackTitle;
  const author = toOptionalString(options.frontMatter.author);
  const documentDate = toOptionalString(options.frontMatter.date);

  const customLogoPath = pdf.logo
    ? path.isAbsolute(pdf.logo)
      ? pdf.logo
      : path.resolve(markdownDir, pdf.logo)
    : undefined;

  const headerText =
    toOptionalString(pdf.header) ||
    [documentTitle, author].filter(Boolean).join(" — ");

  const footerText = toOptionalString(pdf.footer) || "";

  return {
    ...options.config,
    outputDirectory: pdf.outputDirectory ?? options.config.outputDirectory,
    pageFormat:
      (pdf.pageFormat as ExporterConfig["pageFormat"]) ??
      options.config.pageFormat,
    marginTop: pdf.marginTop ?? options.config.marginTop,
    marginBottom: pdf.marginBottom ?? options.config.marginBottom,
    marginLeft: pdf.marginLeft ?? options.config.marginLeft,
    marginRight: pdf.marginRight ?? options.config.marginRight,
    renderMermaid: pdf.renderMermaid ?? options.config.renderMermaid,
    mermaidTheme: pdf.mermaidTheme ?? options.config.mermaidTheme,
    showLogo: pdf.showLogo ?? options.config.showLogo,
    headerFooterEnabled: pdf.showHeaderFooter ?? options.config.headerFooterEnabled,
    showPageNumbers: pdf.showPageNumbers ?? options.config.showPageNumbers,
    batchRecursive: options.config.batchRecursive,
    documentTitle,
    author,
    documentDate,
    customLogoPath,
    headerText,
    footerText,
  };
}
