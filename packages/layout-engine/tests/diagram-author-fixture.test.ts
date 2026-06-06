import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { compileDiagramYaml } from '../src/diagram-author/compile.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const framesDir = join(repoRoot, 'scripts', 'diagrams', 'frames');

function collectFrameIds(root: { id: string; children: { id: string; children: unknown[] }[] }): string[] {
  return [root.id, ...root.children.flatMap(child => collectFrameIds(child))];
}

describe('author-v1 reference fixture', () => {
  it('compiles and lowers equivalently to the canonical tiered-network yaml', () => {
    const canonicalPath = join(framesDir, 'tiered-network-architecture.yaml');
    const authorPath = join(framesDir, 'tiered-network-architecture.author-v1.yaml');
    const canonical = compileDiagramYaml(readFileSync(canonicalPath, 'utf-8'), { sourcePath: canonicalPath });
    const author = compileDiagramYaml(readFileSync(authorPath, 'utf-8'), { sourcePath: authorPath });

    expect(canonical.errors).toEqual([]);
    expect(author.errors).toEqual([]);
    expect(collectFrameIds(author.frameDiagram!.root)).toEqual(collectFrameIds(canonical.frameDiagram!.root));
    expect(author.frameDiagram?.arrows.map(arrow => [arrow.source, arrow.target])).toEqual(
      canonical.frameDiagram?.arrows.map(arrow => [arrow.source, arrow.target]),
    );
    expect(author.ast.defaults).toMatchObject({
      client: { label: [{ text: 'Client' }], icon: 'Laptop.svg' },
      network_server: {
        label: [{ text: 'Tier 2' }, { text: 'Network server' }],
        icon: 'Network.svg',
      },
    });
  });
});
