import { BUILTIN_AUTOLAYOUT_PREVIEW_HOST_MODULE } from "./builtin-autolayout-host.js";
import { BUILTIN_FORCE_PREVIEW_HOST_MODULE } from "./builtin-force-host.js";
import { BUILTIN_PREVIEW_HOST_SERVER_MODULE } from "./builtin-server-routes.js";
import { registerPreviewHostModule } from "./modules.js";

export const BUILTIN_PREVIEW_HOST_MODULES = [
  BUILTIN_PREVIEW_HOST_SERVER_MODULE,
  BUILTIN_FORCE_PREVIEW_HOST_MODULE,
  BUILTIN_AUTOLAYOUT_PREVIEW_HOST_MODULE,
] as const;

let builtinPreviewHostModulesInstalled = false;

export function installBuiltinPreviewHostModulesRuntime(): void {
  if (builtinPreviewHostModulesInstalled) {
    return;
  }
  builtinPreviewHostModulesInstalled = true;
  for (const descriptor of BUILTIN_PREVIEW_HOST_MODULES) {
    registerPreviewHostModule(descriptor);
  }
}
