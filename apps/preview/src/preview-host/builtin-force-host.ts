import { registerPreviewHostApiRoute } from "./api-routes.js";
import {
  createForceSavePreviewHostApiRoute,
  createForceSpecPreviewHostApiRoute,
} from "./builtin-api-routes.js";
import {
  createForcePreviewHostViewerRoute,
  type BuiltinPreviewHostViewerRouteDeps,
} from "./builtin-viewer-routes.js";
import { registerPreviewHostViewerRoute } from "./registry.js";

export interface BuiltinForcePreviewHostModuleDeps
  extends BuiltinPreviewHostViewerRouteDeps {}

export function installBuiltinForcePreviewHostModule(
  deps: BuiltinForcePreviewHostModuleDeps,
): () => void {
  const unregisterViewerRoute = registerPreviewHostViewerRoute(
    createForcePreviewHostViewerRoute(deps),
  );
  const unregisterForceSave = registerPreviewHostApiRoute(
    createForceSavePreviewHostApiRoute(),
  );
  const unregisterForceSpec = registerPreviewHostApiRoute(
    createForceSpecPreviewHostApiRoute(),
  );
  return () => {
    unregisterForceSpec();
    unregisterForceSave();
    unregisterViewerRoute();
  };
}
