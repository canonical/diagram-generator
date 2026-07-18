import { buildFrameIndex } from './build-ast.js';
import type { AuthorArrow, AuthorFrameNode, DiagramDocument, Diagnostic } from './types.js';
import {
  maxStructuralChildNestingDepth,
  structuralLevelForMaxChildNestingDepth,
} from '../level-promotion.js';

export interface DiagramImportResult {
  ast: DiagramDocument;
  diagnostics: Diagnostic[];
  errors: Diagnostic[];
  warnings: Diagnostic[];
  summary: ImportSummary;
}

export interface ImportSummary {
  preserved: number;
  downgraded: Diagnostic[];
  blocked: Diagnostic[];
}

export interface ImportedDocumentBuild {
  ast: DiagramDocument;
  diagnostics: Diagnostic[];
}

function assignImportedSiblingLevels(siblings: AuthorFrameNode[]): void {
  if (siblings.length === 0) return;
  const maxChildNestingDepth = Math.max(
    ...siblings.map(node => maxStructuralChildNestingDepth(node)),
  );
  const level = structuralLevelForMaxChildNestingDepth(maxChildNestingDepth);
  siblings.forEach(node => {
    node.level = level;
    assignImportedSiblingLevels(node.children);
  });
}

export function makeImportedDocument(
  children: AuthorFrameNode[],
  arrows: AuthorArrow[],
  metadata: Record<string, unknown> = {},
): ImportedDocumentBuild {
  assignImportedSiblingLevels(children);
  const importedIds = new Set<string>();
  const visit = (node: AuthorFrameNode): void => {
    importedIds.add(node.id);
    node.children.forEach(visit);
  };
  children.forEach(visit);

  let rootId = 'page';
  let suffix = 1;
  while (importedIds.has(rootId)) {
    rootId = suffix === 1 ? 'page_root' : `page_root_${suffix}`;
    suffix += 1;
  }

  const root: AuthorFrameNode = {
    id: rootId,
    children,
    ...(metadata.direction === 'horizontal' || metadata.direction === 'vertical'
      ? { direction: metadata.direction }
      : {}),
    ...(['TB', 'LR', 'BT', 'RL'].includes(String(metadata.flow_direction))
      ? { flowDirection: metadata.flow_direction as NonNullable<AuthorFrameNode['flowDirection']> }
      : {}),
  };
  const indexed = buildFrameIndex(root);
  return {
    ast: {
      metadata,
      defaults: {},
      root,
      arrows,
      frameIndex: indexed.frameIndex,
      source: {
        engine: 'v3',
        title: metadata.title,
        ...(typeof metadata.layout_engine === 'string'
          ? { meta: { layout_engine: metadata.layout_engine } }
          : {}),
      },
    },
    diagnostics: indexed.diagnostics,
  };
}

export function finishImport(
  ast: DiagramDocument,
  diagnostics: Diagnostic[],
  strict: boolean,
  strictAcceptedWarnings: ReadonlySet<string> = new Set(),
): DiagramImportResult {
  const blockingCategories = new Set<Diagnostic['category']>([
    'structural',
    'invalid',
    'type',
  ]);
  const normalized = diagnostics.map(diagnostic =>
    (blockingCategories.has(diagnostic.category) ||
    (strict &&
    diagnostic.level === 'warning' &&
    !strictAcceptedWarnings.has(diagnostic.code)))
      ? { ...diagnostic, level: 'error' as const }
      : diagnostic,
  );
  const errors = normalized.filter(diagnostic => diagnostic.level === 'error');
  const warnings = normalized.filter(diagnostic => diagnostic.level === 'warning');
  const rootId = ast.root?.id;
  const preservedFrames = Object.keys(ast.frameIndex)
    .filter(id => id !== rootId)
    .length;
  return {
    ast,
    diagnostics: normalized,
    errors,
    warnings,
    summary: {
      preserved: preservedFrames + ast.arrows.length,
      downgraded: warnings,
      blocked: errors,
    },
  };
}

export function lineSpecs(text: string): { text: string }[] {
  return text.split('\n').map(line => ({ text: line }));
}

export function diagnostic(
  code: string,
  message: string,
  path: string,
  line?: number,
  level: Diagnostic['level'] = 'warning',
  category: NonNullable<Diagnostic['category']> = 'visual',
): Diagnostic {
  return {
    code,
    message,
    level,
    category,
    path,
    ...(line === undefined ? {} : { line }),
  };
}
