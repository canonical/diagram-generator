import {
  resizeBoundsFromHandle,
  resolveSingleResizeOverride,
  type ResizeBounds,
  type ResizeGuideLine,
} from './interaction-geometry.js';
import {
  createMultiSelectionResizeOverrides,
  mergeRelativeOverrideEntries,
  type InteractionDeltaPatch,
  type InteractionOverrideEntry,
  type MultiSelectionResizeMember,
} from './interaction-resize.js';

/**
 * Live resize dispatch helpers (spec 043 interaction slice I).
 *
 * These helpers move the branchy resize controller flow into TS while the
 * preview shell remains responsible for DOM lookup and concrete callbacks.
 */

export interface PreviewResizeSelection {
  ids: string[];
  primaryId: string;
  bounds: Pick<ResizeBounds, 'left' | 'top' | 'right' | 'bottom' | 'width' | 'height'>;
  members: MultiSelectionResizeMember[];
  minWidth: number;
  minHeight: number;
}

export interface PreviewResizeMoveState {
  cid: string;
  axis: string;
  startX: number;
  startY: number;
  hasMoved?: boolean;
  snapshotRecorded?: boolean;
  selection?: PreviewResizeSelection | null;
  origDx?: number;
  origDy?: number;
  origDw?: number;
  origDh?: number;
  origOverrides: Record<string, InteractionDeltaPatch | undefined>;
  propagatedIds?: Set<string> | null;
  baseSizes?: Record<string, { width: number; height: number }> | null;
  baseX?: number;
  baseY?: number;
  baseW?: number;
  baseH?: number;
  /** @deprecated Prefer `baseW`. */
  v3BaseW?: number;
  /** @deprecated Prefer `baseH`. */
  v3BaseH?: number;
}

export interface PreviewResizeNodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PreviewResizeMoveDispatchOptions {
  state: PreviewResizeMoveState;
  clientX: number;
  clientY: number;
  gridTargets: { xs?: number[]; ys?: number[] };
  svgW: number;
  svgH: number;
  snapStep?: number;
  nodeBounds?: PreviewResizeNodeBounds | null;
  hasLayoutChildren?: boolean;
  hasLayoutContext?: boolean;
  isSelected?: boolean;
  hideHandles: () => void;
  renderGuideLines: (lines: ResizeGuideLine[]) => void;
  clearGuideLines: () => void;
  restorePropagatedResizeOverrides: (state: PreviewResizeMoveState) => void;
  applyInteractionOverrideEntries: (
    entries: InteractionOverrideEntry[],
    propagatedIds?: Set<string> | null,
  ) => void;
  applyAllOverrides: () => void;
  renderSelectionInspector: (cid: string) => void;
  updateInspector: (cid: string) => void;
  setOverride: (cid: string, patch: InteractionDeltaPatch) => void;
  collectRecursiveRelayoutEntries: (
    parentId: string,
    parentDelta: InteractionDeltaPatch,
    origOverrides: Record<string, InteractionDeltaPatch | undefined>,
  ) => InteractionOverrideEntry[];
  relayoutSiblingsAfterChildResize?: (
    cid: string,
    rightEdgeDelta: number,
    bottomEdgeDelta: number,
  ) => Record<string, InteractionDeltaPatch>;
  scheduleLayoutResizeRelayout: (
    cid: string,
    newW: number,
    newH: number,
    resizedW: boolean,
    resizedH: boolean,
  ) => void;
  /** @deprecated Prefer `scheduleLayoutResizeRelayout`. */
  scheduleV3ResizeRelayout?: (
    cid: string,
    newW: number,
    newH: number,
    resizedW: boolean,
    resizedH: boolean,
  ) => void;
}

export interface PreviewResizeMoveResult {
  kind: 'none' | 'multi-selection' | 'single';
  moved: boolean;
  hidHandles: boolean;
  scheduledRelayout: boolean;
}

function renderOrClearGuideLines(
  lines: ResizeGuideLine[],
  options: Pick<PreviewResizeMoveDispatchOptions, 'renderGuideLines' | 'clearGuideLines'>,
) {
  if (lines.length > 0) {
    options.renderGuideLines(lines);
  } else {
    options.clearGuideLines();
  }
}

function ensurePropagatedIds(state: PreviewResizeMoveState): Set<string> {
  if (!state.propagatedIds) {
    state.propagatedIds = new Set<string>();
  }
  return state.propagatedIds;
}

export function dispatchPreviewResizeMove(
  options: PreviewResizeMoveDispatchOptions,
): PreviewResizeMoveResult {
  const state = options.state;
  const dx = options.clientX - state.startX;
  const dy = options.clientY - state.startY;

  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
    state.hasMoved = true;
  }
  if (!state.hasMoved) {
    return {
      kind: 'none',
      moved: false,
      hidHandles: false,
      scheduledRelayout: false,
    };
  }

  let hidHandles = false;
  if (!state.snapshotRecorded) {
    options.hideHandles();
    state.snapshotRecorded = true;
    hidHandles = true;
  }

  if (state.selection) {
    const nextBounds = resizeBoundsFromHandle({
      bounds: state.selection.bounds,
      axis: state.axis,
      dx,
      dy,
      gridTargets: options.gridTargets,
      svgW: options.svgW,
      svgH: options.svgH,
      minWidth: state.selection.minWidth,
      minHeight: state.selection.minHeight,
      snapStep: options.snapStep,
    });

    renderOrClearGuideLines(nextBounds.resizeLines, options);

    const propagatedIds = ensurePropagatedIds(state);
    options.restorePropagatedResizeOverrides(state);

    const memberOverrides = createMultiSelectionResizeOverrides({
      selectionBounds: state.selection.bounds,
      nextBounds,
      members: state.selection.members,
    });
    options.applyInteractionOverrideEntries(memberOverrides);

    for (const member of memberOverrides) {
      if (!member.hasLayoutChildren) continue;
      options.applyInteractionOverrideEntries(
        options.collectRecursiveRelayoutEntries(member.id, member, state.origOverrides),
        propagatedIds,
      );
    }

    options.applyAllOverrides();
    options.renderSelectionInspector(state.cid);
    return {
      kind: 'multi-selection',
      moved: true,
      hidHandles,
      scheduledRelayout: false,
    };
  }

  const nodeBounds = options.nodeBounds ?? { x: 0, y: 0, width: 0, height: 0 };
  const singleResize = resolveSingleResizeOverride({
    axis: state.axis,
    dx,
    dy,
    baseX: Number(state.baseX ?? nodeBounds.x),
    baseY: Number(state.baseY ?? nodeBounds.y),
    baseW: Number(state.baseW ?? nodeBounds.width),
    baseH: Number(state.baseH ?? nodeBounds.height),
    origDx: Number(state.origDx ?? 0),
    origDy: Number(state.origDy ?? 0),
    origDw: Number(state.origDw ?? 0),
    origDh: Number(state.origDh ?? 0),
    gridTargets: options.gridTargets,
    svgW: options.svgW,
    svgH: options.svgH,
    snapStep: options.snapStep,
  });

  renderOrClearGuideLines(singleResize.resizeLines, options);
  options.setOverride(state.cid, {
    dx: singleResize.dx,
    dy: singleResize.dy,
    dw: singleResize.dw,
    dh: singleResize.dh,
  });

  const propagatedIds = ensurePropagatedIds(state);
  options.restorePropagatedResizeOverrides(state);

  if (options.hasLayoutChildren) {
    options.applyInteractionOverrideEntries(
      options.collectRecursiveRelayoutEntries(
        state.cid,
        {
          dx: singleResize.dx,
          dy: singleResize.dy,
          dw: singleResize.dw,
          dh: singleResize.dh,
        },
        state.origOverrides,
      ),
      propagatedIds,
    );
  }

  if (options.hasLayoutContext && options.relayoutSiblingsAfterChildResize) {
    const rightEdgeDelta = (singleResize.dx + singleResize.dw)
      - (Number(state.origDx ?? 0) + Number(state.origDw ?? 0));
    const bottomEdgeDelta = (singleResize.dy + singleResize.dh)
      - (Number(state.origDy ?? 0) + Number(state.origDh ?? 0));
    const siblingPatches = options.relayoutSiblingsAfterChildResize(
      state.cid,
      rightEdgeDelta,
      bottomEdgeDelta,
    );
    options.applyInteractionOverrideEntries(
      mergeRelativeOverrideEntries(siblingPatches, state.origOverrides),
      propagatedIds,
    );
  }

  options.applyAllOverrides();

  const resizedW = singleResize.dw !== 0;
  const resizedH = singleResize.dh !== 0;
  let scheduledRelayout = false;
  if (resizedW || resizedH) {
    const newW = Math.max(8, Number(state.baseW ?? state.v3BaseW ?? nodeBounds.width) + singleResize.dw);
    const newH = Math.max(8, Number(state.baseH ?? state.v3BaseH ?? nodeBounds.height) + singleResize.dh);
    const scheduleRelayout = options.scheduleLayoutResizeRelayout ?? options.scheduleV3ResizeRelayout;
    scheduleRelayout?.(state.cid, newW, newH, resizedW, resizedH);
    scheduledRelayout = true;
  }

  return {
    kind: 'single',
    moved: true,
    hidHandles,
    scheduledRelayout,
  };
}
