import type { BuiltinPreviewHostViewerRouteDeps } from "./builtin-viewer-routes.js";

export interface PreviewHostModuleDescriptor {
  readonly key: string;
  install: (deps: PreviewHostModuleInstallDeps) => (() => void) | void;
}

export interface PreviewHostModuleInstallDeps
  extends BuiltinPreviewHostViewerRouteDeps {}

const previewHostModuleRegistry: PreviewHostModuleDescriptor[] = [];

export function registerPreviewHostModule(
  descriptor: PreviewHostModuleDescriptor,
): () => void {
  if (previewHostModuleRegistry.some((entry) => entry.key === descriptor.key)) {
    throw new Error(`Preview host module '${descriptor.key}' is already registered`);
  }
  previewHostModuleRegistry.push(descriptor);
  return () => {
    const index = previewHostModuleRegistry.findIndex((entry) => entry.key === descriptor.key);
    if (index >= 0) {
      previewHostModuleRegistry.splice(index, 1);
    }
  };
}

export function listPreviewHostModules(): PreviewHostModuleDescriptor[] {
  return previewHostModuleRegistry.map((entry) => entry);
}

export function installRegisteredPreviewHostModules(
  deps: PreviewHostModuleInstallDeps,
): () => void {
  const uninstallers = listPreviewHostModules()
    .map((descriptor) => descriptor.install(deps))
    .filter((uninstall): uninstall is () => void => typeof uninstall === "function");
  return () => {
    for (let index = uninstallers.length - 1; index >= 0; index -= 1) {
      const uninstall = uninstallers[index];
      if (uninstall) {
        uninstall();
      }
    }
  };
}
