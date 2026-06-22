(function () {
  "use strict";

  function resolveCreateRuntime() {
    return window.LayoutEngine?.previewShell?.bootstrap?.createPreviewSaveClientRuntime ?? null;
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
