import type { InteractionOverrideEntry } from './interaction-resize.js';

/**
 * Keyboard interaction helpers (spec 043 interaction slice E).
 */

export type NudgeKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

export interface NudgeSelectionItem {
  id: string;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

export function isNudgeKey(value: string): value is NudgeKey {
  return value === 'ArrowUp'
    || value === 'ArrowDown'
    || value === 'ArrowLeft'
    || value === 'ArrowRight';
}

export function createNudgeOverrideEntries(options: {
  items: NudgeSelectionItem[];
  key: NudgeKey;
  step: number;
}): InteractionOverrideEntry[] {
  let dxStep = 0;
  let dyStep = 0;

  if (options.key === 'ArrowUp') dyStep = -options.step;
  else if (options.key === 'ArrowDown') dyStep = options.step;
  else if (options.key === 'ArrowLeft') dxStep = -options.step;
  else if (options.key === 'ArrowRight') dxStep = options.step;

  return options.items.map((item) => ({
    id: item.id,
    dx: item.dx + dxStep,
    dy: item.dy + dyStep,
    dw: item.dw,
    dh: item.dh,
  }));
}
