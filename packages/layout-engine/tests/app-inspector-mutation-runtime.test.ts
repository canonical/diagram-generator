import { describe, expect, it, vi } from 'vitest';
import { createPreviewInspectorMutationRuntime } from '../src/preview-shell/app-inspector-mutation-runtime.js';

describe('createPreviewInspectorMutationRuntime', () => {
  it('dispatches single-frame prop mutations through typed owners and schedules relayout against the live override store', () => {
    let overrides: Record<string, Record<string, unknown>> = {};
    const captureOverrideEntries = vi.fn((ids: string[]) => (
      Object.fromEntries(ids.map((id) => [id, { ...(overrides[id] || {}) }]))
    ));
    const commitOverridePatchAction = vi.fn();
    const setDirty = vi.fn();
    const scheduleRelayout = vi.fn();
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
  });
});
