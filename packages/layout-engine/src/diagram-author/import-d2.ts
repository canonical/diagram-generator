import { diagnostic, finishImport, lineSpecs, makeImportedDocument, type DiagramImportResult } from './import-result.js';
import type { AuthorArrow, AuthorFrameNode, Diagnostic } from './types.js';
import { selectImportEngine } from './select-import-engine.js';

export interface D2ImportOptions {
  strict?: boolean;
}

interface RawArrow {
  source: string;
  target: string;
  label?: string;
  line: number;
  scopeNodes: AuthorFrameNode[];
}

interface ParseState {
  diagnostics: Diagnostic[];
  rawArrows: RawArrow[];
  rawStyles: {
    target: string;
    property: string;
    value: string;
    line: number;
  }[];
  classDefinitions: Map<string, {
    properties: Record<string, string>;
    line: number;
  }>;
  classAssignments: {
    target: AuthorFrameNode;
    className: string;
    line: number;
  }[];
  line: number;
}

interface ParsedBlock {
  nodes: AuthorFrameNode[];
  next: number;
  direction?: AuthorFrameNode['direction'];
  flowDirection?: AuthorFrameNode['flowDirection'];
  classNames?: string[];
}

function parseClassDefinitions(lines: readonly string[]): ParseState['classDefinitions'] {
  const definitions: ParseState['classDefinitions'] = new Map();
  let classesDepth = 0;
  let current: { name: string; properties: Record<string, string>; line: number } | null = null;
  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = (lines[index] ?? '').trim();
    if (classesDepth === 0) {
      if (/^classes:\s*\{$/i.test(trimmed)) classesDepth = 1;
      continue;
    }
    if (classesDepth === 1) {
      const classHeader = trimmed.match(/^([A-Za-z_][\w-]*):\s*\{$/);
      if (classHeader) {
        current = { name: classHeader[1]!, properties: {}, line: index + 1 };
      }
    } else if (current) {
      const property = trimmed.match(/^style\.(fill|stroke|stroke-dasharray):\s*(.+)$/i);
      if (property) current.properties[property[1]!.toLowerCase()] = decodeQuoted(property[2]!);
    }
    const opens = (trimmed.match(/\{/g) ?? []).length;
    const closes = (trimmed.match(/\}/g) ?? []).length;
    classesDepth += opens - closes;
    if (current && classesDepth === 1) {
      definitions.set(current.name, { properties: current.properties, line: current.line });
      current = null;
    }
    if (classesDepth <= 0) break;
  }
  return definitions;
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
  state.diagnostics.push(diagnostic(
    code,
    message,
    `d2.line[${index + 1}]`,
    index + 1,
    'warning',
    'visual',
  ));
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
      'warning',
      raw.includes('->') ? 'structural' : 'invalid',
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
): ParsedBlock {
  const nodes: AuthorFrameNode[] = [];
  let index = start;
  let direction: AuthorFrameNode['direction'];
  let flowDirection: AuthorFrameNode['flowDirection'];
  const classNames: string[] = [];

  while (index < lines.length) {
    state.line = index + 1;
    const raw = lines[index] ?? '';
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      index += 1;
      continue;
    }
    if (trimmed === '}') {
      return {
        nodes,
        next: index + 1,
        ...(direction ? { direction } : {}),
        ...(flowDirection ? { flowDirection } : {}),
        ...(classNames.length > 0 ? { classNames } : {}),
      };
    }
    if (trimmed.startsWith('vars:')) {
      state.diagnostics.push(diagnostic(
        'IMPORT_D2_UNSUPPORTED_LAYOUT_HINT',
        'D2 vars/configuration metadata is not imported into canonical frame YAML.',
        `d2.line[${index + 1}]`,
        index + 1,
        'warning',
        'visual',
      ));
      index = trimmed.includes('{') ? skipBlock(lines, index) : index + 1;
      continue;
    }
    if (trimmed.startsWith('direction:')) {
      const value = decodeQuoted(trimmed.slice('direction:'.length)).toLowerCase();
      if (value === 'right') {
        direction = 'horizontal';
        flowDirection = 'LR';
      } else if (value === 'down') {
        direction = 'vertical';
        flowDirection = 'TB';
      } else if (value === 'left') {
        direction = 'horizontal';
        flowDirection = 'RL';
      } else if (value === 'up') {
        direction = 'vertical';
        flowDirection = 'BT';
      }
      else {
        state.diagnostics.push(diagnostic(
          'IMPORT_D2_UNSUPPORTED_DIRECTION',
          `D2 direction '${value}' cannot yet be represented faithfully.`,
          `d2.line[${index + 1}]`,
          index + 1,
          'warning',
          'structural',
        ));
      }
      index += 1;
      continue;
    }
    if (trimmed.startsWith('classes:')) {
      index = trimmed.includes('{') ? skipBlock(lines, index) : index + 1;
      continue;
    }
    if (trimmed.startsWith('class:')) {
      classNames.push(...trimmed.slice('class:'.length).split(/[\s,]+/).filter(Boolean));
      index += 1;
      continue;
    }
    const directStyle = trimmed.match(
      /^([A-Za-z_][\w.-]*)\.style\.(fill|stroke|stroke-dasharray):\s*(.+)$/i,
    );
    if (directStyle) {
      state.rawStyles.push({
        target: directStyle[1]!,
        property: directStyle[2]!.toLowerCase(),
        value: decodeQuoted(directStyle[3]!),
        line: index + 1,
      });
      index += 1;
      continue;
    }
    if (/^(class(?:es)?|style|icon|layers|near|width|height):/.test(trimmed) || /\.style\./.test(trimmed)) {
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
      state.diagnostics.push(diagnostic(
        'IMPORT_D2_UNSUPPORTED_CONSTRUCT',
        `D2 construct is outside the supported import subset: ${trimmed}`,
        `d2.line[${index + 1}]`,
        index + 1,
        'warning',
        'type',
      ));
      index = trimmed.includes('{') ? skipBlock(lines, index) : index + 1;
      continue;
    }

    const edge = trimmed.match(
      /^([A-Za-z_][\w.-]*(?:\s*->\s*[A-Za-z_][\w.-]*)+)(?:\s*:\s*(.*?))?\s*(\{)?$/,
    );
    if (edge) {
      const endpoints = edge[1]!.split(/\s*->\s*/);
      for (let endpointIndex = 0; endpointIndex < endpoints.length - 1; endpointIndex += 1) {
        state.rawArrows.push({
          source: endpoints[endpointIndex]!,
          target: endpoints[endpointIndex + 1]!,
          ...(edge[2] && endpointIndex === endpoints.length - 2
            ? { label: splitD2Label(edge[2]) }
            : {}),
          line: index + 1,
          scopeNodes: nodes,
        });
      }
      if (edge[3] === '{') {
        state.diagnostics.push(diagnostic(
          'IMPORT_D2_UNSUPPORTED_STYLE',
          `D2 edge attributes were reduced to the canonical arrow fields: ${trimmed}`,
          `d2.line[${index + 1}]`,
          index + 1,
          'warning',
          'visual',
        ));
      }
      index = edge[3] === '{' ? skipBlock(lines, index) : index + 1;
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
        ...(childResult.direction ? { direction: childResult.direction } : {}),
        ...(childResult.flowDirection ? { flowDirection: childResult.flowDirection } : {}),
      };
      for (const className of childResult.classNames ?? []) {
        state.classAssignments.push({
          target: node,
          className,
          line: index + 1,
        });
      }
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

  return {
    nodes,
    next: index,
    ...(direction ? { direction } : {}),
    ...(flowDirection ? { flowDirection } : {}),
    ...(classNames.length > 0 ? { classNames } : {}),
  };
}

function pathMap(root: AuthorFrameNode): Map<string, AuthorFrameNode> {
  const result = new Map<string, AuthorFrameNode>();
  const visit = (node: AuthorFrameNode, path: string) => {
    result.set(node.id, node);
    result.set(path, node);
    node.children.forEach(child => visit(child, `${path}.${child.id}`));
  };
  root.children.forEach(child => visit(child, child.id));
  return result;
}

function materializeImplicitConnectionEndpoints(rawArrows: readonly RawArrow[]): void {
  const knownIdsByScope = new WeakMap<AuthorFrameNode[], Set<string>>();
  for (const arrow of rawArrows) {
    let knownIds = knownIdsByScope.get(arrow.scopeNodes);
    if (!knownIds) {
      knownIds = new Set(arrow.scopeNodes.map(node => node.id));
      knownIdsByScope.set(arrow.scopeNodes, knownIds);
    }
    for (const endpoint of [arrow.source, arrow.target]) {
      // A dotted endpoint carries containment semantics that cannot be inferred
      // safely. Keep those unresolved so the structural-loss gate names them.
      if (!/^[A-Za-z_][\w-]*$/.test(endpoint) || knownIds.has(endpoint)) continue;
      arrow.scopeNodes.push({ id: endpoint, children: [] });
      knownIds.add(endpoint);
    }
  }
}

function applyD2StyleProperty(
  target: AuthorFrameNode,
  property: string,
  value: string,
): boolean {
  const normalized = value.toLowerCase();
  if (property === 'fill') {
    if (['white', '#fff', '#ffffff'].includes(normalized)) target.fill = 'white';
    else if (['black', '#000', '#000000'].includes(normalized)) target.fill = 'black';
    else if (['grey', 'gray', '#f3f3f3'].includes(normalized)) target.fill = 'grey';
    return target.fill !== undefined;
  }
  if (property === 'stroke-dasharray') {
    target.border = 'dashed';
    return true;
  }
  if (property === 'stroke' && ['none', 'transparent'].includes(normalized)) {
    target.border = 'none';
    return true;
  }
  if (property === 'stroke') target.border = 'solid';
  return false;
}

export function importD2(source: string, options: D2ImportOptions = {}): DiagramImportResult {
  const lines = source.split(/\r?\n/);
  const state: ParseState = {
    diagnostics: [],
    rawArrows: [],
    rawStyles: [],
    classDefinitions: parseClassDefinitions(lines),
    classAssignments: [],
    line: 0,
  };
  const parsed = parseBlock(lines, 0, state);
  materializeImplicitConnectionEndpoints(state.rawArrows);
  const imported = makeImportedDocument(parsed.nodes, [], {});
  const ast = imported.ast;
  state.diagnostics.push(...imported.diagnostics);
  const paths = pathMap(ast.root!);
  const arrows: AuthorArrow[] = [];

  state.rawArrows.forEach((raw, index) => {
    const sourceNode = paths.get(raw.source);
    const targetNode = paths.get(raw.target);
    if (!sourceNode || !targetNode) {
      state.diagnostics.push(diagnostic(
        'IMPORT_D2_MISSING_FRAME_REF',
        `D2 connection references a shape that was not imported: ${raw.source} -> ${raw.target}`,
        `arrows[${index}]`,
        raw.line,
        'warning',
        'structural',
      ));
      return;
    }
    arrows.push({
      source: sourceNode.id,
      target: targetNode.id,
      kind: 'directed',
      ...(raw.label ? { label: lineSpecs(raw.label) } : {}),
    });
  });

  ast.arrows = arrows;
  if (ast.root) {
    if (parsed.direction) ast.root.direction = parsed.direction;
    if (parsed.flowDirection) ast.root.flowDirection = parsed.flowDirection;
  }
  const usedClassDefinitions = new Set<string>();
  for (const assignment of state.classAssignments) {
    const definition = state.classDefinitions.get(assignment.className);
    if (!definition) {
      state.diagnostics.push(diagnostic(
        'IMPORT_D2_UNSUPPORTED_CLASS',
        `D2 class '${assignment.className}' has no importable definition.`,
        `d2.line[${assignment.line}]`,
        assignment.line,
        'warning',
        'visual',
      ));
      continue;
    }
    usedClassDefinitions.add(assignment.className);
    for (const [property, value] of Object.entries(definition.properties)) {
      if (!applyD2StyleProperty(assignment.target, property, value)) {
        state.diagnostics.push(diagnostic(
          'IMPORT_D2_UNSUPPORTED_STYLE',
          `D2 class style could not be mapped faithfully: ${assignment.className}.${property}: ${value}`,
          `d2.line[${definition.line}]`,
          definition.line,
          'warning',
          'visual',
        ));
      }
    }
  }
  for (const [className, definition] of state.classDefinitions) {
    if (!usedClassDefinitions.has(className)) {
      state.diagnostics.push(diagnostic(
        'IMPORT_D2_UNSUPPORTED_CLASS',
        `D2 class definition '${className}' was unused and not persisted.`,
        `d2.line[${definition.line}]`,
        definition.line,
        'warning',
        'visual',
      ));
    }
  }
  for (const style of state.rawStyles) {
    const target = paths.get(style.target);
    const mapped = target
      ? applyD2StyleProperty(target, style.property, style.value)
      : false;
    if (!mapped) {
      state.diagnostics.push(diagnostic(
        'IMPORT_D2_UNSUPPORTED_STYLE',
        `D2 style property could not be mapped faithfully: ${style.target}.style.${style.property}: ${style.value}`,
        `d2.line[${style.line}]`,
        style.line,
        'warning',
        'visual',
      ));
    }
  }
  const selection = selectImportEngine(ast);
  state.diagnostics.push(...selection.diagnostics);
  if (selection.engineId) {
    ast.metadata.layout_engine = selection.engineId;
    ast.source.meta = { layout_engine: selection.engineId };
  }
  return finishImport(ast, state.diagnostics, options.strict === true);
}
