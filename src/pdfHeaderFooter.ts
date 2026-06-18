import { ResolvedExportSettings } from "./exportSettings";

function escapeTemplateText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildPdfHeaderFooterTemplates(
  settings: ResolvedExportSettings
): { headerTemplate: string; footerTemplate: string } | undefined {
  if (!settings.headerFooterEnabled) {
    return undefined;
  }

  const header = escapeTemplateText(settings.headerText);

  const headerTemplate = header
    ? `<div style="font-size:8px; width:100%; padding:0 15mm; color:#57606a;
      display:flex; justify-content:center; align-items:center;">
      <span>${header}</span>
    </div>`
    : "<span></span>";

  const footer = escapeTemplateText(settings.footerText);

  const pageNumbers = settings.showPageNumbers
    ? `<span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>`
    : "";

  const footerTemplate = `
    <div style="font-size:8px; width:100%; margin:0 15mm; color:#57606a;
      display:flex; justify-content:space-between; align-items:center;">
      <span>${footer}</span>
      ${pageNumbers}
    </div>
  `;

  return { headerTemplate, footerTemplate };
}
