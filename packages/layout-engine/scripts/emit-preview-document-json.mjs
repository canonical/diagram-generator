#!/usr/bin/env node
/** Emit a preview-document JSON DTO from authored YAML. */
import { basename } from 'node:path';
import { readFileSync } from 'node:fs';
import { distImport, resolveFrameYamlPath, slugFromArgv } from './_dist-import.mjs';

const yamlPath = resolveFrameYamlPath(process.argv[2], process.argv);
const raw = readFileSync(yamlPath, 'utf-8');
const slug = slugFromArgv(process.argv) ?? basename(yamlPath, '.yaml');

const { compileDiagramYaml } = await distImport('diagram-author/compile.js');
const { serializeFrameDiagram } = await distImport('frame-serialize.js');

const result = compileDiagramYaml(raw, { sourcePath: yamlPath });
if (result.errors.length > 0) {
  const message = result.errors
    .map((error) => `${error.path ?? 'document'}: [${error.code}] ${error.message}`)
    .join('\n');
  throw new Error(message || `${yamlPath}: preview document compile failed`);
}

const title = String(result.ast.metadata.title ?? slug);

if (result.ast.sequence) {
  process.stdout.write(`${JSON.stringify({
    kind: 'sequence',
    slug,
    title,
    layoutEngine: 'sequence',
    shellMode: 'grid',
    sequence: result.ast.sequence,
  })}\n`);
} else if (result.frameDiagram) {
  process.stdout.write(`${JSON.stringify({
    kind: 'frame-diagram',
    slug,
    title,
    layoutEngine: result.frameDiagram.layoutEngine ?? null,
    shellMode: 'grid',
    frameTree: serializeFrameDiagram(result.frameDiagram),
  })}\n`);
} else {
  throw new Error(`${yamlPath}: compile succeeded without preview-document output`);
}