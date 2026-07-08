import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { compileDiagramYaml } from '../src/diagram-author/compile.js';
import { loadFrameYamlFromString } from '../src/frame-yaml-loader.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function collectFrameIds(root: { id: string; children: { id: string; children: unknown[] }[] }): string[] {
  return [root.id, ...root.children.flatMap(child => collectFrameIds(child))];
}

describe('diagram author lowering regression', () => {
  it('loads preview-smoke through compile lowering with the same frame ids and arrows', () => {
    const yamlPath = join(repoRoot, 'diagrams', '1.input', 'preview-smoke.yaml');
    const raw = readFileSync(yamlPath, 'utf-8');
    const lowered = loadFrameYamlFromString(raw, yamlPath);
    const compiled = compileDiagramYaml(raw, { sourcePath: yamlPath });

    expect(compiled.errors).toEqual([]);
    expect(compiled.frameDiagram).toBeDefined();
    expect(collectFrameIds(compiled.frameDiagram!.root)).toEqual(collectFrameIds(lowered.root));
    expect(compiled.frameDiagram?.arrows.map(arrow => [arrow.source, arrow.target])).toEqual(
      lowered.arrows.map(arrow => [arrow.source, arrow.target]),
    );
    expect(compiled.frameDiagram?.title).toBe(lowered.title);
  });

  it('accepts arrow:<id> refs when they target an already-defined arrow', () => {
    const raw = [
      'engine: v3',
      'title: arrow ref',
      'arrows:',
      '  - id: stem',
      '    source: source.bottom',
      '    target: target.top',
      '  - source: arrow:stem',
      '    target: branch.left',
      'root:',
      '  id: page',
      '  direction: vertical',
      '  children:',
      '    - id: source',
      '      label: [Source]',
      '    - id: target',
      '      label: [Target]',
      '    - id: branch',
      '      label: [Branch]',
      '',
    ].join('\n');

    const compiled = compileDiagramYaml(raw, { sourcePath: 'arrow-ref.yaml' });
    const lowered = loadFrameYamlFromString(raw, 'arrow-ref.yaml');

    expect(compiled.errors).toEqual([]);
    expect(lowered.arrows[1]?.source).toBe('arrow:stem');
  });

  it('treats single-entry YAML mappings inside label arrays as literal text lines', () => {
    const raw = [
      'engine: v3',
      'title: line mapping literal',
      'root:',
      '  id: page',
      '  direction: vertical',
      '  children:',
      '    - id: note',
      '      border: none',
      '      fill: grey',
      '      label:',
      '        - certificates',
      '        - interface: tls-certificates',
      '',
    ].join('\n');

    const lowered = loadFrameYamlFromString(raw, 'line-mapping-literal.yaml');

    expect(lowered.root.children[0]?.label.map((line) => line.content)).toEqual([
      'certificates',
      'interface: tls-certificates',
    ]);
  });

  it('rejects forward arrow:<id> refs so routing stays deterministic', () => {
    const raw = [
      'engine: v3',
      'title: arrow ref forward',
      'arrows:',
      '  - source: arrow:stem',
      '    target: branch.left',
      '  - id: stem',
      '    source: source.bottom',
      '    target: target.top',
      'root:',
      '  id: page',
      '  direction: vertical',
      '  children:',
      '    - id: source',
      '      label: [Source]',
      '    - id: target',
      '      label: [Target]',
      '    - id: branch',
      '      label: [Branch]',
      '',
    ].join('\n');

    const compiled = compileDiagramYaml(raw, { sourcePath: 'arrow-ref-forward.yaml' });

    expect(compiled.errors.map(error => error.code)).toContain('ARROW_UNKNOWN_SOURCE_ARROW');
  });
});
