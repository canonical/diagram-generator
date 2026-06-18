"use strict";
// ---------------------------------------------------------------------------
// layout-bridge.js — Client-side layout using the TS layout engine
// ---------------------------------------------------------------------------
// Bridges between the server's serialized Frame tree (JSON) and the
// LayoutEngine global (IIFE bundle).  Provides performLocalRelayout()
// which replaces the server round-trip requestV3Relayout().
// ---------------------------------------------------------------------------

/**
 * Reconstruct a LayoutEngine.Frame from a serialized JSON object.
 * The JSON comes from the server's /api/frame-tree/<slug> endpoint.
 */
function _collectRelayoutFrameOverrides(overrides) {
  const previewBridgeRelayout = window.__DG_getPreviewBridgeRelayoutContract();
  if (typeof previewBridgeRelayout.collectPreviewRelayoutFrameOverrides !== "function") {
    throw new Error("layout-bridge: previewBridge.relayout.collectPreviewRelayoutFrameOverrides is unavailable");
  }
  return previewBridgeRelayout.collectPreviewRelayoutFrameOverrides(overrides || {});
}

function previewCoreContract() {
  const contract = typeof window.__DG_getPreviewCoreContract === "function"
    ? window.__DG_getPreviewCoreContract()
    : null;
  if (!contract) {
    throw new Error("layout-bridge: preview core contract is unavailable");
  }
  return contract;
}

function previewBridgeRenderContract() {
  const contract = typeof window.__DG_getPreviewBridgeRenderContract === "function"
    ? window.__DG_getPreviewBridgeRenderContract()
    : null;
  if (!contract) {
    throw new Error("layout-bridge: previewBridge.render contract is unavailable");
  }
  return contract;
}

function previewBridgeHostContract() {
  const contract = typeof window.__DG_getPreviewBridgeHostContract === "function"
    ? window.__DG_getPreviewBridgeHostContract()
    : null;
  if (!contract) {
    throw new Error("layout-bridge: previewBridge.host contract is unavailable");
  }
  return contract;
}

function previewElkEngineContract() {
  const contract = typeof window.__DG_getPreviewElkEngineContract === "function"
    ? window.__DG_getPreviewElkEngineContract()
    : null;
  if (!contract) {
    throw new Error("layout-bridge: previewEngines.elk contract is unavailable");
  }
  return contract;
}

function deserializeFrame(json) {
  return previewCoreContract().deserializeFrameWire(json);
}

/**
 * Reconstruct a LayoutEngine.FrameDiagram from serialized JSON.
 */
function deserializeFrameDiagram(json) {
  const diagram = previewCoreContract().deserializeFrameDiagramWire(json);
  if (!diagram.layoutEngine && window.__DG_CONFIG && window.__DG_CONFIG.layout_engine) {
    diagram.layoutEngine = window.__DG_CONFIG.layout_engine;
  }
  return diagram;
}

// ---------------------------------------------------------------------------
// Override application — delegated to previewBridge.relayout
// ---------------------------------------------------------------------------

function applyOverridesToFrameTree(diagram, allOverrides, gridOverrides) {
  const previewBridgeRelayout = window.__DG_getPreviewBridgeRelayoutContract();
  if (typeof previewBridgeRelayout.applyPreviewOverridesToFrameTree !== "function") {
    throw new Error("layout-bridge: previewBridge.relayout.applyPreviewOverridesToFrameTree is unavailable");
  }
  previewBridgeRelayout.applyPreviewOverridesToFrameTree(
    diagram,
    allOverrides || {},
    gridOverrides || {},
  );
}

// ---------------------------------------------------------------------------
// SVG DOM patching — update SVG elements in-place from layout results
// ---------------------------------------------------------------------------

const SVG_NS = "http://www.w3.org/2000/svg";

function collectFramesById(frame, out) {
  const previewBridgeRender = previewBridgeRenderContract();
  if (typeof previewBridgeRender.collectPreviewFramesById !== "function") {
    throw new Error("layout-bridge: previewBridge.render.collectPreviewFramesById is unavailable");
  }
  return previewBridgeRender.collectPreviewFramesById(frame, out || {});
}

function collectPlacedBounds(frame, out) {
  const previewBridgeRender = previewBridgeRenderContract();
  if (typeof previewBridgeRender.collectPreviewPlacedBounds !== "function") {
    throw new Error("layout-bridge: previewBridge.render.collectPreviewPlacedBounds is unavailable");
  }
  return previewBridgeRender.collectPreviewPlacedBounds(frame, out || {});
}

function fitSvgToRenderedContent(svgEl, options) {
  const previewBridgeRender = previewBridgeRenderContract();
  if (typeof previewBridgeRender.fitPreviewSvgToRenderedContent !== "function") {
    throw new Error("layout-bridge: previewBridge.render.fitPreviewSvgToRenderedContent is unavailable");
  }
  return previewBridgeRender.fitPreviewSvgToRenderedContent({
    svg: svgEl,
    padding: options && options.padding,
    minWidth: options && options.minWidth,
    minHeight: options && options.minHeight,
  });
}

/**
 * Patch SVG DOM elements to reflect new layout positions/sizes.
 * FrameBox groups are rebuilt from the relaid-out frame tree so text,
 * icon anchoring, and rect geometry stay in sync.
 */
function patchSvgFromLayout(svgEl, oldBounds, newBounds, framesById) {
  const previewBridgeRender = previewBridgeRenderContract();
  if (typeof previewBridgeRender.patchPreviewSvgFromLayout !== "function") {
    throw new Error("layout-bridge: previewBridge.render.patchPreviewSvgFromLayout is unavailable");
  }
  previewBridgeRender.patchPreviewSvgFromLayout({
    svg: svgEl,
    oldBounds: oldBounds || {},
    newBounds: newBounds || {},
    framesById: framesById || {},
    textAdapter: _layoutBridgeRuntime.getTextAdapter(),
  });
}

function updateComponentModelFromLayout(model, frame) {
  const previewBridgeHost = previewBridgeHostContract();
  if (typeof previewBridgeHost.updatePreviewComponentModelFromLayout !== "function") {
    throw new Error("layout-bridge: previewBridge.host.updatePreviewComponentModelFromLayout is unavailable");
  }
  return previewBridgeHost.updatePreviewComponentModelFromLayout(model, frame);
}

// ---------------------------------------------------------------------------
// Arrow routing bridges serialized preview state to the TS-owned router.
// ---------------------------------------------------------------------------

function arrowComponentId(arrow) {
  const previewBridgeRender = previewBridgeRenderContract();
  if (typeof previewBridgeRender.previewArrowComponentId !== "function") {
    throw new Error("layout-bridge: previewBridge.render.previewArrowComponentId is unavailable");
  }
  return previewBridgeRender.previewArrowComponentId(arrow);
}

function syncArrowsInModel(model, arrows, routedArrows) {
  const previewBridgeRender = previewBridgeRenderContract();
  if (typeof previewBridgeRender.syncPreviewArrowsInModel !== "function") {
    throw new Error("layout-bridge: previewBridge.render.syncPreviewArrowsInModel is unavailable");
  }
  previewBridgeRender.syncPreviewArrowsInModel(
    model,
    Array.isArray(arrows) ? arrows : [],
    Array.isArray(routedArrows) ? routedArrows : [],
  );
}

function routeArrows(arrows, boundsMap) {
  const previewBridgeRender = previewBridgeRenderContract();
  if (typeof previewBridgeRender.routePreviewArrows !== "function") {
    throw new Error("layout-bridge: previewBridge.render.routePreviewArrows is unavailable");
  }
  return previewBridgeRender.routePreviewArrows(
    Array.isArray(arrows) ? arrows : [],
    boundsMap || {},
  );
}

function patchArrowsSvg(svgEl, routedArrows, boundsMap) {
  if (!svgEl) return;
  const previewBridgeRender = previewBridgeRenderContract();
  if (typeof previewBridgeRender.patchPreviewArrowSvg !== "function") {
    throw new Error("layout-bridge: previewBridge.render.patchPreviewArrowSvg is unavailable");
  }
  previewBridgeRender.patchPreviewArrowSvg({
    svg: svgEl,
    routedArrows: Array.isArray(routedArrows) ? routedArrows : [],
    boundsMap: boundsMap || {},
    headLen: window.__DG_CONFIG?.head_len,
    headHalf: window.__DG_CONFIG?.head_half,
  });
}

// ---------------------------------------------------------------------------
// Main entry point — called from editor.js
// ---------------------------------------------------------------------------

const _layoutBridgeState = previewBridgeHostContract().createPreviewLayoutBridgeState();

function _textAdapterBackend() {
  const textAdapter = _layoutBridgeRuntime.getTextAdapter();
  return textAdapter && typeof textAdapter.measurementBackend === "string"
    ? textAdapter.measurementBackend
    : null;
}

function setLocalRelayoutOverrideMode(mode) {
  return _layoutBridgeRuntime.setLocalRelayoutOverrideMode(mode);
}

function getLocalRelayoutStatus() {
  return _layoutBridgeRuntime.getLocalRelayoutStatus();
}

function isLocalRelayoutReady() {
  return _layoutBridgeRuntime.isLocalRelayoutReady();
}

function getFrameTreeJson() {
  return _layoutBridgeRuntime.getFrameTreeJson();
}

function getPreviewDocumentJson() {
  return _layoutBridgeRuntime.getPreviewDocumentJson();
}

function _isElkLayeredDiagramJson(json) {
  if (json && json.layoutEngine === "elk-layered") return true;
  const cfg = window.__DG_CONFIG || {};
  return cfg.layout_engine === "elk-layered";
}

function _resolveElkOptionOverrides(diagram, model) {
  const fromYaml = (diagram && diagram.elkLayout) || {};
  let session = (model && model.elkLayoutOverrides) || {};
  // Model is updated on every sidebar input — prefer it over DOM reads so load/reload
  // cannot clobber saved YAML with stale server-rendered sidebar HTML.
  if (Object.keys(session).length === 0
    && window.ElkLayoutControls
    && typeof ElkLayoutControls.collectOverrides === "function") {
    session = ElkLayoutControls.collectOverrides();
    if (model) {
      model.elkLayoutOverrides = { ...session };
    }
  }
  return { ...fromYaml, ...session };
}

const _layoutBridgeRuntime = previewBridgeHostContract().createPreviewLayoutBridgeRuntime({
  state: _layoutBridgeState,
  fetchPreviewDocument: async (slug) => {
    const response = await fetch("/api/preview-document/" + slug + "?t=" + Date.now(), { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    return response.json();
  },
  extractFrameTreeFromPreviewDocument: (previewDocumentJson) => (
    previewDocumentJson && previewDocumentJson.kind === "frame-diagram"
      ? (previewDocumentJson.frameTree || null)
      : null
  ),
  createTextAdapter: async () => {
    const hbModule = await import("/preview/layout-engine-harfbuzz.js");
    return hbModule.createDefaultHarfBuzzTextAdapter({
      fontUrl: "/preview/layout-font.ttf",
    });
  },
  getTextAdapterBackend: (textAdapter) => (
    textAdapter && typeof textAdapter.measurementBackend === "string"
      ? textAdapter.measurementBackend
      : null
  ),
  isAuthoritativeTextAdapter: (textAdapter) => (
    textAdapter && typeof textAdapter.measurementBackend === "string"
      ? textAdapter.measurementBackend === "harfbuzz"
      : false
  ),
  isElkLayeredDiagramJson: _isElkLayeredDiagramJson,
  deserializeFrameDiagram,
  collectRelayoutFrameOverrides: _collectRelayoutFrameOverrides,
  applyOverridesToFrameTree,
  layoutLocalDiagram: (diagram, textAdapter) => {
    previewCoreContract().resolveStyles(diagram.root);
    return previewCoreContract().layoutFrameTree(
      diagram.root,
      textAdapter,
      _layoutOptionsFromDiagram(diagram),
    );
  },
  collectPlacedBounds: (root) => collectPlacedBounds(root, {}),
  collectFramesById: (root) => collectFramesById(root, {}),
  queryStageSvg: () => document.querySelector("#stage svg"),
  patchSvgFromLayout: (options) => patchSvgFromLayout(
    options.svg,
    options.oldBounds,
    options.newBounds,
    options.framesById,
  ),
  routeArrows,
  patchArrowsSvg: (options) => patchArrowsSvg(
    options.svg,
    options.routedArrows,
    options.boundsMap,
  ),
  updateModelFromLayout,
  syncArrowsInModel,
  renderFreshPreviewSvg: async (options) => {
    const previewBridgeRender = previewBridgeRenderContract();
    if (typeof previewBridgeRender.renderFreshPreviewSvg !== "function") {
      throw new Error("layout-bridge: previewBridge.render.renderFreshPreviewSvg is unavailable");
    }
    return previewBridgeRender.renderFreshPreviewSvg(options);
  },
  ownerDocument: document,
  getStageContainer: () => document.getElementById("stage"),
  fitRenderedSvg: (svg, options) => fitSvgToRenderedContent(svg, options),
  resolveElkOptionOverrides: _resolveElkOptionOverrides,
  refreshElkViewMode,
  warn: (message, error) => console.warn(message, error),
  error: (message, error) => console.error(message, error),
});

const _elkViewModeRuntime = previewBridgeHostContract().createPreviewElkViewModeRuntime({
  previewWindow: window,
  getStageSvg: () => document.querySelector("#stage svg"),
  ownerDocument: document,
  getLastElkSnapshot: () => _layoutBridgeRuntime.getLastElkSnapshot(),
  getLastElkFrameLabels: () => _layoutBridgeRuntime.getLastElkFrameLabels(),
  renderPreviewElkRawView: (options) => previewElkEngineContract().renderPreviewElkRawView(options),
  renderPreviewElkDebugOverlay: (options) => previewElkEngineContract().renderPreviewElkDebugOverlay(options),
  svgNs: SVG_NS,
  headLen: 8,
  headHalf: 4,
});
_elkViewModeRuntime.initializeWindowState();

function refreshElkViewMode() {
  _elkViewModeRuntime.refreshViewMode();
}

function refreshElkDebugOverlay() {
  _elkViewModeRuntime.refreshDebugOverlay();
}

window.__DG_setElkDebugOverlay = function (enabled) {
  _elkViewModeRuntime.setDebugOverlay(enabled);
};

window.__DG_setElkRawView = function (enabled) {
  _elkViewModeRuntime.setRawView(enabled);
};

function setFrameTreeJson(json) {
  _layoutBridgeRuntime.setFrameTreeJson(json || null);
}

/**
 * Remove frames (and subtrees) from a frame-tree JSON object (mutates in place).
 * @param {object} treeJson
 * @param {string[]} frameIds  Top-level ids to remove (ancestors win over descendants).
 * @returns {string[]} ids actually removed from the tree
 */
function applyFrameTreeRemovalsToJson(treeJson, frameIds) {
  const previewBridgeHost = previewBridgeHostContract();
  if (typeof previewBridgeHost.applyFrameTreeRemovalsToPreviewTreeJson !== "function") {
    throw new Error("layout-bridge: previewBridge.host.applyFrameTreeRemovalsToPreviewTreeJson is unavailable");
  }
  return previewBridgeHost.applyFrameTreeRemovalsToPreviewTreeJson(treeJson, frameIds);
}

/** @deprecated Prefer session-only removals via model.removedIds; mutates canonical cache. */
function applyFrameTreeRemovals(frameIds) {
  return _layoutBridgeRuntime.applyFrameTreeRemovals(frameIds);
}

function applySessionRemovalsToDiagramJson(diagramJson, model) {
  const previewBridgeHost = previewBridgeHostContract();
  if (typeof previewBridgeHost.applyPreviewSessionRemovalsToDiagramJson !== "function") {
    throw new Error("layout-bridge: previewBridge.host.applyPreviewSessionRemovalsToDiagramJson is unavailable");
  }
  return previewBridgeHost.applyPreviewSessionRemovalsToDiagramJson(diagramJson, model);
}

/**
 * Load the frame tree from the server and create the text adapter.
 * Call once during editor initialization.
 */
async function initLayoutBridge(slug) {
  return _layoutBridgeRuntime.init(slug);
}

/**
 * Perform layout locally and patch the SVG DOM.
 * Returns { coerced, width, height } or null on failure.
 *
 * This replaces requestV3Relayout() — no server round-trip needed.
 *
 * @param {object} opts
 * @param {boolean} [opts.skipModelUpdate] - When true, the component model
 *   is NOT updated after patching the SVG.  Used during live drag/resize so
 *   snap calculations keep referencing the original positions.
 */
function _layoutOptionsFromDiagram(diagram) {
  return {
    gridCols: diagram.gridCols,
    gridColGap: diagram.gridColGap,
    gridOuterMargin: diagram.gridOuterMargin,
    arrows: diagram.arrows,
  };
}

function performLocalRelayout(model, overrides, gridOverrides, opts) {
  return _layoutBridgeRuntime.performLocalRelayout(
    model,
    overrides || {},
    gridOverrides || {},
    opts || null,
  );
}

/**
 * Full ELK relayout + SVG replace (async). Used when ELK params or frame overrides change.
 */
async function performElkRelayout(model, overrides, gridOverrides) {
  return _layoutBridgeRuntime.performElkRelayout(
    model,
    overrides || {},
    gridOverrides || {},
  );
}

async function performEngineRelayout(model, overrides, gridOverrides) {
  return performElkRelayout(model, overrides, gridOverrides);
}

// ---------------------------------------------------------------------------
// Arrow SVG creation (T007–T008)
// ---------------------------------------------------------------------------

function createArrowsSvg(routedArrows, boundsMap) {
  const previewBridgeRender = previewBridgeRenderContract();
  if (typeof previewBridgeRender.createPreviewArrowSvgFragment === "function") {
    return previewBridgeRender.createPreviewArrowSvgFragment({
      ownerDocument: document,
      routedArrows: Array.isArray(routedArrows) ? routedArrows : [],
      boundsMap: boundsMap || {},
      headLen: window.__DG_CONFIG?.head_len,
      headHalf: window.__DG_CONFIG?.head_half,
    });
  }
  return document.createDocumentFragment();
}

// ---------------------------------------------------------------------------
// Overlay SVG rendering (T009)
// ---------------------------------------------------------------------------

function renderFrameTreeToSvg(diagram, result, options) {
  const previewBridgeRender = previewBridgeRenderContract();
  if (typeof previewBridgeRender.renderPreviewFrameTreeToSvg !== "function") {
    throw new Error("layout-bridge: previewBridge.render.renderPreviewFrameTreeToSvg is unavailable");
  }
  return previewBridgeRender.renderPreviewFrameTreeToSvg({
    ownerDocument: document,
    diagram,
    result,
    textAdapter: _layoutBridgeRuntime.getTextAdapter(),
    iconElements: options && options.iconElements,
    overlays: options && options.overlays,
  });
}

async function renderFreshSvg(overrides, gridOverrides, model) {
  return _layoutBridgeRuntime.renderFreshSvg(
    overrides || {},
    gridOverrides || null,
    model,
  );
}

window.isLocalRelayoutReady = isLocalRelayoutReady;
window.getLocalRelayoutStatus = getLocalRelayoutStatus;
window.__DG_TEST_setLocalRelayoutMode = setLocalRelayoutOverrideMode;
window.__DG_previewBridgeHostRuntime = {
  initLayoutBridge: (slug) => initLayoutBridge(slug),
  isLocalRelayoutReady: () => isLocalRelayoutReady(),
  getLocalRelayoutStatus: () => getLocalRelayoutStatus(),
  getPreviewDocumentJson: () => getPreviewDocumentJson(),
  getFrameTreeJson: () => getFrameTreeJson(),
  setFrameTreeJson: (json) => setFrameTreeJson(json),
  applyFrameTreeRemovals: (frameIds) => applyFrameTreeRemovals(frameIds),
  applyFrameTreeRemovalsToJson: (treeJson, frameIds) => applyFrameTreeRemovalsToJson(treeJson, frameIds),
  applySessionRemovalsToDiagramJson: (diagramJson, model) => applySessionRemovalsToDiagramJson(diagramJson, model),
  performLocalRelayout: (model, overrides, gridOverrides, opts) => (
    performLocalRelayout(model, overrides, gridOverrides, opts)
  ),
  performElkRelayout: (model, overrides, gridOverrides) => (
    performElkRelayout(model, overrides, gridOverrides)
  ),
  performEngineRelayout: (model, overrides, gridOverrides) => (
    performEngineRelayout(model, overrides, gridOverrides)
  ),
  renderFreshSvg: (overrides, gridOverrides, model) => (
    renderFreshSvg(overrides, gridOverrides, model)
  ),
  getTextAdapter: () => _layoutBridgeRuntime.getTextAdapter(),
};
window.__DG_previewBridgeRenderHost = {
  renderPreviewFrameTreeToSvg: (options) => renderFrameTreeToSvg(
    options && options.diagram,
    options && options.result,
    options,
  ),
  renderFreshPreviewSvg: (options) => renderFreshSvg(
    options && options.overrides,
    options && options.gridOverrides,
    options && options.model,
  ),
};
window.renderFrameTreeToSvg = renderFrameTreeToSvg;
window.refreshElkDebugOverlay = refreshElkDebugOverlay;
window.refreshElkViewMode = refreshElkViewMode;
window.renderFreshSvg = renderFreshSvg;
window.arrowComponentId = arrowComponentId;
window.syncArrowsInModel = syncArrowsInModel;
window.getLayoutTextAdapter = () => _layoutBridgeRuntime.getTextAdapter();
window.getPreviewDocumentJson = getPreviewDocumentJson;
window.getFrameTreeJson = getFrameTreeJson;
window.setFrameTreeJson = setFrameTreeJson;
window.applyFrameTreeRemovals = applyFrameTreeRemovals;
window.applyFrameTreeRemovalsToJson = applyFrameTreeRemovalsToJson;
window.applySessionRemovalsToDiagramJson = applySessionRemovalsToDiagramJson;
