(function () {
  "use strict";

  function resolveCreateRuntime() {
    const bootstrap = window.LayoutEngine?.previewShell?.bootstrap
      || (typeof LayoutEngine !== "undefined" ? LayoutEngine.previewShell?.bootstrap : null);
    return bootstrap?.createPreviewSaveClientRuntime
      || (typeof LayoutEngine !== "undefined" ? LayoutEngine.createPreviewSaveClientRuntime : null);
  }

  const createRuntime = resolveCreateRuntime();
  if (typeof createRuntime !== "function") {
    throw new Error(
      "Preview save client runtime is unavailable. Rebuild the browser bundle from packages/layout-engine.",
    );
  }

  window.PreviewSaveClient = createRuntime({
    document,
    previewWindow: window,
    fetchFn: (input, init) => fetch(input, init),
    alertFn: (message) => alert(message),
    blobCtor: Blob,
    urlApi: URL,
    xmlSerializerFactory: () => new XMLSerializer(),
  });
})();
