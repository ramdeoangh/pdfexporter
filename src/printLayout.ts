import { ExporterConfig } from "./config";

const PAGE_HEIGHT_MM: Record<ExporterConfig["pageFormat"], number> = {
  A4: 297,
  Letter: 279.4,
  Legal: 355.6,
  Tabloid: 431.8,
};

const PAGE_WIDTH_MM: Record<ExporterConfig["pageFormat"], number> = {
  A4: 210,
  Letter: 215.9,
  Legal: 215.9,
  Tabloid: 279.4,
};

const MM_TO_PX = 96 / 25.4;

export function parseLengthToPx(value: string): number {
  const match = value.trim().match(/^([\d.]+)\s*(mm|cm|in|px)?$/i);
  if (!match) {
    return 0;
  }

  const amount = parseFloat(match[1]);
  const unit = (match[2] ?? "px").toLowerCase();

  switch (unit) {
    case "mm":
      return amount * MM_TO_PX;
    case "cm":
      return amount * 10 * MM_TO_PX;
    case "in":
      return amount * 96;
    default:
      return amount;
  }
}

export function getPrintableAreaPx(settings: {
  pageFormat: ExporterConfig["pageFormat"];
  marginTop: string;
  marginBottom: string;
  marginLeft: string;
  marginRight: string;
}): { widthPx: number; heightPx: number } {
  const pageWidthPx = PAGE_WIDTH_MM[settings.pageFormat] * MM_TO_PX;
  const pageHeightPx = PAGE_HEIGHT_MM[settings.pageFormat] * MM_TO_PX;

  const marginLeftPx = parseLengthToPx(settings.marginLeft);
  const marginRightPx = parseLengthToPx(settings.marginRight);
  const marginTopPx = parseLengthToPx(settings.marginTop);
  const marginBottomPx = parseLengthToPx(settings.marginBottom);

  return {
    widthPx: Math.max(320, Math.floor(pageWidthPx - marginLeftPx - marginRightPx)),
    heightPx: Math.max(
      400,
      Math.floor(pageHeightPx - marginTopPx - marginBottomPx)
    ),
  };
}

/** Runs in the browser before page.pdf(). */
export function wrapDiagramSectionsForPrint(): void {
  document.querySelectorAll(".mermaid-block").forEach((block) => {
    const element = block as HTMLElement;
    if (element.closest(".diagram-section")) {
      return;
    }

    const heading = element.previousElementSibling;
    if (!heading || heading.tagName !== "H3") {
      return;
    }

    const section = document.createElement("div");
    section.className = "diagram-section";
    heading.parentElement?.insertBefore(section, heading);

    const sectionHeading = heading.previousElementSibling;
    if (
      sectionHeading?.tagName === "H2" &&
      sectionHeading.nextElementSibling === heading
    ) {
      section.appendChild(sectionHeading);
    }

    section.appendChild(heading);
    section.appendChild(element);
  });
}

/** Runs in the browser before page.pdf(). */
export function fitMermaidDiagramsForPrint(
  maxWidthPx: number,
  maxHeightPx: number
): void {
  const diagramMaxHeight = Math.floor(maxHeightPx * 0.92);

  document.querySelectorAll(".mermaid-block").forEach((block) => {
    const element = block as HTMLElement;
    const svg = element.querySelector("svg");
    if (!svg) {
      return;
    }

    const viewBox = svg.viewBox?.baseVal;
    let naturalWidth = viewBox?.width ?? 0;
    let naturalHeight = viewBox?.height ?? 0;

    if (!naturalWidth || !naturalHeight) {
      try {
        const bbox = svg.getBBox();
        naturalWidth = bbox.width;
        naturalHeight = bbox.height;
      } catch {
        const rect = svg.getBoundingClientRect();
        naturalWidth = rect.width;
        naturalHeight = rect.height;
      }
    }

    if (!naturalWidth || !naturalHeight) {
      return;
    }

    const widthScale = (maxWidthPx * 0.98) / naturalWidth;
    const heightScale = diagramMaxHeight / naturalHeight;
    const scale = Math.min(1, widthScale, heightScale);

    element.classList.add("mermaid-print-block");
    element.style.overflow = "hidden";
    element.style.pageBreakInside = "avoid";
    element.style.breakInside = "avoid-page";

    const scaledHeight = Math.ceil(naturalHeight * scale);
    const scaledWidth = Math.ceil(naturalWidth * scale);

    if (scale < 1) {
      const host = (svg.parentElement as HTMLElement | null) ?? element;
      const wrapper = document.createElement("div");
      wrapper.className = "mermaid-scaled-wrap";
      wrapper.style.width = `${scaledWidth}px`;
      wrapper.style.height = `${scaledHeight}px`;
      wrapper.style.margin = "0 auto";
      wrapper.style.overflow = "hidden";

      host.insertBefore(wrapper, svg);
      wrapper.appendChild(svg);

      svg.style.display = "block";
      svg.style.maxWidth = "none";
      svg.style.maxHeight = "none";
      svg.style.transform = `scale(${scale})`;
      svg.style.transformOrigin = "top left";

      if (host.classList.contains("mermaid")) {
        host.style.display = "block";
        host.style.margin = "0";
        host.style.padding = "0";
        host.style.border = "none";
        host.style.background = "transparent";
      }
    } else {
      svg.style.display = "block";
      svg.style.maxWidth = "100%";
      svg.style.height = "auto";
      svg.style.margin = "0 auto";
      element.style.minHeight = `${scaledHeight}px`;
    }
  });
}
