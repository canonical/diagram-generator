import { describe, expect, it } from 'vitest';

import {
  computeNodeIntersection,
  outsideNode,
  replaceEndpoint,
  type CenteredRectLike,
} from '../src/index.js';

const BOX: CenteredRectLike = {
  x: 0,
  y: 0,
  width: 100,
  height: 60,
};

describe('edge endpoint trim utilities', () => {
  it('trims a point to the top border', () => {
    expect(
      computeNodeIntersection({}, BOX, { x: 0, y: -120 }, { x: 0, y: 0 }),
    ).toEqual({ x: 0, y: -30 });
  });

  it('trims a point to the right border', () => {
    expect(
      computeNodeIntersection({}, BOX, { x: 120, y: 0 }, { x: 0, y: 0 }),
    ).toEqual({ x: 50, y: 0 });
  });

  it('trims a point to the bottom border', () => {
    expect(
      computeNodeIntersection({}, BOX, { x: 0, y: 120 }, { x: 0, y: 0 }),
    ).toEqual({ x: 0, y: 30 });
  });

  it('trims a point to the left border', () => {
    expect(
      computeNodeIntersection({}, BOX, { x: -120, y: 0 }, { x: 0, y: 0 }),
    ).toEqual({ x: -50, y: 0 });
  });

  it('treats border points as outside the node', () => {
    expect(outsideNode(BOX, { x: 50, y: 0 })).toBe(true);
    expect(outsideNode(BOX, { x: 0, y: 0 })).toBe(false);
  });

  it('replaces the first point or removes a duplicate start point', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }];
    replaceEndpoint(points, 'start', { x: 1, y: 1 });
    expect(points).toEqual([{ x: 1, y: 1 }, { x: 10, y: 0 }, { x: 20, y: 0 }]);

    replaceEndpoint(points, 'start', { x: 1, y: 1 });
    expect(points).toEqual([{ x: 10, y: 0 }, { x: 20, y: 0 }]);
  });

  it('replaces the last point or removes a duplicate end point', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }];
    replaceEndpoint(points, 'end', { x: 19, y: 1 }, 2);
    expect(points).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }]);

    replaceEndpoint(points, 'end', { x: 30, y: 0 });
    expect(points).toEqual([{ x: 0, y: 0 }, { x: 30, y: 0 }]);
  });
});
