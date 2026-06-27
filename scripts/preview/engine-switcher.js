"use strict";
(function initEngineWorkspaceChrome() {
  const bootstrap = window.__DG_getPreviewShellBootstrapContract?.();
  if (!bootstrap || typeof bootstrap.initPreviewEngineWorkspaceChrome !== "function") {
    throw new Error("preview/engine-switcher.js requires the previewShell bootstrap contract");
  }
  bootstrap.initPreviewEngineWorkspaceChrome({
    document,
    previewWindow: window,
    fetchFn: fetch,
  });
})();
