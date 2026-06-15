/**
 * Small HTML/inline-handler escaping helpers for preview-shell panel renderers.
 *
 * The legacy shell still uses inline handler attributes during the migration,
 * so dynamic ids and messages must be escaped before they enter markup.
 */

export function escapePreviewHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function quotePreviewInlineJsString(value: string): string {
  return escapePreviewHtml(JSON.stringify(String(value)));
}
