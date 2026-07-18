#!/usr/bin/env node
/** Mermaid flowchart subset import: .mmd source → canonical engine-v3 frame YAML. */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { distImport } from './_dist-import.mjs';

const { compileDiagramYaml, importMermaid, serializeDiagramYaml } = await distImport('index.js');

function formatDiagnostics(diagnostics, sourcePath) {
  const prefix = sourcePath ? `${sourcePath}: ` : '';
  return diagnostics
    .map(entry => {
      const category = entry.category ? `[${entry.category}] ` : '';
      return `${prefix}${entry.path ?? 'document'}: ${category}[${entry.code}] ${entry.message}`;
    })
    .join('\n');
}

const inIndex = process.argv.indexOf('--in');
if (inIndex < 0 || !process.argv[inIndex + 1]) {
  console.error('Usage: import-mermaid.mjs --in file.mmd [--out file.yaml] [--strict]');
  process.exit(1);
}
const inputPath = resolve(process.argv[inIndex + 1]);
const outIndex = process.argv.indexOf('--out');
const outputPath = outIndex >= 0 && process.argv[outIndex + 1]
  ? resolve(process.argv[outIndex + 1])
  : null;
const strict = process.argv.includes('--strict');
const source = readFileSync(inputPath, 'utf8');
if (source.trim().length === 0) {
  console.error(`${inputPath}: No diagram nodes could be imported.`);
  process.exit(1);
}
const result = importMermaid(source, { strict });

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
