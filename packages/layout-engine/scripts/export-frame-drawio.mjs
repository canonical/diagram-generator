#!/usr/bin/env node
/**
 * Batch draw.io export: YAML → TS layout → mxGraph XML.
 *
 * Usage:
 *   node packages/layout-engine/scripts/export-frame-drawio.mjs path/to/frame.yaml
 *   node packages/layout-engine/scripts/export-frame-drawio.mjs --slug ai-infra-telecom-services-stack
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import {
  distImport,
  repoRoot,
  resolveFrameYamlPath,
  slugFromArgv,
} from './_dist-import.mjs';

const { loadFrameYaml } = await distImport('frame-yaml-loader.js');
const { layoutFrameDiagramForExport } = await distImport('frame-diagram-export-layout.js');
const { exportFrameDiagramToDrawio } = await distImport('drawio-render.js');
const { createHarfBuzzTextAdapter } = await distImport('harfbuzz-text-adapter.js');
const {
  collectIconNames,
  createFsIconLoader,
  preloadIconMarkup,
} = await distImport('icon-embed.js');

const ICONS_DIR = join(repoRoot, 'assets/icons');
const DEFAULT_OUT_DIR = join(repoRoot, 'diagrams/2.output/draw.io');

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: export-frame-drawio.mjs <frame.yaml> | --slug <name> [--out file.drawio]');
    process.exit(1);
  }

  const yamlPath = resolveFrameYamlPath(arg, process.argv);
  const outIdx = process.argv.indexOf('--out');
  const slug = slugFromArgv(process.argv) ?? yamlPath.replace(/\\/g, '/').split('/').pop()?.replace(/\.yaml$/, '');
  const defaultOut = slug ? join(DEFAULT_OUT_DIR, `${slug}.drawio`) : null;
  const outPath = outIdx >= 0 ? resolve(process.argv[outIdx + 1]) : defaultOut;

  const fontPath = join(repoRoot, 'assets/UbuntuSans[wdth,wght].ttf');
  const fontData = readFileSync(fontPath).buffer;
  const adapter = await createHarfBuzzTextAdapter({ fontData });

  const diagram = loadFrameYaml(yamlPath);
  const result = await layoutFrameDiagramForExport(diagram, adapter);
  const iconLoader = createFsIconLoader(ICONS_DIR);
  const iconMarkupByName = preloadIconMarkup(iconLoader, collectIconNames(diagram.root));
  const exported = exportFrameDiagramToDrawio(diagram, result, adapter, {
    iconMarkupByName,
    diagramId: slug ?? 'diagram',
    diagramName: diagram.title,
  });

  if (!outPath) {
    process.stdout.write(exported.xml);
    return;
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, exported.xml, 'utf-8');
  console.error(`Wrote ${outPath} (${exported.cellCount} cells, ${exported.edgeCount} edges)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
