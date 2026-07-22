import type {
  PreviewHostBrowseSection,
  PreviewIndexPageOptions,
  PreviewHostTemplateSectionKey,
  PreviewHostTemplateSectionVisibility,
  PreviewViewerPageOptions,
} from "./types.js";

function htmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildPreviewNavOptions(
  sections: readonly PreviewHostBrowseSection[],
  currentPath: string,
): string {
  return sections
    .map((section) => {
      const options = section.links
        .map((link) => {
          const selected = currentPath === link.href ? " selected" : "";
          const readOnly = link.writable === false ? " — read-only" : "";
          return `<option value="${link.href}"${selected}>${htmlEscape(link.label + readOnly)}</option>`;
        })
        .join("");
      if (!options) {
        return "";
      }
      return `<optgroup label="${htmlEscape(section.label)}">${options}</optgroup>`;
    })
    .join("");
}

function buildBrowseNav(
  sections: readonly PreviewHostBrowseSection[],
  currentPath: string,
): string {
  return sections
    .map((section) => {
      const items = section.links
        .map((link) => {
          const active = currentPath === link.href ? " is-active" : "";
          const readOnly = link.writable === false
            ? '<span class="dg-workspace-lock" aria-label="Read-only" title="Read-only">🔒</span>'
            : "";
          return `<li><a class="dg-browse-link${active}" href="${link.href}">${htmlEscape(link.label)}${readOnly}</a></li>`;
        })
        .join("");
      if (!items) {
        return "";
      }
      return `<div class="dg-browse-group"><h3 class="dg-browse-heading">${htmlEscape(section.label)}</h3><ul class="dg-browse-list">${items}</ul></div>`;
    })
    .join("");
}

function buildIndexSection(section: PreviewHostBrowseSection): string {
  const content =
    section.links.length > 0
      ? `<ul class="dg-browse-list">${section.links
          .map((link) => {
            const readOnly = link.writable === false
              ? '<span class="dg-workspace-lock" aria-label="Read-only" title="Read-only">🔒</span>'
              : "";
            return `<li><a class="dg-browse-link" href="${link.href}">${htmlEscape(link.label)}${readOnly}</a></li>`;
          })
          .join("")}</ul>`
      : `<p class="bf-form-help">No ${htmlEscape(section.label).toLowerCase()} found.</p>`;
  return `<section class="dg-browse-group"><h2 class="dg-browse-heading">${htmlEscape(section.label)}</h2>${content}</section>`;
}

function applyViewerSectionPlaceholders(
  html: string,
  visibleSections: readonly PreviewHostTemplateSectionKey[],
  placeholders: readonly PreviewHostTemplateSectionVisibility[],
): string {
  const enabled = new Set(visibleSections);
  let nextHtml = html;
  for (const entry of placeholders) {
    nextHtml = nextHtml.replace(entry.placeholder, enabled.has(entry.section) ? "" : "hidden");
  }
  return nextHtml.replace("%ELK_LAYOUT_CONTROLS_HTML%", "");
}

function stripUnresolvedPlaceholders(html: string): string {
  return html.replace(/%[A-Z0-9_]+%/g, "");
}

export function buildViewerPageHtml(options: PreviewViewerPageOptions): string {
  const {
    title,
    mode,
    currentPath,
    templateHtml,
    browseSections,
    inspectorEmptyText,
    modeScriptsHtml,
    configScript,
    visibleTemplateSections,
    sectionVisibilityPlaceholders,
    baselineStylesHtml,
  } = options;
  return stripUnresolvedPlaceholders(
    applyViewerSectionPlaceholders(templateHtml, visibleTemplateSections, sectionVisibilityPlaceholders)
      .replace("%TITLE%", title)
      .replace("%BF_STYLES%", baselineStylesHtml)
      .replace("%MODE%", mode)
      .replace("%NAV_OPTIONS%", buildPreviewNavOptions(browseSections, currentPath))
      .replace("%BROWSE_NAV%", buildBrowseNav(browseSections, currentPath))
      .replace("%INSPECTOR_EMPTY%", inspectorEmptyText)
      .replace("%MODE_SCRIPTS%", modeScriptsHtml)
      .replace("%CONFIG_SCRIPT%", configScript),
  );
}

export function buildIndexPageHtml(options: PreviewIndexPageOptions): string {
  const { port, specHome, browseSections, baselineStylesHtml } = options;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Preview index</title>
${baselineStylesHtml}
<link rel="stylesheet" href="/preview/editor.css">
</head>
<body class="bf-theme bf-tier-os is-dark">
<main class="bf-main">
  <section class="bf-panel">
    <div class="bf-panel-header">
      <h1 class="bf-h4">Preview index</h1>
      <p class="bf-form-help">Node preview app on port ${port}. Spec home: ${htmlEscape(specHome)}</p>
      <p class="bf-form-help">Open a folder you own to edit its root-level YAML diagrams directly. Bundled examples remain read-only; edit one and use <strong>Save a copy…</strong> to keep it in a folder you choose.</p>
      <section class="dg-workspace-region" aria-labelledby="dg-workspace-heading">
        <span class="bf-form-label" id="dg-workspace-heading">Folder workspace</span>
        <div class="dg-workspace-open-row">
          <button class="bf-button is-base" id="dg-open-folder" type="button">Open folder…</button>
          <button class="bf-button is-base" id="dg-reconnect-folders" type="button" hidden>Reconnect folders…</button>
          <button class="bf-button is-base" id="dg-forget-folder" type="button" hidden>Forget current folder</button>
        </div>
        <p class="bf-form-help" id="dg-workspace-status" role="status" aria-live="polite">Checking remembered folders…</p>
      </section>
    </div>
    <div class="bf-panel-content">
      ${browseSections.map((section) => buildIndexSection(section)).join("")}
    </div>
  </section>
</main>
<script src="/preview/layout-engine.js"></script>
<script>window.LayoutEngine?.previewShell?.workspace?.initPreviewLocalFolderWorkspace?.();</script>
</body>
</html>`;
}
