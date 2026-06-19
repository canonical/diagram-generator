import { registerPreviewHostApiRoute } from "./api-routes.js";
import {
  createComponentTreePreviewHostApiRoute,
  createFrameOverridesPreviewHostApiRoute,
  createFrameTreePreviewHostApiRoute,
  createGridInfoPreviewHostApiRoute,
  createPreviewDocumentPreviewHostApiRoute,
  createPreviewSvgHostApiRoute,
} from "./builtin-api-routes.js";
import {
  createAutolayoutPreviewHostViewerRoute,
  type BuiltinPreviewHostViewerRouteDeps,
} from "./builtin-viewer-routes.js";
import { registerPreviewHostViewerRoute } from "./registry.js";

export interface BuiltinAutolayoutPreviewHostModuleDeps
  extends BuiltinPreviewHostViewerRouteDeps {}

export function installBuiltinAutolayoutPreviewHostModule(
  deps: BuiltinAutolayoutPreviewHostModuleDeps,
): () => void {
  const unregisterViewerRoute = registerPreviewHostViewerRoute(
    createAutolayoutPreviewHostViewerRoute(deps),
  );
  const unregisterFrameOverrides = registerPreviewHostApiRoute(
    createFrameOverridesPreviewHostApiRoute(),
  );
  const unregisterPreviewDocument = registerPreviewHostApiRoute(
    createPreviewDocumentPreviewHostApiRoute(),
  );
  const unregisterFrameTree = registerPreviewHostApiRoute(
    createFrameTreePreviewHostApiRoute(),
  );
  const unregisterComponentTree = registerPreviewHostApiRoute(
    createComponentTreePreviewHostApiRoute(),
  );
  const unregisterGridInfo = registerPreviewHostApiRoute(
    createGridInfoPreviewHostApiRoute(),
  );
  const unregisterSvgExport = registerPreviewHostApiRoute(
    createPreviewSvgHostApiRoute(),
  );
  return () => {
    unregisterSvgExport();
    unregisterGridInfo();
    unregisterComponentTree();
    unregisterFrameTree();
    unregisterPreviewDocument();
    unregisterFrameOverrides();
    unregisterViewerRoute();
  };
}
