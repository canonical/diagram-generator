import { ELK_LAYERED_GRAPH_LAYOUT_ENGINE } from '@diagram-generator/graph-layout-elk';

import { diagnostic } from './import-result.js';
import type { AuthorFrameNode, DiagramDocument, Diagnostic } from './types.js';

export interface ImportEngineSelection {
  readonly engineId: string | null;
  readonly diagnostics: Diagnostic[];
  readonly reasons: string[];
}

function collectDirections(
  root: AuthorFrameNode | null,
  result: NonNullable<AuthorFrameNode['flowDirection']>[] = [],
): NonNullable<AuthorFrameNode['flowDirection']>[] {
  if (!root) return result;
  if (root.flowDirection) result.push(root.flowDirection);
  root.children.forEach(child => collectDirections(child, result));
  return result;
}

function hasCycle(ast: DiagramDocument): boolean {
  const outgoing = new Map<string, string[]>();
  for (const arrow of ast.arrows) {
    const targets = outgoing.get(arrow.source) ?? [];
    targets.push(arrow.target);
    outgoing.set(arrow.source, targets);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const target of outgoing.get(id) ?? []) {
      if (visit(target)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  return [...outgoing.keys()].some(visit);
}

function hasCrossContainerEdge(ast: DiagramDocument): boolean {
  return ast.arrows.some(arrow =>
    ast.frameIndex[arrow.source]?.parentId !== ast.frameIndex[arrow.target]?.parentId);
}

function hasHighFanIn(ast: DiagramDocument): boolean {
  const indegree = new Map<string, number>();
  for (const arrow of ast.arrows) {
    const next = (indegree.get(arrow.target) ?? 0) + 1;
    if (next > 1) return true;
    indegree.set(arrow.target, next);
  }
  return false;
}

export function selectImportEngine(ast: DiagramDocument): ImportEngineSelection {
  const diagnostics: Diagnostic[] = [];
  const reasons: string[] = [];
  const directions = collectDirections(ast.root);
  const reverse = directions.some(direction => direction === 'RL' || direction === 'BT');
  const crossContainer = hasCrossContainerEdge(ast);
  const cycle = hasCycle(ast);
  const highFanIn = hasHighFanIn(ast);

  if (reverse) reasons.push('reverse direction');
  if (crossContainer) reasons.push('cross-container edge');
  if (cycle) reasons.push('cycle');
  if (highFanIn) reasons.push('fan-in');

  if (reasons.length === 0) {
    return { engineId: 'v3', diagnostics, reasons: ['v3-compatible graph'] };
  }

  const capabilities = ELK_LAYERED_GRAPH_LAYOUT_ENGINE.capabilities;
  const missingDirections = directions.filter(direction =>
    !capabilities.directions.includes(direction));
  if (missingDirections.length > 0) {
    diagnostics.push(diagnostic(
      'IMPORT_ENGINE_UNSUPPORTED_DIRECTION',
      `No registered import engine preserves direction(s): ${[...new Set(missingDirections)].join(', ')}.`,
      'meta.layout_engine',
      undefined,
      'warning',
      'structural',
    ));
  }
  if (crossContainer && !capabilities.compounds.nestedChildren) {
    diagnostics.push(diagnostic(
      'IMPORT_ENGINE_UNSUPPORTED_COMPOUNDS',
      'No registered import engine preserves nested containers with cross-container edges.',
      'meta.layout_engine',
      undefined,
      'warning',
      'structural',
    ));
  }
  return {
    engineId: diagnostics.length === 0 ? ELK_LAYERED_GRAPH_LAYOUT_ENGINE.id : null,
    diagnostics,
    reasons,
  };
}
