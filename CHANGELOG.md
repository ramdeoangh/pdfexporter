# Changelog

## 0.2.4

### Export reliability

- Export no longer fails when the extension folder or the Markdown file path contains spaces (for example `C:\Users\First Last\…` or `My Docs\spec.md`).
- Node.js no longer needs to be installed or on `PATH`; exports run on the editor's own runtime.
- A remote image that never loads (proxy, VPN) no longer fails the export with "Navigation timeout"; images get 15 seconds, then the PDF is printed without them.
- When the target PDF is open in a viewer, the error now says so instead of a raw `EBUSY` message with an unrelated browser hint.
- Unsaved edits are saved before export, so the PDF matches the editor.
- Long documents no longer hit Chrome's 30-second print timeout.
- A Mermaid script failure no longer hangs the export until the timeout.
- Export errors are written to the **MD-PDF Exporter** output channel (**Show Log** on the error notification). Folder export reports why each file failed.
- Relative `outputDirectory` paths are resolved from the Markdown file's folder instead of the extension's install folder.

### Diagrams and charts

- Large Mermaid diagrams are no longer shrunk twice (they were rendered far smaller than the page and off-centre).
- Small diagrams are no longer enlarged past their natural size and split across pages.
- A diagram with a syntax error shows Mermaid's error message and the diagram source; the other diagrams still render.
- The `h2` above a diagram section is kept on the same page as the diagram.

### Page layout

- Fewer blank gaps: long tables and code blocks flow across pages (table header repeats, rows stay whole). Short ones are still kept together.
- A tall diagram that would leave most of a page blank is shrunk slightly to finish that page.
- Long code lines wrap instead of being cut off. Previously a single long line made Chrome shrink the whole document.
- Images taller than a page are scaled to fit one page instead of being sliced.
- Images with spaces in the file name, and `<img>` tags written as HTML with relative paths, now appear in the PDF and preview.
- The "Powered by" logo and the front matter cover logo render at their intended small size instead of full page width. The branding line is dropped when it would sit alone on an extra page.
- Header and footer text lines up with the page margins.
