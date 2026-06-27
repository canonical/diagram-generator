import { describe, expect, it } from 'vitest';

import {
  ELK_FORCE_GRAPH_LAYOUT_ENGINE,
  ELK_LAYERED_GRAPH_LAYOUT_ENGINE,
  ELK_MRTREE_GRAPH_LAYOUT_ENGINE,
  ELK_RADIAL_GRAPH_LAYOUT_ENGINE,
  ELK_RECTPACKING_GRAPH_LAYOUT_ENGINE,
  ELK_STRESS_GRAPH_LAYOUT_ENGINE,
} from '../src/index.js';

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

  it('publishes the force adapter contract without layered-only capability claims', () => {
    expect(ELK_FORCE_GRAPH_LAYOUT_ENGINE).toMatchObject({
      id: 'elk-force',
      capabilities: {
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
    });
  });

  it('publishes conservative contracts for additional ELK preview algorithms', () => {
    expect(ELK_STRESS_GRAPH_LAYOUT_ENGINE).toMatchObject({
      id: 'elk-stress',
      capabilities: {
        honorsDirectionHints: false,
        ports: { explicitPorts: false },
        compounds: { nestedChildren: false },
      },
    });
    expect(ELK_MRTREE_GRAPH_LAYOUT_ENGINE).toMatchObject({
      id: 'elk-mrtree',
      capabilities: {
        honorsDirectionHints: true,
        ports: { explicitPorts: false },
        compounds: { nestedChildren: false },
      },
    });
    expect(ELK_RADIAL_GRAPH_LAYOUT_ENGINE).toMatchObject({
      id: 'elk-radial',
      capabilities: {
        honorsDirectionHints: false,
        ports: { explicitPorts: false },
        compounds: { nestedChildren: false },
      },
    });
    expect(ELK_RECTPACKING_GRAPH_LAYOUT_ENGINE).toMatchObject({
      id: 'elk-rectpacking',
      capabilities: {
        honorsDirectionHints: false,
        ports: { explicitPorts: false },
        compounds: { nestedChildren: false },
      },
    });
  });
});
