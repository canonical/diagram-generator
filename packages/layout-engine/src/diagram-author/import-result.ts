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
  const normalized = diagnostics.map(diagnostic =>
    strict &&
    diagnostic.level === 'warning' &&
    !strictAcceptedWarnings.has(diagnostic.code)
      ? { ...diagnostic, level: 'error' as const }
      : diagnostic,
  );
  return {
    ast,
    diagnostics: normalized,
    errors: normalized.filter(diagnostic => diagnostic.level === 'error'),
    warnings: normalized.filter(diagnostic => diagnostic.level === 'warning'),
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
): Diagnostic {
  return {
    code,
    message,
    level,
    path,
    ...(line === undefined ? {} : { line }),
  };
}
