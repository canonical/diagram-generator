import { Border, type Frame } from './frame-model.js';
import {
  maxStructuralChildNestingDepth,
  structuralLevelForMaxChildNestingDepth,
  type PromotionNode,
} from './level-promotion.js';

export interface LevelPromotionViolation {
  readonly frameId: string;
  readonly path: string;
  readonly actualLevel: number;
  readonly expectedLevel: 1 | 2 | 3;
  readonly maxChildNestingDepth: number;
}

function isSyntheticFrame(frame: Frame): boolean {
  return frame.role === 'heading'
    || frame.id === '__heading'
    || frame.id === '__body'
    || frame.id.endsWith('__heading')
    || frame.id.endsWith('__body');
}

function headingTextForFrame(frame: Frame): string {
  if (frame.heading?.content.trim()) return frame.heading.content;
  const headingChild = frame.children.find(child => child.role === 'heading');
  return headingChild?.label[0]?.content?.trim() ?? '';
}

function authoredChildren(frame: Frame): Frame[] {
  const body = frame.children.find(
    child => child.id === '__body' || child.id.endsWith('__body'),
  );
  const hasHeading = frame.children.some(
    child => child.role === 'heading' || child.id === '__heading' || child.id.endsWith('__heading'),
  );
  if (body && hasHeading) {
    return body.children.filter(child => !isSyntheticFrame(child));
  }
  return frame.children.filter(child => !isSyntheticFrame(child));
}

function isAnnotationFrame(frame: Frame): boolean {
  return authoredChildren(frame).length === 0 && frame.border === Border.NONE;
}

function isWrapperFrame(frame: Frame): boolean {
  if (frame.level === 0) return true;
  const children = authoredChildren(frame);
  return children.length > 0 && !headingTextForFrame(frame);
}

function isStructuralFrame(frame: Frame): boolean {
  return frame.role !== 'separator' && !isAnnotationFrame(frame) && !isWrapperFrame(frame);
}

function toPromotionNode(frame: Frame): PromotionNode {
  if (isWrapperFrame(frame)) {
    return {
      kind: 'wrapper',
      children: authoredChildren(frame).map(toPromotionNode),
    };
  }
  if (isAnnotationFrame(frame)) {
    return { kind: 'annotation' };
  }
  return {
    children: authoredChildren(frame).map(toPromotionNode),
  };
}

function effectiveStructuralLevel(frame: Frame): number {
  return frame.level ?? 1;
}

function framePath(parts: string[]): string {
  return parts.join(' > ');
}

function collectViolations(
  siblings: readonly Frame[],
  parentPath: readonly string[],
  out: LevelPromotionViolation[],
): void {
  const structuralSiblings = siblings.filter(isStructuralFrame);
  if (structuralSiblings.length > 0) {
    const maxChildNestingDepth = Math.max(
      ...structuralSiblings.map(frame => maxStructuralChildNestingDepth(toPromotionNode(frame))),
    );
    const expectedLevel = structuralLevelForMaxChildNestingDepth(maxChildNestingDepth);
    for (const frame of structuralSiblings) {
      const actualLevel = effectiveStructuralLevel(frame);
      if (actualLevel !== expectedLevel) {
        out.push({
          frameId: frame.id,
          path: framePath([...parentPath, frame.id || '<anonymous>']),
          actualLevel,
          expectedLevel,
          maxChildNestingDepth,
        });
      }
    }
  }

  for (const frame of siblings) {
    const children = authoredChildren(frame);
    if (children.length === 0) continue;
    collectViolations(children, [...parentPath, frame.id || '<anonymous>'], out);
  }
}

export function validateFrameLevelPromotion(root: Frame): LevelPromotionViolation[] {
  const violations: LevelPromotionViolation[] = [];
  collectViolations(authoredChildren(root), [root.id || '<root>'], violations);
  return violations;
}
