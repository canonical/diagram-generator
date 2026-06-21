import {
  createPreviewLiveResizeRelayoutState,
  createPreviewLiveResizeRuntimeFromHost,
  type PreviewLiveResizeRelayoutState,
  type PreviewLiveResizeRuntime,
} from './app-live-resize.js';
import {
  dispatchPreviewRelayoutFailureHost,
  dispatchPreviewRelayoutSuccessHost,
  resolvePreviewLayoutRelayoutStatus,
  type PreviewLayoutRelayoutRuntimeState,
  type PreviewLayoutRelayoutStatus,
  type PreviewLocalRelayoutStatus,
  type PreviewRelayoutResult,
} from './app-relayout.js';
import {
  createPreviewRelayoutRuntimeFromEditorHost,
  type PreviewRelayoutRuntime,
} from './app-relayout-runtime.js';
import {
  createPreviewStateRestoreRuntimeFromEditorHost,
  type PreviewStateRestoreEditorHostModel,
  type PreviewStateRestoreEditorStateLike,
  type PreviewStateRestoreRuntime,
} from './app-state-restore.js';

export interface PreviewEditorRelayoutFacadeModel extends PreviewStateRestoreEditorHostModel {
  get: (cid: string) => {
    type?: string | null;
    data?: {
      width?: number | null;
      height?: number | null;
    } | null;
  } | null | undefined;
  clearOverride: (cid: string) => void;
}

export interface PreviewEditorRelayoutFacadeEditorState<
  TGridOverrides = Record<string, unknown>,
> extends PreviewStateRestoreEditorStateLike {
  normalizeGridOverrides: (value: TGridOverrides) => TGridOverrides;
  commitOverridePatchAction: (
    label: string,
    beforeEntries: unknown,
    afterEntries: unknown,
  ) => void;
}

export interface PreviewEditorRelayoutFacadeHost<
  TGridOverrides = Record<string, unknown>,
  TModel extends PreviewEditorRelayoutFacadeModel = PreviewEditorRelayoutFacadeModel,
> {
  performEngineRelayout?: ((
    model: TModel,
    overrides: Record<string, Record<string, unknown>>,
    normalizedGridOverrides: TGridOverrides,
    options?: { skipModelUpdate?: boolean },
  ) => Promise<PreviewRelayoutResult | null>) | null;
  performLocalRelayout: (
    model: TModel,
    overrides: Record<string, Record<string, unknown>>,
    normalizedGridOverrides: TGridOverrides,
    options?: { skipModelUpdate?: boolean },
  ) => PreviewRelayoutResult | null;
  setFrameTreeJson?: ((frameTree: unknown) => void) | null;
}

export interface CreatePreviewEditorRelayoutFacadeFromEditorHostOptions<
  TGridOverrides = Record<string, unknown>,
  TModel extends PreviewEditorRelayoutFacadeModel = PreviewEditorRelayoutFacadeModel,
> {
  getOverrides: () => Record<string, Record<string, unknown>>;
  coercedKeys: Set<string>;
  model: TModel & {
    gridOverrides?: TGridOverrides | null;
  };
  editorState: PreviewEditorRelayoutFacadeEditorState<TGridOverrides>;
  previewBridgeHost: PreviewEditorRelayoutFacadeHost<TGridOverrides, TModel>;
  selectedIds: Set<string>;
  getLocalRelayoutStatus?: (() => PreviewLocalRelayoutStatus | null) | null;
  isEngineLayoutActive: () => boolean;
  hasRelayoutFrameOverride: (entry: unknown) => boolean;
  replaceOverrides: (nextOverrides: Record<string, unknown>) => void;
  pruneLinkedRootOverrides: () => void;
  clearPendingRuntime: () => void;
  rerenderStageFromModel: () => Promise<void>;
  applyLocalRefresh: (options: { syncGridControls: boolean }) => void | Promise<void>;
  syncGridControls?: (() => void) | null;
  syncDirtyFromSerialized: (serializedState: string) => void;
  buildTreeUi: () => void;
  applyWaypointOverrides: () => void;
  bindInteraction: () => void;
  applyAllOverrides: () => void;
  reapplySelection: () => void;
  refreshGridInfo: () => void;
  renderGridOverlay: () => void;
  renderSelectionInspector: (preferredCid?: string | null) => void;
  updateOverrideSummary: () => void;
  refreshTreeColors: () => void;
  runConstraints: () => void;
  setStatus?: ((message: string, kind: string) => void) | null;
  logError?: (message: string) => void;
  setDirty: () => void;
  updateInspector: (cid: string) => void;
  reloadTreeAfterArrowRestore: () => Promise<unknown> | unknown;
  rebuildArrowSvg: (cid: string) => void;
  getOwnDelta: (cid: string) => Record<string, unknown> | null | undefined;
  setOverride: (cid: string, patch: Record<string, unknown>) => void;
  requestAnimationFrameFn: (callback: () => void) => number;
  cancelAnimationFrameFn: (id: number) => void;
  minSize?: number;
}

type RuntimePreviewEditorRelayoutFacadeOptions<
  TGridOverrides = Record<string, unknown>,
  TModel extends PreviewEditorRelayoutFacadeModel = PreviewEditorRelayoutFacadeModel,
> = Omit<
  CreatePreviewEditorRelayoutFacadeFromEditorHostOptions<TGridOverrides, TModel>,
  'getOverrides' | 'coercedKeys' | 'model' | 'editorState' | 'previewBridgeHost' | 'selectedIds'
>;

export interface PreviewEditorRelayoutSharedOptions<
  TGridOverrides = Record<string, unknown>,
  TModel extends PreviewEditorRelayoutFacadeModel = PreviewEditorRelayoutFacadeModel,
> {
  getOverrides:
    CreatePreviewEditorRelayoutFacadeFromEditorHostOptions<TGridOverrides, TModel>['getOverrides'];
  coercedKeys:
    CreatePreviewEditorRelayoutFacadeFromEditorHostOptions<TGridOverrides, TModel>['coercedKeys'];
  model:
    CreatePreviewEditorRelayoutFacadeFromEditorHostOptions<TGridOverrides, TModel>['model'];
  editorState:
    CreatePreviewEditorRelayoutFacadeFromEditorHostOptions<TGridOverrides, TModel>['editorState'];
  previewBridgeHost:
    CreatePreviewEditorRelayoutFacadeFromEditorHostOptions<TGridOverrides, TModel>['previewBridgeHost'];
  selectedIds:
    CreatePreviewEditorRelayoutFacadeFromEditorHostOptions<TGridOverrides, TModel>['selectedIds'];
}

export interface CreatePreviewEditorRelayoutFacadeFromRuntimeOptions<
  TGridOverrides = Record<string, unknown>,
  TModel extends PreviewEditorRelayoutFacadeModel = PreviewEditorRelayoutFacadeModel,
> {
  shared: PreviewEditorRelayoutSharedOptions<TGridOverrides, TModel>;
  runtime: RuntimePreviewEditorRelayoutFacadeOptions<TGridOverrides, TModel>;
}

export interface PreviewEditorRelayoutFacade {
  layoutRuntimeState: PreviewLayoutRelayoutRuntimeState;
  liveResizeRelayoutState: PreviewLiveResizeRelayoutState;
  getLayoutRelayoutStatus: () => PreviewLayoutRelayoutStatus;
  getStateRestoreRuntime: () => PreviewStateRestoreRuntime;
  applyUndoCommand: PreviewStateRestoreRuntime['applyUndoCommand'];
  getRelayoutRuntime: () => PreviewRelayoutRuntime;
  finishRelayout: (
    triggerCid: string,
    result: PreviewRelayoutResult | null,
    executionLabel?: string | null,
  ) => Promise<unknown>;
  failRelayout: (reason: string, triggerCid?: string | null) => unknown;
  getLiveResizeRuntime: () => PreviewLiveResizeRuntime;
  scheduleResizeRelayout: (
    cid: string,
    newW: number,
    newH: number,
    resizedW: boolean,
    resizedH: boolean,
  ) => boolean;
  cancelResizeRelayout: () => void;
  persistResize: (
    resizeIds: Iterable<string>,
    propagatedIds: Iterable<string>,
    triggerCid: string,
    baseSizes?: Record<string, { width: number; height: number }> | null,
  ) => void;
}

export function createPreviewEditorRelayoutFacadeFromEditorHost<
  TGridOverrides = Record<string, unknown>,
  TModel extends PreviewEditorRelayoutFacadeModel = PreviewEditorRelayoutFacadeModel,
>(
  options: CreatePreviewEditorRelayoutFacadeFromEditorHostOptions<TGridOverrides, TModel>,
): PreviewEditorRelayoutFacade {
  const layoutRuntimeState: PreviewLayoutRelayoutRuntimeState = {
    lastMode: 'not-run',
    lastReason: 'not-run',
    sequence: 0,
  };
  const liveResizeRelayoutState = createPreviewLiveResizeRelayoutState();

  let stateRestoreRuntime: PreviewStateRestoreRuntime | null = null;
  let relayoutRuntime: PreviewRelayoutRuntime | null = null;
  let liveResizeRuntime: PreviewLiveResizeRuntime | null = null;

  const getLayoutRelayoutStatus = (): PreviewLayoutRelayoutStatus => (
    resolvePreviewLayoutRelayoutStatus({
      runtimeState: layoutRuntimeState,
      getLocalRelayoutStatus: options.getLocalRelayoutStatus
        ? (() => options.getLocalRelayoutStatus?.() || undefined) as () => PreviewLocalRelayoutStatus
        : null,
    })
  );

  const failRelayout = (reason: string, triggerCid?: string | null): unknown => (
    dispatchPreviewRelayoutFailureHost({
      runtimeState: layoutRuntimeState,
      reason,
      triggerCid,
      setStatus: options.setStatus ?? null,
      renderSelectionInspector: options.renderSelectionInspector,
      updateOverrideSummary: options.updateOverrideSummary,
      refreshTreeColors: options.refreshTreeColors,
      runConstraints: options.runConstraints,
    })
  );

  const finishRelayout = async (
    triggerCid: string,
    result: PreviewRelayoutResult | null,
    executionLabel?: string | null,
  ): Promise<unknown> => dispatchPreviewRelayoutSuccessHost({
    triggerCid,
    result,
    executionLabel,
    runtimeState: layoutRuntimeState,
    getRelayoutStatus: getLayoutRelayoutStatus,
    failRelayout: (nextReason, nextTriggerCid) => failRelayout(nextReason, nextTriggerCid),
    overrides: options.getOverrides(),
    buildTreeUi: options.buildTreeUi,
    applyWaypointOverrides: options.applyWaypointOverrides,
    bindInteraction: options.bindInteraction,
    applyAllOverrides: options.applyAllOverrides,
    reapplySelection: options.reapplySelection,
    refreshGridInfo: options.refreshGridInfo,
    renderGridOverlay: options.renderGridOverlay,
    renderSelectionInspector: options.renderSelectionInspector,
    updateOverrideSummary: options.updateOverrideSummary,
    refreshTreeColors: options.refreshTreeColors,
    runConstraints: options.runConstraints,
    setStatus: options.setStatus ?? null,
  });

  const getRelayoutRuntime = (): PreviewRelayoutRuntime => {
    if (relayoutRuntime) {
      return relayoutRuntime;
    }
    relayoutRuntime = createPreviewRelayoutRuntimeFromEditorHost({
      getOverrides: options.getOverrides,
      coercedKeys: options.coercedKeys,
      model: options.model,
      previewBridgeHost: options.previewBridgeHost as never,
      getGridOverrides: () => (
        (options.model.gridOverrides ?? {}) as TGridOverrides
      ),
      normalizeGridOverrides: options.editorState.normalizeGridOverrides,
      selectedIds: options.selectedIds,
      getRelayoutStatus: getLayoutRelayoutStatus,
      isEngineLayoutActive: options.isEngineLayoutActive,
      failRelayout: (reason, triggerCid) => failRelayout(reason, triggerCid),
      finishRelayout: (triggerCid, result, executionLabel) => (
        finishRelayout(triggerCid, result, executionLabel)
      ),
      logError: options.logError,
      clearOverride: (cid) => options.model.clearOverride(cid),
      setDirty: options.setDirty,
      applyAllOverrides: options.applyAllOverrides,
      updateInspector: options.updateInspector,
      reloadTreeAfterArrowRestore: options.reloadTreeAfterArrowRestore,
      rebuildArrowSvg: options.rebuildArrowSvg,
      editorState: {
        captureOverrideEntries: options.editorState.captureOverrideEntries,
        commitOverridePatchAction: options.editorState.commitOverridePatchAction,
      },
    });
    return relayoutRuntime;
  };

  const requestRelayout = async (triggerCid: string): Promise<void> => {
    await getRelayoutRuntime().requestRelayout(triggerCid);
  };

  const getStateRestoreRuntime = (): PreviewStateRestoreRuntime => {
    if (stateRestoreRuntime) {
      return stateRestoreRuntime;
    }
    stateRestoreRuntime = createPreviewStateRestoreRuntimeFromEditorHost({
      getOverrides: options.getOverrides,
      model: options.model,
      editorState: {
        cloneValue: options.editorState.cloneValue,
        captureOverrideEntries: options.editorState.captureOverrideEntries,
        serializeDirtyState: options.editorState.serializeDirtyState,
      },
      previewBridgeHost: options.previewBridgeHost,
      hasRelayoutFrameOverride: options.hasRelayoutFrameOverride,
      replaceOverrides: options.replaceOverrides,
      pruneLinkedRootOverrides: options.pruneLinkedRootOverrides,
      clearPendingRuntime: options.clearPendingRuntime,
      rerenderStageFromFrameTree: options.rerenderStageFromModel,
      requestRelayout,
      applyLocalRefresh: options.applyLocalRefresh,
      syncGridControls: options.syncGridControls ?? null,
      syncDirtyFromSerialized: options.syncDirtyFromSerialized,
    });
    return stateRestoreRuntime;
  };

  const getLiveResizeRuntime = (): PreviewLiveResizeRuntime => {
    if (liveResizeRuntime) {
      return liveResizeRuntime;
    }
    liveResizeRuntime = createPreviewLiveResizeRuntimeFromHost({
      state: liveResizeRelayoutState,
      model: options.model as TModel & { gridOverrides?: TGridOverrides },
      getOverrides: options.getOverrides,
      normalizeGridOverrides: options.editorState.normalizeGridOverrides,
      getRelayoutStatus: getLayoutRelayoutStatus,
      isEngineLayoutActive: options.isEngineLayoutActive,
      previewBridgeHost: options.previewBridgeHost as never,
      requestAnimationFrameFn: options.requestAnimationFrameFn,
      cancelAnimationFrameFn: options.cancelAnimationFrameFn,
      getNode: (cid) => options.model.get(cid),
      getOwnDelta: options.getOwnDelta,
      setOverride: options.setOverride,
      requestRelayout: (cid) => {
        void requestRelayout(cid);
      },
      minSize: options.minSize,
    });
    return liveResizeRuntime;
  };

  return {
    layoutRuntimeState,
    liveResizeRelayoutState,
    getLayoutRelayoutStatus,
    getStateRestoreRuntime,
    applyUndoCommand(command, direction) {
      return getStateRestoreRuntime().applyUndoCommand(command, direction);
    },
    getRelayoutRuntime,
    finishRelayout,
    failRelayout,
    getLiveResizeRuntime,
    scheduleResizeRelayout(cid, newW, newH, resizedW, resizedH) {
      return getLiveResizeRuntime().scheduleRelayout(cid, newW, newH, resizedW, resizedH);
    },
    cancelResizeRelayout() {
      getLiveResizeRuntime().cancelRelayout();
    },
    persistResize(resizeIds, propagatedIds, triggerCid, baseSizes) {
      getLiveResizeRuntime().persistResize(resizeIds, propagatedIds, triggerCid, baseSizes);
    },
  };
}

export function createPreviewEditorRelayoutFacadeFromRuntime<
  TGridOverrides = Record<string, unknown>,
  TModel extends PreviewEditorRelayoutFacadeModel = PreviewEditorRelayoutFacadeModel,
>(
  options: CreatePreviewEditorRelayoutFacadeFromRuntimeOptions<TGridOverrides, TModel>,
): PreviewEditorRelayoutFacade {
  const requestAnimationFrameFn = options.runtime.requestAnimationFrameFn;
  const cancelAnimationFrameFn = options.runtime.cancelAnimationFrameFn;

  return createPreviewEditorRelayoutFacadeFromEditorHost({
    ...options.runtime,
    requestAnimationFrameFn: (callback) => requestAnimationFrameFn.call(globalThis, callback),
    cancelAnimationFrameFn: (id) => cancelAnimationFrameFn.call(globalThis, id),
    getOverrides: options.shared.getOverrides,
    coercedKeys: options.shared.coercedKeys,
    model: options.shared.model,
    editorState: options.shared.editorState,
    previewBridgeHost: options.shared.previewBridgeHost,
    selectedIds: options.shared.selectedIds,
  });
}
