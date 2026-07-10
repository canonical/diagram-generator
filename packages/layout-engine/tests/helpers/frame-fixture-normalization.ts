import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import { loadFrameYaml } from '../../src/frame-yaml-loader.js';
import {
  deserializeFrameDiagramWire,
  serializeFrameDiagram,
} from '../../src/frame-serialize.js';
import type { FrameDiagram } from '../../src/frame-model.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
export const FRAMES_DIR = join(__dirname, '../../../..', 'diagrams/1.input');

export type NormalizedFrameFixtureOptions = {
  engine: string;
  engineLayout?: Record<string, Record<string, string>>;
};

export function frameFixturePath(slug: string): string {
  return join(FRAMES_DIR, `${slug}.yaml`);
}

export function loadNormalizedFrameFixture(
  slug: string,
  options: NormalizedFrameFixtureOptions,
): FrameDiagram {
  const wire = serializeFrameDiagram(loadFrameYaml(frameFixturePath(slug)));
  wire.layoutEngine = options.engine;
  delete wire.elkLayout;
  if (options.engineLayout && Object.keys(options.engineLayout).length > 0) {
    wire.engineLayout = options.engineLayout;
  } else {
    delete wire.engineLayout;
  }
  return deserializeFrameDiagramWire(wire);
}
