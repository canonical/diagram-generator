import {
  BODY_LINE_STEP,
  BODY_SIZE,
  BOX_MIN_HEIGHT,
  INSET,
} from './tokens.js';

export interface SharedBoxRhythm {
  bodyFontSize: number;
  bodyLineStep: number;
  textInset: number;
  minBoxHeight: number;
  headingBottomGap: number;
}

/**
 * Shared chrome rhythm for frame-style boxes and sequence-lane boxes.
 *
 * Keep conceptual box text size, text inset, minimum height, and
 * heading-to-body spacing here so document lanes cannot drift by copying
 * separate literals into renderers.
 */
export const SHARED_BOX_RHYTHM: SharedBoxRhythm = Object.freeze({
  bodyFontSize: BODY_SIZE,
  bodyLineStep: BODY_LINE_STEP,
  textInset: INSET,
  minBoxHeight: BOX_MIN_HEIGHT,
  headingBottomGap: INSET,
});

export function estimateSharedBoxTextWidth(
  lines: readonly { text: string }[],
  fontSize = SHARED_BOX_RHYTHM.bodyFontSize,
): number {
  return Math.max(
    0,
    ...lines.map((line) => line.text.length * fontSize * 0.56),
  );
}

export function estimateSharedBoxTextHeight(
  lines: readonly { text: string }[],
  lineStep = SHARED_BOX_RHYTHM.bodyLineStep,
): number {
  return Math.max(lineStep, lines.length * lineStep);
}
