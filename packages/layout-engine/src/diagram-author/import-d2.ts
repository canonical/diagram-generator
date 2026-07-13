import { diagnostic, finishImport, lineSpecs, makeImportedDocument, type DiagramImportResult } from './import-result.js';
import type { AuthorArrow, AuthorFrameNode, Diagnostic } from './types.js';

export interface D2ImportOptions {
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
  rawArrows: RawArrow[];
  line: number;
}

function decodeQuoted(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    const body = trimmed.slice(1, -1);
    return body.replace(/\\([\\"nrt])/g, (_match, escaped: string) => {
      if (escaped === 'n') return '\n';
      if (escaped === 'r') return '\r';
      if (escaped === 't') return '\t';
      return escaped;
    });
  }
  return trimmed;
}

function splitD2Label(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? decodeQuoted(trimmed) : undefined;
}

function skipBlock(lines: string[], start: number): number {
  let depth = 0;
  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    depth += (line.match(/\{/g) ?? []).length;
    depth -= (line.match(/\}/g) ?? []).length;
    if (depth <= 0 && index > start) return index + 1;
  }
  return lines.length;
}

function unsupportedBlock(
  lines: string[],
  state: ParseState,
  code: string,
  message: string,
  index: number,
): number {
  state.diagnostics.push(diagnostic(code, message, `d2.line[${index + 1}]`, index + 1));
  return lines[index]?.includes('{') ? skipBlock(lines, index) : index + 1;
}

function parseShapeHeader(
  raw: string,
  state: ParseState,
  line: number,
): { id: string; label?: string; opensBlock: boolean } | undefined {
  const match = raw.match(/^([A-Za-z_][\w-]*)(?::\s*(.*))?$/);
  if (!match) {
    state.diagnostics.push(diagnostic(
      'IMPORT_D2_UNSUPPORTED_SYNTAX',
      `D2 statement is outside the supported shape subset: ${raw}`,
      `d2.line[${line}]`,
      line,
    ));
    return undefined;
  }

  const id = match[1]!;
  const rhs = (match[2] ?? '').trim();
  const opensBlock = rhs.endsWith('{');
  const labelText = opensBlock ? rhs.slice(0, -1).trim() : rhs;
  return { id, label: splitD2Label(labelText), opensBlock };
}

function parseBlock(
  lines: string[],
  start: number,
  state: ParseState,
): { nodes: AuthorFrameNode[]; next: number } {
  const nodes: AuthorFrameNode[] = [];
  let index = start;

  while (index < lines.length) {
    state.line = index + 1;
    const raw = lines[index] ?? '';
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      index += 1;
      continue;
    }
    if (trimmed === '}') {
      return { nodes, next: index + 1 };
    }
    if (trimmed.startsWith('vars:')) {
      state.diagnostics.push(diagnostic(
        'IMPORT_D2_UNSUPPORTED_LAYOUT_HINT',
        'D2 vars/configuration metadata is not imported into canonical frame YAML.',
        `d2.line[${index + 1}]`,
        index + 1,
      ));
      index = trimmed.includes('{') ? skipBlock(lines, index) : index + 1;
      continue;
    }
    if (/^(class(?:es)?|style|icon|layers|near|direction|width|height):/.test(trimmed) || /\.style\./.test(trimmed)) {
      index = unsupportedBlock(
        lines,
        state,
        trimmed.startsWith('icon:')
          ? 'IMPORT_D2_UNSUPPORTED_ICON'
          : trimmed.startsWith('class:') || trimmed.startsWith('classes:')
            ? 'IMPORT_D2_UNSUPPORTED_CLASS'
            : 'IMPORT_D2_UNSUPPORTED_STYLE',
        `D2 style/icon/layout statement was ignored: ${trimmed}`,
        index,
      );
      continue;
    }
    if (/^(sql|sequence|\.\.\.|\|md\|)/.test(trimmed)) {
      index = unsupportedBlock(
        lines,
        state,
        'IMPORT_D2_UNSUPPORTED_CONSTRUCT',
        `D2 construct is outside the supported import subset: ${trimmed}`,
        index,
      );
      continue;
    }

    const edge = trimmed.match(/^(.+?)\s*->\s*([A-Za-z_][\w.-]*)(?:\s*:\s*(.*?))?\s*(\{)?$/);
    if (edge) {
      const source = edge[1]?.trim();
      const target = edge[2]?.trim();
      if (source && target) {
        state.rawArrows.push({
          source,
          target,
          label: edge[3] ? splitD2Label(edge[3]) : undefined,
          line: index + 1,
        });
      }
      index = edge[4] === '{' ? skipBlock(lines, index) : index + 1;
      continue;
    }

    const shape = parseShapeHeader(trimmed, state, index + 1);
    if (!shape) {
      index += 1;
      continue;
    }
    if (shape.opensBlock) {
      const childResult = parseBlock(lines, index + 1, state);
      const node: AuthorFrameNode = {
        id: shape.id,
        children: childResult.nodes,
        ...(shape.label ? { heading: { text: shape.label } } : {}),
      };
      nodes.push(node);
      index = childResult.next;
      continue;
    }

    nodes.push({
      id: shape.id,
      children: [],
      ...(shape.label ? { label: lineSpecs(shape.label) } : {}),
    });
    index += 1;
  }

  return { nodes, next: index };
}

function pathMap(root: AuthorFrameNode): Map<string, string> {
  const result = new Map<string, string>();
  const visit = (node: AuthorFrameNode, path: string) => {
    result.set(node.id, node.id);
    result.set(path, node.id);
    node.children.forEach(child => visit(child, `${path}.${child.id}`));
  };
  root.children.forEach(child => visit(child, child.id));
  return result;
}

export function importD2(source: string, options: D2ImportOptions = {}): DiagramImportResult {
  const state: ParseState = { diagnostics: [], rawArrows: [], line: 0 };
  const parsed = parseBlock(source.split(/\r?\n/), 0, state);
  const ast = makeImportedDocument(parsed.nodes, [], {});
  const paths = pathMap(ast.root!);
  const arrows: AuthorArrow[] = [];

  state.rawArrows.forEach((raw, index) => {
    const sourceId = paths.get(raw.source);
    const targetId = paths.get(raw.target);
    if (!sourceId || !targetId) {
      state.diagnostics.push(diagnostic(
        'IMPORT_D2_MISSING_FRAME_REF',
        `D2 connection references a shape that was not imported: ${raw.source} -> ${raw.target}`,
        `arrows[${index}]`,
        raw.line,
      ));
      return;
    }
    arrows.push({
      source: sourceId,
      target: targetId,
      kind: 'directed',
      ...(raw.label ? { label: lineSpecs(raw.label) } : {}),
    });
  });

  ast.arrows = arrows;
  return finishImport(ast, state.diagnostics, options.strict === true);
}
