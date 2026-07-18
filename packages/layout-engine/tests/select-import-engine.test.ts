import { describe, expect, it } from 'vitest';
import { buildElkGraphFromInput } from '@diagram-generator/graph-layout-elk';

import { compileDiagramYaml } from '../src/diagram-author/compile.js';
import { importMermaid } from '../src/diagram-author/import-mermaid.js';
import { serializeDiagramYaml } from '../src/diagram-author/serialize-yaml.js';
import { selectImportEngine } from '../src/diagram-author/select-import-engine.js';

describe('capability-driven import engine selection', () => {
  it('selects v3 for a flat acyclic graph', () => {
    const imported = importMermaid('flowchart TB\na --> b\n');

    expect(imported.errors).toEqual([]);
    expect(selectImportEngine(imported.ast)).toMatchObject({
      engineId: 'v3',
      diagnostics: [],
    });
    expect(imported.ast.metadata.layout_engine).toBe('v3');
  });

  it('selects ELK layered for nested cross-container edges', () => {
    const imported = importMermaid([
      'flowchart TB',
      'subgraph left["Left"]',
      '  a["A"]',
      'end',
      'subgraph right["Right"]',
      '  b["B"]',
      'end',
      'a --> b',
    ].join('\n'));

    expect(imported.errors).toEqual([]);
    expect(imported.ast.metadata.layout_engine).toBe('elk-layered');
    expect(selectImportEngine(imported.ast).reasons).toContain('cross-container edge');
  });

  it.each([
    ['RL', 'horizontal', 'RL'],
    ['BT', 'vertical', 'BT'],
  ] as const)('persists and reloads reverse %s through ELK', (direction, axis, flowDirection) => {
    const imported = importMermaid(`flowchart ${direction}\na --> b\n`);

    expect(imported.errors).toEqual([]);
    expect(imported.ast.root).toMatchObject({
      direction: axis,
      flowDirection,
    });
    expect(imported.ast.metadata.layout_engine).toBe('elk-layered');

    const yaml = serializeDiagramYaml(imported.ast);
    expect(yaml).toContain(`flow_direction: ${flowDirection}`);
    expect(yaml).toContain('layout_engine: elk-layered');
    const reloaded = compileDiagramYaml(yaml);
    expect(reloaded.errors).toEqual([]);
    expect(reloaded.ast.root?.flowDirection).toBe(flowDirection);
    expect(reloaded.frameDiagram?.root.flowDirection).toBe(flowDirection);
    expect(reloaded.frameDiagram?.layoutEngine).toBe('elk-layered');
  });

  it('preserves reverse direction on a nested container', () => {
    const imported = importMermaid([
      'flowchart TB',
      'subgraph core["Core"]',
      '  direction RL',
      '  a --> b',
      'end',
    ].join('\n'));

    expect(imported.errors).toEqual([]);
    expect(imported.ast.root?.children[0]).toMatchObject({
      id: 'core',
      direction: 'horizontal',
      flowDirection: 'RL',
    });
    expect(imported.ast.metadata.layout_engine).toBe('elk-layered');
  });

  it.each([
    ['RL', 'LEFT'],
    ['BT', 'UP'],
  ] as const)('maps canonical %s to ELK %s', (direction, elkDirection) => {
    const graph = buildElkGraphFromInput({
      id: 'reverse',
      direction,
      spacingProfile: 'normal',
      nodes: [
        { id: 'a', width: 80, height: 40 },
        { id: 'b', width: 80, height: 40 },
      ],
      edges: [{ id: 'a-b', source: 'a', target: 'b' }],
    });

    expect(graph.layoutOptions?.['elk.direction']).toBe(elkDirection);
  });
});
