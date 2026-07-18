import { describe, expect, it } from 'vitest';

import { importD2 } from '../src/diagram-author/import-d2.js';
import type { AuthorFrameNode } from '../src/diagram-author/types.js';

interface NodeLocation {
  readonly id: string;
  readonly parent: string | null;
  readonly heading?: string;
  readonly label?: string;
}

function locations(
  nodes: readonly AuthorFrameNode[],
  parent: string | null = null,
): NodeLocation[] {
  return nodes.flatMap(node => [
    {
      id: node.id,
      parent,
      ...(node.heading ? { heading: node.heading.text } : {}),
      ...(node.label ? { label: node.label.map(line => line.text).join('\n') } : {}),
    },
    ...locations(node.children, node.id),
  ]);
}

describe('D2 import parity and structural-loss handling', () => {
  it('treats a missing connection endpoint as fatal structural loss, never partial success', () => {
    const result = importD2([
      'source: "Source"',
      'target: "Target"',
      'source -> target',
      'source -> missing',
      '',
    ].join('\n'));

    expect(result.errors).toMatchObject([{
      code: 'IMPORT_D2_MISSING_FRAME_REF',
      category: 'structural',
      level: 'error',
    }]);
    expect(result.warnings.filter(issue =>
      issue.code === 'IMPORT_D2_MISSING_FRAME_REF')).toEqual([]);
    expect(result.summary.blocked).toEqual(result.errors);
    expect(result.ast.arrows).toEqual([
      { source: 'source', target: 'target', kind: 'directed' },
    ]);
  });

  it('preserves exact nested containers, parent links, dot-path arrows, and labels', () => {
    const result = importD2([
      'cloud: "Cloud" {',
      '  model: "Model" {',
      '    api: "API"',
      '    worker: "Worker"',
      '  }',
      '  sink: "Sink"',
      '}',
      'cloud.model.api -> cloud.model.worker: "dispatch"',
      'cloud.model.worker -> cloud.sink',
      '',
    ].join('\n'));

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(locations(result.ast.root?.children ?? [])).toEqual([
      { id: 'cloud', parent: null, heading: 'Cloud' },
      { id: 'model', parent: 'cloud', heading: 'Model' },
      { id: 'api', parent: 'model', label: 'API' },
      { id: 'worker', parent: 'model', label: 'Worker' },
      { id: 'sink', parent: 'cloud', label: 'Sink' },
    ]);
    expect(result.ast.arrows).toEqual([
      {
        source: 'api',
        target: 'worker',
        kind: 'directed',
        label: [{ text: 'dispatch' }],
      },
      { source: 'worker', target: 'sink', kind: 'directed' },
    ]);
  });

  it('expands a chained D2 connection without inventing or dropping endpoints', () => {
    const result = importD2([
      'a: "A"',
      'b: "B"',
      'c: "C"',
      'a -> b -> c',
      '',
    ].join('\n'));

    expect(result.errors).toEqual([]);
    expect(result.ast.arrows).toEqual([
      { source: 'a', target: 'b', kind: 'directed' },
      { source: 'b', target: 'c', kind: 'directed' },
    ]);
  });

  it('maps representable root and container directions without a downgrade', () => {
    const result = importD2([
      'direction: right',
      'group: "Group" {',
      '  direction: down',
      '  a: "A"',
      '  b: "B"',
      '}',
      '',
    ].join('\n'));

    expect(result.errors).toEqual([]);
    expect(result.warnings.filter(issue =>
      issue.code === 'IMPORT_D2_UNSUPPORTED_STYLE')).toEqual([]);
    expect(result.ast.root).toMatchObject({
      direction: 'horizontal',
      flowDirection: 'LR',
      children: [{
        id: 'group',
        direction: 'vertical',
        flowDirection: 'TB',
      }],
    });
  });

  it('preserves reverse D2 directions through the canonical model and ELK selection', () => {
    const result = importD2([
      'direction: left',
      'group: "Group" {',
      '  direction: up',
      '  a: "A"',
      '  b: "B"',
      '}',
    ].join('\n'));

    expect(result.errors).toEqual([]);
    expect(result.ast.root).toMatchObject({
      direction: 'horizontal',
      flowDirection: 'RL',
      children: [{
        id: 'group',
        direction: 'vertical',
        flowDirection: 'BT',
      }],
    });
    expect(result.ast.metadata.layout_engine).toBe('elk-layered');
  });

  it('reports node style and class blocks as visual downgrades while preserving topology', () => {
    const result = importD2([
      'classes: {',
      '  card: {',
      '    style.fill: "#fff"',
      '  }',
      '}',
      'group: "Group" {',
      '  a: "A"',
      '  b: "B"',
      '  a.style.stroke: "#000"',
      '}',
      'group.a -> group.b',
      '',
    ].join('\n'));

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'IMPORT_D2_UNSUPPORTED_CLASS',
        category: 'visual',
      }),
      expect.objectContaining({
        code: 'IMPORT_D2_UNSUPPORTED_STYLE',
        category: 'visual',
      }),
    ]));
    expect(result.ast.arrows).toEqual([
      { source: 'a', target: 'b', kind: 'directed' },
    ]);
  });

  it('reports an edge attribute block as a visual downgrade while preserving its arrow', () => {
    const result = importD2([
      'a: "A"',
      'b: "B"',
      'a -> b: "link" {',
      '  style.stroke: "#e95420"',
      '}',
      '',
    ].join('\n'));

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'IMPORT_D2_UNSUPPORTED_STYLE',
        category: 'visual',
      }),
    ]));
    expect(result.ast.arrows).toEqual([{
      source: 'a',
      target: 'b',
      kind: 'directed',
      label: [{ text: 'link' }],
    }]);
  });

  it('maps D2 fill and border styles when canonical fields preserve them', () => {
    const result = importD2([
      'a: "A"',
      'b: "B"',
      'a.style.fill: "#fff"',
      'a.style.stroke-dasharray: "5 5"',
      'b.style.fill: "#000"',
      'b.style.stroke: none',
    ].join('\n'));

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.ast.root?.children).toMatchObject([
      { id: 'a', fill: 'white', border: 'dashed' },
      { id: 'b', fill: 'black', border: 'none' },
    ]);
  });

  it('resolves D2 class fill/border properties onto the assigned shape', () => {
    const result = importD2([
      'classes: {',
      '  card: {',
      '    style.fill: "#fff"',
      '    style.stroke-dasharray: "5 5"',
      '  }',
      '}',
      'a: "A" {',
      '  class: card',
      '}',
    ].join('\n'));

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.ast.root?.children).toMatchObject([
      { id: 'a', heading: { text: 'A' }, fill: 'white', border: 'dashed' },
    ]);
  });

  it('blocks an unsupported edge-shaped statement instead of accepting a partial diagram', () => {
    const result = importD2([
      'a: "A"',
      'b: "B"',
      'a ->',
      '',
    ].join('\n'));

    expect(result.errors).toMatchObject([{
      code: 'IMPORT_D2_UNSUPPORTED_SYNTAX',
      category: 'structural',
      level: 'error',
    }]);
    expect(result.summary.blocked).toEqual(result.errors);
    expect(result.ast.arrows).toEqual([]);
  });

  it('classifies D2 icons/vars as visual and separate renderer grammars as type-blocking', () => {
    const visual = importD2([
      'vars: {',
      '  theme: 1',
      '}',
      'a: "A" {',
      '  icon: "https://example.invalid/icon.svg"',
      '}',
    ].join('\n'));
    expect(visual.errors).toEqual([]);
    expect(visual.warnings.map(issue => issue.code)).toEqual(expect.arrayContaining([
      'IMPORT_D2_UNSUPPORTED_LAYOUT_HINT',
      'IMPORT_D2_UNSUPPORTED_ICON',
    ]));

    const separateGrammar = importD2('sql_table users {\n  id: int\n}\n');
    expect(separateGrammar.errors).toMatchObject([{
      code: 'IMPORT_D2_UNSUPPORTED_CONSTRUCT',
      category: 'type',
    }]);
  });
});
