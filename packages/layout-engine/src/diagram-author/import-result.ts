import { buildFrameIndex } from './build-ast.js';
import type { AuthorArrow, AuthorFrameNode, DiagramDocument, Diagnostic } from './types.js';

export interface DiagramImportResult {
  ast: DiagramDocument;
  diagnostics: Diagnostic[];
  errors: Diagnostic[];
  warnings: Diagnostic[];
}

export function makeImportedDocument(
  children: AuthorFrameNode[],
  arrows: AuthorArrow[],
  metadata: Record<string, unknown> = {},
): DiagramDocument {
  const root: AuthorFrameNode = {
    id: 'page',
    children,
    ...(metadata.direction === 'horizontal' || metadata.direction === 'vertical'
      ? { direction: metadata.direction }
      : {}),
  };
  const indexed = buildFrameIndex(root);
  return {
    metadata,
    defaults: {},
    root,
    arrows,
    frameIndex: indexed.frameIndex,
    source: {
      engine: 'v3',
      title: metadata.title,
    },
  };
}

export function finishImport(
  ast: DiagramDocument,
  diagnostics: Diagnostic[],
  strict: boolean,
): DiagramImportResult {
  const normalized = diagnostics.map(diagnostic =>
    strict && diagnostic.level === 'warning'
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
): Diagnostic {
  return {
    code,
    message,
    level: 'warning',
    path,
    ...(line === undefined ? {} : { line }),
  };
}
