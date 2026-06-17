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
      if (typeof setFrameTreeJson === "function") {
        setFrameTreeJson(frameTree);
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

async function loadSVG(options = {}) {
  const stage = document.getElementById("stage");
  await window.__DG_getPreviewShellBootstrapContract().loadPreviewSvg({
    invocation: options,
    deselectAll,
    initLayoutBridge: async () => {
      if (typeof initLayoutBridge !== "function") {
        throw new Error("preview layout bridge is required for the v3 editor");
      }
      await initLayoutBridge(SLUG);
    },
    setFrameTreeJson: typeof setFrameTreeJson === "function" ? setFrameTreeJson : null,
    isElkLayeredDiagram: () => ElkPreviewController.isElkLayeredDiagram(),
    resetOverrideState,
    initElkPanel: () => ElkPreviewController.initPanel(),
    getLocalRelayoutStatus,
    escapeHtml,
    setStageHtml: (html) => {
      stage.innerHTML = html;
    },
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
    renderFreshSvg: () => {
      const gridOverrides = model.gridOverrides && Object.keys(model.gridOverrides).length > 0
        ? model.gridOverrides
        : null;
      return window.__DG_getPreviewBridgeRenderContract().renderFreshPreviewSvg({
        overrides,
        gridOverrides,
        model,
      });
    },
    replaceStageWithRenderedSvg: (renderResult) => {
      stage.replaceChildren(renderResult.svg);
    },
    fitRenderedSvg: typeof fitSvgToRenderedContent === "function"
      ? (renderResult) => {
        fitSvgToRenderedContent(renderResult.svg, {
          minWidth: renderResult.width,
          minHeight: renderResult.height,
        });
      }
      : null,
    fetchFallbackSvg: async () => {
      const suffix = GRID ? `-${ENGINE}-grid.svg` : `-${ENGINE}.svg`;
      return fetch("/svg/" + SLUG + "-onbrand" + suffix + "?t=" + Date.now());
    },
  });
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
    readPreviewDocument: typeof getPreviewDocumentJson === "function" ? () => getPreviewDocumentJson() : null,
    fetchTree: () => fetch("/api/tree/" + SLUG + "?t=" + Date.now(), { cache: "no-store" }),
    model,
    readFrameTreeJson: typeof getFrameTreeJson === "function" ? () => getFrameTreeJson() : null,
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

// Track inspector width/height unit preference: 'px', 'cols', 'rows'
let _inspectorWidthUnit = 'px';
let _inspectorHeightUnit = 'px';

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
  const tree = typeof getFrameTreeJson === "function" ? getFrameTreeJson() : null;
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
  const svg = document.querySelector("#stage svg");
  if (!svg) return null;
  const el = document.elementFromPoint(clientX, clientY);
  if (!el || !svg.contains(el)) return null;
  const host = el.closest("[data-component-id]");
  if (!host || !svg.contains(host)) return null;
  const cid = host.getAttribute("data-component-id");
  const node = model.get(cid);
  return node && node.type === "arrow" ? cid : null;
}

/** Add transparent stroke hit areas to server-rendered arrow groups. */
function ensureArrowHitAreas(svg) {
  if (!svg || !model.arrowIds) return;
  const ns = "http://www.w3.org/2000/svg";
  for (const cid of model.arrowIds()) {
    const groups = svg.querySelectorAll('[data-component-id="' + cid + '"]');
    groups.forEach((g) => {
      const visible = Array.from(g.querySelectorAll("line")).filter(
        (ln) => ln.getAttribute("stroke") !== "transparent",
      );
      const hits = g.querySelectorAll('line[stroke="transparent"]');
      if (hits.length >= visible.length) return;
      visible.forEach((ln) => {
        const hit = document.createElementNS(ns, "line");
        hit.setAttribute("x1", ln.getAttribute("x1"));
        hit.setAttribute("y1", ln.getAttribute("y1"));
        hit.setAttribute("x2", ln.getAttribute("x2"));
        hit.setAttribute("y2", ln.getAttribute("y2"));
        hit.setAttribute("stroke", "transparent");
        hit.setAttribute("stroke-width", "12");
        hit.style.pointerEvents = "stroke";
        g.appendChild(hit);
      });
    });
  }
}

function _getPreviewHitNodeBounds(svg, node) {
  let nx, ny, nw, nh;
  const g = svg.querySelector('[data-component-id="' + node.id + '"]');
  const rect = g ? g.querySelector(":scope > rect:first-of-type") : null;
  if (rect) {
    nx = parseFloat(rect.getAttribute("x"));
    ny = parseFloat(rect.getAttribute("y"));
    nw = parseFloat(rect.getAttribute("width"));
    nh = parseFloat(rect.getAttribute("height"));
  } else {
    const eff = getEffectiveDelta(node.id);
    const own = getOwnDelta(node.id);
    nx = node.x + eff.dx;
    ny = node.y + eff.dy;
    nw = node.width + own.dw;
    nh = node.height + own.dh;
  }
  if (g) {
    const t = g.style.transform || "";
    const m = t.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
    if (m) {
      nx += parseFloat(m[1]);
      ny += parseFloat(m[2]);
    }
  }
  return { nx, ny, nw, nh, hasRenderedRect: !!rect };
}

function findComponentAtDepth(x, y, targetDepth) {
  const svg = document.querySelector("#stage svg");
  if (!svg) return null;
  const roots = model._roots.map(n => n.data);
  return window.__DG_getPreviewShellInteractionContract().findPreviewComponentAtDepth({
    x,
    y,
    targetDepth,
    roots,
    getNodeBounds: (node) => _getPreviewHitNodeBounds(svg, node),
  });
}

/**
 * Ctrl+click: find the deepest (innermost) component containing the point.
 * Walks children-first so the deepest match wins.
 */
function findDeepestComponent(x, y) {
  const svg = document.querySelector("#stage svg");
  if (!svg) return null;
  const roots = model._roots.map(n => n.data);
  return window.__DG_getPreviewShellInteractionContract().findDeepestPreviewComponent({
    x,
    y,
    roots,
    getNodeBounds: (node) => _getPreviewHitNodeBounds(svg, node),
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
  window.__DG_getPreviewShellInspectorContract().renderPreviewEmptyInspectorHost(getInspectorElement());
}

function getPrimarySelectedId(preferredCid) {
  return window.__DG_getPreviewShellInteractionContract().resolvePrimarySelectedId(selectedIds, preferredCid);
}

function renderSelectionInspector(preferredCid) {
  window.__DG_getPreviewShellInspectorContract().renderPreviewSelectionInspectorHost({
    preferredId: preferredCid,
    resolvePrimaryId: getPrimarySelectedId,
    selectedCount: selectedIds.size,
    renderEmptyInspector,
    renderSingleSelectionInspector: updateInspector,
    renderMultiSelectionInspector,
  });
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
  window.__DG_getPreviewShellInspectorContract().dispatchPreviewApplySelectionTargetsHost({
    items,
    targets,
    captureOverrideEntries: (ids) => EditorState.captureOverrideEntries(ids),
    createSelectionTargetOverrideEntries: (options) => (
      window.__DG_getPreviewShellInteractionContract().createSelectionTargetOverrideEntries(options)
    ),
    snapStep: BASELINE_STEP,
    setOverride: (id, partial) => setOverride(id, partial),
    applyAllOverrides,
    reapplySelection,
    renderSelectionInspector: () => renderSelectionInspector(),
    updateOverrideSummary,
    refreshTreeColors,
    runConstraints,
    commitOverridePatchAction: (label, beforeEntries, afterEntries) => {
      EditorState.commitOverridePatchAction(label, beforeEntries, afterEntries);
    },
  });
}

function distributeSelection(axis) {
  const info = getSelectionActionItems();
  window.__DG_getPreviewShellInspectorContract().dispatchPreviewDistributeSelectionHost({
    info,
    axis,
    currentGap: multiActionGap,
    snapStep: BASELINE_STEP,
    normalizeSelectionGap: (gap, snapStep) => (
      window.__DG_getPreviewShellInteractionContract().normalizeSelectionGap(gap, snapStep)
    ),
    setGap: (gap) => {
      multiActionGap = gap;
    },
    resolveSelectionDistributeTargets: (options) => (
      window.__DG_getPreviewShellInteractionContract().resolveSelectionDistributeTargets(options)
    ),
    applySelectionTargets,
    alert: (message) => alert(message),
  });
}

function alignSelection(mode) {
  const info = getSelectionActionItems();
  window.__DG_getPreviewShellInspectorContract().dispatchPreviewAlignSelectionHost({
    info,
    mode,
    snapStep: BASELINE_STEP,
    resolveSelectionAlignTargets: (options) => (
      window.__DG_getPreviewShellInteractionContract().resolveSelectionAlignTargets(options)
    ),
    applySelectionTargets,
    alert: (message) => alert(message),
  });
}

function renderMultiSelectionInspector() {
  const info = getSelectionActionItems();
  const result = window.__DG_getPreviewShellInspectorContract().renderPreviewMultiSelectionInspectorRuntimeHost({
    inspector: getInspectorElement(),
    selectedCount: selectedIds.size,
    info,
    getNode: (id) => model.get(id),
    fallbackGap: window.__DG_CONFIG.col_gap || 24,
    snapStep: BASELINE_STEP,
    items: info.items.map((item) => ({
      id: item.id,
      node: item.node,
      override: overrides[item.id] || {},
      widthCoerced: _coercedKeys.has(item.id + ':sizing_w'),
      heightCoerced: _coercedKeys.has(item.id + ':sizing_h'),
    })),
    widthUnit: _inspectorWidthUnit,
    heightUnit: _inspectorHeightUnit,
    showWidthColsOption: Boolean(gridInfo && gridInfo.col_widths && gridInfo.col_widths.length),
    resolveMultiStyleState: (items) => _getMultiStyleValues(items),
    renderStyleOptions: (styleInfo) => renderBoxStyleOptions(
      styleInfo.mixed ? '__nomatch__' : styleInfo.style,
      {
        originalLabel: _formatAsDefinedStyleLabel(
          styleInfo.originalStyleName,
          styleInfo.originalStyleMixed,
        ),
      },
    ),
  });
  if (result.inferredGap != null) {
    multiActionGap = result.inferredGap;
  }
}

/**
 * Read shared style across selected box/panel/terminal items.
 * Returns null if no styleable items, or {style, mixed, count}.
 */
function _getMultiStyleValues(items) {
  return window.__DG_getPreviewShellInspectorContract().resolveMultiSelectionPreviewStyleState(items.map((item) => {
    const rendered = _readRenderedStyleFields(item.id);
    return {
      componentType: getComponentType(item.id),
      node: item.node,
      overrideStyle: (overrides[item.id] || {}).style,
      renderedFill: rendered ? rendered.fill : null,
      renderedStroke: rendered ? rendered.stroke : null,
    };
  }));
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
  window.__DG_getPreviewShellInspectorContract().dispatchPreviewMultiFrameAlignHost({
    selectedIds,
    align,
    captureOverrideEntries: (ids) => EditorState.captureOverrideEntries(ids),
    applyMultiFramePropMutation: (options) => (
      window.__DG_getPreviewShellInspectorContract().applyMultiFramePropMutation(options)
    ),
    overrides,
    coercedKeys: _coercedKeys,
    getNode: (cid) => model.get(cid),
    setDirty,
    commitOverridePatchAction: (label, beforeEntries, afterEntries) => {
      EditorState.commitOverridePatchAction(label, beforeEntries, afterEntries);
    },
    scheduleRelayout: (cid) => {
      clearTimeout(_v3RelayoutTimer);
      _v3RelayoutTimer = setTimeout(() => requestV3Relayout(cid), 300);
    },
    renderMultiSelectionInspector,
  });
}

/**
 * Apply style override to ALL selected box/panel/terminal items.
 */
function applyMultiStyleOverride(styleName) {
  const previewShellInspector = window.__DG_getPreviewShellInspectorContract();
  previewShellInspector.dispatchPreviewMultiStyleOverrideHost({
    selectedIds,
    styleName,
    captureOverrideEntries: (ids) => EditorState.captureOverrideEntries(ids),
    normalizeStyleName: _normaliseStyleName,
    getComponentType,
    isStyleableComponentType: (componentType) => (
      previewShellInspector.isPreviewStyleableComponentType(componentType)
    ),
    applyVisibleStyleOverride: (options) => previewShellInspector.applyVisiblePreviewStyleOverride(options),
    cleanOverride: (cid) => model.cleanOverride(cid),
    getNode: (cid) => model.get(cid),
    overrides,
    setDirty,
    commitOverridePatchAction: (label, beforeEntries, afterEntries) => {
      EditorState.commitOverridePatchAction(label, beforeEntries, afterEntries);
    },
    requestRelayout: (cid) => {
      clearTimeout(_v3RelayoutTimer);
      requestV3Relayout(cid);
    },
    renderMultiSelectionInspector,
  });
}

/**
 * Apply a frame property to ALL selected items, then trigger a single relayout.
 */
function setMultiFrameProp(prop, value) {
  window.__DG_getPreviewShellInspectorContract().dispatchPreviewMultiFramePropHost({
    selectedIds,
    prop,
    value,
    captureOverrideEntries: (ids) => EditorState.captureOverrideEntries(ids),
    applyMultiFramePropMutation: (options) => (
      window.__DG_getPreviewShellInspectorContract().applyMultiFramePropMutation(options)
    ),
    overrides,
    coercedKeys: _coercedKeys,
    getNode: (cid) => model.get(cid),
    setDirty,
    commitOverridePatchAction: (label, beforeEntries, afterEntries) => {
      EditorState.commitOverridePatchAction(label, beforeEntries, afterEntries);
    },
    scheduleRelayout: (cid) => {
      clearTimeout(_v3RelayoutTimer);
      _v3RelayoutTimer = setTimeout(() => requestV3Relayout(cid), 300);
    },
    renderSelectionInspector: () => renderSelectionInspector(),
    renderMultiSelectionInspector,
  });
}

/**
 * Set an explicit width or height for all selected items, converting from
 * the current inspector unit (px, cols, rows) to pixels.
 */
function setMultiFrameSize(dimension, value) {
  window.__DG_getPreviewShellInspectorContract().dispatchPreviewMultiFrameSizeHost({
    selectedIds,
    dimension,
    value,
    gridInfo,
    widthUnit: _inspectorWidthUnit,
    heightUnit: _inspectorHeightUnit,
    baselineStep: BASELINE_STEP,
    resolveFrameSizePx: (options) => (
      window.__DG_getPreviewShellInspectorContract().resolvePreviewFrameSizePx(options)
    ),
    captureOverrideEntries: (ids) => EditorState.captureOverrideEntries(ids),
    applyMultiFrameSizeMutation: (options) => (
      window.__DG_getPreviewShellInspectorContract().applyMultiFrameSizeMutation(options)
    ),
    overrides,
    coercedKeys: _coercedKeys,
    getNode: (cid) => model.get(cid),
    setDirty,
    commitOverridePatchAction: (label, beforeEntries, afterEntries) => {
      EditorState.commitOverridePatchAction(label, beforeEntries, afterEntries);
    },
    scheduleRelayout: (cid) => {
      clearTimeout(_v3RelayoutTimer);
      _v3RelayoutTimer = setTimeout(() => requestV3Relayout(cid), 300);
    },
    renderMultiSelectionInspector,
  });
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
    getLocalRelayoutStatus: typeof getLocalRelayoutStatus === "function"
      ? getLocalRelayoutStatus
      : null,
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
    getFrameTreeJson: typeof getFrameTreeJson === "function" ? getFrameTreeJson : null,
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
    ensureArrowHitAreas: (currentSvg) => ensureArrowHitAreas(currentSvg),
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
    removeDocumentListener: (type, handler) => {
      document.removeEventListener(type, handler);
    },
    onDragMove,
    onDragUp,
    clearGuideLines,
    clearReorderIndicator: _clearReorderIndicator,
    state: mgr.state || null,
    applyReorder: (parentId, cid, insertIndex) => _applyReorder(parentId, cid, insertIndex),
    cleanOverride,
    captureOverrideEntries: (ids) => EditorState.captureOverrideEntries(ids),
    reapplySelection,
    selectComponent,
    commitOverridePatchAction: (label, beforeEntries, afterEntries) => {
      EditorState.commitOverridePatchAction(label, beforeEntries, afterEntries);
    },
    endInteraction: () => mgr.endInteraction(),
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

function _refreshSelectedArrowInspector(cid) {
  if (selectedIds.has(cid)) updateInspector(cid);
}

function showArrowWaypointHandles(cid) {
  const node = getArrowNode(cid);
  if (!node) return;
  window.__DG_getPreviewShellInteractionContract().renderPreviewWaypointHandlesHost({
    svg: document.querySelector("#stage svg"),
    componentId: cid,
    waypoints: node.waypoints || [],
    delta: getEffectiveDelta(cid),
    isSelected: selectedIds.has(cid),
    onAddWaypoint: (segmentIndex, x, y) => {
      addWaypoint(cid, segmentIndex, x, y);
    },
    onHandleMouseDown: startWpDrag,
    onHandleDoubleClick: (index) => {
      removeWaypoint(cid, index);
    },
  });
}

function startWpDrag(e) {
  window.__DG_getPreviewShellInteractionContract().startPreviewWaypointDragHost({
    event: e,
    getNode: (cid) => getArrowNode(cid),
    startInteraction: (state) => mgr.startWaypointDrag(state),
    addDocumentListener: (type, handler) => {
      document.addEventListener(type, handler);
    },
    onWaypointDragMove: onWpDragMove,
    onWaypointDragUp: onWpDragUp,
  });
}

function onWpDragMove(e) {
  if (!mgr.isMode(InteractionMode.WAYPOINT_DRAGGING)) return;
  const result = window.__DG_getPreviewShellInteractionContract().dispatchPreviewWaypointDragMoveHost({
    state: mgr.state,
    clientX: e.clientX,
    clientY: e.clientY,
    getNode: (cid) => getArrowNode(cid),
    readEndpoints: (cid) => getArrowPoints(cid),
    updateArrowVisual,
  });
  if (result.kind !== "moved") return;
  e.preventDefault();
}

function onWpDragUp(e) {
  window.__DG_getPreviewShellInteractionContract().completePreviewWaypointDragInteraction({
    removeDocumentListener: (type, handler) => {
      document.removeEventListener(type, handler);
    },
    onWaypointDragMove: onWpDragMove,
    onWaypointDragUp: onWpDragUp,
    state: mgr.state || null,
    getNode: (cid) => getArrowNode(cid),
    readEndpoints: (cid) => getArrowPoints(cid),
    rebuildArrowSvg: rebuildArrowSVG,
    showArrowWaypointHandles,
    persistWaypointOverride: setWaypointOverride,
    refreshInspector: (cid) => _refreshSelectedArrowInspector(cid),
    captureOverrideEntries: (ids) => EditorState.captureOverrideEntries(ids),
    commitOverridePatchAction: (label, beforeEntries, afterEntries) => {
      EditorState.commitOverridePatchAction(label, beforeEntries, afterEntries);
    },
    endInteraction: () => mgr.endInteraction(),
  });
}

function addWaypoint(cid, segIdx, x, y) {
  window.__DG_getPreviewShellInteractionContract().commitPreviewWaypointInsert({
    cid,
    segmentIndex: segIdx,
    x,
    y,
    getNode: (id) => getArrowNode(id),
    rebuildArrowSvg: rebuildArrowSVG,
    showArrowWaypointHandles,
    persistWaypointOverride: setWaypointOverride,
    refreshInspector: (id) => _refreshSelectedArrowInspector(id),
    captureOverrideEntries: (ids) => EditorState.captureOverrideEntries(ids),
    commitOverridePatchAction: (label, beforeEntries, afterEntries) => {
      EditorState.commitOverridePatchAction(label, beforeEntries, afterEntries);
    },
  });
}

function removeWaypoint(cid, idx) {
  window.__DG_getPreviewShellInteractionContract().commitPreviewWaypointRemoval({
    cid,
    index: idx,
    getNode: (id) => getArrowNode(id),
    rebuildArrowSvg: rebuildArrowSVG,
    showArrowWaypointHandles,
    persistWaypointOverride: setWaypointOverride,
    refreshInspector: (id) => _refreshSelectedArrowInspector(id),
    captureOverrideEntries: (ids) => EditorState.captureOverrideEntries(ids),
    commitOverridePatchAction: (label, beforeEntries, afterEntries) => {
      EditorState.commitOverridePatchAction(label, beforeEntries, afterEntries);
    },
  });
}

function getArrowPoints(cid) {
  return window.__DG_getPreviewShellInteractionContract().readPreviewArrowPointsHost({
    document,
    componentId: cid,
    hasArrowNode: Boolean(getArrowNode(cid)),
    readArrowEndpoints: (options) => (
      window.__DG_getPreviewBridgeRenderContract().readPreviewArrowEndpoints(options)
    ),
  });
}

function updateArrowVisual(cid) {
  window.__DG_getPreviewShellInteractionContract().updatePreviewArrowVisualHost({
    document,
    componentId: cid,
    node: getArrowNode(cid),
    delta: getEffectiveDelta(cid),
    headLen: window.__DG_CONFIG.head_len,
    headHalf: window.__DG_CONFIG.head_half,
    updateArrowSvg: (options) => (
      window.__DG_getPreviewBridgeRenderContract().updatePreviewArrowSvg(options)
    ),
  });
}

function rebuildArrowSVG(cid) {
  window.__DG_getPreviewShellInteractionContract().rebuildPreviewArrowSvgHost({
    document,
    componentId: cid,
    node: getArrowNode(cid),
    headLen: window.__DG_CONFIG.head_len,
    headHalf: window.__DG_CONFIG.head_half,
    color: "#E95420",
    rebuildArrowSvg: (options) => (
      window.__DG_getPreviewBridgeRenderContract().rebuildPreviewArrowSvg(options)
    ),
  });
}

// ---- Inline text editing ----

function _suspendSelectionChromeForTextEdit(svg) {
  if (!svg) return;
  svg.querySelectorAll(".dg-selected").forEach(el => el.classList.remove("dg-selected"));
  removeResizeHandles();
}

function _scheduleTextEditCommit() {
  setTimeout(() => {
    if (!mgr.isMode(InteractionMode.TEXT_EDITING)) return;
    const editor = mgr.state.editor;
    if (editor && editor.ta === document.activeElement) return;
    commitTextEdit();
  }, 100);
}

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
    suspendSelectionChrome: () => _suspendSelectionChromeForTextEdit(svg),
    scheduleBlurCommit: _scheduleTextEditCommit,
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
  window.__DG_getPreviewBridgeRelayoutContract().schedulePreviewLiveResizeRelayout({
    state: _liveResizeRelayoutState,
    request: { cid, newW, newH, resizedW, resizedH },
    isElkLayeredDiagram: ElkPreviewController.isElkLayeredDiagram(),
    requestAnimationFrameFn: (callback) => requestAnimationFrame(callback),
    overrides,
    getGridOverrides: () => model.gridOverrides || {},
    normalizeGridOverrides: (value) => EditorState.normalizeGridOverrides(value),
    getRelayoutStatus,
    performLocalRelayout: (temporaryOverrides, gridOvr) => performLocalRelayout(
      model,
      temporaryOverrides,
      gridOvr,
      { skipModelUpdate: true },
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
  const svg = document.querySelector("#stage svg");
  window.__DG_getPreviewShellInteractionContract().completePreviewResizeInteraction({
    cancelLiveRelayout: _cancelV3ResizeRelayout,
    removeDocumentListener: (type, handler) => {
      document.removeEventListener(type, handler);
    },
    onResizeMove,
    onResizeUp,
    clearGuideLines,
    clearSvgHoverState: () => {
      if (svg) window.__DG_getPreviewShellInteractionContract().clearPreviewSvgHoverState(svg);
    },
    state: mgr.state ? {
      hasMoved: mgr.state.hasMoved,
      cid: mgr.state.cid,
      selectionIds: mgr.state.selection ? mgr.state.selection.ids : null,
      origOverrideIds: Object.keys(mgr.state.origOverrides),
      propagatedIds: mgr.state.propagatedIds,
      overrideSnapshotBefore: mgr.state.overrideSnapshotBefore,
    } : null,
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
    showHandles: () => {
      if (svg) svg.querySelectorAll(".dg-handle").forEach(h => h.style.display = "");
    },
    endInteraction: () => mgr.endInteraction(),
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

/**
 * v3 style override: applies level/fill/border style fields and triggers relayout.
 */
function applyV3Style(cid, styleName) {
  const v3StyleIds = [cid];
  const v3StyleBefore = EditorState.captureOverrideEntries(v3StyleIds);
  const changed = window.__DG_getPreviewShellInspectorContract().applyVisiblePreviewStyleOverride({
    overrides,
    cid,
    node: model.get(cid),
    styleName,
  });
  if (!changed) {
    renderSelectionInspector(cid);
    return;
  }
  model.cleanOverride(cid);
  setDirty(true);
  clearTimeout(_v3RelayoutTimer);
  requestV3Relayout(cid);
  renderSelectionInspector(cid);
  EditorState.commitOverridePatchAction("Change style", v3StyleBefore, EditorState.captureOverrideEntries(v3StyleIds));
}

// ---- Selection & Inspector ----

function deselectAll() {
  const nextState = window.__DG_getPreviewShellInteractionContract().clearPreviewSelectionState({
    selectedIds,
    selectionDepth,
  });
  _applySelectionStateSnapshot(nextState);
}

function _applySelectionStateSnapshot(nextState, preferredCid) {
  window.__DG_getPreviewShellInteractionContract().applyPreviewSelectionStateSnapshot({
    selectedIds,
    nextState,
    setSelectionDepth: (depth) => {
      selectionDepth = depth;
    },
    preferredId: preferredCid,
    syncSelectionUi: (nextPreferredId) => _syncSelectionUi(nextPreferredId),
  });
}

function _syncSelectionUi(preferredCid) {
  window.__DG_getPreviewShellInteractionContract().syncPreviewSelectionUi({
    document,
    selectedIds,
    preferredId: preferredCid,
    resolvePrimaryId: (nextPreferredId) => getPrimarySelectedId(nextPreferredId),
    syncTreeSelectionState: (container, ids) => {
      window.__DG_getPreviewShellSceneContract().syncPreviewTreeSelectionState(container, ids);
    },
    removeResizeHandles,
    showResizeHandles,
    renderEmptyInspector,
    renderSelectionInspector,
  });
}

function selectComponent(cid, additive) {
  const nextState = window.__DG_getPreviewShellInteractionContract().resolvePreviewComponentSelectionState({
    selectedIds,
    selectionDepth,
    cid,
    additive,
    getAncestorDepth: (nextCid) => getAncestors(nextCid).length,
  });
  _applySelectionStateSnapshot(nextState, cid);
}

function reapplySelection() {
  _syncSelectionUi();
}

function clearSelection() {
  deselectAll();
}

function setFrameAlign(cid, align) {
  window.__DG_getPreviewShellInspectorContract().dispatchPreviewSingleFrameAlignHost({
    cid,
    captureOverrideEntries: (ids) => EditorState.captureOverrideEntries(ids),
    applySingleFramePropMutation: (options) => (
      window.__DG_getPreviewShellInspectorContract().applySingleFramePropMutation(options)
    ),
    overrides,
    coercedKeys: _coercedKeys,
    getNode: (id) => model.get(id),
    align,
    snapToGrid,
    setDirty,
    commitOverridePatchAction: (label, beforeEntries, afterEntries) => {
      EditorState.commitOverridePatchAction(label, beforeEntries, afterEntries);
    },
    scheduleRelayout: (id) => {
      clearTimeout(_v3RelayoutTimer);
      _v3RelayoutTimer = setTimeout(() => requestV3Relayout(id), 300);
    },
    renderSelectionInspector,
  });
}

let _v3RelayoutTimer = null;
function setFrameProp(cid, prop, value) {
  window.__DG_getPreviewShellInspectorContract().dispatchPreviewSingleFramePropHost({
    cid,
    prop,
    value,
    captureOverrideEntries: (ids) => EditorState.captureOverrideEntries(ids),
    applySingleFramePropMutation: (options) => (
      window.__DG_getPreviewShellInspectorContract().applySingleFramePropMutation(options)
    ),
    overrides,
    coercedKeys: _coercedKeys,
    getNode: (id) => model.get(id),
    snapToGrid,
    setDirty,
    commitOverridePatchAction: (label, beforeEntries, afterEntries) => {
      EditorState.commitOverridePatchAction(label, beforeEntries, afterEntries);
    },
    scheduleRelayout: (id) => {
      clearTimeout(_v3RelayoutTimer);
      _v3RelayoutTimer = setTimeout(() => requestV3Relayout(id), 300);
    },
    renderSelectionInspector,
  });
}

// Track which override keys were set by engine coercion (not user action).
// Format: Set of "fid:key" strings, e.g. "root:sizing_h"
const _coercedKeys = new Set();

async function requestV3Relayout(triggerCid) {
  const relayoutStatus = getV3RelayoutStatus();
  return window.__DG_getPreviewBridgeRelayoutContract().runPreviewRelayout({
    triggerCid,
    overrides,
    coercedKeys: _coercedKeys,
    gridOverrides: model.gridOverrides || {},
    normalizeGridOverrides: (value) => EditorState.normalizeGridOverrides(value),
    relayoutStatus,
    isElkLayeredDiagram: ElkPreviewController.isElkLayeredDiagram(),
    performElkRelayout: typeof performElkRelayout === "function"
      ? async (gridOvr) => performElkRelayout(model, overrides, gridOvr)
      : null,
    performLocalRelayout: (gridOvr) => performLocalRelayout(
      model,
      overrides,
      gridOvr,
    ),
    failRelayout: (reason, nextTriggerCid) => _failV3Relayout(reason, nextTriggerCid),
    finishRelayout: (nextTriggerCid, result, executionLabel) => _finishV3Relayout(nextTriggerCid, result, executionLabel),
    logError: (message) => console.error(message),
  });
}

window.getV3RelayoutStatus = getV3RelayoutStatus;

/**
 * Set an explicit width or height value, converting from the current
 * inspector unit (px, cols, rows) to pixels.
 */
function setFrameSize(cid, dimension, value) {
  window.__DG_getPreviewShellInspectorContract().dispatchPreviewSingleFrameSizeHost({
    cid,
    dimension,
    value,
    gridInfo,
    widthUnit: _inspectorWidthUnit,
    heightUnit: _inspectorHeightUnit,
    baselineStep: BASELINE_STEP,
    resolveFrameSizePx: (options) => (
      window.__DG_getPreviewShellInspectorContract().resolvePreviewFrameSizePx(options)
    ),
    captureOverrideEntries: (ids) => EditorState.captureOverrideEntries(ids),
    applySingleFrameSizeMutation: (options) => (
      window.__DG_getPreviewShellInspectorContract().applySingleFrameSizeMutation(options)
    ),
    overrides,
    coercedKeys: _coercedKeys,
    setDirty,
    commitOverridePatchAction: (label, beforeEntries, afterEntries) => {
      EditorState.commitOverridePatchAction(label, beforeEntries, afterEntries);
    },
    scheduleRelayout: (id) => {
      clearTimeout(_v3RelayoutTimer);
      _v3RelayoutTimer = setTimeout(() => requestV3Relayout(id), 300);
    },
    renderSelectionInspector,
  });
}

function setWidthUnit(unit, cid) {
  _inspectorWidthUnit = window.__DG_getPreviewShellInspectorContract().normalizePreviewInspectorWidthUnit(unit, gridInfo);
  if (cid) renderSelectionInspector(cid);
}

function setHeightUnit(unit, cid) {
  _inspectorHeightUnit = unit;
  if (cid) renderSelectionInspector(cid);
}

function updateInspector(cid) {
  window.__DG_getPreviewShellInspectorContract().renderPreviewSingleSelectionInspectorRuntimeHost({
    inspector: getInspectorElement(),
    cid,
    getNode: (id) => model.get(id),
    getArrowNode,
    getOverride: (id) => overrides[id] || {},
    getOwnDelta,
    getEffectiveDelta,
    getComponentType,
    getParentLayout: (id) => getParentNode(id)?.layout || null,
    getRenderedStyle: (id) => _readRenderedStyleFields(id),
    getViolations: (id) => getViolationsForComponent(id),
    widthCoerced: _coercedKeys.has(cid + ':sizing_w'),
    heightCoerced: _coercedKeys.has(cid + ':sizing_h'),
    widthUnit: _inspectorWidthUnit,
    heightUnit: _inspectorHeightUnit,
    gridInfo,
    baselineStep: BASELINE_STEP,
    textAdapter: typeof window.getLayoutTextAdapter === 'function'
      ? window.getLayoutTextAdapter()
      : null,
    formatControlErrorMessage(message) {
      return typeof escapeHtml === "function" ? escapeHtml(message) : message;
    },
    renderStyleOptions(currentStyle, originalStyleName) {
      return renderBoxStyleOptions(currentStyle, {
        originalLabel: _formatAsDefinedStyleLabel(originalStyleName),
      });
    },
  });
}

// ---- Override persistence (save orchestration in save-client.js) ----

function clearOverride(cid) {
  window.__DG_getPreviewBridgeRelayoutContract().dispatchPreviewClearOverride({
    cid,
    hasWaypointOverride: Boolean(overrides[cid] && overrides[cid].waypoints),
    relayoutStatus: getV3RelayoutStatus(),
    clearOverride: (id) => model.clearOverride(id),
    setDirty: () => setDirty(true),
    applyAllOverrides,
    isSelected: (id) => selectedIds.has(id),
    updateInspector,
    requestRelayout: (id) => requestV3Relayout(id),
    restoreArrowFromTree: (id) => loadTree().then(() => {
      rebuildArrowSVG(id);
      applyAllOverrides();
      if (selectedIds.has(id)) updateInspector(id);
    }),
    captureOverrideEntries: (ids) => EditorState.captureOverrideEntries(ids),
    commitOverridePatchAction: (label, beforeEntries, afterEntries) => {
      EditorState.commitOverridePatchAction(label, beforeEntries, afterEntries);
    },
  });
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
  const selectedIdList = [...selectedIds];
  window.__DG_getPreviewShellInteractionContract().dispatchPreviewKeyboardShortcutHost({
    event: e,
    document,
    selectedIds: selectedIdList,
    selectionDepth,
    isBusy: mgr.isBusy,
    isTextEditing: mgr.isMode(InteractionMode.TEXT_EDITING),
    isDragging: mgr.isMode(InteractionMode.DRAGGING),
    isResizing: mgr.isMode(InteractionMode.RESIZING),
    hasAutolayoutSelection: selectedIdList.some((id) => _isAutolayoutChild(id)),
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
    endInteraction: () => mgr.endInteraction(),
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
    getOwnDelta: (id) => {
      const own = getOwnDelta(id);
      return {
        dx: own.dx,
        dy: own.dy,
        dw: own.dw,
        dh: own.dh,
      };
    },
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

// ---- SSE ----

window.__DG_getPreviewShellBootstrapContract().initPreviewEditorRuntimeHost({
  registerDocumentBindings: () => {
    window.__DG_getPreviewShellBootstrapContract().registerPreviewEditorDocumentBindingsHost({
      document,
      onDocumentKeyDown,
      onUndoClick: () => {
        void EditorState.undo(_applyUndoCommand);
      },
      onRedoClick: () => {
        void EditorState.redo(_applyUndoCommand);
      },
    });
  },
  installTestFacade: () => {
    window.__DG_getPreviewShellBootstrapContract().installPreviewEditorTestFacadeHost({
      previewWindow: window,
      saveOverrides: () => PreviewSaveClient.saveOverrides(),
      undo: () => EditorState.undo(_applyUndoCommand),
      redo: () => EditorState.redo(_applyUndoCommand),
      canUndo: () => EditorState.canUndo(),
      canRedo: () => EditorState.canRedo(),
    });
  },
  initShellCoordinator: () => {
    window.__DG_getPreviewShellBootstrapContract().initPreviewShellCoordinator({
      document,
      window,
      getCurrentPath: () => window.location.pathname,
      syncBrowseNav: _syncBrowseNavToLocation,
      fetchIndexHtml: async () => {
        const response = await fetch("/", { credentials: "same-origin" });
        if (!response.ok) {
          return null;
        }
        return response.text();
      },
      attemptNavigation: (nextUrl, syncUi) => _attemptDiagramNavigation(nextUrl, syncUi),
    });
  },
  initNavTabs,
  ensureEditorState: () => {
    window.__DG_getPreviewShellBootstrapContract().ensurePreviewEditorState(window, {
      getOverrides: () => overrides,
      getGridOverrides: () => model.gridOverrides,
      getElkLayoutOverrides: () => model.elkLayoutOverrides || {},
      getRemovedIds: () => model.removedIds,
      getFrameTree: () => (typeof getFrameTreeJson === "function" ? getFrameTreeJson() : null),
    });
  },
  ensureElkPreviewController: () => {
    window.__DG_getPreviewShellBootstrapContract().ensurePreviewElkPreviewController(window, {
      getElkLayoutOverrides: () => model.elkLayoutOverrides || {},
      setElkLayoutOverrides: (value) => {
        model.elkLayoutOverrides = { ...value };
      },
      getRootId: () => (model.roots[0] || {}).id || "root",
      requestV3Relayout: (cid) => requestV3Relayout(cid),
    });
  },
  initSaveClient: () => {
    window.__DG_getPreviewShellBootstrapContract().initPreviewSaveClient({
      slug: SLUG,
      previewSaveClient: PreviewSaveClient,
      getModel: () => model,
      getSelectedIds: () => [...selectedIds],
      restoreSelectionIds: (ids) => {
        selectedIds.clear();
        ids.forEach(id => selectedIds.add(id));
        reapplySelection();
      },
      serializeDirtyState: () => window.EditorState.serializeDirtyState(),
      reloadDiagram: (options) => loadSVG(options),
      isElkLayeredDiagram: () => window.ElkPreviewController.isElkLayeredDiagram(),
      wireElkLayoutPanel: () => window.ElkPreviewController.wirePanel(),
      applyElkLayoutOverrides: (overrides) => window.ElkPreviewController.applyElkLayoutOverrides(overrides),
      getV3RelayoutStatus: () => getV3RelayoutStatus(),
      getV3RelayoutRuntime: () => _v3RelayoutRuntime,
      getConstraintSummary: () => constraints.summarise(lastViolations),
      getConstraintErrorCount: () => constraints.summarise(lastViolations).errors,
      runConstraints: () => runConstraints(),
      clearCoercedKeys: () => _coercedKeys.clear(),
      setStatus: (message, kind) => setStatus(message, kind),
      sanitizeSvgCloneForExport: (clone) => sanitizeSvgCloneForExport(clone),
      allowInternalDirtyNavigation: () => _allowInternalDirtyNavigation,
    });
  },
  initOverrideToolbar: () => {
    window.__DG_getPreviewShellBootstrapContract().initPreviewOverrideToolbar({
      exportButton: document.getElementById("btn-export"),
      clearAllButton: document.getElementById("btn-clear-all"),
      slug: SLUG,
      getOverrides: () => overrides,
      writeClipboardText: (text) => navigator.clipboard.writeText(text),
      alert: (message) => alert(message),
      confirmClearAll: (message) => confirm(message),
      confirmClearAllMessage: "Clear all overrides for " + SLUG + "?",
      onClearAll: () => {
        EditorState.runUndoableAction("Clear all overrides", () => {
          replaceOverrides({});
          _coercedKeys.clear();
          setDirty(true);
        });
        applyAllOverrides();
        renderSelectionInspector();
      },
    });
  },
  registerPageshowReload: () => {
    window.__DG_getPreviewShellBootstrapContract().registerPreviewPageshowReload({
      addPageshowListener: (handler) => {
        window.addEventListener("pageshow", handler);
      },
      reloadDiagram: () => loadSVG(),
    });
  },
  loadDiagram: () => loadSVG(),
  connectSse: () => {
    window.__DG_getPreviewShellBootstrapContract().connectPreviewSse({
      eventSourceFactory: (url) => new EventSource(url),
      getGeneration: () => generation,
      setGeneration: (value) => {
        generation = value;
      },
      reloadDiagram: () => loadSVG(),
      setBuildStatus: ({ message, kind }) => {
        const statusEl = document.getElementById("build-status");
        if (!statusEl) {
          return;
        }
        statusEl.className = kind === "error" ? "build-status build-err" : "build-status build-ok";
        statusEl.textContent = message;
      },
      scheduleReconnect: (callback, delayMs) => setTimeout(callback, delayMs),
    });
  },
});

// ---- Left sidebar tabs (Browse / Layers) ----
// Handled by initNavTabs() in editor-base.js via initPreviewShell().
