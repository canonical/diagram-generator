(function () {
  "use strict";

  function resolveCreateRuntime() {
    return window.LayoutEngine?.previewEngines?.graph?.createPreviewEngineShellControllerRuntime
      ?? window.LayoutEngine?.previewEngines?.elk?.createPreviewElkShellControllerRuntime
      ?? null;
  }

  const createRuntime = resolveCreateRuntime();
  if (typeof createRuntime !== "function") {
    throw new Error(
      "ELK preview controller runtime is unavailable. Rebuild the browser bundle from packages/layout-engine.",
    );
  }

  const controller = createRuntime({
    document,
    previewWindow: window,
    layoutEngineRoot: typeof LayoutEngine !== "undefined" ? LayoutEngine : window.LayoutEngine,
    getFrameTreeJson: typeof getFrameTreeJson === "function" ? () => getFrameTreeJson() : null,
  });

  const runtime = {
    ...controller,
    init(deps) {
      controller.init(deps);
      const applyLayoutOverrides = typeof controller.applyLayoutOverrides === "function"
        ? controller.applyLayoutOverrides.bind(controller)
        : (typeof controller.applyElkLayoutOverrides === "function"
          ? controller.applyElkLayoutOverrides.bind(controller)
          : null);
      window.__DG_wirePreviewEnginePanel = controller.wirePanel;
      window.__DG_applyPreviewEngineLayoutOverrides = applyLayoutOverrides;
      window.__DG_wireElkLayoutPanel = controller.wirePanel;
      window.__DG_applyElkLayoutOverrides = applyLayoutOverrides;
      window.requestPreviewEngineRelayout = controller.requestRelayout;
      window.requestLayoutRelayout = controller.requestRelayout;
      window.requestElkRelayout = controller.requestRelayout;
    },
  };

  window.PreviewEngineShellController = runtime;
  window.ElkPreviewController = runtime;
})();
