import {
  dispatchPreviewClearOverride,
  runPreviewRelayout,
  type PreviewRelayoutOverrideEntry,
  type PreviewRelayoutResult,
  type PreviewRelayoutStatus,
} from './app-relayout.js';

export interface CreatePreviewRelayoutRuntimeOptions<TGridOverrides> {
  overrides: Record<string, PreviewRelayoutOverrideEntry>;
  coercedKeys: Set<string>;
  getGridOverrides: () => TGridOverrides;
  normalizeGridOverrides: (value: TGridOverrides) => TGridOverrides;
  getRelayoutStatus: () => PreviewRelayoutStatus;
  isElkLayeredDiagram: () => boolean;
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

export interface PreviewRelayoutRuntime {
  requestRelayout: (triggerCid: string) => Promise<unknown>;
  clearOverride: (cid: string) => void;
}

export function createPreviewRelayoutRuntime<TGridOverrides>(
  options: CreatePreviewRelayoutRuntimeOptions<TGridOverrides>,
): PreviewRelayoutRuntime {
  return {
    requestRelayout(triggerCid) {
      const relayoutStatus = options.getRelayoutStatus();
      return runPreviewRelayout({
        triggerCid,
        overrides: options.overrides,
        coercedKeys: options.coercedKeys,
        gridOverrides: options.getGridOverrides(),
        normalizeGridOverrides: options.normalizeGridOverrides,
        relayoutStatus,
        isElkLayeredDiagram: options.isElkLayeredDiagram(),
        performElkRelayout: options.performElkRelayout ?? null,
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
