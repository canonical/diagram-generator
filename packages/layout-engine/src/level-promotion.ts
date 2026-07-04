export type PromotedStructuralLevel = 1 | 2 | 3;

export interface PromotionNode {
  readonly kind?: 'wrapper' | 'annotation';
  readonly children?: readonly PromotionNode[];
}

function isWrapper(node: PromotionNode): boolean {
  return node.kind === 'wrapper';
}

function isAnnotation(node: PromotionNode): boolean {
  return node.kind === 'annotation';
}

function isStructural(node: PromotionNode): boolean {
  return !isWrapper(node) && !isAnnotation(node);
}

function structuralChildren(node: PromotionNode): readonly PromotionNode[] {
  return (node.children ?? [])
    .flatMap((child) => (isWrapper(child) ? structuralChildren(child) : [child]))
    .filter(isStructural);
}

export function maxStructuralChildNestingDepth(node: PromotionNode): number {
  const children = structuralChildren(node);
  if (children.length === 0) {
    return 0;
  }
  return Math.max(...children.map((child) => 1 + maxStructuralChildNestingDepth(child)));
}

export function structuralLevelForMaxChildNestingDepth(
  maxChildNestingDepth: number,
): PromotedStructuralLevel {
  if (maxChildNestingDepth <= 0) {
    return 1;
  }
  if (maxChildNestingDepth === 1) {
    return 2;
  }
  return 3;
}
