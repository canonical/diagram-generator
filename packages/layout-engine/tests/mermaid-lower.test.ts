import { describe, expect, it } from 'vitest';

import { lowerMermaidFlowchart } from '../src/diagram-author/mermaid/lower-flowchart.js';
import { parseMermaidFlowchart } from '../src/diagram-author/mermaid/parse-flowchart.js';
import type { AuthorFrameNode } from '../src/diagram-author/types.js';

function lower(source: string) {
  const parsed = parseMermaidFlowchart(source);
  expect(parsed.issues).toEqual([]);
  expect(parsed.flowchart).not.toBeNull();
  return lowerMermaidFlowchart(parsed.flowchart!);
}

function flatten(nodes: readonly AuthorFrameNode[]): AuthorFrameNode[] {
  return nodes.flatMap(node => [node, ...flatten(node.children)]);
}

describe('Mermaid flowchart IR lowering', () => {
  it('lowers inline classes as visual downgrades while preserving nodes and arrows', () => {
    const lowered = lower([
      'flowchart TB',
      'power_on["Power On"]:::highlight --> load_spl["Load SPL"]:::leaf',
      '',
    ].join('\n'));

    expect(flatten(lowered.nodes)).toMatchObject([
      { id: 'power_on', label: [{ text: 'Power On' }] },
      { id: 'load_spl', label: [{ text: 'Load SPL' }] },
    ]);
    expect(lowered.arrows).toEqual([
      { source: 'power_on', target: 'load_spl', kind: 'directed' },
    ]);
    expect(lowered.diagnostics).toMatchObject([
      { code: 'IMPORT_MERMAID_UNSUPPORTED_STYLE', category: 'visual' },
      { code: 'IMPORT_MERMAID_UNSUPPORTED_STYLE', category: 'visual' },
    ]);
  });

  it('maps representable root and subgraph-local directions onto canonical axes', () => {
    const lowered = lower([
      'flowchart TB',
      'subgraph row["Row"]',
      '  direction LR',
      '  a --> b',
      'end',
      '',
    ].join('\n'));

    expect(lowered.metadata).toMatchObject({ direction: 'vertical' });
    expect(lowered.nodes).toMatchObject([{
      id: 'row',
      direction: 'horizontal',
      children: [{ id: 'a' }, { id: 'b' }],
    }]);
    expect(lowered.diagnostics).toEqual([]);
  });

  it('uses a later explicit declaration to refine one implicit frame', () => {
    const lowered = lower([
      'flowchart TB',
      'a --> b',
      'a["Refined label"]',
      '',
    ].join('\n'));
    const nodes = flatten(lowered.nodes);

    expect(nodes.filter(node => node.id === 'a')).toEqual([
      expect.objectContaining({
        id: 'a',
        label: [{ text: 'Refined label' }],
      }),
    ]);
    expect(nodes.filter(node => node.id === 'b')).toHaveLength(1);
    expect(lowered.arrows).toEqual([
      { source: 'a', target: 'b', kind: 'directed' },
    ]);
  });

  it('lowers edge ids to a structural diagnostic instead of a partial edge', () => {
    const lowered = lower([
      'flowchart TB',
      'a["A"]',
      'b["B"]',
      'a e1@--> b',
      '',
    ].join('\n'));

    expect(lowered.arrows).toEqual([]);
    expect(lowered.diagnostics).toMatchObject([{
      code: 'IMPORT_MERMAID_UNSUPPORTED_EDGE',
      category: 'structural',
    }]);
  });

  it('reduces markdown node bodies to plain text with a visual diagnostic', () => {
    const lowered = lower([
      'flowchart TB',
      'md["`**bold**`"]',
      '',
    ].join('\n'));

    expect(flatten(lowered.nodes)).toMatchObject([
      { id: 'md', label: [{ text: 'bold' }] },
    ]);
    expect(lowered.diagnostics).toMatchObject([{
      code: 'IMPORT_MERMAID_UNSUPPORTED_STYLE',
      category: 'visual',
    }]);
  });
});
