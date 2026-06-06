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
    const yamlPath = join(repoRoot, 'scripts', 'diagrams', 'frames', 'preview-smoke.yaml');
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
});
