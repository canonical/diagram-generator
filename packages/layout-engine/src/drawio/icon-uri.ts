import { ICON_SIZE } from '../tokens.js';
import { tintIconInnerMarkup } from '../icon-markup.js';

function compactSvg(svgText: string): string {
  return svgText.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();
}

export function inlineSvgDataUri(svgText: string): string {
  return `data:image/svg+xml,${encodeURIComponent(compactSvg(svgText))}`;
}

export function iconDataUri(innerMarkup: string, fill: string, size = ICON_SIZE): string {
  const tinted = tintIconInnerMarkup(innerMarkup, fill);
  return tintedIconDataUri(tinted, size);
}

export function tintedIconDataUri(tintedInnerMarkup: string, size = ICON_SIZE): string {
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" `,
    `viewBox="0 0 ${size} ${size}" xml:space="preserve">`,
    tintedInnerMarkup,
    '</svg>',
  ].join('');
  return inlineSvgDataUri(svg);
}
