import * as path from "path";

export function getDistDir(extensionPath: string): string {
  return path.join(extensionPath, "package", "dist");
}

export function getExportCliPath(extensionPath: string): string {
  return path.join(getDistDir(extensionPath), "exportCli.js");
}

export function getLogoPath(extensionPath?: string): string {
  const root = extensionPath ?? path.resolve(__dirname, "..", "..");
  return path.join(root, "package", "assets", "img", "mdexport.png");
}
