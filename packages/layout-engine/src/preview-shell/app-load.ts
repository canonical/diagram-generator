/**
 * Preview SVG load helpers (spec 043 shell coordinator slice D).
 *
 * These helpers own the `loadSVG()` bootstrap decision tree so editor.js can
 * stay focused on DOM lookup, fetch wiring, and compatibility glue.
 */

export interface PreviewLoadCanonicalState {
  frameTree?: unknown;
  previewDocument?: {
    kind?: string | null;
  } | null;
}

export interface PreviewLoadInvocationOptions {
  preserveSelectionIds?: string[] | null;
  canonicalState?: PreviewLoadCanonicalState | null;
}

export interface PreviewLoadNormalizedOptions {
  preservedSelectionIds: string[] | null;
  canonicalState: PreviewLoadCanonicalState | null;
}

export interface PreviewFrameTreeSeed {
  shouldSet: boolean;
  frameTree: unknown;
}

export interface PreviewLocalRelayoutStatus {
  ready: boolean;
  reason?: string | null;
  textAdapterError?: string | null;
}

export interface PreviewFallbackResponse {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}

export interface PreviewLoadRenderResult<TSvg = unknown> {
  svg: TSvg;
  width: number;
  height: number;
}

export interface LoadPreviewSvgOptions<TSvg = unknown> {
  invocation?: PreviewLoadInvocationOptions | null;
  deselectAll: () => void;
  initLayoutBridge: () => Promise<void>;
  setFrameTreeJson?: ((frameTree: unknown) => void) | null;
  isElkLayeredDiagram: () => boolean;
  resetOverrideState: () => void;
  initElkPanel: () => void;
  getLocalRelayoutStatus: () => PreviewLocalRelayoutStatus;
  escapeHtml: (value: string) => string;
  setStageHtml: (html: string) => void;
  loadTree: (canonicalState: PreviewLoadCanonicalState | null) => Promise<void>;
  loadGridInfo: (canonicalState: PreviewLoadCanonicalState | null) => Promise<void>;
  getGridInfo: () => unknown;
  setDiagramGrid: (gridInfo: unknown) => void;
  populateGridControls: () => void;
  applyWaypointOverrides: () => void;
  applyAllOverrides: () => void;
  bindInteraction: () => void;
  renderGridOverlay: () => void;
  restoreSelection: (ids: string[] | null) => void;
  runConstraints: () => void;
  markSaved: (serializedState: string) => void;
  serializeDirtyState: () => string;
  signalDiagramLoaded: () => void;
  getGridOverrides: () => Record<string, unknown> | null | undefined;
  pruneLinkedRootGridOverrides: () => void;
  renderFreshSvg: () => Promise<PreviewLoadRenderResult<TSvg>>;
  replaceStageWithRenderedSvg: (renderResult: PreviewLoadRenderResult<TSvg>) => void;
  fitRenderedSvg?: ((renderResult: PreviewLoadRenderResult<TSvg>) => void) | null;
  fetchFallbackSvg: () => Promise<PreviewFallbackResponse>;
}

export type PreviewLoadExecutionMode =
  | 'client-render'
  | 'fallback-error'
  | 'fallback-server-svg';

export function normalizePreviewLoadInvocation(
  invocation?: PreviewLoadInvocationOptions | null,
): PreviewLoadNormalizedOptions {
  return {
    preservedSelectionIds: Array.isArray(invocation?.preserveSelectionIds)
      ? invocation.preserveSelectionIds.slice()
      : null,
    canonicalState: invocation?.canonicalState && typeof invocation.canonicalState === 'object'
      ? invocation.canonicalState
      : null,
  };
}

export function resolvePreviewFrameTreeSeed(
  canonicalState: PreviewLoadCanonicalState | null,
): PreviewFrameTreeSeed {
  if (canonicalState?.frameTree) {
    return {
      shouldSet: true,
      frameTree: canonicalState.frameTree,
    };
  }

  if (canonicalState?.previewDocument?.kind === 'sequence') {
    return {
      shouldSet: true,
      frameTree: null,
    };
  }

  return {
    shouldSet: false,
    frameTree: null,
  };
}

export function createPreviewLoadLoadingMarkup(): string {
  return '<div style="padding:24px;color:#666;font-family:Ubuntu Sans,sans-serif">Loading...</div>';
}

export function createPreviewLoadUnavailableMarkup(
  reasonText: string,
  escapeHtml: (value: string) => string,
): string {
  return '<div style="padding:24px;font-family:Ubuntu Sans,sans-serif">'
    + '<div style="color:#c7162b;margin-bottom:12px">Client-side rendering unavailable: '
    + escapeHtml(reasonText)
    + '</div>'
    + '<div style="color:#666">Falling back to server-rendered SVG...</div></div>';
}

export function createPreviewLoadFailureMarkup(status: number): string {
  return '<div style="padding:24px;color:#c7162b;font-family:Ubuntu Sans,sans-serif">'
    + `Failed to load diagram: server returned ${status}</div>`;
}

function shouldPrunePreviewRootGridOverrides(
  gridOverrides: Record<string, unknown> | null | undefined,
): boolean {
  return Boolean(
    gridOverrides
    && Object.keys(gridOverrides).length > 0
    && gridOverrides.link_to_root !== false,
  );
}

function finalizePreviewLoad(options: {
  applyWaypointOverrides: () => void;
  applyAllOverrides: () => void;
  bindInteraction: () => void;
  renderGridOverlay: () => void;
  restoreSelection: (ids: string[] | null) => void;
  preservedSelectionIds: string[] | null;
  runConstraints: () => void;
  markSaved: (serializedState: string) => void;
  serializeDirtyState: () => string;
  signalDiagramLoaded: () => void;
}): void {
  options.applyWaypointOverrides();
  options.applyAllOverrides();
  options.bindInteraction();
  options.renderGridOverlay();
  options.restoreSelection(options.preservedSelectionIds);
  options.runConstraints();
  options.markSaved(options.serializeDirtyState());
  options.signalDiagramLoaded();
}

export async function loadPreviewSvg<TSvg = unknown>(
  options: LoadPreviewSvgOptions<TSvg>,
): Promise<PreviewLoadExecutionMode> {
  const invocation = normalizePreviewLoadInvocation(options.invocation);

  options.deselectAll();
  options.setStageHtml(createPreviewLoadLoadingMarkup());

  await options.initLayoutBridge();

  const frameTreeSeed = resolvePreviewFrameTreeSeed(invocation.canonicalState);
  if (frameTreeSeed.shouldSet && options.setFrameTreeJson) {
    options.setFrameTreeJson(frameTreeSeed.frameTree);
  }

  const isElkLayeredDiagram = options.isElkLayeredDiagram();
  if (isElkLayeredDiagram) {
    options.resetOverrideState();
    options.initElkPanel();
  }

  const readiness = options.getLocalRelayoutStatus();
  if (!readiness.ready) {
    const reasonText = readiness.textAdapterError || readiness.reason || 'unknown';
    options.setStageHtml(createPreviewLoadUnavailableMarkup(reasonText, options.escapeHtml));

    const response = await options.fetchFallbackSvg();
    if (!response.ok) {
      options.setStageHtml(createPreviewLoadFailureMarkup(response.status));
      return 'fallback-error';
    }

    options.setStageHtml(await response.text());
    await options.loadTree(invocation.canonicalState);
    await options.loadGridInfo(invocation.canonicalState);

    const gridInfo = options.getGridInfo();
    if (gridInfo) {
      options.setDiagramGrid(gridInfo);
    }

    options.populateGridControls();
    options.resetOverrideState();
    finalizePreviewLoad({
      applyWaypointOverrides: options.applyWaypointOverrides,
      applyAllOverrides: options.applyAllOverrides,
      bindInteraction: options.bindInteraction,
      renderGridOverlay: options.renderGridOverlay,
      restoreSelection: options.restoreSelection,
      preservedSelectionIds: invocation.preservedSelectionIds,
      runConstraints: options.runConstraints,
      markSaved: options.markSaved,
      serializeDirtyState: options.serializeDirtyState,
      signalDiagramLoaded: options.signalDiagramLoaded,
    });
    return 'fallback-server-svg';
  }

  await options.loadTree(invocation.canonicalState);
  await options.loadGridInfo(invocation.canonicalState);

  const gridInfo = options.getGridInfo();
  if (gridInfo) {
    options.setDiagramGrid(gridInfo);
  }

  options.populateGridControls();
  if (!isElkLayeredDiagram) {
    options.resetOverrideState();
  }

  const gridOverrides = options.getGridOverrides();
  if (shouldPrunePreviewRootGridOverrides(gridOverrides)) {
    options.pruneLinkedRootGridOverrides();
  }

  const renderResult = await options.renderFreshSvg();
  options.replaceStageWithRenderedSvg(renderResult);
  options.fitRenderedSvg?.(renderResult);

  finalizePreviewLoad({
    applyWaypointOverrides: options.applyWaypointOverrides,
    applyAllOverrides: options.applyAllOverrides,
    bindInteraction: options.bindInteraction,
    renderGridOverlay: options.renderGridOverlay,
    restoreSelection: options.restoreSelection,
    preservedSelectionIds: invocation.preservedSelectionIds,
    runConstraints: options.runConstraints,
    markSaved: options.markSaved,
    serializeDirtyState: options.serializeDirtyState,
    signalDiagramLoaded: options.signalDiagramLoaded,
  });

  if (isElkLayeredDiagram) {
    options.initElkPanel();
  }

  return 'client-render';
}
