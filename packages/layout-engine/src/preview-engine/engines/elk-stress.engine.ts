import { ELK_STRESS_GRAPH_LAYOUT_ENGINE } from '@diagram-generator/graph-layout-elk';
import { elkStressFrameDiagramRenderAdapter } from '../builtin-render-adapters.js';
import { elkStressPreviewControlSpecs } from '../elk-controls.js';
import { defineElkAlgorithmPreviewEngine } from './elk-algorithm-engine.js';

export const ELK_STRESS_PREVIEW_ENGINE_DEFINITION = {
  id: 'elk-stress',
  label: 'ELK stress layout',
  algorithmClass: 'stress-majorization',
  layoutEngineKey: 'elk-stress',
  renderFamily: 'frame-elk-stress',
  graphEngine: ELK_STRESS_GRAPH_LAYOUT_ENGINE,
  controlSpecs: elkStressPreviewControlSpecs(),
  renderAdapter: elkStressFrameDiagramRenderAdapter,
  description: 'Stress-minimization ELK layout for relationship graphs',
  compatibility: {
    description: 'Stress-minimization ELK layout for relationship graphs',
    frameDiagramRequirements: {
      minArrowCount: 1,
      rejectUnsupportedCarrierIds: true,
    },
  },
};

const definedElkStressPreviewEngine = defineElkAlgorithmPreviewEngine(
  ELK_STRESS_PREVIEW_ENGINE_DEFINITION,
);

export const ELK_STRESS_PREVIEW_ENGINE = definedElkStressPreviewEngine.manifest;
export const BUILTIN_ELK_STRESS_PREVIEW_ENGINE_INSTALL_UNIT = definedElkStressPreviewEngine.installUnit;

export function installElkStressPreviewEngine(): () => void {
  const uninstall = BUILTIN_ELK_STRESS_PREVIEW_ENGINE_INSTALL_UNIT.install();
  return typeof uninstall === 'function' ? uninstall : () => {};
}
