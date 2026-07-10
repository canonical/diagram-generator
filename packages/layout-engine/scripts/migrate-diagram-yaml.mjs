#!/usr/bin/env node
/**
 * Optional migration to author-v1 additive sugar while preserving canonical root + arrows.
 *
 * Usage:
 *   node packages/layout-engine/scripts/migrate-diagram-yaml.mjs \
 *     --in diagrams/1.input/tiered-network-architecture.yaml \
 *     --out diagrams/1.input/tiered-network-architecture.author-v1.yaml \
 *     --shorthand-arrows --extract-defaults
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse, stringify } from 'yaml';
import { distImport } from './_dist-import.mjs';

function parseArgs(argv) {
  const inIdx = argv.indexOf('--in');
  const outIdx = argv.indexOf('--out');
  return {
    inputPath: inIdx >= 0 ? resolve(argv[inIdx + 1]) : null,
    outputPath: outIdx >= 0 ? resolve(argv[outIdx + 1]) : null,
    inPlace: argv.includes('--in-place'),
    shorthandArrows: argv.includes('--shorthand-arrows'),
    extractDefaults: argv.includes('--extract-defaults'),
  };
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function isShorthandArrowCandidate(entry) {
  if (!isPlainObject(entry)) return false;
  const keys = Object.keys(entry);
  return keys.length === 2 && typeof entry.source === 'string' && typeof entry.target === 'string';
}

function migrateArrows(arrows, shorthandArrows) {
  if (!Array.isArray(arrows) || !shorthandArrows) {
    return arrows;
  }
  return arrows.map(entry =>
    isShorthandArrowCandidate(entry) ? `${entry.source} -> ${entry.target}` : entry,
  );
}

function normalizeLabel(label) {
  if (typeof label === 'string') return [label];
  if (Array.isArray(label)) return label;
  return label;
}

function frameTemplateSignature(frame) {
  if (!isPlainObject(frame)) return null;
  const hasChildren = Array.isArray(frame.children) && frame.children.length > 0;
  if (hasChildren) return null;
  const signature = {};
  if (frame.label !== undefined) signature.label = normalizeLabel(frame.label);
  if (frame.icon !== undefined) signature.icon = frame.icon;
  if (Object.keys(signature).length === 0) return null;
  return JSON.stringify(signature);
}

function templateNameForSignature(signatureJson, frame, usedNames) {
  const parsed = JSON.parse(signatureJson);
  const icon = typeof parsed.icon === 'string' ? parsed.icon : '';
  const label = parsed.label;
  let base = icon.replace(/\.svg$/i, '').replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase();
  if (base === 'laptop' && JSON.stringify(label) === JSON.stringify(['Client'])) {
    base = 'client';
  }
  if (base === 'network' && Array.isArray(label) && label[0] === 'Tier 2') {
    base = 'network_server';
  }
  if (!base) base = 'template';
  let candidate = base;
  let suffix = 2;
  while (usedNames.has(candidate)) {
    candidate = `${base}_${suffix}`;
    suffix += 1;
  }
  usedNames.add(candidate);
  return candidate;
}

function collectTemplateCandidates(node, counts = new Map()) {
  if (!isPlainObject(node)) return;
  const signature = frameTemplateSignature(node);
  if (signature) {
    counts.set(signature, (counts.get(signature) ?? 0) + 1);
  }
  if (Array.isArray(node.children)) {
    node.children.forEach(child => collectTemplateCandidates(child, counts));
  }
}

function buildDefaults(root, extractDefaults) {
  if (!extractDefaults || !isPlainObject(root)) {
    return {};
  }
  const counts = new Map();
  collectTemplateCandidates(root, counts);
  const defaults = {};
  const usedNames = new Set();
  for (const [signature, count] of counts.entries()) {
    if (count < 2) continue;
    const frame = JSON.parse(signature);
    const name = templateNameForSignature(signature, frame, usedNames);
    defaults[name] = frame;
  }
  return defaults;
}

function applyTemplates(node, defaultsBySignature) {
  if (!isPlainObject(node)) return node;
  const next = { ...node };
  if (Array.isArray(next.children)) {
    next.children = next.children.map(child => applyTemplates(child, defaultsBySignature));
  }
  const signature = frameTemplateSignature(next);
  const templateName = signature ? defaultsBySignature.get(signature) : undefined;
  if (templateName) {
    delete next.label;
    delete next.icon;
    next.use = templateName;
  }
  return next;
}

function migrateDocument(doc, options) {
  const migrated = { ...doc };
  if (options.shorthandArrows) {
    migrated.arrows = migrateArrows(doc.arrows, true);
  }
  if (options.extractDefaults && isPlainObject(doc.root)) {
    const defaults = buildDefaults(doc.root, true);
    if (Object.keys(defaults).length > 0) {
      migrated.defaults = defaults;
      migrated.schema = 'author-v1';
      const defaultsBySignature = new Map(
        Object.entries(defaults).map(([name, template]) => [JSON.stringify(template), name]),
      );
      migrated.root = applyTemplates(doc.root, defaultsBySignature);
    }
  } else if (options.shorthandArrows) {
    migrated.schema = migrated.schema ?? 'author-v1';
  }
  return migrated;
}

function formatDiagnostics(errors, sourcePath) {
  const prefix = sourcePath ? `${sourcePath}: ` : '';
  return errors
    .map(entry => `${prefix}${entry.path ?? 'document'}: [${entry.code}] ${entry.message}`)
    .join('\n');
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.inputPath) {
    console.error(
      'Usage: migrate-diagram-yaml.mjs --in <frame.yaml> [--out file.yaml | --in-place] [--shorthand-arrows] [--extract-defaults]',
    );
    process.exit(1);
  }
  if (args.inPlace && args.outputPath) {
    console.error('Use either --out or --in-place, not both.');
    process.exit(1);
  }
  if (!args.shorthandArrows && !args.extractDefaults) {
    console.error('Specify at least one of --shorthand-arrows or --extract-defaults.');
    process.exit(1);
  }

  const raw = readFileSync(args.inputPath, 'utf-8');
  const doc = parse(raw);
  if (!isPlainObject(doc)) {
    throw new Error(`${args.inputPath}: expected top-level mapping`);
  }
  if (doc.engine !== 'v3') {
    throw new Error(`${args.inputPath}: not a native frame YAML (missing engine: v3)`);
  }

  const migrated = migrateDocument(doc, args);
  const output = `${stringify(migrated).trimEnd()}\n`;
  const outputPath = args.inPlace ? args.inputPath : args.outputPath;

  const { compileDiagramYaml } = await distImport('index.js');
  const compiled = compileDiagramYaml(output, { sourcePath: outputPath ?? args.inputPath });
  if (compiled.errors.length > 0) {
    console.error(formatDiagnostics(compiled.errors, outputPath ?? args.inputPath));
    process.exit(1);
  }

  if (outputPath) {
    writeFileSync(outputPath, output, 'utf-8');
    console.error(`Wrote ${outputPath}`);
  } else {
    process.stdout.write(output);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
