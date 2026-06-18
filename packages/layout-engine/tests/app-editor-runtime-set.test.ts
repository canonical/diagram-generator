import { describe, expect, it, vi } from 'vitest';
import { createPreviewEditorRuntimeSet } from '../src/preview-shell/app-editor-runtime-set.js';
import { colSpanToPx, resolvePreviewGridInfo } from '../src/preview-shell/grid-resolution.js';

describe('createPreviewEditorRuntimeSet', () => {
  it('shares inspector display sizing units with the mutation runtime and exposes arrow waypoint helpers', () => {
    const overrides: Record<string, Record<string, unknown>> = {};
    const captureOverrideEntries = vi.fn((ids: string[]) => (
      Object.fromEntries(ids.map((id) => [id, { ...(overrides[id] || {}) }]))
    ));
    const commitOverridePatchAction = vi.fn();
    const setDirty = vi.fn();
    const scheduleRelayout = vi.fn();
    const gridInfo = resolvePreviewGridInfo({
      canvasWidth: 640,
      canvasHeight: 480,
      baselineStep: 8,
      columnCount: 4,
      columnGutter: 24,
      rowCount: 4,
      rowGutter: 24,
    });

    const runtimeSet = createPreviewEditorRuntimeSet({
      document: {
        querySelector() {
          return { tagName: 'svg' } as unknown as SVGSVGElement;
        },
        addEventListener() {},
        removeEventListener() {},
      } as Document,
      selectedIds: new Set(['alpha']),
      getSelectionDepth: () => 1,
      setSelectionDepth() {},
      getPrimarySelectedId: (preferredId) => preferredId ?? 'alpha',
      getAncestorDepth: () => 0,
      syncTreeSelectionState() {},
      removeResizeHandles() {},
      showResizeHandles() {},
      renderEmptyInspector() {},
      renderSelectionInspector() {},
      getInspector: () => ({ innerHTML: '' }),
      getSelectionActionInfo: () => ({
        items: [
          {
            id: 'alpha',
            node: {
              id: 'alpha',
              data: { id: 'alpha', width: 80, height: 40 },
              parent: { id: 'root' },
            },
            parentId: 'root',
            own: { dx: 0, dy: 0, dw: 0, dh: 0 },
            eff: { dx: 0, dy: 0, dw: 0, dh: 0 },
            baseX: 0,
            baseY: 0,
            ancestorDx: 0,
            ancestorDy: 0,
            x: 0,
            y: 0,
            width: 80,
            height: 40,
          },
        ],
        hasUnsupported: false,
        sameParent: true,
        parentId: 'root',
      }),
      getNode: (cid) => {
        if (cid === 'alpha') {
          return {
            id: 'alpha',
            layout: null,
            data: { width: 80, height: 40, level: 2, fill: 'GREY', border: 'SOLID' },
          };
        }
        return null;
      },
      getArrowNode: (cid) => (
        cid === 'arrow-1'
          ? { waypoints: [[20, 24]] as [number, number][] }
          : null
      ),
      getOverride: (cid) => overrides[cid] || {},
      getOwnDelta: () => ({ dx: 0, dy: 0, dw: 0, dh: 0 }),
      getEffectiveDelta: () => ({ dx: 4, dy: 8, dw: 0, dh: 0 }),
      getComponentType: () => 'panel',
      getParentLayout: () => null,
      getRenderedStyle: () => ({ fill: '#ffffff', stroke: '#111111' }),
      getViolations: () => [],
      isWidthCoerced: () => false,
      isHeightCoerced: () => false,
      getGridInfo: () => gridInfo,
      baselineStep: 8,
      fallbackGap: 24,
      snapStep: 8,
      getMultiActionGap: () => 24,
      setMultiActionGap() {},
      getTextAdapter: () => null,
      formatControlErrorMessage: (message) => `escaped:${message}`,
      renderSingleStyleOptions: () => '<option>styled</option>',
      renderMultiStyleOptions: () => '<option>styled</option>',
      captureOverrideEntries,
      commitOverridePatchAction,
      overrides,
      coercedKeys: new Set<string>(),
      snapToGrid: (value) => value,
      setDirty,
      scheduleRelayout,
      cleanOverride() {},
      requestRelayoutNow() {},
      renderMultiSelectionInspector() {},
      applyAllOverrides() {},
      reapplySelection() {},
      updateOverrideSummary() {},
      refreshTreeColors() {},
      runConstraints() {},
      setOverride(id, partial) {
        overrides[id] = { ...(overrides[id] || {}), ...partial };
      },
      normalizeSelectionGap: (gap) => gap,
      resolveSelectionDistributeTargets: () => ({}),
      resolveSelectionAlignTargets: () => ({}),
      createSelectionTargetOverrideEntries: () => [],
      alert() {},
      normalizeStyleName: (styleName) => styleName,
      interactionManager: {
        state: null,
        startWaypointDrag() {},
        endInteraction() {},
        isMode() {
          return false;
        },
      },
      waypointDraggingMode: 'waypoint_dragging',
      isSelected: (cid) => cid === 'alpha',
      persistWaypointOverride() {},
      readArrowEndpoints: () => ({ start: [4, 8], end: [20, 24] }),
      updateArrowSvg() {},
      rebuildArrowSvg() {},
      headLen: 12,
      headHalf: 4,
      color: '#E95420',
    });

    runtimeSet.inspectorDisplay.setWidthUnit('cols');
    runtimeSet.inspectorMutation.setFrameSize('alpha', 'width', 2);

    expect(overrides.alpha).toEqual({
      sizing_w: 'FIXED',
      width: colSpanToPx(gridInfo, 2),
    });
    expect(setDirty).toHaveBeenCalledWith(true);
    expect(scheduleRelayout).toHaveBeenCalledWith('alpha');
    expect(commitOverridePatchAction).toHaveBeenCalled();
    expect(runtimeSet.arrowWaypoint.getArrowPoints('arrow-1')).toEqual([[4, 8], [20, 24]]);
  });
});
