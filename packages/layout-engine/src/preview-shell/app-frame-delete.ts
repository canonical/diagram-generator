/**
 * Preview frame-delete helpers (spec 043 shell coordinator slice R).
 *
 * These helpers own delete planning and commit flow so editor.js only wires
 * concrete model mutations, rerender callbacks, and user notifications.
 */

export interface PreviewFrameDeleteNode {
  id: string;
  type?: string | null;
  ancestorIds: string[];
  descendantIds: string[];
}

export interface PreviewDeleteFrameCandidatesOptions {
  selectedIds: Iterable<string>;
  rootId: string;
  getNode: (id: string) => PreviewFrameDeleteNode | null | undefined;
}

export interface ResolvePreviewDiagramRootFrameIdOptions<TRootNode = { id?: string | null }> {
  getFrameTreeJson?: (() => {
    root?: {
      id?: string | null;
    } | null;
  } | null) | null;
  rootNodes: Iterable<TRootNode>;
  fallbackRootId?: string;
}

export interface DispatchPreviewDeleteFramesHostOptions<
  TAction = unknown,
  TNode extends PreviewFrameDeleteNode = PreviewFrameDeleteNode,
> {
  selectedIds: Iterable<string>;
  isTextEditing?: boolean;
  rootId: string;
  getNode: (id: string) => TNode | null | undefined;
  beginUndoableAction: (label: string) => TAction;
  markRemoved: (id: string) => void;
  clearOverride: (id: string) => void;
  unselect: (id: string) => void;
  setDirty: (dirty: boolean) => void;
  rerenderStage: () => Promise<boolean>;
  deselectAll: () => void;
  commitUndoableAction: (action: TAction) => void;
  alert?: ((message: string) => void) | null;
}

export interface DeletePreviewSelectedFramesHostOptions<
  TAction = unknown,
  TNode extends PreviewFrameDeleteNode = PreviewFrameDeleteNode,
  TRootNode extends { id?: string | null } = { id?: string | null },
> {
  selectedIds: Iterable<string>;
  isTextEditing?: boolean;
  getFrameTreeJson?: (() => {
    root?: {
      id?: string | null;
    } | null;
  } | null) | null;
  rootNodes: Iterable<TRootNode>;
  fallbackRootId?: string;
  getNode: (id: string) => TNode | null | undefined;
  beginUndoableAction: (label: string) => TAction;
  markRemoved: (id: string) => void;
  clearOverride: (id: string) => void;
  unselect: (id: string) => void;
  setDirty: (dirty: boolean) => void;
  rerenderStage: () => Promise<boolean>;
  deselectAll: () => void;
  commitUndoableAction: (action: TAction) => void;
  alert?: ((message: string) => void) | null;
}

export interface DispatchPreviewDeleteFramesOptions<TAction = unknown> {
  selectedIds: Iterable<string>;
  isTextEditing?: boolean;
  rootId: string;
  getNode: (id: string) => PreviewFrameDeleteNode | null | undefined;
  beginUndoableAction: (label: string) => TAction;
  markRemoved: (id: string) => void;
  clearOverride: (id: string) => void;
  unselect: (id: string) => void;
  setDirty: (dirty: boolean) => void;
  rerenderStage: () => Promise<boolean>;
  deselectAll: () => void;
  commitUndoableAction: (action: TAction) => void;
  alert?: ((message: string) => void) | null;
}

export interface DispatchPreviewDeleteFramesResult {
  kind: 'none' | 'blocked-root' | 'deleted' | 'rerender-failed';
  removedIds: string[];
  topLevelIds: string[];
  rerendered: boolean;
}

export function collectPreviewSubtreeRemovalIds(
  frameIds: Iterable<string>,
  getNode: (id: string) => PreviewFrameDeleteNode | null | undefined,
): string[] {
  const all = new Set<string>();
  for (const id of frameIds) {
    const node = getNode(id);
    if (!node) {
      all.add(id);
      continue;
    }
    all.add(id);
    node.descendantIds.forEach((descendantId) => all.add(descendantId));
  }
  return [...all];
}

export function resolvePreviewDeleteTopLevelTargets(
  frameIds: Iterable<string>,
  getNode: (id: string) => PreviewFrameDeleteNode | null | undefined,
): string[] {
  const idSet = new Set(frameIds);
  return [...idSet].filter((id) => {
    const node = getNode(id);
    if (!node) {
      return true;
    }
    return !node.ancestorIds.some((ancestorId) => idSet.has(ancestorId));
  });
}

export function resolvePreviewDeleteCandidates(
  options: PreviewDeleteFrameCandidatesOptions,
): string[] {
  return [...options.selectedIds].filter((id) => {
    if (id === options.rootId) {
      return false;
    }
    const node = options.getNode(id);
    return Boolean(node && node.type !== 'arrow');
  });
}

export function resolvePreviewDiagramRootFrameId<TRootNode extends { id?: string | null }>(
  options: ResolvePreviewDiagramRootFrameIdOptions<TRootNode>,
): string {
  const tree = options.getFrameTreeJson?.() || null;
  if (tree?.root?.id) {
    return tree.root.id;
  }
  const rootNode = [...options.rootNodes][0];
  if (rootNode?.id) {
    return rootNode.id;
  }
  return options.fallbackRootId || 'page';
}

export async function dispatchPreviewDeleteFrames<TAction = unknown>(
  options: DispatchPreviewDeleteFramesOptions<TAction>,
): Promise<DispatchPreviewDeleteFramesResult> {
  const selectedIds = [...options.selectedIds];
  if (selectedIds.length === 0 || options.isTextEditing) {
    return {
      kind: 'none',
      removedIds: [],
      topLevelIds: [],
      rerendered: false,
    };
  }

  const candidates = resolvePreviewDeleteCandidates({
    selectedIds,
    rootId: options.rootId,
    getNode: options.getNode,
  });
  if (candidates.length === 0) {
    options.alert?.('Cannot delete the diagram root.');
    return {
      kind: 'blocked-root',
      removedIds: [],
      topLevelIds: [],
      rerendered: false,
    };
  }

  const topLevelIds = resolvePreviewDeleteTopLevelTargets(candidates, options.getNode);
  const removedIds = collectPreviewSubtreeRemovalIds(topLevelIds, options.getNode);
  const action = options.beginUndoableAction('Delete frame');

  for (const id of removedIds) {
    options.markRemoved(id);
    options.clearOverride(id);
    options.unselect(id);
  }

  options.setDirty(true);
  const rerendered = await options.rerenderStage();
  if (!rerendered) {
    options.alert?.('Relayout failed after delete.');
  } else {
    options.deselectAll();
  }
  options.commitUndoableAction(action);

  return {
    kind: rerendered ? 'deleted' : 'rerender-failed',
    removedIds,
    topLevelIds,
    rerendered,
  };
}

export function dispatchPreviewDeleteFramesHost<
  TAction = unknown,
  TNode extends PreviewFrameDeleteNode = PreviewFrameDeleteNode,
>(
  options: DispatchPreviewDeleteFramesHostOptions<TAction, TNode>,
): Promise<DispatchPreviewDeleteFramesResult> {
  return dispatchPreviewDeleteFrames({
    selectedIds: options.selectedIds,
    isTextEditing: options.isTextEditing,
    rootId: options.rootId,
    getNode: options.getNode,
    beginUndoableAction: options.beginUndoableAction,
    markRemoved: options.markRemoved,
    clearOverride: options.clearOverride,
    unselect: options.unselect,
    setDirty: options.setDirty,
    rerenderStage: options.rerenderStage,
    deselectAll: options.deselectAll,
    commitUndoableAction: options.commitUndoableAction,
    alert: options.alert,
  });
}

export function deletePreviewSelectedFramesHost<
  TAction = unknown,
  TNode extends PreviewFrameDeleteNode = PreviewFrameDeleteNode,
  TRootNode extends { id?: string | null } = { id?: string | null },
>(
  options: DeletePreviewSelectedFramesHostOptions<TAction, TNode, TRootNode>,
): Promise<DispatchPreviewDeleteFramesResult> {
  return dispatchPreviewDeleteFrames({
    selectedIds: options.selectedIds,
    isTextEditing: options.isTextEditing,
    rootId: resolvePreviewDiagramRootFrameId({
      getFrameTreeJson: options.getFrameTreeJson,
      rootNodes: options.rootNodes,
      fallbackRootId: options.fallbackRootId,
    }),
    getNode: options.getNode,
    beginUndoableAction: options.beginUndoableAction,
    markRemoved: options.markRemoved,
    clearOverride: options.clearOverride,
    unselect: options.unselect,
    setDirty: options.setDirty,
    rerenderStage: options.rerenderStage,
    deselectAll: options.deselectAll,
    commitUndoableAction: options.commitUndoableAction,
    alert: options.alert,
  });
}
