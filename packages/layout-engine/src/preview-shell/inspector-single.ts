/**
 * Single-selection inspector view-model helpers (spec 043 Slice 2).
 *
 * These helpers resolve inspector state and branch conditions while leaving
 * HTML assembly and DOM event hookup in the legacy shell for now.
 */

export interface InspectorDeltaState {
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

export interface InspectorEffectiveDeltaState {
  dx: number;
  dy: number;
}

export type InspectorSizingMode = 'HUG' | 'FILL' | 'FIXED';
export type InspectorDirection = 'HORIZONTAL' | 'VERTICAL';
export type InspectorPositionType = 'AUTO' | 'ABSOLUTE';

export interface SingleSelectionInspectorViewModel {
  currentAlign: string;
  hasMoveOverride: boolean;
  hasSizeOverride: boolean;
  hasWaypointOverride: boolean;
  hasAnyOverride: boolean;
  hasParentOverride: boolean;
  waypointCount: number;
  isArrowComponent: boolean;
  isAutolayoutChild: boolean;
  showStackSpacingHint: boolean;
  noteKind: 'reorder-child' | 'move-resize';
}

export interface SingleSelectionAutolayoutState {
  isContainer: boolean;
  direction: InspectorDirection;
  currentGapDelta: number;
  automaticGap: number;
  effectiveGap: number;
  sizingW: InspectorSizingMode;
  sizingH: InspectorSizingMode;
  wCoerced: boolean;
  hCoerced: boolean;
  showGapDeltaControls: boolean;
  showWidthFixedInput: boolean;
  showWidthMinMax: boolean;
  showWidthTextMeasure: boolean;
  showWidthFillWeight: boolean;
  showHeightFixedInput: boolean;
  showHeightMinMax: boolean;
  showPositionType: boolean;
  positionType: InspectorPositionType;
  showAbsoluteOffsetControls: boolean;
}

function normalizeSizingMode(value: string | null | undefined): InspectorSizingMode {
  return value === 'FILL' || value === 'FIXED' ? value : 'HUG';
}

function normalizePositionType(value: string | null | undefined): InspectorPositionType {
  return String(value || 'AUTO').toUpperCase() === 'ABSOLUTE' ? 'ABSOLUTE' : 'AUTO';
}

function normalizeDirection(value: string | null | undefined): InspectorDirection {
  return value === 'HORIZONTAL' ? 'HORIZONTAL' : 'VERTICAL';
}

export function createSingleSelectionInspectorViewModel(options: {
  align?: string | null;
  ownDelta: InspectorDeltaState;
  effectiveDelta: InspectorEffectiveDeltaState;
  hasWaypointOverride?: boolean;
  waypointCount?: number;
  componentType?: string | null;
  parentLayout?: string | null;
}): SingleSelectionInspectorViewModel {
  const hasMoveOverride = options.ownDelta.dx !== 0 || options.ownDelta.dy !== 0;
  const hasSizeOverride = options.ownDelta.dw !== 0 || options.ownDelta.dh !== 0;
  const hasWaypointOverride = Boolean(options.hasWaypointOverride);
  const isAutolayoutChild =
    options.parentLayout === 'vertical' || options.parentLayout === 'horizontal';

  return {
    currentAlign: options.align || 'TOP_LEFT',
    hasMoveOverride,
    hasSizeOverride,
    hasWaypointOverride,
    hasAnyOverride: hasMoveOverride || hasSizeOverride || hasWaypointOverride,
    hasParentOverride:
      options.effectiveDelta.dx !== options.ownDelta.dx
      || options.effectiveDelta.dy !== options.ownDelta.dy,
    waypointCount: Math.max(0, options.waypointCount ?? 0),
    isArrowComponent: String(options.componentType || '').toLowerCase() === 'arrow',
    isAutolayoutChild,
    showStackSpacingHint: isAutolayoutChild,
    noteKind: isAutolayoutChild ? 'reorder-child' : 'move-resize',
  };
}

export function createSingleSelectionAutolayoutState(options: {
  nodeLayout?: string | null;
  childCount?: number | null;
  hasParent?: boolean;
  overrideDirection?: string | null;
  overrideGapDeltaPresent?: boolean;
  overrideGapDelta?: unknown;
  nodeGapDelta?: unknown;
  layoutGap?: number | null;
  layoutRowGap?: number | null;
  layoutColGap?: number | null;
  sizingW?: string | null;
  sizingH?: string | null;
  wCoerced?: boolean;
  hCoerced?: boolean;
  hasTextContent?: boolean;
  positionType?: string | null;
}): SingleSelectionAutolayoutState {
  const isContainer = Boolean(
    options.nodeLayout || ((options.childCount ?? 0) > 0),
  );
  const direction = normalizeDirection(
    options.overrideDirection || (options.nodeLayout === 'horizontal' ? 'HORIZONTAL' : 'VERTICAL'),
  );
  const sizingW = normalizeSizingMode(options.sizingW);
  const sizingH = normalizeSizingMode(options.sizingH);
  const rawGapDelta = options.overrideGapDeltaPresent
    ? (
      options.overrideGapDelta == null || options.overrideGapDelta === ''
        ? 0
        : options.overrideGapDelta
    )
    : options.nodeGapDelta;
  const currentGapDelta = Number.isFinite(Number(rawGapDelta)) ? Number(rawGapDelta) : 0;
  const runtimeGap = direction === 'HORIZONTAL'
    ? (options.layoutColGap ?? options.layoutGap ?? 24)
    : (options.layoutRowGap ?? options.layoutGap ?? 24);
  const automaticGap = Math.max(0, runtimeGap - currentGapDelta);
  const effectiveGap = Math.max(0, automaticGap + currentGapDelta);
  const resolvedPositionType = normalizePositionType(options.positionType);

  return {
    isContainer,
    direction,
    currentGapDelta,
    automaticGap,
    effectiveGap,
    sizingW,
    sizingH,
    wCoerced: Boolean(options.wCoerced),
    hCoerced: Boolean(options.hCoerced),
    showGapDeltaControls: isContainer,
    showWidthFixedInput: sizingW === 'FIXED',
    showWidthMinMax: sizingW === 'FILL' || sizingW === 'FIXED',
    showWidthTextMeasure: sizingW === 'HUG' && Boolean(options.hasTextContent),
    showWidthFillWeight: sizingW === 'FILL',
    showHeightFixedInput: sizingH === 'FIXED',
    showHeightMinMax: sizingH === 'FILL' || sizingH === 'FIXED',
    showPositionType: Boolean(options.hasParent),
    positionType: resolvedPositionType,
    showAbsoluteOffsetControls: Boolean(options.hasParent) && resolvedPositionType === 'ABSOLUTE',
  };
}
