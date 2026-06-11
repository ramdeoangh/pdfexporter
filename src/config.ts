import * as vscode from "vscode";

export interface ExporterConfig {
  outputDirectory: string;
  executablePath: string;
  pageFormat: "A4" | "Letter" | "Legal" | "Tabloid";
  marginTop: string;
  marginBottom: string;
  marginLeft: string;
  marginRight: string;
  renderMermaid: boolean;
  mermaidTheme: string;
  exportTimeout: number;
}

export function getExporterConfig(): ExporterConfig {
  const config = vscode.workspace.getConfiguration("pdfexporter");

  return {
    outputDirectory: config.get<string>("outputDirectory", ""),
    executablePath: config.get<string>("executablePath", ""),
    pageFormat: config.get<ExporterConfig["pageFormat"]>("pageFormat", "A4"),
    marginTop: config.get<string>("marginTop", "20mm"),
    marginBottom: config.get<string>("marginBottom", "20mm"),
    marginLeft: config.get<string>("marginLeft", "15mm"),
    marginRight: config.get<string>("marginRight", "15mm"),
    renderMermaid: config.get<boolean>("renderMermaid", true),
    mermaidTheme: config.get<string>("mermaidTheme", "default"),
    exportTimeout: config.get<number>("exportTimeout", 60000),
  };
}
