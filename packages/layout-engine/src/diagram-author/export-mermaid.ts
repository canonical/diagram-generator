import { extractArrowRefId, extractBaseFrameId } from './ref-grammar.js';
import {
  pushUnsupportedArrowStyleWarning,
  pushUnsupportedIconWarning,
  pushUnsupportedLayoutWarning,
} from './export-shared.js';
import type { AuthorArrow, AuthorFrameNode, DiagramDocument, Diagnostic } from './types.js';

export interface MermaidExportResult {
  mermaid: string;
  warnings: Diagnostic[];
}

function escapeMermaidLabel(text: string): string {
  return text.replace(/"/g, '#quot;');
}

function formatNodeLabel(node: AuthorFrameNode): string {
  if (node.label?.length) {
    return node.label.map(line => escapeMermaidLabel(line.text)).join('<br/>');
  }
  if (node.heading) {
    return escapeMermaidLabel(node.heading.text);
  }
  return escapeMermaidLabel(node.id);
}

function collectFrameWarnings(node: AuthorFrameNode, path: string, warnings: Diagnostic[]): void {
  pushUnsupportedIconWarning('MERMAID', node, path, warnings);

  if (node.children.length > 0 && (node.label?.length || node.heading)) {
    warnings.push({
      code: 'MERMAID_UNSUPPORTED_CONTAINER_LABEL',
      level: 'warning',
      message: `Mermaid export ignores container label/heading metadata for frame: ${node.id}`,
      path,
    });
  }

  pushUnsupportedLayoutWarning('MERMAID', node, path, warnings);

  node.children.forEach((child, index) => {
    collectFrameWarnings(child, `${path}.children[${index}]`, warnings);
  });
}

function renderFrameNode(
  node: AuthorFrameNode,
  lines: string[],
  indent: string,
): void {
  if (node.children.length > 0) {
    lines.push(`${indent}subgraph ${node.id}`);
    node.children.forEach(child => renderFrameNode(child, lines, `${indent}  `));
    lines.push(`${indent}end`);
    return;
  }

  lines.push(`${indent}${node.id}["${formatNodeLabel(node)}"]`);
}

function renderArrow(
  arrow: AuthorArrow,
  index: number,
  lines: string[],
  warnings: Diagnostic[],
  ast: DiagramDocument,
): void {
  const sourceArrowId = extractArrowRefId(arrow.source);
  const targetArrowId = extractArrowRefId(arrow.target);
  const sourceBase = extractBaseFrameId(arrow.source);
  const targetBase = extractBaseFrameId(arrow.target);

  if (ast.root && (sourceBase === ast.root.id || targetBase === ast.root.id)) {
    warnings.push({
      code: 'MERMAID_ROOT_ENDPOINT_UNSUPPORTED',
      level: 'warning',
      message: `Mermaid export skips arrows that target the root canvas frame: ${arrow.source} -> ${arrow.target}`,
      path: `arrows[${index}]`,
    });
    return;
  }

  if (sourceArrowId || targetArrowId) {
    if (sourceArrowId) {
      warnings.push({
        code: 'MERMAID_UNSUPPORTED_ANCHOR_REF',
        level: 'warning',
        message: `Mermaid export skips arrow-to-arrow source ref: ${arrow.source}`,
        path: `arrows[${index}]`,
      });
    }
    if (targetArrowId) {
      warnings.push({
        code: 'MERMAID_UNSUPPORTED_ANCHOR_REF',
        level: 'warning',
        message: `Mermaid export skips arrow-to-arrow target ref: ${arrow.target}`,
        path: `arrows[${index}]`,
      });
    }
    return;
  }

  if (!ast.frameIndex[sourceBase] || !ast.frameIndex[targetBase]) {
    warnings.push({
      code: 'MERMAID_MISSING_FRAME_REF',
      level: 'warning',
      message: `Mermaid export skips arrow with missing frame refs: ${arrow.source} -> ${arrow.target}`,
      path: `arrows[${index}]`,
    });
    return;
  }

  if (arrow.source !== sourceBase) {
    warnings.push({
      code: 'MERMAID_UNSUPPORTED_ANCHOR_REF',
      level: 'warning',
      message: `Mermaid export degrades anchor-qualified source ref: ${arrow.source}`,
      path: `arrows[${index}]`,
    });
  }
  if (arrow.target !== targetBase) {
    warnings.push({
      code: 'MERMAID_UNSUPPORTED_ANCHOR_REF',
      level: 'warning',
      message: `Mermaid export degrades anchor-qualified target ref: ${arrow.target}`,
      path: `arrows[${index}]`,
    });
  }

  if (arrow.label?.length) {
    warnings.push({
      code: 'MERMAID_UNSUPPORTED_ARROW_LABEL',
      level: 'warning',
      message: `Mermaid export ignores arrow label metadata: ${arrow.source} -> ${arrow.target}`,
      path: `arrows[${index}]`,
    });
  }
  pushUnsupportedArrowStyleWarning('MERMAID', arrow, index, warnings);
  if (arrow.waypoints?.length) {
    warnings.push({
      code: 'MERMAID_UNSUPPORTED_WAYPOINTS',
      level: 'warning',
      message: `Mermaid export ignores arrow waypoints: ${arrow.source} -> ${arrow.target}`,
      path: `arrows[${index}]`,
    });
  }

  lines.push(`  ${sourceBase} --> ${targetBase}`);
}

export function exportMermaid(ast: DiagramDocument): MermaidExportResult {
  const warnings: Diagnostic[] = [];
  const lines = ['flowchart TB', ''];

  if (!ast.root) {
    return { mermaid: 'flowchart TB\n', warnings };
  }

  const exportRoots = ast.root.children.length > 0 ? ast.root.children : [ast.root];
  exportRoots.forEach((child, index) => {
    const path = ast.root?.children.length ? `root.children[${index}]` : 'root';
    collectFrameWarnings(child, path, warnings);
    renderFrameNode(child, lines, '  ');
  });

  lines.push('');
  ast.arrows.forEach((arrow, index) => {
    renderArrow(arrow, index, lines, warnings, ast);
  });

  return {
    mermaid: `${lines.join('\n').trimEnd()}\n`,
    warnings,
  };
}
