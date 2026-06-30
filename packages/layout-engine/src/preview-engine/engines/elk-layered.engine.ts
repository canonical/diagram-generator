import { ELK_LAYERED_GRAPH_LAYOUT_ENGINE } from '@diagram-generator/graph-layout-elk';
import { elkFrameDiagramRenderAdapter } from '../builtin-render-adapters.js';
import { defineGraphLayoutPreviewEngine, type GraphLayoutPreviewEngineDefinition } from '../define-graph-layout-engine.js';
import { elkLayeredPreviewControlSpecs } from '../elk-controls.js';

export const ELK_LAYERED_PREVIEW_ENGINE_DEFINITION: GraphLayoutPreviewEngineDefinition = {
  id: 'elk-layered',
  label: 'ELK layered layout',
  layoutEngineKey: 'elk-layered',
  renderFamily: 'frame-elk',
  graphEngine: ELK_LAYERED_GRAPH_LAYOUT_ENGINE,
  controlSpecs: elkLayeredPreviewControlSpecs(),
  sidebarSections: ['layout-params'],
  capabilities: {
    rawDebugView: true,
  },
  compatibility: {
    description: 'Hierarchical layered layout for directed graphs and flowcharts',
    frameDiagramRequirements: {
      minArrowCount: 1,
      rejectFillCarrierIdsWithoutDiagramType: true,
    },
  },
  renderAdapter: elkFrameDiagramRenderAdapter,
  scripts: ['layout-params-controls.js', 'layout-params-controller.js'],
};

const definedElkLayeredPreviewEngine = defineGraphLayoutPreviewEngine(
  ELK_LAYERED_PREVIEW_ENGINE_DEFINITION,
);

export const ELK_LAYERED_PREVIEW_ENGINE = definedElkLayeredPreviewEngine.manifest;
export const BUILTIN_ELK_LAYERED_PREVIEW_ENGINE_INSTALL_UNIT = definedElkLayeredPreviewEngine.installUnit;

export function installElkLayeredPreviewEngine(): () => void {
  const uninstall = BUILTIN_ELK_LAYERED_PREVIEW_ENGINE_INSTALL_UNIT.install();
  return typeof uninstall === 'function' ? uninstall : () => {};
}
