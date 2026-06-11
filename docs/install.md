# Install in Cursor

## Quick install

```powershell
cd C:\Connectors\application\studio\tools\pdfexporter
npm run build
npm run package
cursor --install-extension "C:\Connectors\application\studio\tools\pdfexporter\package\pdfexporter-0.1.3.vsix"
```

Build output lives in the `package/` folder (`package/dist/`, `package/assets/`, `package/*.vsix`).

**Then restart Cursor completely** (close all windows, reopen).

---

## If you see: "Please restart VS Code before reinstalling"

The extension is already installed. Do one of:

### Option A — Just use it (no reinstall)

1. Restart Cursor
2. Open your `.md` file
3. Right-click the `.md` file → **MD-PDF Exporter** → **Export to PDF**  
   or `Ctrl+Shift+P` → **MD-PDF Exporter: Export to PDF**

### Option B — Clean reinstall

```powershell
cursor --uninstall-extension ramdeoangh.pdfexporter
```

Restart Cursor, then:

```powershell
cursor --install-extension "C:\Connectors\application\studio\tools\pdfexporter\package\pdfexporter-0.1.3.vsix"
```

Restart Cursor again.

---

## Export your SDD document

1. Open `C:\Connectors\application\studio\runtime\docs\FACTORY-31881-AppVersion-SDD.md`
2. Right-click the `.md` file → **MD-PDF Exporter** → **Export to PDF**  
   or `Ctrl+Shift+P` → **MD-PDF Exporter: Export to PDF**
3. PDF saved as: `FACTORY-31881-AppVersion-SDD.pdf` in the same `docs` folder

---

## If export fails: "Failed to launch the browser process"

1. **Restart Cursor** after installing v0.1.2+
2. Ensure **Node.js** is on your PATH (`node --version` in a terminal)
3. Set browser path in Cursor settings (`Ctrl+,` → search `pdfexporter`):

```json
"pdfexporter.executablePath": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
```

Or Edge:

```json
"pdfexporter.executablePath": "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
```

---

## Verify extension is installed

```powershell
cursor --list-extensions | findstr pdfexporter
```

Expected output: `ramdeoangh.pdfexporter`
