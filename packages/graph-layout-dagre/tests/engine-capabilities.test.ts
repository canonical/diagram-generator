import { describe, expect, it } from 'vitest';
import { DAGRE_GRAPH_LAYOUT_ENGINE } from '../src/index.js';

describe('dagre graph layout capabilities', () => {
  it('publishes a conservative dagre adapter contract', () => {
    expect(DAGRE_GRAPH_LAYOUT_ENGINE).toMatchObject({
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
        compounds: {
          nestedChildren: false,
          paddingInsets: false,
        },
      },
    });
  });
});
