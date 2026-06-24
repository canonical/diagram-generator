import { describe, expect, it, vi } from 'vitest';
import {
  cancelPreviewLiveResizeRelayout,
  createPreviewLiveResizeRuntimeFromHost,
  createPreviewLiveResizeRuntime,
  createPreviewLiveResizeRelayoutState,
  schedulePreviewLiveResizeRelayout,
} from '../src/preview-shell/app-live-resize.js';

describe('preview live-resize relayout helpers', () => {
  it('uses engine-backed relayout when the active engine lane cannot use local relayout', async () => {
    const requestAnimationFrameFn = vi.fn(() => 1);
    const performEngineRelayout = vi.fn(async () => undefined);

    expect(schedulePreviewLiveResizeRelayout({
      state: createPreviewLiveResizeRelayoutState(),
      request: { cid: 'alpha', newW: 200, newH: 120, resizedW: true, resizedH: false },
      isElkLayeredDiagram: true,
      requestAnimationFrameFn,
      overrides: {},
      getGridOverrides: () => ({}),
      normalizeGridOverrides: (value) => value,
      getRelayoutStatus: () => ({ localReady: true, local: { reason: null } }),
      performEngineRelayout,
      performLocalRelayout: vi.fn(),
    })).toBe(true);
    expect(requestAnimationFrameFn).toHaveBeenCalledTimes(1);

    const callback = requestAnimationFrameFn.mock.calls[0]?.[0];
    expect(callback).toBeTypeOf('function');
    callback?.();
    await Promise.resolve();

    expect(performEngineRelayout).toHaveBeenCalledWith({
      alpha: {
        width: 200,
        sizing_w: 'FIXED',
      },
    }, {});
  });

  it('leaves engine-backed live relayout disabled when no engine relayout executor exists', () => {
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

  it('collapses rapid resize updates into one frame and relayouts from fixed-size temporary overrides', async () => {
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
    await Promise.resolve();

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
    expect(state.running).toBe(false);
  });

  it('cancels a pending relayout and clears queued state', () => {
    const cancelAnimationFrameFn = vi.fn();
    const state = {
      rafId: 99,
      latest: { cid: 'alpha', newW: 1, newH: 2, resizedW: true, resizedH: false },
      running: false,
    };

    cancelPreviewLiveResizeRelayout(state, cancelAnimationFrameFn);

    expect(cancelAnimationFrameFn).toHaveBeenCalledWith(99);
    expect(state).toEqual({
      rafId: null,
      latest: null,
      running: false,
    });
  });

  it('builds a runtime that owns schedule, cancel, and persisted resize orchestration', async () => {
    let callback: (() => void) | null = null;
    const requestRelayout = vi.fn();
    const performLocalRelayout = vi.fn();
    const setOverride = vi.fn();
    const cancelAnimationFrameFn = vi.fn();
    const state = createPreviewLiveResizeRelayoutState();
    const runtime = createPreviewLiveResizeRuntime({
      state,
      overrides: {
        alpha: { dx: 8 },
      },
      getGridOverrides: () => ({ cols: 4 }),
      normalizeGridOverrides: (value) => value,
      getRelayoutStatus: () => ({ localReady: true, local: { reason: null } }),
      isEngineLayoutActive: () => false,
      performLocalRelayout,
      requestAnimationFrameFn: (nextCallback) => {
        callback = nextCallback;
        return 77;
      },
      cancelAnimationFrameFn,
      getNode: () => ({
        data: { width: 200, height: 120 },
      }),
      getOwnDelta: () => ({ dw: 40, dh: 16 }),
      setOverride,
      requestRelayout,
      minSize: 8,
    });

    expect(runtime.scheduleRelayout('alpha', 320, 200, true, false)).toBe(true);
    callback?.();
    await Promise.resolve();
    runtime.persistResize(['alpha'], [], 'alpha');
    runtime.cancelRelayout();

    expect(performLocalRelayout).toHaveBeenCalledTimes(1);
    expect(setOverride).toHaveBeenCalledWith('alpha', {
      dx: 0,
      dy: 0,
      dw: 0,
      dh: 0,
      width: 240,
      sizing_w: 'FIXED',
      height: 136,
      sizing_h: 'FIXED',
    });
    expect(requestRelayout).toHaveBeenCalledWith('alpha');
    expect(cancelAnimationFrameFn).not.toHaveBeenCalled();
    expect(state.latest).toBeNull();
    expect(state.running).toBe(false);
  });

  it('reads the latest override map when the shell swaps override references', async () => {
    let callback: (() => void) | null = null;
    let overrides = {
      alpha: { dx: 8 },
    };
    const performLocalRelayout = vi.fn();
    const runtime = createPreviewLiveResizeRuntimeFromHost({
      state: createPreviewLiveResizeRelayoutState(),
      model: {
        gridOverrides: { cols: 4 },
      },
      getOverrides: () => overrides,
      normalizeGridOverrides: (value) => value,
      getRelayoutStatus: () => ({ localReady: true, local: { reason: null } }),
      isEngineLayoutActive: () => false,
      previewBridgeHost: {
        performLocalRelayout,
      },
      requestAnimationFrameFn: (nextCallback) => {
        callback = nextCallback;
        return 17;
      },
      cancelAnimationFrameFn() {},
      getNode() {
        return { data: { width: 200, height: 120 } };
      },
      getOwnDelta() {
        return { dw: 0, dh: 0 };
      },
      setOverride() {},
      requestRelayout() {},
    });

    overrides = {
      alpha: { dx: 99, keep: true },
    };

    expect(runtime.scheduleRelayout('alpha', 280, 160, true, false)).toBe(true);
    callback?.();
    await Promise.resolve();

    expect(performLocalRelayout).toHaveBeenCalledWith(
      { gridOverrides: { cols: 4 } },
      {
        alpha: {
          keep: true,
          width: 280,
          sizing_w: 'FIXED',
        },
      },
      { cols: 4 },
      { skipModelUpdate: true },
    );
  });

  it('reapplies selection after host-based live relayout completes', async () => {
    let callback: (() => void) | null = null;
    const performLocalRelayout = vi.fn();
    const reapplySelection = vi.fn();
    const runtime = createPreviewLiveResizeRuntimeFromHost({
      state: createPreviewLiveResizeRelayoutState(),
      model: {
        gridOverrides: { cols: 4 },
      },
      getOverrides: () => ({
        alpha: { keep: true },
      }),
      normalizeGridOverrides: (value) => value,
      getRelayoutStatus: () => ({ localReady: true, local: { reason: null } }),
      isEngineLayoutActive: () => false,
      previewBridgeHost: {
        performLocalRelayout,
      },
      requestAnimationFrameFn: (nextCallback) => {
        callback = nextCallback;
        return 31;
      },
      cancelAnimationFrameFn() {},
      getNode() {
        return { data: { width: 200, height: 120 } };
      },
      getOwnDelta() {
        return { dw: 0, dh: 0 };
      },
      setOverride() {},
      requestRelayout() {},
      reapplySelection,
    });

    expect(runtime.scheduleRelayout('alpha', 280, 160, true, false)).toBe(true);
    callback?.();
    await Promise.resolve();

    expect(performLocalRelayout).toHaveBeenCalledTimes(1);
    expect(reapplySelection).toHaveBeenCalledTimes(1);
  });

  it('routes active engine live resize through the typed bridge without mutating the committed model', async () => {
    let callback: (() => void) | null = null;
    const performEngineRelayout = vi.fn(async () => ({ width: 320, height: 200 }));
    const runtime = createPreviewLiveResizeRuntimeFromHost({
      state: createPreviewLiveResizeRelayoutState(),
      model: {
        gridOverrides: { cols: 4 },
      },
      getOverrides: () => ({
        alpha: { dx: 24, keep: true },
      }),
      normalizeGridOverrides: (value) => value,
      getRelayoutStatus: () => ({ localReady: true, local: { reason: null } }),
      isEngineLayoutActive: () => true,
      previewBridgeHost: {
        performEngineRelayout,
        performLocalRelayout: vi.fn(),
      },
      requestAnimationFrameFn: (nextCallback) => {
        callback = nextCallback;
        return 23;
      },
      cancelAnimationFrameFn() {},
      getNode() {
        return { data: { width: 200, height: 120 } };
      },
      getOwnDelta() {
        return { dw: 0, dh: 0 };
      },
      setOverride() {},
      requestRelayout() {},
    });

    expect(runtime.scheduleRelayout('alpha', 280, 160, true, true)).toBe(true);
    callback?.();
    await Promise.resolve();

    expect(performEngineRelayout).toHaveBeenCalledWith(
      { gridOverrides: { cols: 4 } },
      {
        alpha: {
          keep: true,
          width: 280,
          sizing_w: 'FIXED',
          height: 160,
          sizing_h: 'FIXED',
        },
      },
      { cols: 4 },
      { skipModelUpdate: true },
    );
  });
});
