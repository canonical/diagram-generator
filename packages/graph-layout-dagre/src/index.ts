export {
  type LayoutDirection,
  type SpacingProfile,
  type GraphNodeInput,
  type GraphEdgeInput,
  type GraphLayoutInput,
  type GraphLayoutEngineDescriptor,
  type GraphLayoutResult,
} from '@diagram-generator/graph-layout-core';

export {
  layoutDagre,
  type DagreLayoutOptions,
} from './dagre-layout.js';

export { DAGRE_GRAPH_LAYOUT_ENGINE } from './engine-capabilities.js';
export {
  DAGRE_PARAM_SPECS,
  dagreParamDefaults,
  type DagreParamKind,
  type DagreParamSpec,
} from './dagre-param-registry.js';
