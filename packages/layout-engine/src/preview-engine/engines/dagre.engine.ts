import { DAGRE_GRAPH_LAYOUT_ENGINE } from '@diagram-generator/graph-layout-dagre';
import { dagreFrameDiagramRenderAdapter } from '../builtin-render-adapters.js';
import { dagrePreviewControlSpecs } from '../dagre-controls.js';
import { defineGraphLayoutPreviewEngine, type GraphLayoutPreviewEngineDefinition } from '../define-graph-layout-engine.js';

export const DAGRE_PREVIEW_ENGINE_DEFINITION: GraphLayoutPreviewEngineDefinition = {
  id: 'dagre',
  label: 'Dagre layout',
  layoutEngineKey: 'dagre',
  renderFamily: 'frame-dagre',
  graphEngine: DAGRE_GRAPH_LAYOUT_ENGINE,
  controlSpecs: dagrePreviewControlSpecs(),
  sidebarSections: ['graph-layout'],
  compatibility: {
    description: 'Dagre rank-based layout for Mermaid-style directed graphs',
    frameDiagramRequirements: {
      minArrowCount: 1,
      rejectUnsupportedCarrierIds: true,
    },
  },
  renderAdapter: dagreFrameDiagramRenderAdapter,
  scripts: ['graph-layout-controls.js', 'graph-layout-controller.js'],
};

const definedDagrePreviewEngine = defineGraphLayoutPreviewEngine(
  DAGRE_PREVIEW_ENGINE_DEFINITION,
);

export const DAGRE_PREVIEW_ENGINE = definedDagrePreviewEngine.manifest;
export const BUILTIN_DAGRE_PREVIEW_ENGINE_INSTALL_UNIT = definedDagrePreviewEngine.installUnit;

export function installDagrePreviewEngine(): () => void {
  const uninstall = BUILTIN_DAGRE_PREVIEW_ENGINE_INSTALL_UNIT.install();
  return typeof uninstall === 'function' ? uninstall : () => {};
}
