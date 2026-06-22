import { describe, expect, it } from 'vitest';

import { ELK_LAYERED_GRAPH_LAYOUT_ENGINE } from '../src/index.js';

describe('ELK graph layout capabilities', () => {
  it('publishes the layered adapter contract without ELK-shaped port or padding inputs', () => {
    expect(ELK_LAYERED_GRAPH_LAYOUT_ENGINE).toMatchObject({
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
    });
  });
});
