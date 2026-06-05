/**
 * Shared leaf spatial helpers — measurement and render must agree.
 */

import type { Frame } from './frame-model.js';
import { ICON_SIZE, INSET } from './tokens.js';

/** Width reserved for a right-aligned icon column (icon + inner gutter). */
export function leafIconColumnWidth(frame: Frame): number {
  return frame.icon ? ICON_SIZE + INSET : 0;
}
