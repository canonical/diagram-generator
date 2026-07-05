"use strict";
const SLUG = window.__DG_CONFIG.slug;
const ACTIVE_LAYOUT_ENGINE = window.__DG_CONFIG.engine || "v3";
const SHELL_MODE = window.__DG_CONFIG.shell_mode || "frame";
const GRID = window.__DG_CONFIG.grid;
const INSET = window.__DG_CONFIG.inset;
const FALLBACK_GAP = window.__DG_CONFIG.col_gap || 24;

if (SHELL_MODE !== "grid" && SHELL_MODE !== "frame") {
  throw new Error("preview/editor.js only supports the frame preview shell");
}

// ---- Component model, interaction manager & constraints ----
const model = new ComponentModel();
const mgr = new InteractionManager();
const selectedIds = mgr.selectedIds;
const constraints = createDefaultRegistry();
// Track which override keys were set by engine coercion (not user action).
// Format: Set of "fid:key" strings, e.g. "root:sizing_h"
const _coercedKeys = new Set();
var _previewGridEditorInstallUnit = null;
var _previewGridEditorRuntime = null;

function _warnUnknownInspectorAction(kind, action, actionEl) {
  if (!action) return;
  console.warn(`preview inspector: unknown ${kind} action "${action}"`, actionEl);
}

// HANDLE_SIZE now shared via SHARED_HANDLE_SIZE in editor-base.js

function getThemeToken(name, fallback) {
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function _getPreviewBridgeHostContract() {
  return window.__DG_getPreviewBridgeHostContract();
}

function _getPreviewShellInspectorContract() {
  return window.__DG_getPreviewShellInspectorContract();
}

function _readFrameTreeJson() {
  const previewBridgeHost = _getPreviewBridgeHostContract();
  return typeof previewBridgeHost.getFrameTreeJson === "function"
    ? previewBridgeHost.getFrameTreeJson()
    : null;
}
const UI_AUTHORING_ACCENT_LINE = getThemeToken("--bf-authoring-accent-line", "rgba(246, 183, 60, 0.9)");

// ---- Guide mode (W key) ----
const GUIDE_MODES = ["off", "all"];

// ---- Alignment snap guides ----
// Snap primitives (snapEdgeToTarget, collectGridSnapTargets, collectPeerSnapTargets,
// snapRectToTargets, renderGuideLines, clearGuideLines) are shared via editor-base.js.
// This file keeps only grid-model-aware wrappers that depend on `model` and the typed grid runtime.
const GUIDE_COLOR = UI_AUTHORING_ACCENT_LINE;
const GUIDE_OPACITY = "0.5";

function _createPreviewGridEditorInstallUnit() {
  const previewShellBootstrap = window.__DG_getPreviewShellBootstrapContract();
  return previewShellBootstrap.createPreviewGridEditorInstallUnitFromLegacyEditorHost({
    document,
    previewWindow: window,
    config: {
      slug: SLUG,
      engine: ACTIVE_LAYOUT_ENGINE,
      gridEnabled: GRID,
      guideModes: GUIDE_MODES,
      baselineStep: BASELINE_STEP,
      inset: INSET,
      guideColor: GUIDE_COLOR,
      guideOpacity: GUIDE_OPACITY,
      interactionMode: InteractionMode,
      handleSize: SHARED_HANDLE_SIZE,
      minNodeSize: SHARED_MIN_NODE_SIZE,
      fallbackGap: FALLBACK_GAP,
      snapToGrid: (value) => snapToGrid(value),
    },
    state: {
      model,
      interactionManager: mgr,
      selectedIds,
      coercedKeys: _coercedKeys,
      editorState: EditorState,
      previewSaveClient: PreviewSaveClient,
      constraints,
    },
    helpers: {
      applyInteractionOverrideEntries: _applyInteractionOverrideEntries,
    },
    modelOps: {
      getOwnDelta: (cid) => getOwnDelta(cid),
      getEffectiveDelta: (cid) => getEffectiveDelta(cid),
      getAncestors: (cid) => getAncestors(cid),
    },
    facades: {
      getEditorSceneFacade: () => _getEditorSceneFacade(),
      getEditorRelayoutFacade: () => _getEditorRelayoutFacade(),
      getEditorInteractionFacade: () => _getEditorInteractionFacade(),
    },
  });
}

function _getPreviewGridEditorInstallUnit() {
  if (_previewGridEditorInstallUnit) return _previewGridEditorInstallUnit;
  _previewGridEditorInstallUnit = _createPreviewGridEditorInstallUnit();
  return _previewGridEditorInstallUnit;
}

function _getPreviewGridEditorRuntime() {
  if (_previewGridEditorRuntime) return _previewGridEditorRuntime;
  _previewGridEditorRuntime = _getPreviewGridEditorInstallUnit().getRuntime();
  return _previewGridEditorRuntime;
}

function _getEditorSceneFacade() {
  return _getPreviewGridEditorRuntime().getSceneFacade();
}

function _getEditorBootstrapFacade() {
  return _getPreviewGridEditorRuntime().getBootstrapFacade();
}

function _getEditorRelayoutFacade() {
  return _getPreviewGridEditorRuntime().getRelayoutFacade();
}

const _applyUndoCommand = (command, direction) =>
  _getEditorRelayoutFacade().applyUndoCommand(command, direction);

function _getEditorInteractionFacade() {
  return _getPreviewGridEditorRuntime().getInteractionFacade();
}

const previewGridEditorBrowserState = _getPreviewGridEditorInstallUnit().getBrowserState();

const {
  replaceOverrides,
  setDirty,
  pruneLinkedRootGridOverrides: _pruneLinkedRootGridOverrides,
  clearPendingRestoreRuntime: _clearPendingRestoreRuntime,
  applyLocalRestoreRefresh: _applyLocalRestoreRefresh,
  setMultiActionGap,
  setOverride,
  setWaypointOverride,
  cleanOverride,
  getParentNode,
  getComponentNode,
  hasLayoutChildren: _hasLayoutChildren,
  getArrowNode,
  getComponentType,
  getViolationsForComponent,
  scheduleLayoutRelayout: _scheduleLayoutRelayout,
} = previewGridEditorBrowserState;

window.setDirty = setDirty;

function _restoreOverrideEntries(entries) {
  previewGridEditorBrowserState.restoreOverrideEntries(entries);
}

function _hasLayoutRelayoutFrameOverride(ovr) {
  const relayout = window.__DG_getPreviewBridgeRelayoutContract();
  const hasRelayoutFrameOverride = typeof relayout.hasPreviewRelayoutFrameOverride === "function"
    ? relayout.hasPreviewRelayoutFrameOverride
    : relayout.hasV3FrameOverride;
  return typeof hasRelayoutFrameOverride === "function"
    && hasRelayoutFrameOverride(ovr);
}

const _hasV3FrameOverride = (ovr) => _hasLayoutRelayoutFrameOverride(ovr);
const _isPreviewEngineShellLayoutActive = (frameTreeJson) =>
  window.__DG_getPreviewShellBootstrapContract().isPreviewEngineShellLayoutActive(
    window,
    frameTreeJson,
  );
const _initPreviewEngineShellPanel = () =>
  window.__DG_getPreviewShellBootstrapContract().initPreviewEngineShellPanel(window);

const getOwnDelta = (cid) => model.getOwnDelta(cid);
const getAncestors = (cid) => model.getAncestors(cid);
const getEffectiveDelta = (cid) => model.getEffectiveDelta(cid);
const snapToGrid = (value) => Math.round(value / 8) * 8;
const getInspectorElement = () => document.getElementById("inspector");

const _getEditorRuntimeSet = () => _getEditorInteractionFacade().getEditorRuntimeSet();
const _getSelectionRuntime = () => _getEditorInteractionFacade().getSelectionRuntime();
const _getInspectorDisplayRuntime = () => _getEditorInteractionFacade().getInspectorDisplayRuntime();
const _getInspectorMutationRuntime = () => _getEditorInteractionFacade().getInspectorMutationRuntime();
const _getInspectorSelectionRuntime = () => _getEditorInteractionFacade().getInspectorSelectionRuntime();
const _getArrowWaypointRuntime = () => _getEditorInteractionFacade().getArrowWaypointRuntime();
const _getRelayoutRuntime = () => _getEditorRelayoutFacade().getRelayoutRuntime();
const _getKeyboardRuntime = () => _getEditorInteractionFacade().getKeyboardRuntime();
const _resolvePrimarySelectedId = (preferredCid) => (
  window.__DG_getPreviewShellInteractionContract()
    .resolvePrimarySelectedId(selectedIds, preferredCid)
);

const loadSVG = (invocation = null) => _getEditorBootstrapFacade().loadSvg(invocation);
const _finishLayoutRelayout = (triggerCid, result, executionLabel) =>
  _getEditorRelayoutFacade().finishRelayout(triggerCid, result, executionLabel);
const _signalDiagramLoaded = () => _getEditorBootstrapFacade().signalDiagramLoaded();
const whenDiagramLoaded = () => _getEditorBootstrapFacade().whenDiagramLoaded();
const _syncBrowseNavToLocation = () => _getEditorBootstrapFacade().syncBrowseNavToLocation();
const _attemptDiagramNavigation = (nextUrl, syncUi) =>
  _getEditorBootstrapFacade().attemptDiagramNavigation(nextUrl, syncUi);
const loadTree = (canonicalState = null) => _getEditorBootstrapFacade().loadTree(canonicalState);
const loadGridInfo = (canonicalState = null) => _getEditorSceneFacade().loadGridInfo(canonicalState);
const cycleGuideMode = () => _getEditorSceneFacade().cycleGuideMode();
const renderGridOverlay = () => _getEditorSceneFacade().renderGridOverlay();
const populateGridControls = () => _getEditorSceneFacade().populateGridControls();
const onGridControlChange = () => _getEditorSceneFacade().onGridControlChange();
const refreshLayoutGridInfoFromLayout = () => _getEditorSceneFacade().refreshGridInfoFromLayout();
const applyWaypointOverrides = () => _getEditorSceneFacade().applyWaypointOverrides();
const renderEmptyInspector = () => _getInspectorDisplayRuntime().renderEmptyInspector();
const getPrimarySelectedId = (preferredCid) => _resolvePrimarySelectedId(preferredCid);
const renderSelectionInspector = (preferredCid) =>
  _getInspectorDisplayRuntime().renderSelectionInspector(preferredCid);
const applySelectionTargets = (items, targets) =>
  _getInspectorSelectionRuntime().applySelectionTargets(items, targets);
const distributeSelection = (axis) => _getInspectorSelectionRuntime().distributeSelection(axis);
const alignSelection = (mode) => _getInspectorSelectionRuntime().alignSelection(mode);
const renderMultiSelectionInspector = () => _getInspectorDisplayRuntime().renderMultiSelectionInspector();
const setMultiFrameAlign = (align) => _getInspectorSelectionRuntime().setMultiFrameAlign(align);
const applyMultiStyleOverride = (styleName) =>
  _getInspectorSelectionRuntime().applyMultiStyleOverride(styleName);
const setMultiFrameProp = (prop, value) => _getInspectorSelectionRuntime().setMultiFrameProp(prop, value);
const setMultiFrameSize = (dimension, value) =>
  _getInspectorSelectionRuntime().setMultiFrameSize(dimension, value);
const _dispatchLayoutRelayoutFailure = (reason, triggerCid) =>
  _getEditorRelayoutFacade().failRelayout(reason, triggerCid);
const _failLayoutRelayout = _dispatchLayoutRelayoutFailure;
const _failV3Relayout = _dispatchLayoutRelayoutFailure;
const getLayoutRelayoutStatus = () => _getEditorRelayoutFacade().getLayoutRelayoutStatus();
const applyAllOverrides = () => _getEditorSceneFacade().applyAllOverrides();
const autoFitArtboard = () => _getEditorSceneFacade().autoFitArtboard();
const _rerenderStageFromModel = () => _getEditorSceneFacade().rerenderStageFromModel();
const deleteSelectedFrames = async () => {
  const result = await _getEditorSceneFacade().deleteSelectedFrames();
  return Boolean(result && typeof result === "object" && result.rerendered);
};
const buildTreeUI = () => _getEditorInteractionFacade().buildTreeUi();
const bindInteraction = () => _getEditorInteractionFacade().bindInteraction();
const onSvgDblClick = (event) => _getEditorInteractionFacade().onSvgDoubleClick(event);
const onSvgMouseDown = (event) => _getEditorInteractionFacade().onSvgMouseDown(event);
const onDragMove = (event) => _getEditorInteractionFacade().onDragMove(event);
const onDragUp = () => _getEditorInteractionFacade().onDragUp();
const showResizeHandles = (cid) => _getEditorInteractionFacade().showResizeHandles(cid);
const removeResizeHandles = () => _getEditorInteractionFacade().removeResizeHandles();
const showArrowWaypointHandles = (cid) => _getArrowWaypointRuntime().showArrowWaypointHandles(cid);
const startWpDrag = (event) => _getArrowWaypointRuntime().startWaypointDrag(event);
const onWpDragMove = (event) => _getArrowWaypointRuntime().onWaypointDragMove(event);
const onWpDragUp = () => _getArrowWaypointRuntime().onWaypointDragUp();
const addWaypoint = (cid, segmentIndex, x, y) =>
  _getArrowWaypointRuntime().addWaypoint(cid, segmentIndex, x, y);
const removeWaypoint = (cid, index) => _getArrowWaypointRuntime().removeWaypoint(cid, index);
const getArrowPoints = (cid) => _getArrowWaypointRuntime().getArrowPoints(cid);
const updateArrowVisual = (cid) => _getArrowWaypointRuntime().updateArrowVisual(cid);
const rebuildArrowSVG = (cid) => _getArrowWaypointRuntime().rebuildArrowSvg(cid);
const startTextEdit = (cid, event, runtimeOptions) =>
  _getEditorInteractionFacade().startTextEdit(cid, event, runtimeOptions);
const commitTextEdit = () => _getEditorInteractionFacade().commitTextEdit();
const cancelTextEdit = () => _getEditorInteractionFacade().cancelTextEdit();
const _scheduleLayoutResizeRelayout = (cid, newW, newH, resizedW, resizedH) =>
  _getEditorRelayoutFacade().scheduleResizeRelayout(cid, newW, newH, resizedW, resizedH);
const _cancelLayoutResizeRelayout = () => _getEditorRelayoutFacade().cancelResizeRelayout();
const _persistResizeToLayout = (resizeIds, propagatedIds, triggerCid, baseSizes) =>
  _getEditorRelayoutFacade().persistResize(resizeIds, propagatedIds, triggerCid, baseSizes);
const startResize = (event) => _getEditorInteractionFacade().startResize(event);
const onResizeMove = (event) => _getEditorInteractionFacade().onResizeMove(event);
const onResizeUp = () => _getEditorInteractionFacade().onResizeUp();
const applyStyleOverride = (cid, styleName) => _getInspectorMutationRuntime().applyStyle(cid, styleName);
const deselectAll = () => _getSelectionRuntime().deselectAll();
const _applySelectionStateSnapshot = (nextState, preferredCid) =>
  _getSelectionRuntime().applySelectionStateSnapshot(nextState, preferredCid);
const _syncSelectionUi = (preferredCid) => _getSelectionRuntime().syncSelectionUi(preferredCid);
const selectComponent = (cid, additive) => _getSelectionRuntime().selectComponent(cid, additive);
const reapplySelection = () => _getSelectionRuntime().reapplySelection();
const setFrameAlign = (cid, align) => _getInspectorMutationRuntime().setFrameAlign(cid, align);
const setFrameProp = (cid, prop, value) => _getInspectorMutationRuntime().setFrameProp(cid, prop, value);
const requestLayoutRelayout = (triggerCid) => _getRelayoutRuntime().requestRelayout(triggerCid);
const setFrameSize = (cid, dimension, value) => _getInspectorMutationRuntime().setFrameSize(cid, dimension, value);
const setWidthUnit = (unit, cid) => _getInspectorDisplayRuntime().setWidthUnit(unit, cid);
const setHeightUnit = (unit, cid) => _getInspectorDisplayRuntime().setHeightUnit(unit, cid);
const updateInspector = (cid) => _getInspectorDisplayRuntime().updateInspector(cid);
const clearOverride = (cid) => _getRelayoutRuntime().clearOverride(cid);
const updateOverrideSummary = () => _getEditorSceneFacade().updateOverrideSummary();
const refreshTreeColors = () => _getEditorSceneFacade().refreshTreeColors();
const runConstraints = () => _getEditorSceneFacade().runConstraints();
const onDocumentKeyDown = (event) => _getKeyboardRuntime().onDocumentKeyDown(event);
const bindGridControls = () => _getEditorSceneFacade().bindGridControls();
const bootstrapPreviewEditor = () => _getEditorBootstrapFacade().bootstrapEditorRuntime();

window.whenDiagramLoaded = whenDiagramLoaded;

let _inspectorActionsBound = false;

function bindInspectorActions() {
  const inspectorContract = _getPreviewShellInspectorContract();
  _inspectorActionsBound = inspectorContract.bindPreviewEditorInspectorActionsFromBrowserHost({
    bindPreviewInspectorActions: inspectorContract.bindPreviewInspectorActions,
    inspector: getInspectorElement(),
    alreadyBound: _inspectorActionsBound,
    warnUnknownAction: _warnUnknownInspectorAction,
    clearOverride: (cid) => clearOverride(cid),
    setMultiActionGap: (value) => setMultiActionGap(value),
    getInspectorDisplayRuntime: () => _getInspectorDisplayRuntime(),
    getInspectorMutationRuntime: () => _getInspectorMutationRuntime(),
    getInspectorSelectionRuntime: () => _getInspectorSelectionRuntime(),
  });
}

/**
 * Check if a component is a child of an autolayout parent (v3 frame with direction).
 */
function _isAutolayoutChild(cid) {
  const parent = getParentNode(cid);
  return window.__DG_getPreviewShellInteractionContract().isAutolayoutParentLayout(parent ? parent.layout : null);
}

function _applyInteractionOverrideEntries(entries, propagatedIds) {
  for (const entry of entries) {
    setOverride(entry.id, {
      dx: entry.dx,
      dy: entry.dy,
      dw: entry.dw,
      dh: entry.dh,
    });
    if (propagatedIds) propagatedIds.add(entry.id);
  }
}
const clearSelection = () => _getSelectionRuntime().clearSelection();

window.getLayoutRelayoutStatus = getLayoutRelayoutStatus;
window.requestLayoutRelayout = requestLayoutRelayout;

bindInspectorActions();

// Warn before leaving with unsaved changes.
// Internal diagram navigation uses its own confirm path and suppresses this.
// beforeunload wiring lives in PreviewSaveClient.init().

// ---- Constraint validation ----

// Bind grid controls only after the editor compatibility exports they may pull in
// through eager runtime construction are initialized.
bindGridControls();

bootstrapPreviewEditor();

// ---- Left sidebar tabs (Browse / Layers) ----
// Handled by initNavTabs() in editor-base.js via initPreviewShell().
