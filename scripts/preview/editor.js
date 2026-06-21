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

function _readFrameTreeJson() {
  const previewBridgeHost = _getPreviewBridgeHostContract();
  return typeof previewBridgeHost.getFrameTreeJson === "function"
    ? previewBridgeHost.getFrameTreeJson()
    : null;
}
const UI_AUTHORING_ACCENT_LINE = getThemeToken("--bf-authoring-accent-line", "rgba(246, 183, 60, 0.9)");

// ---- BoxStyle presets (mirrors diagram_model.py BoxStyle enum) ----
const BOX_STYLES = window.__DG_BOX_STYLES || {
  default: { fill: "transparent", text: "#000000", icon: "#000000", border: "solid", label: "Child" },
  parent:  { fill: "#F3F3F3", text: "#000000", icon: "#000000", border: "none",  label: "Parent" },
  section: { fill: "transparent", text: "#000000", icon: "#000000", border: "solid", label: "Section" },
  annotation: { fill: "transparent", text: "#666666", icon: "#666666", border: "none", label: "Annotation" },
  highlight: { fill: "#000000", text: "#FFFFFF", icon: "#FFFFFF", border: "none", label: "Highlight" },
};
const renderBoxStyleOptions = window.__DG_boxStyleOptionsHtml || function renderBoxStyleOptions(selectedValue, options = {}) {
  const current = selectedValue == null ? "" : String(selectedValue);
  const resetLabel = options.originalLabel || "— as defined —";
  let html = `<option value=""${current === "" ? " selected" : ""}>${resetLabel}</option>`;
  for (const [key, preset] of Object.entries(BOX_STYLES)) {
    html += `<option value="${key}"${current === key ? " selected" : ""}>${preset.label}</option>`;
  }
  return html;
};
const boxStyleLabel = window.__DG_boxStyleLabel || function boxStyleLabel(styleName) {
  return BOX_STYLES[styleName]?.label || "As defined";
};

function _readRenderedStyleFields(cid) {
  const group = document.querySelector('[data-component-id="' + CSS.escape(cid) + '"]');
  const rect = group ? group.querySelector(":scope > rect:first-of-type") : null;
  if (!rect) return null;
  return {
    fill: rect.getAttribute("fill"),
    stroke: rect.getAttribute("stroke"),
  };
}

function _gridEl(id) {
  return document.getElementById(id);
}

// ---- Guide mode (W key) ----
const GUIDE_MODES = ["off", "all"];

// ---- Alignment snap guides ----
// Snap primitives (snapEdgeToTarget, collectGridSnapTargets, collectPeerSnapTargets,
// snapRectToTargets, renderGuideLines, clearGuideLines) are shared via editor-base.js.
// This file keeps only grid-model-aware wrappers that depend on `model` and the typed grid runtime.
const GUIDE_COLOR = UI_AUTHORING_ACCENT_LINE;
const GUIDE_OPACITY = "0.5";

function _getPreviewGridEditorRuntime() {
  if (_previewGridEditorRuntime) return _previewGridEditorRuntime;
  _previewGridEditorRuntime = window.__DG_getPreviewShellBootstrapContract()
    .createPreviewGridEditorRuntimeFromBrowserHost({
      shared: {
        document,
        previewWindow: window,
        slug: SLUG,
        engine: ACTIVE_LAYOUT_ENGINE,
        gridEnabled: GRID,
        guideModes: GUIDE_MODES,
        baselineStep: BASELINE_STEP,
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
      },
      browser: {
        getOverrides: () => overrides,
        replaceOverrides,
        syncArrowsInModel: typeof syncArrowsInModel === "function" ? syncArrowsInModel : null,
        arrowComponentId: typeof arrowComponentId === "function" ? arrowComponentId : null,
        pruneLinkedRootGridOverrides: _pruneLinkedRootGridOverrides,
        clearPendingRestoreRuntime: _clearPendingRestoreRuntime,
        applyLocalRestoreRefresh: _applyLocalRestoreRefresh,
        buildTreeUi: () => buildTreeUI(),
        bindInteraction: () => bindInteraction(),
        deselectAll: () => deselectAll(),
        reapplySelection: () => reapplySelection(),
        renderEmptyInspector: () => renderEmptyInspector(),
        renderSelectionInspector: (preferredCid) => renderSelectionInspector(preferredCid),
        renderMultiSelectionInspector: () => renderMultiSelectionInspector(),
        selectComponent: (cid, additive) => selectComponent(cid, additive),
        applySelectionStateSnapshot: (nextState, preferredCid) =>
          _applySelectionStateSnapshot(nextState, preferredCid),
        getPrimarySelectedId: (preferredCid) => getPrimarySelectedId(preferredCid),
        deleteSelectedFrames: () => deleteSelectedFrames(),
        getOwnDelta: (cid) => getOwnDelta(cid),
        getEffectiveDelta: (cid) => getEffectiveDelta(cid),
        getAncestors: (cid) => getAncestors(cid),
        getParentNode: (cid) => getParentNode(cid),
        getComponentNode: (cid) => getComponentNode(cid),
        getComponentType,
        getArrowNode: (cid) => getArrowNode(cid),
        getViolationsForComponent: (cid) => getViolationsForComponent(cid),
        readRenderedStyleFields: _readRenderedStyleFields,
        renderGuideLines: (lines) => renderGuideLines(lines, GUIDE_COLOR, GUIDE_OPACITY),
        clearGuideLines,
        clearHandlesByClass,
        renderResizeHandles: ({ svg, left, top, right, bottom, nodeId, options: renderOptions }) => {
          renderResizeHandles(svg, left, top, right, bottom, nodeId, {
            handleClass: "dg-handle",
            nodeAttr: renderOptions.nodeAttr,
            dirAttr: renderOptions.dirAttr,
          });
        },
        collectPeerSnapTargets,
        collectGridSnapTargets,
        snapRectToTargets,
        fitRenderedSvgToContent: typeof fitSvgToRenderedContent === "function"
          ? fitSvgToRenderedContent
          : null,
        escapeHtml: typeof escapeHtml === "function" ? escapeHtml : null,
        initNavTabs,
        setDirty,
        setStatus: typeof setStatus === "function" ? setStatus : null,
        sanitizeSvgCloneForExport,
        applyInteractionOverrideEntries: _applyInteractionOverrideEntries,
        setOverride,
        cleanOverride,
        setWaypointOverride,
        setFrameProp: (cid, prop, value) => setFrameProp(cid, prop, value),
        scheduleTextRelayout: (cid) => {
          clearTimeout(_layoutRelayoutTimer);
          _layoutRelayoutTimer = setTimeout(() => requestLayoutRelayout(cid), 100);
        },
        scheduleLayoutResizeRelayout: (cid, newW, newH, resizedW, resizedH) =>
          _scheduleLayoutResizeRelayout(cid, newW, newH, resizedW, resizedH),
        scheduleV3ResizeRelayout: (cid, newW, newH, resizedW, resizedH) =>
          _scheduleV3ResizeRelayout(cid, newW, newH, resizedW, resizedH),
        cancelLiveRelayout: () => _cancelLayoutResizeRelayout(),
        persistResize: _persistResizeToLayout,
        save: () => PreviewSaveClient.trySaveIfDirty(),
        undo: () => { void EditorState.undo(_applyUndoCommand); },
        redo: () => { void EditorState.redo(_applyUndoCommand); },
        onResizeUp: () => onResizeUp(),
        cycleGuideMode: () => cycleGuideMode(),
        requestLayoutRelayout: (triggerCid) => requestLayoutRelayout(triggerCid),
        requestV3Relayout: (triggerCid) => requestV3Relayout(triggerCid),
        interactionMode: InteractionMode,
        boxStyles: BOX_STYLES,
        inset: INSET,
        iconSize: window.__DG_CONFIG.icon_size,
        handleSize: SHARED_HANDLE_SIZE,
        textEditingMode: InteractionMode.TEXT_EDITING,
        columnGap: window.__DG_CONFIG.col_gap,
        hasLayoutChildren: _hasLayoutChildren,
        minNodeSize: SHARED_MIN_NODE_SIZE,
        fallbackGap: window.__DG_CONFIG.col_gap || 24,
        multiActionGapState: {
          get: () => multiActionGap,
          set: (gap) => {
            multiActionGap = gap;
          },
        },
        getInspector: () => getInspectorElement(),
        getTextAdapter: typeof window.getLayoutTextAdapter === "function"
          ? () => window.getLayoutTextAdapter()
          : null,
        renderBoxStyleOptions,
        formatAsDefinedStyleLabel: _formatAsDefinedStyleLabel,
        snapToGrid: (value) => snapToGrid(value),
        scheduleRelayout: _scheduleLayoutRelayout,
        requestRelayoutNow: (cid) => {
          clearTimeout(_layoutRelayoutTimer);
          requestLayoutRelayout(cid);
        },
        updateOverrideSummary: () => updateOverrideSummary(),
        refreshTreeColors: () => refreshTreeColors(),
        runConstraints: () => runConstraints(),
        alert: (message) => alert(message),
        normalizeStyleName: _normaliseStyleName,
        waypointDraggingMode: InteractionMode.WAYPOINT_DRAGGING,
        writeClipboardText: (text) => navigator.clipboard.writeText(text),
        requestAnimationFrameFn: requestAnimationFrame,
        cancelAnimationFrameFn: cancelAnimationFrame,
        theme: {
          headLen: window.__DG_CONFIG.head_len,
          headHalf: window.__DG_CONFIG.head_half,
          color: "#E95420",
        },
      },
    });
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

const previewGridEditorBrowserState = window.__DG_getPreviewShellBootstrapContract()
  .createPreviewGridEditorBrowserStateFromBrowserHost({
    model,
    editorState: EditorState,
    previewSaveClient: PreviewSaveClient,
    constraints,
    lastViolationsState: {
      get: () => lastViolations,
    },
    overridesState: {
      get: () => overrides,
      set: (nextOverrides) => {
        overrides = nextOverrides;
      },
    },
    invalidateOverrideBoundFacades: () => {
      if (_previewGridEditorRuntime) {
        _previewGridEditorRuntime.invalidateOverrideBoundFacades();
      }
    },
    multiActionGapState: {
      get: () => multiActionGap,
      set: (value) => {
        multiActionGap = value;
      },
    },
    baselineStep: BASELINE_STEP,
    getPreviewBridgeRelayoutContract: () => window.__DG_getPreviewBridgeRelayoutContract(),
    getPreviewShellInteractionContract: () => window.__DG_getPreviewShellInteractionContract(),
    getSceneFacade: () => _getEditorSceneFacade(),
    getRequestLayoutRelayout: () => requestLayoutRelayout,
    getMultiActionGapInput: () => document.getElementById("multi-action-gap"),
    setTimeoutFn: (callback, delayMs) => setTimeout(callback, delayMs),
    clearTimeoutFn: (timerId) => clearTimeout(timerId),
  });

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

const loadSVG = (options = {}) => _getEditorBootstrapFacade().loadSvg(options);
const _finishLayoutRelayout = (triggerCid, localResult, executionLabel) =>
  _getEditorRelayoutFacade().finishRelayout(triggerCid, localResult, executionLabel);
const _finishV3Relayout = (triggerCid, localResult, executionLabel) =>
  _getEditorRelayoutFacade().finishRelayout(triggerCid, localResult, executionLabel);
const _signalDiagramLoaded = () => _getEditorBootstrapFacade().signalDiagramLoaded();
const whenDiagramLoaded = () => _getEditorBootstrapFacade().whenDiagramLoaded();

window.whenDiagramLoaded = whenDiagramLoaded;

const _syncBrowseNavToLocation = () => _getEditorBootstrapFacade().syncBrowseNavToLocation();
const _attemptDiagramNavigation = (nextUrl, syncUi) =>
  _getEditorBootstrapFacade().attemptDiagramNavigation(nextUrl, syncUi);
const loadTree = (canonicalState = null) => _getEditorBootstrapFacade().loadTree(canonicalState);
const loadGridInfo = (canonicalState = null) => _getEditorSceneFacade().loadGridInfo(canonicalState);
const cycleGuideMode = () => _getEditorSceneFacade().cycleGuideMode();
const renderGridOverlay = () => _getEditorSceneFacade().renderGridOverlay();
const populateGridControls = () => _getEditorSceneFacade().populateGridControls();
const onGridControlChange = () => _getEditorSceneFacade().onGridControlChange();

// ---- Column/row span ↔ pixel conversion ----

const refreshLayoutGridInfoFromLayout = () => _getEditorSceneFacade().refreshGridInfoFromLayout();
const refreshV3GridInfoFromLayout = () => refreshLayoutGridInfoFromLayout();

_getEditorSceneFacade().bindGridControls();

const applyWaypointOverrides = () => _getEditorSceneFacade().applyWaypointOverrides();

// ---- Override application ----

const getOwnDelta = (cid) => model.getOwnDelta(cid);

const getAncestors = (cid) => model.getAncestors(cid);
const getEffectiveDelta = (cid) => model.getEffectiveDelta(cid);
const snapToGrid = (value) => Math.round(value / 8) * 8;
const getInspectorElement = () => document.getElementById("inspector");

let _inspectorActionsBound = false;

function bindInspectorActions() {
  const inspector = getInspectorElement();
  _inspectorActionsBound = window.__DG_getPreviewShellInspectorContract().bindPreviewInspectorActions({
    inspector,
    alreadyBound: _inspectorActionsBound,
    warnUnknownAction: _warnUnknownInspectorAction,
    setFrameAlign: (cid, align) => setFrameAlign(cid, align),
    clearOverride: (cid) => clearOverride(cid),
    alignSelection: (mode) => alignSelection(mode),
    distributeSelection: (axis) => distributeSelection(axis),
    setMultiFrameAlign: (align) => setMultiFrameAlign(align),
    applyStyleOverride: (cid, value) => applyStyleOverride(cid, value),
    setFrameProp: (cid, prop, value) => setFrameProp(cid, prop, value),
    setFrameSize: (cid, dimension, value) => setFrameSize(cid, dimension, value),
    setWidthUnit: (value, cid) => setWidthUnit(value, cid),
    setHeightUnit: (value, cid) => setHeightUnit(value, cid),
    applyMultiStyleOverride: (value) => applyMultiStyleOverride(value),
    setMultiFrameProp: (prop, value) => setMultiFrameProp(prop, value),
    setMultiFrameSize: (dimension, value) => setMultiFrameSize(dimension, value),
    setMultiActionGap: (value) => setMultiActionGap(value),
  });
}

const renderEmptyInspector = () => _getInspectorDisplayRuntime().renderEmptyInspector();
const getPrimarySelectedId = (preferredCid) =>
  window.__DG_getPreviewShellInteractionContract().resolvePrimarySelectedId(selectedIds, preferredCid);
const renderSelectionInspector = (preferredCid) =>
  _getInspectorDisplayRuntime().renderSelectionInspector(preferredCid);

const applySelectionTargets = (items, targets) =>
  _getInspectorSelectionRuntime().applySelectionTargets(items, targets);
const distributeSelection = (axis) => _getInspectorSelectionRuntime().distributeSelection(axis);
const alignSelection = (mode) => _getInspectorSelectionRuntime().alignSelection(mode);
const renderMultiSelectionInspector = () => _getInspectorDisplayRuntime().renderMultiSelectionInspector();

function _formatAsDefinedStyleLabel(styleName, mixed = false) {
  if (mixed) return '— as defined (mixed) —';
  const canonical = _normaliseStyleName(styleName);
  if (canonical && BOX_STYLES[canonical]) {
    return `— as defined (${boxStyleLabel(canonical)}) —`;
  }
  return '— as defined —';
}

/**
 * Apply alignment to ALL selected items, then trigger a single relayout.
 */
const setMultiFrameAlign = (align) => _getInspectorSelectionRuntime().setMultiFrameAlign(align);

/**
 * Apply style override to ALL selected box/panel/terminal items.
 */
const applyMultiStyleOverride = (styleName) =>
  _getInspectorSelectionRuntime().applyMultiStyleOverride(styleName);

/**
 * Apply a frame property to ALL selected items, then trigger a single relayout.
 */
const setMultiFrameProp = (prop, value) => _getInspectorSelectionRuntime().setMultiFrameProp(prop, value);

/**
 * Set an explicit width or height for all selected items, converting from
 * the current inspector unit (px, cols, rows) to pixels.
 */
const setMultiFrameSize = (dimension, value) =>
  _getInspectorSelectionRuntime().setMultiFrameSize(dimension, value);
const _dispatchLayoutRelayoutFailure = (reason, triggerCid) =>
  _getEditorRelayoutFacade().failRelayout(reason, triggerCid);
const _failLayoutRelayout = (reason, triggerCid) =>
  _dispatchLayoutRelayoutFailure(reason, triggerCid);
const _failV3Relayout = (reason, triggerCid) => _failLayoutRelayout(reason, triggerCid);
const getLayoutRelayoutStatus = () => _getEditorRelayoutFacade().getLayoutRelayoutStatus();
const getV3RelayoutStatus = () => getLayoutRelayoutStatus();
const applyAllOverrides = () => _getEditorSceneFacade().applyAllOverrides();

/**
 * Expand the SVG artboard (viewBox + width/height) if any component's
 * effective bounding box extends past the current canvas edges.
 * Called after drag/resize so content never gets clipped.
 */
const autoFitArtboard = () => _getEditorSceneFacade().autoFitArtboard();

// ---- Frame delete ----

const _rerenderStageFromModel = () => _getEditorSceneFacade().rerenderStageFromModel();
const deleteSelectedFrames = () => (
  _getEditorSceneFacade().deleteSelectedFrames().then((result) => result.rerendered)
);

// ---- Interaction ----

const _getStageBindingRuntime = () => _getEditorInteractionFacade().getStageBindingRuntime();
const buildTreeUI = () => _getStageBindingRuntime().buildTreeUi();
const bindInteraction = () => _getStageBindingRuntime().bindInteraction();

// ---- Drag (move) ----

const _getPointerInteractionRuntime = () => _getEditorInteractionFacade().getPointerInteractionRuntime();
const onSvgDblClick = (e) => _getPointerInteractionRuntime().onSvgDoubleClick(e);
const onSvgMouseDown = (e) => _getPointerInteractionRuntime().onSvgMouseDown(e);
const onDragMove = (e) => _getPointerInteractionRuntime().onDragMove(e);
function onDragUp() {
  _getEditorInteractionFacade().onDragUp();
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

// ---- Resize ----

const _getSelectionChromeRuntime = () => _getEditorInteractionFacade().getSelectionChromeRuntime();
const showResizeHandles = (cid) => _getSelectionChromeRuntime().showResizeHandles(cid);
const removeResizeHandles = () => _getSelectionChromeRuntime().removeResizeHandles();

// ---- Arrow waypoint handles ----

const showArrowWaypointHandles = (cid) => _getArrowWaypointRuntime().showArrowWaypointHandles(cid);
const startWpDrag = (e) => _getArrowWaypointRuntime().startWaypointDrag(e);
const onWpDragMove = (e) => _getArrowWaypointRuntime().onWaypointDragMove(e);
const onWpDragUp = (e) => _getArrowWaypointRuntime().onWaypointDragUp(e);
const addWaypoint = (cid, segIdx, x, y) => _getArrowWaypointRuntime().addWaypoint(cid, segIdx, x, y);
const removeWaypoint = (cid, idx) => _getArrowWaypointRuntime().removeWaypoint(cid, idx);
const getArrowPoints = (cid) => _getArrowWaypointRuntime().getArrowPoints(cid);
const updateArrowVisual = (cid) => _getArrowWaypointRuntime().updateArrowVisual(cid);
const rebuildArrowSVG = (cid) => _getArrowWaypointRuntime().rebuildArrowSvg(cid);

// ---- Inline text editing ----

const _getTextEditRuntime = () => _getEditorInteractionFacade().getTextEditRuntime();
const startTextEdit = (cid, e, opts) => _getTextEditRuntime().startTextEdit(cid, e, opts);
const commitTextEdit = () => _getTextEditRuntime().commitTextEdit();
const cancelTextEdit = () => _getTextEditRuntime().cancelTextEdit();

// ---------------------------------------------------------------------------
// Live layout resize relayout — runs the TS engine each animation frame so the
// diagram responds smoothly while the user drags a resize handle.
// ---------------------------------------------------------------------------
const _getLiveResizeRuntime = () => _getEditorRelayoutFacade().getLiveResizeRuntime();
const _scheduleLayoutResizeRelayout = (cid, newW, newH, resizedW, resizedH) =>
  _getLiveResizeRuntime().scheduleRelayout(cid, newW, newH, resizedW, resizedH);
const _scheduleV3ResizeRelayout = (cid, newW, newH, resizedW, resizedH) =>
  _getEditorRelayoutFacade().scheduleResizeRelayout(cid, newW, newH, resizedW, resizedH);
const _cancelLayoutResizeRelayout = () => _getLiveResizeRuntime().cancelRelayout();
const _cancelV3ResizeRelayout = () => _cancelLayoutResizeRelayout();
const _persistResizeToLayout = (resizeIds, propagatedIds, triggerCid, baseSizes) =>
  _getEditorRelayoutFacade().persistResize(resizeIds, propagatedIds, triggerCid, baseSizes);
const _persistResizeToV3 = (resizeIds, propagatedIds, triggerCid, baseSizes) =>
  _persistResizeToLayout(resizeIds, propagatedIds, triggerCid, baseSizes);
const _getResizeInteractionRuntime = () => _getEditorInteractionFacade().getResizeInteractionRuntime();
const startResize = (e) => _getResizeInteractionRuntime().startResize(e);
const onResizeMove = (e) => _getResizeInteractionRuntime().onResizeMove(e);
const onResizeUp = () => _getResizeInteractionRuntime().onResizeUp();

// ---- Override helpers ----

const applyStyleOverride = (cid, styleName) => applyFrameStyle(cid, styleName);

function _normaliseStyleName(styleName) {
  return window.__DG_getPreviewShellInspectorContract().normalizePreviewStyleName(styleName);
}

const _scheduleV3Relayout = (cid) => _scheduleLayoutRelayout(cid);

// Track which override keys were set by engine coercion (not user action).
// Format: Set of "fid:key" strings, e.g. "root:sizing_h"
const _coercedKeys = new Set();

const _getEditorRuntimeSet = () => _getEditorInteractionFacade().getEditorRuntimeSet();
const _getSelectionRuntime = () => _getEditorInteractionFacade().getSelectionRuntime();
const _getInspectorDisplayRuntime = () => _getEditorInteractionFacade().getInspectorDisplayRuntime();
const _getInspectorMutationRuntime = () => _getEditorInteractionFacade().getInspectorMutationRuntime();
const _getInspectorSelectionRuntime = () => _getEditorInteractionFacade().getInspectorSelectionRuntime();
const _getArrowWaypointRuntime = () => _getEditorInteractionFacade().getArrowWaypointRuntime();

/**
 * Style override: applies level/fill/border style fields and triggers relayout.
 */
const applyFrameStyle = (cid, styleName) => _getInspectorMutationRuntime().applyStyle(cid, styleName);
const applyV3Style = (cid, styleName) => applyFrameStyle(cid, styleName);

// ---- Selection & Inspector ----

const deselectAll = () => _getSelectionRuntime().deselectAll();
const _applySelectionStateSnapshot = (nextState, preferredCid) =>
  _getSelectionRuntime().applySelectionStateSnapshot(nextState, preferredCid);
const _syncSelectionUi = (preferredCid) => _getSelectionRuntime().syncSelectionUi(preferredCid);
const selectComponent = (cid, additive) => _getSelectionRuntime().selectComponent(cid, additive);
const reapplySelection = () => _getSelectionRuntime().reapplySelection();
const clearSelection = () => _getSelectionRuntime().clearSelection();
const setFrameAlign = (cid, align) => _getInspectorMutationRuntime().setFrameAlign(cid, align);
const setFrameProp = (cid, prop, value) => _getInspectorMutationRuntime().setFrameProp(cid, prop, value);
const _getRelayoutRuntime = () => _getEditorRelayoutFacade().getRelayoutRuntime();
const requestLayoutRelayout = (triggerCid) => _getRelayoutRuntime().requestRelayout(triggerCid);
const requestV3Relayout = (triggerCid) => requestLayoutRelayout(triggerCid);

window.getLayoutRelayoutStatus = getLayoutRelayoutStatus;
window.getV3RelayoutStatus = getV3RelayoutStatus;
window.requestLayoutRelayout = requestLayoutRelayout;
window.requestV3Relayout = requestV3Relayout;

/**
 * Set an explicit width or height value, converting from the current
 * inspector unit (px, cols, rows) to pixels.
 */
const setFrameSize = (cid, dimension, value) =>
  _getInspectorMutationRuntime().setFrameSize(cid, dimension, value);
const setWidthUnit = (unit, cid) => _getInspectorDisplayRuntime().setWidthUnit(unit, cid);
const setHeightUnit = (unit, cid) => _getInspectorDisplayRuntime().setHeightUnit(unit, cid);
const updateInspector = (cid) => _getInspectorDisplayRuntime().updateInspector(cid);

// ---- Override persistence (save orchestration in save-client.js) ----

const clearOverride = (cid) => _getRelayoutRuntime().clearOverride(cid);
const updateOverrideSummary = () => _getEditorSceneFacade().updateOverrideSummary();
const refreshTreeColors = () => _getEditorSceneFacade().refreshTreeColors();

// Keyboard shortcuts: Ctrl+S to save, Ctrl+Z to undo, Ctrl+Shift+Z/Ctrl+Y to redo, arrows to nudge

const _getKeyboardRuntime = () => _getEditorInteractionFacade().getKeyboardRuntime();
const onDocumentKeyDown = (e) => _getKeyboardRuntime().onDocumentKeyDown(e);

bindInspectorActions();

// Warn before leaving with unsaved changes.
// Internal diagram navigation uses its own confirm path and suppresses this.
// beforeunload wiring lives in PreviewSaveClient.init().

// ---- Constraint validation ----

const runConstraints = () => _getEditorSceneFacade().runConstraints();

// ---- SSE / bootstrap tail ----

const bootstrapPreviewEditor = () => _getEditorBootstrapFacade().bootstrapEditorRuntime();

bootstrapPreviewEditor();

// ---- Left sidebar tabs (Browse / Layers) ----
// Handled by initNavTabs() in editor-base.js via initPreviewShell().
