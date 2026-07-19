import { Fill } from '../frame-model.js';
import { ARROW_COLOR } from '../tokens.js';

export const DRAWIO_ADAPTIVE_COLORS = 'none';
export const DRAWIO_LIGHT_PAGE_BACKGROUND = Fill.WHITE;
export const DRAWIO_DARK_PAGE_BACKGROUND = '#1E1E1E';

const DARK_COLOR_BY_LIGHT = new Map<string, string>([
  [Fill.WHITE, '#1E1E1E'],
  [Fill.GREY, '#303030'],
  [Fill.BLACK, '#F2F2F2'],
  ['#666666', '#C9C9C9'],
  [ARROW_COLOR, '#FF7A45'],
]);

function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  const short = trimmed.match(/^#([0-9a-f]{3})$/i);
  if (short) {
    const [r, g, b] = short[1]!;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  return null;
}

export function drawioLightDarkColor(light: string, dark: string): string {
  return `light-dark(${light},${dark})`;
}

export function drawioPageBackground(): string {
  return drawioLightDarkColor(DRAWIO_LIGHT_PAGE_BACKGROUND, DRAWIO_DARK_PAGE_BACKGROUND);
}

export function drawioThemeColor(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'none' || trimmed === 'transparent') return trimmed;
  if (/^light-dark\(/i.test(trimmed)) return trimmed;

  const normalized = normalizeHexColor(trimmed);
  if (!normalized) return trimmed;

  return drawioLightDarkColor(normalized, DARK_COLOR_BY_LIGHT.get(normalized) ?? normalized);
}

export function drawioThemeSvgColorAttributes(markup: string): string {
  return markup.replace(
    /\b(fill|stroke)="([^"]*)"/gi,
    (full, attr: string, value: string) => {
      const themed = drawioThemeColor(value);
      return themed === value ? full : `${attr}="${themed.replace(/"/g, '&quot;')}"`;
    },
  );
}
