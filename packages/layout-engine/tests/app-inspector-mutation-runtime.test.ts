import { describe, expect, it, vi } from 'vitest';
import { createPreviewInspectorMutationRuntime } from '../src/preview-shell/app-inspector-mutation-runtime.js';

describe('createPreviewInspectorMutationRuntime', () => {
  it('applies boxed style changes without requesting relayout when geometry class is unchanged', () => {
    let overrides: Record<string, Record<string, unknown>> = {};
    const scheduleRelayout = vi.fn();
    const requestRelayoutNow = vi.fn();
    const applyAllOverrides = vi.fn();
    const renderSelectionInspector = vi.fn();
    const mutationResults: unknown[] = [];

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
      applyAllOverrides,
      renderSelectionInspector,
      cleanOverride: vi.fn(),
      getGridInfo: () => null,
      getWidthUnit: () => 'px',
      getHeightUnit: () => 'px',
      baselineStep: 8,
      getMutationContext: () => ({ activeEngineId: 'elk-force', documentKind: 'frame-diagram' }),
      onMutationTransaction: (result) => mutationResults.push(result),
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
    expect(applyAllOverrides).toHaveBeenCalledTimes(1);
    expect(renderSelectionInspector).toHaveBeenCalledWith('alpha');
    expect(mutationResults).toEqual([
      expect.objectContaining({
        kind: 'committed',
        mutationKind: 'inspector-appearance',
        activeEngineId: 'elk-force',
        documentKind: 'frame-diagram',
        relayoutPolicy: 'none',
        dirtyPolicy: 'mark-dirty',
        undoPolicy: 'record',
        persistenceDelta: {
          frameOverridesChanged: true,
          savePayloadChanged: true,
        },
      }),
    ]);
  });

  it('treats section-to-default box type changes as appearance-only', () => {
    let overrides: Record<string, Record<string, unknown>> = {};
    const scheduleRelayout = vi.fn();
    const requestRelayoutNow = vi.fn();
    const applyAllOverrides = vi.fn();

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
      applyAllOverrides,
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
    expect(applyAllOverrides).toHaveBeenCalledTimes(1);
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
      applyAllOverrides: vi.fn(),
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
    const mutationResults: unknown[] = [];
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
      applyAllOverrides: vi.fn(),
      renderSelectionInspector,
      cleanOverride: vi.fn(),
      getGridInfo: () => null,
      getWidthUnit: () => 'px',
      getHeightUnit: () => 'px',
      baselineStep: 8,
      getMutationContext: () => ({ activeEngineId: 'v3', documentKind: 'frame-diagram' }),
      onMutationTransaction: (result) => mutationResults.push(result),
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
    expect(mutationResults).toEqual([
      expect.objectContaining({
        kind: 'committed',
        mutationKind: 'inspector-layout',
        sourceControl: 'single-prop:gap_delta',
        activeEngineId: 'v3',
        documentKind: 'frame-diagram',
        relayoutPolicy: 'engine',
        dirtyPolicy: 'mark-dirty',
        undoPolicy: 'record',
        persistenceDelta: {
          frameOverridesChanged: true,
          savePayloadChanged: true,
        },
      }),
    ]);
  });

  it('requests immediate relayout for single-frame size mutations', () => {
    let overrides: Record<string, Record<string, unknown>> = {};
    const scheduleRelayout = vi.fn();
    const mutationResults: unknown[] = [];
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
      applyAllOverrides: vi.fn(),
      renderSelectionInspector: vi.fn(),
      cleanOverride: vi.fn(),
      getGridInfo: () => null,
      getWidthUnit: () => 'px',
      getHeightUnit: () => 'px',
      baselineStep: 8,
      getMutationContext: () => ({ activeEngineId: 'v3', documentKind: 'frame-diagram' }),
      onMutationTransaction: (result) => mutationResults.push(result),
    });

    overrides = {};
    runtime.setFrameSize('alpha', 'width', 120);

    expect(overrides.alpha).toEqual({ sizing_w: 'FIXED', width: 120 });
    expect(requestRelayoutNow).toHaveBeenCalledWith('alpha');
    expect(scheduleRelayout).not.toHaveBeenCalled();
    expect(mutationResults).toEqual([
      expect.objectContaining({
        kind: 'committed',
        mutationKind: 'geometry',
        sourceControl: 'single-size:width',
        activeEngineId: 'v3',
        documentKind: 'frame-diagram',
        relayoutPolicy: 'engine',
        dirtyPolicy: 'mark-dirty',
        undoPolicy: 'record',
      }),
    ]);
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
      applyAllOverrides: vi.fn(),
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

  it('emits inspector layout transactions after the mutation side effects have run', () => {
    let overrides: Record<string, Record<string, unknown>> = {};
    const mutationResults: unknown[] = [];
    const setDirty = vi.fn(() => {
      expect(mutationResults).toHaveLength(0);
    });
    const scheduleRelayout = vi.fn(() => {
      expect(mutationResults).toHaveLength(0);
    });

    const runtime = createPreviewInspectorMutationRuntime({
      captureOverrideEntries: (ids) => Object.fromEntries(ids.map((id) => [id, { ...(overrides[id] || {}) }])),
      commitOverridePatchAction: vi.fn(),
      getOverrides: () => overrides,
      coercedKeys: new Set<string>(),
      getNode: () => ({ type: 'box' }),
      snapToGrid: (value) => value,
      setDirty,
      scheduleRelayout,
      requestRelayoutNow: vi.fn(),
      applyAllOverrides: vi.fn(),
      renderSelectionInspector: vi.fn(),
      cleanOverride: vi.fn(),
      getGridInfo: () => null,
      getWidthUnit: () => 'px',
      getHeightUnit: () => 'px',
      baselineStep: 8,
      getMutationContext: () => ({ activeEngineId: 'v3', documentKind: 'frame-diagram' }),
      onMutationTransaction: (result) => mutationResults.push(result),
    });

    runtime.setFrameProp('root', 'gap_delta', 24);

    expect(mutationResults).toEqual([
      expect.objectContaining({
        kind: 'committed',
        mutationKind: 'inspector-layout',
        sourceControl: 'single-prop:gap_delta',
        relayoutPolicy: 'engine',
        dirtyPolicy: 'mark-dirty',
        undoPolicy: 'record',
      }),
    ]);
  });

  it('blocks native layout mutations when the active engine is not grid-editable', () => {
    let overrides: Record<string, Record<string, unknown>> = {};
    const requestRelayoutNow = vi.fn();
    const renderSelectionInspector = vi.fn();
    const mutationResults: unknown[] = [];
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
      applyAllOverrides: vi.fn(),
      renderSelectionInspector,
      cleanOverride: vi.fn(),
      getGridInfo: () => null,
      getWidthUnit: () => 'px',
      getHeightUnit: () => 'px',
      baselineStep: 8,
      shouldShowAutolayoutInspector: () => false,
      getMutationContext: () => ({ activeEngineId: 'elk-layered', documentKind: 'frame-diagram' }),
      onMutationTransaction: (result) => mutationResults.push(result),
    });

    runtime.setFrameAlign('panel', 'BOTTOM_LEFT');
    runtime.setFrameProp('panel', 'direction', 'HORIZONTAL');
    runtime.setFrameSize('panel', 'width', 120);

    expect(overrides).toEqual({});
    expect(requestRelayoutNow).not.toHaveBeenCalled();
    expect(renderSelectionInspector).toHaveBeenCalledTimes(3);
    expect(renderSelectionInspector).toHaveBeenCalledWith('panel');
    expect(mutationResults).toEqual([
      expect.objectContaining({
        kind: 'inert',
        mutationKind: 'inspector-layout',
        sourceControl: 'single-align',
        activeEngineId: 'elk-layered',
        documentKind: 'frame-diagram',
        relayoutPolicy: 'none',
        dirtyPolicy: 'preserve',
        undoPolicy: 'none',
      }),
      expect.objectContaining({
        kind: 'inert',
        mutationKind: 'inspector-layout',
        sourceControl: 'single-prop:direction',
      }),
      expect.objectContaining({
        kind: 'inert',
        mutationKind: 'geometry',
        sourceControl: 'single-size:width',
      }),
    ]);
  });
});
