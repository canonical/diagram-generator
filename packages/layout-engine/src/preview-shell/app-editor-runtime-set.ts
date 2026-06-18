import {
  createPreviewSelectionRuntime,
  type CreatePreviewSelectionRuntimeOptions,
  type PreviewSelectionRuntime,
} from './app-selection-runtime.js';
import {
  createPreviewInspectorDisplayRuntime,
  type CreatePreviewInspectorDisplayRuntimeOptions,
  type PreviewInspectorDisplayRuntime,
} from './app-inspector-display-runtime.js';
import {
  createPreviewInspectorMutationRuntime,
  type CreatePreviewInspectorMutationRuntimeOptions,
  type PreviewInspectorMutationRuntime,
} from './app-inspector-mutation-runtime.js';
import {
  createPreviewInspectorSelectionRuntime,
  type CreatePreviewInspectorSelectionRuntimeOptions,
  type PreviewInspectorSelectionRuntime,
} from './app-inspector-selection-runtime.js';
import {
  createPreviewArrowWaypointRuntime,
  type CreatePreviewArrowWaypointRuntimeOptions,
  type PreviewArrowWaypointRuntime,
} from './app-arrow-waypoint-runtime.js';

export interface CreatePreviewEditorRuntimeSetOptions {
  document: CreatePreviewSelectionRuntimeOptions['document'];
  selectedIds: CreatePreviewSelectionRuntimeOptions['selectedIds'];
  getSelectionDepth: CreatePreviewSelectionRuntimeOptions['getSelectionDepth'];
  setSelectionDepth: CreatePreviewSelectionRuntimeOptions['setSelectionDepth'];
  getPrimarySelectedId: CreatePreviewSelectionRuntimeOptions['getPrimarySelectedId'];
  getAncestorDepth: CreatePreviewSelectionRuntimeOptions['getAncestorDepth'];
  syncTreeSelectionState: CreatePreviewSelectionRuntimeOptions['syncTreeSelectionState'];
  removeResizeHandles: CreatePreviewSelectionRuntimeOptions['removeResizeHandles'];
  showResizeHandles: CreatePreviewSelectionRuntimeOptions['showResizeHandles'];
  renderEmptyInspector: CreatePreviewSelectionRuntimeOptions['renderEmptyInspector'];
  renderSelectionInspector: CreatePreviewSelectionRuntimeOptions['renderSelectionInspector'];
  getInspector: CreatePreviewInspectorDisplayRuntimeOptions['getInspector'];
  getSelectionActionInfo: CreatePreviewInspectorDisplayRuntimeOptions['getSelectionActionInfo'];
  getNode: CreatePreviewInspectorDisplayRuntimeOptions['getNode'];
  getArrowNode: CreatePreviewInspectorDisplayRuntimeOptions['getArrowNode']
    & CreatePreviewArrowWaypointRuntimeOptions['getArrowNode'];
  getOverride: CreatePreviewInspectorDisplayRuntimeOptions['getOverride'];
  getOwnDelta: CreatePreviewInspectorDisplayRuntimeOptions['getOwnDelta'];
  getEffectiveDelta: CreatePreviewInspectorDisplayRuntimeOptions['getEffectiveDelta']
    & CreatePreviewArrowWaypointRuntimeOptions['getEffectiveDelta'];
  getComponentType: CreatePreviewInspectorDisplayRuntimeOptions['getComponentType']
    & CreatePreviewInspectorSelectionRuntimeOptions['getComponentType'];
  getParentLayout: CreatePreviewInspectorDisplayRuntimeOptions['getParentLayout'];
  getRenderedStyle: CreatePreviewInspectorDisplayRuntimeOptions['getRenderedStyle'];
  getViolations: CreatePreviewInspectorDisplayRuntimeOptions['getViolations'];
  isWidthCoerced: CreatePreviewInspectorDisplayRuntimeOptions['isWidthCoerced'];
  isHeightCoerced: CreatePreviewInspectorDisplayRuntimeOptions['isHeightCoerced'];
  getGridInfo: CreatePreviewInspectorDisplayRuntimeOptions['getGridInfo']
    & CreatePreviewInspectorMutationRuntimeOptions['getGridInfo']
    & CreatePreviewInspectorSelectionRuntimeOptions['getGridInfo'];
  baselineStep: CreatePreviewInspectorDisplayRuntimeOptions['baselineStep']
    & CreatePreviewInspectorMutationRuntimeOptions['baselineStep']
    & CreatePreviewInspectorSelectionRuntimeOptions['baselineStep'];
  fallbackGap: CreatePreviewInspectorDisplayRuntimeOptions['fallbackGap'];
  snapStep: CreatePreviewInspectorDisplayRuntimeOptions['snapStep'];
  getMultiActionGap: CreatePreviewInspectorSelectionRuntimeOptions['getMultiActionGap'];
  setMultiActionGap: CreatePreviewInspectorDisplayRuntimeOptions['setMultiActionGap']
    & CreatePreviewInspectorSelectionRuntimeOptions['setMultiActionGap'];
  getTextAdapter: CreatePreviewInspectorDisplayRuntimeOptions['getTextAdapter'];
  formatControlErrorMessage: CreatePreviewInspectorDisplayRuntimeOptions['formatControlErrorMessage'];
  renderSingleStyleOptions: CreatePreviewInspectorDisplayRuntimeOptions['renderSingleStyleOptions'];
  renderMultiStyleOptions: CreatePreviewInspectorDisplayRuntimeOptions['renderMultiStyleOptions'];
  captureOverrideEntries: CreatePreviewInspectorMutationRuntimeOptions['captureOverrideEntries']
    & CreatePreviewInspectorSelectionRuntimeOptions['captureOverrideEntries']
    & CreatePreviewArrowWaypointRuntimeOptions['captureOverrideEntries'];
  commitOverridePatchAction: CreatePreviewInspectorMutationRuntimeOptions['commitOverridePatchAction']
    & CreatePreviewInspectorSelectionRuntimeOptions['commitOverridePatchAction']
    & CreatePreviewArrowWaypointRuntimeOptions['commitOverridePatchAction'];
  overrides: CreatePreviewInspectorMutationRuntimeOptions['overrides']
    & CreatePreviewInspectorSelectionRuntimeOptions['overrides'];
  coercedKeys: CreatePreviewInspectorMutationRuntimeOptions['coercedKeys']
    & CreatePreviewInspectorSelectionRuntimeOptions['coercedKeys'];
  snapToGrid: CreatePreviewInspectorMutationRuntimeOptions['snapToGrid'];
  setDirty: CreatePreviewInspectorMutationRuntimeOptions['setDirty']
    & CreatePreviewInspectorSelectionRuntimeOptions['setDirty'];
  scheduleRelayout: CreatePreviewInspectorMutationRuntimeOptions['scheduleRelayout']
    & CreatePreviewInspectorSelectionRuntimeOptions['scheduleRelayout'];
  cleanOverride: CreatePreviewInspectorMutationRuntimeOptions['cleanOverride']
    & CreatePreviewInspectorSelectionRuntimeOptions['cleanOverride'];
  requestRelayoutNow: CreatePreviewInspectorSelectionRuntimeOptions['requestRelayoutNow'];
  renderMultiSelectionInspector: CreatePreviewInspectorSelectionRuntimeOptions['renderMultiSelectionInspector'];
  applyAllOverrides: CreatePreviewInspectorSelectionRuntimeOptions['applyAllOverrides'];
  reapplySelection: CreatePreviewInspectorSelectionRuntimeOptions['reapplySelection'];
  updateOverrideSummary: CreatePreviewInspectorSelectionRuntimeOptions['updateOverrideSummary'];
  refreshTreeColors: CreatePreviewInspectorSelectionRuntimeOptions['refreshTreeColors'];
  runConstraints: CreatePreviewInspectorSelectionRuntimeOptions['runConstraints'];
  setOverride: CreatePreviewInspectorSelectionRuntimeOptions['setOverride'];
  normalizeSelectionGap: CreatePreviewInspectorSelectionRuntimeOptions['normalizeSelectionGap'];
  resolveSelectionDistributeTargets:
    CreatePreviewInspectorSelectionRuntimeOptions['resolveSelectionDistributeTargets'];
  resolveSelectionAlignTargets:
    CreatePreviewInspectorSelectionRuntimeOptions['resolveSelectionAlignTargets'];
  createSelectionTargetOverrideEntries:
    CreatePreviewInspectorSelectionRuntimeOptions['createSelectionTargetOverrideEntries'];
  alert: CreatePreviewInspectorSelectionRuntimeOptions['alert'];
  normalizeStyleName: CreatePreviewInspectorSelectionRuntimeOptions['normalizeStyleName'];
  interactionManager: CreatePreviewArrowWaypointRuntimeOptions['interactionManager'];
  waypointDraggingMode: CreatePreviewArrowWaypointRuntimeOptions['waypointDraggingMode'];
  isSelected: CreatePreviewArrowWaypointRuntimeOptions['isSelected'];
  persistWaypointOverride: CreatePreviewArrowWaypointRuntimeOptions['persistWaypointOverride'];
  readArrowEndpoints: CreatePreviewArrowWaypointRuntimeOptions['readArrowEndpoints'];
  updateArrowSvg: CreatePreviewArrowWaypointRuntimeOptions['updateArrowSvg'];
  rebuildArrowSvg: CreatePreviewArrowWaypointRuntimeOptions['rebuildArrowSvg'];
  headLen: CreatePreviewArrowWaypointRuntimeOptions['headLen'];
  headHalf: CreatePreviewArrowWaypointRuntimeOptions['headHalf'];
  color: CreatePreviewArrowWaypointRuntimeOptions['color'];
}

export interface PreviewEditorRuntimeSet {
  selection: PreviewSelectionRuntime;
  inspectorDisplay: PreviewInspectorDisplayRuntime;
  inspectorMutation: PreviewInspectorMutationRuntime;
  inspectorSelection: PreviewInspectorSelectionRuntime;
  arrowWaypoint: PreviewArrowWaypointRuntime;
}

export function createPreviewEditorRuntimeSet(
  options: CreatePreviewEditorRuntimeSetOptions,
): PreviewEditorRuntimeSet {
  const selection = createPreviewSelectionRuntime({
    document: options.document,
    selectedIds: options.selectedIds,
    getSelectionDepth: options.getSelectionDepth,
    setSelectionDepth: options.setSelectionDepth,
    getPrimarySelectedId: options.getPrimarySelectedId,
    getAncestorDepth: options.getAncestorDepth,
    syncTreeSelectionState: options.syncTreeSelectionState,
    removeResizeHandles: options.removeResizeHandles,
    showResizeHandles: options.showResizeHandles,
    renderEmptyInspector: options.renderEmptyInspector,
    renderSelectionInspector: options.renderSelectionInspector,
  });

  const inspectorDisplay = createPreviewInspectorDisplayRuntime({
    getInspector: options.getInspector,
    selectedIds: options.selectedIds,
    getPrimarySelectedId: options.getPrimarySelectedId,
    getSelectionActionInfo: options.getSelectionActionInfo,
    getNode: options.getNode,
    getArrowNode: options.getArrowNode,
    getOverride: options.getOverride,
    getOwnDelta: options.getOwnDelta,
    getEffectiveDelta: options.getEffectiveDelta,
    getComponentType: options.getComponentType,
    getParentLayout: options.getParentLayout,
    getRenderedStyle: options.getRenderedStyle,
    getViolations: options.getViolations,
    isWidthCoerced: options.isWidthCoerced,
    isHeightCoerced: options.isHeightCoerced,
    getGridInfo: options.getGridInfo,
    baselineStep: options.baselineStep,
    fallbackGap: options.fallbackGap,
    snapStep: options.snapStep,
    setMultiActionGap: options.setMultiActionGap,
    getTextAdapter: options.getTextAdapter,
    formatControlErrorMessage: options.formatControlErrorMessage,
    renderSingleStyleOptions: options.renderSingleStyleOptions,
    renderMultiStyleOptions: options.renderMultiStyleOptions,
  });

  const inspectorMutation = createPreviewInspectorMutationRuntime({
    captureOverrideEntries: options.captureOverrideEntries,
    commitOverridePatchAction: options.commitOverridePatchAction,
    overrides: options.overrides,
    coercedKeys: options.coercedKeys,
    getNode: options.getNode,
    snapToGrid: options.snapToGrid,
    setDirty: options.setDirty,
    scheduleRelayout: options.scheduleRelayout,
    renderSelectionInspector: inspectorDisplay.renderSelectionInspector,
    cleanOverride: options.cleanOverride,
    getGridInfo: options.getGridInfo,
    getWidthUnit: inspectorDisplay.getWidthUnit,
    getHeightUnit: inspectorDisplay.getHeightUnit,
    baselineStep: options.baselineStep,
  });

  const inspectorSelection = createPreviewInspectorSelectionRuntime({
    selectedIds: options.selectedIds,
    getSelectionActionInfo: options.getSelectionActionInfo,
    getMultiActionGap: options.getMultiActionGap,
    setMultiActionGap: options.setMultiActionGap,
    captureOverrideEntries: options.captureOverrideEntries,
    commitOverridePatchAction: options.commitOverridePatchAction,
    overrides: options.overrides,
    coercedKeys: options.coercedKeys,
    getNode: options.getNode,
    cleanOverride: options.cleanOverride,
    setDirty: options.setDirty,
    scheduleRelayout: options.scheduleRelayout,
    requestRelayoutNow: options.requestRelayoutNow,
    renderSelectionInspector: () => inspectorDisplay.renderSelectionInspector(),
    renderMultiSelectionInspector: () => inspectorDisplay.renderMultiSelectionInspector(),
    applyAllOverrides: options.applyAllOverrides,
    reapplySelection: options.reapplySelection,
    updateOverrideSummary: options.updateOverrideSummary,
    refreshTreeColors: options.refreshTreeColors,
    runConstraints: options.runConstraints,
    setOverride: options.setOverride,
    getGridInfo: options.getGridInfo,
    getWidthUnit: inspectorDisplay.getWidthUnit,
    getHeightUnit: inspectorDisplay.getHeightUnit,
    baselineStep: options.baselineStep,
    normalizeSelectionGap: options.normalizeSelectionGap,
    resolveSelectionDistributeTargets: options.resolveSelectionDistributeTargets,
    resolveSelectionAlignTargets: options.resolveSelectionAlignTargets,
    createSelectionTargetOverrideEntries: options.createSelectionTargetOverrideEntries,
    alert: options.alert,
    getComponentType: options.getComponentType,
    normalizeStyleName: options.normalizeStyleName,
  });

  const arrowWaypoint = createPreviewArrowWaypointRuntime({
    document: options.document,
    interactionManager: options.interactionManager,
    waypointDraggingMode: options.waypointDraggingMode,
    getArrowNode: options.getArrowNode,
    getEffectiveDelta: options.getEffectiveDelta,
    isSelected: options.isSelected,
    captureOverrideEntries: options.captureOverrideEntries,
    commitOverridePatchAction: options.commitOverridePatchAction,
    persistWaypointOverride: options.persistWaypointOverride,
    refreshInspector: inspectorDisplay.updateInspector,
    readArrowEndpoints: options.readArrowEndpoints,
    updateArrowSvg: options.updateArrowSvg,
    rebuildArrowSvg: options.rebuildArrowSvg,
    headLen: options.headLen,
    headHalf: options.headHalf,
    color: options.color,
  });

  return {
    selection,
    inspectorDisplay,
    inspectorMutation,
    inspectorSelection,
    arrowWaypoint,
  };
}
