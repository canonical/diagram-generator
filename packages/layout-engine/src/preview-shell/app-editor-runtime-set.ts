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
  getOverrides: CreatePreviewInspectorMutationRuntimeOptions['getOverrides']
    & CreatePreviewInspectorSelectionRuntimeOptions['getOverrides'];
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

export interface PreviewEditorRuntimeNumericState {
  get: () => number;
  set: (value: number) => void;
}

export interface CreatePreviewEditorRuntimeSetHostOptions {
  document: CreatePreviewEditorRuntimeSetOptions['document'];
  selectedIds: CreatePreviewEditorRuntimeSetOptions['selectedIds'];
  selectionDepthState: PreviewEditorRuntimeNumericState;
  getPrimarySelectedId: CreatePreviewEditorRuntimeSetOptions['getPrimarySelectedId'];
  getAncestorDepth: CreatePreviewEditorRuntimeSetOptions['getAncestorDepth'];
  previewShellScene: {
    syncPreviewTreeSelectionState: CreatePreviewEditorRuntimeSetOptions['syncTreeSelectionState'];
  };
  removeResizeHandles: CreatePreviewEditorRuntimeSetOptions['removeResizeHandles'];
  showResizeHandles: CreatePreviewEditorRuntimeSetOptions['showResizeHandles'];
  renderEmptyInspector: CreatePreviewEditorRuntimeSetOptions['renderEmptyInspector'];
  renderSelectionInspector: CreatePreviewEditorRuntimeSetOptions['renderSelectionInspector'];
  getInspector: CreatePreviewEditorRuntimeSetOptions['getInspector'];
  getSelectionActionInfo: CreatePreviewEditorRuntimeSetOptions['getSelectionActionInfo'];
  getNode: CreatePreviewEditorRuntimeSetOptions['getNode'];
  getArrowNode: CreatePreviewEditorRuntimeSetOptions['getArrowNode'];
  getOverride: CreatePreviewEditorRuntimeSetOptions['getOverride'];
  getOwnDelta: CreatePreviewEditorRuntimeSetOptions['getOwnDelta'];
  getEffectiveDelta: CreatePreviewEditorRuntimeSetOptions['getEffectiveDelta'];
  getComponentType: CreatePreviewEditorRuntimeSetOptions['getComponentType'];
  getParentLayout: CreatePreviewEditorRuntimeSetOptions['getParentLayout'];
  getRenderedStyle: CreatePreviewEditorRuntimeSetOptions['getRenderedStyle'];
  getViolations: CreatePreviewEditorRuntimeSetOptions['getViolations'];
  isWidthCoerced: CreatePreviewEditorRuntimeSetOptions['isWidthCoerced'];
  isHeightCoerced: CreatePreviewEditorRuntimeSetOptions['isHeightCoerced'];
  getGridInfo: CreatePreviewEditorRuntimeSetOptions['getGridInfo'];
  baselineStep: CreatePreviewEditorRuntimeSetOptions['baselineStep'];
  fallbackGap: CreatePreviewEditorRuntimeSetOptions['fallbackGap'];
  snapStep: CreatePreviewEditorRuntimeSetOptions['snapStep'];
  multiActionGapState: PreviewEditorRuntimeNumericState;
  getTextAdapter: CreatePreviewEditorRuntimeSetOptions['getTextAdapter'];
  formatControlErrorMessage: CreatePreviewEditorRuntimeSetOptions['formatControlErrorMessage'];
  renderSingleStyleOptions: CreatePreviewEditorRuntimeSetOptions['renderSingleStyleOptions'];
  renderMultiStyleOptions: CreatePreviewEditorRuntimeSetOptions['renderMultiStyleOptions'];
  captureOverrideEntries: CreatePreviewEditorRuntimeSetOptions['captureOverrideEntries'];
  commitOverridePatchAction: CreatePreviewEditorRuntimeSetOptions['commitOverridePatchAction'];
  getOverrides: CreatePreviewEditorRuntimeSetOptions['getOverrides'];
  coercedKeys: CreatePreviewEditorRuntimeSetOptions['coercedKeys'];
  snapToGrid: CreatePreviewEditorRuntimeSetOptions['snapToGrid'];
  setDirty: CreatePreviewEditorRuntimeSetOptions['setDirty'];
  scheduleRelayout: CreatePreviewEditorRuntimeSetOptions['scheduleRelayout'];
  cleanOverride: CreatePreviewEditorRuntimeSetOptions['cleanOverride'];
  requestRelayoutNow: CreatePreviewEditorRuntimeSetOptions['requestRelayoutNow'];
  renderMultiSelectionInspector: CreatePreviewEditorRuntimeSetOptions['renderMultiSelectionInspector'];
  applyAllOverrides: CreatePreviewEditorRuntimeSetOptions['applyAllOverrides'];
  reapplySelection: CreatePreviewEditorRuntimeSetOptions['reapplySelection'];
  updateOverrideSummary: CreatePreviewEditorRuntimeSetOptions['updateOverrideSummary'];
  refreshTreeColors: CreatePreviewEditorRuntimeSetOptions['refreshTreeColors'];
  runConstraints: CreatePreviewEditorRuntimeSetOptions['runConstraints'];
  setOverride: CreatePreviewEditorRuntimeSetOptions['setOverride'];
  previewShellInteraction: {
    normalizeSelectionGap: CreatePreviewEditorRuntimeSetOptions['normalizeSelectionGap'];
    resolveSelectionDistributeTargets:
      CreatePreviewEditorRuntimeSetOptions['resolveSelectionDistributeTargets'];
    resolveSelectionAlignTargets:
      CreatePreviewEditorRuntimeSetOptions['resolveSelectionAlignTargets'];
    createSelectionTargetOverrideEntries:
      CreatePreviewEditorRuntimeSetOptions['createSelectionTargetOverrideEntries'];
  };
  alert: CreatePreviewEditorRuntimeSetOptions['alert'];
  normalizeStyleName: CreatePreviewEditorRuntimeSetOptions['normalizeStyleName'];
  interactionManager: CreatePreviewEditorRuntimeSetOptions['interactionManager'];
  waypointDraggingMode: CreatePreviewEditorRuntimeSetOptions['waypointDraggingMode'];
  isSelected: CreatePreviewEditorRuntimeSetOptions['isSelected'];
  persistWaypointOverride: CreatePreviewEditorRuntimeSetOptions['persistWaypointOverride'];
  previewBridgeRender: {
    readPreviewArrowEndpoints: CreatePreviewEditorRuntimeSetOptions['readArrowEndpoints'];
    updatePreviewArrowSvg: CreatePreviewEditorRuntimeSetOptions['updateArrowSvg'];
    rebuildPreviewArrowSvg: CreatePreviewEditorRuntimeSetOptions['rebuildArrowSvg'];
  };
  headLen: CreatePreviewEditorRuntimeSetOptions['headLen'];
  headHalf: CreatePreviewEditorRuntimeSetOptions['headHalf'];
  color: CreatePreviewEditorRuntimeSetOptions['color'];
}

export interface CreatePreviewEditorRuntimeSetFromRuntimeOptions {
  document: CreatePreviewEditorRuntimeSetHostOptions['document'];
  selectedIds: CreatePreviewEditorRuntimeSetHostOptions['selectedIds'];
  selectionDepthState: CreatePreviewEditorRuntimeSetHostOptions['selectionDepthState'];
  getPrimarySelectedId: CreatePreviewEditorRuntimeSetHostOptions['getPrimarySelectedId'];
  getAncestors: (cid: string) => string[];
  previewShellScene: CreatePreviewEditorRuntimeSetHostOptions['previewShellScene'];
  previewShellInteraction: CreatePreviewEditorRuntimeSetHostOptions['previewShellInteraction'];
  previewBridgeRender: CreatePreviewEditorRuntimeSetHostOptions['previewBridgeRender'];
  model: {
    get: CreatePreviewEditorRuntimeSetHostOptions['getNode'];
    cleanOverride: CreatePreviewEditorRuntimeSetHostOptions['cleanOverride'];
  };
  getOverrides: CreatePreviewEditorRuntimeSetHostOptions['getOverrides'];
  coercedKeys: CreatePreviewEditorRuntimeSetHostOptions['coercedKeys'];
  gridState: {
    getGridInfo: CreatePreviewEditorRuntimeSetHostOptions['getGridInfo'];
    baselineStep: CreatePreviewEditorRuntimeSetHostOptions['baselineStep'];
    fallbackGap: CreatePreviewEditorRuntimeSetHostOptions['fallbackGap'];
    snapStep: CreatePreviewEditorRuntimeSetHostOptions['snapStep'];
  };
  multiActionGapState: CreatePreviewEditorRuntimeSetHostOptions['multiActionGapState'];
  getInspector: CreatePreviewEditorRuntimeSetHostOptions['getInspector'];
  getSelectionActionInfo: CreatePreviewEditorRuntimeSetHostOptions['getSelectionActionInfo'];
  getArrowNode: CreatePreviewEditorRuntimeSetHostOptions['getArrowNode'];
  getOwnDelta: CreatePreviewEditorRuntimeSetHostOptions['getOwnDelta'];
  getEffectiveDelta: CreatePreviewEditorRuntimeSetHostOptions['getEffectiveDelta'];
  getComponentType: CreatePreviewEditorRuntimeSetHostOptions['getComponentType'];
  getParentNode: (cid: string) => { layout?: string | null } | null;
  getViolations: CreatePreviewEditorRuntimeSetHostOptions['getViolations'];
  readRenderedStyleFields: CreatePreviewEditorRuntimeSetHostOptions['getRenderedStyle'];
  getTextAdapter: CreatePreviewEditorRuntimeSetHostOptions['getTextAdapter'];
  formatControlErrorMessage: CreatePreviewEditorRuntimeSetHostOptions['formatControlErrorMessage'];
  renderSingleStyleOptions: CreatePreviewEditorRuntimeSetHostOptions['renderSingleStyleOptions'];
  renderMultiStyleOptions: CreatePreviewEditorRuntimeSetHostOptions['renderMultiStyleOptions'];
  editorState: {
    captureOverrideEntries: CreatePreviewEditorRuntimeSetHostOptions['captureOverrideEntries'];
    commitOverridePatchAction: CreatePreviewEditorRuntimeSetHostOptions['commitOverridePatchAction'];
  };
  resizeHandles: {
    removeResizeHandles: CreatePreviewEditorRuntimeSetHostOptions['removeResizeHandles'];
    showResizeHandles: CreatePreviewEditorRuntimeSetHostOptions['showResizeHandles'];
  };
  inspectorRender: {
    renderEmptyInspector: CreatePreviewEditorRuntimeSetHostOptions['renderEmptyInspector'];
    renderSelectionInspector: CreatePreviewEditorRuntimeSetHostOptions['renderSelectionInspector'];
    renderMultiSelectionInspector: CreatePreviewEditorRuntimeSetHostOptions['renderMultiSelectionInspector'];
  };
  relayoutActions: {
    snapToGrid: CreatePreviewEditorRuntimeSetHostOptions['snapToGrid'];
    setDirty: CreatePreviewEditorRuntimeSetHostOptions['setDirty'];
    scheduleRelayout: CreatePreviewEditorRuntimeSetHostOptions['scheduleRelayout'];
    requestRelayoutNow: CreatePreviewEditorRuntimeSetHostOptions['requestRelayoutNow'];
    applyAllOverrides: CreatePreviewEditorRuntimeSetHostOptions['applyAllOverrides'];
    reapplySelection: CreatePreviewEditorRuntimeSetHostOptions['reapplySelection'];
    updateOverrideSummary: CreatePreviewEditorRuntimeSetHostOptions['updateOverrideSummary'];
    refreshTreeColors: CreatePreviewEditorRuntimeSetHostOptions['refreshTreeColors'];
    runConstraints: CreatePreviewEditorRuntimeSetHostOptions['runConstraints'];
    setOverride: CreatePreviewEditorRuntimeSetHostOptions['setOverride'];
  };
  interactionState: {
    alert: CreatePreviewEditorRuntimeSetHostOptions['alert'];
    normalizeStyleName: CreatePreviewEditorRuntimeSetHostOptions['normalizeStyleName'];
    interactionManager: CreatePreviewEditorRuntimeSetHostOptions['interactionManager'];
    waypointDraggingMode: CreatePreviewEditorRuntimeSetHostOptions['waypointDraggingMode'];
    persistWaypointOverride: CreatePreviewEditorRuntimeSetHostOptions['persistWaypointOverride'];
  };
  theme: {
    headLen: CreatePreviewEditorRuntimeSetHostOptions['headLen'];
    headHalf: CreatePreviewEditorRuntimeSetHostOptions['headHalf'];
    color: CreatePreviewEditorRuntimeSetHostOptions['color'];
  };
}

export interface CreatePreviewEditorRuntimeSetFromEditorHostOptions {
  document: CreatePreviewEditorRuntimeSetFromRuntimeOptions['document'];
  selectedIds: CreatePreviewEditorRuntimeSetFromRuntimeOptions['selectedIds'];
  selectionDepthState: CreatePreviewEditorRuntimeSetFromRuntimeOptions['selectionDepthState'];
  getPrimarySelectedId: CreatePreviewEditorRuntimeSetFromRuntimeOptions['getPrimarySelectedId'];
  getAncestors: CreatePreviewEditorRuntimeSetFromRuntimeOptions['getAncestors'];
  previewShellScene: CreatePreviewEditorRuntimeSetFromRuntimeOptions['previewShellScene'];
  previewShellInteraction: CreatePreviewEditorRuntimeSetFromRuntimeOptions['previewShellInteraction'];
  previewBridgeRender: CreatePreviewEditorRuntimeSetFromRuntimeOptions['previewBridgeRender'];
  model: CreatePreviewEditorRuntimeSetFromRuntimeOptions['model'];
  getOverrides: CreatePreviewEditorRuntimeSetHostOptions['getOverrides'];
  coercedKeys: CreatePreviewEditorRuntimeSetFromRuntimeOptions['coercedKeys'];
  previewGridRuntime: {
    getGridInfo: CreatePreviewEditorRuntimeSetHostOptions['getGridInfo'];
  };
  baselineStep: number;
  fallbackGap: number;
  multiActionGapState: CreatePreviewEditorRuntimeSetFromRuntimeOptions['multiActionGapState'];
  getInspector: CreatePreviewEditorRuntimeSetFromRuntimeOptions['getInspector'];
  getSelectionActionInfo: CreatePreviewEditorRuntimeSetFromRuntimeOptions['getSelectionActionInfo'];
  getArrowNode: CreatePreviewEditorRuntimeSetFromRuntimeOptions['getArrowNode'];
  getOwnDelta: CreatePreviewEditorRuntimeSetFromRuntimeOptions['getOwnDelta'];
  getEffectiveDelta: CreatePreviewEditorRuntimeSetFromRuntimeOptions['getEffectiveDelta'];
  getComponentType: CreatePreviewEditorRuntimeSetFromRuntimeOptions['getComponentType'];
  getParentNode: CreatePreviewEditorRuntimeSetFromRuntimeOptions['getParentNode'];
  getViolations: CreatePreviewEditorRuntimeSetFromRuntimeOptions['getViolations'];
  readRenderedStyleFields: CreatePreviewEditorRuntimeSetFromRuntimeOptions['readRenderedStyleFields'];
  getTextAdapter: CreatePreviewEditorRuntimeSetFromRuntimeOptions['getTextAdapter'];
  escapeHtml?: ((message: string) => string) | null;
  renderBoxStyleOptions: (
    selectedValue: string | null | undefined,
    options?: { originalLabel?: string },
  ) => string;
  formatAsDefinedStyleLabel: (styleName: string | null | undefined, mixed?: boolean) => string;
  editorState: CreatePreviewEditorRuntimeSetFromRuntimeOptions['editorState'];
  removeResizeHandles: CreatePreviewEditorRuntimeSetHostOptions['removeResizeHandles'];
  showResizeHandles: CreatePreviewEditorRuntimeSetHostOptions['showResizeHandles'];
  renderEmptyInspector: CreatePreviewEditorRuntimeSetHostOptions['renderEmptyInspector'];
  renderSelectionInspector: CreatePreviewEditorRuntimeSetHostOptions['renderSelectionInspector'];
  renderMultiSelectionInspector:
    CreatePreviewEditorRuntimeSetHostOptions['renderMultiSelectionInspector'];
  snapToGrid: CreatePreviewEditorRuntimeSetHostOptions['snapToGrid'];
  setDirty: CreatePreviewEditorRuntimeSetHostOptions['setDirty'];
  scheduleRelayout: CreatePreviewEditorRuntimeSetHostOptions['scheduleRelayout'];
  requestRelayoutNow: CreatePreviewEditorRuntimeSetHostOptions['requestRelayoutNow'];
  applyAllOverrides: CreatePreviewEditorRuntimeSetHostOptions['applyAllOverrides'];
  reapplySelection: CreatePreviewEditorRuntimeSetHostOptions['reapplySelection'];
  updateOverrideSummary: CreatePreviewEditorRuntimeSetHostOptions['updateOverrideSummary'];
  refreshTreeColors: CreatePreviewEditorRuntimeSetHostOptions['refreshTreeColors'];
  runConstraints: CreatePreviewEditorRuntimeSetHostOptions['runConstraints'];
  setOverride: CreatePreviewEditorRuntimeSetHostOptions['setOverride'];
  alert: CreatePreviewEditorRuntimeSetHostOptions['alert'];
  normalizeStyleName: CreatePreviewEditorRuntimeSetHostOptions['normalizeStyleName'];
  interactionManager: CreatePreviewEditorRuntimeSetHostOptions['interactionManager'];
  waypointDraggingMode: CreatePreviewEditorRuntimeSetHostOptions['waypointDraggingMode'];
  persistWaypointOverride: CreatePreviewEditorRuntimeSetHostOptions['persistWaypointOverride'];
  theme: CreatePreviewEditorRuntimeSetFromRuntimeOptions['theme'];
}

export interface PreviewEditorRuntimeSet {
  selection: PreviewSelectionRuntime;
  inspectorDisplay: PreviewInspectorDisplayRuntime;
  inspectorMutation: PreviewInspectorMutationRuntime;
  inspectorSelection: PreviewInspectorSelectionRuntime;
  arrowWaypoint: PreviewArrowWaypointRuntime;
}

export function createPreviewEditorRuntimeSetFromHost(
  options: CreatePreviewEditorRuntimeSetHostOptions,
): PreviewEditorRuntimeSet {
  return createPreviewEditorRuntimeSet({
    document: options.document,
    selectedIds: options.selectedIds,
    getSelectionDepth: options.selectionDepthState.get,
    setSelectionDepth: options.selectionDepthState.set,
    getPrimarySelectedId: options.getPrimarySelectedId,
    getAncestorDepth: options.getAncestorDepth,
    syncTreeSelectionState: options.previewShellScene.syncPreviewTreeSelectionState,
    removeResizeHandles: options.removeResizeHandles,
    showResizeHandles: options.showResizeHandles,
    renderEmptyInspector: options.renderEmptyInspector,
    renderSelectionInspector: options.renderSelectionInspector,
    getInspector: options.getInspector,
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
    getMultiActionGap: options.multiActionGapState.get,
    setMultiActionGap: options.multiActionGapState.set,
    getTextAdapter: options.getTextAdapter,
    formatControlErrorMessage: options.formatControlErrorMessage,
    renderSingleStyleOptions: options.renderSingleStyleOptions,
    renderMultiStyleOptions: options.renderMultiStyleOptions,
    captureOverrideEntries: options.captureOverrideEntries,
    commitOverridePatchAction: options.commitOverridePatchAction,
    getOverrides: options.getOverrides,
    coercedKeys: options.coercedKeys,
    snapToGrid: options.snapToGrid,
    setDirty: options.setDirty,
    scheduleRelayout: options.scheduleRelayout,
    cleanOverride: options.cleanOverride,
    requestRelayoutNow: options.requestRelayoutNow,
    renderMultiSelectionInspector: options.renderMultiSelectionInspector,
    applyAllOverrides: options.applyAllOverrides,
    reapplySelection: options.reapplySelection,
    updateOverrideSummary: options.updateOverrideSummary,
    refreshTreeColors: options.refreshTreeColors,
    runConstraints: options.runConstraints,
    setOverride: options.setOverride,
    normalizeSelectionGap: options.previewShellInteraction.normalizeSelectionGap,
    resolveSelectionDistributeTargets:
      options.previewShellInteraction.resolveSelectionDistributeTargets,
    resolveSelectionAlignTargets: options.previewShellInteraction.resolveSelectionAlignTargets,
    createSelectionTargetOverrideEntries:
      options.previewShellInteraction.createSelectionTargetOverrideEntries,
    alert: options.alert,
    normalizeStyleName: options.normalizeStyleName,
    interactionManager: options.interactionManager,
    waypointDraggingMode: options.waypointDraggingMode,
    isSelected: options.isSelected,
    persistWaypointOverride: options.persistWaypointOverride,
    readArrowEndpoints: options.previewBridgeRender.readPreviewArrowEndpoints,
    updateArrowSvg: options.previewBridgeRender.updatePreviewArrowSvg,
    rebuildArrowSvg: options.previewBridgeRender.rebuildPreviewArrowSvg,
    headLen: options.headLen,
    headHalf: options.headHalf,
    color: options.color,
  });
}

export function createPreviewEditorRuntimeSetFromRuntime(
  options: CreatePreviewEditorRuntimeSetFromRuntimeOptions,
): PreviewEditorRuntimeSet {
  return createPreviewEditorRuntimeSetFromHost({
    document: options.document,
    selectedIds: options.selectedIds,
    selectionDepthState: options.selectionDepthState,
    getPrimarySelectedId: options.getPrimarySelectedId,
    getAncestorDepth: (cid) => options.getAncestors(cid).length,
    previewShellScene: options.previewShellScene,
    removeResizeHandles: options.resizeHandles.removeResizeHandles,
    showResizeHandles: options.resizeHandles.showResizeHandles,
    renderEmptyInspector: options.inspectorRender.renderEmptyInspector,
    renderSelectionInspector: options.inspectorRender.renderSelectionInspector,
    getInspector: options.getInspector,
    getSelectionActionInfo: options.getSelectionActionInfo,
    getNode: (cid) => options.model.get(cid),
    getArrowNode: options.getArrowNode,
    getOverride: (cid) => options.getOverrides()[cid] || {},
    getOwnDelta: options.getOwnDelta,
    getEffectiveDelta: options.getEffectiveDelta,
    getComponentType: options.getComponentType,
    getParentLayout: (cid) => options.getParentNode(cid)?.layout || null,
    getRenderedStyle: options.readRenderedStyleFields,
    getViolations: options.getViolations,
    isWidthCoerced: (cid) => options.coercedKeys.has(`${cid}:sizing_w`),
    isHeightCoerced: (cid) => options.coercedKeys.has(`${cid}:sizing_h`),
    getGridInfo: options.gridState.getGridInfo,
    baselineStep: options.gridState.baselineStep,
    fallbackGap: options.gridState.fallbackGap,
    snapStep: options.gridState.snapStep,
    multiActionGapState: options.multiActionGapState,
    getTextAdapter: options.getTextAdapter,
    formatControlErrorMessage: options.formatControlErrorMessage,
    renderSingleStyleOptions: options.renderSingleStyleOptions,
    renderMultiStyleOptions: options.renderMultiStyleOptions,
    captureOverrideEntries: options.editorState.captureOverrideEntries,
    commitOverridePatchAction: options.editorState.commitOverridePatchAction,
    getOverrides: options.getOverrides,
    coercedKeys: options.coercedKeys,
    snapToGrid: options.relayoutActions.snapToGrid,
    setDirty: options.relayoutActions.setDirty,
    scheduleRelayout: options.relayoutActions.scheduleRelayout,
    cleanOverride: (cid) => options.model.cleanOverride(cid),
    requestRelayoutNow: options.relayoutActions.requestRelayoutNow,
    renderMultiSelectionInspector: options.inspectorRender.renderMultiSelectionInspector,
    applyAllOverrides: options.relayoutActions.applyAllOverrides,
    reapplySelection: options.relayoutActions.reapplySelection,
    updateOverrideSummary: options.relayoutActions.updateOverrideSummary,
    refreshTreeColors: options.relayoutActions.refreshTreeColors,
    runConstraints: options.relayoutActions.runConstraints,
    setOverride: options.relayoutActions.setOverride,
    previewShellInteraction: options.previewShellInteraction,
    alert: options.interactionState.alert,
    normalizeStyleName: options.interactionState.normalizeStyleName,
    interactionManager: options.interactionState.interactionManager,
    waypointDraggingMode: options.interactionState.waypointDraggingMode,
    isSelected: (cid) => options.selectedIds.has(cid),
    persistWaypointOverride: options.interactionState.persistWaypointOverride,
    previewBridgeRender: options.previewBridgeRender,
    headLen: options.theme.headLen,
    headHalf: options.theme.headHalf,
    color: options.theme.color,
  });
}

export function createPreviewEditorRuntimeSetFromEditorHost(
  options: CreatePreviewEditorRuntimeSetFromEditorHostOptions,
): PreviewEditorRuntimeSet {
  return createPreviewEditorRuntimeSetFromRuntime({
    document: options.document,
    selectedIds: options.selectedIds,
    selectionDepthState: options.selectionDepthState,
    getPrimarySelectedId: options.getPrimarySelectedId,
    getAncestors: options.getAncestors,
    previewShellScene: options.previewShellScene,
    previewShellInteraction: options.previewShellInteraction,
    previewBridgeRender: options.previewBridgeRender,
    model: options.model,
    getOverrides: options.getOverrides,
    coercedKeys: options.coercedKeys,
    gridState: {
      getGridInfo: options.previewGridRuntime.getGridInfo,
      baselineStep: options.baselineStep,
      fallbackGap: options.fallbackGap,
      snapStep: options.baselineStep,
    },
    multiActionGapState: options.multiActionGapState,
    getInspector: options.getInspector,
    getSelectionActionInfo: options.getSelectionActionInfo,
    getArrowNode: options.getArrowNode,
    getOwnDelta: options.getOwnDelta,
    getEffectiveDelta: options.getEffectiveDelta,
    getComponentType: options.getComponentType,
    getParentNode: options.getParentNode,
    getViolations: options.getViolations,
    readRenderedStyleFields: options.readRenderedStyleFields,
    getTextAdapter: options.getTextAdapter,
    formatControlErrorMessage: (message) => options.escapeHtml ? options.escapeHtml(message) : message,
    renderSingleStyleOptions: (currentStyle, originalStyleName) => (
      options.renderBoxStyleOptions(currentStyle, {
        originalLabel: options.formatAsDefinedStyleLabel(originalStyleName),
      })
    ),
    renderMultiStyleOptions: (styleInfo) => (
      options.renderBoxStyleOptions(styleInfo.mixed ? '__nomatch__' : styleInfo.style, {
        originalLabel: options.formatAsDefinedStyleLabel(
          styleInfo.originalStyleName,
          styleInfo.originalStyleMixed,
        ),
      })
    ),
    editorState: options.editorState,
    resizeHandles: {
      removeResizeHandles: options.removeResizeHandles,
      showResizeHandles: options.showResizeHandles,
    },
    inspectorRender: {
      renderEmptyInspector: options.renderEmptyInspector,
      renderSelectionInspector: options.renderSelectionInspector,
      renderMultiSelectionInspector: options.renderMultiSelectionInspector,
    },
    relayoutActions: {
      snapToGrid: options.snapToGrid,
      setDirty: options.setDirty,
      scheduleRelayout: options.scheduleRelayout,
      requestRelayoutNow: options.requestRelayoutNow,
      applyAllOverrides: options.applyAllOverrides,
      reapplySelection: options.reapplySelection,
      updateOverrideSummary: options.updateOverrideSummary,
      refreshTreeColors: options.refreshTreeColors,
      runConstraints: options.runConstraints,
      setOverride: options.setOverride,
    },
    interactionState: {
      alert: options.alert,
      normalizeStyleName: options.normalizeStyleName,
      interactionManager: options.interactionManager,
      waypointDraggingMode: options.waypointDraggingMode,
      persistWaypointOverride: options.persistWaypointOverride,
    },
    theme: options.theme,
  });
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
    getOverrides: options.getOverrides,
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
    getOverrides: options.getOverrides,
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
