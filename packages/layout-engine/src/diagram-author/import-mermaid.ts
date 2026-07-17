import { parse as parseYaml } from 'yaml';

import { diagnostic, finishImport, lineSpecs, makeImportedDocument, type DiagramImportResult } from './import-result.js';
import type { AuthorArrow, AuthorFrameNode, Diagnostic } from './types.js';

export interface MermaidImportOptions {
  strict?: boolean;
}

interface RawArrow {
  source: string;
  target: string;
  label?: string;
  line: number;
}

interface ParseState {
  diagnostics: Diagnostic[];
  nodes: AuthorFrameNode[];
  rawArrows: RawArrow[];
  stack: AuthorFrameNode[];
}

interface ParsedNodeDeclaration {
  id: string;
  label: string;
  shape?: string;
}

const STRICT_ACCEPTED_WARNING_CODES = new Set([
  'IMPORT_MERMAID_UNSUPPORTED_EDGE_DIRECTION',
  'IMPORT_MERMAID_UNSUPPORTED_EDGE_STYLE',
  'IMPORT_MERMAID_UNSUPPORTED_SHAPE',
  'IMPORT_MERMAID_UNSUPPORTED_STYLE',
]);

function decodeMermaidLabel(value: string): string {
  const trimmed = value.trim();
  const unquoted = trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
    ? trimmed.slice(1, -1)
    : trimmed;
  return unquoted
    .replace(/#quot;/g, '"')
    .replace(/<br\s*\/?>/gi, '\n')
    .trim();
}

function stripMermaidClassSuffix(raw: string, line: number, state: ParseState): string {
  const suffix = raw.match(/(?::{3}[A-Za-z_][\w-]*)+\s*$/);
  if (!suffix || suffix.index === undefined) return raw;
  state.diagnostics.push(diagnostic(
    'IMPORT_MERMAID_UNSUPPORTED_STYLE',
    `Mermaid class styling was ignored: ${suffix[0].trim()}`,
    `mermaid.line[${line}]`,
    line,
  ));
  return raw.slice(0, suffix.index).trimEnd();
}

function parseFrontmatter(
  lines: string[],
  state: ParseState,
): { next: number; metadata: Record<string, unknown> } {
  if (lines[0]?.trim() !== '---') return { next: 0, metadata: {} };
  const closing = lines.findIndex((line, index) => index > 0 && ['---', '...'].includes(line.trim()));
  if (closing < 0) {
    state.diagnostics.push(diagnostic(
      'IMPORT_MERMAID_UNSUPPORTED_FRONTMATTER',
      'Mermaid YAML frontmatter was not closed.',
      'mermaid.line[1]',
      1,
    ));
    return { next: lines.length, metadata: {} };
  }

  try {
    const parsed = parseYaml(lines.slice(1, closing).join('\n')) as unknown;
    const metadata: Record<string, unknown> = {};
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const title = (parsed as Record<string, unknown>).title;
      if (typeof title === 'string' && title.length > 0) metadata.title = title;
    }
    return { next: closing + 1, metadata };
  } catch (error) {
    state.diagnostics.push(diagnostic(
      'IMPORT_MERMAID_UNSUPPORTED_FRONTMATTER',
      `Mermaid YAML frontmatter could not be parsed: ${String(error)}`,
      'mermaid.frontmatter',
    ));
    return { next: closing + 1, metadata: {} };
  }
}

function currentChildren(state: ParseState): AuthorFrameNode[] {
  return state.stack.length > 0
    ? state.stack[state.stack.length - 1]!.children
    : state.nodes;
}

function parseNodeDeclaration(raw: string): ParsedNodeDeclaration | undefined {
  const bare = raw.match(/^([A-Za-z_][\w-]*)$/);
  if (bare) return { id: bare[1]!, label: bare[1]! };

  const declaration = raw.match(/^([A-Za-z_][\w-]*)\s*(.+)$/);
  if (!declaration) return undefined;
  const id = declaration[1]!;
  const body = declaration[2]!.trim();
  const patterns: { shape?: string; pattern: RegExp }[] = [
    { shape: 'circle', pattern: /^\(\(\s*(.*?)\s*\)\)$/ },
    { shape: 'stadium', pattern: /^\(\[\s*(.*?)\s*\]\)$/ },
    { shape: 'subroutine', pattern: /^\[\[\s*(.*?)\s*\]\]$/ },
    { shape: 'cylinder', pattern: /^\[\(\s*(.*?)\s*\)\]$/ },
    { shape: 'hexagon', pattern: /^\{\{\s*(.*?)\s*\}\}$/ },
    { shape: 'diamond', pattern: /^\{\s*(.*?)\s*\}$/ },
    { shape: 'flag', pattern: /^>\s*(.*?)\s*\]$/ },
    { shape: 'round', pattern: /^\(\s*(.*?)\s*\)$/ },
    { pattern: /^\[\s*(.*?)\s*\]$/ },
  ];

  for (const candidate of patterns) {
    const match = body.match(candidate.pattern);
    if (match) {
      return {
        id,
        label: decodeMermaidLabel(match[1] ?? ''),
        ...(candidate.shape ? { shape: candidate.shape } : {}),
      };
    }
  }
  return undefined;
}

function parseNode(raw: string, line: number, state: ParseState): void {
  const normalized = stripMermaidClassSuffix(raw, line, state);
  const parsed = parseNodeDeclaration(normalized);
  if (!parsed) {
    state.diagnostics.push(diagnostic(
      'IMPORT_MERMAID_UNSUPPORTED_SYNTAX',
      `Mermaid statement is outside the supported flowchart subset: ${raw}`,
      `mermaid.line[${line}]`,
      line,
    ));
    return;
  }

  if (parsed.shape) {
    state.diagnostics.push(diagnostic(
      'IMPORT_MERMAID_UNSUPPORTED_SHAPE',
      `Mermaid ${parsed.shape} node '${parsed.id}' was imported as a rectangular frame.`,
      `mermaid.line[${line}]`,
      line,
    ));
  }
  currentChildren(state).push({
    id: parsed.id,
    children: [],
    ...(parsed.label ? { label: lineSpecs(parsed.label) } : {}),
  });
}

function parseSubgraph(raw: string, line: number, state: ParseState): void {
  const normalized = stripMermaidClassSuffix(raw, line, state);
  const match = normalized.match(/^subgraph\s+([A-Za-z_][\w-]*)(?:\s*\[(.*)\])?$/);
  if (!match) {
    state.diagnostics.push(diagnostic(
      'IMPORT_MERMAID_UNSUPPORTED_SUBGRAPH',
      `Mermaid subgraph declaration could not be imported: ${raw}`,
      `mermaid.line[${line}]`,
      line,
    ));
    return;
  }
  const label = match[2] ? decodeMermaidLabel(match[2]) : undefined;
  const node: AuthorFrameNode = {
    id: match[1]!,
    children: [],
    ...(label ? { heading: { text: label } } : {}),
  };
  currentChildren(state).push(node);
  state.stack.push(node);
}

function parseEdgeChain(raw: string, line: number, state: ParseState): boolean {
  const start = raw.match(/^([A-Za-z_][\w-]*)/);
  if (!start) return false;

  let source = start[1]!;
  let remainder = raw.slice(start[0].length);
  const segments: { connector: string; source: string; target: string; label?: string }[] = [];

  while (remainder.trim().length > 0) {
    const labelled = remainder.match(/^\s*--\s*(?:"([^"]*)"|'([^']*)')\s*-->\s*([A-Za-z_][\w-]*)/);
    if (labelled) {
      const target = labelled[3]!;
      segments.push({
        connector: '-->',
        source,
        target,
        label: decodeMermaidLabel(labelled[1] ?? labelled[2] ?? ''),
      });
      source = target;
      remainder = remainder.slice(labelled[0].length);
      continue;
    }

    const standard = remainder.match(/^\s*(<-->|-->|==>|-\.->|---)\s*(?:\|([^|]*)\|\s*)?([A-Za-z_][\w-]*)/);
    if (!standard) return false;
    const target = standard[3]!;
    segments.push({
      connector: standard[1]!,
      source,
      target,
      ...(standard[2] ? { label: decodeMermaidLabel(standard[2]) } : {}),
    });
    source = target;
    remainder = remainder.slice(standard[0].length);
  }

  if (segments.length === 0) return false;
  segments.forEach(segment => {
    state.rawArrows.push({
      source: segment.source,
      target: segment.target,
      ...(segment.label ? { label: segment.label } : {}),
      line,
    });
    if (segment.connector === '<-->') {
      state.diagnostics.push(diagnostic(
        'IMPORT_MERMAID_UNSUPPORTED_EDGE_DIRECTION',
        `Mermaid bidirectional edge ${segment.source} <--> ${segment.target} was imported as ${segment.source} -> ${segment.target}.`,
        `mermaid.line[${line}]`,
        line,
      ));
    } else if (segment.connector !== '-->') {
      state.diagnostics.push(diagnostic(
        'IMPORT_MERMAID_UNSUPPORTED_EDGE_STYLE',
        `Mermaid '${segment.connector}' edge ${segment.source} -> ${segment.target} was imported as a standard directed arrow.`,
        `mermaid.line[${line}]`,
        line,
      ));
    }
  });
  return true;
}

function collectNodeIds(nodes: AuthorFrameNode[]): Set<string> {
  const ids = new Set<string>();
  const visit = (node: AuthorFrameNode): void => {
    ids.add(node.id);
    node.children.forEach(visit);
  };
  nodes.forEach(visit);
  return ids;
}

function unsupportedDiagramTypeResult(
  state: ParseState,
  metadata: Record<string, unknown>,
  token: string,
  line: number,
  strict: boolean,
): DiagramImportResult {
  state.diagnostics.push(diagnostic(
    'IMPORT_MERMAID_UNSUPPORTED_DIAGRAM_TYPE',
    `Mermaid '${token}' is not supported. The diagram generator can only import Mermaid flowcharts (flowchart/graph). Detected diagram type: ${token}.`,
    `mermaid.line[${line}]`,
    line,
    'error',
  ));
  const imported = makeImportedDocument([], [], metadata);
  state.diagnostics.push(...imported.diagnostics);
  return finishImport(imported.ast, state.diagnostics, strict, STRICT_ACCEPTED_WARNING_CODES);
}

export function importMermaid(source: string, options: MermaidImportOptions = {}): DiagramImportResult {
  const state: ParseState = { diagnostics: [], nodes: [], rawArrows: [], stack: [] };
  let direction: 'vertical' | 'horizontal' | undefined;
  const lines = source.split(/\r?\n/);
  const frontmatter = parseFrontmatter(lines, state);
  const firstStatementIndex = lines.findIndex((value, index) =>
    index >= frontmatter.next &&
    value.trim().length > 0 &&
    !value.trim().startsWith('%%'));

  if (firstStatementIndex >= 0) {
    const firstStatement = lines[firstStatementIndex]!.trim();
    const typeToken = firstStatement.match(/^(\S+)/)?.[1] ?? firstStatement;
    if (!/^(flowchart|graph)\b/i.test(firstStatement)) {
      return unsupportedDiagramTypeResult(
        state,
        frontmatter.metadata,
        typeToken,
        firstStatementIndex + 1,
        options.strict === true,
      );
    }
  }

  for (let index = frontmatter.next; index < lines.length; index += 1) {
    const lineValue = lines[index] ?? '';
    const line = index + 1;
    const raw = lineValue.trim();
    if (!raw || raw.startsWith('%%')) continue;
    const header = raw.match(/^(flowchart|graph)\s+(TB|TD|LR|RL|BT)\s*$/i);
    if (header) {
      const token = header[2]!.toUpperCase();
      direction = token === 'LR' || token === 'RL' ? 'horizontal' : 'vertical';
      continue;
    }
    if (/^(flowchart|graph)\b/i.test(raw)) {
      state.diagnostics.push(diagnostic(
        'IMPORT_MERMAID_UNSUPPORTED_DIRECTION',
        `Mermaid direction is outside the supported flowchart subset: ${raw}`,
        `mermaid.line[${line}]`,
        line,
      ));
      continue;
    }
    if (raw === 'end') {
      if (state.stack.length === 0) {
        state.diagnostics.push(diagnostic(
          'IMPORT_MERMAID_UNSUPPORTED_SYNTAX',
          'Mermaid `end` has no open subgraph.',
          `mermaid.line[${line}]`,
          line,
        ));
      } else {
        state.stack.pop();
      }
      continue;
    }
    if (/^(classDef|class|style|click|linkStyle)(?:\s|$)/.test(raw)) {
      state.diagnostics.push(diagnostic(
        'IMPORT_MERMAID_UNSUPPORTED_STYLE',
        `Mermaid styling/interaction statement was ignored: ${raw}`,
        `mermaid.line[${line}]`,
        line,
      ));
      continue;
    }
    if (raw.startsWith('subgraph ')) {
      parseSubgraph(raw, line, state);
      continue;
    }
    if (parseEdgeChain(raw, line, state)) continue;
    if (/(?:<-->|-->|==>|-\.->|---)/.test(raw)) {
      state.diagnostics.push(diagnostic(
        'IMPORT_MERMAID_UNSUPPORTED_EDGE',
        `Mermaid edge could not be imported: ${raw}`,
        `mermaid.line[${line}]`,
        line,
      ));
      continue;
    }
    parseNode(raw, line, state);
  }

  if (state.stack.length > 0) {
    state.diagnostics.push(diagnostic(
      'IMPORT_MERMAID_UNSUPPORTED_SUBGRAPH',
      'Mermaid source ended before all subgraphs were closed.',
      'document',
    ));
  }

  const declaredIds = collectNodeIds(state.nodes);
  state.rawArrows.forEach(raw => {
    for (const id of [raw.source, raw.target]) {
      if (declaredIds.has(id)) continue;
      state.nodes.push({ id, label: lineSpecs(id), children: [] });
      declaredIds.add(id);
    }
  });

  const metadata = {
    ...frontmatter.metadata,
    ...(direction ? { direction } : {}),
  };
  const imported = makeImportedDocument(state.nodes, [], metadata);
  const ast = imported.ast;
  state.diagnostics.push(...imported.diagnostics);
  const knownIds = new Set(Object.keys(ast.frameIndex));
  const arrows: AuthorArrow[] = [];
  state.rawArrows.forEach((raw, index) => {
    if (!knownIds.has(raw.source) || !knownIds.has(raw.target)) {
      state.diagnostics.push(diagnostic(
        'IMPORT_MERMAID_MISSING_FRAME_REF',
        `Mermaid edge endpoint could not be created: ${raw.source} -> ${raw.target}`,
        `arrows[${index}]`,
        raw.line,
      ));
      return;
    }
    arrows.push({
      source: raw.source,
      target: raw.target,
      kind: 'directed',
      ...(raw.label ? { label: lineSpecs(raw.label) } : {}),
    });
  });
  ast.arrows = arrows;
  return finishImport(
    ast,
    state.diagnostics,
    options.strict === true,
    STRICT_ACCEPTED_WARNING_CODES,
  );
}
