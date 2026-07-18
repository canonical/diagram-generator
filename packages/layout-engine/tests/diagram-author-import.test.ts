import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { compileDiagramYaml } from '../src/diagram-author/compile.js';
import { exportD2 } from '../src/diagram-author/export-d2.js';
import { exportMermaid } from '../src/diagram-author/export-mermaid.js';
import { importD2 } from '../src/diagram-author/import-d2.js';
import {
  importMermaid,
  MERMAID_DIAGNOSTIC_CATEGORIES,
} from '../src/diagram-author/import-mermaid.js';
import {
  diagnostic,
  finishImport,
  makeImportedDocument,
} from '../src/diagram-author/import-result.js';
import { serializeDiagramYaml } from '../src/diagram-author/serialize-yaml.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function frameIds(root: { id: string; children: typeof root[] } | null): string[] {
  if (!root) return [];
  return [root.id, ...root.children.flatMap(frameIds)];
}

describe('diagram interchange imports', () => {
  it('classifies every existing Mermaid import diagnostic by fidelity impact', () => {
    expect(MERMAID_DIAGNOSTIC_CATEGORIES).toEqual({
      IMPORT_MERMAID_UNSUPPORTED_EDGE: 'structural',
      IMPORT_MERMAID_UNSUPPORTED_SYNTAX: 'structural',
      IMPORT_MERMAID_UNSUPPORTED_DIRECTION: 'structural',
      IMPORT_MERMAID_UNSUPPORTED_SUBGRAPH: 'structural',
      IMPORT_MERMAID_MISSING_FRAME_REF: 'structural',
      IMPORT_MERMAID_UNSUPPORTED_SHAPE: 'visual',
      IMPORT_MERMAID_UNSUPPORTED_STYLE: 'visual',
      IMPORT_MERMAID_UNSUPPORTED_EDGE_STYLE: 'visual',
      IMPORT_MERMAID_UNSUPPORTED_EDGE_DIRECTION: 'visual',
      IMPORT_MERMAID_UNSUPPORTED_DIAGRAM_TYPE: 'type',
      IMPORT_MERMAID_UNSUPPORTED_FRONTMATTER: 'invalid',
    });

    expect(importMermaid('flowchart TB\na(round)\n').warnings[0]).toMatchObject({
      code: 'IMPORT_MERMAID_UNSUPPORTED_SHAPE',
      category: 'visual',
    });
    expect(importMermaid('flowchart sideways\n').errors[0]).toMatchObject({
      code: 'IMPORT_MERMAID_UNSUPPORTED_DIRECTION',
      category: 'structural',
    });
    expect(importMermaid('sequenceDiagram\n').errors[0]).toMatchObject({
      code: 'IMPORT_MERMAID_UNSUPPORTED_DIAGRAM_TYPE',
      category: 'type',
    });
    expect(importMermaid('---\ntitle: unclosed\n').errors[0]).toMatchObject({
      code: 'IMPORT_MERMAID_UNSUPPORTED_FRONTMATTER',
      category: 'invalid',
    });
  });

  it('blocks fidelity-loss categories independently of strict mode and summarizes the import', () => {
    const imported = makeImportedDocument(
      [
        { id: 'source', children: [] },
        { id: 'target', children: [] },
      ],
      [{ source: 'source', target: 'target', kind: 'directed' }],
    );
    const result = finishImport(imported.ast, [
      diagnostic(
        'VISUAL_DOWNGRADE',
        'Presentation was simplified.',
        'test.visual',
      ),
      diagnostic(
        'DROPPED_TOPOLOGY',
        'An edge was dropped.',
        'test.structural',
        undefined,
        'warning',
        'structural',
      ),
    ], false);

    expect(result.errors).toMatchObject([{
      code: 'DROPPED_TOPOLOGY',
      level: 'error',
      category: 'structural',
    }]);
    expect(result.warnings).toMatchObject([{
      code: 'VISUAL_DOWNGRADE',
      level: 'warning',
      category: 'visual',
    }]);
    expect(result.summary).toEqual({
      preserved: 3,
      downgraded: result.warnings,
      blocked: result.errors,
    });
  });

  it('imports the exact screenshot inline-declared edge without structural loss', () => {
    const result = importMermaid([
      'flowchart TB',
      '  power_on["Power On"]:::highlight --> load_spl["Load SPL"]:::leaf',
    ].join('\n'));

    expect(result.errors).toEqual([]);
    expect(result.ast.root?.children).toMatchObject([
      { id: 'power_on', label: [{ text: 'Power On' }] },
      { id: 'load_spl', label: [{ text: 'Load SPL' }] },
    ]);
    expect(result.ast.arrows).toEqual([{
      source: 'power_on',
      target: 'load_spl',
      kind: 'directed',
    }]);
    expect(result.warnings).toMatchObject([
      { code: 'IMPORT_MERMAID_UNSUPPORTED_STYLE', category: 'visual' },
      { code: 'IMPORT_MERMAID_UNSUPPORTED_STYLE', category: 'visual' },
    ]);
    expect(result.summary).toEqual({
      preserved: 3,
      downgraded: result.warnings,
      blocked: [],
    });
  });

  it('imports nested D2 blocks, multiline labels, dot-path arrows, and compiles serialized YAML', () => {
    const result = importD2([
      'network: {',
      '  client: "Client\\nBrowser"',
      '  server: Server',
      '}',
      'network.client -> network.server: "request\\nresponse"',
      '',
    ].join('\n'));

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.ast.root?.children[0]).toMatchObject({
      id: 'network',
      children: [
        { id: 'client', label: [{ text: 'Client' }, { text: 'Browser' }] },
        { id: 'server', label: [{ text: 'Server' }] },
      ],
    });
    expect(result.ast.arrows).toEqual([
      {
        source: 'client',
        target: 'server',
        kind: 'directed',
        label: [{ text: 'request' }, { text: 'response' }],
      },
    ]);

    const yaml = serializeDiagramYaml(result.ast);
    const compiled = compileDiagramYaml(yaml);
    expect(compiled.errors).toEqual([]);
    expect(compiled.ast.arrows[0]).toMatchObject({ source: 'client', target: 'server' });
  });

  it('round-trips D2 exporter structure for the tiered-network fixture', () => {
    const yamlPath = join(repoRoot, 'diagrams', '1.input', 'tiered-network-architecture.yaml');
    const compiled = compileDiagramYaml(readFileSync(yamlPath, 'utf8'), { sourcePath: yamlPath });
    const exported = exportD2(compiled.ast);
    const imported = importD2(exported.d2);

    expect(imported.errors).toEqual([]);
    expect(frameIds(imported.ast.root)).toEqual(frameIds(compiled.ast.root));
    expect(imported.ast.arrows.map(arrow => [arrow.source, arrow.target])).toEqual(
      compiled.ast.arrows.map(arrow => [arrow.source, arrow.target]),
    );
  });

  it('imports the juju bootstrap D2 exporter corpus with nested paths and labels', () => {
    const yamlPath = join(repoRoot, 'diagrams', '1.input', 'juju-bootstrap-machines-process.yaml');
    const compiled = compileDiagramYaml(readFileSync(yamlPath, 'utf8'), { sourcePath: yamlPath });
    const imported = importD2(exportD2(compiled.ast).d2);

    expect(imported.errors).toEqual([]);
    expect(frameIds(imported.ast.root)).toEqual(frameIds(compiled.ast.root));
    expect(imported.ast.arrows.map(arrow => [arrow.source, arrow.target])).toEqual(
      compiled.ast.arrows.map(arrow => [arrow.source, arrow.target]),
    );
  });

  it('imports Mermaid subgraphs, multiline labels, edge labels, and flow direction', () => {
    const result = importMermaid([
      'flowchart LR',
      '  subgraph platform',
      '    api["Public<br/>API"]',
      '    db["Data store"]',
      '  end',
      '  api -->|writes| db',
      '',
    ].join('\n'));

    expect(result.errors).toEqual([]);
    expect(result.ast.root).toMatchObject({
      id: 'page',
      direction: 'horizontal',
      children: [{ id: 'platform', children: [{ id: 'api' }, { id: 'db' }] }],
    });
    expect(result.ast.root?.children[0]?.children[0]?.label).toEqual([
      { text: 'Public' },
      { text: 'API' },
    ]);
    expect(result.ast.arrows).toEqual([
      {
        source: 'api',
        target: 'db',
        kind: 'directed',
        label: [{ text: 'writes' }],
      },
    ]);

    const compiled = compileDiagramYaml(serializeDiagramYaml(result.ast));
    expect(compiled.errors).toEqual([]);
  });

  it('imports real-world Mermaid frontmatter, class suffixes, labeled subgraphs, and alternate edges', () => {
    const result = importMermaid([
      '---',
      'title: Corpus example',
      'config:',
      '  look: classic',
      '---',
      'graph TD',
      '  subgraph estate["Estate"]:::section',
      '    classifier["Classifier"]:::leaf',
      '    styleGuide["Style guide"]',
      '  end',
      '  classifier -- "routes" --> styleGuide',
      '',
    ].join('\n'));

    expect(result.errors).toEqual([]);
    expect(result.ast.metadata.title).toBe('Corpus example');
    expect(result.ast.root).toMatchObject({
      direction: 'vertical',
      children: [{
        id: 'estate',
        heading: { text: 'Estate' },
        children: [{ id: 'classifier' }, { id: 'styleGuide' }],
      }],
    });
    expect(result.ast.arrows).toMatchObject([
      { source: 'classifier', target: 'styleGuide', label: [{ text: 'routes' }] },
    ]);
    expect(result.warnings.filter(warning => warning.code === 'IMPORT_MERMAID_UNSUPPORTED_STYLE')).toHaveLength(2);

    const compiled = compileDiagramYaml(serializeDiagramYaml(result.ast));
    expect(compiled.errors).toEqual([]);
  });

  it('creates implicit Mermaid nodes and expands labelled edge chains', () => {
    const result = importMermaid([
      'graph TD',
      '  A --> B -->|checks| C --> D',
      '',
    ].join('\n'));

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.ast.root?.children.map(node => [node.id, node.label?.[0]?.text])).toEqual([
      ['A', 'A'],
      ['B', 'B'],
      ['C', 'C'],
      ['D', 'D'],
    ]);
    expect(result.ast.arrows).toEqual([
      { source: 'A', target: 'B', kind: 'directed' },
      { source: 'B', target: 'C', kind: 'directed', label: [{ text: 'checks' }] },
      { source: 'C', target: 'D', kind: 'directed' },
    ]);
    expect(compileDiagramYaml(serializeDiagramYaml(result.ast)).errors).toEqual([]);
  });

  it('keeps explicit subgraph placement when an edge references a node before its declaration', () => {
    const result = importMermaid([
      'flowchart TB',
      '  api --> worker',
      '  subgraph core["Core"]',
      '    api["API"]',
      '    worker["Worker"]',
      '  end',
    ].join('\n'));

    expect(result.errors).toEqual([]);
    expect(result.ast.root?.children).toMatchObject([{
      id: 'core',
      children: [{ id: 'api' }, { id: 'worker' }],
    }]);
    expect(result.ast.arrows).toMatchObject([{ source: 'api', target: 'worker' }]);
  });

  it('serializes imported sibling-promotion levels for corpus-valid frame YAML', () => {
    const result = importMermaid([
      'flowchart TB',
      '  subgraph deep["Deep"]',
      '    subgraph inner["Inner"]',
      '      leaf["Leaf"]',
      '    end',
      '  end',
      '  peer["Peer"]',
    ].join('\n'));

    expect(result.ast.root?.children).toMatchObject([
      {
        id: 'deep',
        level: 3,
        children: [{
          id: 'inner',
          level: 2,
          children: [{ id: 'leaf', level: 1 }],
        }],
      },
      { id: 'peer', level: 3 },
    ]);
    const yaml = serializeDiagramYaml(result.ast);
    expect(yaml).toMatch(/id: deep\s+level: 3/);
    expect(yaml).toMatch(/id: inner\s+level: 2/);
    expect(yaml).toMatch(/id: leaf\s+level: 1/);
  });

  it('downgrades bidirectional and alternate Mermaid edges without dropping connectivity', () => {
    const result = importMermaid([
      'flowchart LR',
      '  a <--> b',
      '  b <-->|returns| c',
      '  c --- d',
      '  d ==> e',
      '  e -.-> f',
    ].join('\n'), { strict: true });

    expect(result.errors).toEqual([]);
    expect(result.ast.arrows.map(arrow => [arrow.source, arrow.target, arrow.label?.[0]?.text])).toEqual([
      ['a', 'b', undefined],
      ['b', 'c', 'returns'],
      ['c', 'd', undefined],
      ['d', 'e', undefined],
      ['e', 'f', undefined],
    ]);
    expect(result.warnings.filter(entry =>
      entry.code === 'IMPORT_MERMAID_UNSUPPORTED_EDGE_DIRECTION')).toHaveLength(2);
    expect(result.warnings.filter(entry =>
      entry.code === 'IMPORT_MERMAID_UNSUPPORTED_EDGE_STYLE')).toHaveLength(3);
    expect(compileDiagramYaml(serializeDiagramYaml(result.ast)).errors).toEqual([]);
  });

  it('imports standard non-rectangular Mermaid node shapes as labelled frames', () => {
    const result = importMermaid([
      'flowchart TB',
      '  a(round)',
      '  b{diamond}',
      '  c((circle))',
      '  d([stadium])',
      '  e[[subroutine]]',
      '  f[(cylinder)]',
      '  g{{hexagon}}',
      '  h>flag]',
    ].join('\n'), { strict: true });

    expect(result.errors).toEqual([]);
    expect(result.ast.root?.children.map(node => [node.id, node.label?.[0]?.text])).toEqual([
      ['a', 'round'],
      ['b', 'diamond'],
      ['c', 'circle'],
      ['d', 'stadium'],
      ['e', 'subroutine'],
      ['f', 'cylinder'],
      ['g', 'hexagon'],
      ['h', 'flag'],
    ]);
    expect(result.warnings.filter(entry =>
      entry.code === 'IMPORT_MERMAID_UNSUPPORTED_SHAPE')).toHaveLength(8);
    expect(compileDiagramYaml(serializeDiagramYaml(result.ast)).errors).toEqual([]);
  });

  it('rejects non-flowchart Mermaid types with one clear error and no phantom frames', () => {
    for (const token of ['sequenceDiagram', 'pie', 'sankey-beta', 'futureDiagram']) {
      const result = importMermaid(`${token}\n  ignored content\n`);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        code: 'IMPORT_MERMAID_UNSUPPORTED_DIAGRAM_TYPE',
        level: 'error',
      });
      expect(result.errors[0]?.message).toContain(token);
      expect(result.diagnostics).toHaveLength(1);
      expect(result.ast.root?.children).toEqual([]);
    }
  });

  it('surfaces duplicate ids and avoids a synthetic root collision with a node named page', () => {
    const duplicate = importMermaid([
      'flowchart TB',
      '  A["Start"]',
      '  A["Restart"]',
    ].join('\n'));
    expect(duplicate.errors).toMatchObject([{
      code: 'DUPLICATE_FRAME_ID',
      level: 'error',
    }]);

    const page = importMermaid([
      'flowchart TB',
      '  page["Home"]',
    ].join('\n'));
    expect(page.errors).toEqual([]);
    expect(page.ast.root?.id).toBe('page_root');
    expect(page.ast.root?.children[0]?.id).toBe('page');
    expect(compileDiagramYaml(serializeDiagramYaml(page.ast)).errors).toEqual([]);
  });

  it('keeps comments, large frontmatter, nested subgraphs, and styling diagnostics isolated', () => {
    const result = importMermaid([
      '---',
      'title: Styled corpus',
      'config:',
      '  themeVariables:',
      '    primaryColor: "#000"',
      '    nested:',
      '      one: true',
      '  themeCSS: |',
      '    .node { color: white; }',
      '---',
      '%% body comment',
      'flowchart TB',
      '  subgraph outer["Outer"]:::section',
      '    subgraph inner["Inner"]',
      '      api["API"]:::leaf',
      '      worker["Worker"]',
      '    end',
      '  end',
      '  api --> worker',
      '  classDef leaf fill:#fff',
      '  class api leaf',
      '  style worker fill:#000',
      '  linkStyle 0 stroke:#fff',
    ].join('\n'), { strict: true });

    expect(result.errors).toEqual([]);
    expect(result.ast.metadata.title).toBe('Styled corpus');
    expect(result.ast.root?.children).toMatchObject([{
      id: 'outer',
      children: [{
        id: 'inner',
        children: [{ id: 'api' }, { id: 'worker' }],
      }],
    }]);
    expect(result.ast.arrows).toMatchObject([{ source: 'api', target: 'worker' }]);
    expect(result.warnings.filter(entry =>
      entry.code === 'IMPORT_MERMAID_UNSUPPORTED_STYLE')).toHaveLength(6);
    expect(compileDiagramYaml(serializeDiagramYaml(result.ast)).errors).toEqual([]);
  });

  it('diagnoses and skips D2 class assignments and edge attribute blocks', () => {
    const result = importD2([
      'engine: {',
      '  child: Child {',
      '    class: leaf',
      '  }',
      '  other: Other',
      '}',
      'engine.child -> engine.other: connects {',
      '  class: edge',
      '}',
      '',
    ].join('\n'));

    expect(result.errors).toEqual([]);
    expect(result.ast.root?.children[0]).toMatchObject({
      id: 'engine',
      children: [{ id: 'child' }, { id: 'other' }],
    });
    expect(result.ast.arrows).toMatchObject([
      { source: 'child', target: 'other', label: [{ text: 'connects' }] },
    ]);
    expect(result.warnings.some(warning => warning.code === 'IMPORT_D2_UNSUPPORTED_CLASS')).toBe(true);
    expect(result.ast.frameIndex.class).toBeUndefined();

    const compiled = compileDiagramYaml(serializeDiagramYaml(result.ast));
    expect(compiled.errors).toEqual([]);
  });

  it('round-trips Mermaid exporter structure and preserves accepted style warnings under strict mode', () => {
    const yamlPath = join(repoRoot, 'diagrams', '1.input', 'tiered-network-architecture.yaml');
    const compiled = compileDiagramYaml(readFileSync(yamlPath, 'utf8'), { sourcePath: yamlPath });
    const exported = exportMermaid(compiled.ast);
    const imported = importMermaid(exported.mermaid);

    expect(imported.errors).toEqual([]);
    expect(frameIds(imported.ast.root)).toEqual(frameIds(compiled.ast.root));
    expect(imported.ast.arrows.map(arrow => [arrow.source, arrow.target])).toEqual(
      compiled.ast.arrows.map(arrow => [arrow.source, arrow.target]),
    );

    const strict = importMermaid('flowchart TB\nclassDef highlighted fill:#fff\na["A"]\n');
    expect(strict.warnings).toHaveLength(1);
    const strictAccepted = importMermaid('flowchart TB\nclassDef highlighted fill:#fff\na["A"]\n', { strict: true });
    expect(strictAccepted.errors).toEqual([]);
    expect(strictAccepted.warnings).toHaveLength(1);
    expect(importMermaid('flowchart TB\nthis is unsupported\n', { strict: true }).errors).toHaveLength(1);
  });
});
