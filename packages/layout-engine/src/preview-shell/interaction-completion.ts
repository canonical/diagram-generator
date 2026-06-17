/**
 * Interaction completion helpers (spec 043 interaction slice F).
 *
 * These helpers resolve drag/resize completion branches while the shell still
 * owns DOM teardown, override application, and persistence calls.
 */

export interface DragReorderTarget {
  parentId: string;
  insertIndex: number;
}

export type DragCompletionPlan =
  | { kind: 'none'; autoFit: false }
  | { kind: 'select-only'; selectedId: string; autoFit: false }
  | {
    kind: 'apply-reorder';
    selectedId: string;
    parentId: string;
    insertIndex: number;
    autoFit: false;
  }
  | {
    kind: 'commit-free-drag';
    selectedId: string;
    cleanIds: string[];
    captureAfterIds: string[];
    actionLabel: string;
    reapplySelection: boolean;
    autoFit: true;
  };

export type ResizeCompletionPlan =
  | { kind: 'none'; showHandles: boolean; autoFit: false }
  | {
    kind: 'commit-resize';
    selectedId: string;
    resizedIds: string[];
    cleanIds: string[];
    propagatedIdsToClean: string[];
    captureAfterIds: string[];
    actionLabel: string;
    reapplySelection: boolean;
    autoFit: true;
  };

function uniqueIds(ids: Iterable<string>): string[] {
  return [...new Set(ids)].filter(Boolean);
}

export function resolveDragCompletion(options: {
  hasMoved?: boolean;
  autolayout?: boolean;
  cid: string;
  cids: string[];
  reorderTarget?: DragReorderTarget | null;
}): DragCompletionPlan {
  if (!options.hasMoved) {
    return {
      kind: 'select-only',
      selectedId: options.cid,
      autoFit: false,
    };
  }

  if (options.autolayout) {
    if (options.reorderTarget && options.cids.length === 1) {
      return {
        kind: 'apply-reorder',
        selectedId: options.cid,
        parentId: options.reorderTarget.parentId,
        insertIndex: options.reorderTarget.insertIndex,
        autoFit: false,
      };
    }
    return { kind: 'none', autoFit: false };
  }

  return {
    kind: 'commit-free-drag',
    selectedId: options.cid,
    cleanIds: uniqueIds(options.cids),
    captureAfterIds: uniqueIds(options.cids),
    actionLabel: options.cids.length > 1 ? 'Move selection' : 'Move component',
    reapplySelection: options.cids.length > 1,
    autoFit: true,
  };
}

export function resolveResizeCompletion(options: {
  hasMoved?: boolean;
  cid: string;
  selectionIds?: string[] | null;
  origOverrideIds: Iterable<string>;
  propagatedIds?: Iterable<string> | null;
}): ResizeCompletionPlan {
  if (!options.hasMoved) {
    return {
      kind: 'none',
      showHandles: true,
      autoFit: false,
    };
  }

  const resizedIds = uniqueIds(
    options.selectionIds && options.selectionIds.length > 0
      ? options.selectionIds
      : [options.cid],
  );
  const propagatedIdsToClean = uniqueIds(options.propagatedIds ?? []);

  return {
    kind: 'commit-resize',
    selectedId: options.cid,
    resizedIds,
    cleanIds: resizedIds,
    propagatedIdsToClean,
    captureAfterIds: uniqueIds(options.origOverrideIds),
    actionLabel: options.selectionIds && options.selectionIds.length > 0
      ? 'Resize selection'
      : 'Resize component',
    reapplySelection: Boolean(options.selectionIds && options.selectionIds.length > 0),
    autoFit: true,
  };
}
