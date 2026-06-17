/**
 * Small HTML/data-attribute escaping helpers for preview-shell panel renderers.
 */

export function escapePreviewHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderPreviewDataAttrs(
  attrs: Record<string, unknown>,
): string {
  return Object.entries(attrs)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([name, value]) => ` ${name}="${escapePreviewHtml(value)}"`)
    .join('');
}
