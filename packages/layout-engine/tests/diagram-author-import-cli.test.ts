import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

import { compileDiagramYaml } from '../src/diagram-author/compile.js';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const scratchDirectories: string[] = [];

function scratchDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'diagram-import-cli-'));
  scratchDirectories.push(directory);
  return directory;
}

function runImport(
  script: 'import-mermaid.mjs' | 'import-d2.mjs',
  source: string,
  extension: 'mmd' | 'd2',
) {
  const directory = scratchDirectory();
  const inputPath = join(directory, `input.${extension}`);
  const outputPath = join(directory, 'output.yaml');
  writeFileSync(inputPath, source, 'utf8');
  const result = spawnSync(
    process.execPath,
    [join(packageRoot, 'scripts', script), '--in', inputPath, '--out', outputPath],
    { encoding: 'utf8' },
  );
  return { ...result, outputPath };
}

afterEach(() => {
  while (scratchDirectories.length > 0) {
    rmSync(scratchDirectories.pop()!, { recursive: true, force: true });
  }
});

describe('diagram interchange import CLIs', () => {
  it('refuses to write empty Mermaid imports', () => {
    const result = runImport('import-mermaid.mjs', '', 'mmd');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('No diagram nodes could be imported');
    expect(existsSync(result.outputPath)).toBe(false);
  }, 15_000);

  it('refuses to write structurally invalid Mermaid imports', () => {
    const result = runImport(
      'import-mermaid.mjs',
      'flowchart TB\nA["Start"]\nA["Restart"]\n',
      'mmd',
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('DUPLICATE_FRAME_ID');
    expect(existsSync(result.outputPath)).toBe(false);
  }, 15_000);

  it('surfaces Mermaid structural-loss categories, exits nonzero, and writes nothing', () => {
    const result = runImport(
      'import-mermaid.mjs',
      [
        'flowchart TB',
        'power_on@{ animate: true } --> load_spl',
      ].join('\n'),
      'mmd',
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('[structural]');
    expect(result.stderr).toContain('[IMPORT_MERMAID_UNSUPPORTED_EDGE]');
    expect(existsSync(result.outputPath)).toBe(false);
  }, 15_000);

  it('writes only Mermaid YAML that recompiles cleanly', () => {
    const result = runImport('import-mermaid.mjs', 'flowchart TD\nA --> B --> C\n', 'mmd');

    expect(result.status).toBe(0);
    expect(existsSync(result.outputPath)).toBe(true);
    expect(compileDiagramYaml(readFileSync(result.outputPath, 'utf8')).errors).toEqual([]);
  }, 15_000);

  it('applies the empty-output safety gate to the deferred D2 importer', () => {
    const result = runImport('import-d2.mjs', '', 'd2');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('No diagram nodes could be imported');
    expect(existsSync(result.outputPath)).toBe(false);
  }, 15_000);
});
