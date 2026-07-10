import { buildFrameAst } from './build-ast.js';
import { applyConfiguredFrameRoleAssignment } from './assign-frame-roles.js';
import { expandFrameDefaults } from './expand-defaults.js';
import { lowerToFrameDiagram } from './lower-to-frame.js';
import { normalizeArrows } from './normalize-arrows.js';
import { parseYamlDocument } from './parse-yaml.js';
import { validateArrowRefs } from './ref-grammar.js';
import { applyStrictMode, collectCompileWarnings } from './validate.js';
import { normalizeSequenceDiagram, type SequenceDiagramInput } from '../sequence-layout/model.js';
import type {
  CompileOptions,
  CompileResult,
  DiagramDocument,
  Diagnostic,
} from './types.js';

function buildMetadata(source: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries({
      schema: source.schema,
      title: source.title,
      engine: source.engine,
    }).filter(([, value]) => value !== undefined),
  );
}

function normalizeSequenceBlock(source: Record<string, unknown>): {
  sequence?: DiagramDocument['sequence'];
  diagnostics: Diagnostic[];
} {
  const rawSequence = source.sequence;
  if (rawSequence === undefined) {
    return { sequence: undefined, diagnostics: [] };
  }
  if (!rawSequence || typeof rawSequence !== 'object' || Array.isArray(rawSequence)) {
    return {
      diagnostics: [
        {
          code: 'SEQUENCE_INVALID_BLOCK',
          level: 'error',
          message: 'Top-level `sequence` must be a mapping.',
          path: 'sequence',
        },
      ],
    };
  }

  const record = rawSequence as Record<string, unknown>;
  const normalized = normalizeSequenceDiagram({
    participants: Array.isArray(record.participants) ? record.participants as SequenceDiagramInput['participants'] : [],
    messages: Array.isArray(record.messages) ? record.messages as SequenceDiagramInput['messages'] : [],
    notes: Array.isArray(record.notes) ? record.notes as SequenceDiagramInput['notes'] : undefined,
    groups: Array.isArray(record.groups) ? record.groups as SequenceDiagramInput['groups'] : undefined,
  });

  return {
    sequence: normalized.spec,
    diagnostics: normalized.errors.map((error) => ({
      code: error.code,
      level: 'error' as const,
      message: error.message,
      path: `sequence.${error.path}`,
    })),
  };
}

function createScaffoldAst(
  source: Record<string, unknown>,
  options: CompileOptions,
): { ast: DiagramDocument; diagnostics: Diagnostic[] } {
  const frameAst = buildFrameAst(source.root);
  const expanded = expandFrameDefaults(frameAst.root, source.defaults);
  const normalizedArrows = normalizeArrows(source.arrows);
  const normalizedSequence = normalizeSequenceBlock(source);
  const ast: DiagramDocument = {
    metadata: buildMetadata(source),
    defaults: expanded.defaults,
    root: expanded.root,
    arrows: normalizedArrows.arrows,
    sequence: normalizedSequence.sequence,
    frameIndex: frameAst.frameIndex,
    source: { ...source },
  };
  const roleDiagnostics = applyConfiguredFrameRoleAssignment(ast.root, ast.arrows, source);
  const diagnostics = applyStrictMode(
    [
      ...roleDiagnostics,
      ...frameAst.diagnostics,
      ...expanded.diagnostics,
      ...normalizedArrows.diagnostics,
      ...normalizedSequence.diagnostics,
      ...validateArrowRefs(normalizedArrows.arrows, frameAst.frameIndex, frameAst.root?.id),
      ...collectCompileWarnings({
        root: ast.root,
        arrows: ast.arrows,
        defaults: ast.defaults,
        frameIndex: ast.frameIndex,
        usedTemplates: expanded.usedTemplates,
      }),
    ],
    options.strict === true,
  );
  return { ast, diagnostics };
}

export function compileDiagramYaml(raw: string, options: CompileOptions = {}): CompileResult {
  const parsed = parseYamlDocument(raw, options);
  const scaffold = createScaffoldAst(parsed, options);
  const diagnostics = [...scaffold.diagnostics];
  const errors = diagnostics.filter(diagnostic => diagnostic.level === 'error');
  const warnings = diagnostics.filter(diagnostic => diagnostic.level === 'warning');
  const frameDiagram = errors.length === 0 && scaffold.ast.root
    ? lowerToFrameDiagram(scaffold.ast, parsed)
    : undefined;

  return {
    ast: scaffold.ast,
    frameDiagram,
    diagnostics,
    errors,
    warnings,
    deprecations: [],
    raw: parsed,
    normalized: parsed,
  };
}
