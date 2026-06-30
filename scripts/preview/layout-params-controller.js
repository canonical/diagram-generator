(function () {
  "use strict";

  function resolveCreateRuntime() {
    return window.LayoutEngine?.previewEngines?.graph?.createPreviewEngineShellControllerRuntime ?? null;
  }

  const createRuntime = resolveCreateRuntime();
  if (typeof createRuntime !== "function") {
    throw new Error(
      "preview engine layout parameter controller runtime is unavailable. Rebuild the browser bundle from packages/layout-engine.",
    );
  }

  const controller = createRuntime({
    document,
    previewWindow: window,
    layoutEngineRoot: typeof LayoutEngine !== "undefined" ? LayoutEngine : window.LayoutEngine,
    getFrameTreeJson: typeof getFrameTreeJson === "function" ? () => getFrameTreeJson() : null,
    sidebarSectionId: "layout-params",
  });

  const runtime = {
    ...controller,
    init(deps) {
      controller.init(deps);
      const applyLayoutOverrides = typeof controller.applyLayoutOverrides === "function"
        ? controller.applyLayoutOverrides.bind(controller)
        : null;
      window.__DG_wirePreviewEnginePanel = controller.wirePanel;
      window.__DG_applyPreviewEngineLayoutOverrides = applyLayoutOverrides;
      window.requestPreviewEngineRelayout = controller.requestRelayout;
      window.requestLayoutRelayout = controller.requestRelayout;
    },
  };

  window.PreviewEngineShellController = runtime;
})();
