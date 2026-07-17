import { describe, expect, it, vi } from 'vitest';
import { createPreviewInspectorDisplayRuntime } from '../src/preview-shell/app-inspector-display-runtime.js';

describe('createPreviewInspectorDisplayRuntime', () => {
  it('renders multi-selection inspector state and updates inferred gap', () => {
    const inspector = { innerHTML: '' };
    const setMultiActionGap = vi.fn();
    const syncPanelVisibility = vi.fn();
    const runtime = createPreviewInspectorDisplayRuntime({
      getInspector: () => inspector,
      selectedIds: new Set(['alpha', 'beta']),
      getPrimarySelectedId: (preferredId) => preferredId ?? 'beta',
      getSelectionActionInfo: () => ({
        items: [
          {
            id: 'alpha',
            node: {
              id: 'alpha',
              data: { id: 'alpha', x: 0, y: 0, width: 80, height: 40 },
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
          {
            id: 'beta',
            node: {
              id: 'beta',
              data: { id: 'beta', x: 120, y: 0, width: 80, height: 40 },
              parent: { id: 'root' },
            },
            parentId: 'root',
            own: { dx: 0, dy: 0, dw: 0, dh: 0 },
            eff: { dx: 0, dy: 0, dw: 0, dh: 0 },
            baseX: 120,
            baseY: 0,
            ancestorDx: 0,
            ancestorDy: 0,
            x: 120,
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
        if (cid === 'root') {
          return {
            layout: 'horizontal',
            layoutGap: 24,
            layoutRowGap: 24,
            layoutColGap: 24,
          };
        }
        return {
          data: { width: 80, height: 40, level: 2, fill: 'GREY', border: 'SOLID' },
          layout: null,
        };
      },
      getArrowNode: () => null,
      getOverride: () => ({ style: '' }),
      getOwnDelta: () => ({ dx: 0, dy: 0, dw: 0, dh: 0 }),
      getEffectiveDelta: () => ({ dx: 0, dy: 0, dw: 0, dh: 0 }),
      getComponentType: () => 'panel',
      getParentNode: () => ({ id: 'root' }),
      getParentLayout: () => 'horizontal',
      getRenderedStyle: () => ({ fill: '#ffffff', stroke: '#111111' }),
      getViolations: () => [],
      isWidthCoerced: () => false,
      isHeightCoerced: () => false,
      getGridInfo: () => ({ col_widths: [120], col_gap: 24, row_heights: [40], row_gap: 24 }),
      shouldShowAutolayoutInspector: () => true,
      baselineStep: 8,
      fallbackGap: 24,
      snapStep: 8,
      setMultiActionGap,
      renderMultiStyleOptions: (styleState) => (
        `<option>${styleState.style}|${styleState.originalStyleName}</option>`
      ),
      syncPanelVisibility,
    });

    runtime.setWidthUnit('cols');
    runtime.renderMultiSelectionInspector();

    expect(runtime.getWidthUnit()).toBe('cols');
    expect(setMultiActionGap).toHaveBeenCalledWith(24);
    expect(inspector.innerHTML).toContain('Selection');
    expect(inspector.innerHTML).toContain('Variant (2 boxes)');
    expect(inspector.innerHTML).not.toContain('data-dg-change-action="multi-style"');
    expect(syncPanelVisibility).toHaveBeenCalledWith({
      count: 2,
      kind: 'multi',
      allBounded: true,
      sameParent: true,
      hasUnsupported: false,
    });
  });

  it('normalizes width and height units and rerenders single-selection inspector', () => {
    const inspector = { innerHTML: '' };
    const syncPanelVisibility = vi.fn();
    const runtime = createPreviewInspectorDisplayRuntime({
      getInspector: () => inspector,
      selectedIds: new Set(['alpha']),
      getPrimarySelectedId: (preferredId) => preferredId ?? 'alpha',
      getSelectionActionInfo: () => ({
        items: [],
        hasUnsupported: false,
        sameParent: true,
        parentId: 'root',
      }),
      getNode: () => ({
        align: 'CENTER',
        layout: null,
        data: {
          width: 120,
          height: 80,
          level: 2,
          fill: 'GREY',
          border: 'SOLID',
        },
      }),
      getArrowNode: () => null,
      getOverride: () => ({ style: '' }),
      getOwnDelta: () => ({ dx: 0, dy: 0, dw: 0, dh: 0 }),
      getEffectiveDelta: () => ({ dx: 0, dy: 0, dw: 0, dh: 0 }),
      getComponentType: () => 'panel',
      getParentNode: () => null,
      getParentLayout: () => null,
      getRenderedStyle: () => ({ fill: '#000000', stroke: 'none' }),
      getViolations: () => [],
      isWidthCoerced: () => true,
      isHeightCoerced: () => false,
      getGridInfo: () => null,
      shouldShowAutolayoutInspector: () => true,
      baselineStep: 8,
      fallbackGap: 24,
      snapStep: 8,
      setMultiActionGap() {},
      formatControlErrorMessage: (message) => `escaped:${message}`,
      renderSingleStyleOptions: () => '<option>styled</option>',
      renderMultiStyleOptions: () => '<option>unused</option>',
      syncPanelVisibility,
    });

    runtime.setWidthUnit('cols', 'alpha');
    runtime.setHeightUnit('rows', 'alpha');

    expect(runtime.getWidthUnit()).toBe('px');
    expect(runtime.getHeightUnit()).toBe('rows');
    expect(inspector.innerHTML).toContain('<span class="label">Variant</span>');
    expect(inspector.innerHTML).toContain('data-dg-change-action="single-style"');
    expect(inspector.innerHTML).toContain('<option>styled</option>');
    expect(syncPanelVisibility).toHaveBeenCalledWith({ count: 1, kind: 'frame' });
  });

  it('classifies parentless page selections as root while exposing autolayout alignment', () => {
    const inspector = { innerHTML: '' };
    const syncPanelVisibility = vi.fn();
    const runtime = createPreviewInspectorDisplayRuntime({
      getInspector: () => inspector,
      selectedIds: new Set(['page']),
      getPrimarySelectedId: (preferredId) => preferredId ?? 'page',
      getSelectionActionInfo: () => ({
        items: [],
        hasUnsupported: false,
        sameParent: true,
        parentId: null,
      }),
      getNode: () => ({
        id: 'page',
        parent: null,
        children: [{}],
        data: { id: 'page' },
      }),
      getArrowNode: () => null,
      getOverride: () => ({}),
      getOwnDelta: () => ({ dx: 0, dy: 0, dw: 0, dh: 0 }),
      getEffectiveDelta: () => ({ dx: 0, dy: 0, dw: 0, dh: 0 }),
      getComponentType: () => 'panel',
      getParentNode: () => null,
      getParentLayout: () => null,
      getRenderedStyle: () => null,
      getViolations: () => [],
      isWidthCoerced: () => false,
      isHeightCoerced: () => false,
      getGridInfo: () => null,
      shouldShowAutolayoutInspector: () => true,
      baselineStep: 8,
      fallbackGap: 24,
      snapStep: 8,
      setMultiActionGap() {},
      renderSingleStyleOptions: () => '',
      renderMultiStyleOptions: () => '',
      syncPanelVisibility,
    });

    runtime.renderSelectionInspector('page');

    expect(syncPanelVisibility).toHaveBeenCalledWith({ count: 1, kind: 'root' });
    expect(inspector.innerHTML).toContain('data-dg-click-action="single-align"');
    expect(inspector.innerHTML).toContain('data-dg-panel-id="single-layout"');
    expect(inspector.innerHTML).toContain('data-dg-panel-id="single-autolayout-layout"');
    expect(inspector.innerHTML).not.toContain('data-dg-panel-id="single-autolayout-position"');
    expect(inspector.innerHTML).not.toContain('data-dg-panel-id="single-selection"');
  });

  it('hides single-selection autolayout controls when the capability callback is unavailable', () => {
    const inspector = { innerHTML: '' };
    const syncPanelVisibility = vi.fn();
    const runtime = createPreviewInspectorDisplayRuntime({
      getInspector: () => inspector,
      selectedIds: new Set(['page']),
      getPrimarySelectedId: (preferredId) => preferredId ?? 'page',
      getSelectionActionInfo: () => ({
        items: [],
        hasUnsupported: false,
        sameParent: true,
        parentId: null,
      }),
      getNode: () => ({
        id: 'page',
        parent: null,
        children: [{}],
        data: { id: 'page' },
      }),
      getArrowNode: () => null,
      getOverride: () => ({}),
      getOwnDelta: () => ({ dx: 0, dy: 0, dw: 0, dh: 0 }),
      getEffectiveDelta: () => ({ dx: 0, dy: 0, dw: 0, dh: 0 }),
      getComponentType: () => 'panel',
      getParentNode: () => null,
      getParentLayout: () => null,
      getRenderedStyle: () => null,
      getViolations: () => [],
      isWidthCoerced: () => false,
      isHeightCoerced: () => false,
      getGridInfo: () => null,
      baselineStep: 8,
      fallbackGap: 24,
      snapStep: 8,
      setMultiActionGap() {},
      renderSingleStyleOptions: () => '',
      renderMultiStyleOptions: () => '',
      syncPanelVisibility,
    });

    runtime.renderSelectionInspector('page');

    expect(syncPanelVisibility).toHaveBeenCalledWith({ count: 1, kind: 'root' });
    expect(inspector.innerHTML).not.toContain('data-dg-panel-id="single-layout"');
    expect(inspector.innerHTML).not.toContain('data-dg-click-action="single-align"');
    expect(inspector.innerHTML).not.toContain('data-dg-panel-id="single-autolayout-layout"');
    expect(inspector.innerHTML).not.toContain('data-dg-panel-id="single-autolayout-sizing"');
    expect(inspector.innerHTML).not.toContain('data-dg-prop="direction"');
    expect(inspector.innerHTML).not.toContain('data-dg-prop="gap_delta"');
    expect(inspector.innerHTML).not.toContain('Drag to move');
  });

  it('hides multi-selection layout controls when the capability callback is unavailable', () => {
    const inspector = { innerHTML: '' };
    const setMultiActionGap = vi.fn();
    const runtime = createPreviewInspectorDisplayRuntime({
      getInspector: () => inspector,
      selectedIds: new Set(['alpha', 'beta']),
      getPrimarySelectedId: (preferredId) => preferredId ?? 'beta',
      getSelectionActionInfo: () => ({
        items: [
          {
            id: 'alpha',
            node: {
              id: 'alpha',
              data: { id: 'alpha', x: 0, y: 0, width: 80, height: 40 },
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
          {
            id: 'beta',
            node: {
              id: 'beta',
              data: { id: 'beta', x: 120, y: 0, width: 80, height: 40 },
              parent: { id: 'root' },
            },
            parentId: 'root',
            own: { dx: 0, dy: 0, dw: 0, dh: 0 },
            eff: { dx: 0, dy: 0, dw: 0, dh: 0 },
            baseX: 120,
            baseY: 0,
            ancestorDx: 0,
            ancestorDy: 0,
            x: 120,
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
        if (cid === 'root') {
          return {
            layout: 'horizontal',
            layoutGap: 24,
            layoutRowGap: 24,
            layoutColGap: 24,
          };
        }
        return {
          data: { width: 80, height: 40, level: 2, fill: 'GREY', border: 'SOLID' },
          layout: null,
        };
      },
      getArrowNode: () => null,
      getOverride: () => ({ style: '' }),
      getOwnDelta: () => ({ dx: 0, dy: 0, dw: 0, dh: 0 }),
      getEffectiveDelta: () => ({ dx: 0, dy: 0, dw: 0, dh: 0 }),
      getComponentType: () => 'panel',
      getParentNode: () => ({ id: 'root' }),
      getParentLayout: () => 'horizontal',
      getRenderedStyle: () => ({ fill: '#ffffff', stroke: '#111111' }),
      getViolations: () => [],
      isWidthCoerced: () => false,
      isHeightCoerced: () => false,
      getGridInfo: () => ({ col_widths: [120], col_gap: 24, row_heights: [40], row_gap: 24 }),
      baselineStep: 8,
      fallbackGap: 24,
      snapStep: 8,
      setMultiActionGap,
      renderMultiStyleOptions: (styleState) => (
        `<option>${styleState.style}|${styleState.originalStyleName}</option>`
      ),
    });

    runtime.renderMultiSelectionInspector();

    expect(setMultiActionGap).not.toHaveBeenCalled();
    expect(inspector.innerHTML).toContain('Selection');
    expect(inspector.innerHTML).toContain('Layout is engine-driven in this view.');
    expect(inspector.innerHTML).not.toContain('data-dg-panel-id="multi-arrangement"');
    expect(inspector.innerHTML).not.toContain('data-dg-panel-id="multi-layout"');
    expect(inspector.innerHTML).not.toContain('data-dg-panel-id="multi-sizing"');
  });

  it('binds single-selection alignment controls to the parent container for autolayout leaf children', () => {
    const inspector = { innerHTML: '' };
    const runtime = createPreviewInspectorDisplayRuntime({
      getInspector: () => inspector,
      selectedIds: new Set(['child']),
      getPrimarySelectedId: (preferredId) => preferredId ?? 'child',
      getSelectionActionInfo: () => ({
        items: [],
        hasUnsupported: false,
        sameParent: true,
        parentId: 'parent',
      }),
      getNode: (cid) => (
        cid === 'child'
          ? {
              id: 'child',
              align: 'TOP_LEFT',
              data: { id: 'child', width: 120, height: 64, level: 1, fill: 'WHITE', border: 'SOLID' },
            }
          : {
              id: 'parent',
              align: 'BOTTOM_RIGHT',
              layout: 'vertical',
              children: [{ id: 'child' }],
              data: { id: 'parent' },
            }
      ),
      getArrowNode: () => null,
      getOverride: (cid) => (cid === 'parent' ? { align: 'CENTER_LEFT' } : { style: '' }),
      getOwnDelta: () => ({ dx: 0, dy: 0, dw: 0, dh: 0 }),
      getEffectiveDelta: () => ({ dx: 0, dy: 0, dw: 0, dh: 0 }),
      getComponentType: () => 'panel',
      getParentNode: () => ({
        id: 'parent',
        align: 'BOTTOM_RIGHT',
        layout: 'vertical',
        children: [{ id: 'child' }],
        data: { id: 'parent' },
      }),
      getParentLayout: () => 'vertical',
      getRenderedStyle: () => ({ fill: '#ffffff', stroke: '#111111' }),
      getViolations: () => [],
      isWidthCoerced: () => false,
      isHeightCoerced: () => false,
      getGridInfo: () => null,
      shouldShowAutolayoutInspector: () => true,
      baselineStep: 8,
      fallbackGap: 24,
      snapStep: 8,
      setMultiActionGap() {},
      renderSingleStyleOptions: () => '<option>styled</option>',
      renderMultiStyleOptions: () => '',
    });

    runtime.renderSelectionInspector('child');

    expect(inspector.innerHTML).toContain('data-dg-click-action="single-align"');
    expect(inspector.innerHTML).toContain('data-dg-cid="parent"');
    expect(inspector.innerHTML).toContain('Center Left');
  });
});
