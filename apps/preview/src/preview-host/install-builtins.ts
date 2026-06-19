import {
  installBuiltinPreviewHostApiRoutes,
  type BuiltinPreviewHostApiRouteDeps,
} from "./builtin-api-routes.js";
import {
  installBuiltinPreviewHostViewerRoutes,
  type BuiltinPreviewHostViewerRouteDeps,
} from "./builtin-viewer-routes.js";

export interface BuiltinPreviewHostInstallDeps
  extends BuiltinPreviewHostViewerRouteDeps, BuiltinPreviewHostApiRouteDeps {}

export function installBuiltinPreviewHost(
  deps: BuiltinPreviewHostInstallDeps,
): () => void {
  const uninstallViewerRoutes = installBuiltinPreviewHostViewerRoutes(deps);
  const uninstallApiRoutes = installBuiltinPreviewHostApiRoutes(deps);
  return () => {
    uninstallApiRoutes();
    uninstallViewerRoutes();
  };
}
