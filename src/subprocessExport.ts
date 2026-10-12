import { spawn } from "child_process";
import { ExporterConfig } from "./config";
import { exportMarkdownToPdf } from "./pdfExporter";
import { getExportCliPath } from "./paths";

class SpawnError extends Error {}

export async function exportMarkdownToPdfViaHost(options: {
  markdownPath: string;
  config: ExporterConfig;
  extensionPath: string;
}): Promise<string> {
  try {
    return await exportInSubprocess(options);
  } catch (subprocessError) {
    if (!(subprocessError instanceof SpawnError)) {
      throw subprocessError;
    }

    return exportMarkdownToPdf({
      markdownPath: options.markdownPath,
      config: options.config,
      extensionPath: options.extensionPath,
    });
  }
}

/**
 * Runs the export outside the extension host, where launching Chrome is more
 * reliable. Uses the editor's own runtime (VS Code / Cursor are Electron, which
 * runs as Node with ELECTRON_RUN_AS_NODE) so Node does not have to be installed
 * or on PATH. No shell is involved, so paths with spaces are passed intact.
 */
function exportInSubprocess(options: {
  markdownPath: string;
  config: ExporterConfig;
  extensionPath: string;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const cliScript = getExportCliPath(options.extensionPath);
    const child = spawn(process.execPath, [cliScript, options.markdownPath], {
      cwd: options.extensionPath,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1",
        PDFEXPORTER_CONFIG: JSON.stringify(options.config),
        PDFEXPORTER_EXTENSION_PATH: options.extensionPath,
      },
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    // launch + page load + Mermaid wait + print can each use exportTimeout.
    const hardTimeoutMs = options.config.exportTimeout * 4 + 30000;
    const timer = setTimeout(() => {
      child.kill();
      reject(
        new Error(
          `Export did not finish within ${Math.round(hardTimeoutMs / 1000)}s and was stopped.`
        )
      );
    }, hardTimeoutMs);

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(new SpawnError(error.message));
    });

    child.on("close", (code) => {
      clearTimeout(timer);

      if (code === 0) {
        resolve(stdout.trim().split(/\r?\n/).pop() ?? "");
        return;
      }

      reject(new Error(stderr.trim() || stdout.trim() || `Export failed (${code})`));
    });
  });
}
