import {
  dispatchPreviewClearOverride,
  runPreviewRelayout,
  type PreviewRelayoutOverrideEntry,
  type PreviewRelayoutResult,
  type PreviewRelayoutStatus,
} from './app-relayout.js';

export interface CreatePreviewRelayoutRuntimeOptions<TGridOverrides> {
  getOverrides: () => Record<string, PreviewRelayoutOverrideEntry>;
  coercedKeys: Set<string>;
  getGridOverrides: () => TGridOverrides;
  normalizeGridOverrides: (value: TGridOverrides) => TGridOverrides;
  getRelayoutStatus: () => PreviewRelayoutStatus;
  isEngineLayoutActive?: (() => boolean) | null;
  /** @deprecated Prefer `isEngineLayoutActive`. */
  isElkLayeredDiagram?: (() => boolean) | null;
  performEngineRelayout?: ((normalizedGridOverrides: TGridOverrides) => Promise<PreviewRelayoutResult | null>) | null;
  /** @deprecated Prefer `performEngineRelayout`. */
  performElkRelayout?: ((normalizedGridOverrides: TGridOverrides) => Promise<PreviewRelayoutResult | null>) | null;
  performLocalRelayout: (normalizedGridOverrides: TGridOverrides) => PreviewRelayoutResult | null;
  failRelayout: (reason: string, triggerCid: string) => unknown;
  finishRelayout: (
    triggerCid: string,
    result: PreviewRelayoutResult,
    executionLabel: 'elk' | 'local',
  ) => unknown;
  logError?: (message: string) => void;
  hasWaypointOverride: (cid: string) => boolean;
  clearOverride: (cid: string) => void;
  setDirty: () => void;
  applyAllOverrides: () => void;
  isSelected: (cid: string) => boolean;
  updateInspector: (cid: string) => void;
  restoreArrowFromTree: (cid: string) => Promise<unknown> | unknown;
  captureOverrideEntries: (ids: string[]) => unknown;
  commitOverridePatchAction: (
    label: string,
    beforeEntries: unknown,
    afterEntries: unknown,
  ) => void;
}

export interface CreatePreviewRelayoutRuntimeHostOptions<TGridOverrides, TModel> {
  getOverrides: () => Record<string, PreviewRelayoutOverrideEntry>;
  coercedKeys: Set<string>;
  model: TModel;
  selectedIds: Set<string>;
  previewBridgeHost: {
    performEngineRelayout?: ((
      model: TModel,
      overrides: Record<string, PreviewRelayoutOverrideEntry>,
      normalizedGridOverrides: TGridOverrides,
      options?: { skipModelUpdate?: boolean },
    ) => Promise<PreviewRelayoutResult | null>) | null;
    performElkRelayout?: ((
      model: TModel,
      overrides: Record<string, PreviewRelayoutOverrideEntry>,
      normalizedGridOverrides: TGridOverrides,
      options?: { skipModelUpdate?: boolean },
    ) => Promise<PreviewRelayoutResult | null>) | null;
    performLocalRelayout: (
      model: TModel,
      overrides: Record<string, PreviewRelayoutOverrideEntry>,
      normalizedGridOverrides: TGridOverrides,
    ) => PreviewRelayoutResult | null;
  };
  getGridOverrides: () => TGridOverrides;
  normalizeGridOverrides: (value: TGridOverrides) => TGridOverrides;
  getRelayoutStatus: () => PreviewRelayoutStatus;
  isEngineLayoutActive: () => boolean;
  failRelayout: (reason: string, triggerCid: string) => unknown;
  finishRelayout: (
    triggerCid: string,
    result: PreviewRelayoutResult,
    executionLabel: 'elk' | 'local',
  ) => unknown;
  logError?: (message: string) => void;
  clearOverride: (cid: string) => void;
  setDirty: () => void;
  applyAllOverrides: () => void;
  updateInspector: (cid: string) => void;
  reloadTreeAfterArrowRestore: () => Promise<unknown> | unknown;
  rebuildArrowSvg: (cid: string) => void;
  captureOverrideEntries: (ids: string[]) => unknown;
  commitOverridePatchAction: (
    label: string,
    beforeEntries: unknown,
    afterEntries: unknown,
  ) => void;
}

export interface PreviewRelayoutGridState<TGridOverrides> {
  getGridOverrides: () => TGridOverrides;
  normalizeGridOverrides: (value: TGridOverrides) => TGridOverrides;
}

export interface PreviewRelayoutSelectionState {
  selectedIds: Set<string>;
}

export interface PreviewRelayoutEditorState {
  captureOverrideEntries: (ids: string[]) => unknown;
  commitOverridePatchAction: (
    label: string,
    beforeEntries: unknown,
    afterEntries: unknown,
  ) => void;
}

export interface CreatePreviewRelayoutRuntimeOptionsFromRuntimeOptions<TGridOverrides, TModel> {
  getOverrides: () => Record<string, PreviewRelayoutOverrideEntry>;
  coercedKeys: Set<string>;
  model: TModel;
  previewBridgeHost: CreatePreviewRelayoutRuntimeHostOptions<TGridOverrides, TModel>['previewBridgeHost'];
  gridState: PreviewRelayoutGridState<TGridOverrides>;
  selectionState: PreviewRelayoutSelectionState;
  getRelayoutStatus: () => PreviewRelayoutStatus;
  isEngineLayoutActive: () => boolean;
  failRelayout: (reason: string, triggerCid: string) => unknown;
  finishRelayout: (
    triggerCid: string,
    result: PreviewRelayoutResult,
    executionLabel: 'elk' | 'local',
  ) => unknown;
  logError?: (message: string) => void;
  clearOverride: (cid: string) => void;
  setDirty: () => void;
  applyAllOverrides: () => void;
  updateInspector: (cid: string) => void;
  reloadTreeAfterArrowRestore: () => Promise<unknown> | unknown;
  rebuildArrowSvg: (cid: string) => void;
  editorState: PreviewRelayoutEditorState;
}

export interface PreviewRelayoutRuntime {
  requestRelayout: (triggerCid: string) => Promise<unknown>;
  clearOverride: (cid: string) => void;
}

export interface CreatePreviewRelayoutRuntimeFromRuntimeOptions<TGridOverrides, TModel>
  extends CreatePreviewRelayoutRuntimeOptionsFromRuntimeOptions<TGridOverrides, TModel> {
}

export interface CreatePreviewRelayoutRuntimeFromEditorHostOptions<TGridOverrides, TModel> {
  getOverrides: () => Record<string, PreviewRelayoutOverrideEntry>;
  coercedKeys: Set<string>;
  model: TModel;
  previewBridgeHost: CreatePreviewRelayoutRuntimeHostOptions<TGridOverrides, TModel>['previewBridgeHost'];
  getGridOverrides: () => TGridOverrides;
  normalizeGridOverrides: (value: TGridOverrides) => TGridOverrides;
  selectedIds: Set<string>;
  getRelayoutStatus: () => PreviewRelayoutStatus;
  isEngineLayoutActive: () => boolean;
  failRelayout: (reason: string, triggerCid: string) => unknown;
  finishRelayout: (
    triggerCid: string,
    result: PreviewRelayoutResult,
    executionLabel: 'elk' | 'local',
  ) => unknown;
  logError?: (message: string) => void;
  clearOverride: (cid: string) => void;
  setDirty: () => void;
  applyAllOverrides: () => void;
  updateInspector: (cid: string) => void;
  reloadTreeAfterArrowRestore: () => Promise<unknown> | unknown;
  rebuildArrowSvg: (cid: string) => void;
  editorState: PreviewRelayoutEditorState;
}

export function createPreviewRelayoutRuntimeOptionsFromHost<TGridOverrides, TModel>(
  options: CreatePreviewRelayoutRuntimeHostOptions<TGridOverrides, TModel>,
): CreatePreviewRelayoutRuntimeOptions<TGridOverrides> {
  const performEngineRelayout = options.previewBridgeHost.performEngineRelayout
    ?? options.previewBridgeHost.performElkRelayout
    ?? null;

  return {
    getOverrides: options.getOverrides,
    coercedKeys: options.coercedKeys,
    getGridOverrides: options.getGridOverrides,
    normalizeGridOverrides: options.normalizeGridOverrides,
    getRelayoutStatus: options.getRelayoutStatus,
    isEngineLayoutActive: options.isEngineLayoutActive,
    performEngineRelayout: performEngineRelayout
      ? async (normalizedGridOverrides) => performEngineRelayout(
        options.model,
        options.getOverrides(),
        normalizedGridOverrides,
      )
      : null,
    performLocalRelayout: (normalizedGridOverrides) => options.previewBridgeHost.performLocalRelayout(
      options.model,
      options.getOverrides(),
      normalizedGridOverrides,
    ),
    failRelayout: options.failRelayout,
    finishRelayout: options.finishRelayout,
    logError: options.logError,
    hasWaypointOverride: (cid) => Boolean(options.getOverrides()[cid]?.waypoints),
    clearOverride: options.clearOverride,
    setDirty: options.setDirty,
    applyAllOverrides: options.applyAllOverrides,
    isSelected: (cid) => options.selectedIds.has(cid),
    updateInspector: options.updateInspector,
    restoreArrowFromTree: async (cid) => {
      await options.reloadTreeAfterArrowRestore();
      options.rebuildArrowSvg(cid);
      options.applyAllOverrides();
      if (options.selectedIds.has(cid)) {
        options.updateInspector(cid);
      }
    },
    captureOverrideEntries: options.captureOverrideEntries,
    commitOverridePatchAction: options.commitOverridePatchAction,
  };
}

export function createPreviewRelayoutRuntimeOptionsFromRuntime<TGridOverrides, TModel>(
  options: CreatePreviewRelayoutRuntimeOptionsFromRuntimeOptions<TGridOverrides, TModel>,
): CreatePreviewRelayoutRuntimeOptions<TGridOverrides> {
  return createPreviewRelayoutRuntimeOptionsFromHost({
    getOverrides: options.getOverrides,
    coercedKeys: options.coercedKeys,
    model: options.model,
    selectedIds: options.selectionState.selectedIds,
    previewBridgeHost: options.previewBridgeHost,
    getGridOverrides: options.gridState.getGridOverrides,
    normalizeGridOverrides: options.gridState.normalizeGridOverrides,
    getRelayoutStatus: options.getRelayoutStatus,
    isEngineLayoutActive: options.isEngineLayoutActive,
    failRelayout: options.failRelayout,
    finishRelayout: options.finishRelayout,
    logError: options.logError,
    clearOverride: options.clearOverride,
    setDirty: options.setDirty,
    applyAllOverrides: options.applyAllOverrides,
    updateInspector: options.updateInspector,
    reloadTreeAfterArrowRestore: options.reloadTreeAfterArrowRestore,
    rebuildArrowSvg: options.rebuildArrowSvg,
    captureOverrideEntries: options.editorState.captureOverrideEntries,
    commitOverridePatchAction: options.editorState.commitOverridePatchAction,
  });
}

export function createPreviewRelayoutRuntimeFromRuntime<TGridOverrides, TModel>(
  options: CreatePreviewRelayoutRuntimeFromRuntimeOptions<TGridOverrides, TModel>,
): PreviewRelayoutRuntime {
  return createPreviewRelayoutRuntime(
    createPreviewRelayoutRuntimeOptionsFromRuntime(options),
  );
}

export function createPreviewRelayoutRuntimeFromEditorHost<TGridOverrides, TModel>(
  options: CreatePreviewRelayoutRuntimeFromEditorHostOptions<TGridOverrides, TModel>,
): PreviewRelayoutRuntime {
  return createPreviewRelayoutRuntimeFromRuntime({
    getOverrides: options.getOverrides,
    coercedKeys: options.coercedKeys,
    model: options.model,
    previewBridgeHost: options.previewBridgeHost,
    gridState: {
      getGridOverrides: options.getGridOverrides,
      normalizeGridOverrides: options.normalizeGridOverrides,
    },
    selectionState: {
      selectedIds: options.selectedIds,
    },
    getRelayoutStatus: options.getRelayoutStatus,
    isEngineLayoutActive: options.isEngineLayoutActive,
    failRelayout: options.failRelayout,
    finishRelayout: options.finishRelayout,
    logError: options.logError,
    clearOverride: options.clearOverride,
    setDirty: options.setDirty,
    applyAllOverrides: options.applyAllOverrides,
    updateInspector: options.updateInspector,
    reloadTreeAfterArrowRestore: options.reloadTreeAfterArrowRestore,
    rebuildArrowSvg: options.rebuildArrowSvg,
    editorState: options.editorState,
  });
}

export function createPreviewRelayoutRuntime<TGridOverrides>(
  options: CreatePreviewRelayoutRuntimeOptions<TGridOverrides>,
): PreviewRelayoutRuntime {
  const isEngineLayoutActive = options.isEngineLayoutActive
    ?? options.isElkLayeredDiagram
    ?? (() => false);
  const performEngineRelayout = options.performEngineRelayout
    ?? options.performElkRelayout
    ?? null;

  return {
    requestRelayout(triggerCid) {
      const overrides = options.getOverrides();
      const relayoutStatus = options.getRelayoutStatus();
      return runPreviewRelayout({
        triggerCid,
        overrides,
        coercedKeys: options.coercedKeys,
        gridOverrides: options.getGridOverrides(),
        normalizeGridOverrides: options.normalizeGridOverrides,
        relayoutStatus,
        isEngineLayoutActive: isEngineLayoutActive(),
        isElkLayeredDiagram: isEngineLayoutActive(),
        performEngineRelayout,
        performElkRelayout: performEngineRelayout,
        performLocalRelayout: options.performLocalRelayout,
        failRelayout: options.failRelayout,
        finishRelayout: options.finishRelayout,
        logError: options.logError,
      });
    },
    clearOverride(cid) {
      dispatchPreviewClearOverride({
        cid,
        hasWaypointOverride: options.hasWaypointOverride(cid),
        relayoutStatus: options.getRelayoutStatus(),
        clearOverride: options.clearOverride,
        setDirty: options.setDirty,
        applyAllOverrides: options.applyAllOverrides,
        isSelected: options.isSelected,
        updateInspector: options.updateInspector,
        requestRelayout: (id) => this.requestRelayout(id),
        restoreArrowFromTree: options.restoreArrowFromTree,
        captureOverrideEntries: options.captureOverrideEntries,
        commitOverridePatchAction: options.commitOverridePatchAction,
      });
    },
  };
}
