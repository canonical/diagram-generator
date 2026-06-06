import { normalizeArrows } from './normalize-arrows.js';
import { parseYamlDocument } from './parse-yaml.js';
import { validateArrowRefs } from './ref-grammar.js';
import type {
  AuthorFrameNode,
  CompileOptions,
  CompileResult,
  DiagramDocument,
  Diagnostic,
  FrameIndexEntry,
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

function cloneFrameNode(value: unknown): AuthorFrameNode | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const children = Array.isArray(record.children)
    ? record.children
        .map(child => cloneFrameNode(child))
        .filter((child): child is AuthorFrameNode => child !== null)
    : [];
  return {
    ...record,
    id: String(record.id ?? ''),
    children,
  };
}

function buildFrameIndex(root: AuthorFrameNode | null): Record<string, FrameIndexEntry> {
  if (!root) {
    return {};
  }
  const index: Record<string, FrameIndexEntry> = {};

  const visit = (node: AuthorFrameNode, path: string, parentId?: string) => {
    if (node.id) {
      index[node.id] = {
        id: node.id,
        parentId,
        isContainer: node.children.length > 0,
        path,
      };
    }
    node.children.forEach((child, childIndex) => {
      visit(child, `${path}.children[${childIndex}]`, node.id || parentId);
    });
  };

  visit(root, 'root');
  return index;
}

function createScaffoldAst(source: Record<string, unknown>): { ast: DiagramDocument; diagnostics: Diagnostic[] } {
  const root = cloneFrameNode(source.root);
  const normalizedArrows = normalizeArrows(source.arrows);
  const frameIndex = buildFrameIndex(root);
  return {
    ast: {
      metadata: buildMetadata(source),
      defaults: asRecordMap(source.defaults),
      root,
      arrows: normalizedArrows.arrows,
      frameIndex,
      source: { ...source },
    },
    diagnostics: [
      ...normalizedArrows.diagnostics,
      ...validateArrowRefs(normalizedArrows.arrows, frameIndex),
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