import * as path from "path";
import * as vscode from "vscode";
import { getExporterConfig } from "./config";
import { MarkdownPreviewPanel } from "./previewPanel";
import { resolveMarkdownUri } from "./resolveMarkdownUri";
import { exportMarkdownToPdfViaHost } from "./subprocessExport";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
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
              const outputPath = await exportMarkdownToPdfViaHost({
                markdownPath: markdownUri.fsPath,
                config,
                extensionPath: context.extensionPath,
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
                `MD-PDF export failed: ${message}`
              );
            }
          }
        );
      }
    ),

    vscode.commands.registerCommand(
      "pdfexporter.previewMarkdown",
      async (uri?: vscode.Uri) => {
        const markdownUri = await resolveMarkdownUri(uri);
        if (!markdownUri) {
          return;
        }

        const config = getExporterConfig();

        try {
          await vscode.window.showTextDocument(markdownUri, {
            preview: false,
            preserveFocus: false,
          });
        } catch {
          // Explorer-only preview is still supported when the file cannot be opened.
        }

        MarkdownPreviewPanel.show(
          context.extensionPath,
          markdownUri,
          config
        );
      }
    )
  );
}

export function deactivate(): void {
  // no-op
}
