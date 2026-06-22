"use strict";
const SLUG = window.__DG_CONFIG.slug;
const ACTIVE_LAYOUT_ENGINE = window.__DG_CONFIG.engine || "v3";
const SHELL_MODE = window.__DG_CONFIG.shell_mode || "grid";
const GRID = window.__DG_CONFIG.grid;
const INSET = window.__DG_CONFIG.inset;
let generation = 0;

if (SHELL_MODE !== "grid") {
  throw new Error("preview/editor.js only supports the grid preview shell");
}

// ---- Component model, interaction manager & constraints ----
const model = new ComponentModel();
const mgr = new InteractionManager();
const selectedIds = mgr.selectedIds;
let selectionDepth = 0;
let overrides = model.overrides;
const constraints = createDefaultRegistry();
let lastViolations = [];
// Track which override keys were set by engine coercion (not user action).
// Format: Set of "fid:key" strings, e.g. "root:sizing_h"
const _coercedKeys = new Set();
let _layoutRelayoutTimer = null;
var _previewGridEditorInstallUnit = null;
var _previewGridEditorRuntime = null;

function _warnUnknownInspectorAction(kind, action, actionEl) {
  if (!action) return;
  console.warn(`preview inspector: unknown ${kind} action "${action}"`, actionEl);
}

let _allowInternalDirtyNavigation = false;
// HANDLE_SIZE now shared via SHARED_HANDLE_SIZE in editor-base.js
let multiActionGap = window.__DG_CONFIG.col_gap || 24;

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
  return previewShellBootstrap.createPreviewGridEditorInstallUnitFromEditorHost(
    previewShellBootstrap.createPreviewGridEditorInstallOptionsFromLegacyEditorHost({
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
        fallbackGap: window.__DG_CONFIG.col_gap || 24,
        snapToGrid: (value) => snapToGrid(value),
      },
      state: {
        model,
        interactionManager: mgr,
        selectedIds,
        selectionDepthState: {
          get: () => selectionDepth,
          set: (nextDepth) => {
            selectionDepth = nextDepth;
          },
        },
        coercedKeys: _coercedKeys,
        editorState: EditorState,
        previewSaveClient: PreviewSaveClient,
        generationState: {
          get: () => generation,
          set: (value) => {
            generation = value;
          },
        },
        allowInternalDirtyNavigationState: {
          get: () => _allowInternalDirtyNavigation,
          set: (allowed) => {
            _allowInternalDirtyNavigation = allowed;
          },
        },
        constraints,
        lastViolationsState: {
          get: () => lastViolations,
          set: (violations) => {
            lastViolations = violations;
          },
        },
        overridesState: {
          get: () => overrides,
          set: (nextOverrides) => {
            overrides = nextOverrides;
          },
        },
        multiActionGapState: {
          get: () => multiActionGap,
          set: (gap) => {
            multiActionGap = gap;
          },
        },
        layoutRelayoutTimerState: {
          get: () => _layoutRelayoutTimer,
          set: (timerId) => {
            _layoutRelayoutTimer = timerId;
          },
        },
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
    }),
  );
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
const _getPreviewGridEditorCompat = () => _getPreviewGridEditorInstallUnit().getCompatFacade();

const _getEditorRuntimeSet = () => _getEditorInteractionFacade().getEditorRuntimeSet();
const _getSelectionRuntime = () => _getEditorInteractionFacade().getSelectionRuntime();
const _getInspectorDisplayRuntime = () => _getEditorInteractionFacade().getInspectorDisplayRuntime();
const _getInspectorMutationRuntime = () => _getEditorInteractionFacade().getInspectorMutationRuntime();
const _getInspectorSelectionRuntime = () => _getEditorInteractionFacade().getInspectorSelectionRuntime();
const _getArrowWaypointRuntime = () => _getEditorInteractionFacade().getArrowWaypointRuntime();
const _getRelayoutRuntime = () => _getEditorRelayoutFacade().getRelayoutRuntime();
const _getKeyboardRuntime = () => _getEditorInteractionFacade().getKeyboardRuntime();

const {
  loadSvg: loadSVG, finishRelayout: _finishLayoutRelayout, finishRelayout: _finishV3Relayout,
  signalDiagramLoaded: _signalDiagramLoaded, whenDiagramLoaded,
  syncBrowseNavToLocation: _syncBrowseNavToLocation,
  attemptDiagramNavigation: _attemptDiagramNavigation, loadTree, loadGridInfo,
  cycleGuideMode, renderGridOverlay, populateGridControls, onGridControlChange,
  refreshGridInfoFromLayout: refreshLayoutGridInfoFromLayout,
  refreshGridInfoFromLayout: refreshV3GridInfoFromLayout, applyWaypointOverrides,
  renderEmptyInspector, getPrimarySelectedId, renderSelectionInspector,
  applySelectionTargets, distributeSelection, alignSelection, renderMultiSelectionInspector,
  setMultiFrameAlign, applyMultiStyleOverride, setMultiFrameProp, setMultiFrameSize,
  failRelayout: _dispatchLayoutRelayoutFailure, failRelayout: _failLayoutRelayout,
  failRelayout: _failV3Relayout, getLayoutRelayoutStatus,
  getLayoutRelayoutStatus: getV3RelayoutStatus, applyAllOverrides, autoFitArtboard,
  rerenderStageFromModel: _rerenderStageFromModel, deleteSelectedFrames,
  buildTreeUi: buildTreeUI, bindInteraction, onSvgDoubleClick: onSvgDblClick,
  onSvgMouseDown, onDragMove, onDragUp, showResizeHandles, removeResizeHandles,
  showArrowWaypointHandles, startWaypointDrag: startWpDrag, onWaypointDragMove: onWpDragMove,
  onWaypointDragUp: onWpDragUp, addWaypoint, removeWaypoint, getArrowPoints,
  updateArrowVisual, rebuildArrowSvg: rebuildArrowSVG, startTextEdit,
  commitTextEdit, cancelTextEdit, scheduleLayoutResizeRelayout: _scheduleLayoutResizeRelayout,
  scheduleLayoutResizeRelayout: _scheduleV3ResizeRelayout,
  cancelLiveRelayout: _cancelLayoutResizeRelayout,
  cancelLiveRelayout: _cancelV3ResizeRelayout, persistResize: _persistResizeToLayout,
  persistResize: _persistResizeToV3, startResize, onResizeMove, onResizeUp,
  applyStyle: applyStyleOverride, applyStyle: applyFrameStyle, applyStyle: applyV3Style,
  deselectAll, applySelectionStateSnapshot: _applySelectionStateSnapshot,
  syncSelectionUi: _syncSelectionUi, selectComponent, reapplySelection,
  setFrameAlign, setFrameProp, requestLayoutRelayout,
  requestLayoutRelayout: requestV3Relayout, setFrameSize, setWidthUnit, setHeightUnit,
  updateInspector, clearOverride, updateOverrideSummary, refreshTreeColors,
  runConstraints, onDocumentKeyDown, bindGridControls,
  bootstrapEditorRuntime: bootstrapPreviewEditor,
} = _getPreviewGridEditorCompat();

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
const _scheduleV3Relayout = (cid) => _scheduleLayoutRelayout(cid);
const clearSelection = () => _getSelectionRuntime().clearSelection();

window.getLayoutRelayoutStatus = getLayoutRelayoutStatus;
window.getV3RelayoutStatus = getV3RelayoutStatus;
window.requestLayoutRelayout = requestLayoutRelayout;
window.requestV3Relayout = requestV3Relayout;

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
