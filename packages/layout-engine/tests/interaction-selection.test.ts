import { describe, expect, it } from 'vitest';
import {
  isAutolayoutParentLayout,
  resolveDoubleClickSelection,
  resolvePointerSelection,
} from '../src/preview-shell/interaction-selection.js';

describe('interaction selection helpers', () => {
  it('recognizes autolayout parent layouts', () => {
    expect(isAutolayoutParentLayout('vertical')).toBe(true);
    expect(isAutolayoutParentLayout('horizontal')).toBe(true);
    expect(isAutolayoutParentLayout('stack')).toBe(false);
    expect(isAutolayoutParentLayout(null)).toBe(false);
  });

  it('resolves pointer selection for deepest-jump and top-level resets', () => {
    expect(resolvePointerSelection({
      currentSelectionDepth: 2,
      jumpToDeepest: true,
      deepestId: 'leaf',
      deepestDepth: 3,
    })).toEqual({
      kind: 'select-only',
      targetId: 'leaf',
      additive: false,
      nextSelectionDepth: 3,
    });

    expect(resolvePointerSelection({
      currentSelectionDepth: 2,
      currentDepthId: 'nested',
      topLevelId: 'root-b',
      currentSelectedTopLevelId: 'root-a',
    })).toEqual({
      kind: 'prepare-drag',
      targetId: 'root-b',
      additive: false,
      nextSelectionDepth: 0,
    });
  });

  it('resolves arrow and shift-click selections as immediate select-only actions', () => {
    expect(resolvePointerSelection({
      currentSelectionDepth: 1,
      arrowId: 'arrow-1',
      shiftKey: true,
    })).toEqual({
      kind: 'select-only',
      targetId: 'arrow-1',
      additive: true,
      nextSelectionDepth: 0,
    });

    expect(resolvePointerSelection({
      currentSelectionDepth: 1,
      currentDepthId: 'child',
      topLevelId: 'root',
      shiftKey: true,
    })).toEqual({
      kind: 'select-only',
      targetId: 'child',
      additive: true,
      nextSelectionDepth: 1,
    });
  });

  it('resolves double-click selection depth changes', () => {
    expect(resolveDoubleClickSelection({
      currentSelectionDepth: 1,
      currentHitId: 'parent',
      currentHitIsSelected: true,
      currentHitChildIds: ['a', 'b'],
    })).toEqual({
      kind: 'select-children',
      nextSelectionDepth: 2,
    });

    expect(resolveDoubleClickSelection({
      currentSelectionDepth: 0,
      deeperHitId: 'child',
    })).toEqual({
      kind: 'select-deeper',
      targetId: 'child',
      nextSelectionDepth: 1,
    });
  });
});
