import { diagnostic, finishImport, lineSpecs, makeImportedDocument, type DiagramImportResult } from './import-result.js';
import type { AuthorArrow, AuthorFrameNode, Diagnostic } from './types.js';
import { parse as parseYaml } from 'yaml';

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

function parseNode(raw: string, line: number, state: ParseState): void {
  const normalized = stripMermaidClassSuffix(raw, line, state);
  const match = normalized.match(/^([A-Za-z_][\w-]*)\s*\[\s*(["']?)(.*?)\2\s*\]$/);
  if (!match) {
    state.diagnostics.push(diagnostic(
      'IMPORT_MERMAID_UNSUPPORTED_SYNTAX',
      `Mermaid statement is outside the supported flowchart subset: ${raw}`,
      `mermaid.line[${line}]`,
      line,
    ));
    return;
  }
  const id = match[1]!;
  const label = decodeMermaidLabel(match[3] ?? '');
  const node: AuthorFrameNode = {
    id,
    children: [],
    ...(label ? { label: lineSpecs(label) } : {}),
  };
  currentChildren(state).push(node);
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

export function importMermaid(source: string, options: MermaidImportOptions = {}): DiagramImportResult {
  const state: ParseState = { diagnostics: [], nodes: [], rawArrows: [], stack: [] };
  let direction: 'vertical' | 'horizontal' | undefined;
  const lines = source.split(/\r?\n/);
  const frontmatter = parseFrontmatter(lines, state);

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

    const edge = raw.match(/^([A-Za-z_][\w-]*)\s+-->\s*(?:\|([^|]*)\|\s*)?([A-Za-z_][\w-]*)$/);
    const alternateEdge = raw.match(/^([A-Za-z_][\w-]*)\s+--\s*(?:"([^"]*)"|'([^']*)')\s*-->\s*([A-Za-z_][\w-]*)$/);
    if (edge) {
      state.rawArrows.push({
        source: edge[1]!,
        target: edge[3]!,
        label: edge[2] ? decodeMermaidLabel(edge[2]) : undefined,
        line,
      });
      continue;
    }
    if (alternateEdge) {
      state.rawArrows.push({
        source: alternateEdge[1]!,
        target: alternateEdge[4]!,
        label: decodeMermaidLabel(alternateEdge[2] ?? alternateEdge[3] ?? ''),
        line,
      });
      continue;
    }
    if (raw.includes('-->')) {
      state.diagnostics.push(diagnostic(
        'IMPORT_MERMAID_UNSUPPORTED_EDGE',
        `Mermaid edge is outside the supported flowchart subset: ${raw}`,
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

  const metadata = {
    ...frontmatter.metadata,
    ...(direction ? { direction } : {}),
  };
  const ast = makeImportedDocument(state.nodes, [], metadata);
  const knownIds = new Set(Object.keys(ast.frameIndex));
  const arrows: AuthorArrow[] = [];
  state.rawArrows.forEach((raw, index) => {
    if (!knownIds.has(raw.source) || !knownIds.has(raw.target)) {
      state.diagnostics.push(diagnostic(
        'IMPORT_MERMAID_MISSING_FRAME_REF',
        `Mermaid edge references a node that was not imported: ${raw.source} -> ${raw.target}`,
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
  return finishImport(ast, state.diagnostics, options.strict === true);
}
