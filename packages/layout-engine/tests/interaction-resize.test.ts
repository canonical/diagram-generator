import { describe, expect, it } from 'vitest';
import {
  collectRecursiveRelayoutEntries,
  createMultiSelectionResizeOverrides,
  createOriginalOverrideEntries,
  createResizePersistencePlan,
  mergeRelativeOverrideEntries,
} from '../src/preview-shell/interaction-resize.js';

describe('interaction resize helpers', () => {
  it('creates original override entries with deduped ids', () => {
    expect(createOriginalOverrideEntries(
      ['a', 'b', 'a'],
      {
        a: { dx: 10, dw: 4 },
        b: { dy: -8, dh: 12 },
      },
    )).toEqual([
      { id: 'a', dx: 10, dy: 0, dw: 4, dh: 0 },
      { id: 'b', dx: 0, dy: -8, dw: 0, dh: 12 },
    ]);
  });

  it('resolves scaled multi-selection resize overrides for each member', () => {
    expect(createMultiSelectionResizeOverrides({
      selectionBounds: { left: 100, top: 200, width: 200, height: 100 },
      nextBounds: { left: 80, top: 180, width: 300, height: 150 },
      members: [
        {
          id: 'a',
          bounds: { left: 100, top: 200, right: 180, bottom: 240 },
          ancestorDx: 0,
          ancestorDy: 0,
          baseX: 100,
          baseY: 200,
          baseW: 80,
          baseH: 40,
          hasLayoutChildren: false,
        },
        {
          id: 'b',
          bounds: { left: 220, top: 220, right: 300, bottom: 300 },
          ancestorDx: 12,
          ancestorDy: -4,
          baseX: 200,
          baseY: 210,
          baseW: 80,
          baseH: 80,
          hasLayoutChildren: true,
        },
      ],
    })).toEqual([
      {
        id: 'a',
        dx: -20,
        dy: -20,
        dw: 40,
        dh: 20,
        hasLayoutChildren: false,
      },
      {
        id: 'b',
        dx: 48,
        dy: 4,
        dw: 40,
        dh: 40,
        hasLayoutChildren: true,
      },
    ]);
  });

  it('merges relative sibling relayout patches onto original overrides', () => {
    expect(mergeRelativeOverrideEntries(
      {
        a: { dx: 24 },
        b: { dy: -16, dh: 8 },
      },
      {
        a: { dx: 8, dy: 4, dw: 2, dh: 0 },
        b: { dx: -8, dy: 12, dw: 0, dh: 10 },
      },
    )).toEqual([
      { id: 'a', dx: 32, dy: 4, dw: 2, dh: 0 },
      { id: 'b', dx: -8, dy: -4, dw: 0, dh: 18 },
    ]);
  });

  it('collects recursive relayout entries depth-first for layout descendants', () => {
    const relayoutCalls: Array<{ parentId: string; dx: number; dy: number; dw: number; dh: number }> = [];
    const entries = collectRecursiveRelayoutEntries({
      parentId: 'root',
      parentDelta: { dx: 10, dy: 12, dw: 20, dh: 24 },
      relayoutChildren(parentId, parentDelta) {
        relayoutCalls.push({ parentId, ...parentDelta });
        if (parentId === 'root') {
          return {
            childA: { dx: 1, dy: 2, dw: 3, dh: 4 },
            childB: { dx: 5, dy: 6, dw: 7, dh: 8 },
          };
        }
        if (parentId === 'childA') {
          return {
            grandchild: { dx: -2, dy: -4, dw: 6, dh: 8 },
          };
        }
        return {};
      },
      hasLayoutChildren(id) {
        return id === 'childA';
      },
    });

    expect(relayoutCalls).toEqual([
      { parentId: 'root', dx: 10, dy: 12, dw: 20, dh: 24 },
      { parentId: 'childA', dx: 1, dy: 2, dw: 3, dh: 4 },
    ]);
    expect(entries).toEqual([
      { id: 'childA', dx: 1, dy: 2, dw: 3, dh: 4 },
      { id: 'grandchild', dx: -2, dy: -4, dw: 6, dh: 8 },
      { id: 'childB', dx: 5, dy: 6, dw: 7, dh: 8 },
    ]);
  });

  it('builds a resize persistence plan with fixed-size entries and propagated resets', () => {
    expect(createResizePersistencePlan({
      items: [
        {
          id: 'a',
          baseW: 100,
          baseH: 60,
          delta: { dw: 24, dh: 0 },
        },
        {
          id: 'b',
          baseW: 80,
          baseH: 48,
          delta: { dw: 0, dh: -80 },
        },
        {
          id: 'c',
          baseW: 64,
          baseH: 64,
          delta: { dw: 0, dh: 0 },
        },
      ],
      propagatedIds: ['child-1', 'child-2', 'child-1'],
      minSize: 8,
    })).toEqual({
      changed: true,
      entries: [
        {
          id: 'a',
          width: 124,
          height: undefined,
          sizingWFixed: true,
          sizingHFixed: false,
        },
        {
          id: 'b',
          width: undefined,
          height: 8,
          sizingWFixed: false,
          sizingHFixed: true,
        },
      ],
      resetIds: ['child-1', 'child-2'],
      shouldTriggerRelayout: true,
    });
  });
});
