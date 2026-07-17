#!/usr/bin/env node
/** D2 subset import: .d2 source → canonical engine-v3 frame YAML. */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { distImport } from './_dist-import.mjs';

const { compileDiagramYaml, importD2, serializeDiagramYaml } = await distImport('index.js');

function formatDiagnostics(diagnostics, sourcePath) {
  const prefix = sourcePath ? `${sourcePath}: ` : '';
  return diagnostics
    .map(entry => `${prefix}${entry.path ?? 'document'}: [${entry.code}] ${entry.message}`)
    .join('\n');
}

const inIndex = process.argv.indexOf('--in');
if (inIndex < 0 || !process.argv[inIndex + 1]) {
  console.error('Usage: import-d2.mjs --in file.d2 [--out file.yaml] [--strict]');
  process.exit(1);
}
const inputPath = resolve(process.argv[inIndex + 1]);
const outIndex = process.argv.indexOf('--out');
const outputPath = outIndex >= 0 && process.argv[outIndex + 1]
  ? resolve(process.argv[outIndex + 1])
  : null;
const strict = process.argv.includes('--strict');
const result = importD2(readFileSync(inputPath, 'utf8'), { strict });

if (result.errors.length > 0) {
  console.error(formatDiagnostics(result.errors, inputPath));
  process.exit(1);
}
if (result.warnings.length > 0) {
  console.error(formatDiagnostics(result.warnings, inputPath));
}

if (!result.ast.root || result.ast.root.children.length === 0) {
  console.error(`${inputPath}: No diagram nodes could be imported.`);
  process.exit(1);
}

const yaml = serializeDiagramYaml(result.ast);
const compiled = compileDiagramYaml(yaml, { sourcePath: outputPath ?? inputPath });
if (compiled.errors.length > 0) {
  console.error(formatDiagnostics(compiled.errors, outputPath ?? inputPath));
  process.exit(1);
}

if (outputPath) {
  writeFileSync(outputPath, yaml, 'utf8');
  console.error(`Wrote ${outputPath}`);
} else {
  process.stdout.write(yaml);
}
