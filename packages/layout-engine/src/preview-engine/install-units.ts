export interface PreviewEngineInstallUnit {
  readonly key: string;
  install: () => (() => void) | void;
}

const previewEngineInstallUnitRegistry: PreviewEngineInstallUnit[] = [];

export function registerPreviewEngineInstallUnit(
  installUnit: PreviewEngineInstallUnit,
): () => void {
  if (previewEngineInstallUnitRegistry.some((entry) => entry.key === installUnit.key)) {
    throw new Error(`Preview engine install unit '${installUnit.key}' is already registered`);
  }
  previewEngineInstallUnitRegistry.push(installUnit);
  return () => {
    const index = previewEngineInstallUnitRegistry.findIndex((entry) => entry.key === installUnit.key);
    if (index >= 0) {
      previewEngineInstallUnitRegistry.splice(index, 1);
    }
  };
}

export function listPreviewEngineInstallUnits(): PreviewEngineInstallUnit[] {
  return previewEngineInstallUnitRegistry.map((entry) => entry);
}

export function installPreviewEngineInstallUnits(
  installUnits: readonly PreviewEngineInstallUnit[],
): () => void {
  const uninstallers = installUnits
    .map((installUnit) => installUnit.install())
    .filter((uninstall): uninstall is () => void => typeof uninstall === 'function');
  return () => {
    for (let index = uninstallers.length - 1; index >= 0; index -= 1) {
      uninstallers[index]?.();
    }
  };
}

export function installRegisteredPreviewEngineInstallUnits(): () => void {
  return installPreviewEngineInstallUnits(listPreviewEngineInstallUnits());
}
