/**
 * Preview state restore helpers (spec 043 shell coordinator slice C).
 *
 * These helpers own snapshot/override-patch restore planning so editor.js can
 * delegate undo/save rehydration without inlining the relayout decision tree.
 */

import {
  cloneEditorSnapshotValue,
  normalizeGridOverrides,
  parseEditorSnapshot,
} from './editor-snapshot.js';

export interface PreviewRestoreNode {
  type?: string | null;
}

export interface PreviewSerializedStateRestorePlan {
  nextOverrides: Record<string, unknown>;
  nextGridOverrides: Record<string, unknown>;
  nextElkLayoutOverrides: Record<string, unknown>;
  nextRemovedIds: Set<string>;
  nextFrameTree?: unknown;
  frameTreeChanged: boolean;
  removalsChanged: boolean;
  gridChanged: boolean;
  needsRelayout: boolean;
  execution: 'rerender-stage' | 'request-relayout' | 'local-reapply';
  relayoutTargetId: string;
  shouldPruneLinkedRootOverrides: boolean;
}

export interface PreviewOverridePatchRestorePlan {
  touchedIds: string[];
  needsRelayout: boolean;
  relayoutTargetId: string;
}

export interface RestorePreviewSerializedStateOptions {
  serializedState: string;
  currentOverrides: Record<string, unknown>;
  currentGridOverrides?: Record<string, unknown> | null;
  currentRemovedIds?: Iterable<string> | null;
  rootId: string;
  getNode: (cid: string) => PreviewRestoreNode | null | undefined;
  hasV3FrameOverride: (entry: unknown) => boolean;
  setOverrides: (nextOverrides: Record<string, unknown>) => void;
  setGridOverrides: (nextGridOverrides: Record<string, unknown>) => void;
  setElkLayoutOverrides: (nextElkLayoutOverrides: Record<string, unknown>) => void;
  setRemovedIds: (nextRemovedIds: Set<string>) => void;
  setFrameTree?: ((frameTree: unknown) => void) | null;
  pruneLinkedRootOverrides?: (() => void) | null;
  clearPendingRuntime: () => void;
  rerenderStageFromFrameTree: () => Promise<void>;
  requestRelayout: (triggerId: string) => Promise<void>;
  applyLocalRefresh: (options: { syncGridControls: boolean }) => void | Promise<void>;
  syncGridControls?: (() => void) | null;
  syncDirtyFromSerialized: (serializedState: string) => void;
  serializeDirtyState: () => string;
}

export interface RestorePreviewOverridePatchOptions {
  entries: Record<string, unknown | null> | null | undefined;
  currentOverrides: Record<string, unknown>;
  rootId: string;
  getNode: (cid: string) => PreviewRestoreNode | null | undefined;
  hasV3FrameOverride: (entry: unknown) => boolean;
  captureOverrideEntries: (ids: Iterable<string>) => Record<string, unknown | null>;
  setOverrides: (nextOverrides: Record<string, unknown>) => void;
  cleanOverride?: ((cid: string) => void) | null;
  clearPendingRuntime: () => void;
  requestRelayout: (triggerId: string) => Promise<void>;
  applyLocalRefresh: (options: { syncGridControls: boolean }) => void | Promise<void>;
  syncDirtyFromSerialized: (serializedState: string) => void;
  serializeDirtyState: () => string;
}

function setsDiffer(left: Set<string>, right: Set<string>): boolean {
  return left.size !== right.size || [...left].some((id) => !right.has(id));
}

export function snapshotNeedsPreviewRelayout(options: {
  snapshot: Record<string, unknown | null> | null | undefined;
  getNode: (cid: string) => PreviewRestoreNode | null | undefined;
  hasV3FrameOverride: (entry: unknown) => boolean;
}): boolean {
  for (const [cid, entry] of Object.entries(options.snapshot || {})) {
    const node = options.getNode(cid);
    if (!node || node.type === 'arrow') continue;
    if (entry == null || options.hasV3FrameOverride(entry)) return true;
  }
  return false;
}

export function restorePreviewOverrideEntries(options: {
  currentOverrides: Record<string, unknown>;
  entries: Record<string, unknown | null> | null | undefined;
}): Record<string, unknown> {
  const nextOverrides = cloneEditorSnapshotValue(options.currentOverrides || {});
  for (const [cid, entry] of Object.entries(options.entries || {})) {
    if (entry && typeof entry === 'object' && Object.keys(entry).length > 0) {
      nextOverrides[cid] = cloneEditorSnapshotValue(entry);
    } else {
      delete nextOverrides[cid];
    }
  }
  return nextOverrides;
}

export function resolvePreviewSerializedStateRestorePlan(options: {
  serializedState: string;
  currentOverrides: Record<string, unknown>;
  currentGridOverrides?: Record<string, unknown> | null;
  currentRemovedIds?: Iterable<string> | null;
  rootId: string;
  getNode: (cid: string) => PreviewRestoreNode | null | undefined;
  hasV3FrameOverride: (entry: unknown) => boolean;
}): PreviewSerializedStateRestorePlan {
  const rawParsed = JSON.parse(options.serializedState || '{}') as Record<string, unknown>;
  const parsed = parseEditorSnapshot(options.serializedState);
  const currentGridOverrides = normalizeGridOverrides(options.currentGridOverrides);
  const nextGridOverrides = normalizeGridOverrides(parsed.g);
  const currentRemovedIds = new Set(options.currentRemovedIds ?? []);
  const nextRemovedIds = new Set(Array.isArray(parsed.r) ? parsed.r : []);
  const frameTreeChanged = Object.prototype.hasOwnProperty.call(rawParsed, 'f');
  const removalsChanged = setsDiffer(currentRemovedIds, nextRemovedIds);
  const gridChanged = JSON.stringify(currentGridOverrides) !== JSON.stringify(nextGridOverrides);
  const needsRelayout = frameTreeChanged
    || removalsChanged
    || gridChanged
    || snapshotNeedsPreviewRelayout({
      snapshot: options.currentOverrides,
      getNode: options.getNode,
      hasV3FrameOverride: options.hasV3FrameOverride,
    })
    || snapshotNeedsPreviewRelayout({
      snapshot: parsed.o,
      getNode: options.getNode,
      hasV3FrameOverride: options.hasV3FrameOverride,
    });

  return {
    nextOverrides: cloneEditorSnapshotValue(parsed.o),
    nextGridOverrides,
    nextElkLayoutOverrides: cloneEditorSnapshotValue(parsed.e || {}),
    nextRemovedIds,
    nextFrameTree: parsed.f,
    frameTreeChanged,
    removalsChanged,
    gridChanged,
    needsRelayout,
    execution: needsRelayout
      ? ((frameTreeChanged || removalsChanged) ? 'rerender-stage' : 'request-relayout')
      : 'local-reapply',
    relayoutTargetId: options.rootId || 'root',
    shouldPruneLinkedRootOverrides: nextGridOverrides.link_to_root !== false,
  };
}

export function resolvePreviewOverridePatchRestorePlan(options: {
  entries: Record<string, unknown | null> | null | undefined;
  beforeEntries: Record<string, unknown | null>;
  rootId: string;
  getNode: (cid: string) => PreviewRestoreNode | null | undefined;
  hasV3FrameOverride: (entry: unknown) => boolean;
}): PreviewOverridePatchRestorePlan {
  const touchedIds = Object.keys(options.entries || {});
  return {
    touchedIds,
    needsRelayout: snapshotNeedsPreviewRelayout({
      snapshot: options.beforeEntries,
      getNode: options.getNode,
      hasV3FrameOverride: options.hasV3FrameOverride,
    }) || snapshotNeedsPreviewRelayout({
      snapshot: options.entries,
      getNode: options.getNode,
      hasV3FrameOverride: options.hasV3FrameOverride,
    }),
    relayoutTargetId: touchedIds[0] || options.rootId || 'root',
  };
}

export async function restorePreviewSerializedState(
  options: RestorePreviewSerializedStateOptions,
): Promise<void> {
  options.clearPendingRuntime();

  const plan = resolvePreviewSerializedStateRestorePlan({
    serializedState: options.serializedState,
    currentOverrides: options.currentOverrides,
    currentGridOverrides: options.currentGridOverrides,
    currentRemovedIds: options.currentRemovedIds,
    rootId: options.rootId,
    getNode: options.getNode,
    hasV3FrameOverride: options.hasV3FrameOverride,
  });

  options.setOverrides(plan.nextOverrides);
  options.setGridOverrides(cloneEditorSnapshotValue(plan.nextGridOverrides));
  options.setElkLayoutOverrides(cloneEditorSnapshotValue(plan.nextElkLayoutOverrides));
  options.setRemovedIds(plan.nextRemovedIds);
  if (plan.frameTreeChanged && options.setFrameTree) {
    options.setFrameTree(plan.nextFrameTree);
  }
  if (plan.shouldPruneLinkedRootOverrides && options.pruneLinkedRootOverrides) {
    options.pruneLinkedRootOverrides();
  }

  if (plan.execution === 'rerender-stage') {
    await options.rerenderStageFromFrameTree();
  } else if (plan.execution === 'request-relayout') {
    await options.requestRelayout(plan.relayoutTargetId);
  } else {
    await options.applyLocalRefresh({ syncGridControls: true });
  }

  if (plan.execution !== 'local-reapply' && options.syncGridControls) {
    options.syncGridControls();
  }

  options.syncDirtyFromSerialized(options.serializeDirtyState());
}

export async function restorePreviewOverridePatch(
  options: RestorePreviewOverridePatchOptions,
): Promise<void> {
  options.clearPendingRuntime();

  const beforeEntries = options.captureOverrideEntries(Object.keys(options.entries || {}));
  const nextOverrides = restorePreviewOverrideEntries({
    currentOverrides: options.currentOverrides,
    entries: options.entries,
  });
  options.setOverrides(nextOverrides);
  if (options.cleanOverride) {
    Object.keys(options.entries || {}).forEach((cid) => options.cleanOverride?.(cid));
  }

  const plan = resolvePreviewOverridePatchRestorePlan({
    entries: options.entries,
    beforeEntries,
    rootId: options.rootId,
    getNode: options.getNode,
    hasV3FrameOverride: options.hasV3FrameOverride,
  });

  if (plan.needsRelayout) {
    await options.requestRelayout(plan.relayoutTargetId);
  } else {
    await options.applyLocalRefresh({ syncGridControls: false });
  }

  options.syncDirtyFromSerialized(options.serializeDirtyState());
}
