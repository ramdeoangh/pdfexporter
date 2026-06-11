import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { ExporterConfig } from "./config";
import { buildHtmlDocument } from "./htmlTemplate";
import { processMarkdown } from "./markdownProcessor";

export class MarkdownPreviewPanel {
  public static readonly viewType = "pdfexporter.mdPreview";

  private static currentPanel: MarkdownPreviewPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private markdownUri: vscode.Uri;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    markdownUri: vscode.Uri,
    private readonly extensionPath: string,
    private config: ExporterConfig
  ) {
    this.panel = panel;
    this.markdownUri = markdownUri;

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      (message) => {
        if (message.command === "refresh") {
          void this.update();
        }
      },
      null,
      this.disposables
    );

    void this.update();
  }

  public static show(
    extensionPath: string,
    markdownUri: vscode.Uri,
    config: ExporterConfig
  ): void {
    const title = `MD Preview: ${path.basename(markdownUri.fsPath)}`;

    if (MarkdownPreviewPanel.currentPanel) {
      MarkdownPreviewPanel.currentPanel.panel.reveal(
        vscode.ViewColumn.Beside,
        true
      );
      MarkdownPreviewPanel.currentPanel.markdownUri = markdownUri;
      MarkdownPreviewPanel.currentPanel.config = config;
      MarkdownPreviewPanel.currentPanel.panel.title = title;
      void MarkdownPreviewPanel.currentPanel.update();
      return;
    }

    const resourceRoots = [
      vscode.Uri.file(extensionPath),
      vscode.Uri.file(path.dirname(markdownUri.fsPath)),
      ...vscode.workspace.workspaceFolders?.map((folder) => folder.uri) ?? [],
    ];

    const panel = vscode.window.createWebviewPanel(
      MarkdownPreviewPanel.viewType,
      title,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: resourceRoots,
      }
    );

    MarkdownPreviewPanel.currentPanel = new MarkdownPreviewPanel(
      panel,
      markdownUri,
      extensionPath,
      config
    );
  }

  private async update(): Promise<void> {
    try {
      const markdown = fs.readFileSync(this.markdownUri.fsPath, "utf8");
      const webview = this.panel.webview;

      const bodyHtml = processMarkdown(markdown, {
        markdownPath: this.markdownUri.fsPath,
        renderMermaid: this.config.renderMermaid,
        resolveImageSrc: (src, dir) =>
          this.resolvePreviewImageSrc(src, dir, webview),
      });

      const html = buildHtmlDocument({
        title: path.basename(
          this.markdownUri.fsPath,
          path.extname(this.markdownUri.fsPath)
        ),
        bodyHtml,
        renderMermaid: this.config.renderMermaid,
        mermaidTheme: this.config.mermaidTheme,
        extensionPath: this.extensionPath,
        showLogo: false,
      });

      this.panel.webview.html = html;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.panel.webview.html = `<!DOCTYPE html>
<html><body style="font-family:sans-serif;padding:24px;color:#cf222e;">
  <h2>MD Preview failed</h2>
  <p>${escapeHtml(message)}</p>
</body></html>`;
    }
  }

  private resolvePreviewImageSrc(
    src: string,
    markdownDir: string,
    webview: vscode.Webview
  ): string {
    if (!src || src.startsWith("data:") || /^https?:\/\//i.test(src)) {
      return src;
    }

    const absolutePath = path.isAbsolute(src)
      ? src
      : path.resolve(markdownDir, src);

    if (!fs.existsSync(absolutePath)) {
      return src;
    }

    return webview.asWebviewUri(vscode.Uri.file(absolutePath)).toString();
  }

  private dispose(): void {
    MarkdownPreviewPanel.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      this.disposables.pop()?.dispose();
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
