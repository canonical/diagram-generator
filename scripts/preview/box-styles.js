"use strict";

(function initBoxStyles(global) {
  const BOX_STYLES = {
    default: { fill: "transparent", text: "#000000", icon: "#000000", border: "solid", label: "Child (stroke)" },
    parent: { fill: "#F3F3F3", text: "#000000", icon: "#000000", border: "none", label: "Parent (grey)" },
    annotation: { fill: "transparent", text: "#000000", icon: "#000000", border: "none", label: "Annotation" },
    highlight: { fill: "#000000", text: "#FFFFFF", icon: "#FFFFFF", border: "none", label: "Highlight (black)" },
  };
  BOX_STYLES.accent = BOX_STYLES.parent;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function boxStyleLabel(styleName) {
    const resolvedName = styleName === "accent" ? "parent" : styleName;
    return BOX_STYLES[resolvedName]?.label || "Original";
  }

  function boxStyleOptionsHtml(selectedValue, options = {}) {
    const current = selectedValue == null ? "" : String(selectedValue);
    const includeOriginal = options.includeOriginal !== false;
    const originalLabel = options.originalLabel || "— original —";
    let html = "";
    if (includeOriginal) {
      html += `<option value=""${current === "" ? " selected" : ""}>${escapeHtml(originalLabel)}</option>`;
    }
    for (const [key, preset] of Object.entries(BOX_STYLES)) {
      if (key === "accent") continue;
      html += `<option value="${escapeHtml(key)}"${current === key ? " selected" : ""}>${escapeHtml(preset.label)}</option>`;
    }
    return html;
  }

  global.__DG_BOX_STYLES = BOX_STYLES;
  global.__DG_boxStyleLabel = boxStyleLabel;
  global.__DG_boxStyleOptionsHtml = boxStyleOptionsHtml;
})(window);