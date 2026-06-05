import { describe, it, expect } from 'vitest';
import {
  Frame,
  Direction,
  Align,
  Justify,
  Sizing,
  createLine,
} from '../src/frame-model.js';
import { applyHeadingAsChild, findSyntheticBody } from '../src/heading-synthesis.js';
import { INSET } from '../src/tokens.js';

describe('applyHeadingAsChild propagation contract', () => {
  it('vertical parent: __body keeps align and direction, not wrap/justify/fill_weight', () => {
    const panel = new Frame({
      id: 'panel',
      direction: Direction.VERTICAL,
      gap: 12,
      align: Align.CENTER,
      justify: Justify.SPACE_BETWEEN,
      wrap: true,
      fillWeight: 3,
      children: [new Frame({ id: 'leaf', label: [createLine('Body')] })],
    });
    applyHeadingAsChild(panel, createLine('Title', { weight: '700' }));

    const body = findSyntheticBody(panel)!;
    expect(body.direction).toBe(Direction.VERTICAL);
    expect(body.align).toBe(Align.CENTER);
    expect(body.gap).toBe(INSET);
    expect(body.wrap).toBe(false);
    expect(body.justify).toBe(Justify.PACKED);
    expect(body.fillWeight).toBe(1);
    expect(panel.gap).toBe(12);
    expect(panel.justify).toBe(Justify.SPACE_BETWEEN);
  });

  it('horizontal parent: restructures to vertical with horizontal __body', () => {
    const row = new Frame({
      id: 'row',
      direction: Direction.HORIZONTAL,
      gap: 0,
      wrap: true,
      justify: Justify.SPACE_EVENLY,
      fillWeight: 2,
      children: [
        new Frame({ id: 'a', label: [createLine('A')] }),
        new Frame({ id: 'b', label: [createLine('B')] }),
      ],
    });
    applyHeadingAsChild(row, createLine('Row title'));

    expect(row.direction).toBe(Direction.VERTICAL);
    const body = findSyntheticBody(row)!;
    expect(body.direction).toBe(Direction.HORIZONTAL);
    expect(body.gap).toBe(INSET);
    expect(body.wrap).toBe(false);
    expect(body.justify).toBe(Justify.PACKED);
    expect(body.fillWeight).toBe(1);
    expect(body.children.map(c => c.id)).toEqual(['a', 'b']);
  });

  it('keeps parent gap as title spacing while deriving inner gap from composition', () => {
    const section = new Frame({
      id: 'sect',
      gap: 4,
      children: [new Frame({ id: 'x', label: [createLine('X')] })],
    });
    applyHeadingAsChild(section, createLine('H'));
    expect(findSyntheticBody(section)!.gap).toBe(INSET);
    expect(section.gap).toBe(4);
  });

  it('does not propagate parent wrap to __body (negative)', () => {
    const panel = new Frame({
      id: 'p',
      wrap: true,
      children: [new Frame({ id: 'c', label: [createLine('c')] })],
    });
    applyHeadingAsChild(panel, createLine('H'));
    expect(findSyntheticBody(panel)!.wrap).toBe(false);
    expect(panel.wrap).toBe(true);
  });

  it('does not propagate parent justify or fill_weight to __body (negative)', () => {
    const panel = new Frame({
      id: 'p',
      justify: Justify.SPACE_BETWEEN,
      fillWeight: 5,
      children: [new Frame({ id: 'c', sizingW: Sizing.FILL, label: [createLine('c')] })],
    });
    applyHeadingAsChild(panel, createLine('H'));
    const body = findSyntheticBody(panel)!;
    expect(body.justify).toBe(Justify.PACKED);
    expect(body.fillWeight).toBe(1);
  });
});
