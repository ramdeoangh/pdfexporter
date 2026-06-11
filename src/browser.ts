import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const WINDOWS_BROWSER_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  path.join(
    process.env.LOCALAPPDATA ?? "",
    "Google",
    "Chrome",
    "Application",
    "chrome.exe"
  ),
  path.join(
    process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)",
    "Microsoft",
    "Edge",
    "Application",
    "msedge.exe"
  ),
  path.join(
    process.env.ProgramFiles ?? "C:\\Program Files",
    "Microsoft",
    "Edge",
    "Application",
    "msedge.exe"
  ),
  path.join(
    process.env.ProgramFiles ?? "C:\\Program Files",
    "Google",
    "Chrome",
    "Application",
    "chrome.exe"
  ),
];

const MAC_BROWSER_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
];

const LINUX_BROWSER_CANDIDATES = [
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/microsoft-edge",
];

function exists(filePath: string): boolean {
  try {
    return Boolean(filePath) && fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function candidatesForPlatform(): string[] {
  switch (os.platform()) {
    case "win32":
      return WINDOWS_BROWSER_CANDIDATES;
    case "darwin":
      return MAC_BROWSER_CANDIDATES;
    default:
      return LINUX_BROWSER_CANDIDATES;
  }
}

export function resolveBrowserExecutable(
  configuredPath: string
): string | undefined {
  if (configuredPath && exists(configuredPath)) {
    return configuredPath;
  }

  return candidatesForPlatform().find(exists);
}

export function getBrowserLaunchArgs(userDataDir: string): string[] {
  return [
    `--user-data-dir=${userDataDir}`,
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-software-rasterizer",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--hide-scrollbars",
  ];
}
