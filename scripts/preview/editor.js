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
const constraints = createDefaultRegistry();
let lastViolations = [];

// Legacy accessors – thin wrappers that delegate to model/mgr so the rest of
// the file can be migrated incrementally.

// Compatibility shims – these expose the old global variable interface
// while storing state in the model/manager objects.
Object.defineProperty(window, "componentTree", {
  get() { return model._roots.map(n => n.data); },
  set(v) { model.loadTree(v); },
});
Object.defineProperty(window, "overrides", {
  get() { return model.overrides; },
  set(v) { model.overrides = v; },
});
Object.defineProperty(window, "selectedIds", {
  get() { return mgr.selectedIds; },
  set(v) { mgr.selectedIds = v; },
});
Object.defineProperty(window, "selectionDepth", {
  get() { return mgr.selectionDepth; },
  set(v) { mgr.selectionDepth = v; },
});

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
  const node = model.get(dragCid);
  if (!node) return { xs: [], ys: [] };
  // Collect from siblings (same parent) or all top-level nodes
  const peers = node.parent
    ? node.parent.children.filter(n => n.id !== dragCid && n.type !== "arrow")
    : model._roots.filter(n => n.id !== dragCid && n.type !== "arrow");

  // Build peer rects for the shared helper
  const peerRects = peers.map(peer => {
    const eff = model.getEffectiveDelta(peer.id);
    const own = model.getOwnDelta(peer.id);
    return {
      x: peer.data.x + eff.dx,
      y: peer.data.y + eff.dy,
      width: peer.data.width + own.dw,
      height: peer.data.height + own.dh,
    };
  });

  const peerSnaps = collectPeerSnapTargets(peerRects);
  const gridSnaps = collectGridSnapTargets(gridInfo);

  return {
    xs: [...peerSnaps.xs, ...gridSnaps.xs],
    ys: [...peerSnaps.ys, ...gridSnaps.ys],
  };
}

/**
 * Find which snap targets the dragged component is close to.
 * Returns { snapDx, snapDy, lines[] }.
 */
function findSnaps(cid, proposedDx, proposedDy, targets) {
  const node = model.get(cid);
  if (!node) return { snapDx: proposedDx, snapDy: proposedDy, lines: [] };
  const own = model.getOwnDelta(cid);
  const w = node.data.width + own.dw;
  const h = node.data.height + own.dh;
  const left = node.data.x + proposedDx;
  const top = node.data.y + proposedDy;

  const snap = snapRectToTargets(left, top, left + w, top + h, targets);

  // Apply snap adjustment then round to 8px grid
  let snapDx = Math.round((proposedDx + snap.adjX) / 8) * 8;
  let snapDy = Math.round((proposedDy + snap.adjY) / 8) * 8;

  // Regenerate guide lines at the FINAL (8px-rounded) position so guides
  // match where the component actually lands, not the pre-rounded snap.
  const finalLeft = node.data.x + snapDx;
  const finalTop = node.data.y + snapDy;
  const finalSnap = snapRectToTargets(finalLeft, finalTop, finalLeft + w, finalTop + h, targets);

  return { snapDx, snapDy, lines: finalSnap.lines };
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
  overrides = LayoutEngine.restorePreviewOverrideEntries({
    currentOverrides: overrides,
    entries,
  });
  Object.keys(entries || {}).forEach((cid) => model.cleanOverride(cid));
}

function _snapshotNeedsV3Relayout(snapshot) {
  return LayoutEngine.snapshotNeedsPreviewRelayout({
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
  applyWaypointOverrides();
  applyAllOverrides();
  reapplySelection();
  renderSelectionInspector();
  updateOverrideSummary();
  refreshTreeColors();
  runConstraints();
  if (syncGridControls && gridInfo) {
    populateGridControls();
  }
}

/** Serialise the full dirty-trackable state (overrides + grid overrides). */
async function _restoreEditorState(serializedState) {
  await LayoutEngine.restorePreviewSerializedState({
    serializedState,
    currentOverrides: overrides,
    currentGridOverrides: model.gridOverrides || {},
    currentRemovedIds: model.removedIds || new Set(),
    rootId: (model.roots[0] || {}).id || "root",
    getNode: (cid) => model.get(cid),
    hasV3FrameOverride: (entry) => _hasV3FrameOverride(entry),
    setOverrides: (nextOverrides) => {
      overrides = nextOverrides;
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
    rerenderStageFromFrameTree: () => _rerenderStageFromFrameTree(),
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
  await LayoutEngine.restorePreviewOverridePatch({
    entries,
    currentOverrides: overrides,
    rootId: (model.roots[0] || {}).id || "root",
    getNode: (cid) => model.get(cid),
    hasV3FrameOverride: (entry) => _hasV3FrameOverride(entry),
    captureOverrideEntries: (ids) => EditorState.captureOverrideEntries(ids),
    setOverrides: (nextOverrides) => {
      overrides = nextOverrides;
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
  return typeof LayoutEngine !== "undefined"
    && typeof LayoutEngine.hasV3FrameOverride === "function"
    && LayoutEngine.hasV3FrameOverride(ovr);
}

async function loadSVG(options = {}) {
  const stage = document.getElementById("stage");
  await LayoutEngine.loadPreviewSvg({
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
      return renderFreshSvg(overrides, gridOverrides, model);
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
  if (!localResult) {
    return _failV3Relayout(executionLabel || "local-failure", triggerCid);
  }
  const relayoutStatus = getV3RelayoutStatus();
  _setV3RelayoutExecution(executionLabel || "local", relayoutStatus.local.reason);
  for (const [cid, ovr] of Object.entries(overrides)) {
    delete ovr.dx; delete ovr.dy; delete ovr.dw; delete ovr.dh;
    if (Object.keys(ovr).length === 0) delete overrides[cid];
  }
  buildTreeUI();
  applyWaypointOverrides();
  bindInteraction();
  applyAllOverrides();
  reapplySelection();
  refreshV3GridInfoFromLayout();
  renderGridOverlay();
  renderSelectionInspector(triggerCid);
  updateOverrideSummary();
  refreshTreeColors();
  runConstraints();
  if (typeof setStatus === "function") {
    setStatus("Ready", "ok");
  }
  return true;
}

/** Monotonic counter + promise hook for tests / navigation (not localReady). */
let _diagramLoadGeneration = 0;
let _diagramLoadedResolvers = [];

function _signalDiagramLoaded() {
  _diagramLoadGeneration += 1;
  window.__DG_DIAGRAM_LOAD_GENERATION = _diagramLoadGeneration;
  const resolvers = _diagramLoadedResolvers;
  _diagramLoadedResolvers = [];
  for (const resolve of resolvers) resolve(_diagramLoadGeneration);
  window.dispatchEvent(new CustomEvent("dg-diagram-loaded", {
    detail: { generation: _diagramLoadGeneration, slug: SLUG },
  }));
}

function whenDiagramLoaded() {
  return new Promise((resolve) => {
    if (document.querySelector("#stage svg")) {
      resolve(_diagramLoadGeneration);
      return;
    }
    _diagramLoadedResolvers.push(resolve);
  });
}

window.whenDiagramLoaded = whenDiagramLoaded;
window.__DG_TEST_getDiagramLoadGeneration = () => _diagramLoadGeneration;

function _syncBrowseNavToLocation() {
  LayoutEngine.syncPreviewBrowseLinksToPath(
    Array.from(document.querySelectorAll(".dg-browse-link")),
    window.location.pathname,
  );
}

function _normaliseDiagramPath(nextUrl) {
  return LayoutEngine.normalizePreviewDiagramPath(nextUrl, window.location.origin);
}

function _attemptDiagramNavigation(nextUrl, syncUi) {
  const nextPath = _normaliseDiagramPath(nextUrl);
  if (!nextPath || nextPath === window.location.pathname) {
    syncUi();
    return false;
  }
  if (PreviewSaveClient.isDirty()) {
    const confirmed = window.confirm(DIRTY_DIAGRAM_NAV_CONFIRM);
    if (!confirmed) {
      syncUi();
      return false;
    }
  }
  _allowInternalDirtyNavigation = true;
  window.location.assign(nextPath);
  window.setTimeout(() => {
    _allowInternalDirtyNavigation = false;
    syncUi();
  }, 0);
  return true;
}

async function loadTree(canonicalState = null) {
  const previewDocument = (canonicalState && canonicalState.previewDocument)
    || (typeof getPreviewDocumentJson === "function" ? getPreviewDocumentJson() : null);
  if (previewDocument && previewDocument.kind === "sequence") {
    model.loadTree([]);
    if (typeof model.loadArrows === "function") model.loadArrows([]);
    return;
  }
  const canonicalComponentTree = canonicalState && Array.isArray(canonicalState.componentTree)
    ? canonicalState.componentTree
    : null;
  if (canonicalComponentTree) {
    model.loadTree(canonicalComponentTree);
    syncArrowsFromFrameTree();
    return;
  }
  try {
    const resp = await fetch("/api/tree/" + SLUG + "?t=" + Date.now(), { cache: "no-store" });
    if (resp.ok) {
      const data = await resp.json();
      model.loadTree(data);
      syncArrowsFromFrameTree();
    }
  } catch (e) { /* ignore */ }
}

/** Index arrows from the authoritative frame-tree JSON (not the frame-only /api/tree). */
function syncArrowsFromFrameTree() {
  const json = typeof getFrameTreeJson === "function" ? getFrameTreeJson() : null;
  const arrows = (json && json.arrows) || [];
  if (typeof syncArrowsInModel === "function") {
    syncArrowsInModel(model, arrows, []);
    return;
  }
  const payload = arrows.map((a) => ({
    id: typeof arrowComponentId === "function"
      ? arrowComponentId(a)
      : (a.id || `${a.source}->${a.target}`),
    source: a.source,
    target: a.target,
    color: a.color,
    waypoints: a.waypoints || [],
  }));
  model.loadArrows(payload);
}

async function loadGridInfo(canonicalState = null) {
  const canonicalGridInfo = canonicalState && canonicalState.gridInfo && typeof canonicalState.gridInfo === "object"
    ? canonicalState.gridInfo
    : null;
  gridInfo = null;
  baseGridInfo = null;
  if (canonicalGridInfo) {
    gridInfo = canonicalGridInfo;
    baseGridInfo = EditorState.cloneValue(gridInfo);
    model.setDiagramGrid(gridInfo);
    return;
  }
  try {
    const resp = await fetch("/api/grid/" + SLUG + "?t=" + Date.now(), { cache: "no-store" });
    if (resp.ok) {
      gridInfo = await resp.json();
      baseGridInfo = EditorState.cloneValue(gridInfo);
      model.setDiagramGrid(gridInfo);
    }
  } catch (e) { /* ignore */ }
  // Fallback only if the server has not produced authoritative v3 grid info.
  if (!gridInfo) {
    const rootNode = model.roots[0] || null;
    const gap = rootNode ? (rootNode.data.layout_gap ?? 24) : 24;
    const pad = rootNode ? (rootNode.data.padding_top ?? 24) : 24;
    const svg = document.querySelector("#stage svg");
    const svgW = svg ? (svg.viewBox.baseVal.width || parseFloat(svg.getAttribute("width") || 840)) : 840;
    const svgH = svg ? (svg.viewBox.baseVal.height || parseFloat(svg.getAttribute("height") || 840)) : 840;
    gridInfo = LayoutEngine.resolvePreviewGridInfo({
      canvasWidth: svgW, canvasHeight: svgH,
      baselineStep: BASELINE_STEP,
      columnCount: 2, columnGutter: gap, rowGutter: gap,
      marginTop: pad, marginRight: pad, marginBottom: pad, marginLeft: pad,
    });
    baseGridInfo = EditorState.cloneValue(gridInfo);
  }
}

function cycleGuideMode() {
  const idx = GUIDE_MODES.indexOf(guideMode);
  guideMode = GUIDE_MODES[(idx + 1) % GUIDE_MODES.length];
  renderGridOverlay();
  const badge = document.getElementById("guide-badge");
  badge.className = "guide-badge " + guideMode;
  if (guideMode === "off") {
    badge.textContent = "";
  } else {
    badge.textContent = "Grid: on (W)";
  }
}

function renderGridOverlay() {
  const svg = document.querySelector("#stage svg");
  if (!svg) return;
  const existing = svg.querySelector("#dg-grid-overlay");
  if (existing) existing.remove();
  if (guideMode === "off" || !gridInfo) return;

  const ns = "http://www.w3.org/2000/svg";
  const g = document.createElementNS(ns, "g");
  g.id = "dg-grid-overlay";
  g.style.pointerEvents = "none";

  const vb = svg.viewBox.baseVal;
  const svgW = vb.width || parseFloat(svg.getAttribute("width") || svg.clientWidth);
  const svgH = vb.height || parseFloat(svg.getAttribute("height") || svg.clientHeight);
  const scene = LayoutEngine.createPreviewGridOverlayScene({
    guideMode,
    gridInfo,
    svgWidth: svgW,
    svgHeight: svgH,
    baselineStep: BASELINE_STEP,
  });
  if (!scene) return;
  for (const shape of scene.shapes) {
    _appendGridOverlayShape(g, ns, shape);
  }
  svg.appendChild(g);
}

function _appendGridOverlayShape(parent, ns, shape) {
  if (shape.kind === "rect") {
    const rect = document.createElementNS(ns, "rect");
    rect.setAttribute("x", shape.x);
    rect.setAttribute("y", shape.y);
    rect.setAttribute("width", shape.width);
    rect.setAttribute("height", shape.height);
    rect.setAttribute("fill", shape.fill);
    parent.appendChild(rect);
    return;
  }
  const line = document.createElementNS(ns, "line");
  line.setAttribute("x1", shape.x1);
  line.setAttribute("y1", shape.y1);
  line.setAttribute("x2", shape.x2);
  line.setAttribute("y2", shape.y2);
  line.setAttribute("stroke", shape.stroke);
  line.setAttribute("stroke-width", shape.strokeWidth);
  if (shape.strokeDasharray) {
    line.setAttribute("stroke-dasharray", shape.strokeDasharray);
  }
  parent.appendChild(line);
}

function populateGridControls() {
  if (!gridInfo) return;

  const activeEl = document.activeElement;
  if (LayoutEngine.isGridControlInputId(activeEl?.id)) return;

  const controlState = LayoutEngine.resolvePreviewGridControlState({
    gridInfo,
    gridOverrides: model.gridOverrides || {},
  });
  const domPatch = LayoutEngine.resolvePreviewGridControlDomPatch({
    controlState,
    hasSplitMargins: Boolean(_gridEl("grid-margin-top")),
  });

  Object.entries(domPatch.values).forEach(([id, value]) => {
    const el = _gridEl(id);
    if (el) el.value = value;
  });
  Object.entries(domPatch.checked).forEach(([id, checked]) => {
    const el = _gridEl(id);
    if (el) el.checked = checked;
  });
}

let relayoutTimer = null;

function _readGridControlStateFromDom() {
  const linkEl = document.getElementById("grid-link-root");
  const slackEl = document.getElementById("grid-slack");
  return LayoutEngine.resolvePreviewGridControlStateFromDomState({
    hasSplitMargins: Boolean(_gridEl("grid-margin-top")),
    cols: document.getElementById("grid-cols").value,
    rows: document.getElementById("grid-rows").value,
    colGap: document.getElementById("grid-col-gap").value,
    rowGap: document.getElementById("grid-row-gap").value,
    marginTop: _gridEl("grid-margin-top")?.value,
    marginRight: _gridEl("grid-margin-right")?.value,
    marginBottom: _gridEl("grid-margin-bottom")?.value,
    marginLeft: _gridEl("grid-margin-left")?.value,
    legacyMargin: _gridEl("grid-margin")?.value,
    fallbackMargin: GRID_DEFAULTS.margin_top,
    linkToRoot: linkEl ? linkEl.checked : true,
    slackAbsorption: slackEl ? slackEl.checked : true,
  });
}

function _resolveGridControlRuntimeUpdate() {
  const canvas = _gridCanvasDimensionsFromStage();
  if (!canvas) return null;
  return LayoutEngine.resolvePreviewGridControlRuntimeUpdate({
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    baselineStep: BASELINE_STEP,
    controlState: _readGridControlStateFromDom(),
    rootId: (model.roots[0] || {}).id || "root",
  });
}

function onGridControlChange() {
  if (!gridInfo) return;
  const runtimeUpdate = _resolveGridControlRuntimeUpdate();
  if (!runtimeUpdate) return;

  if (!EditorState.getPendingGridAction()) {
    EditorState.setPendingGridAction(EditorState.beginUndoableAction("Adjust grid"));
  }

  model.gridOverrides = runtimeUpdate.gridOverrides;
  if (runtimeUpdate.shouldPruneLinkedRootOverrides) {
    _pruneLinkedRootGridOverrides();
  }
  setDirty(true);

  // Capture root ID before the debounce window so a concurrent tree
  // reload can't change it mid-flight.
  const rootId = runtimeUpdate.relayoutRootId;

  // Debounce the relayout call so rapid typing doesn't flood the server
  if (relayoutTimer) clearTimeout(relayoutTimer);
  relayoutTimer = setTimeout(async () => {
    try {
      await requestV3Relayout(rootId);
    } finally {
      EditorState.commitUndoableAction(EditorState.getPendingGridAction());
      EditorState.setPendingGridAction(null);
    }
  }, 200);

  // Immediately update the grid overlay from the input values (local recompute)
  gridInfo = runtimeUpdate.overlayGridInfo;
  document.getElementById("grid-rows").value = gridInfo._rows;
  renderGridOverlay();
}

// ---- Column/row span ↔ pixel conversion ----

// Track inspector width/height unit preference: 'px', 'cols', 'rows'
let _inspectorWidthUnit = 'px';
let _inspectorHeightUnit = 'px';

function _gridCanvasDimensionsFromStage() {
  const svg = document.querySelector("#stage svg");
  if (!svg) return null;
  const vb = svg.viewBox.baseVal;
  const fallbackWidth = vb.width || parseFloat(svg.getAttribute("width") || svg.clientWidth);
  const fallbackHeight = vb.height || parseFloat(svg.getAttribute("height") || svg.clientHeight);
  const pageRect = document
    .querySelector('[data-component-id="page"]')
    ?.querySelector(':scope > rect');
  const pageWidth = Number(pageRect?.getAttribute("width") || "0");
  const pageHeight = Number(pageRect?.getAttribute("height") || "0");
  return {
    width: pageWidth > 0 ? pageWidth : fallbackWidth,
    height: pageHeight > 0 ? pageHeight : fallbackHeight,
  };
}

function refreshV3GridInfoFromLayout() {
  const canvas = _gridCanvasDimensionsFromStage();
  if (!canvas) return;
  gridInfo = LayoutEngine.resolvePreviewGridInfoFromRuntimeState({
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    baselineStep: BASELINE_STEP,
    gridOverrides: model.gridOverrides || {},
    fallbackGridInfo: gridInfo || {},
    baseGridInfo: baseGridInfo || {},
  });
  model.setDiagramGrid(gridInfo);
  populateGridControls();
}

function bindGridNumberInputSelection(input) {
  if (!input || input.readOnly) return;
  let selectPending = false;
  input.addEventListener("focus", () => {
    selectPending = true;
    setTimeout(() => {
      if (selectPending && document.activeElement === input) {
        input.select();
      }
      selectPending = false;
    }, 0);
  });
  input.addEventListener("keydown", () => {
    if (selectPending) {
      input.select();
      selectPending = false;
    }
  });
  input.addEventListener("mouseup", (event) => {
    if (selectPending) {
      event.preventDefault();
    }
  });
  input.addEventListener("blur", () => {
    selectPending = false;
  });
}

// Bind grid control events (skip missing elements — viewer.html vs viewer-unified.html)
["grid-cols", "grid-rows", "grid-col-gap", "grid-row-gap",
 "grid-margin", "grid-margin-top", "grid-margin-right", "grid-margin-bottom", "grid-margin-left"].forEach(id => {
  const el = _gridEl(id);
  if (el) el.addEventListener("input", onGridControlChange);
});
["grid-link-root", "grid-slack"].forEach(id => {
  const el = _gridEl(id);
  if (el) el.addEventListener("change", onGridControlChange);
});
["grid-cols", "grid-rows", "grid-col-gap", "grid-row-gap",
 "grid-margin", "grid-margin-top", "grid-margin-right", "grid-margin-bottom", "grid-margin-left"].forEach(id => {
  const el = _gridEl(id);
  if (el) bindGridNumberInputSelection(el);
});

function resetOverrideState() {
  overrides = {};
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
  // Patch arrow waypoints in the component tree from saved overrides,
  // then rebuild the arrow SVG to reflect the new paths.
  for (const cid of Object.keys(overrides)) {
    const o = overrides[cid];
    if (!o || !o.waypoints) continue;
    const node = getArrowNode(cid);
    if (node) {
      node.waypoints = JSON.parse(JSON.stringify(o.waypoints));
      rebuildArrowSVG(cid);
    }
  }
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
  return LayoutEngine.findPreviewComponentAtDepth({
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
  return LayoutEngine.findDeepestPreviewComponent({
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

function renderEmptyInspector() {
  const inspector = getInspectorElement();
  if (!inspector) return;
  inspector.innerHTML =
    '<p class="dg-empty-message bf-form-help">Click a component to inspect it.</p>';
}

function getPrimarySelectedId(preferredCid) {
  return LayoutEngine.resolvePrimarySelectedId(selectedIds, preferredCid);
}

function renderSelectionInspector(preferredCid) {
  const primary = getPrimarySelectedId(preferredCid);
  if (!primary) {
    renderEmptyInspector();
    return;
  }
  if (selectedIds.size === 1) {
    updateInspector(primary);
  } else {
    renderMultiSelectionInspector();
  }
}

function getSelectionActionItems() {
  return LayoutEngine.collectPreviewSelectionActionInfo({
    selectedIds,
    getNode: (id) => model.get(id),
    getOwnDelta,
    getEffectiveDelta,
    inset: INSET,
  });
}

function setMultiActionGap(value) {
  const parsed = parseInt(value, 10);
  multiActionGap = LayoutEngine.normalizeSelectionGap(
    Number.isFinite(parsed) ? parsed : 0,
    BASELINE_STEP,
  );
  const input = document.getElementById("multi-action-gap");
  if (input) input.value = multiActionGap;
}

function applySelectionTargets(items, targets) {
  if (Object.keys(targets).length === 0) return;
  const ids = Object.keys(targets);
  const beforeEntries = EditorState.captureOverrideEntries(ids);
  const entries = LayoutEngine.createSelectionTargetOverrideEntries({
    items,
    targets,
    snapStep: BASELINE_STEP,
  });
  for (const entry of entries) {
    setOverride(entry.id, { dx: entry.dx, dy: entry.dy });
  }
  applyAllOverrides();
  reapplySelection();
  renderSelectionInspector();
  updateOverrideSummary();
  refreshTreeColors();
  runConstraints();
  EditorState.commitOverridePatchAction("Reposition selection", beforeEntries, EditorState.captureOverrideEntries(ids));
}

function distributeSelection(axis) {
  const info = getSelectionActionItems();
  if (info.items.length < 2) return;
  if (!info.sameParent) {
    alert("Distribute works on sibling components under one parent.");
    return;
  }
  if (info.hasUnsupported) {
    alert("Distribute currently supports boxes, panels, terminals, and other non-arrow components only.");
    return;
  }

  const gap = LayoutEngine.normalizeSelectionGap(multiActionGap, BASELINE_STEP);
  multiActionGap = gap;
  const targets = LayoutEngine.resolveSelectionDistributeTargets({
    items: info.items,
    axis,
    gap,
    snapStep: BASELINE_STEP,
  });
  applySelectionTargets(info.items, targets);
}

function alignSelection(mode) {
  const info = getSelectionActionItems();
  if (info.items.length < 2) return;
  if (info.hasUnsupported) {
    alert("Align currently supports boxes, panels, terminals, and other non-arrow components only.");
    return;
  }
  const targets = LayoutEngine.resolveSelectionAlignTargets({
    items: info.items,
    mode,
    snapStep: BASELINE_STEP,
  });
  applySelectionTargets(info.items, targets);
}

function renderMultiSelectionInspector() {
  const inspector = getInspectorElement();
  if (!inspector) {
    return;
  }
  const info = getSelectionActionItems();
  if (info.items.length < 2) {
    renderEmptyInspector();
    return;
  }

  const parent = info.parentId ? model.get(info.parentId) : null;
  const parentLayout = parent ? {
    layout: parent.layout,
    layoutGap: parent.layoutGap,
    layoutRowGap: parent.layoutRowGap,
    layoutColGap: parent.layoutColGap,
  } : null;
  const fallbackGap = window.__DG_CONFIG.col_gap || 24;
  const panelState = LayoutEngine.resolveMultiSelectionInspectorState({
    selectedCount: selectedIds.size,
    info,
    parentLayout,
    fallbackGap,
    snapStep: BASELINE_STEP,
    items: info.items.map((item) => ({
      id: item.id,
      node: item.node,
      override: overrides[item.id] || {},
      widthCoerced: _coercedKeys.has(item.id + ':sizing_w'),
      heightCoerced: _coercedKeys.has(item.id + ':sizing_h'),
    })),
  });

  multiActionGap = panelState.viewModel.inferredGap;
  let styleInfo = null;
  let styleOptionsHtml = '';
  if (info.items.length >= 2) {
    styleInfo = _getMultiStyleValues(info.items);
    if (styleInfo) {
      styleOptionsHtml = renderBoxStyleOptions(styleInfo.mixed ? '__nomatch__' : styleInfo.style, {
        originalLabel: _formatAsDefinedStyleLabel(
          styleInfo.originalStyleName,
          styleInfo.originalStyleMixed,
        ),
      });
    }
  }

  inspector.innerHTML = LayoutEngine.renderMultiSelectionInspectorPanel({
    selectedCount: panelState.viewModel.selectedCount,
    multiActionGap,
    showStackSpacingHint: panelState.viewModel.showStackSpacingHint,
    showAlignOnlyHint: panelState.viewModel.showAlignOnlyHint,
    hasUnsupported: panelState.viewModel.hasUnsupported,
    alignState: panelState.alignState,
    containerState: panelState.containerState,
    sizingState: panelState.sizingState,
    styleState: styleInfo,
    widthUnit: _inspectorWidthUnit,
    heightUnit: _inspectorHeightUnit,
    showWidthColsOption: Boolean(gridInfo && gridInfo.col_widths && gridInfo.col_widths.length),
    styleOptionsHtml,
  });
}

/**
 * Read shared style across selected box/panel/terminal items.
 * Returns null if no styleable items, or {style, mixed, count}.
 */
function _getMultiStyleValues(items) {
  return LayoutEngine.resolveMultiSelectionPreviewStyleState(items.map((item) => {
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
  const ids = [...selectedIds];
  const maiBefore = EditorState.captureOverrideEntries(ids);
  for (const cid of ids) {
    const node = model.get(cid);
    if (!node) continue;
    if (node.type === 'arrow') continue;
    if (!overrides[cid]) overrides[cid] = {};
    overrides[cid].align = align;
  }
  setDirty(true);
  EditorState.commitOverridePatchAction("Change alignment (multi)", maiBefore, EditorState.captureOverrideEntries(ids));
  if (ids.length > 0) {
    clearTimeout(_v3RelayoutTimer);
    _v3RelayoutTimer = setTimeout(() => requestV3Relayout(ids[0]), 300);
  }
  renderMultiSelectionInspector();
}
window.setMultiFrameAlign = setMultiFrameAlign;

/**
 * Apply style override to ALL selected box/panel/terminal items.
 */
function applyMultiStyleOverride(styleName) {
  const canonicalStyle = _normaliseStyleName(styleName);
  const ids = [...selectedIds];
  const msoBefore = EditorState.captureOverrideEntries(ids);
  let changedAny = false;
  for (const cid of ids) {
    if (!LayoutEngine.isPreviewStyleableComponentType(getComponentType(cid))) continue;
    const changed = LayoutEngine.applyVisiblePreviewStyleOverride({
      overrides,
      cid,
      node: model.get(cid),
      styleName: canonicalStyle,
    });
    if (changed) {
      model.cleanOverride(cid);
      changedAny = true;
    }
  }
  if (!changedAny) {
    renderMultiSelectionInspector();
    return;
  }
  setDirty(true);
  EditorState.commitOverridePatchAction("Change style (multi)", msoBefore, EditorState.captureOverrideEntries(ids));
  if (ids.length > 0) {
    clearTimeout(_v3RelayoutTimer);
    requestV3Relayout(ids[0]);
  }
  renderMultiSelectionInspector();
}
window.applyMultiStyleOverride = applyMultiStyleOverride;

/**
 * Apply a frame property to ALL selected items, then trigger a single relayout.
 */
function setMultiFrameProp(prop, value) {
  const ids = [...selectedIds];
  const mfpBefore = EditorState.captureOverrideEntries(ids);
  const result = LayoutEngine.applyMultiFramePropMutation({
    overrides,
    coercedKeys: _coercedKeys,
    ids,
    prop,
    value,
    getNode: (cid) => model.get(cid),
  });
  if (result.kind === 'none') return;

  setDirty(true);
  const labelPrefix = result.kind === 'clear' ? 'Clear ' : 'Change ';
  EditorState.commitOverridePatchAction(labelPrefix + prop + ' (multi)', mfpBefore, EditorState.captureOverrideEntries(ids));

  // Single debounced relayout for the batch (guard empty selection)
  if (ids.length > 0) {
    clearTimeout(_v3RelayoutTimer);
    _v3RelayoutTimer = setTimeout(() => requestV3Relayout(ids[0]), 300);
  }

  if (result.kind === 'clear') {
    renderSelectionInspector();
    return;
  }
  renderMultiSelectionInspector();
}
window.setMultiFrameProp = setMultiFrameProp;

/**
 * Set an explicit width or height for all selected items, converting from
 * the current inspector unit (px, cols, rows) to pixels.
 */
function setMultiFrameSize(dimension, value) {
  const px = LayoutEngine.resolvePreviewFrameSizePx({
    dimension,
    value,
    gridInfo,
    widthUnit: _inspectorWidthUnit,
    heightUnit: _inspectorHeightUnit,
    baselineStep: BASELINE_STEP,
  });
  if (px == null) return;
  const ids = [...selectedIds];
  const msBefore = EditorState.captureOverrideEntries(ids);
  LayoutEngine.applyMultiFrameSizeMutation({
    overrides,
    coercedKeys: _coercedKeys,
    ids,
    dimension,
    px,
    getNode: (cid) => model.get(cid),
  });
  setDirty(true);
  EditorState.commitOverridePatchAction("Set " + dimension + " (multi)", msBefore, EditorState.captureOverrideEntries(ids));
  if (ids.length > 0) {
    clearTimeout(_v3RelayoutTimer);
    _v3RelayoutTimer = setTimeout(() => requestV3Relayout(ids[0]), 300);
  }
  renderMultiSelectionInspector();
}
window.setMultiFrameSize = setMultiFrameSize;

const _v3RelayoutRuntime = {
  lastMode: "not-run",
  lastReason: "not-run",
  sequence: 0,
};

function _setV3RelayoutExecution(mode, reason) {
  _v3RelayoutRuntime.lastMode = mode;
  _v3RelayoutRuntime.lastReason = reason || "unknown";
  _v3RelayoutRuntime.sequence += 1;
}

function _v3RelayoutStatusMessage(reason) {
  switch (reason) {
    case "missing-frame-tree":
      return "Local relayout unavailable: frame tree not loaded";
    case "missing-text-adapter":
      return "Local relayout unavailable: text adapter not ready";
    case "forced-unready":
      return "Local relayout intentionally disabled";
    case "local-failure":
      return "Local relayout failed";
    default:
      return "Local relayout unavailable";
  }
}

function _failV3Relayout(reason, triggerCid) {
  _setV3RelayoutExecution("local-error", reason);
  if (typeof setStatus === "function") {
    setStatus(_v3RelayoutStatusMessage(reason), "error");
  }
  renderSelectionInspector(triggerCid);
  updateOverrideSummary();
  refreshTreeColors();
  runConstraints();
  return false;
}

function getV3RelayoutStatus() {
  const local = typeof getLocalRelayoutStatus === "function"
    ? getLocalRelayoutStatus()
    : {
      ready: false,
      reason: "bridge-unavailable",
      overrideMode: "auto",
      frameTreeLoaded: false,
      textAdapterReady: false,
      textAdapterBackend: null,
      textAdapterError: null,
    };

  return {
    engine: "v3",
    isV3: true,
    interactiveExecutor: "local-only",
    interactiveFallbackAvailable: false,
    local,
    localReady: !!local.ready,
    frameManaged: true,
    fallbackActive: false,
    lastMode: _v3RelayoutRuntime.lastMode,
    lastReason: _v3RelayoutRuntime.lastReason,
    sequence: _v3RelayoutRuntime.sequence,
  };
}

function isV3LocalRelayoutReady() {
  return getV3RelayoutStatus().localReady;
}

function isV3FrameManagedTarget(target, relayoutStatus) {
  const status = relayoutStatus || getV3RelayoutStatus();
  if (!status.frameManaged) return false;
  const group = target && target.closest ? target.closest("[data-component-id]") : null;
  if (!group) return false;
  const cid = group.getAttribute("data-component-id");
  const node = cid ? model.get(cid) : null;
  return !!node && node.type !== "arrow";
}

function applyAllOverrides() {
  const svg = document.querySelector("#stage svg");
  if (!svg) return;
  const selectedId = selectedIds.size > 0 ? [...selectedIds].pop() : null;
  LayoutEngine.applyPreviewSvgOverrides({
    svg,
    componentTree: model._roots.map((node) => node.data),
    rootNodes: model._roots
      .filter((node) => node.type !== "arrow")
      .map((node) => ({ id: node.id, gridRow: node.gridRow })),
    overrides,
    relayoutStatus: getV3RelayoutStatus(),
    boxStyles: BOX_STYLES,
    inset: window.__DG_CONFIG.inset || 8,
    iconSize: window.__DG_CONFIG.icon_size || 48,
    gridStep: BASELINE_STEP,
    hasDiagramGrid: Boolean(model.diagramGrid),
    getNode: (cid) => model.get(cid),
    getOwnDelta: (cid) => getOwnDelta(cid),
    getEffectiveDelta: (cid) => getEffectiveDelta(cid),
    isFrameManagedTarget: (target, relayoutStatus) => isV3FrameManagedTarget(target, relayoutStatus),
    selectedId,
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
  if (!svg || !componentTree || componentTree.length === 0) return;

  const PADDING = 24; // breathing room on every side

  // Compute the union bounding box of all positioned components
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  function visit(nodes) {
    for (const node of nodes) {
      if (node.type === "arrow") { if (node.children) visit(node.children); continue; }
      // Use actual SVG DOM geometry + CSS transform
      const g = svg.querySelector('[data-component-id="' + node.id + '"]');
      if (!g) { if (node.children) visit(node.children); continue; }
      const bbox = g.getBBox();
      let tdx = 0, tdy = 0;
      const tm = (g.style.transform || "").match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
      if (tm) { tdx = parseFloat(tm[1]); tdy = parseFloat(tm[2]); }
      const x = bbox.x + tdx;
      const y = bbox.y + tdy;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + bbox.width > maxX) maxX = x + bbox.width;
      if (y + bbox.height > maxY) maxY = y + bbox.height;
      if (node.children) visit(node.children);
    }
  }
  visit(componentTree);
  if (!isFinite(minX)) return;

  const vb = svg.viewBox.baseVal;
  const curW = vb.width || parseFloat(svg.getAttribute("width") || "0");
  const curH = vb.height || parseFloat(svg.getAttribute("height") || "0");
  const curX = vb.x || 0;
  const curY = vb.y || 0;

  // Only expand when content actually extends past the current viewBox edges.
  // Breathing room is added only in the direction of overflow.
  let needX = curX, needY = curY;
  let needRight = curX + curW, needBottom = curY + curH;
  if (minX < curX) needX = minX - PADDING;
  if (minY < curY) needY = minY - PADDING;
  if (maxX > curX + curW) needRight = maxX + PADDING;
  if (maxY > curY + curH) needBottom = maxY + PADDING;
  const needW = needRight - needX;
  const needH = needBottom - needY;

  if (needX < curX || needY < curY || needW > curW || needH > curH) {
    svg.setAttribute("viewBox", needX + " " + needY + " " + needW + " " + needH);
    svg.setAttribute("width", needW);
    svg.setAttribute("height", needH);
  }
}

// ---- Frame delete ----

function _diagramRootFrameId() {
  const tree = typeof getFrameTreeJson === "function" ? getFrameTreeJson() : null;
  if (tree && tree.root && tree.root.id) return tree.root.id;
  const rootNode = model.roots[0];
  return rootNode ? rootNode.id : "page";
}

function _collectSubtreeRemovalIds(frameIds) {
  const all = new Set();
  for (const id of frameIds) {
    const node = model.get(id);
    if (!node) {
      all.add(id);
      continue;
    }
    all.add(id);
    node.descendantIds.forEach(desc => all.add(desc));
  }
  return all;
}

function _topLevelRemovalTargets(frameIds) {
  const set = new Set(frameIds);
  return [...set].filter(id => {
    const node = model.get(id);
    if (!node) return true;
    return !node.ancestorIds.some(ancestor => set.has(ancestor));
  });
}

async function _rerenderStageFromFrameTree() {
  const stage = document.getElementById("stage");
  if (!stage || typeof renderFreshSvg !== "function") return false;
  const hasGridOverrides = model.gridOverrides && Object.keys(model.gridOverrides).length > 0;
  const renderResult = await renderFreshSvg(
    overrides,
    hasGridOverrides ? model.gridOverrides : null,
    model,
  );
  stage.replaceChildren(renderResult.svg);
  applyWaypointOverrides();
  buildTreeUI();
  bindInteraction();
  applyAllOverrides();
  renderGridOverlay();
  reapplySelection();
  refreshV3GridInfoFromLayout();
  renderSelectionInspector();
  updateOverrideSummary();
  refreshTreeColors();
  runConstraints();
  return true;
}

async function deleteSelectedFrames() {
  if (selectedIds.size === 0) return false;
  if (mgr.isMode(InteractionMode.TEXT_EDITING)) return false;

  const rootId = _diagramRootFrameId();
  const candidates = [...selectedIds].filter(id => {
    if (id === rootId) return false;
    const node = model.get(id);
    return node && node.type !== "arrow";
  });
  if (candidates.length === 0) {
    alert("Cannot delete the diagram root.");
    return false;
  }

  const topIds = _topLevelRemovalTargets(candidates);
  const action = EditorState.beginUndoableAction("Delete frame");
  const subtreeIds = _collectSubtreeRemovalIds(topIds);

  for (const id of subtreeIds) {
    model.removedIds.add(id);
    model.clearOverride(id);
    selectedIds.delete(id);
  }

  setDirty(true);
  const ok = await _rerenderStageFromFrameTree();
  if (!ok) {
    alert("Relayout failed after delete.");
  } else {
    deselectAll();
  }
  EditorState.commitUndoableAction(action);
  return ok;
}

function _treeHasFrameId(frameId) {
  const treeEl = document.getElementById("tree");
  if (!treeEl) return false;
  return LayoutEngine.previewTreeHasFrameId(treeEl, frameId);
}

window.deleteSelectedFrames = deleteSelectedFrames;
window.__DG_TEST_treeHasFrameId = _treeHasFrameId;
window.__DG_TEST_findArrowAtPoint = findArrowAtPoint;

// ---- Interaction ----

function buildTreeUI() {
  const treeEl = document.getElementById("tree");
  if (!treeEl) return;
  LayoutEngine.renderPreviewTreePanel({
    container: treeEl,
    nodes: model._roots.map(n => n.data),
    overrides,
    selectedIds,
    onSelect: (id, additive) => {
      selectComponent(id, additive);
    },
    onContextMenu: (event, id) => {
      if (!selectedIds.has(id)) selectComponent(id, false);
      _showTreeContextMenu(event.clientX, event.clientY);
    },
  });
}

function _showTreeContextMenu(clientX, clientY) {
  LayoutEngine.showPreviewContextMenu({
    document,
    clientX,
    clientY,
    actions: [
      {
        label: "Delete frame",
        onSelect: () => {
          void deleteSelectedFrames();
        },
      },
    ],
  });
}

let _interactionSvg = null;

function _onSvgMouseOver(e) {
  if (mgr.suppressHover) return;
  const svg = e.currentTarget;
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
  const hoverCid = findArrowAtPoint(e.clientX, e.clientY)
    || findComponentAtDepth(svgPt.x, svgPt.y, selectionDepth);
  LayoutEngine.syncPreviewSvgHoverState(svg, hoverCid);
}

function _onSvgMouseOut(e) {
  if (mgr.suppressHover) return;
  LayoutEngine.clearPreviewSvgHoverState(e.currentTarget);
}

function bindInteraction() {
  const svg = document.querySelector("#stage svg");
  if (!svg) return;
  _interactionSvg = LayoutEngine.bindPreviewStageSvgInteraction({
    svg,
    previousSvg: _interactionSvg,
    handlers: {
      onMouseDown: onSvgMouseDown,
      onDoubleClick: onSvgDblClick,
      onMouseOver: _onSvgMouseOver,
      onMouseOut: _onSvgMouseOut,
    },
    ensureArrowHitAreas: (currentSvg) => ensureArrowHitAreas(currentSvg),
    rebuildTreeUi: buildTreeUI,
  });
}

// ---- Drag (move) ----

function onSvgDblClick(e) {
  if (e.target.classList.contains("dg-handle")) return;
  if (e.target.classList.contains("dg-wp-handle")) return;
  if (mgr.isMode(InteractionMode.TEXT_EDITING)) return;
  const svg = document.querySelector("#stage svg");
  if (!svg) return;

  const editableText = LayoutEngine.findPreviewEditableTextTarget(e.target, e.clientX, e.clientY);
  if (editableText) {
    const cid = LayoutEngine.resolvePreviewEditableComponentId(
      editableText,
      (id) => Boolean(model.get(id)),
    );
    if (cid) {
      const ancestors = getAncestors(cid);
      selectionDepth = ancestors.length;
      selectComponent(cid, false);
      startTextEdit(cid, e, { textEl: editableText });
      return;
    }
  }

  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());

  // If current selection is a container with children, select all children
  const current = findComponentAtDepth(svgPt.x, svgPt.y, selectionDepth);
  const currentNode = current ? model.get(current) : null;
  const childIds = currentNode && currentNode.children ? currentNode.children.map((n) => n.data.id) : [];
  const doubleClickResolution = LayoutEngine.resolveDoubleClickSelection({
    currentSelectionDepth: selectionDepth,
    currentHitId: current,
    currentHitIsSelected: Boolean(current && selectedIds.has(current)),
    currentHitChildIds: childIds,
    deeperHitId: findComponentAtDepth(svgPt.x, svgPt.y, selectionDepth + 1),
  });

  if (doubleClickResolution.kind === 'select-children') {
    const nextState = LayoutEngine.applySelectionStateMutation({
      selectedIds: [...selectedIds],
      selectionDepth,
    }, {
      kind: 'replace-many',
      targetIds: childIds,
      nextSelectionDepth: doubleClickResolution.nextSelectionDepth,
    });
    selectedIds.clear();
    nextState.selectedIds.forEach((id) => selectedIds.add(id));
    selectionDepth = nextState.selectionDepth;
    reapplySelection();
    return;
  }

  if (current && selectedIds.has(current)) {
    if (doubleClickResolution.kind === 'none') {
      // No children — try text edit
      startTextEdit(current, e);
      return;
    }
  }

  if (doubleClickResolution.kind === 'select-deeper' && doubleClickResolution.targetId) {
    selectionDepth = doubleClickResolution.nextSelectionDepth;
    selectComponent(doubleClickResolution.targetId, false);
  }
}

function onSvgMouseDown(e) {
  // If currently text-editing, commit the edit before handling the new interaction
  if (mgr.isMode(InteractionMode.TEXT_EDITING)) {
    commitTextEdit();
  }

  // Check if clicking a resize handle
  if (e.target.classList.contains("dg-handle")) {
    startResize(e);
    return;
  }
  
  const svg = document.querySelector("#stage svg");
  if (!svg) return;
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
  
  if (e.button !== 0) return;

  const arrowCid = findArrowAtPoint(e.clientX, e.clientY);
  const deepest = (e.ctrlKey || e.metaKey) ? findDeepestComponent(svgPt.x, svgPt.y) : null;
  const currentDepthId = findComponentAtDepth(svgPt.x, svgPt.y, selectionDepth);
  const topLevelId = findComponentAtDepth(svgPt.x, svgPt.y, 0);

  let currentSelectedTopLevel = null;
  if (selectedIds.size > 0) {
    const firstSelected = [...selectedIds][0];
    const ancestors = getAncestors(firstSelected);
    currentSelectedTopLevel = ancestors.length > 0 ? ancestors[0] : firstSelected;
  }

  const pointerResolution = LayoutEngine.resolvePointerSelection({
    currentSelectionDepth: selectionDepth,
    arrowId: arrowCid,
    shiftKey: e.shiftKey,
    jumpToDeepest: e.ctrlKey || e.metaKey,
    deepestId: deepest,
    deepestDepth: deepest ? getAncestors(deepest).length : null,
    currentDepthId,
    topLevelId,
    currentSelectedTopLevelId: currentSelectedTopLevel,
  });

  if (pointerResolution.kind === 'deselect') {
    deselectAll();
    return;
  }

  if (pointerResolution.kind === 'select-only' && pointerResolution.targetId) {
    selectionDepth = pointerResolution.nextSelectionDepth;
    selectComponent(pointerResolution.targetId, Boolean(pointerResolution.additive));
    e.preventDefault();
    return;
  }

  if (pointerResolution.kind !== 'prepare-drag' || !pointerResolution.targetId) {
    e.preventDefault();
    return;
  }

  const finalCid = pointerResolution.targetId;
  const dragStart = LayoutEngine.createPreviewDragStartState({
    componentId: finalCid,
    selectedIds,
    clientX: e.clientX,
    clientY: e.clientY,
    getOwnDelta,
    collectSnapTargets,
    isAutolayoutChild: _isAutolayoutChild,
  });
  if (dragStart.kind !== "start") {
    e.preventDefault();
    return;
  }
  mgr.startDrag({
    ...dragStart.state,
    overrideSnapshotBefore: EditorState.captureOverrideEntries(dragStart.captureIds),
  });
  document.addEventListener("mousemove", onDragMove);
  document.addEventListener("mouseup", onDragUp);
  e.preventDefault();
}

/**
 * Check if a component is a child of an autolayout parent (v3 frame with direction).
 */
function _isAutolayoutChild(cid) {
  const parent = getParentNode(cid);
  return LayoutEngine.isAutolayoutParentLayout(parent ? parent.layout : null);
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
  LayoutEngine.renderPreviewReorderIndicator({
    svg,
    parent: parentNode.data,
    siblings: parentNode.children.map((n) => n.data),
    insertIndex,
    isVertical,
  });
}

function _clearReorderIndicator() {
  const svg = document.querySelector('#stage svg');
  if (svg) LayoutEngine.clearPreviewReorderIndicator(svg);
}

/**
 * Apply a reorder: move child `cid` to `insertIndex` within parent's children.
 * Sends a `children_order` override to the server and triggers relayout.
 */
function _applyReorder(parentId, cid, insertIndex) {
  const parentNode = model.get(parentId);
  if (!parentNode) return;
  const currentOrder = parentNode.children.map(n => n.data.id);
  const newOrder = LayoutEngine.applyReorderOrder(currentOrder, cid, insertIndex);
  if (!newOrder) return;

  // Set children_order override on the parent
  setFrameProp(parentId, 'children_order', newOrder);
}

function onDragMove(e) {
  if (!mgr.isMode(InteractionMode.DRAGGING)) return;
  const s = mgr.state;
  const autolayoutContext = s.autolayout && s.cids.length === 1
    ? LayoutEngine.resolvePreviewAutolayoutDragContext({
      componentId: s.cids[0],
      svg: document.querySelector('#stage svg'),
      clientX: e.clientX,
      clientY: e.clientY,
      getParentNode: (id) => model.getParent(id),
    })
    : null;

  LayoutEngine.dispatchPreviewDragMove({
    state: s,
    clientX: e.clientX,
    clientY: e.clientY,
    snapStep: BASELINE_STEP,
    autolayoutContext,
    showReorderIndicator: _showReorderIndicator,
    clearReorderIndicator: _clearReorderIndicator,
    resolveSnap: (cid, proposedDx, proposedDy, targets) => {
      const snap = findSnaps(cid, proposedDx, proposedDy, targets);
      return { dx: snap.snapDx, dy: snap.snapDy, lines: snap.lines };
    },
    renderGuideLines: (lines) => renderGuideLines(lines, GUIDE_COLOR, GUIDE_OPACITY),
    clampDragDelta: (cid, proposedDx, proposedDy) => {
      let nextDx = proposedDx;
      let nextDy = proposedDy;
      const parent = getParentNode(cid);
      const node = getComponentNode(cid);
      if (parent && node && parent.type !== "arrow") {
        const pEff = getEffectiveDelta(parent.id);
        const pOwn = getOwnDelta(parent.id);
        const pLeft = parent.x + pEff.dx + INSET;
        const pTop = parent.y + pEff.dy + INSET;
        const pRight = pLeft + parent.width + pOwn.dw - 2 * INSET;
        const pBottom = pTop + parent.height + pOwn.dh - 2 * INSET;
        const own = getOwnDelta(cid);
        const cW = node.width + own.dw;
        const cH = node.height + own.dh;
        const cLeft = node.x + nextDx;
        const cTop = node.y + nextDy;
        if (cLeft < pLeft) nextDx = pLeft - node.x;
        if (cTop < pTop) nextDy = pTop - node.y;
        if (cLeft + cW > pRight) nextDx = pRight - cW - node.x;
        if (cTop + cH > pBottom) nextDy = pBottom - cH - node.y;
      }
      return { dx: nextDx, dy: nextDy };
    },
    setOverride,
    applyAllOverrides,
    updateInspector,
    shouldUpdateInspector: selectedIds.has(s.cid) && selectedIds.size === 1,
  });
}

function onDragUp() {
  document.removeEventListener("mousemove", onDragMove);
  document.removeEventListener("mouseup", onDragUp);
  clearGuideLines();
  _clearReorderIndicator();
  LayoutEngine.dispatchPreviewDragCompletion({
    state: mgr.state ? {
      hasMoved: mgr.state.hasMoved,
      autolayout: mgr.state.autolayout,
      cid: mgr.state.cid,
      cids: mgr.state.cids,
      reorderTarget: mgr.state.reorderTarget,
      overrideSnapshotBefore: mgr.state.overrideSnapshotBefore,
    } : null,
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
  return LayoutEngine.readPreviewRenderedComponentBounds({
    svg,
    componentId: cid,
    fallbackNodeBounds: node ? node.data : null,
    delta: getEffectiveDelta(cid),
  });
}

function _getMultiResizeSelection(svg, idsOverride) {
  return LayoutEngine.collectPreviewMultiResizeSelection({
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
  if (!svg) return;
  // Remove old handles
  clearHandlesByClass("dg-handle");

  const multiSelection = _getMultiResizeSelection(svg);
  const handlePlan = LayoutEngine.resolvePreviewResizeHandlePlan({
    selectedCount: selectedIds.size,
    multiSelection,
    singleBounds: selectedIds.size > 1 ? null : _getRenderedComponentBounds(cid, svg),
    componentType: selectedIds.size > 1 ? null : getComponentType(cid),
  });
  if (handlePlan.kind === "none") return;
  if (handlePlan.kind === "multi") {
    renderResizeHandles(
      svg,
      handlePlan.bounds.left,
      handlePlan.bounds.top,
      handlePlan.bounds.right,
      handlePlan.bounds.bottom,
      "multi",
      {
        handleClass: "dg-handle",
        nodeAttr: "data-resize-selection",
        dirAttr: "data-resize-axis",
      },
    );
    return;
  }

  if (handlePlan.kind === "separator") {
    // Horizontal line: left and right edge handles only
    const hs = SHARED_HANDLE_SIZE;
    const ns = "http://www.w3.org/2000/svg";
    const outline = document.createElementNS(ns, "line");
    outline.setAttribute("x1", String(handlePlan.bounds.left));
    outline.setAttribute("y1", String((handlePlan.bounds.top + handlePlan.bounds.bottom) / 2));
    outline.setAttribute("x2", String(handlePlan.bounds.right));
    outline.setAttribute("y2", String((handlePlan.bounds.top + handlePlan.bounds.bottom) / 2));
    outline.setAttribute("class", "dg-handle-outline");
    outline.setAttribute("pointer-events", "none");
    svg.appendChild(outline);
    function mkEdgeHandle(cx, cy, cls, axis) {
      const r = document.createElementNS(ns, "rect");
      r.setAttribute("x", cx - hs / 2);
      r.setAttribute("y", cy - hs / 2);
      r.setAttribute("width", hs);
      r.setAttribute("height", hs);
      r.setAttribute("class", "dg-handle " + cls);
      r.setAttribute("data-resize-cid", cid);
      r.setAttribute("data-resize-axis", axis);
      svg.appendChild(r);
    }
    mkEdgeHandle(handlePlan.bounds.left, (handlePlan.bounds.top + handlePlan.bounds.bottom) / 2, "dg-handle-l", "l");
    mkEdgeHandle(handlePlan.bounds.right, (handlePlan.bounds.top + handlePlan.bounds.bottom) / 2, "dg-handle-r", "r");
  } else if (handlePlan.kind === "arrow") {
    // Arrow: show draggable waypoint handles (circles at each bend)
    showArrowWaypointHandles(cid);
  } else {
    // 2D component: all 8 handles via shared renderer
    renderResizeHandles(
      svg,
      handlePlan.bounds.left,
      handlePlan.bounds.top,
      handlePlan.bounds.right,
      handlePlan.bounds.bottom,
      cid,
      {
      handleClass: "dg-handle",
      nodeAttr: "data-resize-cid",
      dirAttr: "data-resize-axis",
      },
    );
  }
}

function removeResizeHandles() {
  clearHandlesByClass("dg-handle");
  clearHandlesByClass("dg-wp-handle");
}

// ---- Arrow waypoint handles ----

function getArrowNode(cid) {
  const node = model.get(cid);
  return (node && node.type === "arrow") ? node.data : null;
}

function _refreshSelectedArrowInspector(cid) {
  if (selectedIds.has(cid)) updateInspector(cid);
}

function _bindArrowSegmentInsertHandles(cid, eff) {
  const svg = document.querySelector("#stage svg");
  if (!svg) return;
  LayoutEngine.bindPreviewArrowSegmentInsertHandles({
    svg,
    componentId: cid,
    delta: eff,
    isSelected: selectedIds.has(cid),
    onAddWaypoint: (segmentIndex, x, y) => {
      addWaypoint(cid, segmentIndex, x, y);
    },
  });
}

function showArrowWaypointHandles(cid) {
  const svg = document.querySelector("#stage svg");
  if (!svg) return;
  // Remove old waypoint handles
  svg.querySelectorAll(".dg-wp-handle").forEach(h => h.remove());
  svg.querySelectorAll(".dg-wp-add").forEach(h => h.remove());

  const node = getArrowNode(cid);
  if (!node) return;

  const eff = getEffectiveDelta(cid);
  _bindArrowSegmentInsertHandles(cid, eff);

  const wps = node.waypoints || [];
  if (wps.length === 0) return;
  LayoutEngine.renderPreviewArrowWaypointHandles({
    svg,
    componentId: cid,
    waypoints: wps,
    delta: eff,
    onHandleMouseDown: startWpDrag,
    onHandleDoubleClick: (index) => {
      removeWaypoint(cid, index);
    },
  });
}

function startWpDrag(e) {
  const cid = e.target.getAttribute("data-wp-cid");
  const idx = parseInt(e.target.getAttribute("data-wp-idx"), 10);
  const node = getArrowNode(cid);
  if (!node || !node.waypoints || !node.waypoints[idx]) return;

  mgr.startWaypointDrag(LayoutEngine.createPreviewWaypointDragState({
    cid,
    index: idx,
    startX: e.clientX,
    startY: e.clientY,
    origX: node.waypoints[idx][0],
    origY: node.waypoints[idx][1],
  }));
  document.addEventListener("mousemove", onWpDragMove);
  document.addEventListener("mouseup", onWpDragUp);
  e.preventDefault();
  e.stopPropagation();
}

function onWpDragMove(e) {
  if (!mgr.isMode(InteractionMode.WAYPOINT_DRAGGING)) return;
  const s = mgr.state;

  const node = getArrowNode(s.cid);
  if (!node || !node.waypoints) return;

  const wps = node.waypoints;
  const idx = s.idx;
  const move = LayoutEngine.resolvePreviewWaypointDragMove({
    state: s,
    clientX: e.clientX,
    clientY: e.clientY,
    endpoints: getArrowPoints(s.cid),
    waypoints: wps,
  });
  s.hasMoved = move.hasMoved;
  s.axis = move.axis;
  if (!move.hasMoved || !move.waypoint) return;
  wps[idx] = move.waypoint;

  // Visually update the SVG lines and waypoint handle
  updateArrowVisual(s.cid);
  e.preventDefault();
}

function onWpDragUp(e) {
  document.removeEventListener("mousemove", onWpDragMove);
  document.removeEventListener("mouseup", onWpDragUp);
  const s = mgr.state;
  if (s && s.hasMoved) {
    // Prune collinear waypoints (dragged onto a straight line between neighbours)
    const wpIds = [s.cid];
    const wpBefore = EditorState.captureOverrideEntries(wpIds);
    pruneCollinearWaypoints(s.cid);
    setWaypointOverride(s.cid);
    _refreshSelectedArrowInspector(s.cid);
    EditorState.commitOverridePatchAction("Move waypoint", wpBefore, EditorState.captureOverrideEntries(wpIds));
  }
  mgr.endInteraction();
}

// Remove any waypoint that sits on a straight line between its neighbours.
// Tolerance in px – if the perpendicular distance from the waypoint to the
// line through its neighbours is below this, the waypoint is redundant.
function pruneCollinearWaypoints(cid) {
  const node = getArrowNode(cid);
  if (!node || !node.waypoints || node.waypoints.length === 0) return;
  const pruned = LayoutEngine.prunePreviewCollinearWaypoints({
    waypoints: node.waypoints,
    endpoints: getArrowPoints(cid),
  });
  if (pruned.changed) {
    node.waypoints = pruned.waypoints;
    rebuildArrowSVG(cid);
    showArrowWaypointHandles(cid);
  }
}

function addWaypoint(cid, segIdx, x, y) {
  const node = getArrowNode(cid);
  if (!node) return;
  const addWpIds = [cid];
  const addWpBefore = EditorState.captureOverrideEntries(addWpIds);
  node.waypoints = LayoutEngine.insertPreviewWaypoint(node.waypoints || [], segIdx, x, y);
  rebuildArrowSVG(cid);
  showArrowWaypointHandles(cid);
  setWaypointOverride(cid);
  _refreshSelectedArrowInspector(cid);
  EditorState.commitOverridePatchAction("Add waypoint", addWpBefore, EditorState.captureOverrideEntries(addWpIds));
}

function removeWaypoint(cid, idx) {
  const node = getArrowNode(cid);
  if (!node || !node.waypoints || node.waypoints.length <= 1) return;
  const rmWpIds = [cid];
  const rmWpBefore = EditorState.captureOverrideEntries(rmWpIds);
  const nextWaypoints = LayoutEngine.removePreviewWaypoint(node.waypoints, idx);
  if (!nextWaypoints) return;
  node.waypoints = nextWaypoints;
  rebuildArrowSVG(cid);
  showArrowWaypointHandles(cid);
  setWaypointOverride(cid);
  _refreshSelectedArrowInspector(cid);
  EditorState.commitOverridePatchAction("Remove waypoint", rmWpBefore, EditorState.captureOverrideEntries(rmWpIds));
}

function getArrowPoints(cid) {
  const svg = document.querySelector("#stage svg");
  if (!svg || !getArrowNode(cid)) return [];
  return LayoutEngine.readPreviewArrowEndpoints({
    svg,
    componentId: cid,
  }) || [];
}

function updateArrowVisual(cid) {
  const svg = document.querySelector("#stage svg");
  if (!svg) return;
  const node = getArrowNode(cid);
  if (!node) return;
  LayoutEngine.updatePreviewArrowSvg({
    svg,
    componentId: cid,
    waypoints: node.waypoints || [],
    delta: getEffectiveDelta(cid),
    headLen: window.__DG_CONFIG.head_len,
    headHalf: window.__DG_CONFIG.head_half,
  });
}

function rebuildArrowSVG(cid) {
  const svg = document.querySelector("#stage svg");
  if (!svg) return;
  const node = getArrowNode(cid);
  if (!node) return;
  LayoutEngine.rebuildPreviewArrowSvg({
    svg,
    componentId: cid,
    waypoints: node.waypoints || [],
    headLen: window.__DG_CONFIG.head_len,
    headHalf: window.__DG_CONFIG.head_half,
    color: "#E95420",
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
  const ctm = svg.getScreenCTM();
  const plan = LayoutEngine.resolvePreviewTextEditStartState({
    groups: LayoutEngine.collectPreviewTextEditingGroups(svg, cid),
    headingText: (node && node.data.heading_text) || "",
    labelText: (node && node.data.label_text) || [],
    targetedTextEl: opts && opts.textEl ? opts.textEl : null,
    iconSize: window.__DG_CONFIG.icon_size,
    columnGap: window.__DG_CONFIG.col_gap,
    svgScale: ctm ? ctm.a : 1,
  });
  if (!plan) return;

  const ta = document.createElement("textarea");
  ta.className = "dg-text-editor";
  ta.value = plan.semanticLines.join("\n");
  ta.style.left = plan.editorLeft + "px";
  ta.style.top = plan.editorTop + "px";
  ta.style.width = plan.editorWidth + "px";
  ta.style.minHeight = plan.editorMinHeight + "px";
  ta.style.fontSize = (plan.style.fontSize * (ctm ? ctm.a : 1)) + "px";
  ta.style.lineHeight = (plan.style.lineHeight * (ctm ? ctm.a : 1)) + "px";
  ta.style.fontWeight = plan.style.fontWeight;
  ta.style.color = plan.style.fill;
  ta.style.caretColor = plan.style.fill;
  ta.style.backgroundColor = plan.backgroundColor;
  ta.style.fontFamily = plan.style.fontFamily;
  if (plan.style.letterSpacing) ta.style.letterSpacing = plan.style.letterSpacing;
  if (plan.style.fontVariantCaps) ta.style.fontVariantCaps = plan.style.fontVariantCaps;
  document.body.appendChild(ta);

  ta.focus();
  ta.select();

  // Hide only the targeted rendered text block while editing.
  plan.textEl.style.opacity = "0";
  _suspendSelectionChromeForTextEdit(svg);

  mgr.startTextEdit({
    cid,
    textEl: plan.textEl,
    editor: {
      role: plan.blockRole,
      ta,
      originalValue: ta.value,
    },
    hasHeading: plan.hasHeading,
  });

  ta.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      ev.stopPropagation();
      cancelTextEdit();
    } else if (ev.key === "Enter" && ev.ctrlKey) {
      ev.preventDefault();
      commitTextEdit();
    }
    ev.stopPropagation();
  });
  ta.addEventListener("blur", _scheduleTextEditCommit);

  e.stopPropagation();
}

function commitTextEdit() {
  if (!mgr.isMode(InteractionMode.TEXT_EDITING)) return;
  const { cid, textEl, editor } = mgr.state;
  const resolution = LayoutEngine.resolvePreviewTextEditCommit({
    currentValue: editor ? editor.ta.value : "",
    originalValue: editor ? editor.originalValue : "",
    existingText: model.overrides[cid] && model.overrides[cid].text && typeof model.overrides[cid].text === "object"
      ? model.overrides[cid].text
      : {},
    role: editor ? editor.role : "label",
  });

  if (resolution.changed && resolution.nextTextOverride) {
    const editIds = [cid];
    const editBefore = EditorState.captureOverrideEntries(editIds);
    setOverride(cid, { text: resolution.nextTextOverride });
    EditorState.commitOverridePatchAction("Edit text", editBefore, EditorState.captureOverrideEntries(editIds));
  }

  if (editor) editor.ta.remove();
  if (textEl) textEl.style.opacity = "";

  mgr.endInteraction();
  reapplySelection();

  // Trigger server relayout to re-wrap text at the correct frame width
  // and resize the box if needed (HUG height).
  if (resolution.changed) {
    clearTimeout(_v3RelayoutTimer);
    _v3RelayoutTimer = setTimeout(() => requestV3Relayout(cid), 100);
  }
}

function cancelTextEdit() {
  if (!mgr.isMode(InteractionMode.TEXT_EDITING)) return;
  if (mgr.state.textEl) mgr.state.textEl.style.opacity = "";
  if (mgr.state.editor) mgr.state.editor.ta.remove();
  mgr.endInteraction();
  reapplySelection();
}

function startResize(e) {
  const handle = e.target;
  const startPlan = LayoutEngine.createPreviewResizeStartState({
    selectionToken: handle.getAttribute("data-resize-selection"),
    componentId: handle.getAttribute("data-resize-cid"),
    axis: handle.getAttribute("data-resize-axis"),
    clientX: e.clientX,
    clientY: e.clientY,
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
  });
  if (startPlan.kind !== "start") {
    e.preventDefault();
    e.stopPropagation();
    return;
  }
  mgr.startResize({
    ...startPlan.state,
    overrideSnapshotBefore: EditorState.captureOverrideEntries(startPlan.touchedIds),
  });
  document.addEventListener("mousemove", onResizeMove);
  document.addEventListener("mouseup", onResizeUp);
  e.preventDefault();
  e.stopPropagation();
}

function _collectRecursiveRelayoutEntries(parentId, parentDelta, origOverrides) {
  return LayoutEngine.collectRecursiveRelayoutEntries({
    parentId,
    parentDelta,
    relayoutChildren(relayoutParentId, relayoutParentDelta) {
      return model.relayoutChildren(
        relayoutParentId,
        relayoutParentDelta.dx,
        relayoutParentDelta.dy,
        relayoutParentDelta.dw,
        relayoutParentDelta.dh,
        origOverrides,
      );
    },
    hasLayoutChildren(id) {
      return _hasLayoutChildren(id);
    },
  });
}

function _restorePropagatedResizeOverrides(state) {
  if (!state.propagatedIds || state.propagatedIds.size === 0) return;
  _applyInteractionOverrideEntries(
    LayoutEngine.createOriginalOverrideEntries(state.propagatedIds, state.origOverrides),
  );
  state.propagatedIds.clear();
}

// ---------------------------------------------------------------------------
// Live v3 resize relayout — runs the TS engine each animation frame so the
// diagram responds smoothly while the user drags a resize handle.
// ---------------------------------------------------------------------------
let _resizeRafId = null;
let _resizeLatest = null;

function _scheduleV3ResizeRelayout(cid, newW, newH, resizedW, resizedH) {
  // ELK diagrams must not run box autolayout during live resize — it corrupts
  // ELK positions/routes. Visual feedback comes from applyAllOverrides(); full
  // ELK relayout runs on mouseup via requestV3Relayout().
  if (ElkPreviewController.isElkLayeredDiagram()) {
    return;
  }
  _resizeLatest = { cid, newW, newH, resizedW, resizedH };
  if (_resizeRafId) return; // already scheduled for next paint frame
  _resizeRafId = requestAnimationFrame(() => {
    _resizeRafId = null;
    const st = _resizeLatest;
    if (!st) return;
    _resizeLatest = null;

    // Build temporary overrides with the tentative sizing
    const tmpOverrides = {};
    for (const [fid, ovr] of Object.entries(overrides)) {
      tmpOverrides[fid] = Object.assign({}, ovr);
    }
    if (!tmpOverrides[st.cid]) tmpOverrides[st.cid] = {};
    if (st.resizedW) {
      tmpOverrides[st.cid].width = st.newW;
      tmpOverrides[st.cid].sizing_w = "FIXED";
    }
    if (st.resizedH) {
      tmpOverrides[st.cid].height = st.newH;
      tmpOverrides[st.cid].sizing_h = "FIXED";
    }
    // Clear dx/dy/dw/dh deltas — they're baked into width/height
    delete tmpOverrides[st.cid].dx;
    delete tmpOverrides[st.cid].dy;
    delete tmpOverrides[st.cid].dw;
    delete tmpOverrides[st.cid].dh;

    const gridOvr = EditorState.normalizeGridOverrides(model.gridOverrides || {});
    const relayoutStatus = getV3RelayoutStatus();
    if (!relayoutStatus.localReady) return;
    performLocalRelayout(model, tmpOverrides, gridOvr, { skipModelUpdate: true });
  });
}

function _cancelV3ResizeRelayout() {
  if (_resizeRafId) {
    cancelAnimationFrame(_resizeRafId);
    _resizeRafId = null;
  }
  _resizeLatest = null;
}

function onResizeMove(e) {
  if (!mgr.isMode(InteractionMode.RESIZING)) return;
  const s = mgr.state;
  const node = model.get(s.cid);
  const gridTargets = _gridSnapTargets();
  const svgEl = document.querySelector("#stage svg");
  const svgW = svgEl ? parseFloat(svgEl.getAttribute("width") || "0") : 0;
  const svgH = svgEl ? parseFloat(svgEl.getAttribute("height") || "0") : 0;
  LayoutEngine.dispatchPreviewResizeMove({
    state: s,
    clientX: e.clientX,
    clientY: e.clientY,
    gridTargets,
    svgW,
    svgH,
    snapStep: BASELINE_STEP,
    nodeBounds: node ? {
      x: node.data.x,
      y: node.data.y,
      width: node.data.width,
      height: node.data.height,
    } : null,
    hasLayoutChildren: _hasLayoutChildren(s.cid),
    hasLayoutContext: Boolean(node && (
      (node.parent && node.parent.layout) ||
      (!node.parent && model.diagramGrid)
    )),
    isSelected: selectedIds.has(s.cid),
    hideHandles: () => {
      if (svgEl) svgEl.querySelectorAll(".dg-handle").forEach(h => h.style.display = "none");
    },
    renderGuideLines: (lines) => renderGuideLines(lines, GUIDE_COLOR, GUIDE_OPACITY),
    clearGuideLines,
    restorePropagatedResizeOverrides: _restorePropagatedResizeOverrides,
    applyInteractionOverrideEntries: _applyInteractionOverrideEntries,
    applyAllOverrides,
    renderSelectionInspector,
    updateInspector,
    setOverride,
    collectRecursiveRelayoutEntries: (parentId, parentDelta, origOverrides) => {
      return _collectRecursiveRelayoutEntries(parentId, parentDelta, origOverrides);
    },
    relayoutSiblingsAfterChildResize: (cid, rightEdgeDelta, bottomEdgeDelta) => {
      return model.relayoutSiblingsAfterChildResize(cid, rightEdgeDelta, bottomEdgeDelta);
    },
    scheduleV3ResizeRelayout: _scheduleV3ResizeRelayout,
  });
}

function _persistResizeToV3(resizeIds, propagatedIds, triggerCid) {
  const items = resizeIds.map((cid) => {
    const node = model.get(cid);
    if (!node) return null;
    return {
      id: cid,
      baseW: node.data.width,
      baseH: node.data.height,
      delta: getOwnDelta(cid),
    };
  }).filter(Boolean);
  const plan = LayoutEngine.createResizePersistencePlan({
    items,
    propagatedIds,
    minSize: 8,
  });

  for (const entry of plan.entries) {
    if (!overrides[entry.id]) overrides[entry.id] = {};
    if (entry.sizingWFixed) {
      overrides[entry.id].width = entry.width;
      overrides[entry.id].sizing_w = "FIXED";
    }
    if (entry.sizingHFixed) {
      overrides[entry.id].height = entry.height;
      overrides[entry.id].sizing_h = "FIXED";
    }
    setOverride(entry.id, { dx: 0, dy: 0, dw: 0, dh: 0 });
  }

  for (const pid of plan.resetIds) {
    setOverride(pid, { dx: 0, dy: 0, dw: 0, dh: 0 });
  }

  if (plan.shouldTriggerRelayout) {
    requestV3Relayout(triggerCid);
  }
}

function onResizeUp() {
  _cancelV3ResizeRelayout();
  document.removeEventListener("mousemove", onResizeMove);
  document.removeEventListener("mouseup", onResizeUp);
  clearGuideLines();
  // Clear any hover effects that accumulated during the drag
  const svg = document.querySelector("#stage svg");
  if (svg) svg.querySelectorAll(".dg-hover").forEach(el => el.classList.remove("dg-hover"));
  LayoutEngine.dispatchPreviewResizeCompletion({
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
  return LayoutEngine.normalizePreviewStyleName(styleName);
}

/**
 * v3 style override: applies level/fill/border style fields and triggers relayout.
 */
function applyV3Style(cid, styleName) {
  const v3StyleIds = [cid];
  const v3StyleBefore = EditorState.captureOverrideEntries(v3StyleIds);
  const changed = LayoutEngine.applyVisiblePreviewStyleOverride({
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
  const nextState = LayoutEngine.applySelectionStateMutation({
    selectedIds: [...selectedIds],
    selectionDepth,
  }, { kind: 'clear' });
  _applySelectionStateSnapshot(nextState);
}

function _applySelectionStateSnapshot(nextState, preferredCid) {
  selectedIds.clear();
  nextState.selectedIds.forEach((id) => selectedIds.add(id));
  selectionDepth = nextState.selectionDepth;
  _syncSelectionUi(preferredCid);
}

function _syncSelectionUi(preferredCid) {
  const svg = document.querySelector("#stage svg");
  if (svg) {
    svg.querySelectorAll(".dg-selected").forEach(el => el.classList.remove("dg-selected"));
    selectedIds.forEach((id) => {
      svg.querySelectorAll('[data-component-id="' + id + '"]')
        .forEach((g) => g.classList.add("dg-selected"));
    });
  }
  LayoutEngine.syncPreviewTreeSelectionState(document, selectedIds);

  if (selectedIds.size === 0) {
    removeResizeHandles();
    renderEmptyInspector();
    return;
  }

  removeResizeHandles();
  const primary = getPrimarySelectedId(preferredCid);
  if (primary) {
    showResizeHandles(primary);
  }
  renderSelectionInspector(primary);
}

function selectComponent(cid, additive) {
  const nextState = additive
    ? LayoutEngine.applySelectionStateMutation({
      selectedIds: [...selectedIds],
      selectionDepth,
    }, { kind: 'toggle', targetId: cid })
    : LayoutEngine.applySelectionStateMutation({
      selectedIds: [...selectedIds],
      selectionDepth,
    }, { kind: 'replace', targetId: cid, nextSelectionDepth: getAncestors(cid).length });
  _applySelectionStateSnapshot(nextState, cid);
}

function reapplySelection() {
  _syncSelectionUi();
}

function clearSelection() {
  deselectAll();
}

function setFrameAlign(cid, align) {
  const faIds = [cid];
  const faBefore = EditorState.captureOverrideEntries(faIds);
  if (!overrides[cid]) overrides[cid] = {};
  overrides[cid].align = align;
  setDirty(true);
  EditorState.commitOverridePatchAction("Change alignment", faBefore, EditorState.captureOverrideEntries(faIds));
  renderSelectionInspector(cid);
  // Trigger v3 relayout so alignment change takes effect immediately
  clearTimeout(_v3RelayoutTimer);
  _v3RelayoutTimer = setTimeout(() => requestV3Relayout(cid), 300);
}
// Expose to onclick handlers
window.setFrameAlign = setFrameAlign;

let _v3RelayoutTimer = null;
function setFrameProp(cid, prop, value) {
  const fpIds = [cid];
  const fpBefore = EditorState.captureOverrideEntries(fpIds);
  const result = LayoutEngine.applySingleFramePropMutation({
    overrides,
    coercedKeys: _coercedKeys,
    cid,
    prop,
    value,
    node: model.get(cid),
    snapToGrid,
  });

  setDirty(true);
  let label = 'Change ' + prop;
  if (result.kind === 'clear' && prop !== 'gap_delta') {
    label = 'Clear ' + prop;
  }
  EditorState.commitOverridePatchAction(label, fpBefore, EditorState.captureOverrideEntries(fpIds));

  // Debounce relayout — 300ms after last change
  clearTimeout(_v3RelayoutTimer);
  _v3RelayoutTimer = setTimeout(() => requestV3Relayout(cid), 300);

  // Update inspector immediately for responsive feel
  renderSelectionInspector(cid);
}

// Track which override keys were set by engine coercion (not user action).
// Format: Set of "fid:key" strings, e.g. "root:sizing_h"
const _coercedKeys = new Set();

async function requestV3Relayout(triggerCid) {
  const relayoutStatus = getV3RelayoutStatus();
  return LayoutEngine.runPreviewRelayout({
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

// Expose to inline handlers
window.setFrameProp = setFrameProp;

/**
 * Set an explicit width or height value, converting from the current
 * inspector unit (px, cols, rows) to pixels.
 */
function setFrameSize(cid, dimension, value) {
  const px = LayoutEngine.resolvePreviewFrameSizePx({
    dimension,
    value,
    gridInfo,
    widthUnit: _inspectorWidthUnit,
    heightUnit: _inspectorHeightUnit,
    baselineStep: BASELINE_STEP,
  });
  if (px == null) return;
  const fpIds = [cid];
  const fpBefore = EditorState.captureOverrideEntries(fpIds);
  LayoutEngine.applySingleFrameSizeMutation({
    overrides,
    coercedKeys: _coercedKeys,
    cid,
    dimension,
    px,
  });
  setDirty(true);
  EditorState.commitOverridePatchAction("Set " + dimension, fpBefore, EditorState.captureOverrideEntries(fpIds));
  clearTimeout(_v3RelayoutTimer);
  _v3RelayoutTimer = setTimeout(() => requestV3Relayout(cid), 300);
  renderSelectionInspector(cid);
}
window.setFrameSize = setFrameSize;

function setWidthUnit(unit, cid) {
  _inspectorWidthUnit = LayoutEngine.normalizePreviewInspectorWidthUnit(unit, gridInfo);
  if (cid) renderSelectionInspector(cid);
}
window.setWidthUnit = setWidthUnit;

function setHeightUnit(unit, cid) {
  _inspectorHeightUnit = unit;
  if (cid) renderSelectionInspector(cid);
}
window.setHeightUnit = setHeightUnit;

function updateInspector(cid) {
  const inspector = getInspectorElement();
  if (!inspector) {
    return;
  }
  const inspNode = model.get(cid);
  const arrowNode = getArrowNode(cid);
  const own = getOwnDelta(cid);
  const eff = getEffectiveDelta(cid);
  const renderedStyle = _readRenderedStyleFields(cid);
  inspector.innerHTML = LayoutEngine.renderPreviewSingleSelectionInspector({
    cid,
    node: inspNode,
    arrowNode,
    override: overrides[cid] || {},
    ownDelta: own,
    effectiveDelta: eff,
    componentType: getComponentType(cid),
    parentLayout: getParentNode(cid)?.layout || null,
    renderedStyle,
    violations: getViolationsForComponent(cid),
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
  const clearIds = [cid];
  const clearBefore = EditorState.captureOverrideEntries(clearIds);
  const hadWaypoints = overrides[cid] && overrides[cid].waypoints;
  model.clearOverride(cid);
  setDirty(true);
  const restoreArrowFromTree = () => {
    loadTree().then(() => {
      rebuildArrowSVG(cid);
      applyAllOverrides();
      if (selectedIds.has(cid)) updateInspector(cid);
    });
  };
  if (hadWaypoints) {
    const relayoutStatus = getV3RelayoutStatus();
    if (relayoutStatus.localReady) {
      Promise.resolve(requestV3Relayout(cid)).then((restored) => {
        if (restored === false) {
          restoreArrowFromTree();
          return;
        }
        if (selectedIds.has(cid)) updateInspector(cid);
      });
    } else {
      restoreArrowFromTree();
    }
  } else {
    applyAllOverrides();
    if (selectedIds.has(cid)) updateInspector(cid);
  }
  EditorState.commitOverridePatchAction("Clear override", clearBefore, EditorState.captureOverrideEntries(clearIds));
}

function updateOverrideSummary() {
  const el = document.getElementById("override-summary");
  if (!el) return;
  el.textContent = LayoutEngine.formatPreviewOverrideSummary(Object.keys(overrides).length);
}

function refreshTreeColors() {
  LayoutEngine.syncPreviewTreeOverrideState(document, overrides);
}

// Keyboard shortcuts: Ctrl+S to save, Ctrl+Z to undo, Ctrl+Shift+Z/Ctrl+Y to redo, arrows to nudge
function onDocumentKeyDown(e) {
  const tag = (e.target && e.target.tagName) || "";
  const isEditableTarget = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target.isContentEditable;
  const selectedIdList = [...selectedIds];
  LayoutEngine.dispatchPreviewKeyboardShortcut({
    key: e.key,
    ctrlKey: e.ctrlKey,
    shiftKey: e.shiftKey,
    metaKey: e.metaKey,
    altKey: e.altKey,
    isEditableTarget,
    selectedIds: selectedIdList,
    selectionDepth,
    isBusy: mgr.isBusy,
    isTextEditing: mgr.isMode(InteractionMode.TEXT_EDITING),
    isDragging: mgr.isMode(InteractionMode.DRAGGING),
    isResizing: mgr.isMode(InteractionMode.RESIZING),
    hasAutolayoutSelection: selectedIdList.some((id) => _isAutolayoutChild(id)),
    preventDefault: () => e.preventDefault(),
    toggleSidebar: (sidebar) => {
      const app = document.querySelector(".dg-preview-app");
      if (!app) return;
      app.classList.toggle(sidebar === "nav" ? "is-nav-hidden" : "is-aside-hidden");
    },
    save: () => PreviewSaveClient.trySaveIfDirty(),
    undo: () => { void EditorState.undo(_applyUndoCommand); },
    redo: () => { void EditorState.redo(_applyUndoCommand); },
    deleteSelection: () => deleteSelectedFrames(),
    cancelTextEdit,
    cancelDrag: () => {
      clearGuideLines();
      document.removeEventListener("mousemove", onDragMove);
      document.removeEventListener("mouseup", onDragUp);
      mgr.endInteraction();
    },
    cancelResize: () => {
      clearGuideLines();
      document.removeEventListener("mousemove", onResizeMove);
      document.removeEventListener("mouseup", onResizeUp);
      const svg = document.querySelector("#stage svg");
      if (svg) svg.querySelectorAll(".dg-handle").forEach(h => h.style.display = "");
      mgr.endInteraction();
    },
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

document.addEventListener("keydown", onDocumentKeyDown);

// Undo/Redo button event listeners
document.getElementById("btn-undo").addEventListener("click", () => {
  void EditorState.undo(_applyUndoCommand);
});
document.getElementById("btn-redo").addEventListener("click", () => {
  void EditorState.redo(_applyUndoCommand);
});

// Test/debug facade for in-repo browser coverage. This remains a thin shell
// over the extracted modules rather than reviving legacy top-level globals.
window.__DG_TEST_preview = Object.freeze({
  saveOverrides: () => PreviewSaveClient.saveOverrides(),
  undo: () => EditorState.undo(_applyUndoCommand),
  redo: () => EditorState.redo(_applyUndoCommand),
  canUndo: () => EditorState.canUndo(),
  canRedo: () => EditorState.canRedo(),
});

// Warn before leaving with unsaved changes.
// Internal diagram navigation uses its own confirm path and suppresses this.
// beforeunload wiring lives in PreviewSaveClient.init().

// ---- Constraint validation ----

function runConstraints() {
  const svg = document.querySelector("#stage svg");
  lastViolations = constraints.validate(model, svg);
  updateConstraintUI();
}

function updateConstraintUI() {
  const summary = constraints.summarise(lastViolations);
  const el = document.getElementById("constraint-status");
  PreviewSaveClient.syncSaveButton(summary.errors);
  if (!el) return;
  LayoutEngine.syncPreviewConstraintStatus(el, summary);
}

function getViolationsForComponent(cid) {
  return constraints.forComponent(lastViolations, cid);
}

// ---- SSE ----

LayoutEngine.initPreviewShellCoordinator({
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
initNavTabs();
LayoutEngine.ensurePreviewEditorState(window, {
  getOverrides: () => overrides,
  getGridOverrides: () => model.gridOverrides,
  getElkLayoutOverrides: () => model.elkLayoutOverrides || {},
  getRemovedIds: () => model.removedIds,
  getFrameTree: () => (typeof getFrameTreeJson === "function" ? getFrameTreeJson() : null),
});
LayoutEngine.ensurePreviewElkPreviewController(window, {
  getElkLayoutOverrides: () => model.elkLayoutOverrides || {},
  setElkLayoutOverrides: (value) => {
    model.elkLayoutOverrides = { ...value };
  },
  getRootId: () => (model.roots[0] || {}).id || "root",
  requestV3Relayout: (cid) => requestV3Relayout(cid),
});
LayoutEngine.initPreviewSaveClient({
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
LayoutEngine.initPreviewOverrideToolbar({
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
      overrides = {};
      _coercedKeys.clear();
      setDirty(true);
    });
    applyAllOverrides();
    renderSelectionInspector();
  },
});
LayoutEngine.registerPreviewPageshowReload({
  addPageshowListener: (handler) => {
    window.addEventListener("pageshow", handler);
  },
  reloadDiagram: () => loadSVG(),
});
void loadSVG();
LayoutEngine.connectPreviewSse({
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
LayoutEngine.initPreviewViewModes({
  document,
  slug: SLUG,
  hasReference: Boolean(window.__DG_CONFIG.has_reference),
});

// ---- Left sidebar tabs (Browse / Layers) ----
// Handled by initNavTabs() in editor-base.js via initPreviewShell().
