import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { compileDiagramYaml } from '../src/diagram-author/compile.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const fixtures = [
  ['imported-riscv-boot-flow.yaml', 20, 10],
  ['imported-lifecycle-details.yaml', 20, 10],
  ['imported-kubeflow-authorisation-service.yaml', 5, 4],
] as const;

function sourcePathFor(reference: string): string {
  const relative = reference.replace(/^mermaid[\\/]/, '');
  const candidates = [
    resolve(repoRoot, '..', 'mermaid', relative),
    resolve(repoRoot, '..', '..', 'mermaid', relative),
  ];
  return candidates.find(candidate => existsSync(candidate)) ?? candidates[0]!;
}

describe('representative hand-authored Mermaid imports', () => {
  it.each(fixtures)('reloads %s with compound ELK topology', (filename, minFrames, minArrows) => {
    const path = join(repoRoot, 'diagrams', '1.input', filename);
    const compiled = compileDiagramYaml(readFileSync(path, 'utf8'), { sourcePath: path });

    expect(compiled.errors).toEqual([]);
    expect(Object.keys(compiled.ast.frameIndex).length).toBeGreaterThanOrEqual(minFrames);
    expect(compiled.ast.arrows.length).toBeGreaterThanOrEqual(minArrows);
    expect(compiled.frameDiagram?.layoutEngine).toBe('elk-layered');
  });

  for (const [filename] of fixtures) {
    const fixturePath = join(repoRoot, 'diagrams', '1.input', filename);
    const fixture = readFileSync(fixturePath, 'utf8');
    const sourceReference = fixture.match(/^# Imported from (.+)$/m)?.[1];
    const expectedSha = fixture.match(/^# Source SHA-256: ([A-Fa-f0-9]{64})$/m)?.[1];
    const sourcePath = sourceReference ? sourcePathFor(sourceReference) : fixturePath;

    it.skipIf(sourceReference !== undefined && !existsSync(sourcePath))(
      `re-verifies ${filename} source SHA-256 (skips only when its sibling Mermaid corpus source is unavailable)`,
      () => {
        expect(sourceReference).toBeDefined();
        expect(expectedSha).toMatch(/^[A-Fa-f0-9]{64}$/);
        if (!sourceReference || !expectedSha) return;
        const actualSha = createHash('sha256')
          .update(readFileSync(sourcePath))
          .digest('hex')
          .toUpperCase();
        expect(actualSha).toBe(expectedSha.toUpperCase());
      },
    );
  }
});
