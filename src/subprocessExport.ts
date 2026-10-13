import { spawn } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ExporterConfig } from "./config";
import { exportMarkdownToPdf } from "./pdfExporter";
import { getExportCliPath } from "./paths";

class SpawnError extends Error {}

export interface HostExportOptions {
  markdownPath: string;
  config: ExporterConfig;
  extensionPath: string;
  /** Text to export instead of the file on disk (e.g. unsaved editor content). */
  markdownContent?: string;
  /** Where to write the PDF; defaults to next to the Markdown file. */
  outputPath?: string;
}

export async function exportMarkdownToPdfViaHost(
  options: HostExportOptions
): Promise<string> {
  try {
    return await exportInSubprocess(options);
  } catch (subprocessError) {
    if (!(subprocessError instanceof SpawnError)) {
      throw subprocessError;
    }

    return exportMarkdownToPdf(options);
  }
}

/**
 * Runs the export outside the extension host, where launching Chrome is more
 * reliable. Uses the editor's own runtime (VS Code / Cursor are Electron, which
 * runs as Node with ELECTRON_RUN_AS_NODE) so Node does not have to be installed
 * or on PATH. No shell is involved, so paths with spaces are passed intact.
 */
async function exportInSubprocess(options: HostExportOptions): Promise<string> {
  // Too large for an environment variable, so hand unsaved text over in a file.
  const contentFile =
    options.markdownContent === undefined
      ? undefined
      : path.join(
          os.tmpdir(),
          `pdfexporter-source-${Date.now()}-${Math.random().toString(36).slice(2)}.md`
        );

  if (contentFile) {
    fs.writeFileSync(contentFile, options.markdownContent ?? "", "utf8");
  }

  try {
    return await runExportCli(options, contentFile);
  } finally {
    if (contentFile) {
      fs.rmSync(contentFile, { force: true });
    }
  }
}

function runExportCli(
  options: HostExportOptions,
  contentFile: string | undefined
): Promise<string> {
  return new Promise((resolve, reject) => {
    const cliScript = getExportCliPath(options.extensionPath);
    const args = [cliScript, options.markdownPath];
    if (options.outputPath) {
      args.push(options.outputPath);
    }

    const child = spawn(process.execPath, args, {
      cwd: options.extensionPath,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1",
        PDFEXPORTER_CONFIG: JSON.stringify(options.config),
        PDFEXPORTER_EXTENSION_PATH: options.extensionPath,
        ...(contentFile ? { PDFEXPORTER_CONTENT_FILE: contentFile } : {}),
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
