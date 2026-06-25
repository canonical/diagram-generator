import type { GraphLayoutEngineDescriptor } from '@diagram-generator/graph-layout-core';

export const DAGRE_GRAPH_LAYOUT_ENGINE: GraphLayoutEngineDescriptor = {
  id: 'dagre',
  capabilities: {
    directions: ['TB', 'LR', 'BT', 'RL'],
    honorsDirectionHints: true,
    sizing: {
      requiresInputNodeSizes: true,
      returnsPlacedNodeSizes: true,
    },
    ports: {
      explicitPorts: false,
      sideAnchors: false,
      pointAnchors: false,
      implicitEndpointPorts: false,
    },
    edgeLabels: {
      measuredBoxes: false,
      placementHints: false,
    },
    constraints: {
      order: false,
      alignment: false,
    },
    compounds: {
      nestedChildren: false,
      paddingInsets: false,
    },
  },
};
