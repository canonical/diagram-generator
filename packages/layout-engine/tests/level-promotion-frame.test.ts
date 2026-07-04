import { describe, expect, it } from 'vitest';
import { Border, Frame, createLine } from '../src/frame-model.js';
import { applyHeadingAsChild } from '../src/heading-synthesis.js';
import { validateFrameLevelPromotion } from '../src/level-promotion-frame.js';

function leaf(id: string): Frame {
  return new Frame({ id, label: [createLine(id)] });
}

function headedContainer(id: string, level: number, children: Frame[]): Frame {
  const frame = new Frame({
    id,
    level,
    heading: createLine(id),
    children,
  });
  applyHeadingAsChild(frame, createLine(id));
  return frame;
}

describe('frame level-promotion validator', () => {
  it('accepts a sibling group that already matches the promoted level', () => {
    const root = new Frame({
      id: 'page',
      children: [
        headedContainer('planning', 3, [leaf('p1')]),
        headedContainer('implementation', 3, [
          headedContainer('devteam', 2, [leaf('dev1')]),
        ]),
        headedContainer('delivery', 3, [leaf('d1')]),
      ],
    });

    expect(validateFrameLevelPromotion(root)).toEqual([]);
  });

  it('reports siblings that should be promoted to section', () => {
    const root = new Frame({
      id: 'page',
      children: [
        headedContainer('planning', 2, [leaf('p1')]),
        headedContainer('implementation', 3, [
          headedContainer('devteam', 2, [leaf('dev1')]),
        ]),
      ],
    });

    expect(validateFrameLevelPromotion(root)).toEqual([
      {
        frameId: 'planning',
        path: 'page > planning',
        actualLevel: 2,
        expectedLevel: 3,
        maxChildNestingDepth: 2,
      },
    ]);
  });

  it('treats headingless containers as wrappers and borderless leaves as annotations', () => {
    const wrapper = new Frame({
      id: 'wrapper',
      children: [headedContainer('inner', 2, [leaf('inner_leaf')])],
    });
    const note = new Frame({
      id: 'note',
      border: Border.NONE,
      label: [createLine('Note')],
    });
    const root = new Frame({
      id: 'page',
      children: [
        note,
        wrapper,
        headedContainer('sibling', 2, [leaf('s1')]),
      ],
    });

    expect(validateFrameLevelPromotion(root)).toEqual([]);
  });
});
