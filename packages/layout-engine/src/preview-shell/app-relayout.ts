/**
 * Preview relayout coordinator helpers (spec 043 shell coordinator slice K).
 *
 * These helpers own the local-vs-ELK relayout branching and runtime-only
 * coercion cleanup so editor.js stays focused on browser callback wiring.
 */

import {
  Border,
  Direction,
  Fill,
  type Frame,
  type FrameDiagram,
  Sizing,
  createLine,
} from '../frame-model.js';
import { filterRelayoutOverrideEntry } from './frame-override-manifest.js';

export interface PreviewRelayoutStatus {
  localReady: boolean;
  local?: {
    reason?: string | null;
  } | null;
}

export interface PreviewLocalRelayoutStatus {
  ready: boolean;
  reason: string;
  overrideMode?: string | null;
  frameTreeLoaded?: boolean;
  textAdapterReady?: boolean;
  textAdapterBackend?: string | null;
  textAdapterError?: unknown;
}

export interface PreviewV3RelayoutRuntimeState {
  lastMode: string;
  lastReason: string;
  sequence: number;
}

export interface PreviewV3RelayoutStatus extends PreviewRelayoutStatus {
  engine: 'v3';
  isV3: true;
  interactiveExecutor: 'local-only';
  interactiveFallbackAvailable: false;
  local: PreviewLocalRelayoutStatus;
  localReady: boolean;
  frameManaged: true;
  fallbackActive: false;
  lastMode: string;
  lastReason: string;
  sequence: number;
}

export interface PreviewRelayoutResult {
  coerced?: Map<string, Record<string, unknown>> | null;
}

export interface PreviewRelayoutOverrideEntry {
  [key: string]: unknown;
}

export interface PreviewGridOverrideEntry {
  [key: string]: unknown;
}

export interface ResolvePreviewV3RelayoutStatusOptions {
  getLocalRelayoutStatus?: (() => PreviewLocalRelayoutStatus) | null;
  runtimeState: PreviewV3RelayoutRuntimeState;
}

export interface PreviewFrameManagedTargetLike {
  closest?: (selector: string) => PreviewFrameManagedGroupLike | null;
}

export interface PreviewFrameManagedGroupLike {
  getAttribute: (name: string) => string | null;
}

export interface IsPreviewFrameManagedTargetOptions<TNode = { type?: unknown }> {
  target?: PreviewFrameManagedTargetLike | null;
  relayoutStatus?: {
    frameManaged?: boolean;
  } | null;
  getRelayoutStatus?: (() => {
    frameManaged?: boolean;
  } | null) | null;
  getNode: (cid: string) => TNode | null | undefined;
  isArrowNode?: ((node: TNode) => boolean) | null;
}

export interface DispatchPreviewRelayoutFailureHostOptions {
  runtimeState: PreviewV3RelayoutRuntimeState;
  reason: string;
  triggerCid?: string | null;
  setStatus?: ((message: string, kind: string) => void) | null;
  renderSelectionInspector: (triggerCid?: string | null) => void;
  updateOverrideSummary: () => void;
  refreshTreeColors: () => void;
  runConstraints: () => void;
}

export interface DispatchPreviewRelayoutSuccessHostOptions<
  TResult extends PreviewRelayoutResult,
> {
  triggerCid: string;
  result: TResult | null;
  executionLabel?: string | null;
  runtimeState: PreviewV3RelayoutRuntimeState;
  getRelayoutStatus: () => PreviewV3RelayoutStatus;
  failRelayout: (reason: string, triggerCid: string) => unknown;
  overrides: Record<string, PreviewRelayoutOverrideEntry>;
  buildTreeUi: () => void;
  applyWaypointOverrides: () => void;
  bindInteraction: () => void;
  applyAllOverrides: () => void;
  reapplySelection: () => void;
  refreshGridInfo: () => void;
  renderGridOverlay: () => void;
  renderSelectionInspector: (triggerCid?: string | null) => void;
  updateOverrideSummary: () => void;
  refreshTreeColors: () => void;
  runConstraints: () => void;
  setStatus?: ((message: string, kind: string) => void) | null;
}

export interface DispatchPreviewClearOverrideOptions {
  cid: string;
  hasWaypointOverride: boolean;
  relayoutStatus: PreviewRelayoutStatus;
  clearOverride: (cid: string) => void;
  setDirty: () => void;
  applyAllOverrides: () => void;
  isSelected: (cid: string) => boolean;
  updateInspector: (cid: string) => void;
  requestRelayout: (cid: string) => Promise<unknown> | unknown;
  restoreArrowFromTree: (cid: string) => Promise<unknown> | unknown;
  captureOverrideEntries: (ids: string[]) => unknown;
  commitOverridePatchAction: (
    label: string,
    beforeEntries: unknown,
    afterEntries: unknown,
  ) => void;
}

const DEFAULT_PREVIEW_LOCAL_RELAYOUT_STATUS: PreviewLocalRelayoutStatus = {
  ready: false,
  reason: 'bridge-unavailable',
  overrideMode: 'auto',
  frameTreeLoaded: false,
  textAdapterReady: false,
  textAdapterBackend: null,
  textAdapterError: null,
};

export function createPreviewRelayoutRuntimeState(): PreviewV3RelayoutRuntimeState {
  return {
    lastMode: 'not-run',
    lastReason: 'not-run',
    sequence: 0,
  };
}

export function markPreviewRelayoutExecution(
  runtimeState: PreviewV3RelayoutRuntimeState,
  mode: string,
  reason: string | null | undefined,
): PreviewV3RelayoutRuntimeState {
  runtimeState.lastMode = mode;
  runtimeState.lastReason = reason || 'unknown';
  runtimeState.sequence += 1;
  return runtimeState;
}

export function formatPreviewRelayoutStatusMessage(reason: string): string {
  switch (reason) {
    case 'missing-frame-tree':
      return 'Local relayout unavailable: frame tree not loaded';
    case 'missing-text-adapter':
      return 'Local relayout unavailable: text adapter not ready';
    case 'forced-unready':
      return 'Local relayout intentionally disabled';
    case 'local-failure':
      return 'Local relayout failed';
    default:
      return 'Local relayout unavailable';
  }
}

export function resolvePreviewV3RelayoutStatus(
  options: ResolvePreviewV3RelayoutStatusOptions,
): PreviewV3RelayoutStatus {
  const localStatus = options.getLocalRelayoutStatus
    ? options.getLocalRelayoutStatus()
    : null;
  const local: PreviewLocalRelayoutStatus = {
    ...DEFAULT_PREVIEW_LOCAL_RELAYOUT_STATUS,
    ...(localStatus || {}),
  };

  return {
    engine: 'v3',
    isV3: true,
    interactiveExecutor: 'local-only',
    interactiveFallbackAvailable: false,
    local,
    localReady: Boolean(local.ready),
    frameManaged: true,
    fallbackActive: false,
    lastMode: options.runtimeState.lastMode,
    lastReason: options.runtimeState.lastReason,
    sequence: options.runtimeState.sequence,
  };
}

export function isPreviewFrameManagedTarget<TNode extends { type?: unknown }>(
  options: IsPreviewFrameManagedTargetOptions<TNode>,
): boolean {
  const status = options.relayoutStatus || options.getRelayoutStatus?.();
  if (!status?.frameManaged) {
    return false;
  }
  const group = options.target?.closest?.('[data-component-id]') || null;
  if (!group) {
    return false;
  }
  const cid = group.getAttribute('data-component-id');
  const node = cid ? options.getNode(cid) : null;
  if (!node) {
    return false;
  }
  if (options.isArrowNode) {
    return !options.isArrowNode(node);
  }
  return node.type !== 'arrow';
}

export function collectPreviewRelayoutFrameOverrides(
  overrides: Record<string, PreviewRelayoutOverrideEntry | null | undefined>,
): Record<string, PreviewRelayoutOverrideEntry> {
  const collected: Record<string, PreviewRelayoutOverrideEntry> = {};
  for (const [frameId, entry] of Object.entries(overrides || {})) {
    const filtered = filterRelayoutOverrideEntry(entry || {});
    if (Object.keys(filtered).length > 0) {
      collected[frameId] = filtered;
    }
  }
  return collected;
}

export function dispatchPreviewClearOverride(
  options: DispatchPreviewClearOverrideOptions,
): void {
  const clearIds = [options.cid];
  const beforeEntries = options.captureOverrideEntries(clearIds);
  options.clearOverride(options.cid);
  options.setDirty();

  if (options.hasWaypointOverride) {
    if (options.relayoutStatus.localReady) {
      Promise.resolve(options.requestRelayout(options.cid)).then((restored) => {
        if (restored === false) {
          void options.restoreArrowFromTree(options.cid);
          return;
        }
        if (options.isSelected(options.cid)) {
          options.updateInspector(options.cid);
        }
      });
    } else {
      void options.restoreArrowFromTree(options.cid);
    }
  } else {
    options.applyAllOverrides();
    if (options.isSelected(options.cid)) {
      options.updateInspector(options.cid);
    }
  }

  options.commitOverridePatchAction(
    'Clear override',
    beforeEntries,
    options.captureOverrideEntries(clearIds),
  );
}

type PreviewFrameConstraintKey =
  | 'minWidth'
  | 'maxWidth'
  | 'maxWidthChars'
  | 'minHeight'
  | 'maxHeight';

type PreviewFrameDiagramWithGridMargins = FrameDiagram & {
  _gridMarginTop?: number;
  _gridMarginRight?: number;
  _gridMarginBottom?: number;
  _gridMarginLeft?: number;
};

const DIRECTION_MAP = {
  VERTICAL: Direction.VERTICAL,
  HORIZONTAL: Direction.HORIZONTAL,
} as const;

const SIZING_MAP = {
  HUG: Sizing.HUG,
  FILL: Sizing.FILL,
  FIXED: Sizing.FIXED,
} as const;

const FILL_MAP = {
  WHITE: Fill.WHITE,
  GREY: Fill.GREY,
  BLACK: Fill.BLACK,
} as const;

const BORDER_MAP = {
  SOLID: Border.SOLID,
  DASHED: Border.DASHED,
  NONE: Border.NONE,
} as const;

const CONSTRAINT_KEY_MAP: ReadonlyArray<readonly [string, PreviewFrameConstraintKey]> = [
  ['min_width', 'minWidth'],
  ['max_width', 'maxWidth'],
  ['max_width_chars', 'maxWidthChars'],
  ['min_height', 'minHeight'],
  ['max_height', 'maxHeight'],
] as const;

function previewInt(value: unknown): number {
  return Number.parseInt(String(value), 10);
}

function previewNonNegativeInt(value: unknown): number {
  return Math.max(0, previewInt(value));
}

function previewNonNegativeIntOrDefault(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

function previewFindFrame(frame: Frame, frameId: string): Frame | null {
  if (frame.id === frameId) return frame;
  for (const child of frame.children) {
    const found = previewFindFrame(child, frameId);
    if (found) return found;
  }
  return null;
}

function previewFindSyntheticBody(frame: Frame): Frame | null {
  return frame.children.find(
    (child) => child.id === '__body' || child.id.endsWith('__body'),
  ) ?? null;
}

function previewHasHeadingBodyLayout(frame: Frame): boolean {
  const body = previewFindSyntheticBody(frame);
  const hasHeading = frame.children.some(
    (child) => child.role === 'heading' || child.id.endsWith('__heading'),
  );
  return Boolean(body && hasHeading);
}

function syncPreviewSyntheticBodyFromParent(frame: Frame): void {
  if (!previewHasHeadingBodyLayout(frame)) return;
  const body = previewFindSyntheticBody(frame);
  if (!body) return;
  body.align = frame.align;
}

function previewLinkedPageGap(diagram: PreviewFrameDiagramWithGridMargins): number {
  return previewNonNegativeIntOrDefault(
    diagram.gridColGap
      ?? diagram.gridOuterMargin
      ?? diagram.root.paddingLeft
      ?? diagram.root.padding
      ?? diagram.root.gap,
    24,
  );
}

function previewLinkedRowGap(diagram: PreviewFrameDiagramWithGridMargins): number {
  const rootDirection = String(diagram.root.direction || Direction.VERTICAL).toUpperCase();
  const fallback = rootDirection === Direction.VERTICAL
    ? diagram.root.gap
    : previewLinkedPageGap(diagram);
  return previewNonNegativeIntOrDefault(diagram.gridRowGap, fallback ?? 24);
}

function applyPreviewLinkedRootGridSpacing(diagram: PreviewFrameDiagramWithGridMargins): void {
  const pageGap = previewLinkedPageGap(diagram);
  const rowGap = previewLinkedRowGap(diagram);
  const rootDirection = String(diagram.root.direction || Direction.VERTICAL).toUpperCase();

  diagram.gridColGap = pageGap;
  diagram.gridOuterMargin = pageGap;
  diagram.gridRowGap = rowGap;

  diagram.root.gap = rootDirection === Direction.VERTICAL ? rowGap : pageGap;

  const marginTop = diagram._gridMarginTop ?? pageGap;
  const marginRight = diagram._gridMarginRight ?? pageGap;
  const marginBottom = diagram._gridMarginBottom ?? pageGap;
  const marginLeft = diagram._gridMarginLeft ?? pageGap;

  diagram.root.padding = marginTop;
  diagram.root.paddingTop = marginTop;
  diagram.root.paddingRight = marginRight;
  diagram.root.paddingBottom = marginBottom;
  diagram.root.paddingLeft = marginLeft;
}

function applyPreviewTextHeadingOverride(target: Frame, headingText: unknown): void {
  const headingValue = String(headingText ?? '');
  const headingChild = target.children.find((child) => child.role === 'heading');
  if (headingChild) {
    headingChild.label = [createLine(headingValue)];
    return;
  }
  if (headingText) {
    target.heading = createLine(headingValue);
    return;
  }
  target.heading = undefined;
}

export function applyPreviewOverridesToFrameTree(
  diagram: FrameDiagram,
  allOverrides: Record<string, PreviewRelayoutOverrideEntry | null | undefined>,
  gridOverrides?: PreviewGridOverrideEntry | null,
): void {
  const mutableDiagram = diagram as PreviewFrameDiagramWithGridMargins;
  const normalizedGridOverrides = gridOverrides || {};
  const hasGridOverrides = Object.keys(normalizedGridOverrides).length > 0;

  if (normalizedGridOverrides.cols != null) {
    mutableDiagram.gridCols = Math.max(1, previewInt(normalizedGridOverrides.cols));
  }
  if (normalizedGridOverrides.col_gap != null) {
    mutableDiagram.gridColGap = previewNonNegativeInt(normalizedGridOverrides.col_gap);
  }
  if (normalizedGridOverrides.row_gap != null) {
    mutableDiagram.gridRowGap = previewNonNegativeInt(normalizedGridOverrides.row_gap);
  }
  if (normalizedGridOverrides.outer_margin != null) {
    mutableDiagram.gridOuterMargin = previewNonNegativeInt(normalizedGridOverrides.outer_margin);
  }
  if (normalizedGridOverrides.margin_top != null) {
    mutableDiagram._gridMarginTop = previewNonNegativeInt(normalizedGridOverrides.margin_top);
  }
  if (normalizedGridOverrides.margin_right != null) {
    mutableDiagram._gridMarginRight = previewNonNegativeInt(normalizedGridOverrides.margin_right);
  }
  if (normalizedGridOverrides.margin_bottom != null) {
    mutableDiagram._gridMarginBottom = previewNonNegativeInt(normalizedGridOverrides.margin_bottom);
  }
  if (normalizedGridOverrides.margin_left != null) {
    mutableDiagram._gridMarginLeft = previewNonNegativeInt(normalizedGridOverrides.margin_left);
  }

  if (hasGridOverrides && normalizedGridOverrides.link_to_root !== false) {
    applyPreviewLinkedRootGridSpacing(mutableDiagram);
  }

  for (const [frameId, rawOverride] of Object.entries(allOverrides || {})) {
    if (!rawOverride || typeof rawOverride !== 'object') continue;
    const override = rawOverride as PreviewRelayoutOverrideEntry;
    const target = frameId === 'root'
      ? mutableDiagram.root
      : previewFindFrame(mutableDiagram.root, frameId);
    if (!target) continue;

    if (typeof override.direction === 'string' && override.direction in DIRECTION_MAP) {
      target.direction = DIRECTION_MAP[override.direction as keyof typeof DIRECTION_MAP];
      syncPreviewSyntheticBodyFromParent(target);
    }
    if (override.gap != null) {
      target.gap = previewNonNegativeInt(override.gap);
      target.gapDelta = undefined;
    }
    if (override.gap_delta === null) {
      const currentGap = Number.isFinite(target.gap) ? target.gap : 0;
      const currentGapDelta = typeof target.gapDelta === 'number' && Number.isFinite(target.gapDelta)
        ? target.gapDelta
        : 0;
      target.gapDelta = undefined;
      target.gap = currentGap - currentGapDelta;
    } else if (override.gap_delta != null) {
      const gapDelta = previewInt(override.gap_delta);
      const currentGap = Number.isFinite(target.gap) ? target.gap : 0;
      const currentGapDelta = typeof target.gapDelta === 'number' && Number.isFinite(target.gapDelta)
        ? target.gapDelta
        : 0;
      const automaticGap = currentGap - currentGapDelta;
      target.gapDelta = gapDelta;
      target.gap = automaticGap + gapDelta;
    }
    if (override.padding != null) {
      const padding = previewNonNegativeInt(override.padding);
      target.padding = padding;
      target.paddingTop = padding;
      target.paddingRight = padding;
      target.paddingBottom = padding;
      target.paddingLeft = padding;
    }
    if (override.padding_top != null) target.paddingTop = previewNonNegativeInt(override.padding_top);
    if (override.padding_right != null) target.paddingRight = previewNonNegativeInt(override.padding_right);
    if (override.padding_bottom != null) target.paddingBottom = previewNonNegativeInt(override.padding_bottom);
    if (override.padding_left != null) target.paddingLeft = previewNonNegativeInt(override.padding_left);
    if (typeof override.sizing === 'string' && override.sizing in SIZING_MAP) {
      const sizing = SIZING_MAP[override.sizing as keyof typeof SIZING_MAP];
      target.sizingW = sizing;
      target.sizingH = sizing;
    }
    if (typeof override.sizing_w === 'string' && override.sizing_w in SIZING_MAP) {
      target.sizingW = SIZING_MAP[override.sizing_w as keyof typeof SIZING_MAP];
    }
    if (typeof override.sizing_h === 'string' && override.sizing_h in SIZING_MAP) {
      target.sizingH = SIZING_MAP[override.sizing_h as keyof typeof SIZING_MAP];
    }
    if (typeof override.align === 'string') {
      target.align = override.align as Frame['align'];
    }
    if (override.wrap != null) {
      target.wrap = Boolean(override.wrap);
    }
    if (override.fill_weight != null) {
      target.fillWeight = Number.parseFloat(String(override.fill_weight));
    }
    if (override.width != null) {
      target.width = previewInt(override.width);
    }
    if (override.height != null) {
      target.height = previewInt(override.height);
    }
    for (const [overrideKey, frameKey] of CONSTRAINT_KEY_MAP) {
      if (!(overrideKey in override)) continue;
      const value = override[overrideKey];
      if (value == null || value === '') {
        target[frameKey] = undefined;
        continue;
      }
      const parsed = previewInt(value);
      if (parsed >= 0) {
        target[frameKey] = parsed;
      }
    }
    if (override.level != null) {
      const level = previewInt(override.level);
      if (Number.isFinite(level) && level >= 0) {
        target.level = level;
      }
    }
    if (typeof override.fill === 'string' && override.fill in FILL_MAP) {
      target.fill = FILL_MAP[override.fill as keyof typeof FILL_MAP];
    }
    if (typeof override.border === 'string' && override.border in BORDER_MAP) {
      target.border = BORDER_MAP[override.border as keyof typeof BORDER_MAP];
    }
    if (typeof override.position === 'string') {
      const position = override.position.toUpperCase();
      if (position === 'ABSOLUTE' || position === 'AUTO') {
        target.positionType = position;
      }
    }
    if (override.x != null) {
      target.x = previewInt(override.x);
    }
    if (override.y != null) {
      target.y = previewInt(override.y);
    }
    if (Array.isArray(override.children_order)) {
      const childrenOrder = override.children_order.map((childId) => String(childId));
      const childMap = new Map(target.children.map((child) => [child.id, child] as const));
      const reordered: Frame[] = [];
      for (const childId of childrenOrder) {
        const child = childMap.get(childId);
        if (child) reordered.push(child);
      }
      const remaining = target.children.filter(
        (child) => !childrenOrder.includes(child.id),
      );
      target.children = [...reordered, ...remaining];
    }
    if (override.text && typeof override.text === 'object') {
      const textOverride = override.text as Record<string, unknown>;
      if (textOverride.heading != null) {
        applyPreviewTextHeadingOverride(target, textOverride.heading);
      }
      if (Array.isArray(textOverride.label)) {
        target.label = textOverride.label.map((text) => createLine(String(text ?? '')));
      }
    }
  }
}

export interface RunPreviewRelayoutOptions<TGridOverrides, TResult extends PreviewRelayoutResult> {
  triggerCid: string;
  overrides: Record<string, PreviewRelayoutOverrideEntry>;
  coercedKeys: Set<string>;
  gridOverrides: TGridOverrides;
  normalizeGridOverrides: (value: TGridOverrides) => TGridOverrides;
  relayoutStatus: PreviewRelayoutStatus;
  isElkLayeredDiagram: boolean;
  performElkRelayout?: ((normalizedGridOverrides: TGridOverrides) => Promise<TResult | null>) | null;
  performLocalRelayout: (normalizedGridOverrides: TGridOverrides) => TResult | null;
  failRelayout: (reason: string, triggerCid: string) => unknown;
  finishRelayout: (triggerCid: string, result: TResult, executionLabel: 'elk' | 'local') => unknown;
  logError?: (message: string) => void;
}

const COERCED_KEY_MAP: Record<string, string> = {
  sizingW: 'sizing_w',
  sizingH: 'sizing_h',
};

function deleteOverrideKey(
  overrides: Record<string, PreviewRelayoutOverrideEntry>,
  frameId: string,
  key: string,
): void {
  const entry = overrides[frameId];
  if (!entry) {
    return;
  }

  if (key === 'sizing_w') {
    delete entry.sizing_w;
    delete entry.width;
  } else if (key === 'sizing_h') {
    delete entry.sizing_h;
    delete entry.height;
  } else {
    delete entry[key];
  }

  if (Object.keys(entry).length === 0) {
    delete overrides[frameId];
  }
}

export function clearPreviewCoercedOverrides(
  overrides: Record<string, PreviewRelayoutOverrideEntry>,
  coercedKeys: Set<string>,
): void {
  for (const coercedKey of Array.from(coercedKeys)) {
    const separatorIndex = coercedKey.indexOf(':');
    if (separatorIndex <= 0) {
      continue;
    }
    const frameId = coercedKey.substring(0, separatorIndex);
    const key = coercedKey.substring(separatorIndex + 1);
    deleteOverrideKey(overrides, frameId, key);
  }
  coercedKeys.clear();
}

export function collectPreviewCoercedKeys(
  result: PreviewRelayoutResult | null | undefined,
): string[] {
  const collectedKeys: string[] = [];
  if (!result?.coerced) {
    return collectedKeys;
  }

  for (const [frameId, coerced] of result.coerced.entries()) {
    for (const [rawKey] of Object.entries(coerced)) {
      const key = COERCED_KEY_MAP[rawKey] || rawKey;
      if (key === 'sizing_w' || key === 'sizing_h') {
        collectedKeys.push(`${frameId}:${key}`);
      }
    }
  }

  return collectedKeys;
}

export function clearPreviewTransientLayoutOverrides(
  overrides: Record<string, PreviewRelayoutOverrideEntry>,
): void {
  for (const [frameId, entry] of Object.entries(overrides)) {
    delete entry.dx;
    delete entry.dy;
    delete entry.dw;
    delete entry.dh;
    if (Object.keys(entry).length === 0) {
      delete overrides[frameId];
    }
  }
}

export function dispatchPreviewRelayoutFailureHost(
  options: DispatchPreviewRelayoutFailureHostOptions,
): false {
  markPreviewRelayoutExecution(options.runtimeState, 'local-error', options.reason);
  options.setStatus?.(formatPreviewRelayoutStatusMessage(options.reason), 'error');
  options.renderSelectionInspector(options.triggerCid);
  options.updateOverrideSummary();
  options.refreshTreeColors();
  options.runConstraints();
  return false;
}

export function dispatchPreviewRelayoutSuccessHost<TResult extends PreviewRelayoutResult>(
  options: DispatchPreviewRelayoutSuccessHostOptions<TResult>,
): unknown {
  if (!options.result) {
    return options.failRelayout(options.executionLabel || 'local-failure', options.triggerCid);
  }

  const relayoutStatus = options.getRelayoutStatus();
  markPreviewRelayoutExecution(
    options.runtimeState,
    options.executionLabel || 'local',
    relayoutStatus.local.reason,
  );
  clearPreviewTransientLayoutOverrides(options.overrides);
  options.buildTreeUi();
  options.applyWaypointOverrides();
  options.bindInteraction();
  options.applyAllOverrides();
  options.reapplySelection();
  options.refreshGridInfo();
  options.renderGridOverlay();
  options.renderSelectionInspector(options.triggerCid);
  options.updateOverrideSummary();
  options.refreshTreeColors();
  options.runConstraints();
  options.setStatus?.('Ready', 'ok');
  return true;
}

export async function runPreviewRelayout<TGridOverrides, TResult extends PreviewRelayoutResult>(
  options: RunPreviewRelayoutOptions<TGridOverrides, TResult>,
): Promise<unknown> {
  if (!options.relayoutStatus.localReady) {
    const reason = options.relayoutStatus.local?.reason || 'unknown';
    options.logError?.(`v3 relayout: local bridge not ready (${reason})`);
    return options.failRelayout(reason, options.triggerCid);
  }

  clearPreviewCoercedOverrides(options.overrides, options.coercedKeys);
  const normalizedGridOverrides = options.normalizeGridOverrides(options.gridOverrides);

  if (options.isElkLayeredDiagram && options.performElkRelayout) {
    const elkResult = await options.performElkRelayout(normalizedGridOverrides);
    if (!elkResult) {
      options.logError?.('v3 relayout: ELK layout failed');
      return options.failRelayout('elk-failure', options.triggerCid);
    }
    return options.finishRelayout(options.triggerCid, elkResult, 'elk');
  }

  const localResult = options.performLocalRelayout(normalizedGridOverrides);
  if (!localResult) {
    options.logError?.('v3 relayout: local layout failed');
    return options.failRelayout('local-failure', options.triggerCid);
  }

  for (const coercedKey of collectPreviewCoercedKeys(localResult)) {
    options.coercedKeys.add(coercedKey);
  }

  return options.finishRelayout(options.triggerCid, localResult, 'local');
}
