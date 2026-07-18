import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { compileDiagramYaml } from '../src/diagram-author/compile.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

describe('representative hand-authored Mermaid imports', () => {
  it.each([
    ['imported-riscv-boot-flow.yaml', 20, 10],
    ['imported-lifecycle-details.yaml', 20, 10],
    ['imported-kubeflow-authorisation-service.yaml', 5, 4],
  ] as const)('reloads %s with compound ELK topology', (filename, minFrames, minArrows) => {
    const path = join(repoRoot, 'diagrams', '1.input', filename);
    const compiled = compileDiagramYaml(readFileSync(path, 'utf8'), { sourcePath: path });

    expect(compiled.errors).toEqual([]);
    expect(Object.keys(compiled.ast.frameIndex).length).toBeGreaterThanOrEqual(minFrames);
    expect(compiled.ast.arrows.length).toBeGreaterThanOrEqual(minArrows);
    expect(compiled.frameDiagram?.layoutEngine).toBe('elk-layered');
  });
});
