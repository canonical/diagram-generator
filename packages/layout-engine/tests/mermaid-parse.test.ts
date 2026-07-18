import { describe, expect, it } from 'vitest';

import { parseMermaidFlowchart } from '../src/diagram-author/mermaid/parse-flowchart.js';

function parse(source: string) {
  const result = parseMermaidFlowchart(source);
  expect(result.issues).toEqual([]);
  expect(result.flowchart).not.toBeNull();
  return result.flowchart!;
}

describe('Mermaid flowchart statement parser', () => {
  it('parses inline endpoints, class suffixes, and chained declarations into IR', () => {
    const flowchart = parse([
      'flowchart TB',
      'a["A"]:::source --> b(["B"]):::middle --> c{"C"}:::target',
      '',
    ].join('\n'));

    expect(flowchart.nodes).toMatchObject([
      { id: 'a', label: 'A', shape: 'rectangle', classes: ['source'], explicit: true },
      { id: 'b', label: 'B', shape: 'stadium', classes: ['middle'], explicit: true },
      { id: 'c', label: 'C', shape: 'diamond', classes: ['target'], explicit: true },
    ]);
    expect(flowchart.edges).toEqual([
      { source: 'a', target: 'b', connector: '-->', line: 2 },
      { source: 'b', target: 'c', connector: '-->', line: 2 },
    ]);
  });

  it('parses single- and multi-word unquoted labels for supported edge families', () => {
    const flowchart = parse([
      'flowchart TB',
      'a -- Yes --> b',
      'b -- click me --> c',
      'c == heavy flow ==> d',
      'd -. retry later -.-> e',
      'e -. maybe .-> f',
    ].join('\n'));

    expect(flowchart.edges).toEqual([
      { source: 'a', target: 'b', label: 'Yes', connector: '-->', line: 2 },
      { source: 'b', target: 'c', label: 'click me', connector: '-->', line: 3 },
      { source: 'c', target: 'd', label: 'heavy flow', connector: '==>', line: 4 },
      { source: 'd', target: 'e', label: 'retry later', connector: '-.->', line: 5 },
      { source: 'e', target: 'f', label: 'maybe', connector: '-.->', line: 6 },
    ]);
  });

  it('parses no-space simple, chained, open, and dotted-id edges without changing ids', () => {
    const flowchart = parse([
      'flowchart TB',
      'A-->B-->C',
      'my-node---other-node',
      'a.b-->c.d',
    ].join('\n'));

    expect(flowchart.edges).toEqual([
      { source: 'A', target: 'B', connector: '-->', line: 2 },
      { source: 'B', target: 'C', connector: '-->', line: 2 },
      { source: 'my-node', target: 'other-node', connector: '---', line: 3 },
      { source: 'a.b', target: 'c.d', connector: '-->', line: 4 },
    ]);
  });

  it.each(['flowchart', 'graph'])('defaults a direction-less %s header to TB', (header) => {
    expect(parse(`${header}\na --> b`).direction).toBe('TB');
  });

  it('keeps malformed multi-token headers blocking', () => {
    const result = parseMermaidFlowchart('graph LR extra\na --> b');

    expect(result.flowchart).toBeNull();
    expect(result.issues).toMatchObject([{
      code: 'IMPORT_MERMAID_UNSUPPORTED_DIRECTION',
      category: 'structural',
    }]);
  });

  it('treats top-level semicolons as statement separators', () => {
    const flowchart = parse('flowchart LR; a["A"]; b["B"]; a --> b; c --> d');
    const explicit = flowchart.nodes.filter(node => node.explicit);

    expect(explicit.map(node => [node.id, node.label])).toEqual([
      ['a', 'A'],
      ['b', 'B'],
    ]);
    expect(flowchart.edges.map(edge => [edge.source, edge.target])).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('preserves nested container paths and subgraph-local directions', () => {
    const flowchart = parse([
      'flowchart TB',
      'subgraph outer["Outer"]',
      '  direction LR',
      '  subgraph inner["Inner"]',
      '    direction TD',
      '    a["A"] --> b["B"]',
      '  end',
      'end',
      '',
    ].join('\n'));

    expect(flowchart.roots).toMatchObject([{
      id: 'outer',
      heading: 'Outer',
      direction: 'LR',
      children: [{
        id: 'inner',
        heading: 'Inner',
        direction: 'TD',
      }],
    }]);
    expect(flowchart.nodes.map(node => ({
      id: node.id,
      containerPath: node.containerPath,
    }))).toEqual([
      { id: 'a', containerPath: ['outer', 'inner'] },
      { id: 'b', containerPath: ['outer', 'inner'] },
    ]);
  });

  it('expands fan-out and fan-in endpoint groups without losing multiplicity', () => {
    const flowchart = parse([
      'flowchart TB',
      'a --> b & c',
      'd & e --> f',
      '',
    ].join('\n'));

    expect(flowchart.edges.map(edge => [edge.source, edge.target])).toEqual([
      ['a', 'b'],
      ['a', 'c'],
      ['d', 'f'],
      ['e', 'f'],
    ]);
  });

  it('keeps implicit and explicit occurrences so lowering can refine the node', () => {
    const flowchart = parse([
      'flowchart TB',
      'a --> b',
      'a["Refined label"]',
      '',
    ].join('\n'));

    expect(flowchart.nodes.filter(node => node.id === 'a')).toMatchObject([
      { id: 'a', explicit: false },
      { id: 'a', explicit: true, label: 'Refined label' },
    ]);
  });

  it('classifies edge ids as blocking IR and marks markdown bodies for downgrade', () => {
    const flowchart = parse([
      'flowchart TB',
      'a e1@--> b',
      'md["`**bold**`"]',
      '',
    ].join('\n'));

    expect(flowchart.unsupported).toEqual([
      { raw: 'a e1@--> b', line: 2, kind: 'edge-id' },
    ]);
    expect(flowchart.nodes).toMatchObject([
      {
        id: 'md',
        label: '**bold**',
        markdown: true,
        explicit: true,
      },
    ]);
  });
});
