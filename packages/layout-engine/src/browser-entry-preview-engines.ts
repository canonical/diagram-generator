import * as previewShellRuntime from './preview-shell/index.js';
import * as previewEngineRuntime from './preview-engine/index.js';
import {
  ELK_FORCE_PREVIEW_ENGINE,
  ELK_LAYERED_PREVIEW_ENGINE,
  FORCE_PREVIEW_PARAM_SPECS,
  FORCE_PREVIEW_ENGINE,
  PREVIEW_ENGINE_REGISTRY,
  SEQUENCE_PREVIEW_ENGINE,
  elkForcePreviewControlSpecs,
  elkLayeredPreviewControlSpecs,
  getPreviewEngine,
  listPreviewEngines,
  listPreviewEnginesBySidebarSection,
  registerPreviewEngine,
  resolvePreviewEngine,
  serializePreviewEngineManifest,
} from './preview-engine/index.js';
import {
  ELK_LAYERED_PARAM_SPECS,
  ELK_FORCE_PARAM_SPECS,
  elkParamGroups,
} from '@diagram-generator/graph-layout-elk';
import {
  applyForceNodePatch,
  createInitialForceSnapshot,
  exportForceAuthoredSpec,
  exportForceSnapshot,
  tickForceSimulation,
  updateForceSimulationParams,
} from './force-runtime.js';

export const previewEngines = Object.freeze({
  registry: Object.freeze({
    PREVIEW_ENGINE_REGISTRY,
    getPreviewEngine,
    listPreviewEnginesBySidebarSection,
    listPreviewEngines,
    registerPreviewEngine,
    resolvePreviewEngine,
    serializePreviewEngineManifest,
    runtime: previewEngineRuntime,
  }),
  elk: Object.freeze({
    ELK_LAYERED_PREVIEW_ENGINE,
    ELK_FORCE_PREVIEW_ENGINE,
    createPreviewElkLayoutControlsRuntime: previewEngineRuntime.createPreviewElkLayoutControlsRuntime,
    createPreviewElkShellControllerRuntime: previewEngineRuntime.createPreviewElkShellControllerRuntime,
    elkForcePreviewControlSpecs,
    elkLayeredPreviewControlSpecs,
    ELK_LAYERED_PARAM_SPECS,
    ELK_FORCE_PARAM_SPECS,
    elkParamGroups,
    renderPreviewElkDebugOverlay: previewEngineRuntime.renderPreviewElkDebugOverlay,
    renderPreviewElkRawView: previewEngineRuntime.renderPreviewElkRawView,
    ensurePreviewEngineShellController: previewShellRuntime.ensurePreviewEngineShellController,
    ensurePreviewElkPreviewController: previewShellRuntime.ensurePreviewElkPreviewController,
  }),
  force: Object.freeze({
    FORCE_PREVIEW_ENGINE,
    FORCE_PREVIEW_PARAM_SPECS,
    createInitialForceSnapshot,
    updateForceSimulationParams,
    exportForceSnapshot,
    exportForceAuthoredSpec,
    tickForceSimulation,
    applyForceNodePatch,
  }),
  sequence: Object.freeze({
    SEQUENCE_PREVIEW_ENGINE,
  }),
});
