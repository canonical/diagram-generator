import { describe, it, expect, beforeEach } from 'vitest';
import {
  distributeFillSpace,
  alignOffset,
  measure,
  place,
  remeasureWithWidthConstraints,
  layoutFrameTree,
} from '../src/layout.js';
import {
  Frame, Direction, Sizing, Align, Border, Fill, Justify,
  enforceFillHugInvariant, createLine,
} from '../src/frame-model.js';
import { BASELINE_UNIT, BLOCK_WIDTH, roundUpToGrid } from '../src/tokens.js';
import { MockTextAdapter } from '../src/text-measure.js';
import { applyTextLayoutDefaults, resolveLeafTextWrapWidth } from '../src/text-layout.js';
import { leafIconColumnWidth } from '../src/spatial.js';
import { applyHeadingAsChild, findSyntheticBody } from '../src/heading-synthesis.js';

const adapter = new MockTextAdapter();

function snapshotSemanticSizing(frame: Frame): object {
  return {
    id: frame.id,
    sizingW: frame.sizingW,
    sizingH: frame.sizingH,
    width: frame.width,
    height: frame.height,
    children: frame.children.map(snapshotSemanticSizing),
  };
}

// ---------------------------------------------------------------------------
// distributeFillSpace
// ---------------------------------------------------------------------------

describe('distributeFillSpace', () => {
  it('equal split among two children', () => {
    const sizes = distributeFillSpace(160, [50, 50]);
    expect(sizes[0]).toBe(80);
    expect(sizes[1]).toBe(80);
  });

  it('returns empty for no children', () => {
    expect(distributeFillSpace(100, [])).toEqual([]);
  });

  it('single child gets all available space', () => {
    const sizes = distributeFillSpace(200, [50]);
    expect(sizes[0]).toBe(200);
  });

  it('preserves exact available space for unconstrained shares', () => {
    const sizes = distributeFillSpace(100, [0, 0]);
    expect(sizes[0]).toBeCloseTo(50, 6);
    expect(sizes[1]).toBeCloseTo(50, 6);
    expect(sizes[0]! + sizes[1]!).toBeCloseTo(100, 6);
  });

  it('min constraint floors the child size', () => {
    // 2 children, 80 available, child 0 has min 60 → child 0 gets 64 (rounded up), child 1 gets rest
    const sizes = distributeFillSpace(80, [0, 0], [60, undefined]);
    expect(sizes[0]).toBeGreaterThanOrEqual(60);
    expect(sizes[0]! + sizes[1]!).toBeLessThanOrEqual(80);
  });

  it('max constraint caps the child size', () => {
    // 2 children, 200 available, child 0 has max 40
    const sizes = distributeFillSpace(200, [0, 0], undefined, [40, undefined]);
    expect(sizes[0]).toBeLessThanOrEqual(40);
    expect(sizes[1]).toBeGreaterThan(40); // gets the remainder
  });

  it('FILL children shrink below measured content size', () => {
    // Parent is smaller than children's measured sizes → children must shrink
    const sizes = distributeFillSpace(80, [100, 100]);
    expect(sizes[0]).toBe(40);
    expect(sizes[1]).toBe(40);
    expect(sizes[0]! + sizes[1]!).toBeLessThanOrEqual(80);
  });

  it('weighted 2:1 split gives double space to heavier child', () => {
    const sizes = distributeFillSpace(120, [0, 0], undefined, undefined, [2, 1]);
    expect(sizes[0]).toBeCloseTo(80, 6);
    expect(sizes[1]).toBeCloseTo(40, 6);
  });

  it('default weights (all 1) preserve equal split', () => {
    const sizes = distributeFillSpace(160, [50, 50], undefined, undefined, [1, 1]);
    expect(sizes[0]).toBe(80);
    expect(sizes[1]).toBe(80);
  });

  it('weight 0 gives zero space to that child', () => {
    const sizes = distributeFillSpace(120, [0, 0], undefined, undefined, [0, 1]);
    expect(sizes[0]).toBeCloseTo(0, 6);
    expect(sizes[1]).toBeCloseTo(120, 6);
  });

  it('weighted split with min constraint clamps and redistributes', () => {
    // 3 children, weights 1:1:2, 200 available, child 0 has min 80
    // Equal-weight share for child 0 would be 200*(1/4) = 50, but min is 80
    const sizes = distributeFillSpace(200, [0, 0, 0], [80, undefined, undefined], undefined, [1, 1, 2]);
    expect(sizes[0]).toBeGreaterThanOrEqual(80);
    expect(sizes[0]! + sizes[1]! + sizes[2]!).toBeLessThanOrEqual(200 + 1);
  });

  it('weighted split with max constraint clamps and redistributes', () => {
    // 2 children, weights 2:1, 300 available, child 0 has max 100
    const sizes = distributeFillSpace(300, [0, 0], undefined, [100, undefined], [2, 1]);
    expect(sizes[0]).toBeLessThanOrEqual(100);
    expect(sizes[1]).toBeGreaterThan(100);
  });

  it('three children with weights 1:2:3 distribute proportionally', () => {
    const sizes = distributeFillSpace(120, [0, 0, 0], undefined, undefined, [1, 2, 3]);
    expect(sizes[0]).toBeCloseTo(20, 6);
    expect(sizes[1]).toBeCloseTo(40, 6);
    expect(sizes[2]).toBeCloseTo(60, 6);
  });
});

// ---------------------------------------------------------------------------
// alignOffset
// ---------------------------------------------------------------------------

describe('alignOffset', () => {
  it('LEFT alignment returns 0 on x-axis', () => {
    expect(alignOffset(Align.TOP_LEFT, 200, 100, 'x')).toBe(0);
    expect(alignOffset(Align.CENTER_LEFT, 200, 100, 'x')).toBe(0);
  });

  it('CENTER alignment returns half slack on x-axis', () => {
    expect(alignOffset(Align.TOP_CENTER, 200, 100, 'x')).toBe(50);
  });

  it('RIGHT alignment returns full slack on x-axis', () => {
    expect(alignOffset(Align.TOP_RIGHT, 200, 100, 'x')).toBe(100);
  });

  it('TOP alignment returns 0 on y-axis', () => {
    expect(alignOffset(Align.TOP_LEFT, 200, 100, 'y')).toBe(0);
  });

  it('BOTTOM alignment returns full slack on y-axis', () => {
    expect(alignOffset(Align.BOTTOM_LEFT, 200, 100, 'y')).toBe(100);
  });

  it('no slack returns 0', () => {
    expect(alignOffset(Align.CENTER, 100, 100, 'x')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// measure
// ---------------------------------------------------------------------------

describe('measure', () => {
  it('measures a HUG leaf at grid-snapped content width', () => {
    const leaf = new Frame({
      id: 'leaf',
      label: [createLine('Hello')],
      border: Border.SOLID,
    });
    measure(leaf, adapter);
    // HUG sizing: width = roundUpToGrid(content), not clamped to BLOCK_WIDTH
    expect(leaf._layout.measuredW).toBeGreaterThan(0);
    expect(leaf._layout.measuredW % BASELINE_UNIT).toBe(0);
    expect(leaf._layout.measuredH).toBeGreaterThan(0);
    expect(leaf._layout.measuredH % BASELINE_UNIT).toBe(0);
  });

  it('includes leaf heading lines in measured height', () => {
    const bodyOnly = new Frame({
      id: 'body-only',
      label: [
        createLine('Body line 1'),
        createLine('Body line 2'),
        createLine('Body line 3'),
      ],
      border: Border.SOLID,
    });
    const withHeading = new Frame({
      id: 'with-heading',
      heading: createLine('Heading', { weight: '700' }),
      label: [
        createLine('Body line 1'),
        createLine('Body line 2'),
        createLine('Body line 3'),
      ],
      border: Border.SOLID,
    });

    measure(bodyOnly, adapter);
    measure(withHeading, adapter);

    expect(withHeading._layout.measuredH).toBeGreaterThan(bodyOnly._layout.measuredH);
  });

  it('measures a container as sum of children plus padding and gaps', () => {
    const c1 = new Frame({ id: 'c1', sizingW: Sizing.FIXED, sizingH: Sizing.FIXED, width: 96, height: 48 });
    const c2 = new Frame({ id: 'c2', sizingW: Sizing.FIXED, sizingH: Sizing.FIXED, width: 96, height: 48 });
    const parent = new Frame({
      id: 'parent',
      direction: Direction.VERTICAL,
      padding: 8,
      gap: 24,
      children: [c1, c2],
    });
    measure(parent, adapter);
    // Width: max(96, 96) + 2*8 = 112 → already grid-aligned
    expect(parent._layout.measuredW).toBe(112);
    // Height: 48 + 24 + 48 + 2*8 = 136 → already grid-aligned
    expect(parent._layout.measuredH).toBe(136);
  });

  it('FIXED leaf uses explicit dimensions', () => {
    const leaf = new Frame({
      id: 'fixed',
      sizingW: Sizing.FIXED,
      sizingH: Sizing.FIXED,
      width: 300,
      height: 200,
    });
    measure(leaf, adapter);
    expect(leaf._layout.measuredW).toBe(roundUpToGrid(300));
    expect(leaf._layout.measuredH).toBe(roundUpToGrid(200));
  });
});

// ---------------------------------------------------------------------------
// place
// ---------------------------------------------------------------------------

describe('place', () => {
  it('places a FILL leaf at available size', () => {
    const leaf = new Frame({
      id: 'fill-leaf',
      sizingW: Sizing.FILL,
      sizingH: Sizing.FILL,
    });
    measure(leaf, adapter);
    place(leaf, 10, 20, 200, 100, adapter);
    expect(leaf._layout.placedX).toBe(10);
    expect(leaf._layout.placedY).toBe(20);
    expect(leaf._layout.placedW).toBe(200);
    expect(leaf._layout.placedH).toBe(100);
  });

  it('places children sequentially in vertical container', () => {
    const c1 = new Frame({ id: 'c1', sizingW: Sizing.FILL, sizingH: Sizing.FIXED, height: 40 });
    const c2 = new Frame({ id: 'c2', sizingW: Sizing.FILL, sizingH: Sizing.FIXED, height: 40 });
    const parent = new Frame({
      id: 'parent',
      direction: Direction.VERTICAL,
      sizingW: Sizing.FIXED,
      sizingH: Sizing.FIXED,
      width: 200,
      height: 200,
      padding: 8,
      gap: 16,
      children: [c1, c2],
    });
    measure(parent, adapter);
    place(parent, 0, 0, 200, 200, adapter);

    // c1 starts at padding offset
    expect(c1._layout.placedX).toBe(8);
    expect(c1._layout.placedY).toBe(8);
    expect(c1._layout.placedH).toBe(40);

    // c2 starts after c1 + gap
    expect(c2._layout.placedX).toBe(8);
    expect(c2._layout.placedY).toBe(8 + 40 + 16);
    expect(c2._layout.placedH).toBe(40);
  });

  it('FILL children share space equally in vertical container', () => {
    const c1 = new Frame({ id: 'c1', sizingW: Sizing.FILL, sizingH: Sizing.FILL });
    const c2 = new Frame({ id: 'c2', sizingW: Sizing.FILL, sizingH: Sizing.FILL });
    const parent = new Frame({
      id: 'parent',
      direction: Direction.VERTICAL,
      sizingW: Sizing.FIXED,
      sizingH: Sizing.FIXED,
      width: 200,
      height: 200,
      padding: 8,
      gap: 8,
      children: [c1, c2],
    });
    measure(parent, adapter);
    place(parent, 0, 0, 200, 200, adapter);

    // Available for children: 200 - 8 - 8 - 8 (gap) = 176
    // Each FILL child gets 176/2 = 88
    const totalChildH = c1._layout.placedH + c2._layout.placedH;
    expect(c1._layout.placedH).toBe(c2._layout.placedH);
    expect(totalChildH + 8).toBeLessThanOrEqual(200 - 16); // gap + padding fits
  });

  it('keeps explicit FILL siblings equal when the parent is not grid-divisible', () => {
    const c1 = new Frame({ id: 'c1', sizingW: Sizing.FILL, sizingH: Sizing.FILL });
    const c2 = new Frame({ id: 'c2', sizingW: Sizing.FILL, sizingH: Sizing.FILL });
    const c3 = new Frame({ id: 'c3', sizingW: Sizing.FILL, sizingH: Sizing.FILL });
    const parent = new Frame({
      id: 'parent',
      direction: Direction.VERTICAL,
      sizingW: Sizing.FIXED,
      sizingH: Sizing.FIXED,
      width: 200,
      height: 104,
      padding: 0,
      gap: 0,
      border: Border.NONE,
      children: [c1, c2, c3],
    });

    measure(parent, adapter);
    place(parent, 0, 0, 200, 104, adapter);

    expect(c1._layout.placedH).toBeCloseTo(104 / 3, 6);
    expect(c1._layout.placedH).toBeCloseTo(c2._layout.placedH, 6);
    expect(c2._layout.placedH).toBeCloseTo(c3._layout.placedH, 6);
    expect(c1._layout.placedH + c2._layout.placedH + c3._layout.placedH).toBeCloseTo(104, 6);
  });

  it('cross-axis FILL stretches to parent width', () => {
    const c1 = new Frame({ id: 'c1', sizingW: Sizing.FILL, sizingH: Sizing.FIXED, height: 40 });
    const parent = new Frame({
      id: 'parent',
      direction: Direction.VERTICAL,
      sizingW: Sizing.FIXED,
      sizingH: Sizing.FIXED,
      width: 300,
      height: 200,
      padding: 8,
      children: [c1],
    });
    measure(parent, adapter);
    place(parent, 0, 0, 300, 200, adapter);

    // Cross-axis (W): a stroked parent loses 2px of usable inner width.
    expect(c1._layout.placedW).toBe(parent._layout.placedW - 16 - 2);
  });
});

// ---------------------------------------------------------------------------
// layoutFrameTree (full pipeline)
// ---------------------------------------------------------------------------

describe('layoutFrameTree', () => {
  it('runs the full pipeline and returns dimensions', () => {
    const child = new Frame({
      id: 'child',
      sizingW: Sizing.FILL,
      sizingH: Sizing.FILL,
      label: [createLine('Content')],
    });
    const root = new Frame({
      id: 'root',
      direction: Direction.VERTICAL,
      padding: 8,
      children: [child],
    });

    const result = layoutFrameTree(root, adapter);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(result.width % BASELINE_UNIT).toBe(0);
    expect(result.height % BASELINE_UNIT).toBe(0);
  });

  it('keeps semantic sizing fields unchanged when coercion is applied', () => {
    const child = new Frame({
      id: 'child',
      sizingW: Sizing.FILL,
      sizingH: Sizing.FILL,
    });
    const root = new Frame({
      id: 'root',
      direction: Direction.VERTICAL,
      sizingW: Sizing.HUG,
      sizingH: Sizing.HUG,
      padding: 8,
      children: [child],
    });

    const result = layoutFrameTree(root, adapter);
    // Parent reports a coercion override without rewriting semantic sizing.
    expect(root.sizingH).toBe(Sizing.HUG);
    expect(result.coerced.has('root')).toBe(true);
  });

  it('preserves padding with FILL children (the original bug scenario)', () => {
    // Two FILL children in a FIXED parent — children should NOT overflow padding
    const c1 = new Frame({ id: 'c1', sizingH: Sizing.FILL, sizingW: Sizing.FILL });
    const c2 = new Frame({ id: 'c2', sizingH: Sizing.FILL, sizingW: Sizing.FILL });
    const parent = new Frame({
      id: 'parent',
      direction: Direction.VERTICAL,
      sizingW: Sizing.FIXED,
      sizingH: Sizing.FIXED,
      width: 200,
      height: 200,
      padding: 8,
      gap: 8,
      children: [c1, c2],
    });

    layoutFrameTree(parent, adapter);

    // Bottom of last child + padding should not exceed parent bottom
    const parentBottom = parent._layout.placedY + parent._layout.placedH;
    const lastChildBottom = c2._layout.placedY + c2._layout.placedH;
    expect(lastChildBottom + 8).toBeLessThanOrEqual(parentBottom);
  });

  it('expands root width to the next snapped fill-column width', () => {
    const children = Array.from({ length: 5 }, (_, index) => new Frame({
      id: `step-${index}`,
      sizingW: Sizing.FILL,
      sizingH: Sizing.FILL,
      border: Border.NONE,
    }));
    const root = new Frame({
      id: 'page',
      direction: Direction.HORIZONTAL,
      sizingW: Sizing.FIXED,
      sizingH: Sizing.FIXED,
      width: 1440,
      height: 280,
      gap: 24,
      padding: 24,
      border: Border.NONE,
      children,
    });

    const result = layoutFrameTree(root, adapter);

    expect(root.width).toBe(1440);
    expect(result.width).toBe(1464);
    for (const [index, child] of children.entries()) {
      expect(child._layout.placedW).toBe(264);
      expect(child._layout.placedX).toBe(24 + index * (264 + 24));
    }
  });

  it('nested containers produce consistent coordinates', () => {
    const leaf1 = new Frame({ id: 'leaf1', sizingW: Sizing.FILL, sizingH: Sizing.FIXED, height: 40 });
    const leaf2 = new Frame({ id: 'leaf2', sizingW: Sizing.FILL, sizingH: Sizing.FIXED, height: 40 });
    const inner = new Frame({
      id: 'inner',
      direction: Direction.VERTICAL,
      sizingW: Sizing.FILL,
      sizingH: Sizing.FILL,
      padding: 4,
      gap: 4,
      children: [leaf1, leaf2],
    });
    const outer = new Frame({
      id: 'outer',
      direction: Direction.VERTICAL,
      sizingW: Sizing.FIXED,
      sizingH: Sizing.FIXED,
      width: 300,
      height: 300,
      padding: 8,
      children: [inner],
    });

    layoutFrameTree(outer, adapter);

    // Inner should be inside outer's padding
    expect(inner._layout.placedX).toBeGreaterThanOrEqual(outer._layout.placedX + 8);
    expect(inner._layout.placedY).toBeGreaterThanOrEqual(outer._layout.placedY + 8);

    // Leaves should be inside inner's padding
    expect(leaf1._layout.placedX).toBeGreaterThanOrEqual(inner._layout.placedX + 4);
    expect(leaf1._layout.placedY).toBeGreaterThanOrEqual(inner._layout.placedY + 4);
  });

  it('keeps semantic fields stable across repeated layout (idempotency)', () => {
    const child = new Frame({
      id: 'child',
      sizingW: Sizing.FILL,
      sizingH: Sizing.FILL,
      label: [createLine('Content')],
    });
    const root = new Frame({
      id: 'root',
      direction: Direction.VERTICAL,
      sizingW: Sizing.FIXED,
      sizingH: Sizing.HUG,
      width: 200,
      padding: 8,
      children: [child],
    });

    const before = snapshotSemanticSizing(root);
    const first = layoutFrameTree(root, adapter);
    expect(first.coerced.get('root')).toMatchObject({ sizingH: 'FIXED' });
    expect(snapshotSemanticSizing(root)).toEqual(before);

    const second = layoutFrameTree(root, adapter);
    expect(snapshotSemanticSizing(root)).toEqual(before);
    expect(second.width).toBe(first.width);
    expect(second.height).toBe(first.height);
  });

  it('preserves semantic fields with coercion, col_span, and grid equalization', () => {
    const spanLeaf = new Frame({
      id: 'span_leaf',
      label: [createLine('Spanning child')],
      sizingW: Sizing.FILL,
      sizingH: Sizing.HUG,
      colSpan: 2,
    });
    const leftCol = new Frame({
      id: 'left_col',
      direction: Direction.VERTICAL,
      sizingW: Sizing.FILL,
      sizingH: Sizing.HUG,
      children: [spanLeaf],
    });
    const rightCol = new Frame({
      id: 'right_col',
      direction: Direction.VERTICAL,
      sizingW: Sizing.FILL,
      sizingH: Sizing.HUG,
      children: [new Frame({ id: 'r1', sizingH: Sizing.FIXED, height: 64, label: [createLine('R')] })],
    });
    const root = new Frame({
      id: 'root',
      direction: Direction.HORIZONTAL,
      sizingW: Sizing.HUG,
      sizingH: Sizing.HUG,
      padding: 24,
      children: [leftCol, rightCol],
    });

    const before = snapshotSemanticSizing(root);
    const gridOpts = { gridCols: 4, gridColGap: 24, gridOuterMargin: 24 };

    layoutFrameTree(root, adapter, gridOpts);
    expect(snapshotSemanticSizing(root)).toEqual(before);
    expect(spanLeaf.sizingW).toBe(Sizing.FILL);
    expect(spanLeaf.width).toBeUndefined();
    expect(spanLeaf._layout.placedW).toBeGreaterThan(0);

    layoutFrameTree(root, adapter, gridOpts);
    expect(snapshotSemanticSizing(root)).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// Coercion lifecycle
// ---------------------------------------------------------------------------

describe('coercion lifecycle', () => {
  it('coerces HUG parent when child becomes FILL, reverts when child set back to HUG', () => {
    const c1 = new Frame({ id: 'c1', sizingH: Sizing.FILL });
    const c2 = new Frame({ id: 'c2', sizingH: Sizing.HUG });
    c1.text = 'hello';
    c2.text = 'world';
    const root = new Frame({
      id: 'root',
      direction: Direction.VERTICAL,
      sizingH: Sizing.HUG,
      sizingW: Sizing.FIXED,
      width: 200,
      children: [c1, c2],
    });

    // Layout 1: c1 is FILL → root coerced to FIXED
    const r1 = layoutFrameTree(root, adapter);
    expect(r1.coerced.has('root')).toBe(true);
    expect(root.sizingH).toBe(Sizing.HUG);
    const coercedHeight = r1.coerced.get('root')?.height;
    expect(coercedHeight).toBeGreaterThan(0);

    // Layout 2: change c1 to HUG → no coercion
    c1.sizingH = Sizing.HUG;
    const r2 = layoutFrameTree(root, adapter);
    expect(r2.coerced.has('root')).toBe(false);
    expect(r2.coerced.size).toBe(0);
    expect(root.sizingH).toBe(Sizing.HUG);
  });

  it('coercion persists when only some FILL children are removed', () => {
    const c1 = new Frame({ id: 'c1', sizingH: Sizing.FILL });
    const c2 = new Frame({ id: 'c2', sizingH: Sizing.FILL });
    const c3 = new Frame({ id: 'c3', sizingH: Sizing.HUG });
    c1.text = 'a';
    c2.text = 'b';
    c3.text = 'c';
    const root = new Frame({
      id: 'root',
      direction: Direction.VERTICAL,
      sizingH: Sizing.HUG,
      sizingW: Sizing.FIXED,
      width: 200,
      children: [c1, c2, c3],
    });

    // Layout 1: two FILL children → coerced
    const r1 = layoutFrameTree(root, adapter);
    expect(r1.coerced.has('root')).toBe(true);

    // Layout 2: remove one FILL child (set to HUG), one FILL remains → still coerced
    c1.sizingH = Sizing.HUG;
    const r2 = layoutFrameTree(root, adapter);
    expect(r2.coerced.has('root')).toBe(true);
    expect(root.sizingH).toBe(Sizing.HUG);

    // Layout 3: remove last FILL child → no coercion
    c2.sizingH = Sizing.HUG;
    const r3 = layoutFrameTree(root, adapter);
    expect(r3.coerced.has('root')).toBe(false);
    expect(root.sizingH).toBe(Sizing.HUG);
  });

  it('coercion map includes correct override values', () => {
    const child = new Frame({ id: 'child', sizingH: Sizing.FILL });
    child.text = 'some text here';
    const root = new Frame({
      id: 'root',
      direction: Direction.VERTICAL,
      sizingH: Sizing.HUG,
      sizingW: Sizing.FIXED,
      width: 200,
      children: [child],
    });

    const result = layoutFrameTree(root, adapter);
    expect(result.coerced.has('root')).toBe(true);
    const override = result.coerced.get('root')!;
    expect(override.sizingH).toBe('FIXED');
    expect(override.height).toBe(result.height);
    // Width should not be in the override (not coerced)
    expect(override.sizingW).toBeUndefined();
    expect(override.width).toBeUndefined();
  });

  it('horizontal coercion lifecycle on width axis', () => {
    const c1 = new Frame({ id: 'c1', sizingW: Sizing.FILL });
    const c2 = new Frame({ id: 'c2', sizingW: Sizing.HUG });
    c1.text = 'x';
    c2.text = 'y';
    const root = new Frame({
      id: 'root',
      direction: Direction.HORIZONTAL,
      sizingW: Sizing.HUG,
      sizingH: Sizing.FIXED,
      height: 100,
      children: [c1, c2],
    });

    // Layout 1: c1 FILL on primary (W) → coerced
    const r1 = layoutFrameTree(root, adapter);
    expect(r1.coerced.has('root')).toBe(true);
    expect(root.sizingW).toBe(Sizing.HUG);

    // Layout 2: remove FILL → no coercion
    c1.sizingW = Sizing.HUG;
    const r2 = layoutFrameTree(root, adapter);
    expect(r2.coerced.has('root')).toBe(false);
    expect(root.sizingW).toBe(Sizing.HUG);
  });

  it('nested coercion: inner and outer both coerce and revert independently', () => {
    const leaf = new Frame({ id: 'leaf', sizingH: Sizing.FILL });
    leaf.text = 'leaf';
    const inner = new Frame({
      id: 'inner',
      direction: Direction.VERTICAL,
      sizingH: Sizing.HUG,
      sizingW: Sizing.FIXED,
      width: 150,
      children: [leaf],
    });
    const sibling = new Frame({ id: 'sibling', sizingH: Sizing.FILL });
    sibling.text = 'sib';
    const outer = new Frame({
      id: 'outer',
      direction: Direction.VERTICAL,
      sizingH: Sizing.HUG,
      sizingW: Sizing.FIXED,
      width: 200,
      children: [inner, sibling],
    });

    // Layout 1: both inner and outer coerced
    const r1 = layoutFrameTree(outer, adapter);
    expect(r1.coerced.has('inner')).toBe(true);
    expect(r1.coerced.has('outer')).toBe(true);

    // Layout 2: remove leaf's FILL → inner reverts, outer still coerced (sibling is FILL)
    leaf.sizingH = Sizing.HUG;
    const r2 = layoutFrameTree(outer, adapter);
    expect(r2.coerced.has('inner')).toBe(false);
    expect(r2.coerced.has('outer')).toBe(true);

    // Layout 3: also remove sibling's FILL → both revert
    sibling.sizingH = Sizing.HUG;
    const r3 = layoutFrameTree(outer, adapter);
    expect(r3.coerced.has('inner')).toBe(false);
    expect(r3.coerced.has('outer')).toBe(false);
  });

  it('cross-axis FILL does not coerce parent', () => {
    // Vertical container: FILL-width children should stretch to parent width
    // WITHOUT coercing the parent's sizingW to FIXED.
    const c1 = new Frame({ id: 'c1', sizingW: Sizing.FILL, sizingH: Sizing.HUG });
    const c2 = new Frame({ id: 'c2', sizingW: Sizing.FILL, sizingH: Sizing.HUG });
    c1.text = 'hello';
    c2.text = 'world';
    const root = new Frame({
      id: 'root',
      direction: Direction.VERTICAL,
      sizingW: Sizing.HUG,
      sizingH: Sizing.HUG,
      children: [c1, c2],
    });

    const result = layoutFrameTree(root, adapter);
    // Width stays HUG (cross-axis FILL is not coerced)
    expect(root.sizingW).toBe(Sizing.HUG);
    // Height stays HUG (no FILL on primary axis)
    expect(root.sizingH).toBe(Sizing.HUG);
    expect(result.coerced.size).toBe(0);
  });

  it('mixed FILL/HUG children: HUG children take natural size, FILL splits remainder', () => {
    const hugChild = new Frame({ id: 'hug', sizingH: Sizing.HUG });
    hugChild.text = 'hug';
    const fillChild1 = new Frame({ id: 'fill1', sizingH: Sizing.FILL });
    fillChild1.text = 'f1';
    const fillChild2 = new Frame({ id: 'fill2', sizingH: Sizing.FILL });
    fillChild2.text = 'f2';
    const root = new Frame({
      id: 'root',
      direction: Direction.VERTICAL,
      sizingW: Sizing.FIXED,
      sizingH: Sizing.FIXED,
      width: 200,
      height: 300,
      gap: 0,
      padding: 0,
      children: [hugChild, fillChild1, fillChild2],
    });

    layoutFrameTree(root, adapter);

    // HUG child should have its natural measured height
    const hugH = hugChild._layout.placedH;
    expect(hugH).toBeGreaterThan(0);

    // FILL children should split the remaining space equally
    const totalAvail = 300; // parent height, no padding, no gap
    const remaining = totalAvail - hugH;
    const expectedFillH = remaining / 2;
    // Allow ±4px for baseline grid snapping
    expect(Math.abs(fillChild1._layout.placedH - expectedFillH)).toBeLessThanOrEqual(4);
    expect(Math.abs(fillChild2._layout.placedH - expectedFillH)).toBeLessThanOrEqual(4);
    // Both FILL children should be the same height
    expect(fillChild1._layout.placedH).toBe(fillChild2._layout.placedH);
  });
});

// ---------------------------------------------------------------------------
// Heading-as-child layout consistency
// ---------------------------------------------------------------------------

describe('heading-as-child layout consistency', () => {
  it('heading child wraps at narrow width and siblings get correct available space', () => {
    // A container with a heading child placed at a narrow width.
    // The heading text is long enough to wrap at the placed width but
    // not at the unconstrained measure width.
    const headingChild = new Frame({
      id: 'parent__heading',
      direction: Direction.VERTICAL,
      sizingW: Sizing.FILL,
      sizingH: Sizing.HUG,
      minHeight: 56,
      border: Border.NONE,
      padding: 8,
      label: [createLine(
        'This is a very long heading that will definitely wrap at narrow widths because it is many characters wide',
      )],
      role: 'heading',
    });
    const child = new Frame({
      id: 'leaf',
      sizingH: Sizing.HUG,
      label: [createLine('child')],
    });
    const parent = new Frame({
      id: 'parent',
      direction: Direction.VERTICAL,
      padding: 8,
      border: Border.SOLID,
      children: [headingChild, child],
    });

    // Layout at a narrow available width to force heading wrapping
    layoutFrameTree(parent, adapter, 120);

    // The child should not overflow the parent's bottom padding.
    // childBottom = child.placedY + child.placedH
    // parentBottom = parent.placedY + parent.placedH - padding_bottom
    const childBottom = child._layout.placedY + child._layout.placedH;
    const parentBottom = parent._layout.placedY + parent._layout.placedH - 8;
    expect(childBottom).toBeLessThanOrEqual(parentBottom);
  });

  it('headed fixed-height containers let body children fill the remaining vertical space', () => {
    const child = new Frame({
      id: 'leaf',
      sizingW: Sizing.FILL,
      sizingH: Sizing.FILL,
      width: 192,
      height: 64,
      label: [createLine('child')],
    });
    const parent = new Frame({
      id: 'parent',
      direction: Direction.VERTICAL,
      sizingW: Sizing.FIXED,
      sizingH: Sizing.FIXED,
      width: 432,
      height: 352,
      align: Align.CENTER,
      border: Border.SOLID,
      children: [child],
    });

    applyHeadingAsChild(parent, createLine('Title', { weight: '700' }));
    const body = findSyntheticBody(parent)!;

    layoutFrameTree(parent, adapter);

    expect(body.sizingH).toBe(Sizing.FILL);
    expect(body._layout.placedH).toBeGreaterThan(child._layout.measuredH);
    expect(child._layout.placedH).toBe(body._layout.placedH);
  });
});


describe('border thickness in layout math', () => {
  it('SOLID borders reduce cross-axis space for FILL children by 2px', () => {
    const noneChild = new Frame({
      id: 'none-child',
      sizingW: Sizing.FILL,
      sizingH: Sizing.FIXED,
      width: 64,
      height: 64,
      label: [createLine('child')],
    });
    const noneParent = new Frame({
      id: 'none-parent',
      direction: Direction.VERTICAL,
      sizingW: Sizing.FIXED,
      sizingH: Sizing.FIXED,
      width: 200,
      height: 120,
      padding: 8,
      border: Border.NONE,
      children: [noneChild],
    });
    layoutFrameTree(noneParent, adapter, 200, 120);

    const solidChild = new Frame({
      id: 'solid-child',
      sizingW: Sizing.FILL,
      sizingH: Sizing.FIXED,
      width: 64,
      height: 64,
      label: [createLine('child')],
    });
    const solidParent = new Frame({
      id: 'solid-parent',
      direction: Direction.VERTICAL,
      sizingW: Sizing.FIXED,
      sizingH: Sizing.FIXED,
      width: 200,
      height: 120,
      padding: 8,
      border: Border.SOLID,
      children: [solidChild],
    });
    layoutFrameTree(solidParent, adapter, 200, 120);

    expect(noneChild._layout.placedX).toBe(8);
    expect(noneChild._layout.placedW).toBe(184);
    expect(solidChild._layout.placedX).toBe(8);
    expect(solidChild._layout.placedW).toBe(182);
  });
});


// ---------------------------------------------------------------------------
// Justify modes (space-between / space-around / space-evenly)
// ---------------------------------------------------------------------------

describe('justify modes', () => {
  /**
   * Helper: create a FIXED-size parent with N HUG children (each 40px wide on
   * primary axis) and a given justify mode. Returns the parent after layout.
   */
  function makeJustifiedParent(
    direction: Direction,
    justify: Justify,
    parentSize: number,
    childCount: number,
    childMainSize = 40,
  ): Frame {
    const children: Frame[] = [];
    for (let i = 0; i < childCount; i++) {
      children.push(new Frame({
        id: `c${i}`,
        sizingW: Sizing.FIXED,
        sizingH: Sizing.FIXED,
        width: direction === Direction.HORIZONTAL ? childMainSize : 40,
        height: direction === Direction.VERTICAL ? childMainSize : 40,
      }));
    }
    const parent = new Frame({
      id: 'parent',
      direction,
      justify,
      sizingW: Sizing.FIXED,
      sizingH: Sizing.FIXED,
      width: direction === Direction.HORIZONTAL ? parentSize : 200,
      height: direction === Direction.VERTICAL ? parentSize : 200,
      padding: 0,
      border: Border.NONE,
      gap: 999, // gap should be ignored for non-PACKED justify
    });
    parent.children = children;
    layoutFrameTree(parent, adapter);
    return parent;
  }

  function childPos(child: Frame, direction: Direction): number {
    return direction === Direction.HORIZONTAL ? child._layout.placedX : child._layout.placedY;
  }

  function childSize(child: Frame, direction: Direction): number {
    return direction === Direction.HORIZONTAL ? child._layout.placedW : child._layout.placedH;
  }

  // --- SPACE_BETWEEN ---

  it('SPACE_BETWEEN horizontal: first flush to start, last flush to end', () => {
    // 3 children × 40px = 120px content in 200px parent
    // Remaining = 80px, 2 gaps → 40px each
    const parent = makeJustifiedParent(Direction.HORIZONTAL, Justify.SPACE_BETWEEN, 200, 3);
    const positions = parent.children.map(c => childPos(c, Direction.HORIZONTAL));

    // First child at 0
    expect(positions[0]).toBe(0);
    // Last child at 200 - 40 = 160
    expect(positions[2]).toBeCloseTo(160, 0);
    // Spacing between consecutive children should be equal
    const gap1 = positions[1]! - (positions[0]! + childSize(parent.children[0]!, Direction.HORIZONTAL));
    const gap2 = positions[2]! - (positions[1]! + childSize(parent.children[1]!, Direction.HORIZONTAL));
    expect(Math.abs(gap1 - gap2)).toBeLessThanOrEqual(1);
  });

  it('SPACE_BETWEEN vertical: first flush to start, last flush to end', () => {
    const parent = makeJustifiedParent(Direction.VERTICAL, Justify.SPACE_BETWEEN, 200, 3);
    const positions = parent.children.map(c => childPos(c, Direction.VERTICAL));

    expect(positions[0]).toBe(0);
    expect(positions[2]).toBeCloseTo(160, 0);
  });

  it('SPACE_BETWEEN with 1 child: centered (0 gaps to distribute)', () => {
    const parent = makeJustifiedParent(Direction.HORIZONTAL, Justify.SPACE_BETWEEN, 200, 1);
    // With 1 child, spacing = 0, offset = 0 → child at start
    expect(childPos(parent.children[0]!, Direction.HORIZONTAL)).toBe(0);
  });

  // --- SPACE_AROUND ---

  it('SPACE_AROUND horizontal: half-spacing at edges, full spacing between', () => {
    // 3 children × 40px = 120px in 200px → remaining = 80px
    // per-child = 80/3 ≈ 26.67, offset = 13.33
    const parent = makeJustifiedParent(Direction.HORIZONTAL, Justify.SPACE_AROUND, 200, 3);
    const positions = parent.children.map(c => childPos(c, Direction.HORIZONTAL));

    const remaining = 200 - 3 * 40;
    const perChild = remaining / 3;
    const offset = perChild / 2;

    // First child starts at offset from parent start
    expect(positions[0]).toBeCloseTo(offset, 0);
    // Spacing between children should be equal
    const gap1 = positions[1]! - (positions[0]! + 40);
    const gap2 = positions[2]! - (positions[1]! + 40);
    expect(Math.abs(gap1 - gap2)).toBeLessThanOrEqual(1);
    // Gap should be ~perChild
    expect(gap1).toBeCloseTo(perChild, 0);
  });

  it('SPACE_AROUND vertical', () => {
    const parent = makeJustifiedParent(Direction.VERTICAL, Justify.SPACE_AROUND, 200, 3);
    const positions = parent.children.map(c => childPos(c, Direction.VERTICAL));

    const remaining = 200 - 3 * 40;
    const perChild = remaining / 3;
    const offset = perChild / 2;

    expect(positions[0]).toBeCloseTo(offset, 0);
  });

  // --- SPACE_EVENLY ---

  it('SPACE_EVENLY horizontal: equal spacing including edges', () => {
    // 3 children × 40px = 120px in 200px → remaining = 80px
    // 4 slots (n+1) → 20px each
    const parent = makeJustifiedParent(Direction.HORIZONTAL, Justify.SPACE_EVENLY, 200, 3);
    const positions = parent.children.map(c => childPos(c, Direction.HORIZONTAL));

    const remaining = 200 - 3 * 40;
    const spacing = remaining / 4;

    // First child at spacing from start
    expect(positions[0]).toBeCloseTo(spacing, 0);
    // Gaps between children
    const gap1 = positions[1]! - (positions[0]! + 40);
    const gap2 = positions[2]! - (positions[1]! + 40);
    expect(gap1).toBeCloseTo(spacing, 0);
    expect(gap2).toBeCloseTo(spacing, 0);
  });

  it('SPACE_EVENLY vertical: equal spacing including edges', () => {
    const parent = makeJustifiedParent(Direction.VERTICAL, Justify.SPACE_EVENLY, 200, 3);
    const positions = parent.children.map(c => childPos(c, Direction.VERTICAL));

    const remaining = 200 - 3 * 40;
    const spacing = remaining / 4;

    expect(positions[0]).toBeCloseTo(spacing, 0);
  });

  // --- PACKED (default) uses fixed gap ---

  it('PACKED uses fixed gap and ignores justify semantics', () => {
    // Verify that PACKED (default) still uses frame.gap between children
    const parent = makeJustifiedParent(Direction.HORIZONTAL, Justify.PACKED, 400, 2);
    // gap was set to 999 in the helper but PACKED uses it literally
    // The children are FIXED 40px, so gap = 999 between them
    const gap = childPos(parent.children[1]!, Direction.HORIZONTAL) -
      (childPos(parent.children[0]!, Direction.HORIZONTAL) + childSize(parent.children[0]!, Direction.HORIZONTAL));
    // With PACKED, gap should be the frame's gap (999)
    // Layout may clamp or the alignment may shift, but the inter-child
    // spacing should be frame.gap
    expect(gap).toBe(999);
  });

  // --- gap ignored for non-PACKED ---

  it('non-PACKED ignores frame.gap', () => {
    // Two identical layouts except one has gap=0 and the other gap=9999.
    // SPACE_BETWEEN should produce the same positions for both.
    const children1 = [
      new Frame({ id: 'a', sizingW: Sizing.FIXED, sizingH: Sizing.FIXED, width: 40, height: 40 }),
      new Frame({ id: 'b', sizingW: Sizing.FIXED, sizingH: Sizing.FIXED, width: 40, height: 40 }),
    ];
    const children2 = [
      new Frame({ id: 'a', sizingW: Sizing.FIXED, sizingH: Sizing.FIXED, width: 40, height: 40 }),
      new Frame({ id: 'b', sizingW: Sizing.FIXED, sizingH: Sizing.FIXED, width: 40, height: 40 }),
    ];
    const p1 = new Frame({
      id: 'p1', direction: Direction.HORIZONTAL, justify: Justify.SPACE_BETWEEN,
      sizingW: Sizing.FIXED, sizingH: Sizing.FIXED, width: 200, height: 40,
      padding: 0, border: Border.NONE, gap: 0, children: children1,
    });
    const p2 = new Frame({
      id: 'p2', direction: Direction.HORIZONTAL, justify: Justify.SPACE_BETWEEN,
      sizingW: Sizing.FIXED, sizingH: Sizing.FIXED, width: 200, height: 40,
      padding: 0, border: Border.NONE, gap: 9999, children: children2,
    });
    layoutFrameTree(p1, adapter);
    layoutFrameTree(p2, adapter);

    expect(p1.children[0]!._layout.placedX).toBe(p2.children[0]!._layout.placedX);
    expect(p1.children[1]!._layout.placedX).toBe(p2.children[1]!._layout.placedX);
  });

  // --- Cross-axis alignment still works ---

  it('SPACE_BETWEEN with cross-axis alignment', () => {
    // Vertical container with SPACE_BETWEEN: children of different widths
    // should still be aligned on cross-axis by parent's align property.
    const narrow = new Frame({
      id: 'narrow', sizingW: Sizing.FIXED, sizingH: Sizing.FIXED, width: 40, height: 40,
    });
    const wide = new Frame({
      id: 'wide', sizingW: Sizing.FIXED, sizingH: Sizing.FIXED, width: 80, height: 40,
    });
    const parent = new Frame({
      id: 'parent', direction: Direction.VERTICAL, justify: Justify.SPACE_BETWEEN,
      align: Align.TOP_RIGHT,
      sizingW: Sizing.FIXED, sizingH: Sizing.FIXED, width: 200, height: 200,
      padding: 0, border: Border.NONE, children: [narrow, wide],
    });
    layoutFrameTree(parent, adapter);

    // Cross-axis (X): TOP_RIGHT alignment → both children right-aligned
    // narrow: x = 200 - 40 = 160
    const narrowX = narrow._layout.placedX;
    const wideX = wide._layout.placedX;
    expect(narrowX).toBeCloseTo(160, 0);
    expect(wideX).toBeCloseTo(120, 0);

    // Primary axis (Y): SPACE_BETWEEN → first at 0, last at 200 - 40 = 160
    expect(narrow._layout.placedY).toBe(0);
    expect(wide._layout.placedY).toBeCloseTo(160, 0);
  });
});

// ---------------------------------------------------------------------------
// absolute positioning (Figma "Ignore auto layout")
// ---------------------------------------------------------------------------

describe('absolute positioning', () => {
  it('absolute child is excluded from parent flow and HUG sizing', () => {
    // Parent is HUG. Two auto children (each 40×40) + one absolute child (80×80).
    // The absolute child should NOT contribute to parent measured size.
    const auto1 = new Frame({ id: 'a1', sizingW: Sizing.FIXED, sizingH: Sizing.FIXED, width: 40, height: 40 });
    const auto2 = new Frame({ id: 'a2', sizingW: Sizing.FIXED, sizingH: Sizing.FIXED, width: 40, height: 40 });
    const abs = new Frame({ id: 'abs', positionType: 'ABSOLUTE', sizingW: Sizing.FIXED, sizingH: Sizing.FIXED, width: 80, height: 80, x: 10, y: 10 });
    const parent = new Frame({
      id: 'parent', direction: Direction.VERTICAL,
      sizingW: Sizing.HUG, sizingH: Sizing.HUG,
      padding: 0, border: Border.NONE, gap: 0,
      children: [auto1, abs, auto2],
    });
    layoutFrameTree(parent, adapter);

    // Parent hugs only auto children: 40 + 40 = 80 high, 40 wide
    expect(parent._layout.placedW).toBe(40);
    expect(parent._layout.placedH).toBe(80);

    // Auto children are placed sequentially as if abs child doesn't exist
    expect(auto1._layout.placedY).toBe(0);
    expect(auto2._layout.placedY).toBe(40);

    // Absolute child placed at its explicit x/y offset from parent origin
    expect(abs._layout.placedX).toBe(10);
    expect(abs._layout.placedY).toBe(10);
    expect(abs._layout.placedW).toBe(80);
    expect(abs._layout.placedH).toBe(80);
  });

  it('absolute child with FILL sizing stretches to parent content area', () => {
    const abs = new Frame({ id: 'abs', positionType: 'ABSOLUTE', sizingW: Sizing.FILL, sizingH: Sizing.FILL, x: 0, y: 0 });
    abs.label = [createLine('text')];
    const auto = new Frame({ id: 'auto', sizingW: Sizing.FIXED, sizingH: Sizing.FIXED, width: 100, height: 100 });
    const parent = new Frame({
      id: 'parent', direction: Direction.VERTICAL,
      sizingW: Sizing.FIXED, sizingH: Sizing.FIXED,
      width: 200, height: 200,
      padding: 8, border: Border.NONE,
      children: [auto, abs],
    });
    layoutFrameTree(parent, adapter);

    // FILL absolute child stretches to parent's content area (200 - 8 - 8 = 184)
    expect(abs._layout.placedW).toBe(184);
    expect(abs._layout.placedH).toBe(184);
    expect(abs._layout.placedX).toBe(8); // parent origin + padL + x
    expect(abs._layout.placedY).toBe(8); // parent origin + padT + y
  });

  it('absolute child does not affect FILL distribution among auto siblings', () => {
    const fill1 = new Frame({ id: 'f1', sizingW: Sizing.FIXED, sizingH: Sizing.FILL, width: 40 });
    fill1.label = [createLine('a')];
    const fill2 = new Frame({ id: 'f2', sizingW: Sizing.FIXED, sizingH: Sizing.FILL, width: 40 });
    fill2.label = [createLine('b')];
    const abs = new Frame({ id: 'abs', positionType: 'ABSOLUTE', sizingW: Sizing.FIXED, sizingH: Sizing.FIXED, width: 200, height: 200, x: 0, y: 0 });
    const parent = new Frame({
      id: 'parent', direction: Direction.VERTICAL,
      sizingW: Sizing.FIXED, sizingH: Sizing.FIXED,
      width: 200, height: 200,
      padding: 0, border: Border.NONE, gap: 0,
      children: [fill1, abs, fill2],
    });
    layoutFrameTree(parent, adapter);

    // Two FILL children split 200px equally, absolute child has no effect
    expect(fill1._layout.placedH).toBe(100);
    expect(fill2._layout.placedH).toBe(100);
    // Absolute child keeps its explicit dimensions
    expect(abs._layout.placedW).toBe(200);
    expect(abs._layout.placedH).toBe(200);
  });

  it('default positionType is AUTO', () => {
    const f = new Frame({ id: 'test' });
    expect(f.positionType).toBe('AUTO');
  });
});

// ---------------------------------------------------------------------------
// fillWeight (proportional FILL distribution)
// ---------------------------------------------------------------------------

describe('fillWeight', () => {
  it('2:1 weight split in horizontal parent', () => {
    const c1 = new Frame({ id: 'c1', sizingW: Sizing.FILL, fillWeight: 2, border: Border.NONE, padding: 0 });
    c1.label = [createLine('a')];
    const c2 = new Frame({ id: 'c2', sizingW: Sizing.FILL, fillWeight: 1, border: Border.NONE, padding: 0 });
    c2.label = [createLine('b')];
    const parent = new Frame({
      id: 'p', direction: Direction.HORIZONTAL,
      sizingW: Sizing.FIXED, sizingH: Sizing.HUG,
      width: 240, padding: 0, border: Border.NONE, gap: 0,
      children: [c1, c2],
    });
    layoutFrameTree(parent, adapter);
    expect(c1._layout.placedW).toBe(160);
    expect(c2._layout.placedW).toBe(80);
  });

  it('2:1 weight split in vertical parent', () => {
    const c1 = new Frame({ id: 'c1', sizingH: Sizing.FILL, fillWeight: 2, border: Border.NONE, padding: 0 });
    c1.label = [createLine('a')];
    const c2 = new Frame({ id: 'c2', sizingH: Sizing.FILL, fillWeight: 1, border: Border.NONE, padding: 0 });
    c2.label = [createLine('b')];
    const parent = new Frame({
      id: 'p', direction: Direction.VERTICAL,
      sizingW: Sizing.FIXED, sizingH: Sizing.FIXED,
      width: 100, height: 240, padding: 0, border: Border.NONE, gap: 0,
      children: [c1, c2],
    });
    layoutFrameTree(parent, adapter);
    expect(c1._layout.placedH).toBe(160);
    expect(c2._layout.placedH).toBe(80);
  });

  it('default fillWeight=1 preserves equal split', () => {
    const c1 = new Frame({ id: 'c1', sizingW: Sizing.FILL, border: Border.NONE, padding: 0 });
    c1.label = [createLine('a')];
    const c2 = new Frame({ id: 'c2', sizingW: Sizing.FILL, border: Border.NONE, padding: 0 });
    c2.label = [createLine('b')];
    const parent = new Frame({
      id: 'p', direction: Direction.HORIZONTAL,
      sizingW: Sizing.FIXED, sizingH: Sizing.HUG,
      width: 160, padding: 0, border: Border.NONE, gap: 0,
      children: [c1, c2],
    });
    layoutFrameTree(parent, adapter);
    expect(c1._layout.placedW).toBe(80);
    expect(c2._layout.placedW).toBe(80);
  });
});

// ---------------------------------------------------------------------------
// wrap mode
// ---------------------------------------------------------------------------

describe('wrap mode', () => {
  it('basic two-row wrap: children break when exceeding parent width', () => {
    // 3 children each 80px wide, parent 200px wide, gap 8
    // Row 1: child1 (80) + gap (8) + child2 (80) = 168 ≤ 200 → fits
    // Row 2: child3 (80)
    const c1 = new Frame({ id: 'c1', sizingW: Sizing.FIXED, sizingH: Sizing.FIXED, width: 80, height: 40, border: Border.NONE, padding: 0 });
    c1.label = [createLine('a')];
    const c2 = new Frame({ id: 'c2', sizingW: Sizing.FIXED, sizingH: Sizing.FIXED, width: 80, height: 40, border: Border.NONE, padding: 0 });
    c2.label = [createLine('b')];
    const c3 = new Frame({ id: 'c3', sizingW: Sizing.FIXED, sizingH: Sizing.FIXED, width: 80, height: 40, border: Border.NONE, padding: 0 });
    c3.label = [createLine('c')];

    const parent = new Frame({
      id: 'parent',
      direction: Direction.HORIZONTAL,
      wrap: true,
      sizingW: Sizing.FIXED,
      sizingH: Sizing.HUG,
      width: 200,
      padding: 0,
      border: Border.NONE,
      gap: 8,
      children: [c1, c2, c3],
    });

    layoutFrameTree(parent, adapter);

    // Row 1: c1 and c2 side by side
    expect(c1._layout.placedX).toBe(0);
    expect(c2._layout.placedX).toBe(88); // 80 + 8 gap
    expect(c1._layout.placedY).toBe(c2._layout.placedY); // same row

    // Row 2: c3 below
    expect(c3._layout.placedX).toBe(0);
    expect(c3._layout.placedY).toBe(48); // 40 + 8 gap

    // Parent height: 2 rows of 40 + gap 8 = 88
    expect(parent._layout.placedH).toBe(roundUpToGrid(88));
  });

  it('single row when all children fit', () => {
    const c1 = new Frame({ id: 'c1', sizingW: Sizing.FIXED, sizingH: Sizing.FIXED, width: 40, height: 32, border: Border.NONE, padding: 0 });
    c1.label = [createLine('a')];
    const c2 = new Frame({ id: 'c2', sizingW: Sizing.FIXED, sizingH: Sizing.FIXED, width: 40, height: 32, border: Border.NONE, padding: 0 });
    c2.label = [createLine('b')];

    const parent = new Frame({
      id: 'parent',
      direction: Direction.HORIZONTAL,
      wrap: true,
      sizingW: Sizing.FIXED,
      sizingH: Sizing.HUG,
      width: 200,
      padding: 0,
      border: Border.NONE,
      gap: 8,
      children: [c1, c2],
    });

    layoutFrameTree(parent, adapter);

    // Both on same row
    expect(c1._layout.placedY).toBe(c2._layout.placedY);
    expect(c2._layout.placedX).toBe(48); // 40 + 8
  });

  it('oversized single child gets its own row', () => {
    const wide = new Frame({ id: 'wide', sizingW: Sizing.FIXED, sizingH: Sizing.FIXED, width: 300, height: 40, border: Border.NONE, padding: 0 });
    wide.label = [createLine('w')];
    const small = new Frame({ id: 'small', sizingW: Sizing.FIXED, sizingH: Sizing.FIXED, width: 40, height: 40, border: Border.NONE, padding: 0 });
    small.label = [createLine('s')];

    const parent = new Frame({
      id: 'parent',
      direction: Direction.HORIZONTAL,
      wrap: true,
      sizingW: Sizing.FIXED,
      sizingH: Sizing.HUG,
      width: 200,
      padding: 0,
      border: Border.NONE,
      gap: 8,
      children: [wide, small],
    });

    layoutFrameTree(parent, adapter);

    // Each on its own row
    expect(wide._layout.placedX).toBe(0);
    expect(small._layout.placedX).toBe(0);
    expect(small._layout.placedY).toBeGreaterThan(wide._layout.placedY);
  });

  it('cross-axis alignment within row uses row height', () => {
    // Two children of different heights in one row, align CENTER
    const tall = new Frame({ id: 'tall', sizingW: Sizing.FIXED, sizingH: Sizing.FIXED, width: 40, height: 80, border: Border.NONE, padding: 0 });
    tall.label = [createLine('t')];
    const short_ = new Frame({ id: 'short', sizingW: Sizing.FIXED, sizingH: Sizing.FIXED, width: 40, height: 40, border: Border.NONE, padding: 0 });
    short_.label = [createLine('s')];

    const parent = new Frame({
      id: 'parent',
      direction: Direction.HORIZONTAL,
      wrap: true,
      sizingW: Sizing.FIXED,
      sizingH: Sizing.HUG,
      width: 200,
      padding: 0,
      border: Border.NONE,
      gap: 8,
      align: Align.CENTER,
      children: [tall, short_],
    });

    layoutFrameTree(parent, adapter);

    // short child should be vertically centered within the row (row height = 80)
    expect(tall._layout.placedY).toBe(0);
    expect(short_._layout.placedY).toBe(20); // (80 - 40) / 2
  });

  it('wrap with padding reduces available width', () => {
    // Parent 200px with 16px padding each side → 168px available
    // Two 80px children + 8 gap = 168 → fits in one row
    // Add a third → wraps
    const c1 = new Frame({ id: 'c1', sizingW: Sizing.FIXED, sizingH: Sizing.FIXED, width: 80, height: 40, border: Border.NONE, padding: 0 });
    c1.label = [createLine('a')];
    const c2 = new Frame({ id: 'c2', sizingW: Sizing.FIXED, sizingH: Sizing.FIXED, width: 80, height: 40, border: Border.NONE, padding: 0 });
    c2.label = [createLine('b')];
    const c3 = new Frame({ id: 'c3', sizingW: Sizing.FIXED, sizingH: Sizing.FIXED, width: 80, height: 40, border: Border.NONE, padding: 0 });
    c3.label = [createLine('c')];

    const parent = new Frame({
      id: 'parent',
      direction: Direction.HORIZONTAL,
      wrap: true,
      sizingW: Sizing.FIXED,
      sizingH: Sizing.HUG,
      width: 200,
      padding: 16,
      border: Border.NONE,
      gap: 8,
      children: [c1, c2, c3],
    });

    layoutFrameTree(parent, adapter);

    // c1 and c2 on row 1 (168px available, 80+8+80=168 fits)
    expect(c1._layout.placedY).toBe(c2._layout.placedY);
    // c3 on row 2
    expect(c3._layout.placedY).toBeGreaterThan(c1._layout.placedY);
    // c1 offset by padding
    expect(c1._layout.placedX).toBe(16);
  });

  it('wrap defaults to false', () => {
    const f = new Frame({ id: 'test' });
    expect(f.wrap).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Per-side padding contract (spec 005 WS4)
// ---------------------------------------------------------------------------

describe('per-side padding measure/render contract', () => {
  it('explicit zero per-side padding remains zero after layout', () => {
    const leaf = new Frame({
      id: 'leaf',
      padding: 0,
      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      label: [createLine('Hi')],
    });
    layoutFrameTree(leaf, adapter);
    expect(leaf.paddingTop).toBe(0);
    expect(leaf.paddingRight).toBe(0);
    expect(leaf.paddingBottom).toBe(0);
    expect(leaf.paddingLeft).toBe(0);
    expect(leaf._layout.placedX).toBe(0);
    expect(leaf._layout.placedY).toBe(0);
  });

  it('asymmetric vertical padding changes measured height', () => {
    const topHeavy = new Frame({
      id: 'top',
      paddingTop: 24,
      paddingBottom: 0,
      paddingLeft: 8,
      paddingRight: 8,
      label: [createLine('Same')],
    });
    const bottomHeavy = new Frame({
      id: 'bottom',
      paddingTop: 0,
      paddingBottom: 24,
      paddingLeft: 8,
      paddingRight: 8,
      label: [createLine('Same')],
    });
    layoutFrameTree(topHeavy, adapter);
    layoutFrameTree(bottomHeavy, adapter);
    expect(topHeavy._layout.placedH).toBe(bottomHeavy._layout.placedH);
    expect(topHeavy._layout.placedH).toBeGreaterThan(24);
  });

  it('leaf without icon has no icon column in wrap width', () => {
    const leaf = new Frame({
      id: 'plain',
      paddingLeft: 10,
      paddingRight: 14,
      width: 120,
      sizingW: Sizing.FIXED,
      label: [createLine('Text')],
    });
    applyTextLayoutDefaults(leaf);
    layoutFrameTree(leaf, adapter);
    expect(leafIconColumnWidth(leaf)).toBe(0);
    const wrapW = resolveLeafTextWrapWidth(leaf, adapter, leaf._layout.placedW);
    expect(wrapW).toBe(leaf._layout.placedW - leaf.paddingLeft - leaf.paddingRight);
  });

  it('icon leaf wrap width matches render inner width', () => {
    const leaf = new Frame({
      id: 'icon-leaf',
      icon: 'chip',
      paddingLeft: 4,
      paddingRight: 12,
      width: 200,
      sizingW: Sizing.FIXED,
      label: [createLine('Wrapped label text here')],
    });
    applyTextLayoutDefaults(leaf);
    layoutFrameTree(leaf, adapter);
    const wrapW = resolveLeafTextWrapWidth(leaf, adapter, leaf._layout.placedW);
    const renderInner =
      leaf._layout.placedW - leaf.paddingLeft - leaf.paddingRight - leafIconColumnWidth(leaf);
    expect(wrapW).toBe(renderInner);
    expect(leafIconColumnWidth(leaf)).toBeGreaterThan(0);
  });
});
