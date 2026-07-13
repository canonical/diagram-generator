import type { AuthorArrow, AuthorFrameNode, Diagnostic } from './types.js';

export const UNSUPPORTED_LAYOUT_FIELDS: (keyof AuthorFrameNode)[] = [
  'direction',
  'gap',
  'gapDelta',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'sizing',
  'sizingW',
  'sizingH',
  'fillWeight',
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'maxWidthChars',
  'minHeight',
  'maxHeight',
  'align',
  'justify',
  'wrap',
  'fill',
  'border',
  'position',
  'x',
  'y',
  'colSpan',
  'level',
  'variant',
  'role',
];

export function pushUnsupportedIconWarning(
  format: 'MERMAID' | 'D2',
  node: AuthorFrameNode,
  path: string,
  warnings: Diagnostic[],
): void {
  if (!node.icon && !node.iconFill) return;
  warnings.push({
    code: `${format}_UNSUPPORTED_ICON`,
    level: 'warning',
    message: `${format} export ignores icon metadata for frame: ${node.id}`,
    path,
  });
}

export function pushUnsupportedLayoutWarning(
  format: 'MERMAID' | 'D2',
  node: AuthorFrameNode,
  path: string,
  warnings: Diagnostic[],
): void {
  if (!UNSUPPORTED_LAYOUT_FIELDS.some(field => node[field] !== undefined)) return;
  warnings.push({
    code: `${format}_UNSUPPORTED_LAYOUT`,
    level: 'warning',
    message: `${format} export ignores layout metadata for frame: ${node.id}`,
    path,
  });
}

export function pushUnsupportedArrowStyleWarning(
  format: 'MERMAID' | 'D2',
  arrow: AuthorArrow,
  index: number,
  warnings: Diagnostic[],
): void {
  if (!arrow.style && !arrow.color && arrow.labelGap == null) return;
  warnings.push({
    code: `${format}_UNSUPPORTED_ARROW_STYLE`,
    level: 'warning',
    message: `${format} export ignores arrow style metadata: ${arrow.source} -> ${arrow.target}`,
    path: `arrows[${index}]`,
  });
}
