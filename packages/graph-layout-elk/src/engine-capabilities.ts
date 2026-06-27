import type {
  GraphLayoutCapabilities,
  GraphLayoutEngineDescriptor,
} from '@diagram-generator/graph-layout-core';

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

const ELK_NON_LAYERED_BASE_CAPABILITIES: Omit<GraphLayoutCapabilities, 'honorsDirectionHints'> = {
  directions: ['TB', 'LR', 'BT', 'RL'],
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
};

export const ELK_STRESS_GRAPH_LAYOUT_ENGINE: GraphLayoutEngineDescriptor = {
  id: 'elk-stress',
  capabilities: {
    ...ELK_NON_LAYERED_BASE_CAPABILITIES,
    honorsDirectionHints: false,
  },
};

export const ELK_MRTREE_GRAPH_LAYOUT_ENGINE: GraphLayoutEngineDescriptor = {
  id: 'elk-mrtree',
  capabilities: {
    ...ELK_NON_LAYERED_BASE_CAPABILITIES,
    honorsDirectionHints: true,
  },
};

export const ELK_RADIAL_GRAPH_LAYOUT_ENGINE: GraphLayoutEngineDescriptor = {
  id: 'elk-radial',
  capabilities: {
    ...ELK_NON_LAYERED_BASE_CAPABILITIES,
    honorsDirectionHints: false,
  },
};

export const ELK_RECTPACKING_GRAPH_LAYOUT_ENGINE: GraphLayoutEngineDescriptor = {
  id: 'elk-rectpacking',
  capabilities: {
    ...ELK_NON_LAYERED_BASE_CAPABILITIES,
    honorsDirectionHints: false,
  },
};
