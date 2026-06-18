import { describe, expect, it, vi } from 'vitest';
import { createPreviewArrowWaypointRuntime } from '../src/preview-shell/app-arrow-waypoint-runtime.js';

describe('createPreviewArrowWaypointRuntime', () => {
  it('reads and rebuilds arrow SVG through typed owners', () => {
    const updateArrowSvg = vi.fn();
    const rebuildArrowSvg = vi.fn();
    const runtime = createPreviewArrowWaypointRuntime({
      document: {
        querySelector() {
          return { tagName: 'svg' } as unknown as SVGSVGElement;
        },
        addEventListener() {},
        removeEventListener() {},
      } as Document,
      interactionManager: {
        state: null,
        startWaypointDrag() {},
        endInteraction() {},
        isMode() {
          return false;
        },
      },
      waypointDraggingMode: 'waypoint_dragging',
      getArrowNode() {
        return {
          waypoints: [[20, 24]],
        };
      },
      getEffectiveDelta() {
        return { dx: 4, dy: 8 };
      },
      isSelected() {
        return true;
      },
      captureOverrideEntries() {
        return {};
      },
      commitOverridePatchAction() {},
      persistWaypointOverride() {},
      refreshInspector() {},
      readArrowEndpoints() {
        return {
          start: [4, 8],
          end: [20, 24],
        };
      },
      updateArrowSvg,
      rebuildArrowSvg,
      headLen: 12,
      headHalf: 4,
      color: '#E95420',
    });

    expect(runtime.getArrowPoints('arrow-1')).toEqual([[4, 8], [20, 24]]);
    runtime.updateArrowVisual('arrow-1');
    runtime.rebuildArrowSvg('arrow-1');

    expect(updateArrowSvg).toHaveBeenCalledWith({
      svg: { tagName: 'svg' },
      componentId: 'arrow-1',
      waypoints: [[20, 24]],
      delta: { dx: 4, dy: 8 },
      headLen: 12,
      headHalf: 4,
    });
    expect(rebuildArrowSvg).toHaveBeenCalledWith({
      svg: { tagName: 'svg' },
      componentId: 'arrow-1',
      waypoints: [[20, 24]],
      headLen: 12,
      headHalf: 4,
      color: '#E95420',
    });
  });

  it('commits waypoint insertions through typed owners', () => {
    const node = {
      waypoints: [[20, 24]] as [number, number][],
    };
    const captureOverrideEntries = vi.fn(() => ({ arrow: { waypoints: [[20, 24]] } }));
    const commitOverridePatchAction = vi.fn();
    const persistWaypointOverride = vi.fn();
    const refreshInspector = vi.fn();
    const runtime = createPreviewArrowWaypointRuntime({
      document: {
        querySelector() {
          return {
            querySelectorAll() {
              return [];
            },
            ownerDocument: {
              createElementNS() {
                return {
                  setAttribute() {},
                  addEventListener() {},
                };
              },
            },
            appendChild() {},
          } as unknown as SVGSVGElement;
        },
        addEventListener() {},
        removeEventListener() {},
      } as Document,
      interactionManager: {
        state: null,
        startWaypointDrag() {},
        endInteraction() {},
        isMode() {
          return false;
        },
      },
      waypointDraggingMode: 'waypoint_dragging',
      getArrowNode() {
        return node;
      },
      getEffectiveDelta() {
        return { dx: 0, dy: 0 };
      },
      isSelected() {
        return true;
      },
      captureOverrideEntries,
      commitOverridePatchAction,
      persistWaypointOverride,
      refreshInspector,
      readArrowEndpoints() {
        return {
          start: [4, 8],
          end: [40, 48],
        };
      },
      updateArrowSvg() {},
      rebuildArrowSvg() {},
      headLen: 12,
      headHalf: 4,
      color: '#E95420',
    });

    runtime.addWaypoint('arrow', 0, 12, 16);

    expect(node.waypoints.length).toBe(2);
    expect(persistWaypointOverride).toHaveBeenCalledWith('arrow');
    expect(refreshInspector).toHaveBeenCalledWith('arrow');
    expect(commitOverridePatchAction).toHaveBeenCalled();
  });
});
