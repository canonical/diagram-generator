import { describe, expect, it, vi } from 'vitest';
import { createPreviewRelayoutRuntime } from '../src/preview-shell/app-relayout-runtime.js';

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
});
