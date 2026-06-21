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
var _editorBootstrapFacade = null;
var _editorSceneFacade = null;
var _editorInteractionFacade = null;
var _relayoutRuntime = null;
var _liveResizeRuntime = null;

function replaceOverrides(nextOverrides) {
  overrides = nextOverrides || {};
  model.overrides = overrides;
  _editorInteractionFacade = null;
  _editorRelayoutFacade = null;
  _stateRestoreRuntime = null;
  _relayoutRuntime = null;
  _liveResizeRuntime = null;
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

// ---- Alignment snap guides ----
// Snap primitives (snapEdgeToTarget, collectGridSnapTargets, collectPeerSnapTargets,
// snapRectToTargets, renderGuideLines, clearGuideLines) are shared via editor-base.js.
// This file keeps only grid-model-aware wrappers that depend on `model` and the typed grid runtime.
const GUIDE_COLOR = UI_AUTHORING_ACCENT_LINE;
const GUIDE_OPACITY = "0.5";

/**
 * Collect snap targets from peer components AND the Brockman grid.
 * Uses the grid model (not available in force mode) for peer lookups.
 */
function collectSnapTargets(dragCid) {
  return window.__DG_getPreviewShellInteractionContract().collectPreviewSnapTargets({
    dragId: dragCid,
    gridInfo: _getEditorSceneFacade().getGridRuntime().getGridInfo(),
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
  return collectGridSnapTargets(_getEditorSceneFacade().getGridRuntime().getGridInfo());
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

function _snapshotNeedsLayoutRelayout(snapshot) {
  return window.__DG_getPreviewBridgeRelayoutContract().snapshotNeedsPreviewRelayout({
    snapshot,
    getNode: (cid) => model.get(cid),
    hasRelayoutFrameOverride: (entry) => _hasLayoutRelayoutFrameOverride(entry),
  });
}

function _snapshotNeedsV3Relayout(snapshot) {
  return _snapshotNeedsLayoutRelayout(snapshot);
}

function _clearPendingRestoreRuntime() {
  _getEditorSceneFacade().clearPendingRelayout();
  clearTimeout(_layoutRelayoutTimer);
  EditorState.setPendingGridAction(null);
}

function _applyLocalRestoreRefresh(syncGridControls = false) {
  _getEditorSceneFacade().applyLocalRestoreRefresh(syncGridControls);
}

let _stateRestoreRuntime = null;
let _editorRelayoutFacade = null;
function _getEditorSceneFacade() {
  if (_editorSceneFacade) return _editorSceneFacade;
  const previewShellScene = window.__DG_getPreviewShellSceneContract();
  _editorSceneFacade = previewShellScene.createPreviewEditorSceneFacadeFromRuntime({
    shared: {
      document,
      guideModes: GUIDE_MODES,
      baselineStep: BASELINE_STEP,
      slug: SLUG,
      model,
      selectedIds,
      editorState: EditorState,
      getOverrides: () => overrides,
    },
    contracts: {
      previewShellScene,
      previewBridgeRender: window.__DG_getPreviewBridgeRenderContract(),
    },
    gridRuntime: {
      pruneLinkedRootOverrides: _pruneLinkedRootGridOverrides,
      setDirty,
      requestRelayout: (triggerCid) => requestLayoutRelayout(triggerCid),
      scheduleRelayout: (callback, delayMs) => setTimeout(callback, delayMs),
      clearRelayoutTimer: (timerId) => {
        clearTimeout(timerId);
      },
      setTimeoutFn: (callback, delayMs) => setTimeout(callback, delayMs),
    },
    sceneRefresh: {
      buildTreeUi: () => buildTreeUI(),
      bindInteraction: () => bindInteraction(),
      reapplySelection: () => reapplySelection(),
      renderSelectionInspector: () => renderSelectionInspector(),
    },
    waypointOverrides: {
      getOverrides: () => overrides,
      getArrowNode: (cid) => getArrowNode(cid),
      rebuildArrowSvg: (cid) => rebuildArrowSVG(cid),
    },
    overrideApplication: {
      getComponentTree: () => model._roots.map((node) => node.data),
      getRootNodes: () => model._roots
        .filter((node) => node.type !== "arrow")
        .map((node) => ({ id: node.id, gridRow: node.gridRow })),
      getRelayoutStatus: () => getLayoutRelayoutStatus(),
      boxStyles: BOX_STYLES,
      inset: window.__DG_CONFIG.inset || 8,
      iconSize: window.__DG_CONFIG.icon_size || 48,
      gridStep: BASELINE_STEP,
      hasDiagramGrid: () => Boolean(model.diagramGrid),
      getNode: (cid) => model.get(cid),
      getOwnDelta: (cid) => getOwnDelta(cid),
      getEffectiveDelta: (cid) => getEffectiveDelta(cid),
      isFrameManagedTarget: (target, nextRelayoutStatus) => (
        window.__DG_getPreviewBridgeRelayoutContract().isPreviewFrameManagedTarget({
          target,
          relayoutStatus: nextRelayoutStatus || getLayoutRelayoutStatus(),
          getNode: (cid) => model.get(cid),
        })
      ),
      showResizeHandles: (cid) => showResizeHandles(cid),
    },
    rerenderStageFromModel: {
    },
    frameDelete: {
      selectedIds,
      isTextEditing: () => mgr.isMode(InteractionMode.TEXT_EDITING),
      getFrameTreeJson: _readFrameTreeJson,
      getRootNodes: () => model.roots,
      fallbackRootId: "page",
      getNode: (id) => model.get(id),
      beginUndoableAction: (label) => EditorState.beginUndoableAction(label),
      markRemoved: (id) => model.removedIds.add(id),
      clearOverride: (id) => model.clearOverride(id),
      unselect: (id) => selectedIds.delete(id),
      setDirty,
      deselectAll: () => deselectAll(),
      commitUndoableAction: (action) => EditorState.commitUndoableAction(action),
      alert: (message) => alert(message),
    },
    artboard: {
      getRoots: () => model.roots,
      padding: 24,
    },
    overrideSummary: {
      getOverrideCount: () => Object.keys(overrides).length,
    },
    treeOverrideState: {
    },
    constraints: {
      validateConstraints: (nextModel, svg) => constraints.validate(nextModel, svg),
      summarizeViolations: (violations) => constraints.summarise(violations),
      setLastViolations: (violations) => {
        lastViolations = violations;
      },
      syncSaveButton: (errorCount) => PreviewSaveClient.syncSaveButton(errorCount),
    },
  });
  return _editorSceneFacade;
}

function _getEditorBootstrapFacade() {
  if (_editorBootstrapFacade) return _editorBootstrapFacade;
  const previewShellBootstrap = window.__DG_getPreviewShellBootstrapContract();
  const previewBridgeHost = _getPreviewBridgeHostContract();
  const previewBridgeRender = window.__DG_getPreviewBridgeRenderContract();
  _editorBootstrapFacade = previewShellBootstrap.createPreviewEditorBootstrapFacadeFromRuntime({
    shared: {
      document,
      previewWindow: window,
      slug: SLUG,
      stage: document.getElementById("stage"),
      engine: ACTIVE_LAYOUT_ENGINE,
      gridEnabled: GRID,
      model,
      selectedIds,
      getOverrides: () => overrides,
      getFrameTree: _readFrameTreeJson,
      previewSaveClient: PreviewSaveClient,
      editorState: EditorState,
    },
    contracts: {
      previewBridgeHost,
      previewBridgeRender,
    },
    componentTree: {
      readPreviewDocument: () => _readPreviewDocumentJson(),
      fetchTree: () => fetch("/api/tree/" + SLUG + "?t=" + Date.now(), { cache: "no-store" }),
      readFrameTreeJson: () => _readFrameTreeJson(),
      syncArrowsInModel: typeof syncArrowsInModel === "function" ? syncArrowsInModel : null,
      arrowComponentId: typeof arrowComponentId === "function" ? arrowComponentId : null,
    },
    svgLoad: {
      deselectAll: () => deselectAll(),
      isEngineLayoutActive: _isPreviewEngineShellLayoutActive,
      resetOverrideState,
      initEnginePanel: _initPreviewEngineShellPanel,
      getLocalRelayoutStatus: _getLocalBridgeRelayoutStatus,
      escapeHtml,
      loadGridInfo: (canonicalState) => loadGridInfo(canonicalState),
      gridState: {
        getGridInfo: () => _getEditorSceneFacade().getGridRuntime().getGridInfo(),
        setDiagramGrid: (nextGridInfo) => model.setDiagramGrid(nextGridInfo),
        getGridOverrides: () => model.gridOverrides,
        pruneLinkedRootGridOverrides: _pruneLinkedRootGridOverrides,
      },
      populateGridControls: () => populateGridControls(),
      applyWaypointOverrides: () => applyWaypointOverrides(),
      applyAllOverrides: () => applyAllOverrides(),
      bindInteraction: () => bindInteraction(),
      renderGridOverlay: () => renderGridOverlay(),
      selectionState: {
        selectedIds,
        reapplySelection: () => reapplySelection(),
      },
      runConstraints: () => runConstraints(),
      fitRenderedSvgToContent: typeof fitSvgToRenderedContent === "function"
        ? fitSvgToRenderedContent
        : null,
    },
    navigation: {
      isDirty: () => PreviewSaveClient.isDirty(),
      setAllowInternalDirtyNavigation: (allowed) => {
        _allowInternalDirtyNavigation = allowed;
      },
      dirtyConfirmMessage: DIRTY_DIAGRAM_NAV_CONFIRM,
    },
    runtimeBootstrap: {
      reapplySelection: () => reapplySelection(),
      onDocumentKeyDown: (event) => onDocumentKeyDown(event),
      applyUndoCommand: _applyUndoCommand,
      initNavTabs,
      requestLayoutRelayout: (triggerCid) => requestLayoutRelayout(triggerCid),
      requestV3Relayout: (triggerCid) => requestV3Relayout(triggerCid),
      getLayoutRelayoutStatus: () => getLayoutRelayoutStatus(),
      getV3RelayoutStatus: () => getV3RelayoutStatus(),
      getLayoutRelayoutRuntime: () => _getEditorRelayoutFacade().layoutRuntimeState,
      getV3RelayoutRuntime: () => _getEditorRelayoutFacade().layoutRuntimeState,
      constraints,
      lastViolations,
      runConstraints: () => runConstraints(),
      clearCoercedKeys: () => _coercedKeys.clear(),
      setStatus,
      sanitizeSvgCloneForExport,
      allowInternalDirtyNavigationState: {
        get: () => _allowInternalDirtyNavigation,
      },
      writeClipboardText: (text) => navigator.clipboard.writeText(text),
      alert,
      confirmClearAll: confirm,
      onClearAllOverrides: () => {
        EditorState.runUndoableAction("Clear all overrides", () => {
          replaceOverrides({});
          _coercedKeys.clear();
          setDirty(true);
        });
        applyAllOverrides();
        renderSelectionInspector();
      },
      generationState: {
        get: () => generation,
        set: (value) => {
          generation = value;
        },
      },
      scheduleReconnect: (callback, delayMs) => setTimeout(callback, delayMs),
    },
  });
  return _editorBootstrapFacade;
}

function _getEditorRelayoutFacade() {
  if (_editorRelayoutFacade) return _editorRelayoutFacade;
  _editorRelayoutFacade = window.__DG_getPreviewBridgeRelayoutContract().createPreviewEditorRelayoutFacadeFromRuntime({
    shared: {
      getOverrides: () => overrides,
      coercedKeys: _coercedKeys,
      model,
      editorState: EditorState,
      previewBridgeHost: _getPreviewBridgeHostContract(),
      selectedIds,
    },
    runtime: {
      getLocalRelayoutStatus: _getLocalBridgeRelayoutStatus,
      isEngineLayoutActive: _isPreviewEngineShellLayoutActive,
      hasRelayoutFrameOverride: _hasLayoutRelayoutFrameOverride,
      replaceOverrides,
      pruneLinkedRootOverrides: _pruneLinkedRootGridOverrides,
      clearPendingRuntime: _clearPendingRestoreRuntime,
      rerenderStageFromModel: () => _rerenderStageFromModel(),
      applyLocalRefresh: ({ syncGridControls }) => _applyLocalRestoreRefresh(syncGridControls),
      syncGridControls: () => {
        if (_getEditorSceneFacade().getGridRuntime().getGridInfo()) populateGridControls();
      },
      syncDirtyFromSerialized: (currentStateStr) => PreviewSaveClient.syncDirtyFromSerialized(currentStateStr),
      buildTreeUi: () => buildTreeUI(),
      applyWaypointOverrides: () => applyWaypointOverrides(),
      bindInteraction: () => bindInteraction(),
      applyAllOverrides: () => applyAllOverrides(),
      reapplySelection: () => reapplySelection(),
      refreshGridInfo: () => refreshLayoutGridInfoFromLayout(),
      renderGridOverlay: () => renderGridOverlay(),
      renderSelectionInspector: () => renderSelectionInspector(),
      updateOverrideSummary: () => updateOverrideSummary(),
      refreshTreeColors: () => refreshTreeColors(),
      runConstraints: () => runConstraints(),
      setStatus: typeof setStatus === "function" ? setStatus : null,
      logError: (message) => console.error(message),
      setDirty: () => setDirty(true),
      updateInspector: (cid) => updateInspector(cid),
      reloadTreeAfterArrowRestore: (canonicalState) => loadTree(canonicalState),
      rebuildArrowSvg: (cid) => rebuildArrowSVG(cid),
      getOwnDelta: (cid) => getOwnDelta(cid),
      setOverride,
      requestAnimationFrameFn: requestAnimationFrame,
      cancelAnimationFrameFn: cancelAnimationFrame,
      minSize: 8,
    },
  });
  return _editorRelayoutFacade;
}

function _getStateRestoreRuntime() {
  if (_stateRestoreRuntime) return _stateRestoreRuntime;
  _stateRestoreRuntime = _getEditorRelayoutFacade().getStateRestoreRuntime();
  return _stateRestoreRuntime;
}

const _applyUndoCommand = (command, direction) =>
  _getEditorRelayoutFacade().applyUndoCommand(command, direction);

function _getEditorInteractionFacade() {
  if (_editorInteractionFacade) return _editorInteractionFacade;
  const previewShellBootstrap = window.__DG_getPreviewShellBootstrapContract();
  const previewShellScene = window.__DG_getPreviewShellSceneContract();
  const previewShellInteraction = window.__DG_getPreviewShellInteractionContract();
  const previewShellInspector = window.__DG_getPreviewShellInspectorContract();
  const previewBridgeRender = window.__DG_getPreviewBridgeRenderContract();
  _editorInteractionFacade = previewShellBootstrap.createPreviewEditorInteractionFacadeFromBrowserHost({
    shared: {
      document,
      model,
      interactionManager: mgr,
      selectedIds,
      selectionDepthState: {
        get: () => selectionDepth,
        set: (nextDepth) => {
          selectionDepth = nextDepth;
        },
      },
    },
    contracts: {
      previewShellInspector,
      previewShellInteraction,
      previewShellScene,
      previewBridgeRender,
    },
    browser: {
      getOverrides: () => overrides,
      selectComponent: (cid, additive) => selectComponent(cid, additive),
      deleteSelectedFrames: () => deleteSelectedFrames(),
      interactionMode: InteractionMode,
      getAncestors: (cid) => getAncestors(cid),
      applySelectionState: (nextState, preferredCid) => _applySelectionStateSnapshot(nextState, preferredCid),
      deselectAll: () => deselectAll(),
      getOwnDelta: (cid) => getOwnDelta(cid),
      collectSnapTargets,
      isAutolayoutChild: _isAutolayoutChild,
      captureOverrideEntries: (ids) => EditorState.captureOverrideEntries(ids),
      baselineStep: BASELINE_STEP,
      resolveSnap: (cid, proposedDx, proposedDy, targets) => {
        const snap = findSnaps(cid, proposedDx, proposedDy, targets);
        return { dx: snap.snapDx, dy: snap.snapDy, lines: snap.lines };
      },
      renderGuideLines: (lines) => renderGuideLines(lines, GUIDE_COLOR, GUIDE_OPACITY),
      setOverride,
      setFrameProp: (cid, prop, value) => setFrameProp(cid, prop, value),
      applyAllOverrides,
      updateInspector: (cid) => updateInspector(cid),
      shouldUpdateInspector: () => selectedIds.has(mgr.state.cid) && selectedIds.size === 1,
      getParentNode: (cid) => getParentNode(cid),
      getComponentNode: (cid) => getComponentNode(cid),
      getEffectiveDelta: (cid) => getEffectiveDelta(cid),
      inset: INSET,
      getComponentType,
      clearHandlesByClass,
      renderResizeHandles: ({ svg, left, top, right, bottom, nodeId, options }) => {
        renderResizeHandles(svg, left, top, right, bottom, nodeId, {
          handleClass: "dg-handle",
          nodeAttr: options.nodeAttr,
          dirAttr: options.dirAttr,
        });
      },
      handleSize: SHARED_HANDLE_SIZE,
      textEditingMode: InteractionMode.TEXT_EDITING,
      iconSize: window.__DG_CONFIG.icon_size,
      columnGap: window.__DG_CONFIG.col_gap,
      setTextOverride: (cid, nextTextOverride) => {
        setOverride(cid, { text: nextTextOverride });
      },
      captureOverrideEntries: (ids) => EditorState.captureOverrideEntries(ids),
      commitOverridePatchAction: (label, beforeEntries, afterEntries) => {
        EditorState.commitOverridePatchAction(label, beforeEntries, afterEntries);
      },
      reapplySelection: () => reapplySelection(),
      scheduleTextRelayout: (cid) => {
        clearTimeout(_layoutRelayoutTimer);
        _layoutRelayoutTimer = setTimeout(() => requestLayoutRelayout(cid), 100);
      },
      hasLayoutChildren: _hasLayoutChildren,
      minNodeSize: SHARED_MIN_NODE_SIZE,
      gridTargets: _gridSnapTargets,
      clearGuideLines,
      applyInteractionOverrideEntries: _applyInteractionOverrideEntries,
      renderEmptyInspector: () => renderEmptyInspector(),
      renderSelectionInspector: (preferredCid) => renderSelectionInspector(preferredCid),
      scheduleLayoutResizeRelayout: (cid, newW, newH, resizedW, resizedH) =>
        _scheduleLayoutResizeRelayout(cid, newW, newH, resizedW, resizedH),
      scheduleV3ResizeRelayout: (cid, newW, newH, resizedW, resizedH) =>
        _scheduleV3ResizeRelayout(cid, newW, newH, resizedW, resizedH),
      cancelLiveRelayout: () => _cancelLayoutResizeRelayout(),
      cleanOverride: (cid) => cleanOverride(cid),
      persistResize: _persistResizeToLayout,
      autoFitArtboard: () => autoFitArtboard(),
      save: () => PreviewSaveClient.trySaveIfDirty(),
      undo: () => { void EditorState.undo(_applyUndoCommand); },
      redo: () => { void EditorState.redo(_applyUndoCommand); },
      deleteSelection: () => deleteSelectedFrames(),
      onResizeUp: () => onResizeUp(),
      cycleGuideMode: () => cycleGuideMode(),
      getPrimarySelectedId: (preferredCid) => getPrimarySelectedId(preferredCid),
      getPreviewGridInfo: () => _getEditorSceneFacade().getGridRuntime().getGridInfo(),
      coercedKeys: _coercedKeys,
      fallbackGap: window.__DG_CONFIG.col_gap || 24,
      multiActionGapState: {
        get: () => multiActionGap,
        set: (gap) => {
          multiActionGap = gap;
        },
      },
      getInspector: () => getInspectorElement(),
      getArrowNode: (cid) => getArrowNode(cid),
      getViolations: (cid) => getViolationsForComponent(cid),
      readRenderedStyleFields: _readRenderedStyleFields,
      getTextAdapter: typeof window.getLayoutTextAdapter === 'function'
        ? () => window.getLayoutTextAdapter()
        : null,
      escapeHtml: typeof escapeHtml === "function" ? escapeHtml : null,
      renderBoxStyleOptions,
      formatAsDefinedStyleLabel: _formatAsDefinedStyleLabel,
      renderMultiSelectionInspector: () => renderMultiSelectionInspector(),
      snapToGrid: (value) => snapToGrid(value),
      setDirty,
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
      persistWaypointOverride: setWaypointOverride,
      theme: {
        headLen: window.__DG_CONFIG.head_len,
        headHalf: window.__DG_CONFIG.head_half,
        color: "#E95420",
      },
    },
  });
  return _editorInteractionFacade;
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

function resetOverrideState() {
  replaceOverrides({});
  model.gridOverrides = {};
  const tree = _readFrameTreeJson();
  model.layoutOverrides = (tree && tree.elkLayout) ? { ...tree.elkLayout } : {};
  model.elkLayoutOverrides = (tree && tree.elkLayout) ? { ...tree.elkLayout } : {};
  model.removedIds = new Set();
  updateOverrideSummary();
  // Initialize undo stack and saved state
  EditorState.clearUndoHistory();
  PreviewSaveClient.markSaved(EditorState.serializeDirtyState());
}

const applyWaypointOverrides = () => _getEditorSceneFacade().applyWaypointOverrides();

// ---- Override application ----

const getOwnDelta = (cid) => model.getOwnDelta(cid);

const getAncestors = (cid) => model.getAncestors(cid);
const getParentNode = (cid) => {
  const parent = model.getParent(cid);
  return parent ? parent.data : null;
};
const getComponentNode = (cid) => {
  const node = model.get(cid);
  return node ? node.data : null;
};

function _hasLayoutChildren(cid) {
  const node = model.get(cid);
  return !!(node && node.layout && node.children.length > 0);
}

const getDescendantIds = (cid) => model.getDescendants(cid);
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

function setMultiActionGap(value) {
  const parsed = parseInt(value, 10);
  multiActionGap = window.__DG_getPreviewShellInteractionContract().normalizeSelectionGap(
    Number.isFinite(parsed) ? parsed : 0,
    BASELINE_STEP,
  );
  const input = document.getElementById("multi-action-gap");
  if (input) input.value = multiActionGap;
}

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

function getComponentType(cid) {
  return model.getType(cid) || "Box";
}

const _getSelectionChromeRuntime = () => _getEditorInteractionFacade().getSelectionChromeRuntime();
const showResizeHandles = (cid) => _getSelectionChromeRuntime().showResizeHandles(cid);
const removeResizeHandles = () => _getSelectionChromeRuntime().removeResizeHandles();

// ---- Arrow waypoint handles ----

const getArrowNode = (cid) => {
  const node = model.get(cid);
  return (node && node.type === "arrow") ? node.data : null;
};

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
const _getLiveResizeRuntime = () => (
  _liveResizeRuntime ??= _getEditorRelayoutFacade().getLiveResizeRuntime()
);
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

const cleanOverride = (cid) => model.cleanOverride(cid);

const applyStyleOverride = (cid, styleName) => applyFrameStyle(cid, styleName);

function _normaliseStyleName(styleName) {
  return window.__DG_getPreviewShellInspectorContract().normalizePreviewStyleName(styleName);
}

let _layoutRelayoutTimer = null;
function _scheduleLayoutRelayout(cid) {
  clearTimeout(_layoutRelayoutTimer);
  _layoutRelayoutTimer = setTimeout(() => {
    _layoutRelayoutTimer = null;
    requestLayoutRelayout(cid);
  }, 300);
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
const _getRelayoutRuntime = () => (
  _relayoutRuntime ??= _getEditorRelayoutFacade().getRelayoutRuntime()
);
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

const getViolationsForComponent = (cid) => constraints.forComponent(lastViolations, cid);

// ---- SSE / bootstrap tail ----

const bootstrapPreviewEditor = () => _getEditorBootstrapFacade().bootstrapEditorRuntime();

bootstrapPreviewEditor();

// ---- Left sidebar tabs (Browse / Layers) ----
// Handled by initNavTabs() in editor-base.js via initPreviewShell().
