/**
 * Native frame YAML → FrameDiagram (v3).
 * TypeScript source of truth for batch export and preview loading.
 */

import { readFileSync } from 'node:fs';
import { compileDiagramYaml } from './diagram-author/compile.js';
import type { Diagnostic } from './diagram-author/types.js';
import type { FrameDiagram } from './frame-model.js';

function formatCompileErrors(errors: Diagnostic[], sourcePath?: string): string {
  const prefix = sourcePath ? `${sourcePath}: ` : '';
  return errors
    .map(error => `${prefix}${error.path ?? 'document'}: [${error.code}] ${error.message}`)
    .join('\n');
}

export function loadFrameYamlFromString(raw: string, sourcePath?: string): FrameDiagram {
  const result = compileDiagramYaml(raw, { sourcePath });
  if (result.raw.engine !== 'v3') {
    throw new Error(`${sourcePath ?? 'document'}: not a native frame YAML (missing engine: v3)`);
  }
  if (result.errors.length > 0) {
    throw new Error(formatCompileErrors(result.errors, sourcePath));
  }
  if (!result.frameDiagram) {
    throw new Error(`${sourcePath ?? 'document'}: compile succeeded without lowering output`);
  }
  return result.frameDiagram;
}

export function loadFrameYaml(path: string): FrameDiagram {
  const raw = readFileSync(path, 'utf-8');
  return loadFrameYamlFromString(raw, path);
}
