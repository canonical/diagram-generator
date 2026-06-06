import { normalizeFrameTemplate } from './build-ast.js';
import type { AuthorFrameNode, Diagnostic, FrameTemplate } from './types.js';

function normalizeDefaultsMap(value: unknown): Record<string, FrameTemplate> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([name, entry]) => [
      name,
      entry && typeof entry === 'object' && !Array.isArray(entry)
        ? normalizeFrameTemplate(entry as Record<string, unknown>)
        : {},
    ]),
  );
}

function mergeTemplateIntoNode(
  node: AuthorFrameNode,
  template: FrameTemplate,
): AuthorFrameNode {
  const { use: _use, id, children, ...localProps } = node;
  return {
    id,
    children,
    ...template,
    ...localProps,
  };
}

function expandNode(
  node: AuthorFrameNode,
  defaults: Record<string, FrameTemplate>,
  path: string,
  diagnostics: Diagnostic[],
): AuthorFrameNode {
  const children = node.children.map((child, index) =>
    expandNode(child, defaults, `${path}.children[${index}]`, diagnostics),
  );

  let expanded: AuthorFrameNode = {
    ...node,
    children,
  };

  if (node.use) {
    const template = defaults[node.use];
    if (!template) {
      diagnostics.push({
        code: 'UNKNOWN_TEMPLATE',
        level: 'error',
        message: `Unknown default template: ${node.use}`,
        path,
      });
      return expanded;
    }
    expanded = mergeTemplateIntoNode(expanded, template);
    delete expanded.use;
  }

  return expanded;
}

export function expandFrameDefaults(
  root: AuthorFrameNode | null,
  rawDefaults: unknown,
): {
  root: AuthorFrameNode | null;
  defaults: Record<string, FrameTemplate>;
  diagnostics: Diagnostic[];
} {
  const defaults = normalizeDefaultsMap(rawDefaults);
  if (!root) {
    return { root: null, defaults, diagnostics: [] };
  }

  const diagnostics: Diagnostic[] = [];
  return {
    root: expandNode(root, defaults, 'root', diagnostics),
    defaults,
    diagnostics,
  };
}
