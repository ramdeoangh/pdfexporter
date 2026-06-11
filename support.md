# MD-PDF Exporter — Support

Thank you for using **MD-PDF Exporter**. This page explains how to get help, report issues, and resolve common problems.

**Repository:** [github.com/ramdeoangh/pdfexporter](https://github.com/ramdeoangh/pdfexporter)

---

## Get help

| Channel | Use for |
| --- | --- |
| [GitHub Issues](https://github.com/ramdeoangh/pdfexporter/issues) | Bug reports, feature requests, questions |
| [GitHub Discussions](https://github.com/ramdeoangh/pdfexporter/discussions) | General questions and ideas (if enabled) |

When opening an issue, please include:

- VS Code or **Cursor** version
- Extension version (**MD-PDF Exporter**)
- Operating system (Windows / macOS / Linux)
- Steps to reproduce the problem
- Error message (copy from the notification)
- A sample `.md` file or snippet if the issue is export/preview related

---

## Quick start

### MD Preview

1. Open a `.md` file
2. Right-click → **MD-PDF Exporter** → **MD Preview**
3. Or `Ctrl+Shift+M` (Mac: `Cmd+Shift+M`)

### Export to PDF

1. Open a `.md` file
2. Right-click → **MD-PDF Exporter** → **Export to PDF**
3. Or `Ctrl+Shift+E` (Mac: `Cmd+Shift+E`)

The PDF is saved next to the Markdown file unless you set `pdfexporter.outputDirectory`.

---

## Requirements

| Requirement | Details |
| --- | --- |
| **Chrome or Edge** | Required for PDF export (local browser, not uploaded anywhere) |
| **Node.js on PATH** | Recommended on Windows for reliable PDF export (`node --version`) |
| **VS Code / Cursor** | Version `1.85.0` or newer |

---

## Troubleshooting

### PDF export failed: "Failed to launch the browser process"

Chrome or Edge could not be started.

**Fix:**

1. Install [Google Chrome](https://www.google.com/chrome/) or use Microsoft Edge
2. Open Settings → search `pdfexporter.executablePath`
3. Set the full path to your browser, for example:

```json
"pdfexporter.executablePath": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
```

Or for Edge:

```json
"pdfexporter.executablePath": "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
```

4. Restart VS Code / Cursor and try again

---

### Mermaid diagram shows as code in the PDF

**Fix:**

1. Ensure `pdfexporter.renderMermaid` is `true` (default)
2. Use a standard fenced block:

````markdown
```mermaid
flowchart TD
    A --> B
```
````

3. Increase timeout if the diagram is large: `pdfexporter.exportTimeout` (default `60000` ms)

---

### Local images missing in PDF or preview

**Fix:**

- Use relative paths from the `.md` file: `![alt](./images/diagram.png)`
- Ensure the image file exists on disk
- Avoid broken links or paths outside the workspace

---

### MD Preview panel is blank or shows an error

**Fix:**

1. Reload the window: Command Palette → **Developer: Reload Window**
2. Check the sample file: `examples/sample.md`
3. Open an issue with the error text from the preview panel

---

### Extension not listed in Marketplace search

If you installed from a `.vsix` file, the extension appears under **Installed**, not Marketplace search.

Search **Installed** for: `MD-PDF Exporter` or `@installed pdfexporter`

---

### Right-click menu does not appear

**Fix:**

1. Confirm the file extension is `.md` or `.markdown`
2. Right-click the file in the **Explorer** or inside the **editor**
3. Look for submenu **MD-PDF Exporter**
4. Reload the window after installing or updating the extension

---

## Settings reference

| Setting | Default | Description |
| --- | --- | --- |
| `pdfexporter.outputDirectory` | `""` | PDF output folder (empty = same folder as `.md`) |
| `pdfexporter.executablePath` | `""` | Path to Chrome/Edge |
| `pdfexporter.pageFormat` | `A4` | A4, Letter, Legal, Tabloid |
| `pdfexporter.renderMermaid` | `true` | Render Mermaid in PDF and preview |
| `pdfexporter.mermaidTheme` | `default` | default, dark, forest, neutral |
| `pdfexporter.showLogo` | `true` | Logo in exported PDF |
| `pdfexporter.exportTimeout` | `60000` | Max wait for rendering (ms) |

---

## Privacy

- Markdown is processed **locally** on your machine
- PDF export uses your **local** Chrome or Edge installation
- **No** document content is sent to external servers for rendering
- Mermaid diagrams are rendered locally (bundled `mermaid.js`)

---

## Feature requests

We welcome ideas. Please open a [GitHub Issue](https://github.com/ramdeoangh/pdfexporter/issues) with the label **enhancement** (or describe it in the title), including:

- What you want to achieve
- Example Markdown or screenshot
- Why the built-in preview or export is not enough

---

## License

MIT — see [LICENSE](LICENSE) in the repository.
