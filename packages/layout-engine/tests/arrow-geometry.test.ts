import { describe, expect, it } from 'vitest';

import {
  resolveArrowheadGeometry,
  resolveArrowPolylineGeometry,
} from '../src/arrow-geometry.js';

describe('arrow geometry helpers', () => {
  it('scales arrowheads to short terminal segments', () => {
    expect(resolveArrowheadGeometry({
      tip: [6, 0],
      previous: [0, 0],
      headLength: 12,
      headHalfWidth: 6,
    })).toEqual({
      base: [0, 0],
      left: [0, 3],
      tip: [6, 0],
      right: [0, -3],
    });
  });

  it('shortens the final shaft segment to the arrowhead base', () => {
    const geometry = resolveArrowPolylineGeometry({
      points: [[0, 0], [10, 0], [20, 0]],
      headLength: 12,
      headHalfWidth: 6,
    });

    expect(geometry.shaftPoints).toEqual([
      [0, 0],
      [10, 0],
      [10, 0],
    ]);
    expect(geometry.head).toEqual({
      base: [10, 0],
      left: [10, 5],
      tip: [20, 0],
      right: [10, -5],
    });
  });
});
