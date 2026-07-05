import { FORCE_PREVIEW_PARAM_SPECS } from './force-param-registry.js';
import type { PreviewEngineManifest } from './types.js';
import {
  installNativeFramePreviewRenderAdapter,
  installSequencePreviewDocumentSvgRenderer,
} from './builtin-render-adapters.js';
import { registerPreviewEngine } from './registry.js';
import type { PreviewEngineInstallUnit } from './install-units.js';
import {
  BUILTIN_ELK_FORCE_PREVIEW_ENGINE_INSTALL_UNIT,
} from './engines/elk-force.engine.js';
import {
  BUILTIN_ELK_MRTREE_PREVIEW_ENGINE_INSTALL_UNIT,
} from './engines/elk-mrtree.engine.js';
import {
  BUILTIN_ELK_LAYERED_PREVIEW_ENGINE_INSTALL_UNIT,
} from './engines/elk-layered.engine.js';
import {
  BUILTIN_ELK_RADIAL_PREVIEW_ENGINE_INSTALL_UNIT,
} from './engines/elk-radial.engine.js';
import {
  BUILTIN_ELK_RECTPACKING_PREVIEW_ENGINE_INSTALL_UNIT,
} from './engines/elk-rectpacking.engine.js';
import {
  BUILTIN_ELK_STRESS_PREVIEW_ENGINE_INSTALL_UNIT,
} from './engines/elk-stress.engine.js';
export {
  BUILTIN_ELK_FORCE_PREVIEW_ENGINE_INSTALL_UNIT,
  ELK_FORCE_PREVIEW_ENGINE,
  ELK_FORCE_PREVIEW_ENGINE_DEFINITION,
  installElkForcePreviewEngine,
} from './engines/elk-force.engine.js';
export {
  BUILTIN_ELK_MRTREE_PREVIEW_ENGINE_INSTALL_UNIT,
  ELK_MRTREE_PREVIEW_ENGINE,
  ELK_MRTREE_PREVIEW_ENGINE_DEFINITION,
  installElkMrtreePreviewEngine,
} from './engines/elk-mrtree.engine.js';
export {
  BUILTIN_ELK_LAYERED_PREVIEW_ENGINE_INSTALL_UNIT,
  ELK_LAYERED_PREVIEW_ENGINE,
  ELK_LAYERED_PREVIEW_ENGINE_DEFINITION,
  installElkLayeredPreviewEngine,
} from './engines/elk-layered.engine.js';
export {
  BUILTIN_ELK_RADIAL_PREVIEW_ENGINE_INSTALL_UNIT,
  ELK_RADIAL_PREVIEW_ENGINE,
  ELK_RADIAL_PREVIEW_ENGINE_DEFINITION,
  installElkRadialPreviewEngine,
} from './engines/elk-radial.engine.js';
export {
  BUILTIN_ELK_RECTPACKING_PREVIEW_ENGINE_INSTALL_UNIT,
  ELK_RECTPACKING_PREVIEW_ENGINE,
  ELK_RECTPACKING_PREVIEW_ENGINE_DEFINITION,
  installElkRectpackingPreviewEngine,
} from './engines/elk-rectpacking.engine.js';
export {
  BUILTIN_ELK_STRESS_PREVIEW_ENGINE_INSTALL_UNIT,
  ELK_STRESS_PREVIEW_ENGINE,
  ELK_STRESS_PREVIEW_ENGINE_DEFINITION,
  installElkStressPreviewEngine,
} from './engines/elk-stress.engine.js';

export const V3_PREVIEW_ENGINE: PreviewEngineManifest = {
  id: 'v3',
  label: 'Autolayout',
  algorithmClass: 'frame-native',
  layoutEngineKey: 'v3',
  shellMode: 'grid',
  renderFamily: 'frame-native',
  hostView: {
    sidebarSections: [],
  },
  capabilities: {
    layoutControls: false,
    localRelayout: true,
    serverRelayout: false,
    engineBackedSave: false,
    nodeInspector: true,
    gridEditing: true,
    referenceImage: true,
    simulationControls: false,
    rawDebugView: false,
  },
  controlSpecs: [],
  scripts: [],
  compatibility: {
    documentKinds: ['frame-diagram'],
    description: 'Canonical autolayout for authored frame diagrams',
  },
};

export const FORCE_PREVIEW_ENGINE: PreviewEngineManifest = {
  id: 'force',
  label: 'Force-directed layout',
  algorithmClass: 'force-simulation',
  shellMode: 'force',
  renderFamily: 'force',
  hostView: {
    sidebarSections: [],
  },
  capabilities: {
    layoutControls: false,
    localRelayout: true,
    serverRelayout: false,
    engineBackedSave: true,
    nodeInspector: true,
    gridEditing: false,
    referenceImage: true,
    simulationControls: true,
    rawDebugView: false,
  },
  controlSpecs: FORCE_PREVIEW_PARAM_SPECS,
  scripts: ['force.js'],
  apiRoutes: {
    save: '/api/force-save/{slug}',
    spec: '/api/force-spec/{slug}',
  },
  compatibility: {
    documentKinds: ['force-spec'],
    description: 'Physics-based force-directed layout for organic graph structures',
  },
};

export const SEQUENCE_PREVIEW_ENGINE: PreviewEngineManifest = {
  id: 'sequence',
  label: 'Sequence layout',
  algorithmClass: 'sequence-timeline',
  layoutEngineKey: 'sequence',
  shellMode: 'grid',
  renderFamily: 'sequence',
  hostView: {
    sidebarSections: [],
  },
  capabilities: {
    layoutControls: false,
    localRelayout: true,
    serverRelayout: false,
    engineBackedSave: false,
    nodeInspector: false,
    gridEditing: false,
    referenceImage: true,
    simulationControls: false,
    rawDebugView: false,
  },
  controlSpecs: [],
  scripts: [],
  compatibility: {
    documentKinds: ['sequence'],
    requiredLayoutEngineKey: 'sequence',
    description: 'Timeline-based layout for sequence diagrams and message flows',
  },
};

function composePreviewEngineInstallUnit(
  registerEngine: () => () => void,
  ...installers: Array<() => (() => void) | void>
): () => void {
  const unregisterers: Array<() => void> = [];
  unregisterers.push(registerEngine());
  for (const install of installers) {
    const unregister = install();
    if (typeof unregister === 'function') {
      unregisterers.push(unregister);
    }
  }
  return () => {
    for (let index = unregisterers.length - 1; index >= 0; index -= 1) {
      unregisterers[index]?.();
    }
  };
}

export function installV3PreviewEngine(): () => void {
  return composePreviewEngineInstallUnit(
    () => registerPreviewEngine(V3_PREVIEW_ENGINE),
    installNativeFramePreviewRenderAdapter,
  );
}

export function installForcePreviewEngine(): () => void {
  return composePreviewEngineInstallUnit(
    () => registerPreviewEngine(FORCE_PREVIEW_ENGINE),
  );
}

export function installSequencePreviewEngine(): () => void {
  return composePreviewEngineInstallUnit(
    () => registerPreviewEngine(SEQUENCE_PREVIEW_ENGINE),
    installSequencePreviewDocumentSvgRenderer,
  );
}

export const BUILTIN_V3_PREVIEW_ENGINE_INSTALL_UNIT: PreviewEngineInstallUnit = {
  key: 'v3',
  install: installV3PreviewEngine,
};

export const BUILTIN_FORCE_PREVIEW_ENGINE_INSTALL_UNIT: PreviewEngineInstallUnit = {
  key: 'force',
  install: installForcePreviewEngine,
};

export const BUILTIN_SEQUENCE_PREVIEW_ENGINE_INSTALL_UNIT: PreviewEngineInstallUnit = {
  key: 'sequence',
  install: installSequencePreviewEngine,
};

export const BUILTIN_PREVIEW_ENGINE_INSTALL_UNITS: readonly PreviewEngineInstallUnit[] = Object.freeze([
  BUILTIN_V3_PREVIEW_ENGINE_INSTALL_UNIT,
  BUILTIN_ELK_LAYERED_PREVIEW_ENGINE_INSTALL_UNIT,
  BUILTIN_ELK_FORCE_PREVIEW_ENGINE_INSTALL_UNIT,
  BUILTIN_ELK_STRESS_PREVIEW_ENGINE_INSTALL_UNIT,
  BUILTIN_ELK_MRTREE_PREVIEW_ENGINE_INSTALL_UNIT,
  BUILTIN_ELK_RADIAL_PREVIEW_ENGINE_INSTALL_UNIT,
  BUILTIN_ELK_RECTPACKING_PREVIEW_ENGINE_INSTALL_UNIT,
  BUILTIN_FORCE_PREVIEW_ENGINE_INSTALL_UNIT,
  BUILTIN_SEQUENCE_PREVIEW_ENGINE_INSTALL_UNIT,
]);
