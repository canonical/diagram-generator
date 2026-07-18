import { parse as parseYaml } from 'yaml';

import type {
  IrContainer,
  IrEdge,
  IrFlowchart,
  IrNode,
  MermaidFlowDirection,
  MermaidNodeShape,
} from './flowchart-ir.js';
import {
  MermaidTokenizeError,
  tokenizeMermaidFlowchart,
  type MermaidToken,
  type MermaidTokenizeOptions,
} from './tokenize.js';

export interface MermaidParseIssue {
  readonly code: string;
  readonly message: string;
  readonly category: 'structural' | 'visual' | 'type' | 'invalid';
  readonly line: number;
}

export interface MermaidFlowchartParseResult {
  readonly flowchart: IrFlowchart | null;
  readonly issues: MermaidParseIssue[];
}

interface Statement {
  readonly tokens: readonly MermaidToken[];
  readonly raw: string;
  readonly line: number;
}

interface ParsedEndpoint {
  readonly node: IrNode;
  readonly next: number;
}

const OPEN_TO_CLOSE: Readonly<Record<string, string>> = {
  '((': '))',
  '([': '])',
  '[[': ']]',
  '[(': ')]',
  '{{': '}}',
  '[': ']',
  '(': ')',
  '{': '}',
  '>': ']',
};

const SHAPE_FOR_OPEN: Readonly<Record<string, MermaidNodeShape>> = {
  '((': 'circle',
  '([': 'stadium',
  '[[': 'subroutine',
  '[(': 'cylinder',
  '{{': 'hexagon',
  '[': 'rectangle',
  '(': 'round',
  '{': 'diamond',
  '>': 'flag',
};

function decodeLabel(value: string): string {
  const trimmed = value.trim();
  const unquoted = trimmed.length >= 2
    && ((trimmed.startsWith('"') && trimmed.endsWith('"'))
      || (trimmed.startsWith("'") && trimmed.endsWith("'")))
    ? trimmed.slice(1, -1)
    : trimmed;
  return unquoted
    .replace(/^`([\s\S]*)`$/, '$1')
    .replace(/#quot;/g, '"')
    .replace(/<br\s*\/?>/gi, '\n')
    .trim();
}

function isDirection(value: string | undefined): value is MermaidFlowDirection {
  return ['TB', 'TD', 'LR', 'RL', 'BT'].includes(value?.toUpperCase() ?? '');
}

function splitStatements(source: string, tokens: readonly MermaidToken[]): Statement[] {
  const statements: Statement[] = [];
  let current: MermaidToken[] = [];
  let depth = 0;
  const flush = (): void => {
    if (current.length === 0) return;
    const start = current[0]!.start;
    const end = current[current.length - 1]!.end;
    statements.push({
      tokens: current,
      raw: source.slice(start, end).trim(),
      line: current[0]!.line,
    });
    current = [];
  };

  for (const token of tokens) {
    if (token.kind === 'eof') break;
    if (token.kind === 'frontmatter') {
      flush();
      statements.push({ tokens: [token], raw: token.raw, line: token.line });
      continue;
    }
    if (token.kind === 'delimiter') {
      if (OPEN_TO_CLOSE[token.value]) depth += 1;
      else depth = Math.max(0, depth - 1);
    }
    if ((token.kind === 'newline' || token.kind === 'semicolon') && depth === 0) {
      flush();
      continue;
    }
    current.push(token);
  }
  flush();
  return statements;
}

function parseFrontmatterTitle(raw: string): string | undefined {
  const lines = raw.split(/\r?\n/);
  const closing = lines.findIndex((line, index) =>
    index > 0 && ['---', '...'].includes(line.trim()));
  const body = lines.slice(1, closing < 0 ? undefined : closing).join('\n');
  const parsed = parseYaml(body) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
  const title = (parsed as Record<string, unknown>).title;
  return typeof title === 'string' && title.trim().length > 0 ? title.trim() : undefined;
}

function endpointLabel(
  source: string,
  open: MermaidToken,
  close: MermaidToken,
): { label: string; markdown: boolean } {
  const raw = source.slice(open.end, close.start).trim();
  const decoded = decodeLabel(raw);
  return {
    label: decoded,
    markdown: /^["']?`/.test(raw),
  };
}

function parseEndpoint(
  source: string,
  tokens: readonly MermaidToken[],
  start: number,
  containerPath: readonly string[],
  explicit: boolean,
): ParsedEndpoint | null {
  const idToken = tokens[start];
  if (!idToken || !['identifier', 'keyword'].includes(idToken.kind)) return null;
  const id = idToken.value;
  let cursor = start + 1;
  let label: string | undefined;
  let shape: MermaidNodeShape | undefined;
  let markdown = false;

  const open = tokens[cursor];
  if (open?.kind === 'delimiter' && OPEN_TO_CLOSE[open.value]) {
    const expectedClose = OPEN_TO_CLOSE[open.value]!;
    let depth = 1;
    let closeIndex = cursor + 1;
    for (; closeIndex < tokens.length; closeIndex += 1) {
      const candidate = tokens[closeIndex]!;
      if (candidate.kind !== 'delimiter') continue;
      if (candidate.value === open.value) depth += 1;
      if (candidate.value === expectedClose) {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    const close = tokens[closeIndex];
    if (!close || close.kind !== 'delimiter' || close.value !== expectedClose) return null;
    ({ label, markdown } = endpointLabel(source, open, close));
    shape = SHAPE_FOR_OPEN[open.value];
    cursor = closeIndex + 1;
  } else if (
    tokens[cursor]?.kind === 'text'
    && tokens[cursor]?.value === '@'
    && tokens[cursor + 1]?.kind === 'delimiter'
    && tokens[cursor + 1]?.value === '{'
  ) {
    const closeIndex = tokens.findIndex((token, index) =>
      index > cursor + 1 && token.kind === 'delimiter' && token.value === '}');
    if (closeIndex < 0) return null;
    shape = 'attribute';
    label = id;
    cursor = closeIndex + 1;
  }

  const classes: string[] = [];
  while (tokens[cursor]?.kind === 'class') {
    classes.push(tokens[cursor]!.value);
    cursor += 1;
  }

  return {
    node: {
      id,
      ...(label !== undefined ? { label } : {}),
      ...(shape ? { shape } : {}),
      classes,
      containerPath: [...containerPath],
      explicit: explicit || label !== undefined || shape !== undefined || classes.length > 0,
      ...(markdown ? { markdown: true } : {}),
      line: idToken.line,
    },
    next: cursor,
  };
}

function parseEndpointGroup(
  source: string,
  tokens: readonly MermaidToken[],
  start: number,
  containerPath: readonly string[],
): { endpoints: IrNode[]; next: number } | null {
  const endpoints: IrNode[] = [];
  let cursor = start;
  while (cursor < tokens.length) {
    const endpoint = parseEndpoint(source, tokens, cursor, containerPath, false);
    if (!endpoint) return null;
    endpoints.push(endpoint.node);
    cursor = endpoint.next;
    if (tokens[cursor]?.kind !== 'ampersand') break;
    cursor += 1;
  }
  return endpoints.length > 0 ? { endpoints, next: cursor } : null;
}

function connectorValue(token: MermaidToken | undefined): IrEdge['connector'] | null {
  if (!token || token.kind !== 'connector') return null;
  return ['-->', '<-->', '---', '==>', '-.->'].includes(token.value)
    ? token.value as IrEdge['connector']
    : null;
}

function parsePipeLabel(
  source: string,
  tokens: readonly MermaidToken[],
  start: number,
): { label?: string; next: number } {
  if (tokens[start]?.kind !== 'pipe') return { next: start };
  const closing = tokens.findIndex((token, index) => index > start && token.kind === 'pipe');
  if (closing < 0) return { next: start };
  const label = source.slice(tokens[start]!.end, tokens[closing]!.start);
  return { label: decodeLabel(label), next: closing + 1 };
}

function parseEdgeStatement(
  source: string,
  statement: Statement,
  containerPath: readonly string[],
): { nodes: IrNode[]; edges: IrEdge[] } | null {
  let group = parseEndpointGroup(source, statement.tokens, 0, containerPath);
  if (!group) return null;
  const nodes = [...group.endpoints];
  const edges: IrEdge[] = [];
  let sources = group.endpoints;
  let cursor = group.next;

  while (cursor < statement.tokens.length) {
    let connector = connectorValue(statement.tokens[cursor]);
    let label: string | undefined;
    if (
      statement.tokens[cursor]?.kind === 'connector'
      && statement.tokens[cursor]?.value === '--'
      && statement.tokens[cursor + 1]?.kind === 'string'
      && connectorValue(statement.tokens[cursor + 2]) === '-->'
    ) {
      connector = '-->';
      label = decodeLabel(statement.tokens[cursor + 1]!.value);
      cursor += 3;
    } else {
      if (!connector) return null;
      cursor += 1;
      const labelled = parsePipeLabel(source, statement.tokens, cursor);
      label = labelled.label;
      cursor = labelled.next;
    }

    group = parseEndpointGroup(source, statement.tokens, cursor, containerPath);
    if (!group) return null;
    nodes.push(...group.endpoints);
    for (const sourceNode of sources) {
      for (const targetNode of group.endpoints) {
        edges.push({
          source: sourceNode.id,
          target: targetNode.id,
          ...(label ? { label } : {}),
          connector,
          line: statement.line,
        });
      }
    }
    sources = group.endpoints;
    cursor = group.next;
  }
  return edges.length > 0 ? { nodes, edges } : null;
}

export function parseMermaidFlowchart(
  source: string,
  tokenizeOptions: MermaidTokenizeOptions = {},
): MermaidFlowchartParseResult {
  let tokenized;
  try {
    tokenized = tokenizeMermaidFlowchart(source, tokenizeOptions);
  } catch (error) {
    if (error instanceof MermaidTokenizeError) {
      return {
        flowchart: null,
        issues: [{
          code: error.code,
          message: error.message,
          category: 'invalid',
          line: error.line,
        }],
      };
    }
    throw error;
  }

  const statements = splitStatements(source, tokenized.tokens);
  const issues: MermaidParseIssue[] = [];
  let title: string | undefined;
  let direction: MermaidFlowDirection | undefined;
  const nodes: IrNode[] = [];
  const edges: IrEdge[] = [];
  const roots: IrContainer[] = [];
  const containers: IrContainer[] = [];
  const unsupported: IrFlowchart['unsupported'] = [];
  let sawHeader = false;

  for (const statement of statements) {
    if (statement.tokens[0]?.kind === 'frontmatter') {
      try {
        title = parseFrontmatterTitle(statement.raw);
      } catch (error) {
        issues.push({
          code: 'IMPORT_MERMAID_UNSUPPORTED_FRONTMATTER',
          message: `Mermaid YAML frontmatter could not be parsed: ${String(error)}`,
          category: 'invalid',
          line: statement.line,
        });
      }
      continue;
    }
    const first = statement.tokens[0];
    if (!first) continue;
    const keyword = first.value.toLowerCase();

    if (!sawHeader) {
      if (!['flowchart', 'graph'].includes(keyword)) {
        issues.push({
          code: 'IMPORT_MERMAID_UNSUPPORTED_DIAGRAM_TYPE',
          message: `Mermaid '${first.value}' is not supported. Detected diagram type: ${first.value}.`,
          category: 'type',
          line: statement.line,
        });
        return { flowchart: null, issues };
      }
      const directionToken = statement.tokens[1]?.value.toUpperCase();
      if (!isDirection(directionToken) || statement.tokens.length !== 2) {
        issues.push({
          code: 'IMPORT_MERMAID_UNSUPPORTED_DIRECTION',
          message: `Mermaid direction is outside the supported flowchart subset: ${statement.raw}`,
          category: 'structural',
          line: statement.line,
        });
        return { flowchart: null, issues };
      }
      direction = directionToken;
      sawHeader = true;
      continue;
    }

    if (keyword === 'subgraph') {
      const endpoint = parseEndpoint(
        source,
        statement.tokens,
        1,
        containers.map(container => container.id),
        true,
      );
      if (!endpoint || endpoint.next !== statement.tokens.length) {
        issues.push({
          code: 'IMPORT_MERMAID_UNSUPPORTED_SUBGRAPH',
          message: `Mermaid subgraph declaration could not be imported: ${statement.raw}`,
          category: 'structural',
          line: statement.line,
        });
        continue;
      }
      const container: IrContainer = {
        id: endpoint.node.id,
        ...(endpoint.node.label ? { heading: endpoint.node.label } : {}),
        classes: endpoint.node.classes,
        line: statement.line,
        children: [],
      };
      if (containers.length > 0) containers[containers.length - 1]!.children.push(container);
      else roots.push(container);
      containers.push(container);
      continue;
    }
    if (keyword === 'end' && statement.tokens.length === 1) {
      if (containers.length === 0) {
        issues.push({
          code: 'IMPORT_MERMAID_UNSUPPORTED_SYNTAX',
          message: 'Mermaid `end` has no open subgraph.',
          category: 'structural',
          line: statement.line,
        });
      } else {
        containers.pop();
      }
      continue;
    }
    if (keyword === 'direction') {
      const localDirection = statement.tokens[1]?.value.toUpperCase();
      if (!isDirection(localDirection) || statement.tokens.length !== 2 || containers.length === 0) {
        issues.push({
          code: 'IMPORT_MERMAID_UNSUPPORTED_DIRECTION',
          message: `Mermaid direction could not be applied: ${statement.raw}`,
          category: 'structural',
          line: statement.line,
        });
      } else {
        containers[containers.length - 1]!.direction = localDirection;
      }
      continue;
    }
    if (['classdef', 'class', 'style', 'linkstyle', 'click'].includes(keyword)) {
      unsupported.push({ raw: statement.raw, line: statement.line, kind: 'style' });
      continue;
    }
    if (statement.raw.includes('@')) {
      unsupported.push({ raw: statement.raw, line: statement.line, kind: 'edge-id' });
      continue;
    }

    const containerPath = containers.map(container => container.id);
    const parsedEdge = parseEdgeStatement(source, statement, containerPath);
    if (parsedEdge) {
      nodes.push(...parsedEdge.nodes);
      edges.push(...parsedEdge.edges);
      continue;
    }
    const node = parseEndpoint(source, statement.tokens, 0, containerPath, true);
    if (node && node.next === statement.tokens.length) {
      nodes.push(node.node);
      continue;
    }
    unsupported.push({ raw: statement.raw, line: statement.line, kind: 'syntax' });
  }

  if (!sawHeader || !direction) {
    issues.push({
      code: 'IMPORT_MERMAID_UNSUPPORTED_DIAGRAM_TYPE',
      message: 'Mermaid source does not contain a flowchart/graph header.',
      category: 'type',
      line: 1,
    });
    return { flowchart: null, issues };
  }
  if (containers.length > 0) {
    issues.push({
      code: 'IMPORT_MERMAID_UNSUPPORTED_SUBGRAPH',
      message: 'Mermaid source ended before all subgraphs were closed.',
      category: 'structural',
      line: containers[containers.length - 1]!.line,
    });
  }

  return {
    flowchart: {
      direction,
      ...(title ? { title } : {}),
      nodes,
      roots,
      edges,
      unsupported,
    },
    issues,
  };
}
