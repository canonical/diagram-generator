import { describe, expect, it } from 'vitest';
import {
  applyReorderOrder,
  resizeBoundsFromHandle,
  resolveSingleResizeOverride,
  resolveAutolayoutReorderTarget,
} from '../src/preview-shell/interaction-geometry.js';

describe('interaction geometry helpers', () => {
  it('resolves reorder targets and no-op insertions', () => {
    const targets = [
      { cid: 'a', midpoint: 10 },
      { cid: 'b', midpoint: 30 },
      { cid: 'c', midpoint: 50 },
    ];

    expect(resolveAutolayoutReorderTarget({
      cid: 'b',
      cursorPos: 20,
      targets,
    })).toEqual({
      insertIndex: 1,
      currentIndex: 1,
      isNoop: true,
    });

    expect(resolveAutolayoutReorderTarget({
      cid: 'b',
      cursorPos: 55,
      targets,
    })).toEqual({
      insertIndex: 3,
      currentIndex: 1,
      isNoop: false,
    });
  });

  it('applies child reorder only when the order actually changes', () => {
    expect(applyReorderOrder(['a', 'b', 'c'], 'b', 3)).toEqual(['a', 'c', 'b']);
    expect(applyReorderOrder(['a', 'b', 'c'], 'b', 2)).toBeNull();
    expect(applyReorderOrder(['a', 'b', 'c'], 'missing', 1)).toBeNull();
  });

  it('resolves resize bounds from left/top handles with snapping guides', () => {
    const result = resizeBoundsFromHandle({
      bounds: { left: 100, top: 100, right: 200, bottom: 200 },
      axis: 'tl',
      dx: 22,
      dy: 14,
      gridTargets: { xs: [120], ys: [112] },
      svgW: 500,
      svgH: 400,
      minWidth: 40,
      minHeight: 40,
    });

    expect(result.left).toBe(120);
    expect(result.top).toBe(112);
    expect(result.width).toBe(80);
    expect(result.height).toBe(88);
    expect(result.resizeLines).toEqual([
      { x1: 120, y1: 0, x2: 120, y2: 400 },
      { x1: 0, y1: 112, x2: 500, y2: 112 },
    ]);
  });

  it('clamps resize bounds to minimum size from right/bottom handles', () => {
    const result = resizeBoundsFromHandle({
      bounds: { left: 0, top: 0, right: 64, bottom: 64 },
      axis: 'br',
      dx: -80,
      dy: -80,
      gridTargets: { xs: [], ys: [] },
      svgW: 300,
      svgH: 300,
      minWidth: 32,
      minHeight: 24,
    });

    expect(result.right).toBe(32);
    expect(result.bottom).toBe(24);
    expect(result.width).toBe(32);
    expect(result.height).toBe(24);
    expect(result.resizeLines).toEqual([]);
  });

  it('resolves single-component resize deltas with snap guides', () => {
    const result = resolveSingleResizeOverride({
      axis: 'tl',
      dx: 18,
      dy: 10,
      baseX: 100,
      baseY: 200,
      baseW: 80,
      baseH: 40,
      origDx: 0,
      origDy: 0,
      origDw: 0,
      origDh: 0,
      gridTargets: { xs: [120], ys: [208] },
      svgW: 500,
      svgH: 400,
    });

    expect(result).toEqual({
      dx: 20,
      dy: 8,
      dw: -20,
      dh: -8,
      resizeLines: [
        { x1: 120, y1: 0, x2: 120, y2: 400 },
        { x1: 0, y1: 208, x2: 500, y2: 208 },
      ],
    });
  });
});
