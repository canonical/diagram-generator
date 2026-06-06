import { extractBaseFrameId } from './ref-grammar.js';
import type { AuthorArrow, AuthorFrameNode, Diagnostic, FrameIndexEntry, FrameTemplate } from './types.js';

function arrowSignature(arrow: AuthorArrow): string {
  const labelKey = arrow.label?.map(line => line.text).join('\0') ?? '';
  return `${arrow.source}\0${arrow.target}\0${labelKey}`;
}

function collectLeafIds(root: AuthorFrameNode | null): string[] {
  if (!root) {
    return [];
  }
  const leafIds: string[] = [];
  const visit = (node: AuthorFrameNode) => {
    if (node.children.length === 0 && node.id) {
      leafIds.push(node.id);
    }
    node.children.forEach(visit);
  };
  visit(root);
  return leafIds;
}

function incidentArrowCount(frameId: string, arrows: AuthorArrow[]): number {
  return arrows.filter(arrow => {
    const sourceId = extractBaseFrameId(arrow.source);
    const targetId = extractBaseFrameId(arrow.target);
    return sourceId === frameId || targetId === frameId;
  }).length;
}

export function collectCompileWarnings(input: {
  root: AuthorFrameNode | null;
  arrows: AuthorArrow[];
  defaults: Record<string, FrameTemplate>;
  frameIndex: Record<string, FrameIndexEntry>;
  usedTemplates: Set<string>;
}): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  Object.keys(input.defaults).forEach(templateName => {
    if (!input.usedTemplates.has(templateName)) {
      diagnostics.push({
        code: 'UNUSED_DEFAULT',
        level: 'warning',
        message: `Default template is never referenced: ${templateName}`,
        path: `defaults.${templateName}`,
      });
    }
  });

  collectLeafIds(input.root).forEach(frameId => {
    const entry = input.frameIndex[frameId];
    if (!entry || entry.isContainer || entry.path === 'root') {
      return;
    }
    if (incidentArrowCount(frameId, input.arrows) === 0) {
      diagnostics.push({
        code: 'ORPHAN_LEAF',
        level: 'warning',
        message: `Leaf frame has no incident arrows: ${frameId}`,
        path: entry.path,
      });
    }
  });

  const seenArrows = new Map<string, number>();
  input.arrows.forEach((arrow, index) => {
    if (arrow.source === arrow.target) {
      diagnostics.push({
        code: 'SELF_LOOP_ARROW',
        level: 'warning',
        message: `Arrow source and target are identical: ${arrow.source}`,
        path: `arrows[${index}]`,
      });
    }

    const signature = arrowSignature(arrow);
    const firstIndex = seenArrows.get(signature);
    if (firstIndex !== undefined) {
      diagnostics.push({
        code: 'DUPLICATE_ARROW',
        level: 'warning',
        message: `Duplicate arrow (same source, target, and label as arrows[${firstIndex}])`,
        path: `arrows[${index}]`,
      });
    } else {
      seenArrows.set(signature, index);
    }
  });

  return diagnostics;
}

export function applyStrictMode(diagnostics: Diagnostic[], strict: boolean): Diagnostic[] {
  if (!strict) {
    return diagnostics;
  }
  return diagnostics.map(diagnostic => {
    if (diagnostic.level !== 'warning') {
      return diagnostic;
    }
    if (diagnostic.code === 'DUPLICATE_ARROW' || diagnostic.code === 'SELF_LOOP_ARROW') {
      return { ...diagnostic, level: 'error' };
    }
    return diagnostic;
  });
}
