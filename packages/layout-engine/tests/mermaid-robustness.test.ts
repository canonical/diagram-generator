import { describe, expect, it } from 'vitest';

import { importMermaid } from '../src/diagram-author/import-mermaid.js';
import { parseMermaidFlowchart } from '../src/diagram-author/mermaid/parse-flowchart.js';
import { serializeDiagramYaml } from '../src/diagram-author/serialize-yaml.js';

describe('bounded and malformed Mermaid input', () => {
  it('bounds line, node, edge, and subgraph depth independently', () => {
    expect(parseMermaidFlowchart('flowchart TB\na\nb\n', { maxLines: 2 }).issues[0])
      .toMatchObject({ code: 'IMPORT_MERMAID_TOO_MANY_LINES', category: 'invalid' });
    expect(parseMermaidFlowchart('flowchart TB\na\nb\n', { maxNodes: 1 }).issues[0])
      .toMatchObject({ code: 'IMPORT_MERMAID_TOO_MANY_NODES', category: 'invalid' });
    expect(parseMermaidFlowchart('flowchart TB\na --> b --> c\n', { maxEdges: 1 }).issues[0])
      .toMatchObject({ code: 'IMPORT_MERMAID_TOO_MANY_EDGES', category: 'invalid' });
    expect(parseMermaidFlowchart([
      'flowchart TB',
      'subgraph a',
      'subgraph b',
      'subgraph c',
    ].join('\n'), { maxContainerDepth: 2 }).issues[0])
      .toMatchObject({ code: 'IMPORT_MERMAID_NESTING_TOO_DEEP', category: 'invalid' });
  });

  it('reports an unterminated subgraph without throwing or returning partial success', () => {
    const result = importMermaid('flowchart TB\nsubgraph group\n  a --> b\n');

    expect(result.errors).toMatchObject([{
      code: 'IMPORT_MERMAID_UNSUPPORTED_SUBGRAPH',
      category: 'structural',
    }]);
    expect(result.summary.blocked).toEqual(result.errors);
  });

  it('keeps HTML-shaped labels as inert plain text and names the downgrade', () => {
    const result = importMermaid([
      'flowchart TB',
      '  a["<img src=x onerror=alert(1)>Safe<script>alert(2)</script>"]',
    ].join('\n'));

    expect(result.errors).toEqual([]);
    expect(result.ast.root?.children[0]?.label).toEqual([{ text: 'Safealert(2)' }]);
    expect(result.warnings).toMatchObject([{
      code: 'IMPORT_MERMAID_UNSUPPORTED_STYLE',
      category: 'visual',
    }]);
    const yaml = serializeDiagramYaml(result.ast);
    expect(yaml).not.toMatch(/<script|onerror|<img/i);
  });

  it('imports a 1,000-edge bounded corpus within a 2 second budget', () => {
    const lines = ['flowchart TB'];
    for (let index = 0; index < 1_000; index += 1) {
      lines.push(`n${index} --> n${index + 1}`);
    }
    const started = performance.now();
    const result = importMermaid(lines.join('\n'));
    const elapsedMs = performance.now() - started;

    expect(result.errors).toEqual([]);
    expect(result.ast.arrows).toHaveLength(1_000);
    expect(elapsedMs).toBeLessThan(2_000);
  });
});
