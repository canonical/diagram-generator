import { describe, expect, it, vi } from 'vitest';
import {
  collectPreviewSubtreeRemovalIds,
  deletePreviewSelectedFramesHost,
  dispatchPreviewDeleteFramesHost,
  dispatchPreviewDeleteFrames,
  resolvePreviewDiagramRootFrameId,
  resolvePreviewDeleteTopLevelTargets,
} from '../src/preview-shell/app-frame-delete.js';

describe('preview frame-delete helpers', () => {
  const nodes = {
    root: { id: 'root', type: 'box', ancestorIds: [], descendantIds: ['parent', 'child'] },
    parent: { id: 'parent', type: 'box', ancestorIds: ['root'], descendantIds: ['child'] },
    child: { id: 'child', type: 'box', ancestorIds: ['root', 'parent'], descendantIds: [] },
    arrow: { id: 'arrow', type: 'arrow', ancestorIds: [], descendantIds: [] },
  };
  const getNode = (id: string) => nodes[id as keyof typeof nodes] || null;

  it('keeps only top-level delete targets and collects their subtree ids', () => {
    expect(resolvePreviewDeleteTopLevelTargets(['parent', 'child'], getNode)).toEqual(['parent']);
    expect(collectPreviewSubtreeRemovalIds(['parent'], getNode)).toEqual(['parent', 'child']);
  });

  it('blocks root-only deletes and reports the user-facing message', async () => {
    const alert = vi.fn();

    await expect(dispatchPreviewDeleteFrames({
      selectedIds: ['root'],
      rootId: 'root',
      getNode,
      beginUndoableAction: vi.fn(),
      markRemoved: vi.fn(),
      clearOverride: vi.fn(),
      unselect: vi.fn(),
      setDirty: vi.fn(),
      rerenderStage: vi.fn(),
      deselectAll: vi.fn(),
      commitUndoableAction: vi.fn(),
      alert,
    })).resolves.toEqual({
      kind: 'blocked-root',
      removedIds: [],
      topLevelIds: [],
      rerendered: false,
    });
    expect(alert).toHaveBeenCalledWith('Cannot delete the diagram root.');
  });

  it('removes top-level frame subtrees, rerenders, and commits the undo action', async () => {
    const removed: string[] = [];
    const cleared: string[] = [];
    const unselected: string[] = [];
    const beginUndoableAction = vi.fn(() => ({ label: 'Delete frame' }));
    const commitUndoableAction = vi.fn();
    const deselectAll = vi.fn();

    await expect(dispatchPreviewDeleteFrames({
      selectedIds: ['parent', 'child'],
      rootId: 'root',
      getNode,
      beginUndoableAction,
      markRemoved: (id) => removed.push(id),
      clearOverride: (id) => cleared.push(id),
      unselect: (id) => unselected.push(id),
      setDirty: vi.fn(),
      rerenderStage: vi.fn(async () => true),
      deselectAll,
      commitUndoableAction,
      alert: vi.fn(),
    })).resolves.toEqual({
      kind: 'deleted',
      removedIds: ['parent', 'child'],
      topLevelIds: ['parent'],
      rerendered: true,
    });
    expect(beginUndoableAction).toHaveBeenCalledWith('Delete frame');
    expect(removed).toEqual(['parent', 'child']);
    expect(cleared).toEqual(['parent', 'child']);
    expect(unselected).toEqual(['parent', 'child']);
    expect(deselectAll).toHaveBeenCalledTimes(1);
    expect(commitUndoableAction).toHaveBeenCalledWith({ label: 'Delete frame' });
  });

  it('resolves the diagram root id and exposes a host wrapper for delete dispatch', async () => {
    expect(resolvePreviewDiagramRootFrameId({
      getFrameTreeJson: () => ({ root: { id: 'tree-root' } }),
      rootNodes: [{ id: 'page-root' }],
    })).toBe('tree-root');
    expect(resolvePreviewDiagramRootFrameId({
      getFrameTreeJson: () => null,
      rootNodes: [{ id: 'page-root' }],
    })).toBe('page-root');

    await expect(dispatchPreviewDeleteFramesHost({
      selectedIds: ['parent'],
      isTextEditing: false,
      rootId: 'root',
      getNode,
      beginUndoableAction: vi.fn(() => ({ label: 'Delete frame' })),
      markRemoved: vi.fn(),
      clearOverride: vi.fn(),
      unselect: vi.fn(),
      setDirty: vi.fn(),
      rerenderStage: vi.fn(async () => true),
      deselectAll: vi.fn(),
      commitUndoableAction: vi.fn(),
      alert: vi.fn(),
    })).resolves.toMatchObject({
      kind: 'deleted',
      removedIds: ['parent', 'child'],
      topLevelIds: ['parent'],
      rerendered: true,
    });

    await expect(deletePreviewSelectedFramesHost({
      selectedIds: ['parent'],
      isTextEditing: false,
      getFrameTreeJson: () => ({ root: { id: 'tree-root' } }),
      rootNodes: [{ id: 'page-root' }],
      getNode,
      beginUndoableAction: vi.fn(() => ({ label: 'Delete frame' })),
      markRemoved: vi.fn(),
      clearOverride: vi.fn(),
      unselect: vi.fn(),
      setDirty: vi.fn(),
      rerenderStage: vi.fn(async () => true),
      deselectAll: vi.fn(),
      commitUndoableAction: vi.fn(),
      alert: vi.fn(),
    })).resolves.toMatchObject({
      kind: 'deleted',
      removedIds: ['parent', 'child'],
      topLevelIds: ['parent'],
      rerendered: true,
    });
  });
});
