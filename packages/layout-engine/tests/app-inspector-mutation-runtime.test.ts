import { describe, expect, it, vi } from 'vitest';
import { createPreviewInspectorMutationRuntime } from '../src/preview-shell/app-inspector-mutation-runtime.js';

describe('createPreviewInspectorMutationRuntime', () => {
  it('applies boxed style changes without requesting relayout when geometry class is unchanged', () => {
    let overrides: Record<string, Record<string, unknown>> = {};
    const scheduleRelayout = vi.fn();
    const requestRelayoutNow = vi.fn();
    const renderSelectionInspector = vi.fn();

    const runtime = createPreviewInspectorMutationRuntime({
      captureOverrideEntries: (ids) => Object.fromEntries(ids.map((id) => [id, { ...(overrides[id] || {}) }])),
      commitOverridePatchAction: vi.fn(),
      getOverrides: () => overrides,
      coercedKeys: new Set<string>(),
      getNode: () => ({ type: 'box', level: 1, fill: 'WHITE', border: 'SOLID' }),
      snapToGrid: (value) => value,
      setDirty: vi.fn(),
      scheduleRelayout,
      requestRelayoutNow,
      renderSelectionInspector,
      cleanOverride: vi.fn(),
      getGridInfo: () => null,
      getWidthUnit: () => 'px',
      getHeightUnit: () => 'px',
      baselineStep: 8,
    });

    runtime.applyStyle('alpha', 'parent');

    expect(overrides.alpha).toEqual({
      level: 2,
      fill: 'GREY',
      border: 'SOLID',
      style: 'parent',
    });
    expect(scheduleRelayout).not.toHaveBeenCalled();
    expect(requestRelayoutNow).not.toHaveBeenCalled();
    expect(renderSelectionInspector).toHaveBeenCalledWith('alpha');
  });

  it('treats section-to-default box type changes as appearance-only', () => {
    let overrides: Record<string, Record<string, unknown>> = {};
    const scheduleRelayout = vi.fn();
    const requestRelayoutNow = vi.fn();

    const runtime = createPreviewInspectorMutationRuntime({
      captureOverrideEntries: (ids) => Object.fromEntries(ids.map((id) => [id, { ...(overrides[id] || {}) }])),
      commitOverridePatchAction: vi.fn(),
      getOverrides: () => overrides,
      coercedKeys: new Set<string>(),
      getNode: () => ({ type: 'box', level: 3, fill: 'WHITE', border: 'SOLID' }),
      snapToGrid: (value) => value,
      setDirty: vi.fn(),
      scheduleRelayout,
      requestRelayoutNow,
      renderSelectionInspector: vi.fn(),
      cleanOverride: vi.fn(),
      getGridInfo: () => null,
      getWidthUnit: () => 'px',
      getHeightUnit: () => 'px',
      baselineStep: 8,
    });

    runtime.applyStyle('step_problem', 'default');

    expect(overrides.step_problem).toEqual({
      level: 1,
      fill: 'WHITE',
      border: 'SOLID',
      style: 'default',
    });
    expect(scheduleRelayout).not.toHaveBeenCalled();
    expect(requestRelayoutNow).not.toHaveBeenCalled();
  });

  it('keeps requesting relayout for style changes that alter measured geometry class', () => {
    let overrides: Record<string, Record<string, unknown>> = {};
    const scheduleRelayout = vi.fn();

    const runtime = createPreviewInspectorMutationRuntime({
      captureOverrideEntries: (ids) => Object.fromEntries(ids.map((id) => [id, { ...(overrides[id] || {}) }])),
      commitOverridePatchAction: vi.fn(),
      getOverrides: () => overrides,
      coercedKeys: new Set<string>(),
      getNode: () => ({ type: 'box', level: 1, fill: 'WHITE', border: 'SOLID' }),
      snapToGrid: (value) => value,
      setDirty: vi.fn(),
      scheduleRelayout,
      requestRelayoutNow: vi.fn(),
      renderSelectionInspector: vi.fn(),
      cleanOverride: vi.fn(),
      getGridInfo: () => null,
      getWidthUnit: () => 'px',
      getHeightUnit: () => 'px',
      baselineStep: 8,
    });

    runtime.applyStyle('alpha', 'annotation');

    expect(overrides.alpha).toEqual({
      fill: 'WHITE',
      border: 'NONE',
      style: 'annotation',
    });
    expect(scheduleRelayout).toHaveBeenCalledWith('alpha');
  });

  it('dispatches single-frame prop mutations through typed owners and schedules relayout against the live override store', () => {
    let overrides: Record<string, Record<string, unknown>> = {};
    const captureOverrideEntries = vi.fn((ids: string[]) => (
      Object.fromEntries(ids.map((id) => [id, { ...(overrides[id] || {}) }]))
    ));
    const commitOverridePatchAction = vi.fn();
    const setDirty = vi.fn();
    const scheduleRelayout = vi.fn();
    const requestRelayoutNow = vi.fn();
    const renderSelectionInspector = vi.fn();
    const runtime = createPreviewInspectorMutationRuntime({
      captureOverrideEntries,
      commitOverridePatchAction,
      getOverrides: () => overrides,
      coercedKeys: new Set<string>(),
      getNode: () => ({ type: 'box' }),
      snapToGrid: (value) => value,
      setDirty,
      scheduleRelayout,
      requestRelayoutNow,
      renderSelectionInspector,
      cleanOverride: vi.fn(),
      getGridInfo: () => null,
      getWidthUnit: () => 'px',
      getHeightUnit: () => 'px',
      baselineStep: 8,
    });

    overrides = {};
    runtime.setFrameProp('root', 'gap_delta', 24);

    expect(overrides.root).toEqual({ gap_delta: 24 });
    expect(setDirty).toHaveBeenCalledWith(true);
    expect(scheduleRelayout).toHaveBeenCalledWith('root');
    expect(renderSelectionInspector).toHaveBeenCalledWith('root');
    expect(commitOverridePatchAction).toHaveBeenCalledWith(
      'Change gap_delta',
      { root: {} },
      { root: { gap_delta: 24 } },
    );
    expect(requestRelayoutNow).not.toHaveBeenCalled();
  });

  it('requests immediate relayout for single-frame size mutations', () => {
    let overrides: Record<string, Record<string, unknown>> = {};
    const scheduleRelayout = vi.fn();
    const requestRelayoutNow = vi.fn();

    const runtime = createPreviewInspectorMutationRuntime({
      captureOverrideEntries: (ids) => Object.fromEntries(ids.map((id) => [id, { ...(overrides[id] || {}) }])),
      commitOverridePatchAction: vi.fn(),
      getOverrides: () => overrides,
      coercedKeys: new Set<string>(),
      getNode: () => ({ type: 'box' }),
      snapToGrid: (value) => value,
      setDirty: vi.fn(),
      scheduleRelayout,
      requestRelayoutNow,
      renderSelectionInspector: vi.fn(),
      cleanOverride: vi.fn(),
      getGridInfo: () => null,
      getWidthUnit: () => 'px',
      getHeightUnit: () => 'px',
      baselineStep: 8,
    });

    overrides = {};
    runtime.setFrameSize('alpha', 'width', 120);

    expect(overrides.alpha).toEqual({ sizing_w: 'FIXED', width: 120 });
    expect(requestRelayoutNow).toHaveBeenCalledWith('alpha');
    expect(scheduleRelayout).not.toHaveBeenCalled();
  });

  it('requests immediate relayout for visual layout properties', () => {
    let overrides: Record<string, Record<string, unknown>> = {};
    const scheduleRelayout = vi.fn();
    const requestRelayoutNow = vi.fn();

    const runtime = createPreviewInspectorMutationRuntime({
      captureOverrideEntries: (ids) => Object.fromEntries(ids.map((id) => [id, { ...(overrides[id] || {}) }])),
      commitOverridePatchAction: vi.fn(),
      getOverrides: () => overrides,
      coercedKeys: new Set<string>(),
      getNode: () => ({ type: 'box', children: [{ id: 'child' }] }),
      snapToGrid: (value) => value,
      setDirty: vi.fn(),
      scheduleRelayout,
      requestRelayoutNow,
      renderSelectionInspector: vi.fn(),
      cleanOverride: vi.fn(),
      getGridInfo: () => null,
      getWidthUnit: () => 'px',
      getHeightUnit: () => 'px',
      baselineStep: 8,
    });

    runtime.setFrameAlign('panel', 'BOTTOM_LEFT');
    runtime.setFrameProp('panel', 'direction', 'HORIZONTAL');

    expect(overrides.panel).toEqual({ align: 'BOTTOM_LEFT', direction: 'HORIZONTAL' });
    expect(requestRelayoutNow).toHaveBeenCalledWith('panel');
    expect(requestRelayoutNow).toHaveBeenCalledTimes(2);
    expect(scheduleRelayout).not.toHaveBeenCalled();
  });

  it('blocks native layout mutations when the active engine is not grid-editable', () => {
    let overrides: Record<string, Record<string, unknown>> = {};
    const requestRelayoutNow = vi.fn();
    const renderSelectionInspector = vi.fn();
    const runtime = createPreviewInspectorMutationRuntime({
      captureOverrideEntries: (ids) => Object.fromEntries(ids.map((id) => [id, { ...(overrides[id] || {}) }])),
      commitOverridePatchAction: vi.fn(),
      getOverrides: () => overrides,
      coercedKeys: new Set<string>(),
      getNode: () => ({ type: 'box', children: [{ id: 'child' }] }),
      snapToGrid: (value) => value,
      setDirty: vi.fn(),
      scheduleRelayout: vi.fn(),
      requestRelayoutNow,
      renderSelectionInspector,
      cleanOverride: vi.fn(),
      getGridInfo: () => null,
      getWidthUnit: () => 'px',
      getHeightUnit: () => 'px',
      baselineStep: 8,
      shouldShowAutolayoutInspector: () => false,
    });

    runtime.setFrameAlign('panel', 'BOTTOM_LEFT');
    runtime.setFrameProp('panel', 'direction', 'HORIZONTAL');
    runtime.setFrameSize('panel', 'width', 120);

    expect(overrides).toEqual({});
    expect(requestRelayoutNow).not.toHaveBeenCalled();
    expect(renderSelectionInspector).toHaveBeenCalledTimes(3);
    expect(renderSelectionInspector).toHaveBeenCalledWith('panel');
  });
});
