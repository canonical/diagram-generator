import { describe, expect, it, vi } from 'vitest';
import { createPreviewInspectorSelectionRuntime } from '../src/preview-shell/app-inspector-selection-runtime.js';

describe('createPreviewInspectorSelectionRuntime', () => {
  it('applies selection targets through typed host orchestration', () => {
    const overrides: Record<string, Record<string, unknown>> = {};
    const setOverride = vi.fn((id: string, partial: { dx: number; dy: number }) => {
      overrides[id] = { ...(overrides[id] || {}), ...partial };
    });
    const captureOverrideEntries = vi.fn((ids: string[]) => (
      Object.fromEntries(ids.map((id) => [id, { ...(overrides[id] || {}) }]))
    ));
    const commitOverridePatchAction = vi.fn();
    const applyAllOverrides = vi.fn();
    const reapplySelection = vi.fn();
    const renderSelectionInspector = vi.fn();
    const updateOverrideSummary = vi.fn();
    const refreshTreeColors = vi.fn();
    const runConstraints = vi.fn();

    const runtime = createPreviewInspectorSelectionRuntime({
      selectedIds: new Set(['alpha', 'beta']),
      getSelectionActionInfo: () => ({
        items: [],
        hasUnsupported: false,
        sameParent: true,
        parentId: 'root',
      }),
      getMultiActionGap: () => 24,
      setMultiActionGap() {},
      captureOverrideEntries,
      commitOverridePatchAction,
      getOverrides: () => overrides,
      coercedKeys: new Set<string>(),
      getNode: () => ({ type: 'box', data: { width: 120, height: 64 } }),
      cleanOverride() {},
      setDirty() {},
      scheduleRelayout() {},
      requestRelayoutNow() {},
      renderSelectionInspector,
      renderMultiSelectionInspector() {},
      applyAllOverrides,
      reapplySelection,
      updateOverrideSummary,
      refreshTreeColors,
      runConstraints,
      setOverride,
      getGridInfo: () => null,
      getWidthUnit: () => 'px',
      getHeightUnit: () => 'px',
      baselineStep: 8,
      shouldShowAutolayoutInspector: () => true,
      normalizeSelectionGap: (gap) => gap,
      resolveSelectionDistributeTargets: () => ({}),
      resolveSelectionAlignTargets: () => ({}),
      createSelectionTargetOverrideEntries: () => [{ id: 'alpha', dx: 16, dy: 8 }],
      alert() {},
      getComponentType: () => 'box',
      normalizeStyleName: (styleName) => styleName,
    });

    runtime.applySelectionTargets(
      [{ id: 'alpha' } as never],
      { alpha: { dx: 16, dy: 8 } },
    );

    expect(overrides.alpha).toEqual({ dx: 16, dy: 8 });
    expect(setOverride).toHaveBeenCalledWith('alpha', { dx: 16, dy: 8 });
    expect(applyAllOverrides).toHaveBeenCalled();
    expect(reapplySelection).toHaveBeenCalled();
    expect(renderSelectionInspector).toHaveBeenCalled();
    expect(updateOverrideSummary).toHaveBeenCalled();
    expect(refreshTreeColors).toHaveBeenCalled();
    expect(runConstraints).toHaveBeenCalled();
    expect(commitOverridePatchAction).toHaveBeenCalledWith(
      'Reposition selection',
      { alpha: {} },
      { alpha: { dx: 16, dy: 8 } },
    );
  });

  it('applies multi-frame size mutations through typed owners and schedules relayout against the live override store', () => {
    let overrides: Record<string, Record<string, unknown>> = {};
    const captureOverrideEntries = vi.fn((ids: string[]) => (
      Object.fromEntries(ids.map((id) => [id, { ...(overrides[id] || {}) }]))
    ));
    const commitOverridePatchAction = vi.fn();
    const setDirty = vi.fn();
    const scheduleRelayout = vi.fn();
    const requestRelayoutNow = vi.fn();
    const renderMultiSelectionInspector = vi.fn();

    const runtime = createPreviewInspectorSelectionRuntime({
      selectedIds: new Set(['alpha', 'beta']),
      getSelectionActionInfo: () => ({
        items: [],
        hasUnsupported: false,
        sameParent: true,
        parentId: 'root',
      }),
      getMultiActionGap: () => 24,
      setMultiActionGap() {},
      captureOverrideEntries,
      commitOverridePatchAction,
      getOverrides: () => overrides,
      coercedKeys: new Set<string>(),
      getNode: () => ({ type: 'box', data: { width: 120, height: 64 } }),
      cleanOverride() {},
      setDirty,
      scheduleRelayout,
      requestRelayoutNow,
      renderSelectionInspector() {},
      renderMultiSelectionInspector,
      applyAllOverrides() {},
      reapplySelection() {},
      updateOverrideSummary() {},
      refreshTreeColors() {},
      runConstraints() {},
      setOverride() {},
      getGridInfo: () => null,
      getWidthUnit: () => 'px',
      getHeightUnit: () => 'px',
      baselineStep: 8,
      shouldShowAutolayoutInspector: () => true,
      normalizeSelectionGap: (gap) => gap,
      resolveSelectionDistributeTargets: () => ({}),
      resolveSelectionAlignTargets: () => ({}),
      createSelectionTargetOverrideEntries: () => [],
      alert() {},
      getComponentType: () => 'box',
      normalizeStyleName: (styleName) => styleName,
    });

    overrides = {};
    runtime.setMultiFrameSize('width', 96);

    expect(overrides.alpha).toEqual({ sizing_w: 'FIXED', width: 96 });
    expect(overrides.beta).toEqual({ sizing_w: 'FIXED', width: 96 });
    expect(setDirty).toHaveBeenCalledWith(true);
    expect(requestRelayoutNow).toHaveBeenCalledWith('alpha');
    expect(scheduleRelayout).not.toHaveBeenCalled();
    expect(renderMultiSelectionInspector).toHaveBeenCalled();
    expect(commitOverridePatchAction).toHaveBeenCalledWith(
      'Set width (multi)',
      { alpha: {}, beta: {} },
      {
        alpha: { sizing_w: 'FIXED', width: 96 },
        beta: { sizing_w: 'FIXED', width: 96 },
      },
    );
  });

  it('blocks multi-selection layout mutations when the capability callback is unavailable', () => {
    let overrides: Record<string, Record<string, unknown>> = {};
    const requestRelayoutNow = vi.fn();
    const renderMultiSelectionInspector = vi.fn();
    const runtime = createPreviewInspectorSelectionRuntime({
      selectedIds: new Set(['alpha', 'beta']),
      getSelectionActionInfo: () => ({
        items: [],
        hasUnsupported: false,
        sameParent: true,
        parentId: 'root',
      }),
      getMultiActionGap: () => 24,
      setMultiActionGap() {},
      captureOverrideEntries: vi.fn((ids: string[]) => (
        Object.fromEntries(ids.map((id) => [id, { ...(overrides[id] || {}) }]))
      )),
      commitOverridePatchAction: vi.fn(),
      getOverrides: () => overrides,
      coercedKeys: new Set<string>(),
      getNode: () => ({ type: 'box', data: { width: 120, height: 64 } }),
      cleanOverride() {},
      setDirty: vi.fn(),
      scheduleRelayout: vi.fn(),
      requestRelayoutNow,
      renderSelectionInspector: vi.fn(),
      renderMultiSelectionInspector,
      applyAllOverrides: vi.fn(),
      reapplySelection: vi.fn(),
      updateOverrideSummary: vi.fn(),
      refreshTreeColors: vi.fn(),
      runConstraints: vi.fn(),
      setOverride: vi.fn(),
      getGridInfo: () => null,
      getWidthUnit: () => 'px',
      getHeightUnit: () => 'px',
      baselineStep: 8,
      normalizeSelectionGap: (gap) => gap,
      resolveSelectionDistributeTargets: () => ({}),
      resolveSelectionAlignTargets: () => ({}),
      createSelectionTargetOverrideEntries: () => [],
      alert: vi.fn(),
      getComponentType: () => 'box',
      normalizeStyleName: (styleName) => styleName,
    });

    runtime.alignSelection('left');
    runtime.distributeSelection('x');
    runtime.setMultiFrameAlign('CENTER');
    runtime.setMultiFrameProp('direction', 'HORIZONTAL');
    runtime.setMultiFrameSize('width', 96);

    expect(overrides).toEqual({});
    expect(requestRelayoutNow).not.toHaveBeenCalled();
    expect(renderMultiSelectionInspector).toHaveBeenCalledTimes(5);
  });
});
