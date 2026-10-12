import * as path from "path";
import * as vscode from "vscode";
import { findMarkdownFiles } from "./batchExport";
import { getExporterConfig } from "./config";
import { MarkdownPreviewPanel } from "./previewPanel";
import { resolveMarkdownUri } from "./resolveMarkdownUri";
import { exportMarkdownToPdfViaHost } from "./subprocessExport";

let log: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext): void {
  log = vscode.window.createOutputChannel("MD-PDF Exporter");

  context.subscriptions.push(
    log,
    vscode.commands.registerCommand(
      "pdfexporter.exportPdf",
      async (uri?: vscode.Uri) => {
        const markdownUri = await resolveMarkdownUri(uri);
        if (!markdownUri) {
          return;
        }

        await exportSingleFile(context, markdownUri.fsPath);
      }
    ),

    vscode.commands.registerCommand(
      "pdfexporter.exportFolder",
      async (uri?: vscode.Uri) => {
        let folderUri = uri;

        if (!folderUri) {
          const picked = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: "Select folder to export",
          });
          folderUri = picked?.[0];
        }

        if (!folderUri) {
          return;
        }

        const config = getExporterConfig();
        const markdownFiles = findMarkdownFiles(
          folderUri.fsPath,
          config.batchRecursive
        );

        if (markdownFiles.length === 0) {
          vscode.window.showWarningMessage(
            "No Markdown files found in the selected folder."
          );
          return;
        }

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Exporting ${markdownFiles.length} Markdown file(s) to PDF…`,
            cancellable: false,
          },
          async () => {
            const exported: string[] = [];
            const failed: string[] = [];

            for (const markdownPath of markdownFiles) {
              try {
                await saveIfDirty(markdownPath);
                const outputPath = await exportMarkdownToPdfViaHost({
                  markdownPath,
                  config,
                  extensionPath: context.extensionPath,
                });
                exported.push(outputPath);
              } catch (error) {
                failed.push(path.basename(markdownPath));
                logError(markdownPath, error);
              }
            }

            if (failed.length === 0) {
              vscode.window.showInformationMessage(
                `Exported ${exported.length} PDF file(s).`
              );
            } else {
              void showErrorWithLog(
                `Exported ${exported.length} PDF(s). Failed: ${failed.join(", ")}`
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

async function exportSingleFile(
  context: vscode.ExtensionContext,
  markdownPath: string
): Promise<void> {
  const config = getExporterConfig();
  let outputPath: string | undefined;

  try {
    // The exporter reads the file from disk; unsaved edits would be missing.
    await saveIfDirty(markdownPath);

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Exporting Markdown to PDF…",
        cancellable: false,
      },
      async () => {
        outputPath = await exportMarkdownToPdfViaHost({
          markdownPath,
          config,
          extensionPath: context.extensionPath,
        });
      }
    );
  } catch (error) {
    logError(markdownPath, error);
    void showErrorWithLog(`MD-PDF export failed: ${errorMessage(error)}`);
    return;
  }

  if (!outputPath) {
    return;
  }

  const openAction = "Open in Default Viewer";
  const choice = await vscode.window.showInformationMessage(
    `PDF exported to ${path.basename(outputPath)}`,
    openAction,
    "Reveal in Explorer"
  );

  if (choice === openAction) {
    await vscode.env.openExternal(vscode.Uri.file(outputPath));
  } else if (choice === "Reveal in Explorer") {
    await vscode.commands.executeCommand(
      "revealFileInOS",
      vscode.Uri.file(outputPath)
    );
  }
}

async function saveIfDirty(markdownPath: string): Promise<void> {
  const document = vscode.workspace.textDocuments.find(
    (doc) => doc.uri.scheme === "file" && doc.uri.fsPath === markdownPath
  );

  if (document?.isDirty) {
    await document.save();
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function logError(markdownPath: string, error: unknown): void {
  log.appendLine(`[${new Date().toISOString()}] Export failed: ${markdownPath}`);
  log.appendLine(
    error instanceof Error && error.stack ? error.stack : errorMessage(error)
  );
  log.appendLine("");
}

async function showErrorWithLog(message: string): Promise<void> {
  const showLog = "Show Log";
  const choice = await vscode.window.showErrorMessage(message, showLog);
  if (choice === showLog) {
    log.show(true);
  }
}
