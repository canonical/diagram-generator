const RECOLOR_VALUES = /^(black|#000|#000000|currentcolor)$/i;

/** Shape elements whose fill carries an icon's visible color. */
export const ICON_SHAPE_SELECTOR = 'path, circle, rect, polygon, ellipse';

interface IconShapeHost {
  querySelectorAll(selectors: string): ArrayLike<{ setAttribute(name: string, value: string): void }>;
}

/**
 * Recolor a live icon element's shapes to a single fill.
 *
 * This is the DOM counterpart of {@link tintIconInnerMarkup}: it is the one
 * mechanism every render path uses to apply `resolvedIconFill` (e.g. the white
 * icons required for highlight-mode boxes). Driving icon color through fill
 * keeps anti-aliased edges intact, unlike a `filter: invert(1)` hack which
 * inverts edge pixels into a halo.
 */
export function recolorIconElementShapes(icon: IconShapeHost, fill: string): void {
  if (!fill) return;
  const shapes = icon.querySelectorAll(ICON_SHAPE_SELECTOR);
  for (let index = 0; index < shapes.length; index += 1) {
    shapes[index]!.setAttribute('fill', fill);
  }
}

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
