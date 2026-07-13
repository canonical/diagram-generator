#!/usr/bin/env node
/** Compile YAML, export to Mermaid or D2, import it, and report structural loss. */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { distImport } from './_dist-import.mjs';

const {
  compileDiagramYaml,
  exportD2,
  exportMermaid,
  importD2,
  importMermaid,
  serializeDiagramYaml,
} = await distImport('index.js');

function usage() {
  console.error('Usage: interchange-roundtrip.mjs --in frame.yaml --format d2|mermaid [--out frame.yaml] [--strict]');
  process.exit(1);
}

function formatDiagnostics(diagnostics, sourcePath) {
  return diagnostics
    .map(entry => `${sourcePath}: ${entry.path ?? 'document'}: [${entry.code}] ${entry.message}`)
    .join('\n');
}

function structure(ast) {
  const frame = node => ({ id: node.id, children: node.children.map(frame) });
  return {
    root: ast.root ? frame(ast.root) : null,
    arrows: ast.arrows.map(arrow => ({
      source: arrow.source,
      target: arrow.target,
      label: arrow.label?.map(line => line.text) ?? [],
    })),
  };
}

const inIndex = process.argv.indexOf('--in');
const formatIndex = process.argv.indexOf('--format');
if (inIndex < 0 || formatIndex < 0 || !process.argv[inIndex + 1] || !process.argv[formatIndex + 1]) usage();
const inputPath = resolve(process.argv[inIndex + 1]);
const format = process.argv[formatIndex + 1];
if (format !== 'd2' && format !== 'mermaid') usage();
const outIndex = process.argv.indexOf('--out');
const outputPath = outIndex >= 0 && process.argv[outIndex + 1]
  ? resolve(process.argv[outIndex + 1])
  : null;
const strict = process.argv.includes('--strict');

const compiled = compileDiagramYaml(readFileSync(inputPath, 'utf8'), { sourcePath: inputPath, strict });
if (compiled.errors.length > 0) {
  console.error(formatDiagnostics(compiled.errors, inputPath));
  process.exit(1);
}
const exported = format === 'd2' ? exportD2(compiled.ast) : exportMermaid(compiled.ast);
const imported = format === 'd2'
  ? importD2(exported.d2, { strict })
  : importMermaid(exported.mermaid, { strict });
const diagnostics = [...exported.warnings, ...imported.diagnostics];
if (strict && diagnostics.length > 0) {
  console.error(formatDiagnostics(diagnostics, inputPath));
  process.exit(1);
}
if (imported.errors.length > 0) {
  console.error(formatDiagnostics(imported.errors, inputPath));
  process.exit(1);
}
if (diagnostics.length > 0) {
  console.error(formatDiagnostics(diagnostics, inputPath));
}

const sourceStructure = structure(compiled.ast);
const importedStructure = structure(imported.ast);
if (JSON.stringify(sourceStructure) !== JSON.stringify(importedStructure)) {
  console.error('Structural diff:');
  console.error(JSON.stringify({ source: sourceStructure, imported: importedStructure }, null, 2));
  process.exit(1);
}

const yaml = serializeDiagramYaml(imported.ast);
if (outputPath) {
  writeFileSync(outputPath, yaml, 'utf8');
  console.error(`Wrote ${outputPath}`);
} else {
  process.stdout.write(yaml);
}
