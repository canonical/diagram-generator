import { describe, expect, it } from 'vitest';

import { lowerMermaidFlowchart } from '../src/diagram-author/mermaid/lower-flowchart.js';
import { parseMermaidFlowchart } from '../src/diagram-author/mermaid/parse-flowchart.js';
import type { AuthorFrameNode } from '../src/diagram-author/types.js';

interface NodeLocation {
  readonly id: string;
  readonly parent: string | null;
}

function locations(
  nodes: readonly AuthorFrameNode[],
  parent: string | null = null,
): NodeLocation[] {
  return nodes.flatMap(node => [
    { id: node.id, parent },
    ...locations(node.children, node.id),
  ]);
}

function topology(source: string) {
  const parsed = parseMermaidFlowchart(source);
  expect(parsed.issues).toEqual([]);
  expect(parsed.flowchart).not.toBeNull();
  const lowered = lowerMermaidFlowchart(parsed.flowchart!);
  expect(lowered.diagnostics.filter(issue => issue.category !== 'visual')).toEqual([]);
  return {
    nodes: locations(lowered.nodes),
    edges: lowered.arrows.map(arrow => [arrow.source, arrow.target]),
  };
}

describe('Mermaid flowchart exact topology', () => {
  it('preserves a self-loop', () => {
    expect(topology([
      'flowchart TB',
      'a --> a',
      '',
    ].join('\n'))).toEqual({
      nodes: [{ id: 'a', parent: null }],
      edges: [['a', 'a']],
    });
  });

  it('preserves parallel edge multiplicity', () => {
    expect(topology([
      'flowchart TB',
      'a --> b',
      'a --> b',
      '',
    ].join('\n'))).toEqual({
      nodes: [
        { id: 'a', parent: null },
        { id: 'b', parent: null },
      ],
      edges: [
        ['a', 'b'],
        ['a', 'b'],
      ],
    });
  });

  it('preserves every edge in a directed cycle', () => {
    expect(topology([
      'flowchart LR',
      'a --> b --> c --> a',
      '',
    ].join('\n'))).toEqual({
      nodes: [
        { id: 'a', parent: null },
        { id: 'b', parent: null },
        { id: 'c', parent: null },
      ],
      edges: [
        ['a', 'b'],
        ['b', 'c'],
        ['c', 'a'],
      ],
    });
  });

  it('preserves disconnected components and exact container parents', () => {
    expect(topology([
      'flowchart TB',
      'subgraph left["Left"]',
      '  a --> b',
      'end',
      'subgraph right["Right"]',
      '  c --> d',
      'end',
      'orphan["Orphan"]',
      '',
    ].join('\n'))).toEqual({
      nodes: [
        { id: 'left', parent: null },
        { id: 'a', parent: 'left' },
        { id: 'b', parent: 'left' },
        { id: 'right', parent: null },
        { id: 'c', parent: 'right' },
        { id: 'd', parent: 'right' },
        { id: 'orphan', parent: null },
      ],
      edges: [
        ['a', 'b'],
        ['c', 'd'],
      ],
    });
  });
});
