import { ELK_MRTREE_GRAPH_LAYOUT_ENGINE } from '@diagram-generator/graph-layout-elk';
import { elkMrTreeFrameDiagramRenderAdapter } from '../builtin-render-adapters.js';
import { elkMrtreePreviewControlSpecs } from '../elk-controls.js';
import { defineElkAlgorithmPreviewEngine } from './elk-algorithm-engine.js';

export const ELK_MRTREE_PREVIEW_ENGINE_DEFINITION = {
  id: 'elk-mrtree',
  label: 'ELK tree layout',
  layoutEngineKey: 'elk-mrtree',
  renderFamily: 'frame-elk-mrtree',
  graphEngine: ELK_MRTREE_GRAPH_LAYOUT_ENGINE,
  controlSpecs: elkMrtreePreviewControlSpecs(),
  renderAdapter: elkMrTreeFrameDiagramRenderAdapter,
  description: 'ELK mrtree layout for tree-shaped frame diagrams',
  compatibility: {
    description: 'ELK mrtree layout for tree-shaped frame diagrams',
    frameDiagramRequirements: {
      minArrowCount: 1,
      rejectUnsupportedCarrierIds: true,
    },
  },
};

const definedElkMrtreePreviewEngine = defineElkAlgorithmPreviewEngine(
  ELK_MRTREE_PREVIEW_ENGINE_DEFINITION,
);

export const ELK_MRTREE_PREVIEW_ENGINE = definedElkMrtreePreviewEngine.manifest;
export const BUILTIN_ELK_MRTREE_PREVIEW_ENGINE_INSTALL_UNIT = definedElkMrtreePreviewEngine.installUnit;

export function installElkMrtreePreviewEngine(): () => void {
  const uninstall = BUILTIN_ELK_MRTREE_PREVIEW_ENGINE_INSTALL_UNIT.install();
  return typeof uninstall === 'function' ? uninstall : () => {};
}
