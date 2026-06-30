import {
  isGridControlInputId,
  resolvePreviewGridControlDomPatch,
  resolvePreviewGridControlRuntimeUpdate,
  resolvePreviewGridControlState,
  resolvePreviewGridControlStateFromDomState,
  type PreviewGridControlRuntimeUpdate,
  type PreviewGridInfoState,
} from './grid-controls.js';
import type { PreviewGridInfo } from './grid-resolution.js';
import { readPreviewStageCanvasDimensions } from './app-scene-host.js';

/**
 * Preview grid host helpers (spec 043 shell coordinator slice M).
 *
 * These helpers own the remaining grid-control DOM/state bridge so `editor.js`
 * only supplies live callbacks for tree state, undo orchestration, and
 * relayout scheduling.
 */

const GRID_NUMBER_CONTROL_IDS = [
  'grid-cols',
  'grid-rows',
  'grid-col-gap',
  'grid-row-gap',
  'grid-margin',
  'grid-margin-top',
  'grid-margin-right',
  'grid-margin-bottom',
  'grid-margin-left',
] as const;

const GRID_TOGGLE_CONTROL_IDS = [
  'grid-link-root',
  'grid-slack',
] as const;

export interface PreviewGridHostControlElement {
  id?: string | null;
  value?: unknown;
  checked?: boolean;
  readOnly?: boolean;
  select?: () => void;
  addEventListener?: (type: string, listener: (event?: any) => void) => void;
  className?: string;
  textContent?: string;
}

export interface PreviewGridHostDocumentLike {
  getElementById: (id: string) => PreviewGridHostControlElement | null | undefined;
  querySelector?: (selector: string) => SVGSVGElement | null;
  activeElement?: {
    id?: string | null;
  } | null;
}

export interface PreviewGridSelectionBindingOptions {
  input?: PreviewGridHostControlElement | null;
  getActiveElement?: () => unknown;
  setTimeoutFn?: (callback: () => void, delayMs: number) => unknown;
}

export interface BindPreviewGridControlsOptions {
  getElementById: (id: string) => PreviewGridHostControlElement | null | undefined;
  onInput: () => void;
  onChange: () => void;
  getActiveElement?: () => unknown;
  setTimeoutFn?: (callback: () => void, delayMs: number) => unknown;
}

export interface PopulatePreviewGridControlsOptions {
  gridInfo?: Partial<PreviewGridInfoState> | null;
  gridOverrides?: Record<string, unknown> | null;
  activeElementId?: string | null;
  hasSplitMargins?: boolean;
  getElementById: (id: string) => PreviewGridHostControlElement | null | undefined;
}

export interface PopulatePreviewGridControlsHostOptions {
  document: PreviewGridHostDocumentLike;
  gridInfo?: Partial<PreviewGridInfoState> | null;
  gridOverrides?: Record<string, unknown> | null;
}

export interface ReadPreviewGridControlStateFromDomOptions {
  getElementById: (id: string) => PreviewGridHostControlElement | null | undefined;
  hasSplitMargins?: boolean;
  fallbackMargin?: number;
}

export interface DispatchPreviewGridControlChangeOptions {
  gridInfo?: PreviewGridInfo | null;
  capabilityGate?: (() => { applicable: boolean; reason: string }) | null;
  resolveRuntimeUpdate: () => PreviewGridControlRuntimeUpdate | null;
  getPendingAction: () => unknown;
  beginPendingAction: () => unknown;
  setPendingAction: (action: unknown) => void;
  setGridOverrides: (gridOverrides: Record<string, unknown>) => void;
  pruneLinkedRootOverrides: () => void;
  setDirty: (isDirty: boolean) => void;
  relayoutTimer?: unknown;
  clearRelayoutTimer: (timerId: unknown) => void;
  scheduleRelayout: (callback: () => Promise<void> | void, delayMs: number) => unknown;
  setRelayoutTimer: (timerId: unknown) => void;
  requestRelayout: (rootId: string) => Promise<void> | void;
  commitPendingAction: (action: unknown) => void;
  setOverlayGridInfo: (gridInfo: PreviewGridInfo) => void;
  setRowsControlValue: (value: unknown) => void;
  renderGridOverlay: () => void;
}

export interface ResolvePreviewGridControlRuntimeUpdateHostOptions {
  document: PreviewGridHostDocumentLike;
  baselineStep: number;
  rootId: string;
  hasSplitMargins?: boolean;
  fallbackMargin?: number;
}

export interface DispatchPreviewGridControlChangeHostOptions extends Omit<
  DispatchPreviewGridControlChangeOptions,
  'resolveRuntimeUpdate'
> {
  document: PreviewGridHostDocumentLike;
  baselineStep: number;
  rootId: string;
  hasSplitMargins?: boolean;
  fallbackMargin?: number;
}

export interface CyclePreviewGuideModeHostOptions {
  guideMode: string;
  guideModes: readonly string[];
  document: PreviewGridHostDocumentLike;
  setGuideMode: (guideMode: string) => void;
  renderGridOverlay: () => void;
}

export interface PreviewGridControlChangeDispatchResult {
  kind: 'noop' | 'inert' | 'applied';
  reason?: string;
  runtimeUpdate?: PreviewGridControlRuntimeUpdate;
}

export function bindPreviewGridNumberInputSelection(
  options: PreviewGridSelectionBindingOptions,
): void {
  const input = options.input;
  if (!input || input.readOnly || typeof input.addEventListener !== 'function') return;

  const getActiveElement = options.getActiveElement ?? (() => null);
  const setTimeoutFn = options.setTimeoutFn ?? ((callback: () => void) => setTimeout(callback, 0));
  let selectPending = false;

  input.addEventListener('focus', () => {
    selectPending = true;
    setTimeoutFn(() => {
      if (selectPending && getActiveElement() === input) {
        input.select?.();
      }
      selectPending = false;
    }, 0);
  });

  input.addEventListener('keydown', () => {
    if (selectPending) {
      input.select?.();
      selectPending = false;
    }
  });

  input.addEventListener('mouseup', (event?: { preventDefault?: () => void }) => {
    if (selectPending) {
      event?.preventDefault?.();
    }
  });

  input.addEventListener('blur', () => {
    selectPending = false;
  });
}

export function bindPreviewGridControls(
  options: BindPreviewGridControlsOptions,
): void {
  for (const id of GRID_NUMBER_CONTROL_IDS) {
    const input = options.getElementById(id);
    input?.addEventListener?.('input', options.onInput);
    bindPreviewGridNumberInputSelection({
      input,
      getActiveElement: options.getActiveElement,
      setTimeoutFn: options.setTimeoutFn,
    });
  }

  for (const id of GRID_TOGGLE_CONTROL_IDS) {
    options.getElementById(id)?.addEventListener?.('change', options.onChange);
  }
}

export function populatePreviewGridControls(
  options: PopulatePreviewGridControlsOptions,
): boolean {
  if (!options.gridInfo) return false;
  if (isGridControlInputId(options.activeElementId)) return false;

  const controlState = resolvePreviewGridControlState({
    gridInfo: options.gridInfo,
    gridOverrides: options.gridOverrides ?? {},
  });
  const domPatch = resolvePreviewGridControlDomPatch({
    controlState,
    hasSplitMargins: Boolean(options.hasSplitMargins),
  });

  for (const [id, value] of Object.entries(domPatch.values)) {
    const control = options.getElementById(id);
    if (control) {
      control.value = value;
    }
  }

  for (const [id, checked] of Object.entries(domPatch.checked)) {
    const control = options.getElementById(id);
    if (control) {
      control.checked = checked;
    }
  }

  return true;
}

export function populatePreviewGridControlsHost(
  options: PopulatePreviewGridControlsHostOptions,
): boolean {
  return populatePreviewGridControls({
    gridInfo: options.gridInfo,
    gridOverrides: options.gridOverrides ?? {},
    activeElementId: options.document.activeElement?.id || null,
    hasSplitMargins: Boolean(options.document.getElementById('grid-margin-top')),
    getElementById: (id) => options.document.getElementById(id),
  });
}

export function readPreviewGridControlStateFromDom(
  options: ReadPreviewGridControlStateFromDomOptions,
) {
  const getValue = (id: string) => options.getElementById(id)?.value;
  const getChecked = (id: string, fallback: boolean) => {
    const control = options.getElementById(id);
    return typeof control?.checked === 'boolean' ? control.checked : fallback;
  };

  return resolvePreviewGridControlStateFromDomState({
    hasSplitMargins: Boolean(options.hasSplitMargins),
    cols: getValue('grid-cols'),
    rows: getValue('grid-rows'),
    colGap: getValue('grid-col-gap'),
    rowGap: getValue('grid-row-gap'),
    marginTop: getValue('grid-margin-top'),
    marginRight: getValue('grid-margin-right'),
    marginBottom: getValue('grid-margin-bottom'),
    marginLeft: getValue('grid-margin-left'),
    legacyMargin: getValue('grid-margin'),
    fallbackMargin: options.fallbackMargin ?? 24,
    linkToRoot: getChecked('grid-link-root', true),
    slackAbsorption: getChecked('grid-slack', true),
  });
}

export function resolvePreviewGridControlRuntimeUpdateHost(
  options: ResolvePreviewGridControlRuntimeUpdateHostOptions,
): PreviewGridControlRuntimeUpdate | null {
  if (typeof options.document.querySelector !== 'function') {
    return null;
  }
  const canvas = readPreviewStageCanvasDimensions({
    document: options.document as {
      querySelector: (selector: string) => SVGSVGElement | null;
    },
  });
  if (!canvas) {
    return null;
  }

  return resolvePreviewGridControlRuntimeUpdate({
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    baselineStep: options.baselineStep,
    controlState: readPreviewGridControlStateFromDom({
      getElementById: (id) => options.document.getElementById(id),
      hasSplitMargins: options.hasSplitMargins ?? Boolean(options.document.getElementById('grid-margin-top')),
      fallbackMargin: options.fallbackMargin ?? 24,
    }),
    rootId: options.rootId,
  });
}

export function dispatchPreviewGridControlChange(
  options: DispatchPreviewGridControlChangeOptions,
): PreviewGridControlChangeDispatchResult {
  const capability = options.capabilityGate?.() ?? { applicable: true, reason: 'grid controls are applicable' };
  if (!capability.applicable) {
    return { kind: 'inert', reason: capability.reason };
  }

  if (!options.gridInfo) {
    return { kind: 'noop' };
  }

  const runtimeUpdate = options.resolveRuntimeUpdate();
  if (!runtimeUpdate) {
    return { kind: 'noop' };
  }

  if (!options.getPendingAction()) {
    options.setPendingAction(options.beginPendingAction());
  }

  options.setGridOverrides(runtimeUpdate.gridOverrides);
  if (runtimeUpdate.shouldPruneLinkedRootOverrides) {
    options.pruneLinkedRootOverrides();
  }
  options.setDirty(true);

  const rootId = runtimeUpdate.relayoutRootId;
  if (options.relayoutTimer) {
    options.clearRelayoutTimer(options.relayoutTimer);
  }
  const nextTimer = options.scheduleRelayout(async () => {
    try {
      await options.requestRelayout(rootId);
    } finally {
      options.commitPendingAction(options.getPendingAction());
      options.setPendingAction(null);
    }
  }, 200);
  options.setRelayoutTimer(nextTimer);

  options.setOverlayGridInfo(runtimeUpdate.overlayGridInfo);
  options.setRowsControlValue(runtimeUpdate.overlayGridInfo._rows);
  options.renderGridOverlay();

  return {
    kind: 'applied',
    runtimeUpdate,
  };
}

export function dispatchPreviewGridControlChangeHost(
  options: DispatchPreviewGridControlChangeHostOptions,
): PreviewGridControlChangeDispatchResult {
  return dispatchPreviewGridControlChange({
    ...options,
    resolveRuntimeUpdate: () => resolvePreviewGridControlRuntimeUpdateHost({
      document: options.document,
      baselineStep: options.baselineStep,
      rootId: options.rootId,
      hasSplitMargins: options.hasSplitMargins,
      fallbackMargin: options.fallbackMargin,
    }),
  });
}

export function cyclePreviewGuideModeHost(
  options: CyclePreviewGuideModeHostOptions,
): string {
  const currentIndex = options.guideModes.indexOf(options.guideMode);
  const nextGuideMode = options.guideModes[(currentIndex + 1) % options.guideModes.length] ?? options.guideMode;
  options.setGuideMode(nextGuideMode);
  options.renderGridOverlay();

  const badge = options.document.getElementById('guide-badge');
  if (badge) {
    badge.className = `guide-badge ${nextGuideMode}`;
    badge.textContent = nextGuideMode === 'off'
      ? ''
      : 'Grid: on (W)';
  }

  return nextGuideMode;
}

export {
  resolvePreviewGridControlRuntimeUpdate,
};
