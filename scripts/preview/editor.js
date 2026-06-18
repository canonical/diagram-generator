"use strict";
const SLUG = window.__DG_CONFIG.slug;
const ENGINE = window.__DG_CONFIG.engine || "v3";
const GRID = window.__DG_CONFIG.grid;
const INSET = window.__DG_CONFIG.inset;
let generation = 0;

if (ENGINE !== "v3") {
  throw new Error("preview/editor.js only supports the v3 local renderer");
}

// ---- Component model, interaction manager & constraints ----
const model = new ComponentModel();
const mgr = new InteractionManager();
const selectedIds = mgr.selectedIds;
let selectionDepth = 0;
let overrides = model.overrides;
const constraints = createDefaultRegistry();
let lastViolations = [];

function replaceOverrides(nextOverrides) {
  overrides = nextOverrides || {};
  model.overrides = overrides;
  return overrides;
}

function _warnUnknownInspectorAction(kind, action, actionEl) {
  if (!action) return;
  console.warn(`preview inspector: unknown ${kind} action "${action}"`, actionEl);
}

let _allowInternalDirtyNavigation = false;
// HANDLE_SIZE now shared via SHARED_HANDLE_SIZE in editor-base.js
let multiActionGap = window.__DG_CONFIG.col_gap || 24;
const DIRTY_DIAGRAM_NAV_CONFIRM = "You have unsaved changes. Leave this diagram without saving?";

function getThemeToken(name, fallback) {
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function _getPreviewBridgeHostContract() {
  return window.__DG_getPreviewBridgeHostContract();
}

function _readPreviewDocumentJson() {
  const previewBridgeHost = _getPreviewBridgeHostContract();
  return typeof previewBridgeHost.getPreviewDocumentJson === "function"
    ? previewBridgeHost.getPreviewDocumentJson()
    : null;
}

function _readFrameTreeJson() {
  const previewBridgeHost = _getPreviewBridgeHostContract();
  return typeof previewBridgeHost.getFrameTreeJson === "function"
    ? previewBridgeHost.getFrameTreeJson()
    : null;
}

function _getLocalBridgeRelayoutStatus() {
  const previewBridgeHost = _getPreviewBridgeHostContract();
  return typeof previewBridgeHost.getLocalRelayoutStatus === "function"
    ? previewBridgeHost.getLocalRelayoutStatus()
    : null;
}

const UI_AUTHORING_ACCENT = getThemeToken("--bf-authoring-accent", "#F6B73C");
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

// ---- Grid constants ----
// BASELINE_STEP is defined in editor-base.js (shared constant)
// Default grid settings for newly loaded diagrams
const GRID_DEFAULTS = {
  cols: 2,
  rows: 1,           // auto-calculated unless user overrides
  col_gap: 24,
  row_gap: 24,
  margin_top: 24,
  margin_right: 24,
  margin_bottom: 24,
  margin_left: 24,
  link_to_root: true,
  slack_absorption: true,
};

/** Read a layout field from ComponentNode (top-level or raw tree data). */
function _nodeProp(node, key) {
  if (!node) return undefined;
  if (node[key] !== undefined && node[key] !== null && node[key] !== "") return node[key];
  if (node.data && node.data[key] !== undefined && node.data[key] !== null) return node.data[key];
  return undefined;
}

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
let guideMode = "off";
let gridInfo = null;
let baseGridInfo = null;

// ---- Alignment snap guides ----
// Snap primitives (snapEdgeToTarget, collectGridSnapTargets, collectPeerSnapTargets,
// snapRectToTargets, renderGuideLines, clearGuideLines) are shared via editor-base.js.
// This file keeps only grid-model-aware wrappers that depend on `model` and `gridInfo`.
const GUIDE_COLOR = UI_AUTHORING_ACCENT_LINE;
const GUIDE_OPACITY = "0.5";

/**
 * Collect snap targets from peer components AND the Brockman grid.
 * Uses the grid model (not available in force mode) for peer lookups.
 */
function collectSnapTargets(dragCid) {
  return window.__DG_getPreviewShellInteractionContract().collectPreviewSnapTargets({
    dragId: dragCid,
    gridInfo,
    getNode: (id) => model.get(id),
    getRootNodes: () => model.roots,
    getOwnDelta: (id) => model.getOwnDelta(id),
    getEffectiveDelta: (id) => model.getEffectiveDelta(id),
    collectPeerSnapTargets,
    collectGridSnapTargets,
  });
}

/**
 * Find which snap targets the dragged component is close to.
 * Returns { snapDx, snapDy, lines[] }.
 */
function findSnaps(cid, proposedDx, proposedDy, targets) {
  const snap = window.__DG_getPreviewShellInteractionContract().resolvePreviewDragSnap({
    cid,
    proposedDx,
    proposedDy,
    targets,
    getNode: (id) => model.get(id),
    getOwnDelta: (id) => model.getOwnDelta(id),
    snapRectToTargets,
    snapStep: BASELINE_STEP,
  });
  return { snapDx: snap.dx, snapDy: snap.dy, lines: snap.lines };
}

/**
 * Grid-model-aware wrapper for resize snapping.
 * Delegates to collectGridSnapTargets() from editor-base.js.
 */
function _gridSnapTargets() {
  return collectGridSnapTargets(gridInfo);
}

// ---- Dirty tracking + editor state (EditorState / PreviewSaveClient) ----

function setDirty(dirty) {
  PreviewSaveClient.setDirty(dirty);
}

window.setDirty = setDirty;

function _pruneLinkedRootGridOverrides() {
  if (!model.gridOverrides || Object.keys(model.gridOverrides).length === 0) return;
  const rootId = (model.roots[0] || {}).id || "root";
  const rootOverrides = overrides[rootId];
  if (!rootOverrides) return;

  delete rootOverrides.gap;
  delete rootOverrides.gap_delta;
  delete rootOverrides.padding;
  delete rootOverrides.padding_top;
  delete rootOverrides.padding_right;
  delete rootOverrides.padding_bottom;
  delete rootOverrides.padding_left;

  if (Object.keys(rootOverrides).length === 0) {
    delete overrides[rootId];
  }
}

function _restoreOverrideEntries(entries) {
  replaceOverrides(window.__DG_getPreviewBridgeRelayoutContract().restorePreviewOverrideEntries({
    currentOverrides: overrides,
    entries,
  }));
  Object.keys(entries || {}).forEach((cid) => model.cleanOverride(cid));
}

function _snapshotNeedsV3Relayout(snapshot) {
  return window.__DG_getPreviewBridgeRelayoutContract().snapshotNeedsPreviewRelayout({
    snapshot,
    getNode: (cid) => model.get(cid),
    hasV3FrameOverride: (entry) => _hasV3FrameOverride(entry),
  });
}

function _clearPendingRestoreRuntime() {
  if (relayoutTimer) {
    clearTimeout(relayoutTimer);
    relayoutTimer = null;
  }
  clearTimeout(_v3RelayoutTimer);
  EditorState.setPendingGridAction(null);
}

function _applyLocalRestoreRefresh(syncGridControls = false) {
  window.__DG_getPreviewShellSceneContract().refreshPreviewSceneHost({
    applyWaypointOverrides,
    applyAllOverrides,
    reapplySelection,
    renderSelectionInspector,
    updateOverrideSummary,
    refreshTreeColors,
    runConstraints,
    populateGridControls: syncGridControls && gridInfo ? populateGridControls : null,
  });
}

/** Serialise the full dirty-trackable state (overrides + grid overrides). */
async function _restoreEditorState(serializedState) {
  await window.__DG_getPreviewBridgeRelayoutContract().restorePreviewSerializedState({
    serializedState,
    currentOverrides: overrides,
    currentGridOverrides: model.gridOverrides || {},
    currentRemovedIds: model.removedIds || new Set(),
    rootId: (model.roots[0] || {}).id || "root",
    getNode: (cid) => model.get(cid),
    hasV3FrameOverride: (entry) => _hasV3FrameOverride(entry),
    setOverrides: (nextOverrides) => {
      replaceOverrides(nextOverrides);
    },
    setGridOverrides: (nextGridOverrides) => {
      model.gridOverrides = EditorState.cloneValue(nextGridOverrides);
    },
    setElkLayoutOverrides: (nextElkLayoutOverrides) => {
      model.elkLayoutOverrides = EditorState.cloneValue(nextElkLayoutOverrides);
    },
    setRemovedIds: (nextRemovedIds) => {
      model.removedIds = new Set(nextRemovedIds);
    },
    setFrameTree: (frameTree) => {
      const previewBridgeHost = _getPreviewBridgeHostContract();
      if (typeof previewBridgeHost.setFrameTreeJson === "function") {
        previewBridgeHost.setFrameTreeJson(frameTree);
      }
    },
    pruneLinkedRootOverrides: () => _pruneLinkedRootGridOverrides(),
    clearPendingRuntime: () => _clearPendingRestoreRuntime(),
    rerenderStageFromFrameTree: () => _rerenderStageFromModel(),
    requestRelayout: (triggerId) => requestV3Relayout(triggerId),
    applyLocalRefresh: ({ syncGridControls }) => _applyLocalRestoreRefresh(syncGridControls),
    syncGridControls: () => {
      if (gridInfo) populateGridControls();
    },
    syncDirtyFromSerialized: (currentStateStr) => PreviewSaveClient.syncDirtyFromSerialized(currentStateStr),
    serializeDirtyState: () => EditorState.serializeDirtyState(),
  });
}

async function _restoreOverridePatch(entries) {
  await window.__DG_getPreviewBridgeRelayoutContract().restorePreviewOverridePatch({
    entries,
    currentOverrides: overrides,
    rootId: (model.roots[0] || {}).id || "root",
    getNode: (cid) => model.get(cid),
    hasV3FrameOverride: (entry) => _hasV3FrameOverride(entry),
    captureOverrideEntries: (ids) => EditorState.captureOverrideEntries(ids),
    setOverrides: (nextOverrides) => {
      replaceOverrides(nextOverrides);
    },
    cleanOverride: (cid) => model.cleanOverride(cid),
    clearPendingRuntime: () => _clearPendingRestoreRuntime(),
    requestRelayout: (triggerId) => requestV3Relayout(triggerId),
    applyLocalRefresh: ({ syncGridControls }) => _applyLocalRestoreRefresh(syncGridControls),
    syncDirtyFromSerialized: (currentStateStr) => PreviewSaveClient.syncDirtyFromSerialized(currentStateStr),
    serializeDirtyState: () => EditorState.serializeDirtyState(),
  });
}

async function _applyUndoCommand(command, direction) {
  if (command && command.kind === "override-patch") {
    await _restoreOverridePatch(direction === "undo" ? command.beforeEntries : command.afterEntries);
    return;
  }
  await _restoreEditorState(direction === "undo" ? command.before : command.after);
}

function _hasV3FrameOverride(ovr) {
  const relayout = window.__DG_getPreviewBridgeRelayoutContract();
  return typeof relayout.hasV3FrameOverride === "function"
    && relayout.hasV3FrameOverride(ovr);
}

function _isPreviewEngineShellLayoutActive(frameTreeJson) {
  return window.__DG_getPreviewShellBootstrapContract().isPreviewEngineShellLayoutActive(
    window,
    frameTreeJson,
  );
}

function _initPreviewEngineShellPanel() {
  window.__DG_getPreviewShellBootstrapContract().initPreviewEngineShellPanel(window);
}

async function loadSVG(options = {}) {
  const stage = document.getElementById("stage");
  const previewShellBootstrap = window.__DG_getPreviewShellBootstrapContract();
  await previewShellBootstrap.loadPreviewSvg(
    previewShellBootstrap.createLoadPreviewSvgHostOptions({
      invocation: options,
      stage,
      slug: SLUG,
      engine: ENGINE,
      gridEnabled: GRID,
      deselectAll,
      previewBridgeHost: _getPreviewBridgeHostContract(),
      isEngineLayoutActive: () => _isPreviewEngineShellLayoutActive(),
      resetOverrideState,
      initEnginePanel: () => _initPreviewEngineShellPanel(),
      getLocalRelayoutStatus: () => _getLocalBridgeRelayoutStatus(),
      escapeHtml,
      loadTree,
      loadGridInfo,
      getGridInfo: () => gridInfo,
      setDiagramGrid: (nextGridInfo) => model.setDiagramGrid(nextGridInfo),
      populateGridControls,
      applyWaypointOverrides,
      applyAllOverrides,
      bindInteraction,
      renderGridOverlay,
      restoreSelection: (ids) => {
        if (ids) {
          selectedIds.clear();
          ids.forEach((id) => selectedIds.add(id));
        }
        reapplySelection();
      },
      runConstraints,
      markSaved: (serializedState) => PreviewSaveClient.markSaved(serializedState),
      serializeDirtyState: () => EditorState.serializeDirtyState(),
      signalDiagramLoaded: _signalDiagramLoaded,
      getGridOverrides: () => model.gridOverrides,
      pruneLinkedRootGridOverrides: _pruneLinkedRootGridOverrides,
      previewBridgeRender: window.__DG_getPreviewBridgeRenderContract(),
      overrides,
      model,
      fitRenderedSvgToContent: typeof fitSvgToRenderedContent === "function"
        ? (svg, fitOptions) => fitSvgToRenderedContent(svg, fitOptions)
        : null,
    }),
  );
}

async function _finishV3Relayout(triggerCid, localResult, executionLabel) {
  return window.__DG_getPreviewBridgeRelayoutContract().dispatchPreviewRelayoutSuccessHost({
    triggerCid,
    result: localResult,
    executionLabel,
    runtimeState: _v3RelayoutRuntime,
    getRelayoutStatus: () => getV3RelayoutStatus(),
    failRelayout: (reason, nextTriggerCid) => _failV3Relayout(reason, nextTriggerCid),
    overrides,
    buildTreeUi: buildTreeUI,
    applyWaypointOverrides,
    bindInteraction,
    applyAllOverrides,
    reapplySelection,
    refreshGridInfo: refreshV3GridInfoFromLayout,
    renderGridOverlay,
    renderSelectionInspector,
    updateOverrideSummary,
    refreshTreeColors,
    runConstraints,
    setStatus: typeof setStatus === "function" ? setStatus : null,
  });
}

/** Monotonic counter + promise hook for tests / navigation (not localReady). */
const _diagramLoadSignalState = window.__DG_getPreviewShellBootstrapContract().createPreviewDiagramLoadSignalState();

function _signalDiagramLoaded() {
  return window.__DG_getPreviewShellBootstrapContract().signalPreviewDiagramLoaded(
    _diagramLoadSignalState,
    window,
    SLUG,
  );
}

function whenDiagramLoaded() {
  return window.__DG_getPreviewShellBootstrapContract().whenPreviewDiagramLoaded(
    _diagramLoadSignalState,
    () => Boolean(document.querySelector("#stage svg")),
  );
}

window.whenDiagramLoaded = whenDiagramLoaded;

function _syncBrowseNavToLocation() {
  window.__DG_getPreviewShellBootstrapContract().syncPreviewBrowseLinksToPath(
    Array.from(document.querySelectorAll(".dg-browse-link")),
    window.location.pathname,
  );
}

function _attemptDiagramNavigation(nextUrl, syncUi) {
  return window.__DG_getPreviewShellBootstrapContract().attemptPreviewDiagramNavigation({
    nextUrl,
    currentPath: window.location.pathname,
    origin: window.location.origin,
    isDirty: PreviewSaveClient.isDirty(),
    confirmNavigation: (message) => window.confirm(message),
    dirtyConfirmMessage: DIRTY_DIAGRAM_NAV_CONFIRM,
    syncUi,
    setAllowInternalDirtyNavigation: (allowed) => {
      _allowInternalDirtyNavigation = allowed;
    },
    assignLocation: (nextPath) => window.location.assign(nextPath),
    schedulePostNavigationReset: (callback) => {
      window.setTimeout(callback, 0);
    },
  });
}

async function loadTree(canonicalState = null) {
  return window.__DG_getPreviewShellBootstrapContract().loadPreviewComponentTree({
    canonicalState,
    readPreviewDocument: () => _readPreviewDocumentJson(),
    fetchTree: () => fetch("/api/tree/" + SLUG + "?t=" + Date.now(), { cache: "no-store" }),
    model,
    readFrameTreeJson: () => _readFrameTreeJson(),
    syncArrowsInModel: typeof syncArrowsInModel === "function" ? syncArrowsInModel : null,
    arrowComponentId: typeof arrowComponentId === "function" ? arrowComponentId : null,
  });
}

async function loadGridInfo(canonicalState = null) {
  const loaded = await window.__DG_getPreviewShellBootstrapContract().loadPreviewGridInfo({
    canonicalState,
    fetchGridInfo: () => fetch("/api/grid/" + SLUG + "?t=" + Date.now(), { cache: "no-store" }),
    cloneValue: (value) => EditorState.cloneValue(value),
    readFallbackMetrics: () => {
      const rootNode = model.roots[0] || null;
      const gap = rootNode ? (rootNode.data.layout_gap ?? 24) : 24;
      const pad = rootNode ? (rootNode.data.padding_top ?? 24) : 24;
      const svg = document.querySelector("#stage svg");
      return {
        gap,
        pad,
        canvasWidth: svg ? (svg.viewBox.baseVal.width || parseFloat(svg.getAttribute("width") || 840)) : 840,
        canvasHeight: svg ? (svg.viewBox.baseVal.height || parseFloat(svg.getAttribute("height") || 840)) : 840,
        baselineStep: BASELINE_STEP,
      };
    },
    resolvePreviewGridInfo: (options) => window.__DG_getPreviewShellSceneContract().resolvePreviewGridInfo(options),
  });
  gridInfo = loaded.gridInfo;
  baseGridInfo = loaded.baseGridInfo;
}

function cycleGuideMode() {
  window.__DG_getPreviewShellSceneContract().cyclePreviewGuideModeHost({
    guideMode,
    guideModes: GUIDE_MODES,
    document,
    setGuideMode: (value) => {
      guideMode = value;
    },
    renderGridOverlay,
  });
}

function renderGridOverlay() {
  window.__DG_getPreviewShellSceneContract().renderPreviewGridOverlayHost({
    document,
    guideMode,
    gridInfo,
    baselineStep: BASELINE_STEP,
    createScene: (options) => window.__DG_getPreviewShellSceneContract().createPreviewGridOverlayScene(options),
  });
}

function populateGridControls() {
  window.__DG_getPreviewShellSceneContract().populatePreviewGridControlsHost({
    document,
    gridInfo,
    gridOverrides: model.gridOverrides || {},
  });
}

let relayoutTimer = null;

function onGridControlChange() {
  window.__DG_getPreviewShellSceneContract().dispatchPreviewGridControlChangeHost({
    document,
    gridInfo,
    baselineStep: BASELINE_STEP,
    rootId: (model.roots[0] || {}).id || "root",
    hasSplitMargins: Boolean(_gridEl("grid-margin-top")),
    fallbackMargin: GRID_DEFAULTS.margin_top,
    getPendingAction: () => EditorState.getPendingGridAction(),
    beginPendingAction: () => EditorState.beginUndoableAction("Adjust grid"),
    setPendingAction: (action) => {
      EditorState.setPendingGridAction(action);
    },
    setGridOverrides: (value) => {
      model.gridOverrides = value;
    },
    pruneLinkedRootOverrides: () => {
      _pruneLinkedRootGridOverrides();
    },
    setDirty,
    relayoutTimer,
    clearRelayoutTimer: (timerId) => {
      clearTimeout(timerId);
    },
    scheduleRelayout: (callback, delayMs) => setTimeout(callback, delayMs),
    setRelayoutTimer: (timerId) => {
      relayoutTimer = timerId;
    },
    requestRelayout: (rootId) => requestV3Relayout(rootId),
    commitPendingAction: (action) => {
      EditorState.commitUndoableAction(action);
    },
    setOverlayGridInfo: (value) => {
      gridInfo = value;
    },
    setRowsControlValue: (value) => {
      const rowsInput = document.getElementById("grid-rows");
      if (rowsInput) rowsInput.value = value;
    },
    renderGridOverlay,
  });
}

// ---- Column/row span ↔ pixel conversion ----

function refreshV3GridInfoFromLayout() {
  window.__DG_getPreviewShellSceneContract().refreshPreviewGridInfoFromLayoutHost({
    document,
    baselineStep: BASELINE_STEP,
    gridOverrides: model.gridOverrides || {},
    fallbackGridInfo: gridInfo || {},
    baseGridInfo: baseGridInfo || {},
    resolveGridInfo: (options) => window.__DG_getPreviewShellSceneContract().resolvePreviewGridInfoFromRuntimeState(options),
    setGridInfo: (value) => {
      gridInfo = value;
    },
    setDiagramGrid: (value) => model.setDiagramGrid(value),
    populateGridControls,
  });
}

window.__DG_getPreviewShellSceneContract().bindPreviewGridControls({
  getElementById: (id) => _gridEl(id),
  onInput: onGridControlChange,
  onChange: onGridControlChange,
  getActiveElement: () => document.activeElement,
  setTimeoutFn: (callback, delayMs) => setTimeout(callback, delayMs),
});

function resetOverrideState() {
  replaceOverrides({});
  model.gridOverrides = {};
  const tree = _readFrameTreeJson();
  model.elkLayoutOverrides = (tree && tree.elkLayout) ? { ...tree.elkLayout } : {};
  model.removedIds = new Set();
  updateOverrideSummary();
  // Initialize undo stack and saved state
  EditorState.clearUndoHistory();
  PreviewSaveClient.markSaved(EditorState.serializeDirtyState());
}

function applyWaypointOverrides() {
  window.__DG_getPreviewShellSceneContract().applyPreviewWaypointOverridesHost({
    overrides,
    getArrowNode: (cid) => getArrowNode(cid),
    rebuildArrowSvg: (cid) => rebuildArrowSVG(cid),
  });
}

// ---- Override application ----

function getOwnDelta(cid) {
  return model.getOwnDelta(cid);
}

/** Prefer arrow hit targets over frame bounding-box picking. */
function findArrowAtPoint(clientX, clientY) {
  return window.__DG_getPreviewShellInteractionContract().findPreviewArrowAtPoint({
    document,
    clientX,
    clientY,
    getNode: (id) => model.get(id),
  });
}

function findComponentAtDepth(x, y, targetDepth) {
  return window.__DG_getPreviewShellInteractionContract().findPreviewComponentAtDepth({
    document,
    x,
    y,
    targetDepth,
    roots: model._roots.map(n => n.data),
    getEffectiveDelta,
    getOwnDelta,
  });
}

/**
 * Ctrl+click: find the deepest (innermost) component containing the point.
 * Walks children-first so the deepest match wins.
 */
function findDeepestComponent(x, y) {
  return window.__DG_getPreviewShellInteractionContract().findDeepestPreviewComponent({
    document,
    x,
    y,
    roots: model._roots.map(n => n.data),
    getEffectiveDelta,
    getOwnDelta,
  });
}

function getAncestors(cid) {
  return model.getAncestors(cid);
}

function getParentNode(cid) {
  const parent = model.getParent(cid);
  return parent ? parent.data : null;
}

function getComponentNode(cid) {
  const node = model.get(cid);
  return node ? node.data : null;
}

function _hasLayoutChildren(cid) {
  const node = model.get(cid);
  return !!(node && node.layout && node.children.length > 0);
}

function getDescendantIds(cid) {
  return model.getDescendants(cid);
}

function getEffectiveDelta(cid) {
  return model.getEffectiveDelta(cid);
}

function snapToGrid(value) {
  return Math.round(value / 8) * 8;
}

function getInspectorElement() {
  return document.getElementById("inspector");
}

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

function renderEmptyInspector() {
  _getInspectorDisplayRuntime().renderEmptyInspector();
}

function getPrimarySelectedId(preferredCid) {
  return window.__DG_getPreviewShellInteractionContract().resolvePrimarySelectedId(selectedIds, preferredCid);
}

function renderSelectionInspector(preferredCid) {
  _getInspectorDisplayRuntime().renderSelectionInspector(preferredCid);
}

function getSelectionActionItems() {
  return window.__DG_getPreviewShellInteractionContract().collectPreviewSelectionActionInfo({
    selectedIds,
    getNode: (id) => model.get(id),
    getOwnDelta,
    getEffectiveDelta,
    inset: INSET,
  });
}

function setMultiActionGap(value) {
  const parsed = parseInt(value, 10);
  multiActionGap = window.__DG_getPreviewShellInteractionContract().normalizeSelectionGap(
    Number.isFinite(parsed) ? parsed : 0,
    BASELINE_STEP,
  );
  const input = document.getElementById("multi-action-gap");
  if (input) input.value = multiActionGap;
}

function applySelectionTargets(items, targets) {
  _getInspectorSelectionRuntime().applySelectionTargets(items, targets);
}

function distributeSelection(axis) {
  _getInspectorSelectionRuntime().distributeSelection(axis);
}

function alignSelection(mode) {
  _getInspectorSelectionRuntime().alignSelection(mode);
}

function renderMultiSelectionInspector() {
  _getInspectorDisplayRuntime().renderMultiSelectionInspector();
}

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
function setMultiFrameAlign(align) {
  _getInspectorSelectionRuntime().setMultiFrameAlign(align);
}

/**
 * Apply style override to ALL selected box/panel/terminal items.
 */
function applyMultiStyleOverride(styleName) {
  _getInspectorSelectionRuntime().applyMultiStyleOverride(styleName);
}

/**
 * Apply a frame property to ALL selected items, then trigger a single relayout.
 */
function setMultiFrameProp(prop, value) {
  _getInspectorSelectionRuntime().setMultiFrameProp(prop, value);
}

/**
 * Set an explicit width or height for all selected items, converting from
 * the current inspector unit (px, cols, rows) to pixels.
 */
function setMultiFrameSize(dimension, value) {
  _getInspectorSelectionRuntime().setMultiFrameSize(dimension, value);
}

const _v3RelayoutRuntime = window.__DG_getPreviewBridgeRelayoutContract().createPreviewRelayoutRuntimeState();

function _failV3Relayout(reason, triggerCid) {
  return window.__DG_getPreviewBridgeRelayoutContract().dispatchPreviewRelayoutFailureHost({
    runtimeState: _v3RelayoutRuntime,
    reason,
    triggerCid,
    setStatus: typeof setStatus === "function" ? setStatus : null,
    renderSelectionInspector,
    updateOverrideSummary,
    refreshTreeColors,
    runConstraints,
  });
}

function getV3RelayoutStatus() {
  return window.__DG_getPreviewBridgeRelayoutContract().resolvePreviewV3RelayoutStatus({
    runtimeState: _v3RelayoutRuntime,
    getLocalRelayoutStatus: () => _getLocalBridgeRelayoutStatus(),
  });
}

function applyAllOverrides() {
  const relayoutStatus = getV3RelayoutStatus();
  window.__DG_getPreviewBridgeRenderContract().applyPreviewSvgOverridesHost({
    document,
    selectedIds,
    componentTree: model._roots.map((node) => node.data),
    rootNodes: model._roots
      .filter((node) => node.type !== "arrow")
      .map((node) => ({ id: node.id, gridRow: node.gridRow })),
    overrides,
    relayoutStatus,
    boxStyles: BOX_STYLES,
    inset: window.__DG_CONFIG.inset || 8,
    iconSize: window.__DG_CONFIG.icon_size || 48,
    gridStep: BASELINE_STEP,
    hasDiagramGrid: Boolean(model.diagramGrid),
    getNode: (cid) => model.get(cid),
    getOwnDelta: (cid) => getOwnDelta(cid),
    getEffectiveDelta: (cid) => getEffectiveDelta(cid),
    isFrameManagedTarget: (target, nextRelayoutStatus) => (
      window.__DG_getPreviewBridgeRelayoutContract().isPreviewFrameManagedTarget({
        target,
        relayoutStatus: nextRelayoutStatus || relayoutStatus,
        getNode: (cid) => model.get(cid),
      })
    ),
    showResizeHandles,
  });
}

/**
 * Expand the SVG artboard (viewBox + width/height) if any component's
 * effective bounding box extends past the current canvas edges.
 * Called after drag/resize so content never gets clipped.
 */
function autoFitArtboard() {
  const svg = document.querySelector("#stage svg");
  if (!svg || model.roots.length === 0) return;
  const previewBridgeRender = window.__DG_getPreviewBridgeRenderContract();
  previewBridgeRender.autoFitPreviewArtboard({
    svg,
    roots: model.roots,
    readBounds: (componentId) => previewBridgeRender.readPreviewRenderedComponentBounds({
      svg,
      componentId,
    }),
    padding: 24,
  });
}

// ---- Frame delete ----

async function _rerenderStageFromModel() {
  return window.__DG_getPreviewShellSceneContract().rerenderPreviewStageFromModelHost({
    document,
    overrides,
    model,
    renderFreshSvg: window.__DG_getPreviewBridgeRenderContract().renderFreshPreviewSvg,
    refreshScene: {
      applyWaypointOverrides,
      buildTreeUi: buildTreeUI,
      bindInteraction,
      applyAllOverrides,
      renderGridOverlay,
      reapplySelection,
      refreshGridInfo: refreshV3GridInfoFromLayout,
      renderSelectionInspector,
      updateOverrideSummary,
      refreshTreeColors,
      runConstraints,
    },
  });
}

async function deleteSelectedFrames() {
  const result = await window.__DG_getPreviewShellInteractionContract().deletePreviewSelectedFramesHost({
    selectedIds,
    isTextEditing: mgr.isMode(InteractionMode.TEXT_EDITING),
    getFrameTreeJson: () => _readFrameTreeJson(),
    rootNodes: model.roots,
    fallbackRootId: "page",
    getNode: (id) => model.get(id),
    beginUndoableAction: (label) => EditorState.beginUndoableAction(label),
    markRemoved: (id) => model.removedIds.add(id),
    clearOverride: (id) => model.clearOverride(id),
    unselect: (id) => selectedIds.delete(id),
    setDirty,
    rerenderStage: () => _rerenderStageFromModel(),
    deselectAll,
    commitUndoableAction: (action) => EditorState.commitUndoableAction(action),
    alert: (message) => alert(message),
  });
  return result.rerendered;
}

// ---- Interaction ----

function buildTreeUI() {
  window.__DG_getPreviewShellInteractionContract().renderPreviewTreeSelectionHost({
    document,
    container: document.getElementById("tree"),
    nodes: model._roots.map(n => n.data),
    overrides,
    selectedIds,
    selectComponent,
    onDeleteSelection: () => {
      void deleteSelectedFrames();
    },
  });
}

let _interactionSvg = null;

function bindInteraction() {
  _interactionSvg = window.__DG_getPreviewShellInteractionContract().bindPreviewStageSvgInteractionHost({
    document,
    previousSvg: _interactionSvg,
    suppressHover: mgr.suppressHover,
    selectionDepth,
    onMouseDown: onSvgMouseDown,
    onDoubleClick: onSvgDblClick,
    findArrowAtPoint,
    findComponentAtDepth,
    syncHoverState: (svg, hoverCid) => (
      window.__DG_getPreviewShellInteractionContract().syncPreviewSvgHoverState(svg, hoverCid)
    ),
    clearHoverState: (svg) => (
      window.__DG_getPreviewShellInteractionContract().clearPreviewSvgHoverState(svg)
    ),
    rebuildTreeUi: buildTreeUI,
  });
}

// ---- Drag (move) ----

function onSvgDblClick(e) {
  const previewShellInspector = window.__DG_getPreviewShellInspectorContract();
  window.__DG_getPreviewShellInteractionContract().handlePreviewDoubleClickSelectionHost({
    event: e,
    isTextEditing: mgr.isMode(InteractionMode.TEXT_EDITING),
    svg: document.querySelector("#stage svg"),
    selectionDepth,
    selectedIds,
    findEditableTextTarget: (target, clientX, clientY) => (
      previewShellInspector.findPreviewEditableTextTarget(target, clientX, clientY)
    ),
    resolveEditableComponentId: (editableText) => (
      previewShellInspector.resolvePreviewEditableComponentId(
        editableText,
        (id) => Boolean(model.get(id)),
      )
    ),
    getAncestors,
    setSelectionDepth: (nextDepth) => {
      selectionDepth = nextDepth;
    },
    selectComponent,
    startTextEdit,
    findComponentAtDepth,
    getChildIds: (cid) => {
      const node = model.get(cid);
      return node && node.children ? node.children.map((n) => n.data.id) : [];
    },
    applySelectionState: (nextState) => _applySelectionStateSnapshot(nextState),
  });
}

function onSvgMouseDown(e) {
  window.__DG_getPreviewShellInteractionContract().startPreviewPointerInteractionHost({
    event: e,
    svg: document.querySelector("#stage svg"),
    currentSelectionDepth: selectionDepth,
    selectedIds,
    commitTextEditIfActive: () => {
      if (mgr.isMode(InteractionMode.TEXT_EDITING)) {
        commitTextEdit();
      }
    },
    startResize,
    findArrowAtPoint,
    findDeepestComponent,
    findComponentAtDepth,
    getAncestors,
    deselectAll,
    setSelectionDepth: (nextDepth) => {
      selectionDepth = nextDepth;
    },
    selectComponent,
    getOwnDelta,
    collectSnapTargets,
    isAutolayoutChild: _isAutolayoutChild,
    captureOverrideEntries: (ids) => EditorState.captureOverrideEntries(ids),
    startDragInteraction: (state) => mgr.startDrag(state),
    addDocumentListener: (type, handler) => {
      document.addEventListener(type, handler);
    },
    onDragMove,
    onDragUp,
  });
}

/**
 * Check if a component is a child of an autolayout parent (v3 frame with direction).
 */
function _isAutolayoutChild(cid) {
  const parent = getParentNode(cid);
  return window.__DG_getPreviewShellInteractionContract().isAutolayoutParentLayout(parent ? parent.layout : null);
}

/**
 * Get sibling insertion targets for autolayout reorder.
 * Returns array of { cid, midpoint } sorted by position along the layout axis.
 */
/**
 * Show a reorder insertion indicator line between siblings.
 */
function _showReorderIndicator(parentCid, insertIndex, isVertical) {
  const svg = document.querySelector('#stage svg');
  const parentNode = model.get(parentCid);
  if (!svg || !parentNode) return;
  window.__DG_getPreviewShellInteractionContract().renderPreviewReorderIndicator({
    svg,
    parent: parentNode.data,
    siblings: parentNode.children.map((n) => n.data),
    insertIndex,
    isVertical,
  });
}

function _clearReorderIndicator() {
  const svg = document.querySelector('#stage svg');
  if (svg) window.__DG_getPreviewShellInteractionContract().clearPreviewReorderIndicator(svg);
}

/**
 * Apply a reorder: move child `cid` to `insertIndex` within parent's children.
 * Sends a `children_order` override to the server and triggers relayout.
 */
function _applyReorder(parentId, cid, insertIndex) {
  const parentNode = model.get(parentId);
  if (!parentNode) return;
  const currentOrder = parentNode.children.map(n => n.data.id);
  const newOrder = window.__DG_getPreviewShellInteractionContract().applyReorderOrder(currentOrder, cid, insertIndex);
  if (!newOrder) return;

  // Set children_order override on the parent
  setFrameProp(parentId, 'children_order', newOrder);
}

function onDragMove(e) {
  if (!mgr.isMode(InteractionMode.DRAGGING)) return;
  const previewShellInteraction = window.__DG_getPreviewShellInteractionContract();
  previewShellInteraction.dispatchPreviewDragMoveHost({
    state: mgr.state,
    svg: document.querySelector('#stage svg'),
    clientX: e.clientX,
    clientY: e.clientY,
    getParentNodeForAutolayout: (id) => model.getParent(id),
    snapStep: BASELINE_STEP,
    showReorderIndicator: _showReorderIndicator,
    clearReorderIndicator: _clearReorderIndicator,
    resolveSnap: (cid, proposedDx, proposedDy, targets) => {
      const snap = findSnaps(cid, proposedDx, proposedDy, targets);
      return { dx: snap.snapDx, dy: snap.snapDy, lines: snap.lines };
    },
    renderGuideLines: (lines) => renderGuideLines(lines, GUIDE_COLOR, GUIDE_OPACITY),
    clampDragDelta: (cid, proposedDx, proposedDy) => {
      return previewShellInteraction.clampPreviewDragDeltaWithinParent({
        cid,
        proposedDx,
        proposedDy,
        inset: INSET,
        getParentNode,
        getComponentNode,
        getOwnDelta,
        getEffectiveDelta,
      });
    },
    setOverride,
    applyAllOverrides,
    updateInspector,
    shouldUpdateInspector: selectedIds.has(mgr.state.cid) && selectedIds.size === 1,
  });
}

function onDragUp() {
  window.__DG_getPreviewShellInteractionContract().completePreviewDragInteraction({
    document,
    onDragMove,
    onDragUp,
    clearGuideLines,
    clearReorderIndicator: _clearReorderIndicator,
    interactionManager: mgr,
    applyReorder: (parentId, cid, insertIndex) => _applyReorder(parentId, cid, insertIndex),
    cleanOverride,
    captureOverrideEntries: (ids) => EditorState.captureOverrideEntries(ids),
    reapplySelection,
    selectComponent,
    commitOverridePatchAction: (label, beforeEntries, afterEntries) => {
      EditorState.commitOverridePatchAction(label, beforeEntries, afterEntries);
    },
    // Only auto-fit for free-position drags; autolayout drags are
    // repositioned by the engine relayout, so expanding the viewBox
    // here would create stale padding that never shrinks back.
    autoFitArtboard,
  });
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

function getComponentType(cid) {
  return model.getType(cid) || "Box";
}

function _getRenderedComponentBounds(cid, svg) {
  const node = model.get(cid);
  return window.__DG_getPreviewBridgeRenderContract().readPreviewRenderedComponentBounds({
    svg,
    componentId: cid,
    fallbackNodeBounds: node ? node.data : null,
    delta: getEffectiveDelta(cid),
  });
}

function _getMultiResizeSelection(svg, idsOverride) {
  return window.__DG_getPreviewShellInteractionContract().collectPreviewMultiResizeSelection({
    ids: idsOverride || [...selectedIds],
    getNode: (id) => model.get(id),
    getAncestors,
    getRenderedBounds: (id) => _getRenderedComponentBounds(id, svg),
    getOwnDelta,
    getEffectiveDelta,
    hasLayoutChildren: _hasLayoutChildren,
    isAutolayoutChild: _isAutolayoutChild,
    resolvePrimaryId: getPrimarySelectedId,
    minNodeSize: SHARED_MIN_NODE_SIZE,
  });
}

function showResizeHandles(cid) {
  const svg = document.querySelector("#stage svg");
  const multiSelection = svg ? _getMultiResizeSelection(svg) : null;
  window.__DG_getPreviewShellInteractionContract().showPreviewResizeHandlesHost({
    document,
    componentId: cid,
    selectedCount: selectedIds.size,
    multiSelection,
    singleBounds: (svg && selectedIds.size <= 1) ? _getRenderedComponentBounds(cid, svg) : null,
    componentType: selectedIds.size > 1 ? null : getComponentType(cid),
    clearHandlesByClass,
    resolveHandlePlan: (options) => (
      window.__DG_getPreviewShellInteractionContract().resolvePreviewResizeHandlePlan(options)
    ),
    renderResizeHandles: ({ svg, left, top, right, bottom, nodeId, options }) => {
      renderResizeHandles(svg, left, top, right, bottom, nodeId, {
        handleClass: "dg-handle",
        nodeAttr: options.nodeAttr,
        dirAttr: options.dirAttr,
      });
    },
    showArrowWaypointHandles,
    handleSize: SHARED_HANDLE_SIZE,
  });
}

function removeResizeHandles() {
  window.__DG_getPreviewShellInteractionContract().removePreviewHandlesHost({
    clearHandlesByClass,
  });
}

// ---- Arrow waypoint handles ----

function getArrowNode(cid) {
  const node = model.get(cid);
  return (node && node.type === "arrow") ? node.data : null;
}

function showArrowWaypointHandles(cid) {
  _getArrowWaypointRuntime().showArrowWaypointHandles(cid);
}

function startWpDrag(e) {
  _getArrowWaypointRuntime().startWaypointDrag(e);
}

function onWpDragMove(e) {
  _getArrowWaypointRuntime().onWaypointDragMove(e);
}

function onWpDragUp(e) {
  _getArrowWaypointRuntime().onWaypointDragUp(e);
}

function addWaypoint(cid, segIdx, x, y) {
  _getArrowWaypointRuntime().addWaypoint(cid, segIdx, x, y);
}

function removeWaypoint(cid, idx) {
  _getArrowWaypointRuntime().removeWaypoint(cid, idx);
}

function getArrowPoints(cid) {
  return _getArrowWaypointRuntime().getArrowPoints(cid);
}

function updateArrowVisual(cid) {
  _getArrowWaypointRuntime().updateArrowVisual(cid);
}

function rebuildArrowSVG(cid) {
  _getArrowWaypointRuntime().rebuildArrowSvg(cid);
}

// ---- Inline text editing ----

function startTextEdit(cid, e, opts) {
  const svg = document.querySelector("#stage svg");
  if (!svg) return;
  const node = model.get(cid);
  window.__DG_getPreviewShellInspectorContract().startPreviewTextEditHost({
    document,
    svg,
    cid,
    headingText: (node && node.data.heading_text) || "",
    labelText: (node && node.data.label_text) || [],
    targetedTextEl: opts && opts.textEl ? opts.textEl : null,
    iconSize: window.__DG_CONFIG.icon_size,
    columnGap: window.__DG_CONFIG.col_gap,
    startInteraction: (state) => mgr.startTextEdit(state),
    suspendSelectionChrome: () => {
      window.__DG_getPreviewShellInspectorContract().suspendPreviewTextEditSelectionChromeHost({
        svg,
        removeResizeHandles,
      });
    },
    scheduleBlurCommit: () => {
      window.__DG_getPreviewShellInspectorContract().schedulePreviewTextEditCommitHost({
        setTimeoutFn: (callback, delayMs) => setTimeout(callback, delayMs),
        isTextEditing: () => mgr.isMode(InteractionMode.TEXT_EDITING),
        getEditorTextarea: () => mgr.state?.editor?.ta || null,
        getActiveElement: () => document.activeElement,
        commitTextEdit,
      });
    },
    commitTextEdit,
    cancelTextEdit,
    stopPropagation: () => e.stopPropagation(),
  });
}

function commitTextEdit() {
  if (!mgr.isMode(InteractionMode.TEXT_EDITING)) return;
  window.__DG_getPreviewShellInspectorContract().completePreviewTextEdit({
    state: mgr.state || null,
    getExistingTextOverride: (cid) => (
      model.overrides[cid] && model.overrides[cid].text && typeof model.overrides[cid].text === "object"
        ? model.overrides[cid].text
        : {}
    ),
    setTextOverride: (cid, nextTextOverride) => {
      setOverride(cid, { text: nextTextOverride });
    },
    captureOverrideEntries: (ids) => EditorState.captureOverrideEntries(ids),
    commitOverridePatchAction: (label, beforeEntries, afterEntries) => {
      EditorState.commitOverridePatchAction(label, beforeEntries, afterEntries);
    },
    endInteraction: () => mgr.endInteraction(),
    reapplySelection,
    scheduleRelayout: (cid) => {
      clearTimeout(_v3RelayoutTimer);
      _v3RelayoutTimer = setTimeout(() => requestV3Relayout(cid), 100);
    },
  });
}

function cancelTextEdit() {
  if (!mgr.isMode(InteractionMode.TEXT_EDITING)) return;
  window.__DG_getPreviewShellInspectorContract().cancelPreviewTextEdit({
    state: mgr.state || null,
    endInteraction: () => mgr.endInteraction(),
    reapplySelection,
  });
}

function startResize(e) {
  window.__DG_getPreviewShellInteractionContract().startPreviewResizeHost({
    event: e,
    svg: document.querySelector("#stage svg"),
    selectedIds,
    hasDiagramGrid: Boolean(model.diagramGrid),
    getNode: (id) => model.get(id),
    getSiblings: (id) => model.getSiblings(id),
    getAncestors,
    getOwnDelta,
    getEffectiveDelta,
    hasLayoutChildren: _hasLayoutChildren,
    isAutolayoutChild: _isAutolayoutChild,
    resolvePrimaryId: getPrimarySelectedId,
    minNodeSize: SHARED_MIN_NODE_SIZE,
    captureOverrideEntries: (ids) => EditorState.captureOverrideEntries(ids),
    startInteraction: (state) => mgr.startResize(state),
    addDocumentListener: (type, handler) => {
      document.addEventListener(type, handler);
    },
    onResizeMove,
    onResizeUp,
  });
}

// ---------------------------------------------------------------------------
// Live v3 resize relayout — runs the TS engine each animation frame so the
// diagram responds smoothly while the user drags a resize handle.
// ---------------------------------------------------------------------------
const _liveResizeRelayoutState = window.__DG_getPreviewBridgeRelayoutContract().createPreviewLiveResizeRelayoutState();

function _scheduleV3ResizeRelayout(cid, newW, newH, resizedW, resizedH) {
  const previewBridgeHost = _getPreviewBridgeHostContract();
  window.__DG_getPreviewBridgeRelayoutContract().schedulePreviewLiveResizeRelayout({
    state: _liveResizeRelayoutState,
    request: { cid, newW, newH, resizedW, resizedH },
    isEngineLayoutActive: _isPreviewEngineShellLayoutActive(),
    requestAnimationFrameFn: (callback) => requestAnimationFrame(callback),
    overrides,
    getGridOverrides: () => model.gridOverrides || {},
    normalizeGridOverrides: (value) => EditorState.normalizeGridOverrides(value),
    getRelayoutStatus: () => getV3RelayoutStatus(),
    performLocalRelayout: (temporaryOverrides, gridOvr) => (
      previewBridgeHost.performLocalRelayout(
        model,
        temporaryOverrides,
        gridOvr,
        { skipModelUpdate: true },
      )
    ),
  });
}

function _cancelV3ResizeRelayout() {
  window.__DG_getPreviewBridgeRelayoutContract().cancelPreviewLiveResizeRelayout(
    _liveResizeRelayoutState,
    (id) => cancelAnimationFrame(id),
  );
}

function onResizeMove(e) {
  if (!mgr.isMode(InteractionMode.RESIZING)) return;
  const svgEl = document.querySelector("#stage svg");
  window.__DG_getPreviewShellInteractionContract().dispatchPreviewResizeMoveHost({
    state: mgr.state,
    svg: svgEl,
    hasDiagramGrid: Boolean(model.diagramGrid),
    clientX: e.clientX,
    clientY: e.clientY,
    gridTargets: _gridSnapTargets(),
    snapStep: BASELINE_STEP,
    getNode: (id) => model.get(id),
    hasLayoutChildrenForId: _hasLayoutChildren,
    isSelected: selectedIds.has(mgr.state.cid),
    renderGuideLines: (lines) => renderGuideLines(lines, GUIDE_COLOR, GUIDE_OPACITY),
    clearGuideLines,
    applyInteractionOverrideEntries: _applyInteractionOverrideEntries,
    applyAllOverrides,
    renderSelectionInspector,
    updateInspector,
    setOverride,
    relayoutChildren: (parentId, parentDelta, origOverrides) => model.relayoutChildren(
      parentId,
      parentDelta.dx,
      parentDelta.dy,
      parentDelta.dw,
      parentDelta.dh,
      origOverrides,
    ),
    relayoutSiblingsAfterChildResize: (cid, rightEdgeDelta, bottomEdgeDelta) => {
      return model.relayoutSiblingsAfterChildResize(cid, rightEdgeDelta, bottomEdgeDelta);
    },
    scheduleV3ResizeRelayout: _scheduleV3ResizeRelayout,
  });
}

function _persistResizeToV3(resizeIds, propagatedIds, triggerCid) {
  window.__DG_getPreviewBridgeRelayoutContract().persistPreviewResizeToFrameOverrides({
    resizeIds,
    propagatedIds,
    triggerCid,
    getNode: (cid) => model.get(cid),
    getOwnDelta,
    setOverride,
    requestRelayout: (cid) => {
      void requestV3Relayout(cid);
    },
    minSize: 8,
  });
}

function onResizeUp() {
  window.__DG_getPreviewShellInteractionContract().completePreviewResizeInteraction({
    document,
    interactionManager: mgr,
    cancelLiveRelayout: _cancelV3ResizeRelayout,
    onResizeMove,
    onResizeUp,
    clearGuideLines,
    clearPreviewSvgHoverState: (svg) => {
      window.__DG_getPreviewShellInteractionContract().clearPreviewSvgHoverState(svg);
    },
    cleanOverride,
    captureOverrideEntries: (ids) => EditorState.captureOverrideEntries(ids),
    reapplySelection,
    selectComponent,
    commitOverridePatchAction: (label, beforeEntries, afterEntries) => {
      EditorState.commitOverridePatchAction(label, beforeEntries, afterEntries);
    },
    persistResize: (resizedIds, propagatedIds, triggerCid) => {
      _persistResizeToV3(resizedIds, propagatedIds, triggerCid);
    },
    autoFitArtboard,
  });
}

// ---- Override helpers ----

function setOverride(cid, partial) {
  model.setOverride(cid, partial);
  setDirty(true);
}

function setWaypointOverride(cid) {
  // Persist current waypoints from the component tree into overrides
  const node = getArrowNode(cid);
  if (!node) return;
  const wps = node.waypoints ? JSON.parse(JSON.stringify(node.waypoints)) : [];
  model.setWaypointOverride(cid, wps);
  setDirty(true);
}

function cleanOverride(cid) {
  model.cleanOverride(cid);
}

function applyStyleOverride(cid, styleName) {
  applyV3Style(cid, styleName);
}

function _normaliseStyleName(styleName) {
  return window.__DG_getPreviewShellInspectorContract().normalizePreviewStyleName(styleName);
}

let _v3RelayoutTimer = null;
function _scheduleV3Relayout(cid) {
  clearTimeout(_v3RelayoutTimer);
  _v3RelayoutTimer = setTimeout(() => {
    _v3RelayoutTimer = null;
    requestV3Relayout(cid);
  }, 300);
}

// Track which override keys were set by engine coercion (not user action).
// Format: Set of "fid:key" strings, e.g. "root:sizing_h"
const _coercedKeys = new Set();

let _editorRuntimeSet = null;
function _getEditorRuntimeSet() {
  if (_editorRuntimeSet) return _editorRuntimeSet;
  const previewShellBootstrap = window.__DG_getPreviewShellBootstrapContract();
  const previewShellScene = window.__DG_getPreviewShellSceneContract();
  const previewShellInteraction = window.__DG_getPreviewShellInteractionContract();
  const previewBridgeRender = window.__DG_getPreviewBridgeRenderContract();
  _editorRuntimeSet = previewShellBootstrap.createPreviewEditorRuntimeSet({
    document,
    selectedIds,
    getSelectionDepth: () => selectionDepth,
    setSelectionDepth: (depth) => {
      selectionDepth = depth;
    },
    getPrimarySelectedId,
    getAncestorDepth: (cid) => getAncestors(cid).length,
    syncTreeSelectionState: (container, ids) => (
      previewShellScene.syncPreviewTreeSelectionState(container, ids)
    ),
    removeResizeHandles,
    showResizeHandles,
    renderEmptyInspector,
    renderSelectionInspector,
    getInspector: getInspectorElement,
    getSelectionActionInfo: getSelectionActionItems,
    getNode: (cid) => model.get(cid),
    getArrowNode,
    getOverride: (cid) => overrides[cid] || {},
    getOwnDelta,
    getEffectiveDelta,
    getComponentType,
    getParentLayout: (cid) => getParentNode(cid)?.layout || null,
    getRenderedStyle: (cid) => _readRenderedStyleFields(cid),
    getViolations: (cid) => getViolationsForComponent(cid),
    isWidthCoerced: (cid) => _coercedKeys.has(cid + ':sizing_w'),
    isHeightCoerced: (cid) => _coercedKeys.has(cid + ':sizing_h'),
    getGridInfo: () => gridInfo,
    baselineStep: BASELINE_STEP,
    fallbackGap: window.__DG_CONFIG.col_gap || 24,
    snapStep: BASELINE_STEP,
    getMultiActionGap: () => multiActionGap,
    setMultiActionGap: (gap) => {
      multiActionGap = gap;
    },
    getTextAdapter: typeof window.getLayoutTextAdapter === 'function'
      ? () => window.getLayoutTextAdapter()
      : null,
    formatControlErrorMessage: (message) => (
      typeof escapeHtml === "function" ? escapeHtml(message) : message
    ),
    renderSingleStyleOptions: (currentStyle, originalStyleName) => (
      renderBoxStyleOptions(currentStyle, {
        originalLabel: _formatAsDefinedStyleLabel(originalStyleName),
      })
    ),
    renderMultiStyleOptions: (styleInfo) => (
      renderBoxStyleOptions(styleInfo.mixed ? '__nomatch__' : styleInfo.style, {
        originalLabel: _formatAsDefinedStyleLabel(
          styleInfo.originalStyleName,
          styleInfo.originalStyleMixed,
        ),
      })
    ),
    captureOverrideEntries: (ids) => EditorState.captureOverrideEntries(ids),
    commitOverridePatchAction: (label, beforeEntries, afterEntries) => {
      EditorState.commitOverridePatchAction(label, beforeEntries, afterEntries);
    },
    overrides,
    coercedKeys: _coercedKeys,
    snapToGrid,
    setDirty,
    scheduleRelayout: _scheduleV3Relayout,
    cleanOverride: (cid) => model.cleanOverride(cid),
    requestRelayoutNow: (cid) => {
      clearTimeout(_v3RelayoutTimer);
      requestV3Relayout(cid);
    },
    renderMultiSelectionInspector,
    applyAllOverrides,
    reapplySelection,
    updateOverrideSummary,
    refreshTreeColors,
    runConstraints,
    setOverride: (id, partial) => setOverride(id, partial),
    normalizeSelectionGap: (gap, snapStep) => (
      previewShellInteraction.normalizeSelectionGap(gap, snapStep)
    ),
    resolveSelectionDistributeTargets: (options) => (
      previewShellInteraction.resolveSelectionDistributeTargets(options)
    ),
    resolveSelectionAlignTargets: (options) => (
      previewShellInteraction.resolveSelectionAlignTargets(options)
    ),
    createSelectionTargetOverrideEntries: (options) => (
      previewShellInteraction.createSelectionTargetOverrideEntries(options)
    ),
    alert: (message) => alert(message),
    normalizeStyleName: _normaliseStyleName,
    interactionManager: mgr,
    waypointDraggingMode: InteractionMode.WAYPOINT_DRAGGING,
    isSelected: (cid) => selectedIds.has(cid),
    persistWaypointOverride: setWaypointOverride,
    readArrowEndpoints: (options) => previewBridgeRender.readPreviewArrowEndpoints(options),
    updateArrowSvg: (options) => previewBridgeRender.updatePreviewArrowSvg(options),
    rebuildArrowSvg: (options) => previewBridgeRender.rebuildPreviewArrowSvg(options),
    headLen: window.__DG_CONFIG.head_len,
    headHalf: window.__DG_CONFIG.head_half,
    color: "#E95420",
  });
  return _editorRuntimeSet;
}

function _getSelectionRuntime() {
  return _getEditorRuntimeSet().selection;
}

function _getInspectorDisplayRuntime() {
  return _getEditorRuntimeSet().inspectorDisplay;
}

function _getInspectorMutationRuntime() {
  return _getEditorRuntimeSet().inspectorMutation;
}

function _getInspectorSelectionRuntime() {
  return _getEditorRuntimeSet().inspectorSelection;
}

function _getArrowWaypointRuntime() {
  return _getEditorRuntimeSet().arrowWaypoint;
}

/**
 * v3 style override: applies level/fill/border style fields and triggers relayout.
 */
function applyV3Style(cid, styleName) {
  _getInspectorMutationRuntime().applyStyle(cid, styleName);
}

// ---- Selection & Inspector ----

function deselectAll() {
  _getSelectionRuntime().deselectAll();
}

function _applySelectionStateSnapshot(nextState, preferredCid) {
  _getSelectionRuntime().applySelectionStateSnapshot(nextState, preferredCid);
}

function _syncSelectionUi(preferredCid) {
  _getSelectionRuntime().syncSelectionUi(preferredCid);
}

function selectComponent(cid, additive) {
  _getSelectionRuntime().selectComponent(cid, additive);
}

function reapplySelection() {
  _getSelectionRuntime().reapplySelection();
}

function clearSelection() {
  _getSelectionRuntime().clearSelection();
}

function setFrameAlign(cid, align) {
  _getInspectorMutationRuntime().setFrameAlign(cid, align);
}

function setFrameProp(cid, prop, value) {
  _getInspectorMutationRuntime().setFrameProp(cid, prop, value);
}

let _relayoutRuntime = null;
function _getRelayoutRuntime() {
  if (_relayoutRuntime) return _relayoutRuntime;
  const previewBridgeHost = _getPreviewBridgeHostContract();
  const previewBridgeRelayout = window.__DG_getPreviewBridgeRelayoutContract();
  _relayoutRuntime = previewBridgeRelayout.createPreviewRelayoutRuntime(
    previewBridgeRelayout.createPreviewRelayoutRuntimeOptionsFromHost({
      overrides,
      coercedKeys: _coercedKeys,
      model,
      selectedIds,
      previewBridgeHost,
      getGridOverrides: () => model.gridOverrides || {},
      normalizeGridOverrides: (value) => EditorState.normalizeGridOverrides(value),
      getRelayoutStatus,
      isEngineLayoutActive: () => _isPreviewEngineShellLayoutActive(),
      failRelayout: (reason, nextTriggerCid) => _failV3Relayout(reason, nextTriggerCid),
      finishRelayout: (nextTriggerCid, result, executionLabel) => _finishV3Relayout(nextTriggerCid, result, executionLabel),
      logError: (message) => console.error(message),
      clearOverride: (cid) => model.clearOverride(cid),
      setDirty: () => setDirty(true),
      applyAllOverrides,
      updateInspector,
      reloadTreeAfterArrowRestore: () => loadTree(),
      rebuildArrowSvg: (cid) => rebuildArrowSVG(cid),
      captureOverrideEntries: (ids) => EditorState.captureOverrideEntries(ids),
      commitOverridePatchAction: (label, beforeEntries, afterEntries) => {
        EditorState.commitOverridePatchAction(label, beforeEntries, afterEntries);
      },
    }),
  );
  return _relayoutRuntime;
}

async function requestV3Relayout(triggerCid) {
  return _getRelayoutRuntime().requestRelayout(triggerCid);
}

window.getV3RelayoutStatus = getV3RelayoutStatus;

/**
 * Set an explicit width or height value, converting from the current
 * inspector unit (px, cols, rows) to pixels.
 */
function setFrameSize(cid, dimension, value) {
  _getInspectorMutationRuntime().setFrameSize(cid, dimension, value);
}

function setWidthUnit(unit, cid) {
  _getInspectorDisplayRuntime().setWidthUnit(unit, cid);
}

function setHeightUnit(unit, cid) {
  _getInspectorDisplayRuntime().setHeightUnit(unit, cid);
}

function updateInspector(cid) {
  _getInspectorDisplayRuntime().updateInspector(cid);
}

// ---- Override persistence (save orchestration in save-client.js) ----

function clearOverride(cid) {
  _getRelayoutRuntime().clearOverride(cid);
}

function updateOverrideSummary() {
  window.__DG_getPreviewShellSceneContract().updatePreviewOverrideSummaryHost({
    document,
    overrideCount: Object.keys(overrides).length,
    formatSummary: (count) => window.__DG_getPreviewShellSceneContract().formatPreviewOverrideSummary(count),
  });
}

function refreshTreeColors() {
  window.__DG_getPreviewShellSceneContract().refreshPreviewTreeOverrideStateHost({
    document,
    overrides,
    syncTreeOverrideState: (container, nextOverrides) => (
      window.__DG_getPreviewShellSceneContract().syncPreviewTreeOverrideState(container, nextOverrides)
    ),
  });
}

// Keyboard shortcuts: Ctrl+S to save, Ctrl+Z to undo, Ctrl+Shift+Z/Ctrl+Y to redo, arrows to nudge
function onDocumentKeyDown(e) {
  window.__DG_getPreviewShellInteractionContract().dispatchPreviewKeyboardShortcut({
    event: e,
    document,
    selectedIds,
    selectionDepth,
    interactionManager: mgr,
    interactionModes: InteractionMode,
    isAutolayoutChild: _isAutolayoutChild,
    save: () => PreviewSaveClient.trySaveIfDirty(),
    undo: () => { void EditorState.undo(_applyUndoCommand); },
    redo: () => { void EditorState.redo(_applyUndoCommand); },
    deleteSelection: () => deleteSelectedFrames(),
    cancelTextEdit,
    clearGuideLines,
    onDragMove,
    onDragUp,
    onResizeMove,
    onResizeUp,
    cycleGuideMode,
    getParentId: (id) => getParentNode(id)?.id || null,
    getChildIds: (id) => {
      const node = model.get(id);
      return node && node.children ? node.children.map((n) => n.data.id) : [];
    },
    getAncestorDepth: (id) => getAncestors(id).length,
    selectComponent: (id) => selectComponent(id),
    applySelectionState: (nextState, preferredId) => _applySelectionStateSnapshot(nextState, preferredId),
    captureOverrideEntries: (ids) => EditorState.captureOverrideEntries(ids),
    commitOverridePatchAction: (label, beforeEntries, afterEntries) => {
      EditorState.commitOverridePatchAction(label, beforeEntries, afterEntries);
    },
    getOwnDelta,
    applyInteractionOverrideEntries: (entries) => _applyInteractionOverrideEntries(entries),
    applyAllOverrides,
    showResizeHandles,
    renderSelectionInspector,
  });
}

bindInspectorActions();

// Warn before leaving with unsaved changes.
// Internal diagram navigation uses its own confirm path and suppresses this.
// beforeunload wiring lives in PreviewSaveClient.init().

// ---- Constraint validation ----

function runConstraints() {
  window.__DG_getPreviewShellSceneContract().runPreviewConstraintValidationHost({
    document,
    model,
    validateConstraints: (nextModel, svg) => constraints.validate(nextModel, svg),
    summarizeViolations: (violations) => constraints.summarise(violations),
    setLastViolations: (violations) => {
      lastViolations = violations;
    },
    syncSaveButton: (errorCount) => PreviewSaveClient.syncSaveButton(errorCount),
    syncConstraintStatus: (element, summary) => (
      window.__DG_getPreviewShellSceneContract().syncPreviewConstraintStatus(element, summary)
    ),
  });
}

function getViolationsForComponent(cid) {
  return constraints.forComponent(lastViolations, cid);
}

// ---- SSE / bootstrap tail ----

function bootstrapPreviewEditor() {
  window.__DG_getPreviewShellBootstrapContract().bootstrapPreviewEditorRuntime({
    document,
    previewWindow: window,
    slug: SLUG,
    model,
    selectedIds,
    reapplySelection,
    onDocumentKeyDown,
    undo: () => EditorState.undo(_applyUndoCommand),
    redo: () => EditorState.redo(_applyUndoCommand),
    saveOverrides: () => PreviewSaveClient.saveOverrides(),
    canUndo: () => EditorState.canUndo(),
    canRedo: () => EditorState.canRedo(),
    syncBrowseNav: _syncBrowseNavToLocation,
    fetchIndexHtml: async () => {
      const response = await fetch("/", { credentials: "same-origin" });
      if (!response.ok) {
        return null;
      }
      return response.text();
    },
    attemptNavigation: (nextUrl, syncUi) => _attemptDiagramNavigation(nextUrl, syncUi),
    initNavTabs,
    getOverrides: () => overrides,
    getFrameTree: () => (typeof getFrameTreeJson === "function" ? getFrameTreeJson() : null),
    requestV3Relayout: (cid) => requestV3Relayout(cid),
    previewSaveClient: PreviewSaveClient,
    serializeDirtyState: () => window.EditorState.serializeDirtyState(),
    reloadDiagram: (options) => loadSVG(options),
    getV3RelayoutStatus: () => getV3RelayoutStatus(),
    getV3RelayoutRuntime: () => _v3RelayoutRuntime,
    getConstraintSummary: () => constraints.summarise(lastViolations),
    runConstraints,
    clearCoercedKeys: () => _coercedKeys.clear(),
    setStatus,
    sanitizeSvgCloneForExport,
    allowInternalDirtyNavigation: () => _allowInternalDirtyNavigation,
    writeClipboardText: (text) => navigator.clipboard.writeText(text),
    alert: (message) => alert(message),
    confirmClearAll: (message) => confirm(message),
    onClearAllOverrides: () => {
      EditorState.runUndoableAction("Clear all overrides", () => {
        replaceOverrides({});
        _coercedKeys.clear();
        setDirty(true);
      });
      applyAllOverrides();
      renderSelectionInspector();
    },
    getGeneration: () => generation,
    setGeneration: (value) => {
      generation = value;
    },
    scheduleReconnect: (callback, delayMs) => setTimeout(callback, delayMs),
  });
}

bootstrapPreviewEditor();

// ---- Left sidebar tabs (Browse / Layers) ----
// Handled by initNavTabs() in editor-base.js via initPreviewShell().
