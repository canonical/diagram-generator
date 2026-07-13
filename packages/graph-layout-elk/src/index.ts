export {
  type LayoutDirection,
  type SpacingProfile,
  type LayeredCorpusFamily,
  type ForceCorpusFamily,
  type GraphInsetsInput,
  type GraphPortSide,
  type GraphPortAnchorOffset,
  type GraphPortSideAnchorInput,
  type GraphPortPointAnchorInput,
  type GraphPortAnchorInput,
  type GraphPortInput,
  type GraphNodeInput,
  type GraphLabelPlacement,
  type GraphEdgeInput,
  type GraphConstraintAxis,
  type GraphOrderConstraintInput,
  type GraphAlignmentConstraintInput,
  type GraphConstraintInput,
  type GraphLayoutInput,
  type GraphPortPlacement,
  type PlacedNode,
  type PlacedEdge,
  type GraphLayoutEngineId,
  type GraphLayoutSizingCapabilities,
  type GraphLayoutPortCapabilities,
  type GraphLayoutLabelCapabilities,
  type GraphLayoutConstraintCapabilities,
  type GraphLayoutCompoundCapabilities,
  type GraphLayoutCapabilities,
  type GraphLayoutEngineDescriptor,
  type GraphLayoutResult,
  GRID_BASELINE_PX,
  roundToGrid,
  resolveGraphPortPlacement,
} from '@diagram-generator/graph-layout-core';

export {
  ELK_FORCE_GRAPH_LAYOUT_ENGINE,
  ELK_LAYERED_GRAPH_LAYOUT_ENGINE,
  ELK_MRTREE_GRAPH_LAYOUT_ENGINE,
  ELK_RADIAL_GRAPH_LAYOUT_ENGINE,
  ELK_RECTPACKING_GRAPH_LAYOUT_ENGINE,
  ELK_STRESS_GRAPH_LAYOUT_ENGINE,
} from './engine-capabilities.js';

export {
  buildElkAlgorithmLayoutOptions,
  layoutElkAlgorithm,
  type ElkPreviewAlgorithm,
  type LayoutElkAlgorithmOptions,
} from './elk-algorithm.js';

export {
  layoutLayered,
  layoutLayeredForFamily,
  buildElkGraphFromInput,
  layeredConfigForFamily,
  buildLayeredLayoutOptions,
  resolvedElkOptionsForFamily,
  elkParamGroups,
  type LayoutLayeredOptions,
  type LayoutLayeredForFamilyOptions,
} from './elk-layered.js';
export {
  buildElkGraph,
  buildInputTreeData,
  buildSubgraphLayoutOptions,
} from './elk-graph-builder.js';

export {
  layoutForce,
  layoutForceForFamily,
  buildForceLayoutOptions,
  forceConfigForFamily,
  resolvedElkForceOptionsForFamily,
  type LayoutForceOptions,
} from './elk-force.js';

export {
  toAbsolutePlacedNodes,
  indexPlacedNodes,
  leafNodeRects,
  edgeEndpointsTouchEndpointNodes,
  edgeEndpointsTouchLeaves,
  nearestLeafBoundaryDistance,
} from './node-bounds.js';
export {
  computeNodeIntersection,
  outsideNode,
  replaceEndpoint,
  type CenteredRectLike,
  type IntersectableNodeLike,
} from './edge-endpoint-trim.js';
export {
  findCommonAncestor,
  type TreeData,
} from './find-common-ancestor.js';

export type { LayeredLayoutConfig, ElkLayoutOptions, ElkParamSpec, ElkParamKind } from './layered-options.js';
export type { ForceLayoutConfig, ElkForceLayoutOptions } from './force-options.js';
export {
  ELK_LAYERED_PARAM_SPECS,
  elkParamDefaults,
  elkParamSpecByKey,
  resolveElkLayoutOptions,
  stripImplementationOwnedElkLayeredOverrides,
} from './elk-param-registry.js';
export {
  ELK_FORCE_PARAM_SPECS,
  elkForceParamDefaults,
} from './force-param-registry.js';
export {
  ELK_ADDITIONAL_ALGORITHM_PARAM_SPECS,
  ELK_MRTREE_PARAM_SPECS,
  ELK_RADIAL_PARAM_SPECS,
  ELK_RECTPACKING_PARAM_SPECS,
  ELK_STRESS_PARAM_SPECS,
} from './elk-algorithm-param-registry.js';
export {
  ELK_OPTION_AUDIT_REGISTRY_SPECS,
  ELK_OPTION_AUDITED_ALGORITHM_IDS,
  allExposedOfficialElkOptionIds,
  classifyOfficialElkOption,
  normalizeOfficialElkOptionId,
  type AuditedElkAlgorithmId,
  type ElkOptionAuditCategory,
  type ElkOptionAuditClassification,
} from './elk-option-audit.js';
