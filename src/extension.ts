import * as path from "path";
import * as vscode from "vscode";
import { getExporterConfig } from "./config";
import { exportMarkdownToPdf } from "./pdfExporter";

export function activate(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand(
    "pdfexporter.exportPdf",
    async (uri?: vscode.Uri) => {
      const markdownUri = await resolveMarkdownUri(uri);
      if (!markdownUri) {
        return;
      }

      const config = getExporterConfig();

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Exporting Markdown to PDF…",
          cancellable: false,
        },
        async () => {
          try {
            const outputPath = await exportMarkdownToPdf({
              markdownPath: markdownUri.fsPath,
              config,
            });

            const openAction = "Open PDF";
            const choice = await vscode.window.showInformationMessage(
              `PDF exported to ${path.basename(outputPath)}`,
              openAction,
              "Reveal in Explorer"
            );

            if (choice === openAction) {
              await vscode.commands.executeCommand(
                "vscode.open",
                vscode.Uri.file(outputPath)
              );
            } else if (choice === "Reveal in Explorer") {
              await vscode.commands.executeCommand(
                "revealFileInOS",
                vscode.Uri.file(outputPath)
              );
            }
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(
              `Markdown PDF export failed: ${message}`
            );
          }
        }
      );
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate(): void {
  // no-op
}

async function resolveMarkdownUri(
  uri?: vscode.Uri
): Promise<vscode.Uri | undefined> {
  if (uri) {
    return uri;
  }

  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor?.document.languageId === "markdown") {
    return activeEditor.document.uri;
  }

  const picked = await vscode.window.showOpenDialog({
    canSelectMany: false,
    filters: { Markdown: ["md", "markdown"] },
    openLabel: "Export to PDF",
  });

  return picked?.[0];
}
