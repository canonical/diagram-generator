import { sizeToPx } from './tokens.js';

const ASCENT_RATIO = 0.94;

export function lineTopToBaseline(top: number, size: string | number): number {
  return top + sizeToPx(size) * ASCENT_RATIO;
}
