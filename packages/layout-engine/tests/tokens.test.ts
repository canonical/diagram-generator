import { describe, it, expect } from 'vitest';
import {
  BASELINE_UNIT,
  BLOCK_WIDTH,
  BOX_MIN_HEIGHT,
  INSET,
  ICON_SIZE,
  BODY_LINE_STEP,
  roundUpToGrid,
  sizeToPx,
  steppedLinesHeight,
  clampToConstraints,
  defaultLineStep,
} from '../src/tokens.js';

describe('constants match Python values', () => {
  it('BASELINE_UNIT = 8', () => expect(BASELINE_UNIT).toBe(8));
  it('BLOCK_WIDTH = 192', () => expect(BLOCK_WIDTH).toBe(192));
  it('ICON_SIZE = 48', () => expect(ICON_SIZE).toBe(48));
  it('INSET = 8', () => expect(INSET).toBe(8));
  it('BOX_MIN_HEIGHT = 64', () => expect(BOX_MIN_HEIGHT).toBe(64));
  it('BODY_LINE_STEP = 24', () => expect(BODY_LINE_STEP).toBe(24));
});

describe('roundUpToGrid', () => {
  it('snaps up to nearest 8px', () => {
    expect(roundUpToGrid(1)).toBe(8);
    expect(roundUpToGrid(8)).toBe(8);
    expect(roundUpToGrid(9)).toBe(16);
    expect(roundUpToGrid(50)).toBe(56);
  });

  it('snaps 0 to 0', () => {
    expect(roundUpToGrid(0)).toBe(0);
  });

  it('accepts custom step', () => {
    expect(roundUpToGrid(10, 12)).toBe(12);
    expect(roundUpToGrid(12, 12)).toBe(12);
    expect(roundUpToGrid(13, 12)).toBe(24);
  });

  it('throws on non-positive step', () => {
    expect(() => roundUpToGrid(10, 0)).toThrow();
    expect(() => roundUpToGrid(10, -1)).toThrow();
  });
});

describe('sizeToPx', () => {
  it('passes through numbers', () => {
    expect(sizeToPx(18)).toBe(18);
    expect(sizeToPx(24.5)).toBe(24.5);
  });

  it('parses px strings', () => {
    expect(sizeToPx('18px')).toBe(18);
    expect(sizeToPx('24.5px')).toBe(24.5);
  });

  it('parses pt strings', () => {
    expect(sizeToPx('12pt')).toBe(12);
  });

  it('parses plain number strings', () => {
    expect(sizeToPx('18')).toBe(18);
  });
});

describe('defaultLineStep', () => {
  it('returns exact match for known sizes', () => {
    expect(defaultLineStep(18)).toBe(24);
    expect(defaultLineStep(24)).toBe(32);
    expect(defaultLineStep(48)).toBe(56);
  });

  it('returns nearest smaller for unknown sizes', () => {
    // 19 is not in the table; nearest smaller is 18 → 24
    expect(defaultLineStep(19)).toBe(24);
  });
});

describe('steppedLinesHeight', () => {
  it('computes height from line steps', () => {
    const lines = [
      { size: 18 },  // line step 24
      { size: 18 },  // line step 24
    ];
    // 8 + 24 + 24 + 8 = 64
    expect(steppedLinesHeight(lines, { topPad: 8, bottomPad: 8 })).toBe(64);
  });

  it('respects explicit lineStep override', () => {
    const lines = [{ size: 18, lineStep: 32 }];
    // 8 + 32 + 8 = 48
    expect(steppedLinesHeight(lines, { topPad: 8, bottomPad: 8 })).toBe(48);
  });

  it('respects minHeight', () => {
    expect(steppedLinesHeight([], { minHeight: 64 })).toBe(64);
  });
});

describe('clampToConstraints', () => {
  it('clamps to min (rounded up)', () => {
    expect(clampToConstraints(30, 50, undefined)).toBe(roundUpToGrid(50));
  });

  it('clamps to max (rounded down)', () => {
    expect(clampToConstraints(200, undefined, 100)).toBe(
      Math.floor(100 / BASELINE_UNIT) * BASELINE_UNIT,
    );
  });

  it('passes through when in range', () => {
    expect(clampToConstraints(80, 50, 100)).toBe(80);
  });
});
