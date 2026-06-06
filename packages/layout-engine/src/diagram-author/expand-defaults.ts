import { normalizeFrameTemplate } from './build-ast.js';
import type { AuthorFrameNode, Diagnostic, FrameTemplate } from './types.js';

function normalizeDefaultsMap(value: unknown): {
  defaults: Record<string, FrameTemplate>;
  diagnostics: Diagnostic[];
} {
  const diagnostics: Diagnostic[] = [];
  if (value === undefined || value === null) {
    return { defaults: {}, diagnostics };
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    diagnostics.push({
      code: 'INVALID_DEFAULT',
      level: 'error',
      message: 'Top-level `defaults` must be a mapping.',
      path: 'defaults',
    });
    return { defaults: {}, diagnostics };
  }

  const defaults: Record<string, FrameTemplate> = {};
  for (const [name, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      diagnostics.push({
        code: 'INVALID_DEFAULT',
        level: 'error',
        message: 'Default template entry must be a mapping.',
        path: `defaults.${name}`,
      });
      continue;
    }
    defaults[name] = normalizeFrameTemplate(entry as Record<string, unknown>);
  }

  return { defaults, diagnostics };
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
  usedTemplates: Set<string>,
): AuthorFrameNode {
  const children = node.children.map((child, index) =>
    expandNode(child, defaults, `${path}.children[${index}]`, diagnostics, usedTemplates),
  );

  let expanded: AuthorFrameNode = {
    ...node,
    children,
  };

  if (node.use) {
    usedTemplates.add(node.use);
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
  usedTemplates: Set<string>;
  diagnostics: Diagnostic[];
} {
  const normalizedDefaults = normalizeDefaultsMap(rawDefaults);
  if (!root) {
    return {
      root: null,
      defaults: normalizedDefaults.defaults,
      usedTemplates: new Set(),
      diagnostics: normalizedDefaults.diagnostics,
    };
  }

  const diagnostics: Diagnostic[] = [...normalizedDefaults.diagnostics];
  const usedTemplates = new Set<string>();
  return {
    root: expandNode(root, normalizedDefaults.defaults, 'root', diagnostics, usedTemplates),
    defaults: normalizedDefaults.defaults,
    usedTemplates,
    diagnostics,
  };
}
