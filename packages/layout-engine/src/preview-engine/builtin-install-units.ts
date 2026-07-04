import {
  BUILTIN_PREVIEW_ENGINE_INSTALL_UNITS,
} from './builtins.js';
import { registerPreviewEngineInstallUnit } from './install-units.js';

let builtinPreviewEngineInstallUnitsRuntimeInstalled = false;

export function installBuiltinPreviewEngineInstallUnitsRuntime(): void {
  if (builtinPreviewEngineInstallUnitsRuntimeInstalled) {
    return;
  }
  builtinPreviewEngineInstallUnitsRuntimeInstalled = true;
  for (const installUnit of BUILTIN_PREVIEW_ENGINE_INSTALL_UNITS) {
    registerPreviewEngineInstallUnit(installUnit);
  }
}
