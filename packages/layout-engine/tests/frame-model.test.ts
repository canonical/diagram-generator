import { describe, it, expect } from 'vitest';
import {
  Frame,
  Direction,
  Sizing,
  Align,
  Fill,
  Border,
  FrameDiagram,
  enforceFillHugInvariant,
  createLine,
} from '../src/frame-model.js';

// ---------------------------------------------------------------------------
// Frame construction
// ---------------------------------------------------------------------------

describe('Frame construction', () => {
  it('creates a frame with defaults', () => {
    const f = new Frame();
    expect(f.id).toBe('');
    expect(f.direction).toBe(Direction.VERTICAL);
    expect(f.gap).toBe(24);
    expect(f.padding).toBe(8);
    expect(f.align).toBe(Align.TOP_LEFT);
    expect(f.sizingW).toBe(Sizing.HUG);
    expect(f.sizingH).toBe(Sizing.HUG);
    expect(f.width).toBeUndefined();
    expect(f.height).toBeUndefined();
    expect(f.fill).toBe(Fill.WHITE);
    expect(f.border).toBe(Border.SOLID);
    expect(f.label).toEqual([]);
    expect(f.children).toEqual([]);
    expect(f.isLeaf).toBe(true);
    expect(f.isContainer).toBe(false);
  });

  it('resolves per-side padding from uniform padding', () => {
    const f = new Frame({ padding: 16 });
    expect(f.paddingTop).toBe(16);
    expect(f.paddingRight).toBe(16);
    expect(f.paddingBottom).toBe(16);
    expect(f.paddingLeft).toBe(16);
  });

  it('per-side padding overrides uniform', () => {
    const f = new Frame({ padding: 8, paddingTop: 0, paddingBottom: 16 });
    expect(f.paddingTop).toBe(0);
    expect(f.paddingRight).toBe(8);
    expect(f.paddingBottom).toBe(16);
    expect(f.paddingLeft).toBe(8);
  });

  it('detects leaf vs container', () => {
    const leaf = new Frame({ id: 'leaf', label: [createLine('hello')] });
    const container = new Frame({
      id: 'parent',
      children: [leaf],
    });
    expect(leaf.isLeaf).toBe(true);
    expect(leaf.isContainer).toBe(false);
    expect(container.isLeaf).toBe(false);
    expect(container.isContainer).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Constraint validation
// ---------------------------------------------------------------------------

describe('Constraint validation', () => {
  it('rejects negative min_width', () => {
    expect(() => new Frame({ minWidth: -1 })).toThrow('minWidth cannot be negative');
  });

  it('rejects negative max_height', () => {
    expect(() => new Frame({ maxHeight: -5 })).toThrow('maxHeight cannot be negative');
  });

  it('rejects min_width > max_width', () => {
    expect(() => new Frame({ minWidth: 200, maxWidth: 100 })).toThrow(
      'minWidth (200) > maxWidth (100)',
    );
  });

  it('rejects min_height > max_height', () => {
    expect(() => new Frame({ minHeight: 300, maxHeight: 50 })).toThrow(
      'minHeight (300) > maxHeight (50)',
    );
  });

  it('accepts valid constraints', () => {
    const f = new Frame({ minWidth: 50, maxWidth: 200, minHeight: 30, maxHeight: 100 });
    expect(f.minWidth).toBe(50);
    expect(f.maxWidth).toBe(200);
    expect(f.minHeight).toBe(30);
    expect(f.maxHeight).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// FrameDiagram
// ---------------------------------------------------------------------------

describe('FrameDiagram', () => {
  it('creates with defaults', () => {
    const d = new FrameDiagram();
    expect(d.title).toBe('');
    expect(d.root).toBeInstanceOf(Frame);
    expect(d.arrows).toEqual([]);
    expect(d.gridCols).toBe(2);
    expect(d.gridColGap).toBeUndefined();
  });

  it('accepts custom grid metadata', () => {
    const d = new FrameDiagram({ gridCols: 4, gridColGap: 16, gridRowGap: 24, gridOuterMargin: 32 });
    expect(d.gridCols).toBe(4);
    expect(d.gridColGap).toBe(16);
    expect(d.gridRowGap).toBe(24);
    expect(d.gridOuterMargin).toBe(32);
  });
});

// ---------------------------------------------------------------------------
// enforceFillHugInvariant (coercion)
// ---------------------------------------------------------------------------

describe('enforceFillHugInvariant', () => {
  /** Helper: build a simple vertical parent with two children. */
  function verticalParent(
    parentSizingH: Sizing,
    childSizingH: Sizing[],
    measuredH = 200,
  ): Frame {
    const children = childSizingH.map((s, i) => {
      const c = new Frame({ id: `child-${i}`, sizingH: s });
      c._layout.measuredH = 50;
      c._layout.measuredW = 100;
      return c;
    });
    const parent = new Frame({
      id: 'parent',
      direction: Direction.VERTICAL,
      sizingH: parentSizingH,
      sizingW: Sizing.HUG,
      children,
    });
    parent._layout.measuredH = measuredH;
    parent._layout.measuredW = 200;
    return parent;
  }

  /** Helper: build a simple horizontal parent with two children. */
  function horizontalParent(
    parentSizingW: Sizing,
    childSizingW: Sizing[],
    measuredW = 200,
  ): Frame {
    const children = childSizingW.map((s, i) => {
      const c = new Frame({ id: `child-${i}`, sizingW: s });
      c._layout.measuredW = 50;
      c._layout.measuredH = 100;
      return c;
    });
    const parent = new Frame({
      id: 'parent',
      direction: Direction.HORIZONTAL,
      sizingW: parentSizingW,
      sizingH: Sizing.HUG,
      children,
    });
    parent._layout.measuredW = measuredW;
    parent._layout.measuredH = 200;
    return parent;
  }

  it('coerces HUG parent to FIXED on primary axis when child is FILL (vertical)', () => {
    const parent = verticalParent(Sizing.HUG, [Sizing.FILL, Sizing.HUG]);
    const coerced = enforceFillHugInvariant(parent);
    expect(parent.sizingH).toBe(Sizing.HUG);
    expect(parent.height).toBeUndefined();
    expect(coerced.get('parent')).toMatchObject({ sizingH: 'FIXED', height: 200 });
  });

  it('coerces HUG parent to FIXED on primary axis when child is FILL (horizontal)', () => {
    const parent = horizontalParent(Sizing.HUG, [Sizing.FILL, Sizing.HUG]);
    const coerced = enforceFillHugInvariant(parent);
    expect(parent.sizingW).toBe(Sizing.HUG);
    expect(parent.width).toBeUndefined();
    expect(coerced.get('parent')).toMatchObject({ sizingW: 'FIXED', width: 200 });
  });

  it('does not coerce FIXED parent', () => {
    const parent = verticalParent(Sizing.FIXED, [Sizing.FILL, Sizing.FILL]);
    parent.height = 300;
    const coerced = enforceFillHugInvariant(parent);
    expect(parent.sizingH).toBe(Sizing.FIXED);
    expect(parent.height).toBe(300); // unchanged
    expect(coerced.size).toBe(0);
  });

  it('does not coerce when no FILL children on primary axis', () => {
    const parent = verticalParent(Sizing.HUG, [Sizing.HUG, Sizing.HUG]);
    enforceFillHugInvariant(parent);
    expect(parent.sizingH).toBe(Sizing.HUG);
  });

  it('does not coerce cross-axis (vertical parent, FILL-width children)', () => {
    const children = [
      new Frame({ id: 'c0', sizingW: Sizing.FILL, sizingH: Sizing.HUG }),
      new Frame({ id: 'c1', sizingW: Sizing.FILL, sizingH: Sizing.HUG }),
    ];
    const parent = new Frame({
      id: 'parent',
      direction: Direction.VERTICAL,
      sizingW: Sizing.HUG,
      sizingH: Sizing.HUG,
      children,
    });
    parent._layout.measuredW = 200;
    parent._layout.measuredH = 200;
    enforceFillHugInvariant(parent);
    // Cross-axis (W) stays HUG
    expect(parent.sizingW).toBe(Sizing.HUG);
    // Primary axis (H) stays HUG because no child has FILL on H
    expect(parent.sizingH).toBe(Sizing.HUG);
  });

  it('returns coerced overrides map', () => {
    const parent = verticalParent(Sizing.HUG, [Sizing.FILL, Sizing.HUG], 180);
    const coerced = enforceFillHugInvariant(parent);
    expect(coerced.size).toBe(1);
    expect(coerced.has('parent')).toBe(true);
    const entry = coerced.get('parent')!;
    expect(entry.sizingH).toBe('FIXED');
    expect(entry.height).toBe(180);
  });

  it('returns empty map when no coercion needed', () => {
    const parent = verticalParent(Sizing.HUG, [Sizing.HUG, Sizing.HUG]);
    const coerced = enforceFillHugInvariant(parent);
    expect(coerced.size).toBe(0);
  });

  it('handles nested coercion', () => {
    // Inner: vertical HUG parent with FILL child
    const inner = verticalParent(Sizing.HUG, [Sizing.FILL], 100);
    inner.id = 'inner';
    // Outer: vertical HUG parent with inner (which has FILL child → coerced)
    //   + a FILL sibling → outer should also coerce
    const sibling = new Frame({ id: 'sibling', sizingH: Sizing.FILL });
    sibling._layout.measuredH = 50;
    const outer = new Frame({
      id: 'outer',
      direction: Direction.VERTICAL,
      sizingH: Sizing.HUG,
      children: [inner, sibling],
    });
    outer._layout.measuredH = 250;

    const coerced = enforceFillHugInvariant(outer);
    // Both inner and outer should be coerced
    expect(coerced.has('inner')).toBe(true);
    expect(coerced.has('outer')).toBe(true);
    expect(inner.sizingH).toBe(Sizing.HUG);
    expect(outer.sizingH).toBe(Sizing.HUG);
  });

  it('per-axis: FILL on primary triggers coercion, FILL on cross does not', () => {
    // Horizontal parent, child has FILL on both axes
    const child = new Frame({
      id: 'child',
      sizingW: Sizing.FILL,  // primary axis for horizontal
      sizingH: Sizing.FILL,  // cross axis for horizontal
    });
    child._layout.measuredW = 100;
    child._layout.measuredH = 50;
    const parent = new Frame({
      id: 'parent',
      direction: Direction.HORIZONTAL,
      sizingW: Sizing.HUG,
      sizingH: Sizing.HUG,
      children: [child],
    });
    parent._layout.measuredW = 200;
    parent._layout.measuredH = 100;

    const coerced = enforceFillHugInvariant(parent);
    // Primary (W) coerced
    expect(parent.sizingW).toBe(Sizing.HUG);
    expect(parent.width).toBeUndefined();
    expect(coerced.get('parent')).toMatchObject({ sizingW: 'FIXED', width: 200 });
    // Cross (H) NOT coerced
    expect(parent.sizingH).toBe(Sizing.HUG);
  });

  it('leaf frame returns empty coerced map', () => {
    const leaf = new Frame({ id: 'leaf' });
    const coerced = enforceFillHugInvariant(leaf);
    expect(coerced.size).toBe(0);
  });
});
