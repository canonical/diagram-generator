import { stringify as stringifyYaml } from 'yaml';

import type { AuthorFrameNode, DiagramDocument } from './types.js';

function serializeNode(node: AuthorFrameNode): Record<string, unknown> {
  const result: Record<string, unknown> = { id: node.id };
  if (node.direction) result.direction = node.direction;
  if (node.heading) result.heading = node.heading.text;
  if (node.label) result.label = node.label.map(line => line.text);
  result.children = node.children.map(serializeNode);
  return result;
}

export function serializeDiagramYaml(ast: DiagramDocument): string {
  const document: Record<string, unknown> = {
    engine: 'v3',
  };
  const title = ast.metadata.title;
  if (typeof title === 'string' && title.length > 0) {
    document.title = title;
  }
  document.root = ast.root ? serializeNode(ast.root) : null;
  document.arrows = ast.arrows.map(arrow => ({
    source: arrow.source,
    target: arrow.target,
    ...(arrow.label?.length ? { label: arrow.label.map(line => line.text) } : {}),
  }));
  return stringifyYaml(document, { indent: 2, lineWidth: 0 });
}
