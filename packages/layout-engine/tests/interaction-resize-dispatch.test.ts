import { describe, expect, it, vi } from 'vitest';
import {
  dispatchPreviewResizeMove,
  type PreviewResizeMoveDispatchOptions,
  type PreviewResizeMoveState,
} from '../src/preview-shell/interaction-resize-dispatch.js';

function createBaseOptions(
  state: PreviewResizeMoveState,
): PreviewResizeMoveDispatchOptions & {
  applied: Array<{ ids: string[]; propagated?: string[] }>;
  restored: string[][];
  setOverrideCalls: Array<{ id: string; patch: Record<string, number> }>;
  guideLines: Array<Array<Record<string, number>>>;
  scheduled: Array<{ cid: string; newW: number; newH: number; resizedW: boolean; resizedH: boolean }>;
} {
  const applied: Array<{ ids: string[]; propagated?: string[] }> = [];
  const restored: string[][] = [];
  const setOverrideCalls: Array<{ id: string; patch: Record<string, number> }> = [];
  const guideLines: Array<Array<Record<string, number>>> = [];
  const scheduled: Array<{ cid: string; newW: number; newH: number; resizedW: boolean; resizedH: boolean }> = [];

  return {
    state,
    clientX: state.startX,
    clientY: state.startY,
    gridTargets: {},
    svgW: 800,
    svgH: 600,
    hideHandles: vi.fn(),
    renderGuideLines: vi.fn((lines) => {
      guideLines.push(lines.map((line) => ({ ...line })));
    }),
    clearGuideLines: vi.fn(),
    restorePropagatedResizeOverrides: vi.fn((currentState) => {
      const ids = currentState.propagatedIds ? [...currentState.propagatedIds] : [];
      restored.push(ids);
      currentState.propagatedIds?.clear();
    }),
    applyInteractionOverrideEntries: vi.fn((entries, propagatedIds) => {
      applied.push({
        ids: entries.map((entry) => entry.id),
        propagated: propagatedIds ? [...propagatedIds] : undefined,
      });
      if (propagatedIds) {
        for (const entry of entries) propagatedIds.add(entry.id);
      }
    }),
    applyAllOverrides: vi.fn(),
    renderSelectionInspector: vi.fn(),
    updateInspector: vi.fn(),
    setOverride: vi.fn((id, patch) => {
      setOverrideCalls.push({ id, patch: { ...patch } });
    }),
    collectRecursiveRelayoutEntries: vi.fn(() => []),
    relayoutSiblingsAfterChildResize: vi.fn(() => ({})),
    scheduleV3ResizeRelayout: vi.fn((cid, newW, newH, resizedW, resizedH) => {
      scheduled.push({ cid, newW, newH, resizedW, resizedH });
    }),
    applied,
    restored,
    setOverrideCalls,
    guideLines,
    scheduled,
  };
}

describe('interaction resize dispatch helpers', () => {
  it('ignores pointer jitter until the resize actually moves', () => {
    const state: PreviewResizeMoveState = {
      cid: 'box',
      axis: 'br',
      startX: 100,
      startY: 200,
      hasMoved: false,
      snapshotRecorded: false,
      origOverrides: {},
    };
    const options = createBaseOptions(state);
    options.clientX = 101;
    options.clientY = 201;

    expect(dispatchPreviewResizeMove(options)).toEqual({
      kind: 'none',
      moved: false,
      hidHandles: false,
      scheduledRelayout: false,
    });
    expect(options.hideHandles).not.toHaveBeenCalled();
    expect(options.applyAllOverrides).not.toHaveBeenCalled();
    expect(state.hasMoved).toBe(false);
  });

  it('dispatches multi-selection resize updates and recursive relayout callbacks', () => {
    const state: PreviewResizeMoveState = {
      cid: 'a',
      axis: 'br',
      startX: 100,
      startY: 100,
      hasMoved: false,
      snapshotRecorded: false,
      propagatedIds: new Set(['stale-child']),
      origOverrides: {
        a: { dx: 0, dy: 0, dw: 0, dh: 0 },
        b: { dx: 4, dy: -4, dw: 0, dh: 0 },
        child: { dx: 1, dy: 2, dw: 3, dh: 4 },
      },
      selection: {
        ids: ['a', 'b'],
        primaryId: 'a',
        bounds: {
          left: 100,
          top: 100,
          right: 220,
          bottom: 180,
          width: 120,
          height: 80,
        },
        members: [
          {
            id: 'a',
            bounds: { left: 100, top: 100, right: 140, bottom: 140 },
            ancestorDx: 0,
            ancestorDy: 0,
            baseX: 100,
            baseY: 100,
            baseW: 40,
            baseH: 40,
            hasLayoutChildren: true,
          },
          {
            id: 'b',
            bounds: { left: 160, top: 120, right: 220, bottom: 180 },
            ancestorDx: 4,
            ancestorDy: -4,
            baseX: 156,
            baseY: 124,
            baseW: 60,
            baseH: 60,
            hasLayoutChildren: false,
          },
        ],
        minWidth: 24,
        minHeight: 24,
      },
    };
    const options = createBaseOptions(state);
    options.clientX = 116;
    options.clientY = 124;
    options.gridTargets = { xs: [236], ys: [204] };
    options.collectRecursiveRelayoutEntries = vi.fn(() => [
      { id: 'child', dx: 10, dy: 12, dw: 14, dh: 16 },
    ]);

    expect(dispatchPreviewResizeMove(options)).toEqual({
      kind: 'multi-selection',
      moved: true,
      hidHandles: true,
      scheduledRelayout: false,
    });
    expect(options.hideHandles).toHaveBeenCalledTimes(1);
    expect(options.renderGuideLines).toHaveBeenCalledTimes(1);
    expect(options.restored).toEqual([['stale-child']]);
    expect(options.applied).toEqual([
      { ids: ['a', 'b'], propagated: undefined },
      { ids: ['child'], propagated: [] },
    ]);
    expect([...state.propagatedIds ?? []]).toEqual(['child']);
    expect(options.applyAllOverrides).toHaveBeenCalledTimes(1);
    expect(options.renderSelectionInspector).toHaveBeenCalledWith('a');
  });

  it('dispatches single resize updates, sibling relayout, and v3 scheduling', () => {
    const state: PreviewResizeMoveState = {
      cid: 'box',
      axis: 'br',
      startX: 10,
      startY: 20,
      hasMoved: false,
      snapshotRecorded: false,
      origDx: 0,
      origDy: 0,
      origDw: 0,
      origDh: 0,
      origOverrides: {
        sibling: { dx: 8, dy: 4, dw: 2, dh: 0 },
      },
      v3BaseW: 100,
      v3BaseH: 80,
    };
    const options = createBaseOptions(state);
    options.clientX = 26;
    options.clientY = 36;
    options.nodeBounds = { x: 50, y: 60, width: 100, height: 80 };
    options.hasLayoutChildren = true;
    options.hasLayoutContext = true;
    options.isSelected = true;
    options.collectRecursiveRelayoutEntries = vi.fn(() => [
      { id: 'child', dx: 1, dy: 2, dw: 3, dh: 4 },
    ]);
    options.relayoutSiblingsAfterChildResize = vi.fn(() => ({
      sibling: { dx: 24, dy: -8, dh: 8 },
    }));

    expect(dispatchPreviewResizeMove(options)).toEqual({
      kind: 'single',
      moved: true,
      hidHandles: true,
      scheduledRelayout: true,
    });
    expect(options.clearGuideLines).toHaveBeenCalledTimes(1);
    expect(options.setOverrideCalls).toEqual([
      { id: 'box', patch: { dx: 0, dy: 0, dw: 16, dh: 16 } },
    ]);
    expect(options.applied).toEqual([
      { ids: ['child'], propagated: [] },
      { ids: ['sibling'], propagated: ['child'] },
    ]);
    expect(options.applyAllOverrides).toHaveBeenCalledTimes(1);
    expect(options.updateInspector).not.toHaveBeenCalled();
    expect(options.scheduled).toEqual([
      { cid: 'box', newW: 116, newH: 96, resizedW: true, resizedH: true },
    ]);
  });
});
