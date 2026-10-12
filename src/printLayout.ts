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

    // Read before inserting the wrapper, which becomes the h3's new sibling.
    const sectionHeading = heading.previousElementSibling;

    const section = document.createElement("div");
    section.className = "diagram-section";
    heading.parentElement?.insertBefore(section, heading);

    if (sectionHeading?.tagName === "H2") {
      section.appendChild(sectionHeading);
    }

    section.appendChild(heading);
    section.appendChild(element);
  });
}

/**
 * Runs in the browser before page.pdf().
 *
 * Sizes every Mermaid SVG through its own width/height attributes so the
 * viewBox does the scaling (crisp vectors, no CSS transform). A diagram never
 * grows past its natural size and is shrunk to fit the column width and the
 * page height left over after the headings kept on the same page.
 *
 * A diagram that fills a whole page cannot start mid-page, so it would leave
 * the rest of the previous page blank. A second pass estimates where each
 * diagram lands and, when that page still has most of the room it needs,
 * shrinks it to finish that page instead.
 */
export function fitMermaidDiagramsForPrint(
  maxWidthPx: number,
  maxHeightPx: number
): void {
  // Room for margin collapsing and rounding so a "full page" diagram still fits.
  const safetyPx = 24;
  // Extra room when finishing a page, because the page position is estimated.
  const estimateSafetyPx = 48;
  // Finish the current page only if the diagram keeps this much of its size.
  const minFillFraction = 0.6;

  function outerHeight(element: Element): number {
    const style = getComputedStyle(element);
    return (
      element.getBoundingClientRect().height +
      parseFloat(style.marginTop || "0") +
      parseFloat(style.marginBottom || "0")
    );
  }

  function sizeDiagram(element: HTMLElement, pageRoomPx: number): void {
    const svg = element.querySelector("svg");
    if (!svg) {
      return;
    }

    let viewBox = svg.viewBox?.baseVal;
    if (!viewBox || !viewBox.width || !viewBox.height) {
      try {
        const bbox = svg.getBBox();
        if (bbox.width && bbox.height) {
          svg.setAttribute(
            "viewBox",
            `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`
          );
          viewBox = svg.viewBox.baseVal;
        }
      } catch {
        // getBBox throws for SVGs that are not rendered; leave as-is.
      }
    }

    const naturalWidth = viewBox?.width ?? 0;
    const naturalHeight = viewBox?.height ?? 0;
    if (!naturalWidth || !naturalHeight) {
      return;
    }

    // Headings wrapped with the diagram must share its page.
    let reservedPx = outerHeight(element) - element.getBoundingClientRect().height;
    const section = element.closest(".diagram-section");
    if (section) {
      for (const child of Array.from(section.children)) {
        if (child !== element) {
          reservedPx += outerHeight(child);
        }
      }
    }

    const columnWidth = element.getBoundingClientRect().width || maxWidthPx;
    const availableHeight = Math.max(
      maxHeightPx * 0.25,
      pageRoomPx - reservedPx - safetyPx
    );
    const scale = Math.min(
      1,
      columnWidth / naturalWidth,
      availableHeight / naturalHeight
    );

    const width = Math.floor(naturalWidth * scale);
    const height = Math.floor(naturalHeight * scale);

    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.style.width = `${width}px`;
    svg.style.height = `${height}px`;
    svg.style.maxWidth = "100%";
    svg.style.maxHeight = "none";
    svg.style.display = "block";
    svg.style.margin = "0 auto";

    element.classList.add("mermaid-print-block");
    element.style.breakInside = "avoid";
  }

  document.querySelectorAll(".mermaid-block").forEach((block) => {
    sizeDiagram(block as HTMLElement, maxHeightPx);
  });

  // Second pass: walk the top-level blocks in order, tracking how far each
  // unbreakable block that does not fit is pushed down onto the next page.
  const container = document.querySelector(".markdown-body");
  if (!container) {
    return;
  }

  const originTop = container.getBoundingClientRect().top;
  const pageEndOf = (y: number) =>
    (Math.floor(y / maxHeightPx) + 1) * maxHeightPx;
  let pushedPx = 0;
  let forcedBreak = false;
  let previous: Element | undefined;
  let previousBottom = 0;

  for (const child of Array.from(container.children)) {
    let top = child.getBoundingClientRect().top - originTop + pushedPx;
    if (forcedBreak && top % maxHeightPx > 1) {
      pushedPx += pageEndOf(top) - top;
      top = pageEndOf(top);
    }

    const pageEnd = pageEndOf(top);
    const diagram = child.matches(".mermaid-block")
      ? child
      : child.matches(".diagram-section")
        ? child.querySelector(".mermaid-block")
        : null;

    if (diagram) {
      const room = pageEnd - top - estimateSafetyPx;
      const fullHeight = child.getBoundingClientRect().height;
      if (fullHeight > room && room >= fullHeight * minFillFraction) {
        sizeDiagram(diagram as HTMLElement, room);
      }
    }

    const height = child.getBoundingClientRect().height;

    // Branding is not worth a page of its own: keep it only if it fits on the
    // page where the content ends.
    if (child.matches(".pdf-powered-by")) {
      const contentPageEnd = pageEndOf(Math.max(0, previousBottom - 1));
      if (top + height > contentPageEnd - estimateSafetyPx) {
        child.remove();
      }
      continue;
    }

    const style = getComputedStyle(child);
    const unbreakable =
      style.breakInside === "avoid" ||
      style.breakInside === "avoid-page" ||
      (child.querySelector("img") !== null && !(child.textContent ?? "").trim());

    let bottom = top + height;

    if (unbreakable && height <= maxHeightPx && bottom > pageEnd) {
      // Moves to the next page, taking a heading right before it along.
      let movedFrom = top;
      if (previous && /^H[1-6]$/.test(previous.tagName)) {
        const headingTop =
          previous.getBoundingClientRect().top - originTop + pushedPx;
        if (headingTop >= pageEnd - maxHeightPx) {
          movedFrom = headingTop;
        }
      }
      pushedPx += pageEnd - movedFrom;
      bottom += pageEnd - movedFrom;
    } else if (child.tagName === "TABLE") {
      // Chrome repeats the header row on every page a table continues onto.
      const pagesCrossed = Math.floor(bottom / maxHeightPx) - Math.floor(top / maxHeightPx);
      const headerHeight = child.querySelector("thead")?.getBoundingClientRect().height ?? 0;
      pushedPx += pagesCrossed * headerHeight;
      bottom += pagesCrossed * headerHeight;
    }

    forcedBreak = /^(page|always|left|right)$/.test(style.breakAfter);
    previous = child;
    previousBottom = bottom;
  }
}

/**
 * Runs in the browser before page.pdf().
 *
 * Keeps short tables, code blocks and quotes on one page, but lets long ones
 * flow across pages. Forcing a long block to stay whole pushes it to the next
 * page and leaves a large empty gap behind it.
 */
export function applyPrintBreakRules(maxHeightPx: number): void {
  document.documentElement.style.setProperty(
    "--print-max-height",
    `${Math.floor(maxHeightPx * 0.95)}px`
  );

  const keepTogetherLimitPx = maxHeightPx * 0.4;

  document
    .querySelectorAll(
      ".markdown-body table, .markdown-body pre, .markdown-body blockquote"
    )
    .forEach((node) => {
      const element = node as HTMLElement;
      if (element.closest(".mermaid-block")) {
        return;
      }

      element.style.breakInside =
        element.getBoundingClientRect().height <= keepTogetherLimitPx
          ? "avoid"
          : "auto";
    });
}
