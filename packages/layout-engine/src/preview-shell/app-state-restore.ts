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
import { writeLayoutOperatorOverrideState } from './layout-operator-overrides.js';
import type { LayoutOperatorOverrideState } from './layout-operator-overrides.js';

export interface PreviewRestoreNode {
  type?: string | null;
}

export interface PreviewSerializedStateRestorePlan {
  nextOverrides: Record<string, unknown>;
  nextGridOverrides: Record<string, unknown>;
  nextLayoutOverrides: Record<string, unknown>;
  nextLayoutOperatorOverrides: LayoutOperatorOverrideState | null;
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
  hasRelayoutFrameOverride?: ((entry: unknown) => boolean) | null;
  /** @deprecated Prefer `hasRelayoutFrameOverride`. */
  hasV3FrameOverride?: ((entry: unknown) => boolean) | null;
  setOverrides: (nextOverrides: Record<string, unknown>) => void;
  setGridOverrides: (nextGridOverrides: Record<string, unknown>) => void;
  setLayoutOverrides?: ((nextLayoutOverrides: Record<string, unknown>) => void) | null;
  setLayoutOperatorOverridesState?: ((nextState: LayoutOperatorOverrideState | null) => void) | null;
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
  hasRelayoutFrameOverride?: ((entry: unknown) => boolean) | null;
  /** @deprecated Prefer `hasRelayoutFrameOverride`. */
  hasV3FrameOverride?: ((entry: unknown) => boolean) | null;
  captureOverrideEntries: (ids: Iterable<string>) => Record<string, unknown | null>;
  setOverrides: (nextOverrides: Record<string, unknown>) => void;
  cleanOverride?: ((cid: string) => void) | null;
  clearPendingRuntime: () => void;
  requestRelayout: (triggerId: string) => Promise<void>;
  applyLocalRefresh: (options: { syncGridControls: boolean }) => void | Promise<void>;
  syncDirtyFromSerialized: (serializedState: string) => void;
  serializeDirtyState: () => string;
}

export interface CreatePreviewStateRestoreRuntimeOptions {
  getCurrentOverrides: () => Record<string, unknown>;
  getCurrentGridOverrides: () => Record<string, unknown> | null | undefined;
  getCurrentRemovedIds: () => Iterable<string> | null | undefined;
  getRootId: () => string;
  getNode: (cid: string) => PreviewRestoreNode | null | undefined;
  hasRelayoutFrameOverride?: ((entry: unknown) => boolean) | null;
  /** @deprecated Prefer `hasRelayoutFrameOverride`. */
  hasV3FrameOverride?: ((entry: unknown) => boolean) | null;
  captureOverrideEntries: (ids: Iterable<string>) => Record<string, unknown | null>;
  setOverrides: (nextOverrides: Record<string, unknown>) => void;
  setGridOverrides: (nextGridOverrides: Record<string, unknown>) => void;
  setLayoutOverrides?: ((nextLayoutOverrides: Record<string, unknown>) => void) | null;
  setLayoutOperatorOverridesState?: ((nextState: LayoutOperatorOverrideState | null) => void) | null;
  setRemovedIds: (nextRemovedIds: Set<string>) => void;
  setFrameTree?: ((frameTree: unknown) => void) | null;
  cleanOverride?: ((cid: string) => void) | null;
  pruneLinkedRootOverrides?: (() => void) | null;
  clearPendingRuntime: () => void;
  rerenderStageFromFrameTree: () => Promise<void>;
  requestRelayout: (triggerId: string) => Promise<void>;
  applyLocalRefresh: (options: { syncGridControls: boolean }) => void | Promise<void>;
  syncGridControls?: (() => void) | null;
  syncDirtyFromSerialized: (serializedState: string) => void;
  serializeDirtyState: () => string;
}

export interface PreviewStateRestoreEditorStateLike {
  cloneValue: <T>(value: T) => T;
  captureOverrideEntries: (ids: Iterable<string>) => Record<string, unknown | null>;
  serializeDirtyState: () => string;
}

export interface PreviewStateRestoreEditorHostModel {
  roots?: Array<{ id?: string | null }> | null;
  gridOverrides?: Record<string, unknown> | null;
  layoutOverrides?: Record<string, unknown> | null;
  layoutOverrideNamespace?: string | null;
  layoutOperatorOverrides?: LayoutOperatorOverrideState | null;
  removedIds?: Set<string> | null;
  get: (cid: string) => PreviewRestoreNode | null | undefined;
  cleanOverride: (cid: string) => void;
}

function resolveSnapshotActiveLayoutOverrides(
  state: LayoutOperatorOverrideState | null | undefined,
): Record<string, unknown> {
  const activeKey = state?.activeOperatorKey;
  if (!activeKey) {
    return {};
  }
  const bucket = state.byOperator?.[activeKey];
  return bucket && typeof bucket === 'object' && !Array.isArray(bucket)
    ? cloneEditorSnapshotValue(bucket)
    : {};
}

export interface CreatePreviewStateRestoreRuntimeFromEditorHostOptions<
  TModel extends PreviewStateRestoreEditorHostModel = PreviewStateRestoreEditorHostModel,
> {
  getOverrides: () => Record<string, unknown>;
  model: TModel;
  editorState: PreviewStateRestoreEditorStateLike;
  previewBridgeHost?: {
    setFrameTreeJson?: ((frameTree: unknown) => void) | null;
  } | null;
  hasRelayoutFrameOverride: (entry: unknown) => boolean;
  replaceOverrides: (nextOverrides: Record<string, unknown>) => void;
  pruneLinkedRootOverrides: () => void;
  clearPendingRuntime: () => void;
  rerenderStageFromFrameTree: () => Promise<void>;
  requestRelayout: (triggerId: string) => Promise<void>;
  applyLocalRefresh: (options: { syncGridControls: boolean }) => void | Promise<void>;
  syncGridControls?: (() => void) | null;
  syncDirtyFromSerialized: (serializedState: string) => void;
}

export interface PreviewStateRestoreRuntime {
  restoreSerializedState: (serializedState: string) => Promise<void>;
  restoreOverridePatch: (entries: Record<string, unknown | null> | null | undefined) => Promise<void>;
  applyUndoCommand: (
    command: {
      kind?: string | null;
      before?: string | null;
      after?: string | null;
      beforeEntries?: Record<string, unknown | null> | null;
      afterEntries?: Record<string, unknown | null> | null;
    } | null | undefined,
    direction: 'undo' | 'redo',
  ) => Promise<void>;
}

function setsDiffer(left: Set<string>, right: Set<string>): boolean {
  return left.size !== right.size || [...left].some((id) => !right.has(id));
}

function resolveHasRelayoutFrameOverride(options: {
  hasRelayoutFrameOverride?: ((entry: unknown) => boolean) | null;
  hasV3FrameOverride?: ((entry: unknown) => boolean) | null;
}): (entry: unknown) => boolean {
  return options.hasRelayoutFrameOverride ?? options.hasV3FrameOverride ?? (() => false);
}

function resolveSetLayoutOverrides(options: {
  setLayoutOverrides?: ((nextLayoutOverrides: Record<string, unknown>) => void) | null;
}): (nextLayoutOverrides: Record<string, unknown>) => void {
  return options.setLayoutOverrides ?? (() => {});
}

export function snapshotNeedsPreviewRelayout(options: {
  snapshot: Record<string, unknown | null> | null | undefined;
  getNode: (cid: string) => PreviewRestoreNode | null | undefined;
  hasRelayoutFrameOverride?: ((entry: unknown) => boolean) | null;
  /** @deprecated Prefer `hasRelayoutFrameOverride`. */
  hasV3FrameOverride?: ((entry: unknown) => boolean) | null;
}): boolean {
  const hasRelayoutFrameOverride = resolveHasRelayoutFrameOverride(options);
  for (const [cid, entry] of Object.entries(options.snapshot || {})) {
    const node = options.getNode(cid);
    if (!node || node.type === 'arrow') continue;
    if (entry == null || hasRelayoutFrameOverride(entry)) return true;
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
  hasRelayoutFrameOverride?: ((entry: unknown) => boolean) | null;
  /** @deprecated Prefer `hasRelayoutFrameOverride`. */
  hasV3FrameOverride?: ((entry: unknown) => boolean) | null;
}): PreviewSerializedStateRestorePlan {
  const hasRelayoutFrameOverride = resolveHasRelayoutFrameOverride(options);
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
      hasRelayoutFrameOverride,
    })
    || snapshotNeedsPreviewRelayout({
      snapshot: parsed.o,
      getNode: options.getNode,
      hasRelayoutFrameOverride,
    });

  const nextLayoutOperatorOverrides = parsed.ep ? cloneEditorSnapshotValue(parsed.ep) : null;
  const nextLayoutOverrides = Object.keys(parsed.e || {}).length > 0
    ? cloneEditorSnapshotValue(parsed.e || {})
    : resolveSnapshotActiveLayoutOverrides(nextLayoutOperatorOverrides);
  return {
    nextOverrides: cloneEditorSnapshotValue(parsed.o),
    nextGridOverrides,
    nextLayoutOverrides,
    nextLayoutOperatorOverrides,
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
  hasRelayoutFrameOverride?: ((entry: unknown) => boolean) | null;
  /** @deprecated Prefer `hasRelayoutFrameOverride`. */
  hasV3FrameOverride?: ((entry: unknown) => boolean) | null;
}): PreviewOverridePatchRestorePlan {
  const hasRelayoutFrameOverride = resolveHasRelayoutFrameOverride(options);
  const touchedIds = Object.keys(options.entries || {});
  return {
    touchedIds,
    needsRelayout: snapshotNeedsPreviewRelayout({
      snapshot: options.beforeEntries,
      getNode: options.getNode,
      hasRelayoutFrameOverride,
    }) || snapshotNeedsPreviewRelayout({
      snapshot: options.entries,
      getNode: options.getNode,
      hasRelayoutFrameOverride,
    }),
    relayoutTargetId: touchedIds[0] || options.rootId || 'root',
  };
}

export async function restorePreviewSerializedState(
  options: RestorePreviewSerializedStateOptions,
): Promise<void> {
  options.clearPendingRuntime();
  const setLayoutOverrides = resolveSetLayoutOverrides(options);

  const plan = resolvePreviewSerializedStateRestorePlan({
    serializedState: options.serializedState,
    currentOverrides: options.currentOverrides,
    currentGridOverrides: options.currentGridOverrides,
    currentRemovedIds: options.currentRemovedIds,
    rootId: options.rootId,
    getNode: options.getNode,
    hasRelayoutFrameOverride: options.hasRelayoutFrameOverride,
    hasV3FrameOverride: options.hasV3FrameOverride,
  });

  options.setOverrides(plan.nextOverrides);
  options.setGridOverrides(cloneEditorSnapshotValue(plan.nextGridOverrides));
  options.setLayoutOperatorOverridesState?.(
    plan.nextLayoutOperatorOverrides
      ? cloneEditorSnapshotValue(plan.nextLayoutOperatorOverrides)
      : null,
  );
  setLayoutOverrides(cloneEditorSnapshotValue(plan.nextLayoutOverrides));
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
    hasRelayoutFrameOverride: options.hasRelayoutFrameOverride,
    hasV3FrameOverride: options.hasV3FrameOverride,
  });

  if (plan.needsRelayout) {
    await options.requestRelayout(plan.relayoutTargetId);
  } else {
    await options.applyLocalRefresh({ syncGridControls: false });
  }

  options.syncDirtyFromSerialized(options.serializeDirtyState());
}

export function createPreviewStateRestoreRuntime(
  options: CreatePreviewStateRestoreRuntimeOptions,
): PreviewStateRestoreRuntime {
  const resolveRootId = (): string => options.getRootId() || 'root';
  const resolveHasRelayoutFrameOverride = (): ((entry: unknown) => boolean) => (
    options.hasRelayoutFrameOverride ?? options.hasV3FrameOverride ?? (() => false)
  );
  const resolveSetLayoutOverrides = (): ((nextLayoutOverrides: Record<string, unknown>) => void) => (
    options.setLayoutOverrides ?? (() => {})
  );

  return {
    async restoreSerializedState(serializedState) {
      await restorePreviewSerializedState({
        serializedState,
        currentOverrides: options.getCurrentOverrides(),
        currentGridOverrides: options.getCurrentGridOverrides(),
        currentRemovedIds: options.getCurrentRemovedIds(),
        rootId: resolveRootId(),
        getNode: options.getNode,
        hasRelayoutFrameOverride: resolveHasRelayoutFrameOverride(),
        setOverrides: options.setOverrides,
        setGridOverrides: options.setGridOverrides,
        setLayoutOverrides: resolveSetLayoutOverrides(),
        setLayoutOperatorOverridesState: options.setLayoutOperatorOverridesState,
        setRemovedIds: options.setRemovedIds,
        setFrameTree: options.setFrameTree,
        pruneLinkedRootOverrides: options.pruneLinkedRootOverrides,
        clearPendingRuntime: options.clearPendingRuntime,
        rerenderStageFromFrameTree: options.rerenderStageFromFrameTree,
        requestRelayout: options.requestRelayout,
        applyLocalRefresh: options.applyLocalRefresh,
        syncGridControls: options.syncGridControls,
        syncDirtyFromSerialized: options.syncDirtyFromSerialized,
        serializeDirtyState: options.serializeDirtyState,
      });
    },
    async restoreOverridePatch(entries) {
      await restorePreviewOverridePatch({
        entries,
        currentOverrides: options.getCurrentOverrides(),
        rootId: resolveRootId(),
        getNode: options.getNode,
        hasRelayoutFrameOverride: resolveHasRelayoutFrameOverride(),
        captureOverrideEntries: options.captureOverrideEntries,
        setOverrides: options.setOverrides,
        cleanOverride: options.cleanOverride,
        clearPendingRuntime: options.clearPendingRuntime,
        requestRelayout: options.requestRelayout,
        applyLocalRefresh: options.applyLocalRefresh,
        syncDirtyFromSerialized: options.syncDirtyFromSerialized,
        serializeDirtyState: options.serializeDirtyState,
      });
    },
    async applyUndoCommand(command, direction) {
      if (command && command.kind === 'override-patch') {
        await this.restoreOverridePatch(
          direction === 'undo' ? command.beforeEntries : command.afterEntries,
        );
        return;
      }
      await this.restoreSerializedState(
        direction === 'undo'
          ? (command?.before ?? '{}')
          : (command?.after ?? '{}'),
      );
    },
  };
}

export function createPreviewStateRestoreRuntimeFromEditorHost<
  TModel extends PreviewStateRestoreEditorHostModel = PreviewStateRestoreEditorHostModel,
>(
  options: CreatePreviewStateRestoreRuntimeFromEditorHostOptions<TModel>,
): PreviewStateRestoreRuntime {
  return createPreviewStateRestoreRuntime({
    getCurrentOverrides: options.getOverrides,
    getCurrentGridOverrides: () => options.model.gridOverrides || {},
    getCurrentRemovedIds: () => options.model.removedIds || new Set<string>(),
    getRootId: () => options.model.roots?.[0]?.id || 'root',
    getNode: (cid) => options.model.get(cid),
    hasRelayoutFrameOverride: options.hasRelayoutFrameOverride,
    captureOverrideEntries: options.editorState.captureOverrideEntries,
    setOverrides: options.replaceOverrides,
    setGridOverrides: (nextGridOverrides) => {
      options.model.gridOverrides = options.editorState.cloneValue(nextGridOverrides);
    },
    setLayoutOverrides: (nextLayoutOverrides) => {
      options.model.layoutOverrides = options.editorState.cloneValue(nextLayoutOverrides);
    },
    setLayoutOperatorOverridesState: (nextState) => {
      writeLayoutOperatorOverrideState(
        options.model,
        nextState ?? { activeOperatorKey: null, byOperator: {} },
        options.model.layoutOverrideNamespace ?? null,
      );
    },
    setRemovedIds: (nextRemovedIds) => {
      options.model.removedIds = new Set(nextRemovedIds);
    },
    setFrameTree: typeof options.previewBridgeHost?.setFrameTreeJson === 'function'
      ? (frameTree) => options.previewBridgeHost?.setFrameTreeJson?.(frameTree)
      : null,
    cleanOverride: (cid) => options.model.cleanOverride(cid),
    pruneLinkedRootOverrides: options.pruneLinkedRootOverrides,
    clearPendingRuntime: options.clearPendingRuntime,
    rerenderStageFromFrameTree: options.rerenderStageFromFrameTree,
    requestRelayout: options.requestRelayout,
    applyLocalRefresh: options.applyLocalRefresh,
    syncGridControls: options.syncGridControls ?? null,
    syncDirtyFromSerialized: options.syncDirtyFromSerialized,
    serializeDirtyState: options.editorState.serializeDirtyState,
  });
}
