import { elkLayeredPreviewControlSpecs } from './elk-controls.js';
import { FORCE_PREVIEW_PARAM_SPECS } from './force-param-registry.js';
import type { PreviewEngineManifest } from './types.js';
import {
  installElkFramePreviewRenderAdapter,
  installNativeFramePreviewRenderAdapter,
  installSequencePreviewDocumentSvgRenderer,
} from './builtin-render-adapters.js';
import { registerPreviewEngine } from './registry.js';
import type { PreviewEngineInstallUnit } from './install-units.js';

export const V3_PREVIEW_ENGINE: PreviewEngineManifest = {
  id: 'v3',
  label: 'Native v3 autolayout',
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
    description: 'Canonical native v3 autolayout for authored frame diagrams',
  },
};

export const ELK_LAYERED_PREVIEW_ENGINE: PreviewEngineManifest = {
  id: 'elk-layered',
  label: 'ELK layered layout',
  layoutEngineKey: 'elk-layered',
  shellMode: 'grid',
  renderFamily: 'frame-elk',
  hostView: {
    sidebarSections: ['elk-layout'],
  },
  capabilities: {
    layoutControls: true,
    localRelayout: false,
    serverRelayout: true,
    engineBackedSave: true,
    nodeInspector: true,
    gridEditing: false,
    referenceImage: true,
    simulationControls: false,
    rawDebugView: false,
  },
  controlSpecs: elkLayeredPreviewControlSpecs(),
  scripts: ['elk-layout-controls.js', 'elk-controller.js'],
  compatibility: {
    documentKinds: ['frame-diagram'],
    requiredLayoutEngineKey: 'elk-layered',
    description: 'Hierarchical layered layout for directed graphs and flowcharts',
    frameDiagramRequirements: {
      minArrowCount: 1,
      rejectUnsupportedCarrierIds: true,
    },
  },
};

export const FORCE_PREVIEW_ENGINE: PreviewEngineManifest = {
  id: 'force',
  label: 'Force-directed layout',
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

export function installElkLayeredPreviewEngine(): () => void {
  return composePreviewEngineInstallUnit(
    () => registerPreviewEngine(ELK_LAYERED_PREVIEW_ENGINE),
    installElkFramePreviewRenderAdapter,
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

export const BUILTIN_ELK_LAYERED_PREVIEW_ENGINE_INSTALL_UNIT: PreviewEngineInstallUnit = {
  key: 'elk-layered',
  install: installElkLayeredPreviewEngine,
};

export const BUILTIN_FORCE_PREVIEW_ENGINE_INSTALL_UNIT: PreviewEngineInstallUnit = {
  key: 'force',
  install: installForcePreviewEngine,
};

export const BUILTIN_SEQUENCE_PREVIEW_ENGINE_INSTALL_UNIT: PreviewEngineInstallUnit = {
  key: 'sequence',
  install: installSequencePreviewEngine,
};
