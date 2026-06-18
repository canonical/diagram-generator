/**
 * ELK preview controller (spec 026 T011).
 *
 * Orchestrates ELK engine detection, sidebar wiring, override state, and relayout
 * requests. Sidebar DOM lives in elk-layout-controls.js; this module owns shell integration.
 */
(function () {
  "use strict";

  const SECTION_ID = "elk-layout-section";

  /** @type {object | null} */
  let _deps = null;
  let _panelWired = false;

  function _previewEngineRegistry() {
    return (
      typeof LayoutEngine !== "undefined"
      && LayoutEngine.previewEngines
      && LayoutEngine.previewEngines.registry
    ) || null;
  }

  function _requireDeps() {
    if (!_deps) {
      throw new Error("ElkPreviewController.init() must run before ELK shell operations");
    }
    return _deps;
  }

  function isElkLayeredDiagram(frameTreeJson) {
    const tree = frameTreeJson !== undefined
      ? frameTreeJson
      : (typeof getFrameTreeJson === "function" ? getFrameTreeJson() : null);
    const layoutEngine = tree?.layoutEngine
      ?? (window.__DG_CONFIG && window.__DG_CONFIG.layout_engine)
      ?? null;
    const registry = _previewEngineRegistry();
    if (
      registry
      && typeof registry.resolvePreviewEngine === "function"
      && registry.resolvePreviewEngine({ layoutEngine, shellMode: "grid" })?.id === "elk-layered"
    ) {
      return true;
    }
    if (
      typeof LayoutEngine !== "undefined"
      && typeof LayoutEngine.resolvePreviewEngine === "function"
      && LayoutEngine.resolvePreviewEngine({ layoutEngine, shellMode: "grid" })?.id === "elk-layered"
    ) {
      return true;
    }
    if (tree && tree.layoutEngine === "elk-layered") return true;
    const cfg = window.__DG_CONFIG || {};
    if (cfg.layout_engine === "elk-layered") return true;
    const section = document.getElementById(SECTION_ID);
    if (section && !section.hasAttribute("hidden")) return true;
    return false;
  }

  function applyElkLayoutOverrides(overrides) {
    if (!_deps) return;
    _deps.setElkLayoutOverrides({ ...(overrides || {}) });
  }

  function wirePanel() {
    if (!window.ElkLayoutControls) return;
    if (_panelWired) return;
    const deps = _requireDeps();
    ElkLayoutControls.init({
      getOverrides: () => deps.getElkLayoutOverrides() || {},
      setOverrides: (value) => deps.setElkLayoutOverrides({ ...value }),
    });
    _panelWired = true;
  }

  function syncPanel() {
    wirePanel();
    if (window.ElkLayoutControls && typeof ElkLayoutControls.refresh === "function") {
      ElkLayoutControls.refresh();
    }
  }

  function initPanel() {
    syncPanel();
  }

  function collectPersistedPayload(basePayload, model) {
    wirePanel();
    const domElk = window.ElkLayoutControls && typeof ElkLayoutControls.collectOverrides === "function"
      ? ElkLayoutControls.collectOverrides()
      : {};
    const elkOverrides = { ...((model && model.elkLayoutOverrides) || {}), ...domElk };
    applyElkLayoutOverrides(elkOverrides);
    return {
      ...(basePayload || {}),
      elk_layout_overrides: { ...elkOverrides },
    };
  }

  async function requestRelayout() {
    wirePanel();
    if (window.ElkLayoutControls && typeof ElkLayoutControls.collectOverrides === "function") {
      const deps = _deps;
      applyElkLayoutOverrides({
        ...((deps && deps.getElkLayoutOverrides()) || {}),
        ...ElkLayoutControls.collectOverrides(),
      });
    }
    const deps = _requireDeps();
    const rootId = typeof deps.getRootId === "function" ? deps.getRootId() : "root";
    return deps.requestV3Relayout(rootId);
  }

  function init(deps) {
    _deps = deps;
    window.__DG_wireElkLayoutPanel = wirePanel;
    window.__DG_applyElkLayoutOverrides = applyElkLayoutOverrides;
    window.requestElkRelayout = requestRelayout;
  }

  const controller = {
    init,
    isElkLayeredDiagram,
    isActiveLayoutEngine: isElkLayeredDiagram,
    wirePanel,
    syncPanel,
    initPanel,
    initializePanel: initPanel,
    applyElkLayoutOverrides,
    applyLayoutOverrides: applyElkLayoutOverrides,
    collectPersistedPayload,
    requestRelayout,
  };
  window.PreviewEngineShellController = controller;
  window.ElkPreviewController = controller;
})();
