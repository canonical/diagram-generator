#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { distImport } from './_dist-import.mjs';

const { compileDiagramYaml, layoutSequenceDiagram, renderSequenceDiagramToSvg } = await distImport('index.js');

function formatDiagnostics(diagnostics, sourcePath) {
  const prefix = sourcePath ? `${sourcePath}: ` : '';
  return diagnostics
    .map(entry => `${prefix}${entry.path ?? 'document'}: [${entry.code}] ${entry.message}`)
    .join('\n');
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: export-sequence-svg.mjs <author.yaml> [--out file.svg] [--strict]');
    process.exit(1);
  }

  const yamlPath = resolve(arg);
  const outIdx = process.argv.indexOf('--out');
  const outPath = outIdx >= 0 ? resolve(process.argv[outIdx + 1]) : null;
  const strict = process.argv.includes('--strict');
  const raw = readFileSync(yamlPath, 'utf-8');
  const compiled = compileDiagramYaml(raw, { sourcePath: yamlPath, strict });
  const blocking = [...compiled.errors, ...(strict ? compiled.warnings : [])];

  if (blocking.length > 0) {
    console.error(formatDiagnostics(blocking, yamlPath));
    process.exit(1);
  }
  if (!compiled.ast.sequence) {
    console.error(`${yamlPath}: document does not define a top-level sequence block`);
    process.exit(1);
  }

  const layout = layoutSequenceDiagram(compiled.ast.sequence);
  const svg = renderSequenceDiagramToSvg(compiled.ast.sequence, layout, {
    title: String(compiled.ast.metadata.title ?? 'Sequence diagram'),
  });

  if (outPath) {
    writeFileSync(outPath, svg, 'utf-8');
    console.error(`Wrote ${outPath}`);
  } else {
    process.stdout.write(svg);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});