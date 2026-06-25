import {
  BUILTIN_ELK_FORCE_PREVIEW_ENGINE_INSTALL_UNIT,
  BUILTIN_ELK_LAYERED_PREVIEW_ENGINE_INSTALL_UNIT,
  BUILTIN_ELK_MRTREE_PREVIEW_ENGINE_INSTALL_UNIT,
  BUILTIN_ELK_RADIAL_PREVIEW_ENGINE_INSTALL_UNIT,
  BUILTIN_ELK_RECTPACKING_PREVIEW_ENGINE_INSTALL_UNIT,
  BUILTIN_ELK_STRESS_PREVIEW_ENGINE_INSTALL_UNIT,
  BUILTIN_FORCE_PREVIEW_ENGINE_INSTALL_UNIT,
  BUILTIN_SEQUENCE_PREVIEW_ENGINE_INSTALL_UNIT,
  BUILTIN_V3_PREVIEW_ENGINE_INSTALL_UNIT,
} from './builtins.js';
import { registerPreviewEngineInstallUnit } from './install-units.js';

let builtinPreviewEngineInstallUnitsRuntimeInstalled = false;

export function installBuiltinPreviewEngineInstallUnitsRuntime(): void {
  if (builtinPreviewEngineInstallUnitsRuntimeInstalled) {
    return;
  }
  builtinPreviewEngineInstallUnitsRuntimeInstalled = true;
  registerPreviewEngineInstallUnit(BUILTIN_V3_PREVIEW_ENGINE_INSTALL_UNIT);
  registerPreviewEngineInstallUnit(BUILTIN_ELK_LAYERED_PREVIEW_ENGINE_INSTALL_UNIT);
  registerPreviewEngineInstallUnit(BUILTIN_ELK_FORCE_PREVIEW_ENGINE_INSTALL_UNIT);
  registerPreviewEngineInstallUnit(BUILTIN_ELK_STRESS_PREVIEW_ENGINE_INSTALL_UNIT);
  registerPreviewEngineInstallUnit(BUILTIN_ELK_MRTREE_PREVIEW_ENGINE_INSTALL_UNIT);
  registerPreviewEngineInstallUnit(BUILTIN_ELK_RADIAL_PREVIEW_ENGINE_INSTALL_UNIT);
  registerPreviewEngineInstallUnit(BUILTIN_ELK_RECTPACKING_PREVIEW_ENGINE_INSTALL_UNIT);
  registerPreviewEngineInstallUnit(BUILTIN_FORCE_PREVIEW_ENGINE_INSTALL_UNIT);
  registerPreviewEngineInstallUnit(BUILTIN_SEQUENCE_PREVIEW_ENGINE_INSTALL_UNIT);
}
