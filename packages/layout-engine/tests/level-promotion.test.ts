import { describe, expect, it } from 'vitest';
import {
  maxStructuralChildNestingDepth,
  structuralLevelForMaxChildNestingDepth,
  type PromotionNode,
} from '../src/level-promotion.js';

function structural(children: readonly PromotionNode[] = []): PromotionNode {
  return { children };
}

function wrapper(children: readonly PromotionNode[] = []): PromotionNode {
  return { kind: 'wrapper', children };
}

function annotation(): PromotionNode {
  return { kind: 'annotation' };
}

describe('level promotion helper', () => {
  it('maps max child nesting depth onto the structural levels', () => {
    expect(structuralLevelForMaxChildNestingDepth(0)).toBe(1);
    expect(structuralLevelForMaxChildNestingDepth(1)).toBe(2);
    expect(structuralLevelForMaxChildNestingDepth(2)).toBe(3);
    expect(structuralLevelForMaxChildNestingDepth(4)).toBe(3);
  });

  it('ignores wrappers as tiers while still traversing through them', () => {
    expect(maxStructuralChildNestingDepth(structural())).toBe(0);
    expect(maxStructuralChildNestingDepth(structural([structural()]))).toBe(1);
    expect(maxStructuralChildNestingDepth(structural([
      wrapper([structural([wrapper([structural()])])]),
    ]))).toBe(2);
  });

  it('ignores annotations when computing structural depth', () => {
    expect(maxStructuralChildNestingDepth(structural([annotation()]))).toBe(0);
    expect(maxStructuralChildNestingDepth(structural([
      annotation(),
      structural([annotation(), structural()]),
    ]))).toBe(2);
  });
});
