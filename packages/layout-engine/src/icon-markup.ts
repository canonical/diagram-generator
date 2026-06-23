const RECOLOR_VALUES = /^(black|#000|#000000|currentcolor)$/i;

/** Strip outer <svg> wrapper; return child markup. */
export function extractSvgInnerMarkup(svgText: string): string {
  const trimmed = svgText.trim();
  const match = trimmed.match(/<svg\b[^>]*>([\s\S]*)<\/svg>/i);
  if (match?.[1]) return match[1].trim();
  return trimmed;
}

/** Apply iconFill to shape fills/strokes that use template black/currentColor. */
export function tintIconInnerMarkup(markup: string, fill: string): string {
  if (!fill) return markup;
  const esc = fill.replace(/"/g, '&quot;');
  return markup.replace(
    /(<(?:path|circle|rect|polygon|ellipse)\b[^>]*\s)(fill|stroke)="([^"]*)"/gi,
    (full, prefix: string, attr: string, value: string) => {
      if (!RECOLOR_VALUES.test(value.trim())) return full;
      return `${prefix}${attr}="${esc}"`;
    },
  );
}
