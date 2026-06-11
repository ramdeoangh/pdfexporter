import { spawn } from "child_process";
import { ExporterConfig } from "./config";
import { exportMarkdownToPdf } from "./pdfExporter";
import { getExportCliPath } from "./paths";

export async function exportMarkdownToPdfViaHost(options: {
  markdownPath: string;
  config: ExporterConfig;
  extensionPath: string;
}): Promise<string> {
  try {
    return await exportInSubprocess(options);
  } catch (subprocessError) {
    const spawnFailed =
      subprocessError instanceof Error &&
      "code" in subprocessError &&
      subprocessError.code === "ENOENT";

    if (!spawnFailed) {
      throw subprocessError;
    }

    return exportMarkdownToPdf({
      markdownPath: options.markdownPath,
      config: options.config,
      extensionPath: options.extensionPath,
    });
  }
}

function exportInSubprocess(options: {
  markdownPath: string;
  config: ExporterConfig;
  extensionPath: string;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const cliScript = getExportCliPath(options.extensionPath);
    const child = spawn(
      process.platform === "win32" ? "node.exe" : "node",
      [cliScript, options.markdownPath],
      {
        cwd: options.extensionPath,
        env: {
          ...process.env,
          PDFEXPORTER_CONFIG: JSON.stringify(options.config),
          PDFEXPORTER_EXTENSION_PATH: options.extensionPath,
        },
        shell: process.platform === "win32",
        windowsHide: true,
      }
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim().split(/\r?\n/).pop() ?? "");
        return;
      }

      reject(new Error(stderr.trim() || stdout.trim() || `Export failed (${code})`));
    });
  });
}
