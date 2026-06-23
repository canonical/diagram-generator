/**
 * Embed assets/icons/*.svg into batch SVG output (Node).
 * Mirrors preview layout-bridge icon fetch + Python diagram_shared.load_icon.
 */

import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { Frame } from './frame-model.js';
import { extractSvgInnerMarkup, tintIconInnerMarkup } from './icon-markup.js';

export type IconInnerMarkupLoader = (name: string) => string | null;

/** Basename-only icon file name; rejects path traversal. */
export function safeIconFileName(name: string): string | null {
  if (!name || name.includes('..')) return null;
  const safe = basename(name);
  if (!safe || !/\.svg$/i.test(safe)) return null;
  return safe;
}

export { extractSvgInnerMarkup, tintIconInnerMarkup } from './icon-markup.js';

export function createFsIconLoader(iconsDir: string): IconInnerMarkupLoader {
  const cache = new Map<string, string | null>();
  return (name: string): string | null => {
    const safe = safeIconFileName(name);
    if (!safe) return null;
    if (cache.has(safe)) return cache.get(safe) ?? null;
    const path = join(iconsDir, safe);
    if (!existsSync(path)) {
      cache.set(safe, null);
      return null;
    }
    try {
      const inner = extractSvgInnerMarkup(readFileSync(path, 'utf-8'));
      cache.set(safe, inner);
      return inner;
    } catch {
      cache.set(safe, null);
      return null;
    }
  };
}

export function collectIconNames(frame: Frame, out = new Set<string>()): Set<string> {
  if (frame.icon) out.add(frame.icon);
  for (const child of frame.children) collectIconNames(child, out);
  return out;
}

export function preloadIconMarkup(
  loader: IconInnerMarkupLoader,
  names: Iterable<string>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const name of names) {
    const inner = loader(name);
    if (inner) map.set(name, inner);
  }
  return map;
}
