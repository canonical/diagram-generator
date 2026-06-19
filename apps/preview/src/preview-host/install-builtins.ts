import {
  installBuiltinPreviewHostModulesRuntime,
} from "./builtin-modules.js";
import {
  installRegisteredPreviewHostModules,
  type PreviewHostModuleInstallDeps,
} from "./modules.js";

export interface BuiltinPreviewHostInstallDeps
  extends PreviewHostModuleInstallDeps {}

export function installBuiltinPreviewHost(
  deps: BuiltinPreviewHostInstallDeps,
): () => void {
  installBuiltinPreviewHostModulesRuntime();
  return installRegisteredPreviewHostModules(deps);
}
