import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { getExporterConfig } from "./config";
import { getVendorAssetPath, getVendorDir } from "./paths";
import { buildPreviewHtml } from "./previewHtml";
import { exportMarkdownToPdfViaHost } from "./subprocessExport";

type PreviewMessage =
  | { type: "rendering" }
  | { type: "pdf"; data: string }
  | { type: "error"; message: string };

/**
 * MD Preview: runs the same export as Export to PDF into a temporary file and
 * shows that PDF, so what you preview is exactly what you export. Uses the
 * editor's current text (unsaved edits included) and refreshes on save.
 */
export class MarkdownPreviewPanel {
  public static readonly viewType = "pdfexporter.mdPreview";

  private static currentPanel: MarkdownPreviewPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private markdownUri: vscode.Uri;
  private disposables: vscode.Disposable[] = [];
  private webviewReady = false;
  private lastMessage: PreviewMessage | undefined;
  private rendering = false;
  private renderAgain = false;
  private disposed = false;

  private constructor(
    panel: vscode.WebviewPanel,
    markdownUri: vscode.Uri,
    private readonly extensionPath: string,
    private readonly log: vscode.OutputChannel
  ) {
    this.panel = panel;
    this.markdownUri = markdownUri;

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      (message) => this.onMessage(message),
      null,
      this.disposables
    );

    vscode.workspace.onDidSaveTextDocument(
      (document) => {
        if (document.uri.toString() === this.markdownUri.toString()) {
          void this.update();
        }
      },
      null,
      this.disposables
    );

    vscode.workspace.onDidChangeConfiguration(
      (event) => {
        if (event.affectsConfiguration("pdfexporter")) {
          void this.update();
        }
      },
      null,
      this.disposables
    );

    this.loadWebview();
    void this.update();
  }

  public static show(
    extensionPath: string,
    markdownUri: vscode.Uri,
    log: vscode.OutputChannel
  ): void {
    const existing = MarkdownPreviewPanel.currentPanel;
    if (existing) {
      // Keep the panel in its column; "Beside" would move it next to the
      // focused group and could stack up editor columns.
      existing.panel.reveal(undefined, true);
      if (existing.markdownUri.toString() !== markdownUri.toString()) {
        existing.markdownUri = markdownUri;
        existing.loadWebview();
      }
      void existing.update();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      MarkdownPreviewPanel.viewType,
      previewTitle(markdownUri),
      // Leave focus in the editor so typing continues while the preview renders.
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        // Images are inside the PDF, so the page only needs PDF.js.
        localResourceRoots: [vscode.Uri.file(getVendorDir(extensionPath))],
      }
    );

    MarkdownPreviewPanel.currentPanel = new MarkdownPreviewPanel(
      panel,
      markdownUri,
      extensionPath,
      log
    );
  }

  private loadWebview(): void {
    const webview = this.panel.webview;
    const assetUri = (fileName: string) =>
      webview
        .asWebviewUri(
          vscode.Uri.file(getVendorAssetPath(this.extensionPath, fileName))
        )
        .toString();

    this.webviewReady = false;
    this.lastMessage = undefined;
    this.panel.title = previewTitle(this.markdownUri);
    webview.html = buildPreviewHtml({
      title: path.basename(this.markdownUri.fsPath),
      cspSource: webview.cspSource,
      nonce: crypto.randomBytes(16).toString("base64"),
      pdfjsUri: assetUri("pdfjs.min.mjs"),
      pdfjsWorkerUri: assetUri("pdfjs.worker.min.mjs"),
    });
  }

  private onMessage(message: { type?: string; pages?: number; message?: string }): void {
    switch (message.type) {
      case "ready":
        this.webviewReady = true;
        if (this.lastMessage) {
          void this.panel.webview.postMessage(this.lastMessage);
        }
        break;
      case "refresh":
        void this.update();
        break;
      case "export":
        void vscode.commands.executeCommand("pdfexporter.exportPdf", this.markdownUri);
        break;
      case "showLog":
        this.log.show(true);
        break;
      case "renderError":
        this.log.appendLine(
          `[${new Date().toISOString()}] MD Preview could not draw the PDF: ${message.message}`
        );
        break;
    }
  }

  private post(message: PreviewMessage): void {
    // "rendering" is transient; keep the last PDF or error for a reloaded page.
    if (message.type !== "rendering") {
      this.lastMessage = message;
    }
    if (this.webviewReady && !this.disposed) {
      void this.panel.webview.postMessage(message);
    }
  }

  /** Renders now, or once more after the render already in progress. */
  private async update(): Promise<void> {
    if (this.rendering) {
      this.renderAgain = true;
      return;
    }

    this.rendering = true;
    try {
      do {
        this.renderAgain = false;
        await this.render();
      } while (this.renderAgain && !this.disposed);
    } finally {
      this.rendering = false;
    }
  }

  private async render(): Promise<void> {
    const markdownPath = this.markdownUri.fsPath;
    const openDocument = vscode.workspace.textDocuments.find(
      (document) => document.uri.toString() === this.markdownUri.toString()
    );
    const outputPath = path.join(
      os.tmpdir(),
      `pdfexporter-preview-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`
    );

    this.post({ type: "rendering" });

    try {
      await exportMarkdownToPdfViaHost({
        markdownPath,
        markdownContent: openDocument?.getText(),
        outputPath,
        config: getExporterConfig(),
        extensionPath: this.extensionPath,
      });
      this.post({ type: "pdf", data: fs.readFileSync(outputPath).toString("base64") });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log.appendLine(
        `[${new Date().toISOString()}] MD Preview failed: ${markdownPath}`
      );
      this.log.appendLine(error instanceof Error && error.stack ? error.stack : message);
      this.log.appendLine("");
      this.post({ type: "error", message });
    } finally {
      fs.rmSync(outputPath, { force: true });
    }
  }

  private dispose(): void {
    this.disposed = true;
    MarkdownPreviewPanel.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      this.disposables.pop()?.dispose();
    }
  }
}

function previewTitle(markdownUri: vscode.Uri): string {
  return `MD Preview: ${path.basename(markdownUri.fsPath)}`;
}
