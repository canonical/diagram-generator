import { ELK_RECTPACKING_GRAPH_LAYOUT_ENGINE } from '@diagram-generator/graph-layout-elk';
import { elkRectpackingFrameDiagramRenderAdapter } from '../builtin-render-adapters.js';
import { elkRectpackingPreviewControlSpecs } from '../elk-controls.js';
import { defineElkAlgorithmPreviewEngine } from './elk-algorithm-engine.js';

export const ELK_RECTPACKING_PREVIEW_ENGINE_DEFINITION = {
  id: 'elk-rectpacking',
  label: 'ELK rectangle packing',
  algorithmClass: 'rectangle-packing',
  layoutEngineKey: 'elk-rectpacking',
  renderFamily: 'frame-elk-rectpacking',
  graphEngine: ELK_RECTPACKING_GRAPH_LAYOUT_ENGINE,
  controlSpecs: elkRectpackingPreviewControlSpecs(),
  renderAdapter: elkRectpackingFrameDiagramRenderAdapter,
  description: 'Rectangle-packing ELK layout for dense frame groups',
  compatibility: {
    description: 'Rectangle-packing ELK layout for dense frame groups',
    frameDiagramRequirements: {
      minArrowCount: 1,
      offerDiagramTypes: ['deployment_and_runtime_topology'] as const,
      rejectUnsupportedCarrierIds: true,
    },
  },
};

const definedElkRectpackingPreviewEngine = defineElkAlgorithmPreviewEngine(
  ELK_RECTPACKING_PREVIEW_ENGINE_DEFINITION,
);

export const ELK_RECTPACKING_PREVIEW_ENGINE = definedElkRectpackingPreviewEngine.manifest;
export const BUILTIN_ELK_RECTPACKING_PREVIEW_ENGINE_INSTALL_UNIT = definedElkRectpackingPreviewEngine.installUnit;

export function installElkRectpackingPreviewEngine(): () => void {
  const uninstall = BUILTIN_ELK_RECTPACKING_PREVIEW_ENGINE_INSTALL_UNIT.install();
  return typeof uninstall === 'function' ? uninstall : () => {};
}
