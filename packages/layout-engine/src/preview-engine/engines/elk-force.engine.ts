import { ELK_FORCE_GRAPH_LAYOUT_ENGINE } from '@diagram-generator/graph-layout-elk';
import { elkForceFrameDiagramRenderAdapter } from '../builtin-render-adapters.js';
import { defineGraphLayoutPreviewEngine, type GraphLayoutPreviewEngineDefinition } from '../define-graph-layout-engine.js';
import { elkForcePreviewControlSpecs } from '../elk-controls.js';

export const ELK_FORCE_PREVIEW_ENGINE_DEFINITION: GraphLayoutPreviewEngineDefinition = {
  id: 'elk-force',
  label: 'ELK force layout',
  layoutEngineKey: 'elk-force',
  renderFamily: 'frame-elk-force',
  graphEngine: ELK_FORCE_GRAPH_LAYOUT_ENGINE,
  controlSpecs: elkForcePreviewControlSpecs(),
  sidebarSections: ['elk-layout'],
  compatibility: {
    description: 'Force-directed ELK layout for organic graph structures',
    frameDiagramRequirements: {
      minArrowCount: 1,
      rejectFillCarrierIdsWithoutDiagramType: true,
      rejectUnsupportedCarrierIds: true,
    },
  },
  renderAdapter: elkForceFrameDiagramRenderAdapter,
  scripts: ['elk-layout-controls.js', 'elk-controller.js'],
};

const definedElkForcePreviewEngine = defineGraphLayoutPreviewEngine(
  ELK_FORCE_PREVIEW_ENGINE_DEFINITION,
);

export const ELK_FORCE_PREVIEW_ENGINE = definedElkForcePreviewEngine.manifest;
export const BUILTIN_ELK_FORCE_PREVIEW_ENGINE_INSTALL_UNIT = definedElkForcePreviewEngine.installUnit;

export function installElkForcePreviewEngine(): () => void {
  const uninstall = BUILTIN_ELK_FORCE_PREVIEW_ENGINE_INSTALL_UNIT.install();
  return typeof uninstall === 'function' ? uninstall : () => {};
}
