import { diagnostic, lineSpecs } from '../import-result.js';
import type { AuthorArrow, AuthorFrameNode, Diagnostic } from '../types.js';
import type {
  IrContainer,
  IrFlowchart,
  IrNode,
  MermaidFlowDirection,
} from './flowchart-ir.js';

export interface LoweredMermaidFlowchart {
  readonly nodes: AuthorFrameNode[];
  readonly arrows: AuthorArrow[];
  readonly metadata: Record<string, unknown>;
  readonly diagnostics: Diagnostic[];
}

function axisForDirection(
  direction: MermaidFlowDirection,
): 'vertical' | 'horizontal' {
  return direction === 'LR' || direction === 'RL' ? 'horizontal' : 'vertical';
}

function canonicalFlowDirection(
  direction: MermaidFlowDirection,
): NonNullable<AuthorFrameNode['flowDirection']> {
  return direction === 'TD' ? 'TB' : direction;
}

function containerKey(path: readonly string[]): string {
  return path.join('\u0000');
}

function markdownToPlainText(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/`([^`]*)`/g, '$1');
}

function buildContainers(
  containers: readonly IrContainer[],
  parentPath: readonly string[],
  diagnostics: Diagnostic[],
  index: Map<string, AuthorFrameNode>,
  sourceLines: Map<AuthorFrameNode, number>,
): AuthorFrameNode[] {
  return containers.map(container => {
    const path = [...parentPath, container.id];
    const direction = container.direction
      ? axisForDirection(container.direction)
      : undefined;
    const node: AuthorFrameNode = {
      id: container.id,
      children: buildContainers(container.children, path, diagnostics, index, sourceLines),
      ...(container.heading ? { heading: { text: container.heading } } : {}),
      ...(direction ? { direction } : {}),
      ...(container.direction
        ? { flowDirection: canonicalFlowDirection(container.direction) }
        : {}),
    };
    sourceLines.set(node, container.line);
    index.set(containerKey(path), node);
    return node;
  });
}

function preferredNodeOccurrence(occurrences: readonly IrNode[]): IrNode {
  const explicit = occurrences.filter(node => node.explicit);
  return explicit.at(-1) ?? occurrences[0]!;
}

function collectNodes(
  flowchart: IrFlowchart,
  diagnostics: Diagnostic[],
): Map<string, IrNode> {
  const occurrences = new Map<string, IrNode[]>();
  for (const node of flowchart.nodes) {
    const current = occurrences.get(node.id) ?? [];
    current.push(node);
    occurrences.set(node.id, current);
  }
  const selected = new Map<string, IrNode>();
  for (const [id, candidates] of occurrences) {
    const explicit = candidates.filter(node => node.explicit);
    const standaloneExplicit = explicit.filter(node =>
      flowchart.edges.every(edge => edge.line !== node.line));
    if (standaloneExplicit.length > 1) {
      diagnostics.push(diagnostic(
        'DUPLICATE_FRAME_ID',
        `Duplicate frame id '${id}'`,
        `mermaid.line[${standaloneExplicit[1]!.line}]`,
        standaloneExplicit[1]!.line,
        'error',
        'invalid',
      ));
    }
    selected.set(id, preferredNodeOccurrence(candidates));
  }
  return selected;
}

function attachSelectedNodes(
  selected: ReadonlyMap<string, IrNode>,
  roots: AuthorFrameNode[],
  containerIndex: ReadonlyMap<string, AuthorFrameNode>,
  diagnostics: Diagnostic[],
  sourceLines: Map<AuthorFrameNode, number>,
): Map<string, AuthorFrameNode> {
  const containerIds = new Set<string>();
  const attached = new Map<string, AuthorFrameNode>();
  for (const container of containerIndex.values()) containerIds.add(container.id);

  for (const sourceNode of selected.values()) {
    if (containerIds.has(sourceNode.id)) {
      diagnostics.push(diagnostic(
        'DUPLICATE_FRAME_ID',
        `Mermaid node '${sourceNode.id}' collides with a subgraph id.`,
        `mermaid.line[${sourceNode.line}]`,
        sourceNode.line,
        'error',
        'invalid',
      ));
      continue;
    }
    const node: AuthorFrameNode = {
      id: sourceNode.id,
      children: [],
      ...(sourceNode.label ? {
        label: lineSpecs(sourceNode.markdown
          ? markdownToPlainText(sourceNode.label)
          : sourceNode.label),
      } : {
        label: lineSpecs(sourceNode.id),
      }),
    };
    sourceLines.set(node, sourceNode.line);
    const parent = containerIndex.get(containerKey(sourceNode.containerPath));
    if (sourceNode.containerPath.length > 0 && !parent) {
      diagnostics.push(diagnostic(
        'IMPORT_MERMAID_UNSUPPORTED_SUBGRAPH',
        `Mermaid node '${sourceNode.id}' refers to a container path that could not be created.`,
        `mermaid.line[${sourceNode.line}]`,
        sourceNode.line,
        'warning',
        'structural',
      ));
      continue;
    }
    (parent?.children ?? roots).push(node);
    attached.set(sourceNode.id, node);
    if (sourceNode.shape && sourceNode.shape !== 'rectangle') {
      diagnostics.push(diagnostic(
        'IMPORT_MERMAID_UNSUPPORTED_SHAPE',
        `Mermaid ${sourceNode.shape} node '${sourceNode.id}' was imported as a rectangular frame.`,
        `mermaid.line[${sourceNode.line}]`,
        sourceNode.line,
        'warning',
        'visual',
      ));
    }
    if (sourceNode.markdown) {
      diagnostics.push(diagnostic(
        'IMPORT_MERMAID_UNSUPPORTED_STYLE',
        `Mermaid markdown styling on node '${sourceNode.id}' was reduced to plain text.`,
        `mermaid.line[${sourceNode.line}]`,
        sourceNode.line,
        'warning',
        'visual',
      ));
    }
    if (sourceNode.html) {
      diagnostics.push(diagnostic(
        'IMPORT_MERMAID_UNSUPPORTED_STYLE',
        `Mermaid HTML styling on node '${sourceNode.id}' was reduced to plain text.`,
        `mermaid.line[${sourceNode.line}]`,
        sourceNode.line,
        'warning',
        'visual',
      ));
    }
  }
  return attached;
}

function canonicalFill(value: string): AuthorFrameNode['fill'] | undefined {
  const normalized = value.trim().replace(/^["']|["']$/g, '').toLowerCase();
  if (['white', '#fff', '#ffffff'].includes(normalized)) return 'white';
  if (['black', '#000', '#000000'].includes(normalized)) return 'black';
  if (['grey', 'gray', '#f3f3f3'].includes(normalized)) return 'grey';
  return undefined;
}

function applyStyleProperties(
  node: AuthorFrameNode,
  properties: Readonly<Record<string, string>>,
  line: number,
  diagnostics: Diagnostic[],
): void {
  for (const [property, value] of Object.entries(properties)) {
    if (property === 'fill') {
      const fill = canonicalFill(value);
      if (fill) {
        node.fill = fill;
        continue;
      }
    } else if (property === 'stroke-dasharray') {
      node.border = 'dashed';
      continue;
    } else if (property === 'stroke' && ['none', 'transparent'].includes(value.toLowerCase())) {
      node.border = 'none';
      continue;
    } else if (property === 'stroke') {
      node.border = 'solid';
    }
    diagnostics.push(diagnostic(
      'IMPORT_MERMAID_UNSUPPORTED_STYLE',
      `Mermaid style property '${property}: ${value}' has no faithful canonical mapping.`,
      `mermaid.line[${line}]`,
      line,
      'warning',
      'visual',
    ));
  }
}

function applyStyles(
  flowchart: IrFlowchart,
  selected: ReadonlyMap<string, IrNode>,
  attached: ReadonlyMap<string, AuthorFrameNode>,
  containerIndex: ReadonlyMap<string, AuthorFrameNode>,
  diagnostics: Diagnostic[],
): void {
  const targets = new Map(attached);
  for (const container of containerIndex.values()) targets.set(container.id, container);
  const definitions = new Map(flowchart.styles
    .filter(style => style.kind === 'classDef')
    .map(style => [style.names[0]!, style] as const));
  const classUses = new Map<string, Set<string>>();
  for (const [id, sourceNode] of selected) {
    classUses.set(id, new Set(sourceNode.classes));
  }
  const collectContainerClasses = (containers: readonly IrContainer[]): void => {
    for (const container of containers) {
      classUses.set(container.id, new Set(container.classes));
      collectContainerClasses(container.children);
    }
  };
  collectContainerClasses(flowchart.roots);
  for (const style of flowchart.styles) {
    if (style.kind !== 'class' || !style.className) continue;
    for (const name of style.names) {
      const uses = classUses.get(name) ?? new Set<string>();
      uses.add(style.className);
      classUses.set(name, uses);
    }
  }

  const usedDefinitions = new Set<string>();
  for (const [id, classes] of classUses) {
    const target = targets.get(id);
    for (const className of classes) {
      const definition = definitions.get(className);
      if (target && definition) {
        usedDefinitions.add(className);
        applyStyleProperties(target, definition.properties, definition.line, diagnostics);
      } else {
        diagnostics.push(diagnostic(
          'IMPORT_MERMAID_UNSUPPORTED_STYLE',
          `Mermaid class styling could not be mapped: ${id}:::${className}`,
          `mermaid.line[${selected.get(id)?.line ?? definition?.line ?? 1}]`,
          selected.get(id)?.line ?? definition?.line ?? 1,
          'warning',
          'visual',
        ));
      }
    }
  }
  for (const style of flowchart.styles) {
    if (style.kind === 'style') {
      for (const name of style.names) {
        const target = targets.get(name);
        if (target) applyStyleProperties(target, style.properties, style.line, diagnostics);
        else diagnostics.push(diagnostic(
          'IMPORT_MERMAID_UNSUPPORTED_STYLE',
          `Mermaid style target '${name}' was not imported.`,
          `mermaid.line[${style.line}]`,
          style.line,
          'warning',
          'visual',
        ));
      }
    }
  }
  for (const [name, definition] of definitions) {
    if (!usedDefinitions.has(name)) {
      diagnostics.push(diagnostic(
        'IMPORT_MERMAID_UNSUPPORTED_STYLE',
        `Mermaid class definition '${name}' was unused and not persisted.`,
        `mermaid.line[${definition.line}]`,
        definition.line,
        'warning',
        'visual',
      ));
    }
  }
}

export function lowerMermaidFlowchart(flowchart: IrFlowchart): LoweredMermaidFlowchart {
  const diagnostics: Diagnostic[] = [];
  const containerIndex = new Map<string, AuthorFrameNode>();
  const sourceLines = new Map<AuthorFrameNode, number>();
  const nodes = buildContainers(flowchart.roots, [], diagnostics, containerIndex, sourceLines);
  const selected = collectNodes(flowchart, diagnostics);
  const attached = attachSelectedNodes(selected, nodes, containerIndex, diagnostics, sourceLines);
  applyStyles(flowchart, selected, attached, containerIndex, diagnostics);
  const sortBySourceOrder = (siblings: AuthorFrameNode[]): void => {
    siblings.sort((left, right) =>
      (sourceLines.get(left) ?? Number.MAX_SAFE_INTEGER)
      - (sourceLines.get(right) ?? Number.MAX_SAFE_INTEGER));
    siblings.forEach(node => sortBySourceOrder(node.children));
  };
  sortBySourceOrder(nodes);

  const knownIds = new Set<string>([
    ...selected.keys(),
    ...[...containerIndex.values()].map(container => container.id),
  ]);
  const arrows: AuthorArrow[] = [];
  for (const edge of flowchart.edges) {
    if (!knownIds.has(edge.source) || !knownIds.has(edge.target)) {
      diagnostics.push(diagnostic(
        'IMPORT_MERMAID_MISSING_FRAME_REF',
        `Mermaid edge endpoint could not be created: ${edge.source} -> ${edge.target}`,
        `mermaid.line[${edge.line}]`,
        edge.line,
        'warning',
        'structural',
      ));
      continue;
    }
    arrows.push({
      source: edge.source,
      target: edge.target,
      kind: 'directed',
      ...(edge.label ? { label: lineSpecs(edge.label) } : {}),
    });
    if (edge.connector === '<-->') {
      diagnostics.push(diagnostic(
        'IMPORT_MERMAID_UNSUPPORTED_EDGE_DIRECTION',
        `Mermaid bidirectional edge ${edge.source} <--> ${edge.target} was imported as ${edge.source} -> ${edge.target}.`,
        `mermaid.line[${edge.line}]`,
        edge.line,
        'warning',
        'visual',
      ));
    } else if (edge.connector !== '-->') {
      diagnostics.push(diagnostic(
        'IMPORT_MERMAID_UNSUPPORTED_EDGE_STYLE',
        `Mermaid '${edge.connector}' edge ${edge.source} -> ${edge.target} was imported as a standard directed arrow.`,
        `mermaid.line[${edge.line}]`,
        edge.line,
        'warning',
        'visual',
      ));
    }
  }

  for (const statement of flowchart.unsupported) {
    if (statement.kind === 'style') {
      diagnostics.push(diagnostic(
        'IMPORT_MERMAID_UNSUPPORTED_STYLE',
        `Mermaid styling/interaction statement was ignored: ${statement.raw}`,
        `mermaid.line[${statement.line}]`,
        statement.line,
        'warning',
        'visual',
      ));
    } else {
      diagnostics.push(diagnostic(
        statement.kind === 'edge-id'
          ? 'IMPORT_MERMAID_UNSUPPORTED_EDGE'
          : 'IMPORT_MERMAID_UNSUPPORTED_SYNTAX',
        statement.kind === 'edge-id'
          ? `Mermaid edge id/animation could not be imported: ${statement.raw}`
          : `Mermaid statement is outside the supported flowchart subset: ${statement.raw}`,
        `mermaid.line[${statement.line}]`,
        statement.line,
        'warning',
        'structural',
      ));
    }
  }

  const direction = axisForDirection(flowchart.direction);
  return {
    nodes,
    arrows,
    metadata: {
      ...(flowchart.title ? { title: flowchart.title } : {}),
      direction,
      flow_direction: canonicalFlowDirection(flowchart.direction),
    },
    diagnostics,
  };
}
