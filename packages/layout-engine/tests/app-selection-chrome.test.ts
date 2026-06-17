import { describe, expect, it } from 'vitest';
import {
  readPreviewArrowPointsHost,
  rebuildPreviewArrowSvgHost,
  removePreviewHandlesHost,
  showPreviewResizeHandlesHost,
  updatePreviewArrowVisualHost,
} from '../src/preview-shell/app-selection-chrome.js';

describe('preview selection chrome host helpers', () => {
  it('renders multi-selection and separator resize chrome through the host wrapper', () => {
    const actions: unknown[] = [];
    const svg = {
      ownerDocument: {
        createElementNS(_ns: string, tag: string) {
          return {
            tag,
            attrs: {} as Record<string, string>,
            setAttribute(name: string, value: string) {
              this.attrs[name] = value;
            },
          };
        },
      },
      appendChild(node: unknown) {
        actions.push({ appendChild: node });
      },
    } as unknown as SVGSVGElement;

    expect(showPreviewResizeHandlesHost({
      document: {
        querySelector() {
          return svg;
        },
      },
      componentId: 'alpha',
      selectedCount: 2,
      multiSelection: { left: 10, top: 20, right: 50, bottom: 80 } as any,
      singleBounds: null,
      componentType: null,
      clearHandlesByClass(className) {
        actions.push({ clear: className });
      },
      resolveHandlePlan() {
        return {
          kind: 'multi',
          bounds: { left: 10, top: 20, right: 50, bottom: 80 },
        };
      },
      renderResizeHandles(options) {
        actions.push({ renderResizeHandles: options });
      },
      showArrowWaypointHandles() {
        actions.push('showArrowWaypointHandles');
      },
      handleSize: 8,
    })).toBe(true);

    expect(actions).toEqual([
      { clear: 'dg-handle' },
      {
        renderResizeHandles: {
          svg,
          left: 10,
          top: 20,
          right: 50,
          bottom: 80,
          nodeId: 'multi',
          options: {
            handleClass: 'dg-handle',
            nodeAttr: 'data-resize-selection',
            dirAttr: 'data-resize-axis',
          },
        },
      },
    ]);

    actions.length = 0;
    expect(showPreviewResizeHandlesHost({
      document: {
        querySelector() {
          return svg;
        },
      },
      componentId: 'separator',
      selectedCount: 1,
      multiSelection: null,
      singleBounds: { left: 10, top: 20, right: 50, bottom: 20 },
      componentType: 'line',
      clearHandlesByClass(className) {
        actions.push({ clear: className });
      },
      resolveHandlePlan() {
        return {
          kind: 'separator',
          bounds: { left: 10, top: 20, right: 50, bottom: 20 },
        };
      },
      renderResizeHandles() {
        actions.push('renderResizeHandles');
      },
      showArrowWaypointHandles() {
        actions.push('showArrowWaypointHandles');
      },
      handleSize: 8,
    })).toBe(true);

    expect(actions[0]).toEqual({ clear: 'dg-handle' });
    expect(actions).toHaveLength(4);
  });

  it('routes arrow handle and arrow svg helpers through typed wrappers', () => {
    const captured: unknown[] = [];
    const svg = {} as SVGSVGElement;

    expect(showPreviewResizeHandlesHost({
      document: {
        querySelector() {
          return svg;
        },
      },
      componentId: 'arrow-1',
      selectedCount: 1,
      multiSelection: null,
      singleBounds: null,
      componentType: 'arrow',
      clearHandlesByClass(className) {
        captured.push({ clear: className });
      },
      resolveHandlePlan() {
        return { kind: 'arrow' };
      },
      renderResizeHandles() {
        captured.push('renderResizeHandles');
      },
      showArrowWaypointHandles(id) {
        captured.push({ showArrowWaypointHandles: id });
      },
      handleSize: 8,
    })).toBe(true);

    expect(readPreviewArrowPointsHost({
      document: {
        querySelector() {
          return svg;
        },
      },
      componentId: 'arrow-1',
      hasArrowNode: true,
      readArrowEndpoints() {
        return {
          start: [4, 8],
          end: [20, 24],
        };
      },
    })).toEqual([[4, 8], [20, 24]]);

    expect(updatePreviewArrowVisualHost({
      document: {
        querySelector() {
          return svg;
        },
      },
      componentId: 'arrow-1',
      node: { waypoints: [[10, 20]] },
      delta: { dx: 4, dy: 8 },
      headLen: 10,
      headHalf: 5,
      updateArrowSvg(options) {
        captured.push({ updateArrowSvg: options });
      },
    })).toBe(true);

    expect(rebuildPreviewArrowSvgHost({
      document: {
        querySelector() {
          return svg;
        },
      },
      componentId: 'arrow-1',
      node: { waypoints: [[10, 20]] },
      headLen: 10,
      headHalf: 5,
      color: '#E95420',
      rebuildArrowSvg(options) {
        captured.push({ rebuildArrowSvg: options });
      },
    })).toBe(true);

    removePreviewHandlesHost({
      clearHandlesByClass(className) {
        captured.push({ remove: className });
      },
    });

    expect(captured).toEqual([
      { clear: 'dg-handle' },
      { showArrowWaypointHandles: 'arrow-1' },
      {
        updateArrowSvg: {
          svg,
          componentId: 'arrow-1',
          waypoints: [[10, 20]],
          delta: { dx: 4, dy: 8 },
          headLen: 10,
          headHalf: 5,
        },
      },
      {
        rebuildArrowSvg: {
          svg,
          componentId: 'arrow-1',
          waypoints: [[10, 20]],
          headLen: 10,
          headHalf: 5,
          color: '#E95420',
        },
      },
      { remove: 'dg-handle' },
      { remove: 'dg-wp-handle' },
    ]);
  });
});
