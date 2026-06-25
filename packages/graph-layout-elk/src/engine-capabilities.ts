import type { GraphLayoutEngineDescriptor } from '@diagram-generator/graph-layout-core';

export const ELK_LAYERED_GRAPH_LAYOUT_ENGINE: GraphLayoutEngineDescriptor = {
  id: 'elk-layered',
  capabilities: {
    directions: ['TB', 'LR', 'BT', 'RL'],
    honorsDirectionHints: true,
    sizing: {
      requiresInputNodeSizes: true,
      returnsPlacedNodeSizes: true,
    },
    ports: {
      explicitPorts: true,
      sideAnchors: true,
      pointAnchors: true,
      implicitEndpointPorts: true,
    },
    edgeLabels: {
      measuredBoxes: true,
      placementHints: false,
    },
    constraints: {
      order: false,
      alignment: false,
    },
    compounds: {
      nestedChildren: true,
      paddingInsets: true,
    },
  },
};

export const ELK_FORCE_GRAPH_LAYOUT_ENGINE: GraphLayoutEngineDescriptor = {
  id: 'elk-force',
  capabilities: {
    directions: ['TB', 'LR', 'BT', 'RL'],
    honorsDirectionHints: false,
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
