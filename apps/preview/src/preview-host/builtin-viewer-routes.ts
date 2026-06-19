import type { BuiltinPreviewHostViewerRouteDeps } from "./builtin-host-deps.js";
import {
  createAutolayoutPreviewHostViewerRoute,
  installBuiltinAutolayoutPreviewHostViewerRoutes,
} from "./builtin-autolayout-host.js";
import {
  createForcePreviewHostViewerRoute,
  installBuiltinForcePreviewHostViewerRoutes,
} from "./builtin-force-host.js";

export type { BuiltinPreviewHostViewerRouteDeps };

export {
  createAutolayoutPreviewHostViewerRoute,
  createForcePreviewHostViewerRoute,
};

export function installBuiltinPreviewHostViewerRoutes(
  deps: BuiltinPreviewHostViewerRouteDeps,
): () => void {
  const unregisterForce = installBuiltinForcePreviewHostViewerRoutes(deps);
  const unregisterAutolayout = installBuiltinAutolayoutPreviewHostViewerRoutes(deps);
  return () => {
    unregisterAutolayout();
    unregisterForce();
  };
}
