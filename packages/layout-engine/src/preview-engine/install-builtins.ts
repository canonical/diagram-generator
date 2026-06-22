import {
  installBuiltinPreviewEngineInstallUnitsRuntime,
} from './builtin-install-units.js';
import { installRegisteredPreviewEngineInstallUnits } from './install-units.js';

let builtinPreviewEngineRuntimeInstalled = false;

export function installBuiltinPreviewEngineRuntime(): void {
  if (builtinPreviewEngineRuntimeInstalled) {
    return;
  }
  builtinPreviewEngineRuntimeInstalled = true;
  installBuiltinPreviewEngineInstallUnitsRuntime();
  installRegisteredPreviewEngineInstallUnits();
}

installBuiltinPreviewEngineRuntime();
