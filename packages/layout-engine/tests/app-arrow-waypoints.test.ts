import { describe, expect, it } from 'vitest';
import {
  bindPreviewArrowSegmentInsertHandles,
  createPreviewWaypointDragState,
  insertPreviewWaypoint,
  prunePreviewCollinearWaypoints,
  readPreviewArrowEndpoints,
  removePreviewWaypoint,
  renderPreviewArrowWaypointHandles,
  resolvePreviewArrowSvgUpdatePlan,
  resolvePreviewWaypointDragMove,
  resolvePreviewArrowWaypointHandlePositions,
  resolvePreviewArrowhead,
} from '../src/preview-shell/app-arrow-waypoints.js';

describe('preview arrow waypoint helpers', () => {
  it('resolves scaled arrowhead geometry for short segments', () => {
    const head = resolvePreviewArrowhead({
      tip: [6, 0],
      previous: [0, 0],
      headLen: 12,
      headHalf: 6,
    });

    expect(head).toEqual({
      base: [0, 0],
      points: '0,3 6,0 0,-3',
    });
  });

  it('builds segments that stop the final shaft at the arrowhead base', () => {
    const plan = resolvePreviewArrowSvgUpdatePlan({
      start: [0, 0],
      end: [20, 0],
      waypoints: [[10, 0]],
      headLen: 12,
      headHalf: 6,
    });

    expect(plan.segments).toEqual([
      { x1: 0, y1: 0, x2: 10, y2: 0 },
      { x1: 10, y1: 0, x2: 10, y2: 0 },
    ]);
    expect(plan.polygonPoints).toBe('10,5 20,0 10,-5');
  });

  it('applies effective delta when positioning waypoint handles', () => {
    expect(resolvePreviewArrowWaypointHandlePositions({
      waypoints: [[8, 16], [24, 32]],
      delta: { dx: 2, dy: -4 },
    })).toEqual([
      [10, 12],
      [26, 28],
    ]);
  });

  it('prefers polygon tip coordinates when reading arrow endpoints', () => {
    const line = {
      getAttribute(name: string) {
        return ({
          'data-orig-x1': '1',
          'data-orig-y1': '2',
          'data-orig-x2': '7',
          'data-orig-y2': '8',
        } as Record<string, string | null>)[name] ?? null;
      },
    };
    const polygon = {
      getAttribute(name: string) {
        return ({
          'data-orig-points': '3,4 9,10 5,6',
          points: null,
        } as Record<string, string | null>)[name] ?? null;
      },
    };
    const svg = {
      querySelectorAll() {
        return [{
          querySelectorAll(selector: string) {
            return selector === 'line' ? [line] : [];
          },
          querySelector(selector: string) {
            return selector === 'polygon' ? polygon : null;
          },
        }];
      },
    } as unknown as SVGSVGElement;

    expect(readPreviewArrowEndpoints({
      svg,
      componentId: 'arrow-1',
    })).toEqual({
      start: [1, 2],
      end: [9, 10],
    });
  });

  it('renders waypoint handles and binds segment insert handles on the svg host', () => {
    const appended: Array<Record<string, string>> = [];
    const listeners: Array<{ type: string; handler: EventListener }> = [];
    const hitLine = {
      style: { pointerEvents: 'stroke' },
      dataset: {},
      attrs: {} as Record<string, string>,
      getAttribute(name: string) {
        return ({ x1: '0', y1: '0', x2: '8', y2: '8' } as Record<string, string>)[name] ?? null;
      },
      setAttribute(name: string, value: string) {
        this.attrs[name] = value;
      },
      addEventListener(type: string, handler: EventListener) {
        listeners.push({ type, handler });
      },
    };
    const group = {
      querySelectorAll(selector: string) {
        return selector === 'line' ? [hitLine] : [];
      },
    };
    const svg = {
      ownerDocument: {
        createElementNS(_ns: string, _kind: string) {
          return {
            attrs: {} as Record<string, string>,
            style: {},
            setAttribute(name: string, value: string) {
              this.attrs[name] = value;
            },
            addEventListener() {},
          };
        },
      },
      querySelectorAll(selector: string) {
        if (selector === '[data-component-id="arrow-1"]') return [group];
        if (selector === '.dg-wp-handle' || selector === '.dg-wp-add') return [];
        return [];
      },
      appendChild(node: { attrs: Record<string, string> }) {
        appended.push(node.attrs);
      },
      createSVGPoint() {
        return {
          x: 0,
          y: 0,
          matrixTransform() {
            return { x: 16, y: 24 };
          },
        };
      },
      getScreenCTM() {
        return {
          inverse() {
            return {};
          },
        };
      },
    } as unknown as SVGSVGElement;

    bindPreviewArrowSegmentInsertHandles({
      svg,
      componentId: 'arrow-1',
      delta: { dx: 2, dy: 4 },
      isSelected: true,
      onAddWaypoint: () => {},
    });
    renderPreviewArrowWaypointHandles({
      svg,
      componentId: 'arrow-1',
      waypoints: [[8, 16]],
      delta: { dx: 2, dy: -4 },
      onHandleMouseDown: () => {},
      onHandleDoubleClick: () => {},
    });

    expect(hitLine.attrs['data-wp-seg-cid']).toBe('arrow-1');
    expect(hitLine.attrs['data-wp-seg-idx']).toBe('0');
    expect(listeners).toHaveLength(1);
    expect(appended).toEqual([
      {
        cx: '10',
        cy: '12',
        r: '5',
        class: 'dg-wp-handle',
        'data-wp-cid': 'arrow-1',
        'data-wp-idx': '0',
      },
    ]);
  });

  it('resolves waypoint drag movement, pruning, and add/remove mutations', () => {
    const startState = createPreviewWaypointDragState({
      cid: 'arrow-1',
      index: 0,
      startX: 10,
      startY: 20,
      origX: 40,
      origY: 60,
    });

    const dragMove = resolvePreviewWaypointDragMove({
      state: startState,
      clientX: 26,
      clientY: 40,
      endpoints: {
        start: [0, 60],
        end: [80, 60],
      },
      waypoints: [[40, 60]],
    });

    expect(dragMove).toEqual({
      hasMoved: true,
      axis: 'y',
      waypoint: [40, 80],
    });
    expect(prunePreviewCollinearWaypoints({
      waypoints: [[20, 0], [40, 0]],
      endpoints: {
        start: [0, 0],
        end: [60, 0],
      },
    })).toEqual({
      waypoints: [],
      changed: true,
    });
    expect(insertPreviewWaypoint([[8, 8]], 1, 22, 30)).toEqual([[8, 8], [24, 32]]);
    expect(removePreviewWaypoint([[8, 8], [24, 32]], 0)).toEqual([[24, 32]]);
    expect(removePreviewWaypoint([[8, 8]], 0)).toBeNull();
  });
});
