import {
  diagnostic,
  finishImport,
  makeImportedDocument,
  type DiagramImportResult,
} from './import-result.js';
import type { Diagnostic } from './types.js';
import { lowerMermaidFlowchart } from './mermaid/lower-flowchart.js';
import {
  parseMermaidFlowchart,
  type MermaidParseIssue,
} from './mermaid/parse-flowchart.js';
import { selectImportEngine } from './select-import-engine.js';

export const MERMAID_DIAGNOSTIC_CATEGORIES = {
  IMPORT_MERMAID_UNSUPPORTED_EDGE: 'structural',
  IMPORT_MERMAID_UNSUPPORTED_SYNTAX: 'structural',
  IMPORT_MERMAID_UNSUPPORTED_DIRECTION: 'structural',
  IMPORT_MERMAID_UNSUPPORTED_SUBGRAPH: 'structural',
  IMPORT_MERMAID_MISSING_FRAME_REF: 'structural',
  IMPORT_MERMAID_UNSUPPORTED_SHAPE: 'visual',
  IMPORT_MERMAID_UNSUPPORTED_STYLE: 'visual',
  IMPORT_MERMAID_UNSUPPORTED_EDGE_STYLE: 'visual',
  IMPORT_MERMAID_UNSUPPORTED_EDGE_DIRECTION: 'visual',
  IMPORT_MERMAID_UNSUPPORTED_EDGE_DECORATION: 'visual',
  IMPORT_MERMAID_CONFLICTING_NODE_LABEL: 'visual',
  IMPORT_MERMAID_UNSUPPORTED_DIAGRAM_TYPE: 'type',
  IMPORT_MERMAID_UNSUPPORTED_FRONTMATTER: 'invalid',
  IMPORT_MERMAID_SOURCE_TOO_LARGE: 'invalid',
  IMPORT_MERMAID_TOO_MANY_TOKENS: 'invalid',
  IMPORT_MERMAID_NESTING_TOO_DEEP: 'invalid',
  IMPORT_MERMAID_UNTERMINATED_STRING: 'invalid',
  IMPORT_MERMAID_TOO_MANY_LINES: 'invalid',
  IMPORT_MERMAID_TOO_MANY_NODES: 'invalid',
  IMPORT_MERMAID_TOO_MANY_EDGES: 'invalid',
} as const satisfies Record<string, NonNullable<Diagnostic['category']>>;

export interface MermaidImportOptions {
  strict?: boolean;
}

const STRICT_ACCEPTED_WARNING_CODES = new Set([
  'IMPORT_MERMAID_UNSUPPORTED_EDGE_DIRECTION',
  'IMPORT_MERMAID_UNSUPPORTED_EDGE_DECORATION',
  'IMPORT_MERMAID_UNSUPPORTED_EDGE_STYLE',
  'IMPORT_MERMAID_CONFLICTING_NODE_LABEL',
  'IMPORT_MERMAID_UNSUPPORTED_SHAPE',
  'IMPORT_MERMAID_UNSUPPORTED_STYLE',
]);

function parseIssueDiagnostic(issue: MermaidParseIssue): Diagnostic {
  return diagnostic(
    issue.code,
    issue.message,
    `mermaid.line[${issue.line}]`,
    issue.line,
    issue.category === 'visual' ? 'warning' : 'error',
    issue.category,
  );
}

export function importMermaid(
  source: string,
  options: MermaidImportOptions = {},
): DiagramImportResult {
  const parsed = parseMermaidFlowchart(source);
  const diagnostics = parsed.issues.map(parseIssueDiagnostic);
  if (!parsed.flowchart) {
    const imported = makeImportedDocument([], []);
    diagnostics.push(...imported.diagnostics);
    return finishImport(
      imported.ast,
      diagnostics,
      options.strict === true,
      STRICT_ACCEPTED_WARNING_CODES,
    );
  }

  const lowered = lowerMermaidFlowchart(parsed.flowchart);
  diagnostics.push(...lowered.diagnostics);
  const imported = makeImportedDocument(
    lowered.nodes,
    lowered.arrows,
    lowered.metadata,
  );
  diagnostics.push(...imported.diagnostics);
  const selection = selectImportEngine(imported.ast);
  diagnostics.push(...selection.diagnostics);
  if (selection.engineId) {
    imported.ast.metadata.layout_engine = selection.engineId;
    imported.ast.source.meta = { layout_engine: selection.engineId };
  }
  return finishImport(
    imported.ast,
    diagnostics,
    options.strict === true,
    STRICT_ACCEPTED_WARNING_CODES,
  );
}
