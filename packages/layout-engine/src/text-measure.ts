/**
 * Text measurement adapter — abstracts font-metric access.
 *
 * The layout engine needs two operations from text measurement:
 * 1. measureTextWidth: pixel width of a string at a given font size
 * 2. wrapTextLines: word-wrap lines at a max pixel width
 *
 * The Python engine uses fontTools (glyph advance widths from Ubuntu Sans).
 * The browser can use Canvas.measureText. Tests use a simple mock.
 *
 * The adapter is injected into layout functions so the engine stays pure.
 */

import { sizeToPx, BODY_SIZE, BODY_LINE_STEP } from './tokens.js';

// ---------------------------------------------------------------------------
// Line spec: the dict-like format used throughout the layout engine
// ---------------------------------------------------------------------------

export interface LineSpec {
  content: string;
  size?: string | number;
  weight?: string | number;
  fill?: string;
  smallCaps?: boolean;
  lineStep?: string | number;
  fontFamily?: string | null;
}

// ---------------------------------------------------------------------------
// Adapter interface
// ---------------------------------------------------------------------------

export interface TextMeasureAdapter {
  /** Measure pixel width of text at a given font size and weight. */
  measureTextWidth(text: string, fontSize: number, weight?: number): number;
}

// ---------------------------------------------------------------------------
// Adapter-aware helpers (used by the layout engine)
// ---------------------------------------------------------------------------

/** Estimate the pixel width of a single line spec. */
export function estimateLineWidth(spec: LineSpec, adapter: TextMeasureAdapter): number {
  const text = spec.content;
  const size = sizeToPx(spec.size ?? BODY_SIZE);
  const weight = Number(spec.weight ?? 400);
  let width = adapter.measureTextWidth(text, size, weight);
  if (spec.smallCaps) width *= 1.05;
  return width;
}

/** Word-wrap lines at max_width using the adapter for measurement. */
export function wrapTextLines(
  lines: readonly LineSpec[],
  maxWidth: number,
  adapter: TextMeasureAdapter,
): LineSpec[] {
  if (maxWidth <= 0) {
    return lines.map(spec => ({ ...spec }));
  }

  const result: LineSpec[] = [];
  for (const spec of lines) {
    const lineW = estimateLineWidth(spec, adapter);
    if (lineW <= maxWidth) {
      result.push({ ...spec });
      continue;
    }

    const size = sizeToPx(spec.size ?? BODY_SIZE);
    const weight = Number(spec.weight ?? 400);
    const smallCaps = spec.smallCaps ?? false;
    const words = spec.content.split(/\s+/);
    let current = '';

    for (const word of words) {
      const test = current ? current + ' ' + word : word;
      let testW = adapter.measureTextWidth(test, size, weight);
      if (smallCaps) testW *= 1.05;
      if (testW <= maxWidth || !current) {
        current = test;
      } else {
        result.push({ ...spec, content: current });
        current = word;
      }
    }
    if (current) {
      result.push({ ...spec, content: current });
    } else if (words.length === 0) {
      result.push({ ...spec });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Convert Line (from frame-model) to LineSpec (engine internal format)
// ---------------------------------------------------------------------------

import type { Line } from './frame-model.js';

export function lineToSpec(line: Line): LineSpec {
  return {
    content: line.content,
    size: line.size ?? String(BODY_SIZE),
    weight: line.weight ?? '400',
    fill: line.fill ?? '#000000',
    smallCaps: line.smallCaps ?? false,
    lineStep: line.lineStep != null ? String(line.lineStep) : String(BODY_LINE_STEP),
    fontFamily: line.fontFamily ?? null,
  };
}

export function linesToSpecs(lines: readonly Line[]): LineSpec[] {
  return lines.map(lineToSpec);
}

// ---------------------------------------------------------------------------
// Simple mock adapter for testing (fixed width per character)
// ---------------------------------------------------------------------------

/**
 * A deterministic text measurement adapter for unit tests.
 * Uses a fixed character width factor: width = text.length * fontSize * factor.
 * Default factor 0.6 approximates average glyph width for proportional fonts.
 */
export class MockTextAdapter implements TextMeasureAdapter {
  constructor(private readonly factor = 0.6) {}

  measureTextWidth(text: string, fontSize: number, _weight?: number): number {
    return text.length * fontSize * this.factor;
  }
}
