import {
  type BuiltinPreviewHostViewerRouteDeps,
} from "./builtin-viewer-routes.js";
import { installBuiltinAutolayoutPreviewHostModule } from "./builtin-autolayout-host.js";
import { installBuiltinForcePreviewHostModule } from "./builtin-force-host.js";

export interface BuiltinPreviewHostInstallDeps
  extends BuiltinPreviewHostViewerRouteDeps {}

export function installBuiltinPreviewHost(
  deps: BuiltinPreviewHostInstallDeps,
): () => void {
  const uninstallForceModule = installBuiltinForcePreviewHostModule(deps);
  const uninstallAutolayoutModule = installBuiltinAutolayoutPreviewHostModule(deps);
  return () => {
    uninstallAutolayoutModule();
    uninstallForceModule();
  };
}
