import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { compileDiagramYaml } from '../src/diagram-author/compile.js';
import { exportD2 } from '../src/diagram-author/export-d2.js';
import { exportMermaid } from '../src/diagram-author/export-mermaid.js';
import { importD2 } from '../src/diagram-author/import-d2.js';
import { importMermaid } from '../src/diagram-author/import-mermaid.js';
import { serializeDiagramYaml } from '../src/diagram-author/serialize-yaml.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function frameIds(root: { id: string; children: typeof root[] } | null): string[] {
  if (!root) return [];
  return [root.id, ...root.children.flatMap(frameIds)];
}

describe('diagram interchange imports', () => {
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

  it('round-trips Mermaid exporter structure and reports strict unsupported syntax', () => {
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
    expect(importMermaid('flowchart TB\nclassDef highlighted fill:#fff\na["A"]\n', { strict: true }).errors).toHaveLength(1);
  });
});
