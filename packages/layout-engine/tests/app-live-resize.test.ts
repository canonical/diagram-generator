import { describe, expect, it, vi } from 'vitest';
import {
  cancelPreviewLiveResizeRelayout,
  createPreviewLiveResizeRelayoutState,
  schedulePreviewLiveResizeRelayout,
} from '../src/preview-shell/app-live-resize.js';

describe('preview live-resize relayout helpers', () => {
  it('skips scheduling live relayout for ELK layered diagrams', () => {
    const requestAnimationFrameFn = vi.fn(() => 1);

    expect(schedulePreviewLiveResizeRelayout({
      state: createPreviewLiveResizeRelayoutState(),
      request: { cid: 'alpha', newW: 200, newH: 120, resizedW: true, resizedH: false },
      isElkLayeredDiagram: true,
      requestAnimationFrameFn,
      overrides: {},
      getGridOverrides: () => ({}),
      normalizeGridOverrides: (value) => value,
      getRelayoutStatus: () => ({ localReady: true, local: { reason: null } }),
      performLocalRelayout: vi.fn(),
    })).toBe(false);
    expect(requestAnimationFrameFn).not.toHaveBeenCalled();
  });

  it('collapses rapid resize updates into one frame and relayouts from fixed-size temporary overrides', () => {
    let callback: (() => void) | null = null;
    const requestAnimationFrameFn = vi.fn((nextCallback: () => void) => {
      callback = nextCallback;
      return 42;
    });
    const performLocalRelayout = vi.fn();
    const normalizeGridOverrides = vi.fn((value) => ({
      ...value,
      normalized: true,
    }));
    const state = createPreviewLiveResizeRelayoutState();
    const overrides = {
      alpha: { dx: 8, dy: 16, dw: 24, dh: 32, keep: true },
      beta: { note: 'keep' },
    };

    schedulePreviewLiveResizeRelayout({
      state,
      request: { cid: 'alpha', newW: 240, newH: 160, resizedW: true, resizedH: false },
      isElkLayeredDiagram: false,
      requestAnimationFrameFn,
      overrides,
      getGridOverrides: () => ({ cols: 4 }),
      normalizeGridOverrides,
      getRelayoutStatus: () => ({ localReady: true, local: { reason: null } }),
      performLocalRelayout,
    });
    schedulePreviewLiveResizeRelayout({
      state,
      request: { cid: 'alpha', newW: 320, newH: 192, resizedW: true, resizedH: true },
      isElkLayeredDiagram: false,
      requestAnimationFrameFn,
      overrides,
      getGridOverrides: () => ({ cols: 4 }),
      normalizeGridOverrides,
      getRelayoutStatus: () => ({ localReady: true, local: { reason: null } }),
      performLocalRelayout,
    });

    expect(requestAnimationFrameFn).toHaveBeenCalledTimes(1);
    expect(state.rafId).toBe(42);
    expect(state.latest).toEqual({
      cid: 'alpha',
      newW: 320,
      newH: 192,
      resizedW: true,
      resizedH: true,
    });

    callback?.();

    expect(normalizeGridOverrides).toHaveBeenCalledWith({ cols: 4 });
    expect(performLocalRelayout).toHaveBeenCalledWith({
      alpha: {
        keep: true,
        width: 320,
        sizing_w: 'FIXED',
        height: 192,
        sizing_h: 'FIXED',
      },
      beta: { note: 'keep' },
    }, {
      cols: 4,
      normalized: true,
    });
    expect(overrides.alpha).toEqual({
      dx: 8,
      dy: 16,
      dw: 24,
      dh: 32,
      keep: true,
    });
    expect(state.rafId).toBeNull();
    expect(state.latest).toBeNull();
  });

  it('cancels a pending relayout and clears queued state', () => {
    const cancelAnimationFrameFn = vi.fn();
    const state = {
      rafId: 99,
      latest: { cid: 'alpha', newW: 1, newH: 2, resizedW: true, resizedH: false },
    };

    cancelPreviewLiveResizeRelayout(state, cancelAnimationFrameFn);

    expect(cancelAnimationFrameFn).toHaveBeenCalledWith(99);
    expect(state).toEqual({
      rafId: null,
      latest: null,
    });
  });
});
