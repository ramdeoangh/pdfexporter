import matter from "gray-matter";

export interface PdfFrontMatter {
  showLogo?: boolean;
  logo?: string;
  showPageNumbers?: boolean;
  showHeaderFooter?: boolean;
  header?: string;
  footer?: string;
  outputDirectory?: string;
  pageFormat?: string;
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  renderMermaid?: boolean;
  mermaidTheme?: string;
}

export interface DocumentFrontMatter {
  title?: string;
  author?: string;
  date?: string;
  pdf?: PdfFrontMatter;
}

export interface ParsedMarkdownDocument {
  content: string;
  frontMatter: DocumentFrontMatter;
}

export function parseMarkdownDocument(markdown: string): ParsedMarkdownDocument {
  const parsed = matter(markdown);
  const data = (parsed.data ?? {}) as DocumentFrontMatter;

  return {
    content: parsed.content,
    frontMatter: data,
  };
}
