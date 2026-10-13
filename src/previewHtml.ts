/**
 * Webview page for MD Preview. It shows the real exported PDF (rendered with
 * PDF.js) so the preview always matches Export to PDF page for page.
 *
 * Messages from the extension: { type: "rendering" }, { type: "pdf", data }
 * (base64 PDF), { type: "error", message }.
 * Messages to the extension: ready (script loaded; earlier messages are lost),
 * refresh, export, showLog, rendered, renderError.
 */
export function buildPreviewHtml(options: {
  title: string;
  cspSource: string;
  nonce: string;
  pdfjsUri: string;
  pdfjsWorkerUri: string;
}): string {
  const { cspSource, nonce } = options;
  const title = escapeHtml(options.title);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} data: blob:; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${cspSource}; worker-src blob:; connect-src ${cspSource}; font-src ${cspSource} data:;" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: var(--vscode-editor-background, #1e1e1e);
      color: var(--vscode-foreground, #cccccc);
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
    }

    .toolbar {
      position: sticky;
      top: 0;
      z-index: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: var(--vscode-editor-background, #1e1e1e);
      border-bottom: 1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.35));
    }

    /* In a narrow panel the title and status shrink; the buttons never wrap. */
    .title {
      flex: 0 1 auto;
      min-width: 0;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .status {
      flex: 1 1 auto;
      min-width: 0;
      color: var(--vscode-descriptionForeground, #9d9d9d);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .status.busy::before {
      content: "";
      display: inline-block;
      width: 8px;
      height: 8px;
      margin-right: 6px;
      border-radius: 50%;
      background: var(--vscode-progressBar-background, #0e70c0);
      animation: pulse 1s ease-in-out infinite;
    }

    @keyframes pulse {
      50% { opacity: 0.25; }
    }

    button {
      flex: none;
      white-space: nowrap;
      padding: 3px 10px;
      border: none;
      border-radius: 2px;
      color: var(--vscode-button-foreground, #ffffff);
      background: var(--vscode-button-background, #0e639c);
      font: inherit;
      cursor: pointer;
    }

    button:hover {
      background: var(--vscode-button-hoverBackground, #1177bb);
    }

    button.secondary {
      color: var(--vscode-button-secondaryForeground, #ffffff);
      background: var(--vscode-button-secondaryBackground, #3a3d41);
    }

    button.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
    }

    .error {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 12px;
      padding: 8px 12px;
      border: 1px solid var(--vscode-inputValidation-errorBorder, #be1100);
      background: var(--vscode-inputValidation-errorBackground, #5a1d1d);
      white-space: pre-wrap;
    }

    .error[hidden] {
      display: none;
    }

    .error span {
      flex: 1;
    }

    #pages {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 16px;
    }

    .page {
      position: relative;
      background: #ffffff;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
    }

    .page canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <header class="toolbar">
    <span class="title">${title}</span>
    <span id="status" class="status busy">Rendering preview…</span>
    <button id="refresh" class="secondary" title="Render the preview again">Refresh</button>
    <button id="export" title="Export this file to PDF">Export PDF</button>
  </header>
  <div id="error" class="error" hidden>
    <span id="error-text"></span>
    <button id="show-log" class="secondary">Show Log</button>
  </div>
  <main id="pages"></main>

  <script type="module" nonce="${nonce}">
    import * as pdfjsLib from ${JSON.stringify(options.pdfjsUri)};

    const vscode = acquireVsCodeApi();
    const pagesElement = document.getElementById("pages");
    const statusElement = document.getElementById("status");
    const errorElement = document.getElementById("error");
    const errorText = document.getElementById("error-text");
    const scroller = document.scrollingElement;

    // Pages are never drawn larger than 125% of their printed size.
    const MAX_SCALE = (96 / 72) * 1.25;

    document.getElementById("refresh").addEventListener("click", () => vscode.postMessage({ type: "refresh" }));
    document.getElementById("export").addEventListener("click", () => vscode.postMessage({ type: "export" }));
    document.getElementById("show-log").addEventListener("click", () => vscode.postMessage({ type: "showLog" }));

    // Webview resources are served from another origin, so the PDF.js worker
    // has to be started from a same-origin blob URL.
    const workerReady = fetch(${JSON.stringify(options.pdfjsWorkerUri)})
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not load the PDF.js worker (" + response.status + ")");
        }
        return response.text();
      })
      .then((source) => {
        const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
        return new pdfjsLib.PDFWorker({ port: new Worker(url, { type: "module" }) });
      });

    let pdf = null;
    let loadingTask = null;
    let views = [];
    let observer = null;
    let layoutToken = 0;

    function setStatus(text, busy) {
      statusElement.textContent = text;
      statusElement.classList.toggle("busy", Boolean(busy));
    }

    function showError(message) {
      errorText.textContent = message;
      errorElement.hidden = false;
    }

    function base64ToBytes(base64) {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }

    function draw(view) {
      if (view.canvas) {
        return;
      }

      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(view.viewport.width * ratio);
      canvas.height = Math.floor(view.viewport.height * ratio);
      view.canvas = canvas;
      view.element.append(canvas);
      view.task = view.page.render({
        canvas,
        viewport: view.viewport,
        transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
      });
      view.task.promise.catch((error) => {
        if (error && error.name === "RenderingCancelledException") {
          return;
        }
        vscode.postMessage({ type: "renderError", message: String((error && error.message) || error) });
      });
    }

    // Pages far off screen give their canvas back, so long documents stay light.
    function release(view) {
      if (view.task) {
        view.task.cancel();
        view.task = null;
      }
      if (view.canvas) {
        view.canvas.remove();
        view.canvas = null;
      }
    }

    async function layoutPages(doc) {
      const token = ++layoutToken;
      const scrollRatio = scroller.scrollHeight > 0 ? scroller.scrollTop / scroller.scrollHeight : 0;
      const available = Math.max(200, pagesElement.clientWidth - 32);

      const next = [];
      for (let number = 1; number <= doc.numPages; number++) {
        const page = await doc.getPage(number);
        if (token !== layoutToken) {
          return;
        }
        const scale = Math.min(available / page.getViewport({ scale: 1 }).width, MAX_SCALE);
        const viewport = page.getViewport({ scale });
        const element = document.createElement("div");
        element.className = "page";
        element.dataset.index = String(next.length);
        element.style.width = viewport.width + "px";
        element.style.height = viewport.height + "px";
        next.push({ page, viewport, element, canvas: null, task: null });
      }

      if (observer) {
        observer.disconnect();
      }
      views.forEach(release);
      views = next;
      pagesElement.replaceChildren(...views.map((view) => view.element));
      scroller.scrollTop = scrollRatio * scroller.scrollHeight;

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const view = views[Number(entry.target.dataset.index)];
            if (view) {
              entry.isIntersecting ? draw(view) : release(view);
            }
          }
        },
        { rootMargin: "150% 0px" }
      );
      views.forEach((view) => observer.observe(view.element));
    }

    async function showPdf(base64) {
      const worker = await workerReady;
      const task = pdfjsLib.getDocument({ data: base64ToBytes(base64), worker, useWasm: false });
      const next = await task.promise;
      const previousTask = loadingTask;
      loadingTask = task;
      pdf = next;
      await layoutPages(next);
      // Frees the old document; the shared worker passed in above stays alive.
      if (previousTask) {
        previousTask.destroy();
      }
      errorElement.hidden = true;
      setStatus(pdf.numPages + (pdf.numPages === 1 ? " page" : " pages") + " · same as Export to PDF", false);
      vscode.postMessage({ type: "rendered", pages: pdf.numPages });
    }

    window.addEventListener("message", (event) => {
      const message = event.data;
      if (message.type === "rendering") {
        setStatus("Rendering preview…", true);
      } else if (message.type === "pdf") {
        showPdf(message.data).catch((error) => {
          const text = String((error && error.message) || error);
          setStatus("Preview failed", false);
          showError(text);
          vscode.postMessage({ type: "renderError", message: text });
        });
      } else if (message.type === "error") {
        setStatus("Preview failed", false);
        showError(message.message);
      }
    });

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (pdf) {
          layoutPages(pdf);
        }
      }, 150);
    });

    vscode.postMessage({ type: "ready" });
  </script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
