(function () {
  "use strict";

  function resolveCreateRuntime() {
    return window.LayoutEngine?.previewEngines?.graph?.createPreviewEngineLayoutControlsRuntime ?? null;
  }

  const createRuntime = resolveCreateRuntime();
  if (typeof createRuntime !== "function") {
    throw new Error(
      "preview engine graph layout controls runtime is unavailable. Rebuild the browser bundle from packages/layout-engine.",
    );
  }

  const runtime = createRuntime({
    document,
    previewWindow: window,
    layoutEngineRoot: typeof LayoutEngine !== "undefined" ? LayoutEngine : window.LayoutEngine,
    setTimeoutFn: (callback, delayMs) => setTimeout(callback, delayMs),
    clearTimeoutFn: (token) => clearTimeout(token),
    getFrameTreeJson: typeof getFrameTreeJson === "function" ? () => getFrameTreeJson() : null,
    getDirtySetter: () => window.setDirty,
    sidebarSectionId: "layout-params",
    sectionId: "layout-params-section",
    containerId: "layout-params-controls",
    controlIdPrefix: "layout-params",
    defaultPersistNamespace: "meta.dagre",
    enableRawViewToggles: false,
    unavailableMessage: "Graph layout parameter registry unavailable. Rebuild the browser bundle from packages/layout-engine.",
  });

  window.PreviewEngineLayoutControls = runtime;
})();
