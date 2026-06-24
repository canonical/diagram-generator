import type { PreviewRelayoutStatus } from './app-relayout.js';
import { persistPreviewResizeToFrameOverrides } from './app-resize-host.js';

/**
 * Preview live-resize relayout helpers (spec 043 shell coordinator slice O).
 *
 * These helpers keep the ELK-vs-local live-resize policy and temporary
 * relayout override shaping out of editor.js while the shell still provides
 * concrete relayout callbacks.
 */

export interface PreviewLiveResizeRelayoutRequest {
  cid: string;
  newW: number;
  newH: number;
  resizedW: boolean;
  resizedH: boolean;
}

export interface PreviewLiveResizeRelayoutState {
  rafId: number | null;
  latest: PreviewLiveResizeRelayoutRequest | null;
  running: boolean;
}

export interface PreviewLiveResizeOverrideEntry {
  [key: string]: unknown;
}

export type PreviewLiveResizeOverrideMap = Record<
string,
PreviewLiveResizeOverrideEntry | undefined
>;

export interface SchedulePreviewLiveResizeRelayoutOptions<TGridOverrides> {
  state: PreviewLiveResizeRelayoutState;
  request: PreviewLiveResizeRelayoutRequest;
  isEngineLayoutActive?: boolean;
  /** @deprecated Prefer `isEngineLayoutActive`. */
  isElkLayeredDiagram?: boolean;
  requestAnimationFrameFn: (callback: () => void) => number;
  getOverrides?: (() => PreviewLiveResizeOverrideMap) | null;
  overrides: PreviewLiveResizeOverrideMap;
  getGridOverrides: () => TGridOverrides;
  normalizeGridOverrides: (value: TGridOverrides) => TGridOverrides;
  getRelayoutStatus: () => PreviewRelayoutStatus;
  performEngineRelayout?: ((
    temporaryOverrides: PreviewLiveResizeOverrideMap,
    normalizedGridOverrides: TGridOverrides,
  ) => Promise<unknown> | unknown) | null;
  performLocalRelayout: (
    temporaryOverrides: PreviewLiveResizeOverrideMap,
    normalizedGridOverrides: TGridOverrides,
  ) => unknown;
  reapplySelection?: (() => void) | null;
}

export interface CreatePreviewLiveResizeRuntimeOptions<TGridOverrides> {
  state: PreviewLiveResizeRelayoutState;
  getOverrides?: (() => PreviewLiveResizeOverrideMap) | null;
  /** @deprecated Prefer `getOverrides`. */
  overrides?: PreviewLiveResizeOverrideMap;
  getGridOverrides: () => TGridOverrides;
  normalizeGridOverrides: (value: TGridOverrides) => TGridOverrides;
  getRelayoutStatus: () => PreviewRelayoutStatus;
  isEngineLayoutActive?: (() => boolean) | null;
  /** @deprecated Prefer `isEngineLayoutActive`. */
  isElkLayeredDiagram?: (() => boolean) | null;
  performEngineRelayout?: ((
    temporaryOverrides: PreviewLiveResizeOverrideMap,
    normalizedGridOverrides: TGridOverrides,
  ) => Promise<unknown> | unknown) | null;
  performLocalRelayout: (
    temporaryOverrides: PreviewLiveResizeOverrideMap,
    normalizedGridOverrides: TGridOverrides,
  ) => unknown;
  requestAnimationFrameFn: (callback: () => void) => number;
  cancelAnimationFrameFn: (id: number) => void;
  getNode: (cid: string) => {
    data?: { width?: number | null; height?: number | null } | null;
  } | null | undefined;
  getOwnDelta: (cid: string) => Record<string, unknown> | null | undefined;
  setOverride: (cid: string, patch: Record<string, unknown>) => void;
  requestRelayout: (cid: string) => unknown;
  minSize?: number;
  reapplySelection?: (() => void) | null;
}

export interface CreatePreviewLiveResizeRuntimeFromHostOptions<TGridOverrides, TModel> {
  state: PreviewLiveResizeRelayoutState;
  model: TModel & {
    gridOverrides?: TGridOverrides;
  };
  getOverrides: () => PreviewLiveResizeOverrideMap;
  normalizeGridOverrides: (value: TGridOverrides) => TGridOverrides;
  getRelayoutStatus: () => PreviewRelayoutStatus;
  isEngineLayoutActive?: (() => boolean) | null;
  /** @deprecated Prefer `isEngineLayoutActive`. */
  isElkLayeredDiagram?: (() => boolean) | null;
  previewBridgeHost: {
    performEngineRelayout?: ((
      model: TModel,
      temporaryOverrides: PreviewLiveResizeOverrideMap,
      normalizedGridOverrides: TGridOverrides,
      options?: { skipModelUpdate?: boolean },
    ) => Promise<unknown> | unknown) | null;
    performLocalRelayout: (
      model: TModel,
      temporaryOverrides: PreviewLiveResizeOverrideMap,
      normalizedGridOverrides: TGridOverrides,
      options?: { skipModelUpdate?: boolean },
    ) => unknown;
  };
  requestAnimationFrameFn: (callback: () => void) => number;
  cancelAnimationFrameFn: (id: number) => void;
  getNode: (cid: string) => {
    data?: { width?: number | null; height?: number | null } | null;
  } | null | undefined;
  getOwnDelta: (cid: string) => Record<string, unknown> | null | undefined;
  setOverride: (cid: string, patch: Record<string, unknown>) => void;
  requestRelayout: (cid: string) => unknown;
  minSize?: number;
  reapplySelection?: (() => void) | null;
}

export interface PreviewLiveResizeRuntime {
  scheduleRelayout: (
    cid: string,
    newW: number,
    newH: number,
    resizedW: boolean,
    resizedH: boolean,
  ) => boolean;
  cancelRelayout: () => void;
  persistResize: (
    resizeIds: Iterable<string>,
    propagatedIds: Iterable<string>,
    triggerCid: string,
    baseSizes?: Record<string, { width: number; height: number }> | null,
  ) => void;
}

function clonePreviewLiveResizeOverrides(
  overrides: PreviewLiveResizeOverrideMap,
  request: PreviewLiveResizeRelayoutRequest,
): PreviewLiveResizeOverrideMap {
  const temporaryOverrides = Object.fromEntries(
    Object.entries(overrides).map(([frameId, entry]) => [
      frameId,
      entry ? { ...entry } : entry,
    ]),
  ) as PreviewLiveResizeOverrideMap;

  if (!temporaryOverrides[request.cid]) {
    temporaryOverrides[request.cid] = {};
  }
  const entry = temporaryOverrides[request.cid] as PreviewLiveResizeOverrideEntry;

  if (request.resizedW) {
    entry.width = request.newW;
    entry.sizing_w = 'FIXED';
  }
  if (request.resizedH) {
    entry.height = request.newH;
    entry.sizing_h = 'FIXED';
  }

  delete entry.dx;
  delete entry.dy;
  delete entry.dw;
  delete entry.dh;
  return temporaryOverrides;
}

function resolvePreviewLiveResizeOverrides<TGridOverrides>(
  options: CreatePreviewLiveResizeRuntimeOptions<TGridOverrides>,
): PreviewLiveResizeOverrideMap {
  return options.getOverrides?.() ?? options.overrides ?? {};
}

function resolveScheduledPreviewLiveResizeOverrides<TGridOverrides>(
  options: SchedulePreviewLiveResizeRelayoutOptions<TGridOverrides>,
): PreviewLiveResizeOverrideMap {
  return options.getOverrides?.() ?? options.overrides ?? {};
}

function schedulePreviewLiveResizeFrame<TGridOverrides>(
  options: SchedulePreviewLiveResizeRelayoutOptions<TGridOverrides>,
): void {
  if (options.state.rafId != null || options.state.running) {
    return;
  }

  options.state.rafId = options.requestAnimationFrameFn(() => {
    options.state.rafId = null;
    const latest = options.state.latest;
    options.state.latest = null;
    if (!latest) {
      return;
    }

    const relayoutStatus = options.getRelayoutStatus();
    if (!relayoutStatus.localReady) {
      return;
    }

    const temporaryOverrides = clonePreviewLiveResizeOverrides(
      resolveScheduledPreviewLiveResizeOverrides(options),
      latest,
    );
    const normalizedGridOverrides = options.normalizeGridOverrides(
      options.getGridOverrides(),
    );
    const isEngineLayoutActive = options.isEngineLayoutActive ?? options.isElkLayeredDiagram ?? false;
    const performRelayout = isEngineLayoutActive
      ? options.performEngineRelayout
      : options.performLocalRelayout;
    if (!performRelayout) {
      return;
    }

    options.state.running = true;
    void Promise.resolve(
      performRelayout(temporaryOverrides, normalizedGridOverrides),
    ).finally(() => {
      options.reapplySelection?.();
      options.state.running = false;
      if (options.state.latest) {
        schedulePreviewLiveResizeFrame(options);
      }
    });
  });
}

export function createPreviewLiveResizeRelayoutState(): PreviewLiveResizeRelayoutState {
  return {
    rafId: null,
    latest: null,
    running: false,
  };
}

export function schedulePreviewLiveResizeRelayout<TGridOverrides>(
  options: SchedulePreviewLiveResizeRelayoutOptions<TGridOverrides>,
): boolean {
  const isEngineLayoutActive = options.isEngineLayoutActive ?? options.isElkLayeredDiagram ?? false;
  if (isEngineLayoutActive && !options.performEngineRelayout) {
    return false;
  }

  options.state.latest = { ...options.request };
  if (options.state.rafId != null || options.state.running) {
    return true;
  }
  schedulePreviewLiveResizeFrame(options);

  return true;
}

export function cancelPreviewLiveResizeRelayout(
  state: PreviewLiveResizeRelayoutState,
  cancelAnimationFrameFn: (id: number) => void,
): void {
  if (state.rafId != null) {
    cancelAnimationFrameFn(state.rafId);
    state.rafId = null;
  }
  state.latest = null;
}

export function createPreviewLiveResizeRuntime<TGridOverrides>(
  options: CreatePreviewLiveResizeRuntimeOptions<TGridOverrides>,
): PreviewLiveResizeRuntime {
  const isEngineLayoutActive = options.isEngineLayoutActive
    ?? options.isElkLayeredDiagram
    ?? (() => false);

  return {
    scheduleRelayout(cid, newW, newH, resizedW, resizedH) {
      return schedulePreviewLiveResizeRelayout({
        state: options.state,
        request: { cid, newW, newH, resizedW, resizedH },
        isEngineLayoutActive: isEngineLayoutActive(),
        isElkLayeredDiagram: isEngineLayoutActive(),
        requestAnimationFrameFn: options.requestAnimationFrameFn,
        getOverrides: options.getOverrides ?? null,
        overrides: resolvePreviewLiveResizeOverrides(options),
        getGridOverrides: options.getGridOverrides,
        normalizeGridOverrides: options.normalizeGridOverrides,
        getRelayoutStatus: options.getRelayoutStatus,
        performEngineRelayout: options.performEngineRelayout ?? null,
        performLocalRelayout: options.performLocalRelayout,
        reapplySelection: options.reapplySelection ?? null,
      });
    },
    cancelRelayout() {
      cancelPreviewLiveResizeRelayout(options.state, options.cancelAnimationFrameFn);
    },
    persistResize(resizeIds, propagatedIds, triggerCid, baseSizes) {
      persistPreviewResizeToFrameOverrides({
        resizeIds,
        propagatedIds,
        triggerCid,
        baseSizes: baseSizes ?? null,
        getNode: options.getNode,
        getOwnDelta: options.getOwnDelta,
        setOverride: options.setOverride,
        requestRelayout: options.requestRelayout,
        minSize: options.minSize ?? 8,
      });
    },
  };
}

export function createPreviewLiveResizeRuntimeFromHost<TGridOverrides, TModel>(
  options: CreatePreviewLiveResizeRuntimeFromHostOptions<TGridOverrides, TModel>,
): PreviewLiveResizeRuntime {
  return createPreviewLiveResizeRuntime({
    state: options.state,
    getOverrides: options.getOverrides,
    getGridOverrides: () => options.model.gridOverrides ?? ({} as TGridOverrides),
    normalizeGridOverrides: options.normalizeGridOverrides,
    getRelayoutStatus: options.getRelayoutStatus,
    isEngineLayoutActive: options.isEngineLayoutActive ?? options.isElkLayeredDiagram ?? null,
    isElkLayeredDiagram: options.isElkLayeredDiagram ?? options.isEngineLayoutActive ?? null,
    performEngineRelayout: options.previewBridgeHost.performEngineRelayout
      ? (temporaryOverrides, normalizedGridOverrides) => (
        options.previewBridgeHost.performEngineRelayout?.(
          options.model,
          temporaryOverrides,
          normalizedGridOverrides,
          { skipModelUpdate: true },
        )
      )
      : null,
    performLocalRelayout: (temporaryOverrides, normalizedGridOverrides) => (
      options.previewBridgeHost.performLocalRelayout(
        options.model,
        temporaryOverrides,
        normalizedGridOverrides,
        { skipModelUpdate: true },
      )
    ),
    reapplySelection: options.reapplySelection ?? null,
    requestAnimationFrameFn: options.requestAnimationFrameFn,
    cancelAnimationFrameFn: options.cancelAnimationFrameFn,
    getNode: options.getNode,
    getOwnDelta: options.getOwnDelta,
    setOverride: options.setOverride,
    requestRelayout: options.requestRelayout,
    minSize: options.minSize,
  });
}
