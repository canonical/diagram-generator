import { describe, expect, it, vi } from 'vitest';
import {
  dispatchPreviewDragCompletion,
  dispatchPreviewResizeCompletion,
} from '../src/preview-shell/interaction-completion-dispatch.js';

function createDragOptions() {
  return {
    state: null,
    applyReorder: vi.fn(),
    cleanOverride: vi.fn(),
    captureOverrideEntries: vi.fn(() => ({ after: true })),
    reapplySelection: vi.fn(),
    selectComponent: vi.fn(),
    commitOverridePatchAction: vi.fn(),
    endInteraction: vi.fn(),
    autoFitArtboard: vi.fn(),
  };
}

function createResizeOptions() {
  return {
    state: null,
    cleanOverride: vi.fn(),
    captureOverrideEntries: vi.fn(() => ({ after: true })),
    reapplySelection: vi.fn(),
    selectComponent: vi.fn(),
    commitOverridePatchAction: vi.fn(),
    persistResize: vi.fn(),
    showHandles: vi.fn(),
    endInteraction: vi.fn(),
    autoFitArtboard: vi.fn(),
  };
}

describe('interaction completion dispatch helpers', () => {
  it('dispatches free-drag completion through cleanup, selection, and commit callbacks', () => {
    const options = createDragOptions();
    const actions: string[] = [];
    options.commitOverridePatchAction.mockImplementation(() => {
      actions.push('commit');
    });
    options.state = {
      hasMoved: true,
      autolayout: false,
      cid: 'leaf',
      cids: ['a', 'b'],
      reorderTarget: null,
      overrideSnapshotBefore: { before: true },
    };
    options.transaction = {
      activeEngineId: 'elk-force',
      documentKind: 'frame-diagram',
      onMutationTransaction(result) {
        actions.push(`${result.mutationKind}:${result.sourceControl}:${result.relayoutPolicy}`);
      },
    };

    const plan = dispatchPreviewDragCompletion(options);

    expect(plan).toEqual({
      kind: 'commit-free-drag',
      selectedId: 'leaf',
      cleanIds: ['a', 'b'],
      captureAfterIds: ['a', 'b'],
      actionLabel: 'Move selection',
      reapplySelection: true,
      autoFit: true,
    });
    expect(options.cleanOverride).toHaveBeenCalledTimes(2);
    expect(options.captureOverrideEntries).toHaveBeenCalledWith(['a', 'b']);
    expect(options.reapplySelection).toHaveBeenCalledTimes(1);
    expect(options.commitOverridePatchAction).toHaveBeenCalledWith(
      'Move selection',
      { before: true },
      { after: true },
    );
    expect(actions).toEqual(['geometry:drag-free:local', 'commit']);
    expect(options.endInteraction).toHaveBeenCalledTimes(1);
    expect(options.autoFitArtboard).toHaveBeenCalledTimes(1);
  });

  it('dispatches autolayout reorder completion through reorder and selection callbacks', () => {
    const options = createDragOptions();
    const actions: string[] = [];
    options.applyReorder.mockImplementation(() => {
      actions.push('apply-reorder');
    });
    options.state = {
      hasMoved: true,
      autolayout: true,
      cid: 'leaf',
      cids: ['leaf'],
      reorderTarget: { parentId: 'stack', insertIndex: 3 },
      overrideSnapshotBefore: null,
    };
    options.transaction = {
      activeEngineId: 'v3',
      documentKind: 'frame-diagram',
      onMutationTransaction(result) {
        actions.push(`${result.mutationKind}:${result.sourceControl}:${result.relayoutPolicy}`);
        expect(result.persistenceDelta).toEqual({
          frameOverridesChanged: false,
          frameTreeChanged: true,
          savePayloadChanged: true,
        });
      },
    };

    const plan = dispatchPreviewDragCompletion(options);

    expect(plan).toEqual({
      kind: 'apply-reorder',
      selectedId: 'leaf',
      parentId: 'stack',
      insertIndex: 3,
      autoFit: false,
    });
    expect(options.applyReorder).toHaveBeenCalledWith('stack', 'leaf', 3);
    expect(options.selectComponent).toHaveBeenCalledWith('leaf');
    expect(options.commitOverridePatchAction).not.toHaveBeenCalled();
    expect(actions).toEqual(['geometry:drag-reorder:local', 'apply-reorder']);
    expect(options.autoFitArtboard).not.toHaveBeenCalled();
  });

  it('re-shows handles when a resize did not move', () => {
    const options = createResizeOptions();
    options.state = {
      hasMoved: false,
      cid: 'leaf',
      selectionIds: null,
      origOverrideIds: [],
      propagatedIds: null,
      overrideSnapshotBefore: null,
    };

    const plan = dispatchPreviewResizeCompletion(options);

    expect(plan).toEqual({
      kind: 'none',
      showHandles: true,
      autoFit: false,
    });
    expect(options.showHandles).toHaveBeenCalledTimes(1);
    expect(options.persistResize).not.toHaveBeenCalled();
    expect(options.endInteraction).toHaveBeenCalledTimes(1);
  });

  it('dispatches resize completion through cleanup, commit, and persistence callbacks', () => {
    const options = createResizeOptions();
    const actions: string[] = [];
    options.commitOverridePatchAction.mockImplementation(() => {
      actions.push('commit');
    });
    options.persistResize.mockImplementation(() => {
      actions.push('persist');
    });
    options.state = {
      hasMoved: true,
      cid: 'primary',
      selectionIds: ['a', 'b'],
      origOverrideIds: ['a', 'b', 'parent'],
      propagatedIds: ['parent'],
      overrideSnapshotBefore: { before: true },
    };
    options.transaction = {
      activeEngineId: 'v3',
      documentKind: 'frame-diagram',
      onMutationTransaction(result) {
        actions.push(`${result.mutationKind}:${result.sourceControl}:${result.relayoutPolicy}`);
        expect(result.dirtyPolicy).toBe('mark-dirty');
        expect(result.undoPolicy).toBe('record');
      },
    };

    const plan = dispatchPreviewResizeCompletion(options);

    expect(plan).toEqual({
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
    expect(options.cleanOverride).toHaveBeenCalledTimes(3);
    expect(options.captureOverrideEntries).toHaveBeenCalledWith(['a', 'b', 'parent']);
    expect(options.reapplySelection).toHaveBeenCalledTimes(1);
    expect(options.commitOverridePatchAction).toHaveBeenCalledWith(
      'Resize selection',
      { before: true },
      { after: true },
    );
    expect(options.persistResize).toHaveBeenCalledWith(['a', 'b'], ['parent'], 'primary', null);
    expect(actions).toEqual(['geometry:resize-handle:local', 'commit', 'persist']);
    expect(options.autoFitArtboard).toHaveBeenCalledTimes(1);
  });
});
