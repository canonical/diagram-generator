import { describe, expect, it } from 'vitest';
import {
  resolveDragCompletion,
  resolveResizeCompletion,
} from '../src/preview-shell/interaction-completion.js';

describe('interaction completion helpers', () => {
  it('selects the active component when a drag never moved', () => {
    expect(resolveDragCompletion({
      hasMoved: false,
      autolayout: false,
      cid: 'leaf',
      cids: ['leaf'],
    })).toEqual({
      kind: 'select-only',
      selectedId: 'leaf',
      autoFit: false,
    });
  });

  it('resolves autolayout reorder completion separately from free drag commits', () => {
    expect(resolveDragCompletion({
      hasMoved: true,
      autolayout: true,
      cid: 'leaf',
      cids: ['leaf'],
      reorderTarget: { parentId: 'stack', insertIndex: 2 },
    })).toEqual({
      kind: 'apply-reorder',
      selectedId: 'leaf',
      parentId: 'stack',
      insertIndex: 2,
      autoFit: false,
    });

    expect(resolveDragCompletion({
      hasMoved: true,
      autolayout: false,
      cid: 'leaf',
      cids: ['a', 'b'],
    })).toEqual({
      kind: 'commit-free-drag',
      selectedId: 'leaf',
      cleanIds: ['a', 'b'],
      captureAfterIds: ['a', 'b'],
      actionLabel: 'Move selection',
      reapplySelection: true,
      autoFit: true,
    });
  });

  it('returns a no-op for moved autolayout drags without a reorder target', () => {
    expect(resolveDragCompletion({
      hasMoved: true,
      autolayout: true,
      cid: 'leaf',
      cids: ['leaf'],
      reorderTarget: null,
    })).toEqual({
      kind: 'none',
      autoFit: false,
    });
  });

  it('resolves resize completion for a single resized component', () => {
    expect(resolveResizeCompletion({
      hasMoved: true,
      cid: 'leaf',
      origOverrideIds: ['leaf', 'parent'],
      propagatedIds: ['parent', 'child', 'child'],
    })).toEqual({
      kind: 'commit-resize',
      selectedId: 'leaf',
      resizedIds: ['leaf'],
      cleanIds: ['leaf'],
      propagatedIdsToClean: ['parent', 'child'],
      captureAfterIds: ['leaf', 'parent'],
      actionLabel: 'Resize component',
      reapplySelection: false,
      autoFit: true,
    });
  });

  it('resolves resize completion for a multi-selection resize', () => {
    expect(resolveResizeCompletion({
      hasMoved: true,
      cid: 'primary',
      selectionIds: ['a', 'b'],
      origOverrideIds: ['a', 'b', 'parent'],
      propagatedIds: ['parent'],
    })).toEqual({
      kind: 'commit-resize',
      selectedId: 'primary',
      resizedIds: ['a', 'b'],
      cleanIds: ['a', 'b'],
      propagatedIdsToClean: ['parent'],
      captureAfterIds: ['a', 'b', 'parent'],
      actionLabel: 'Resize selection',
      reapplySelection: true,
      autoFit: true,
    });
  });
});
