import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { exportFrameDiagramToDrawio } from '../src/drawio-render.js';
import {
  collectIconNames,
  createFsIconLoader,
  preloadIconMarkup,
} from '../src/icon-embed.js';
import { layoutFrameDiagramForExport } from '../src/frame-diagram-export-layout.js';
import { loadFrameYaml } from '../src/frame-yaml-loader.js';
import {
  FRAMES_DIR,
  ICONS_DIR,
  getHarfBuzzAdapter,
} from './svg-golden-harness.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
export const DRAWIO_GOLDEN_DIR = join(
  __dirname,
  '../../../specs/077-yaml-drawio-export/golden',
);

export const AI_INFRA_DRAWIO_SLUGS = [
  'ai-infra-telecom-services-stack',
  'ai-infra-telco-value-map',
  'ai-infra-production-contract',
] as const;

export function normalizeDrawio(xml: string): string {
  return xml.replace(/\r\n/g, '\n').trimEnd() + '\n';
}

export async function exportSlugToDrawio(slug: string) {
  const yamlPath = join(FRAMES_DIR, `${slug}.yaml`);
  const adapter = await getHarfBuzzAdapter();
  const diagram = loadFrameYaml(yamlPath);
  const result = await layoutFrameDiagramForExport(diagram, adapter);
  const iconLoader = createFsIconLoader(ICONS_DIR);
  const iconMarkupByName = preloadIconMarkup(iconLoader, collectIconNames(diagram.root));
  return exportFrameDiagramToDrawio(diagram, result, adapter, {
    iconMarkupByName,
    diagramId: slug,
    diagramName: diagram.title,
  });
}

export function readMxGeometry(xml: string, cellId: string): { x: string; y: string } | null {
  const cellPattern = new RegExp(
    `<mxCell id="${cellId}"[\\s\\S]*?<mxGeometry x="([^"]+)" y="([^"]+)"`,
  );
  const match = xml.match(cellPattern);
  if (!match) return null;
  return { x: match[1]!, y: match[2]! };
}

export function findLabelVerticesByText(
  xml: string,
  substrings: readonly string[],
): Array<{ parent: string; value: string; x: string; y: string }> {
  const cellPattern = new RegExp(
    '<mxCell id="\\d+" parent="([^"]+)" style="([^"]*)" value="([^"]*)"[^>]*vertex="1"[\\s\\S]*?<mxGeometry x="([^"]+)" y="([^"]+)"',
    'g',
  );
  const geometries: Array<{ parent: string; value: string; x: string; y: string }> = [];
  for (const match of xml.matchAll(cellPattern)) {
    const parent = match[1] ?? '';
    const style = match[2] ?? '';
    const value = match[3] ?? '';
    if (style.includes('shape=image')) continue;
    if (!substrings.every((substring) => value.includes(substring))) continue;
    geometries.push({
      parent,
      value,
      x: match[4]!,
      y: match[5]!,
    });
  }
  return geometries;
}
