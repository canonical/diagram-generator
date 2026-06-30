(function () {
  "use strict";

  function resolveCreateRuntime() {
    return window.LayoutEngine?.previewEngines?.graph?.createPreviewEngineLayoutControlsRuntime
      ?? window.LayoutEngine?.previewEngines?.elk?.createPreviewElkLayoutControlsRuntime
      ?? null;
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
