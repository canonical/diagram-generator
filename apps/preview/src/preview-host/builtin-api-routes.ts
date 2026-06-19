import {
  createComponentTreePreviewHostApiRoute,
  createFrameOverridesPreviewHostApiRoute,
  createFrameTreePreviewHostApiRoute,
  createGridInfoPreviewHostApiRoute,
  createPreviewDocumentPreviewHostApiRoute,
  createPreviewSvgHostApiRoute,
  installBuiltinAutolayoutPreviewHostApiRoutes,
} from "./builtin-autolayout-host.js";
import {
  createForceSavePreviewHostApiRoute,
  createForceSpecPreviewHostApiRoute,
  installBuiltinForcePreviewHostApiRoutes,
} from "./builtin-force-host.js";

export {
  createComponentTreePreviewHostApiRoute,
  createForceSavePreviewHostApiRoute,
  createForceSpecPreviewHostApiRoute,
  createFrameOverridesPreviewHostApiRoute,
  createFrameTreePreviewHostApiRoute,
  createGridInfoPreviewHostApiRoute,
  createPreviewDocumentPreviewHostApiRoute,
  createPreviewSvgHostApiRoute,
};

export function installBuiltinPreviewHostApiRoutes(): () => void {
  const unregisterAutolayout = installBuiltinAutolayoutPreviewHostApiRoutes();
  const unregisterForce = installBuiltinForcePreviewHostApiRoutes();
  return () => {
    unregisterForce();
    unregisterAutolayout();
  };
}
