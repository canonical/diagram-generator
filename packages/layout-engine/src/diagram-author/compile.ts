import { buildFrameAst } from './build-ast.js';
import { normalizeArrows } from './normalize-arrows.js';
import { parseYamlDocument } from './parse-yaml.js';
import { validateArrowRefs } from './ref-grammar.js';
import type {
  CompileOptions,
  CompileResult,
  DiagramDocument,
  Diagnostic,
} from './types.js';

function asRecordMap(value: unknown): Record<string, Record<string, unknown>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      entry && typeof entry === 'object' && !Array.isArray(entry)
        ? { ...(entry as Record<string, unknown>) }
        : {},
    ]),
  );
}

function buildMetadata(source: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries({
      schema: source.schema,
      title: source.title,
      engine: source.engine,
    }).filter(([, value]) => value !== undefined),
  );
}

function createScaffoldAst(source: Record<string, unknown>): { ast: DiagramDocument; diagnostics: Diagnostic[] } {
  const frameAst = buildFrameAst(source.root);
  const normalizedArrows = normalizeArrows(source.arrows);
  return {
    ast: {
      metadata: buildMetadata(source),
      defaults: asRecordMap(source.defaults),
      root: frameAst.root,
      arrows: normalizedArrows.arrows,
      frameIndex: frameAst.frameIndex,
      source: { ...source },
    },
    diagnostics: [
      ...frameAst.diagnostics,
      ...normalizedArrows.diagnostics,
      ...validateArrowRefs(normalizedArrows.arrows, frameAst.frameIndex),
    ],
  };
}

export function compileDiagramYaml(raw: string, options: CompileOptions = {}): CompileResult {
  const parsed = parseYamlDocument(raw, options);
  const scaffold = createScaffoldAst(parsed);
  const diagnostics = [...scaffold.diagnostics];
  const errors = diagnostics.filter(diagnostic => diagnostic.level === 'error');
  const warnings = diagnostics.filter(diagnostic => diagnostic.level === 'warning');

  return {
    ast: scaffold.ast,
    diagnostics,
    errors,
    warnings,
    deprecations: [],
    raw: parsed,
    normalized: parsed,
  };
}
