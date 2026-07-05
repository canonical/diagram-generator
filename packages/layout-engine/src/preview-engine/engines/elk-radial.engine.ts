import { ELK_RADIAL_GRAPH_LAYOUT_ENGINE } from '@diagram-generator/graph-layout-elk';
import { elkRadialFrameDiagramRenderAdapter } from '../builtin-render-adapters.js';
import { elkRadialPreviewControlSpecs } from '../elk-controls.js';
import { defineElkAlgorithmPreviewEngine } from './elk-algorithm-engine.js';

export const ELK_RADIAL_PREVIEW_ENGINE_DEFINITION = {
  id: 'elk-radial',
  label: 'ELK radial layout',
  algorithmClass: 'radial-tree',
  layoutEngineKey: 'elk-radial',
  renderFamily: 'frame-elk-radial',
  graphEngine: ELK_RADIAL_GRAPH_LAYOUT_ENGINE,
  controlSpecs: elkRadialPreviewControlSpecs(),
  renderAdapter: elkRadialFrameDiagramRenderAdapter,
  description: 'Radial ELK layout for hub-and-spoke graph structures',
  compatibility: {
    description: 'Radial ELK layout for hub-and-spoke graph structures',
    frameDiagramRequirements: {
      minArrowCount: 1,
      requiresTree: true,
      rejectUnsupportedCarrierIds: true,
    },
  },
};

const definedElkRadialPreviewEngine = defineElkAlgorithmPreviewEngine(
  ELK_RADIAL_PREVIEW_ENGINE_DEFINITION,
);

export const ELK_RADIAL_PREVIEW_ENGINE = definedElkRadialPreviewEngine.manifest;
export const BUILTIN_ELK_RADIAL_PREVIEW_ENGINE_INSTALL_UNIT = definedElkRadialPreviewEngine.installUnit;

export function installElkRadialPreviewEngine(): () => void {
  const uninstall = BUILTIN_ELK_RADIAL_PREVIEW_ENGINE_INSTALL_UNIT.install();
  return typeof uninstall === 'function' ? uninstall : () => {};
}
