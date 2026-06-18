import { describe, expect, it, vi } from 'vitest';
import {
  createPreviewRelayoutRuntime,
  createPreviewRelayoutRuntimeFromRuntime,
  createPreviewRelayoutRuntimeOptionsFromHost,
  createPreviewRelayoutRuntimeOptionsFromRuntime,
} from '../src/preview-shell/app-relayout-runtime.js';

describe('createPreviewRelayoutRuntime', () => {
  it('delegates relayout requests and clear-override flows through typed relayout owners', async () => {
    const performLocalRelayout = vi.fn(() => ({ coerced: null }));
    const failRelayout = vi.fn();
    const finishRelayout = vi.fn(() => true);
    const applyAllOverrides = vi.fn();
    const updateInspector = vi.fn();
    const runtime = createPreviewRelayoutRuntime({
      overrides: { alpha: { waypoints: [[24, 32]] } },
      coercedKeys: new Set<string>(),
      getGridOverrides: () => ({ cols: 8 }),
      normalizeGridOverrides: (value) => value,
      getRelayoutStatus: () => ({ localReady: true }),
      isElkLayeredDiagram: () => false,
      performLocalRelayout,
      failRelayout,
      finishRelayout,
      logError: vi.fn(),
      hasWaypointOverride: (cid) => cid === 'alpha',
      clearOverride: vi.fn(),
      setDirty: vi.fn(),
      applyAllOverrides,
      isSelected: () => true,
      updateInspector,
      restoreArrowFromTree: vi.fn(),
      captureOverrideEntries: vi.fn(() => ({})),
      commitOverridePatchAction: vi.fn(),
    });

    await runtime.requestRelayout('alpha');
    runtime.clearOverride('alpha');
    await Promise.resolve();

    expect(performLocalRelayout).toHaveBeenCalledWith({ cols: 8 });
    expect(failRelayout).not.toHaveBeenCalled();
    expect(finishRelayout).toHaveBeenCalledWith('alpha', { coerced: null }, 'local');
    expect(applyAllOverrides).not.toHaveBeenCalled();
    expect(updateInspector).toHaveBeenCalledWith('alpha');
  });

  it('builds typed relayout runtime options from host-owned bridge contracts', async () => {
    const options = createPreviewRelayoutRuntimeOptionsFromHost({
      overrides: { alpha: { waypoints: [[24, 32]] } },
      coercedKeys: new Set<string>(),
      model: { id: 'model' },
      selectedIds: new Set<string>(['alpha']),
      previewBridgeHost: {
        performEngineRelayout: vi.fn(async (_model, overrides, gridOverrides) => ({
          coerced: null,
          width: Object.keys(overrides).length,
          height: Object.keys(gridOverrides as Record<string, unknown>).length,
        })),
        performLocalRelayout: vi.fn(() => ({ coerced: null, width: 320, height: 200 })),
      },
      getGridOverrides: () => ({ cols: 8 }),
      normalizeGridOverrides: (value) => value,
      getRelayoutStatus: () => ({ localReady: true }),
      isEngineLayoutActive: () => true,
      failRelayout: vi.fn(),
      finishRelayout: vi.fn(),
      logError: vi.fn(),
      clearOverride: vi.fn(),
      setDirty: vi.fn(),
      applyAllOverrides: vi.fn(),
      updateInspector: vi.fn(),
      reloadTreeAfterArrowRestore: vi.fn(async () => undefined),
      rebuildArrowSvg: vi.fn(),
      captureOverrideEntries: vi.fn(() => ({})),
      commitOverridePatchAction: vi.fn(),
    });

    const localResult = options.performLocalRelayout({ cols: 8 });
    const engineResult = await options.performEngineRelayout?.({ cols: 4 });
    await options.restoreArrowFromTree('alpha');

    expect(localResult).toMatchObject({ width: 320, height: 200 });
    expect(engineResult).toMatchObject({ width: 1, height: 1 });
    expect(options.hasWaypointOverride('alpha')).toBe(true);
    expect(options.isSelected('alpha')).toBe(true);
    expect(options.restoreArrowFromTree).toBeTypeOf('function');
  });

  it('derives typed relayout runtime options from thinner runtime-owned state', async () => {
    const options = createPreviewRelayoutRuntimeOptionsFromRuntime({
      overrides: { alpha: { waypoints: [[24, 32]] } },
      coercedKeys: new Set<string>(),
      model: { id: 'model' },
      previewBridgeHost: {
        performEngineRelayout: vi.fn(async (_model, overrides, gridOverrides) => ({
          coerced: null,
          width: Object.keys(overrides).length,
          height: Object.keys(gridOverrides as Record<string, unknown>).length,
        })),
        performLocalRelayout: vi.fn(() => ({ coerced: null, width: 320, height: 200 })),
      },
      gridState: {
        getGridOverrides: () => ({ cols: 8 }),
        normalizeGridOverrides: (value) => value,
      },
      selectionState: {
        selectedIds: new Set<string>(['alpha']),
      },
      getRelayoutStatus: () => ({ localReady: true }),
      isEngineLayoutActive: () => true,
      failRelayout: vi.fn(),
      finishRelayout: vi.fn(),
      logError: vi.fn(),
      clearOverride: vi.fn(),
      setDirty: vi.fn(),
      applyAllOverrides: vi.fn(),
      updateInspector: vi.fn(),
      reloadTreeAfterArrowRestore: vi.fn(async () => undefined),
      rebuildArrowSvg: vi.fn(),
      editorState: {
        captureOverrideEntries: vi.fn(() => ({})),
        commitOverridePatchAction: vi.fn(),
      },
    });

    const localResult = options.performLocalRelayout({ cols: 8 });
    const engineResult = await options.performEngineRelayout?.({ cols: 4 });
    await options.restoreArrowFromTree('alpha');

    expect(localResult).toMatchObject({ width: 320, height: 200 });
    expect(engineResult).toMatchObject({ width: 1, height: 1 });
    expect(options.hasWaypointOverride('alpha')).toBe(true);
    expect(options.isSelected('alpha')).toBe(true);
    expect(options.restoreArrowFromTree).toBeTypeOf('function');
  });

  it('builds a relayout runtime directly from grouped runtime-owned state', async () => {
    const finishRelayout = vi.fn(() => true);
    const runtime = createPreviewRelayoutRuntimeFromRuntime({
      overrides: { alpha: { waypoints: [[24, 32]] } },
      coercedKeys: new Set<string>(),
      model: { id: 'model' },
      previewBridgeHost: {
        performEngineRelayout: vi.fn(async () => ({ coerced: null })),
        performLocalRelayout: vi.fn(() => ({ coerced: null })),
      },
      gridState: {
        getGridOverrides: () => ({ cols: 8 }),
        normalizeGridOverrides: (value) => value,
      },
      selectionState: {
        selectedIds: new Set<string>(['alpha']),
      },
      getRelayoutStatus: () => ({ localReady: true }),
      isEngineLayoutActive: () => false,
      failRelayout: vi.fn(),
      finishRelayout,
      logError: vi.fn(),
      clearOverride: vi.fn(),
      setDirty: vi.fn(),
      applyAllOverrides: vi.fn(),
      updateInspector: vi.fn(),
      reloadTreeAfterArrowRestore: vi.fn(async () => undefined),
      rebuildArrowSvg: vi.fn(),
      editorState: {
        captureOverrideEntries: vi.fn(() => ({})),
        commitOverridePatchAction: vi.fn(),
      },
    });

    await runtime.requestRelayout('alpha');

    expect(finishRelayout).toHaveBeenCalledWith('alpha', { coerced: null }, 'local');
  });
});
