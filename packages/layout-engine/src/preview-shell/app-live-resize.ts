import type { PreviewRelayoutStatus } from './app-relayout.js';

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
  overrides: PreviewLiveResizeOverrideMap;
  getGridOverrides: () => TGridOverrides;
  normalizeGridOverrides: (value: TGridOverrides) => TGridOverrides;
  getRelayoutStatus: () => PreviewRelayoutStatus;
  performLocalRelayout: (
    temporaryOverrides: PreviewLiveResizeOverrideMap,
    normalizedGridOverrides: TGridOverrides,
  ) => unknown;
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

export function createPreviewLiveResizeRelayoutState(): PreviewLiveResizeRelayoutState {
  return {
    rafId: null,
    latest: null,
  };
}

export function schedulePreviewLiveResizeRelayout<TGridOverrides>(
  options: SchedulePreviewLiveResizeRelayoutOptions<TGridOverrides>,
): boolean {
  const isEngineLayoutActive = options.isEngineLayoutActive ?? options.isElkLayeredDiagram ?? false;
  if (isEngineLayoutActive) {
    return false;
  }

  options.state.latest = { ...options.request };
  if (options.state.rafId != null) {
    return true;
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
      options.overrides,
      latest,
    );
    const normalizedGridOverrides = options.normalizeGridOverrides(
      options.getGridOverrides(),
    );
    options.performLocalRelayout(temporaryOverrides, normalizedGridOverrides);
  });

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
