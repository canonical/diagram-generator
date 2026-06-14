import { describe, expect, it, vi } from 'vitest';
import {
  dispatchPreviewDragMove,
  type PreviewDragMoveDispatchOptions,
  type PreviewDragMoveState,
} from '../src/preview-shell/interaction-drag-dispatch.js';

function createBaseOptions(
  state: PreviewDragMoveState,
): PreviewDragMoveDispatchOptions & {
  setOverrideCalls: Array<{ id: string; patch: Record<string, number> }>;
  renderedGuideLines: Array<Array<Record<string, number>>>;
} {
  const setOverrideCalls: Array<{ id: string; patch: Record<string, number> }> = [];
  const renderedGuideLines: Array<Array<Record<string, number>>> = [];

  return {
    state,
    clientX: state.startX,
    clientY: state.startY,
    showReorderIndicator: vi.fn(),
    clearReorderIndicator: vi.fn(),
    resolveSnap: vi.fn((_cid, proposedDx, proposedDy) => ({
      dx: proposedDx,
      dy: proposedDy,
      lines: [],
    })),
    renderGuideLines: vi.fn((lines) => {
      renderedGuideLines.push(lines.map((line) => ({ ...line })));
    }),
    clampDragDelta: vi.fn((_cid, proposedDx, proposedDy) => ({
      dx: proposedDx,
      dy: proposedDy,
    })),
    setOverride: vi.fn((id, patch) => {
      setOverrideCalls.push({ id, patch: { ...patch } });
    }),
    applyAllOverrides: vi.fn(),
    updateInspector: vi.fn(),
    setOverrideCalls,
    renderedGuideLines,
  };
}

describe('interaction drag dispatch helpers', () => {
  it('ignores pointer jitter until drag movement crosses the threshold', () => {
    const state: PreviewDragMoveState = {
      cid: 'box',
      cids: ['box'],
      startX: 100,
      startY: 200,
      hasMoved: false,
      origDeltas: {
        box: { dx: 8, dy: -8 },
      },
    };
    const options = createBaseOptions(state);
    options.clientX = 101;
    options.clientY = 201;

    expect(dispatchPreviewDragMove(options)).toEqual({
      kind: 'none',
      moved: false,
      appliedIds: [],
      guideLineCount: 0,
    });
    expect(options.setOverride).not.toHaveBeenCalled();
    expect(options.applyAllOverrides).not.toHaveBeenCalled();
    expect(state.hasMoved).toBe(false);
  });

  it('updates autolayout reorder state through the dispatcher', () => {
    const state: PreviewDragMoveState = {
      cid: 'child-a',
      cids: ['child-a'],
      startX: 0,
      startY: 0,
      hasMoved: false,
      autolayout: true,
      reorderTarget: { parentId: 'parent', insertIndex: 0 },
      origDeltas: {
        'child-a': { dx: 0, dy: 0 },
      },
    };
    const options = createBaseOptions(state);
    options.clientX = 20;
    options.clientY = 0;
    options.autolayoutContext = {
      parentId: 'parent',
      isVertical: false,
      cursorPos: 260,
      targets: [
        { cid: 'child-a', midpoint: 120 },
        { cid: 'child-b', midpoint: 220 },
        { cid: 'child-c', midpoint: 320 },
      ],
    };

    expect(dispatchPreviewDragMove(options)).toEqual({
      kind: 'autolayout',
      moved: true,
      appliedIds: [],
      guideLineCount: 0,
    });
    expect(options.showReorderIndicator).toHaveBeenCalledWith('parent', 2, false);
    expect(options.clearReorderIndicator).not.toHaveBeenCalled();
    expect(state.reorderTarget).toEqual({ parentId: 'parent', insertIndex: 2 });
    expect(options.setOverride).not.toHaveBeenCalled();
  });

  it('applies snapped and clamped free-drag overrides and updates the inspector', () => {
    const state: PreviewDragMoveState = {
      cid: 'box',
      cids: ['box'],
      startX: 10,
      startY: 20,
      hasMoved: false,
      origDeltas: {
        box: { dx: 8, dy: -8 },
      },
      snapTargets: { xs: [100], ys: [200] },
    };
    const options = createBaseOptions(state);
    options.clientX = 27;
    options.clientY = 37;
    options.resolveSnap = vi.fn(() => ({
      dx: 32,
      dy: 16,
      lines: [{ x1: 100, y1: 0, x2: 100, y2: 400 }],
    }));
    options.clampDragDelta = vi.fn(() => ({
      dx: 40,
      dy: 16,
    }));
    options.shouldUpdateInspector = true;

    expect(dispatchPreviewDragMove(options)).toEqual({
      kind: 'free-drag',
      moved: true,
      appliedIds: ['box'],
      guideLineCount: 1,
    });
    expect(options.resolveSnap).toHaveBeenCalledWith('box', 24, 8, { xs: [100], ys: [200] });
    expect(options.setOverrideCalls).toEqual([
      { id: 'box', patch: { dx: 40, dy: 16 } },
    ]);
    expect(options.renderedGuideLines).toEqual([
      [{ x1: 100, y1: 0, x2: 100, y2: 400 }],
    ]);
    expect(options.applyAllOverrides).toHaveBeenCalledTimes(1);
    expect(options.updateInspector).toHaveBeenCalledWith('box');
  });
});
