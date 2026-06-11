import * as vscode from "vscode";

export async function resolveMarkdownUri(
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
    openLabel: "Select Markdown",
  });

  return picked?.[0];
}
