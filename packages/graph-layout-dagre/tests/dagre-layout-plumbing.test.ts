import { describe, expect, it, vi } from 'vitest';

const dagreState = vi.hoisted(() => ({
  graphOptions: null as Record<string, unknown> | null,
}));

vi.mock('@dagrejs/dagre', () => {
  class Graph {
    setGraph(options: Record<string, unknown>) {
      dagreState.graphOptions = { ...options };
    }

    setDefaultEdgeLabel() {}
    setNode() {}
    setEdge() {}
    node() { return undefined; }
    edge() { return undefined; }
  }

  return {
    default: {
      graphlib: { Graph },
      layout() {},
    },
  };
});

import { layoutDagre } from '../src/dagre-layout.js';

describe('dagre layout plumbing', () => {
  it('forwards the surfaced Dagre graph options into dagre.setGraph', () => {
    dagreState.graphOptions = null;

    layoutDagre({
      id: 'root',
      direction: 'TB',
      nodes: [
        { id: 'a', width: 120, height: 64 },
        { id: 'b', width: 120, height: 64 },
      ],
      edges: [{ id: 'ab', source: 'a', target: 'b' }],
    }, {
      optionOverrides: {
        'dagre.rankdir': 'LR',
        'dagre.align': 'UL',
        'dagre.acyclicer': 'greedy',
        'dagre.ranker': 'tight-tree',
        'dagre.rankalign': 'top',
        'dagre.nodesep': '80',
        'dagre.ranksep': '144',
        'dagre.edgesep': '36',
        'dagre.marginx': '32',
        'dagre.marginy': '48',
      },
    });

    expect(dagreState.graphOptions).toEqual({
      rankdir: 'LR',
      align: 'UL',
      acyclicer: 'greedy',
      ranker: 'tight-tree',
      rankalign: 'top',
      nodesep: 80,
      ranksep: 144,
      edgesep: 36,
      marginx: 32,
      marginy: 48,
    });
  });
});
