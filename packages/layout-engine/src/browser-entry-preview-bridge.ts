import * as previewShellRuntime from './preview-shell/index.js';

export const previewBridge = Object.freeze({
  host: Object.freeze({
    applyFrameTreeRemovalsToPreviewTreeJson:
      previewShellRuntime.applyFrameTreeRemovalsToPreviewTreeJson,
    applyPreviewSessionRemovalsToDiagramJson:
      previewShellRuntime.applyPreviewSessionRemovalsToDiagramJson,
    createPreviewElkViewModeRuntimeFromBrowserHost:
      previewShellRuntime.createPreviewElkViewModeRuntimeFromBrowserHost,
    createPreviewElkViewModeRuntime: previewShellRuntime.createPreviewElkViewModeRuntime,
    createPreviewLayoutBridgeInstallRuntimeFromLegacyBrowserHost:
      previewShellRuntime.createPreviewLayoutBridgeInstallRuntimeFromLegacyBrowserHost,
    createPreviewLayoutBridgeRuntimeFromBrowserHost:
      previewShellRuntime.createPreviewLayoutBridgeRuntimeFromBrowserHost,
    createPreviewLayoutBridgeRuntime: previewShellRuntime.createPreviewLayoutBridgeRuntime,
    createPreviewLayoutBridgeState: previewShellRuntime.createPreviewLayoutBridgeState,
    normalizePreviewLayoutBridgeLocalRelayoutOverrideMode:
      previewShellRuntime.normalizePreviewLayoutBridgeLocalRelayoutOverrideMode,
    resolvePreviewLayoutBridgeLocalRelayoutStatus:
      previewShellRuntime.resolvePreviewLayoutBridgeLocalRelayoutStatus,
    updatePreviewComponentModelFromLayout:
      previewShellRuntime.updatePreviewComponentModelFromLayout,
  }),
  relayout: Object.freeze({
    applyPreviewOverridesToFrameTree: previewShellRuntime.applyPreviewOverridesToFrameTree,
    collectPreviewRelayoutFrameOverrides: previewShellRuntime.collectPreviewRelayoutFrameOverrides,
    createPreviewEditorRelayoutFacadeFromEditorHost:
      previewShellRuntime.createPreviewEditorRelayoutFacadeFromEditorHost,
    createPreviewEditorRelayoutFacadeFromRuntime:
      previewShellRuntime.createPreviewEditorRelayoutFacadeFromRuntime,
    createPreviewRelayoutRuntimeFromRuntime:
      previewShellRuntime.createPreviewRelayoutRuntimeFromRuntime,
    createPreviewRelayoutRuntimeFromEditorHost:
      previewShellRuntime.createPreviewRelayoutRuntimeFromEditorHost,
    createPreviewRelayoutRuntime: previewShellRuntime.createPreviewRelayoutRuntime,
    createPreviewRelayoutRuntimeOptionsFromRuntime:
      previewShellRuntime.createPreviewRelayoutRuntimeOptionsFromRuntime,
    createPreviewRelayoutRuntimeOptionsFromHost:
      previewShellRuntime.createPreviewRelayoutRuntimeOptionsFromHost,
    createPreviewRelayoutRuntimeState: previewShellRuntime.createPreviewRelayoutRuntimeState,
    resolvePreviewLayoutRelayoutStatus: previewShellRuntime.resolvePreviewLayoutRelayoutStatus,
    resolvePreviewV3RelayoutStatus: previewShellRuntime.resolvePreviewV3RelayoutStatus,
    formatPreviewRelayoutStatusMessage: previewShellRuntime.formatPreviewRelayoutStatusMessage,
    markPreviewRelayoutExecution: previewShellRuntime.markPreviewRelayoutExecution,
    isPreviewFrameManagedTarget: previewShellRuntime.isPreviewFrameManagedTarget,
    runPreviewRelayout: previewShellRuntime.runPreviewRelayout,
    snapshotNeedsPreviewRelayout: previewShellRuntime.snapshotNeedsPreviewRelayout,
    restorePreviewOverrideEntries: previewShellRuntime.restorePreviewOverrideEntries,
    restorePreviewOverridePatch: previewShellRuntime.restorePreviewOverridePatch,
    restorePreviewSerializedState: previewShellRuntime.restorePreviewSerializedState,
    createPreviewLiveResizeRelayoutState: previewShellRuntime.createPreviewLiveResizeRelayoutState,
    createPreviewLiveResizeRuntimeFromHost:
      previewShellRuntime.createPreviewLiveResizeRuntimeFromHost,
    createPreviewLiveResizeRuntime: previewShellRuntime.createPreviewLiveResizeRuntime,
    schedulePreviewLiveResizeRelayout: previewShellRuntime.schedulePreviewLiveResizeRelayout,
    cancelPreviewLiveResizeRelayout: previewShellRuntime.cancelPreviewLiveResizeRelayout,
    createPreviewStateRestoreRuntimeFromEditorHost:
      previewShellRuntime.createPreviewStateRestoreRuntimeFromEditorHost,
    createPreviewStateRestoreRuntime: previewShellRuntime.createPreviewStateRestoreRuntime,
    dispatchPreviewClearOverride: previewShellRuntime.dispatchPreviewClearOverride,
    dispatchPreviewRelayoutFailureHost: previewShellRuntime.dispatchPreviewRelayoutFailureHost,
    dispatchPreviewRelayoutSuccessHost: previewShellRuntime.dispatchPreviewRelayoutSuccessHost,
    persistPreviewResizeToFrameOverrides: previewShellRuntime.persistPreviewResizeToFrameOverrides,
    collectRecursiveRelayoutEntries: previewShellRuntime.collectRecursiveRelayoutEntries,
    createOriginalOverrideEntries: previewShellRuntime.createOriginalOverrideEntries,
    mergeRelativeOverrideEntries: previewShellRuntime.mergeRelativeOverrideEntries,
    filterRelayoutOverrideEntry: previewShellRuntime.filterRelayoutOverrideEntry,
    hasPreviewRelayoutFrameOverride: previewShellRuntime.hasPreviewRelayoutFrameOverride,
    hasV3FrameOverride: previewShellRuntime.hasV3FrameOverride,
    clearPreviewCoercedOverrides: previewShellRuntime.clearPreviewCoercedOverrides,
    clearPreviewTransientLayoutOverrides: previewShellRuntime.clearPreviewTransientLayoutOverrides,
    collectPreviewCoercedKeys: previewShellRuntime.collectPreviewCoercedKeys,
  }),
  render: Object.freeze({
    applyPreviewSvgOverridesHost: previewShellRuntime.applyPreviewSvgOverridesHost,
    applyPreviewSvgOverrides: previewShellRuntime.applyPreviewSvgOverrides,
    readPreviewRenderedComponentBounds: previewShellRuntime.readPreviewRenderedComponentBounds,
    autoFitPreviewArtboard: previewShellRuntime.autoFitPreviewArtboard,
    collectPreviewFramesById: previewShellRuntime.collectPreviewFramesById,
    collectPreviewPlacedBounds: previewShellRuntime.collectPreviewPlacedBounds,
    fitPreviewSvgToRenderedContent: previewShellRuntime.fitPreviewSvgToRenderedContent,
    patchPreviewFrameGroup: previewShellRuntime.patchPreviewFrameGroup,
    patchPreviewSvgFromLayout: previewShellRuntime.patchPreviewSvgFromLayout,
    previewArrowComponentId: previewShellRuntime.previewArrowComponentId,
    routePreviewArrows: previewShellRuntime.routePreviewArrows,
    syncPreviewArrowsInModel: previewShellRuntime.syncPreviewArrowsInModel,
    createPreviewArrowSvgFragment: previewShellRuntime.createPreviewArrowSvgFragment,
    patchPreviewArrowSvg: previewShellRuntime.patchPreviewArrowSvg,
    readPreviewArrowEndpoints: previewShellRuntime.readPreviewArrowEndpoints,
    rebuildPreviewArrowSvg: previewShellRuntime.rebuildPreviewArrowSvg,
    renderFreshPreviewSvg: previewShellRuntime.renderFreshPreviewSvg,
    renderPreviewFrameTreeToSvg: previewShellRuntime.renderPreviewFrameTreeToSvg,
    updatePreviewArrowSvg: previewShellRuntime.updatePreviewArrowSvg,
  }),
});
