(function () {
  "use strict";

  function resolveCreateRuntime() {
    const elk = window.LayoutEngine?.previewEngines?.elk
      || (typeof LayoutEngine !== "undefined" ? LayoutEngine.previewEngines?.elk : null);
    return elk?.createPreviewElkLayoutControlsRuntime
      || (typeof LayoutEngine !== "undefined" ? LayoutEngine.createPreviewElkLayoutControlsRuntime : null);
  }

  const createRuntime = resolveCreateRuntime();
  if (typeof createRuntime !== "function") {
    throw new Error(
      "preview engine layout controls runtime is unavailable. Rebuild the browser bundle from packages/layout-engine.",
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
  });

  window.PreviewEngineLayoutControls = runtime;
  window.ElkLayoutControls = runtime;
})();
