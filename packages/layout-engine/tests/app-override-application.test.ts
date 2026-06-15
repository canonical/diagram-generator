import { describe, expect, it } from 'vitest';
import {
  resolvePreviewArrowShiftedSegments,
  resolvePreviewArrowSideShift,
  resolvePreviewReflowShiftMap,
  shiftPreviewArrowheadPoints,
} from '../src/preview-shell/app-override-application.js';

describe('preview override application helpers', () => {
  it('computes side-aware arrow endpoint shifts with reflow adjustments', () => {
    expect(resolvePreviewArrowSideShift({
      delta: { dx: 10, dy: 20, dw: 40, dh: 16 },
      side: 'right',
      reflowDh: 8,
      reflowDy: 24,
    })).toEqual({
      dx: 50,
      dy: 56,
    });

    expect(resolvePreviewArrowSideShift({
      delta: { dx: -5, dy: 12, dw: 18, dh: 6 },
      side: 'bottom',
      reflowDh: 10,
      reflowDy: 4,
    })).toEqual({
      dx: 4,
      dy: 32,
    });
  });

  it('computes cumulative reflow shifts for lower root rows only', () => {
    const result = resolvePreviewReflowShiftMap({
      reflowDhByComponent: {
        alpha: 8,
        beta: 24,
        gamma: 16,
      },
      rootNodes: [
        { id: 'root-a', gridRow: 0 },
        { id: 'root-b', gridRow: 1 },
        { id: 'root-c', gridRow: 3 },
      ],
      getNode: (cid) => ({
        id: cid,
        gridRow: {
          alpha: 0,
          beta: 1,
          gamma: 1,
        }[cid] ?? 0,
      }),
    });

    expect(result).toEqual({
      'root-b': 8,
      'root-c': 32,
    });
  });

  it('shifts orthogonal arrow segments while preserving waypoint continuity', () => {
    expect(resolvePreviewArrowShiftedSegments({
      segments: [
        { x1: 0, y1: 0, x2: 100, y2: 0 },
        { x1: 100, y1: 0, x2: 100, y2: 80 },
        { x1: 100, y1: 80, x2: 180, y2: 80 },
      ],
      sourceShift: { dx: 10, dy: 20 },
      targetShift: { dx: -5, dy: 15 },
    })).toEqual([
      { x1: 10, y1: 20, x2: 100, y2: 20 },
      { x1: 100, y1: 20, x2: 100, y2: 95 },
      { x1: 100, y1: 95, x2: 175, y2: 95 },
    ]);
  });

  it('shifts arrowhead polygon point strings by the target delta', () => {
    expect(shiftPreviewArrowheadPoints('10,20 30,40 50,60', { dx: 5, dy: -10 }))
      .toBe('15,10 35,30 55,50');
  });
});
