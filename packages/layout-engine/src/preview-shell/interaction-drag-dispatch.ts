import {
  resolveAutolayoutReorderTarget,
  type ReorderTargetPoint,
  type ResizeGuideLine,
} from './interaction-geometry.js';
import type { DragReorderTarget } from './interaction-completion.js';
import type { InteractionDeltaPatch } from './interaction-resize.js';

/**
 * Live drag dispatch helpers (spec 043 interaction slice J).
 *
 * These helpers own drag-move controller branching while the JS shell still
 * provides DOM-derived cursor coordinates and concrete model callbacks.
 */

export interface PreviewDragDelta {
  dx: number;
  dy: number;
}

export interface PreviewDragSnapTargets {
  xs?: number[];
  ys?: number[];
}

export interface PreviewDragSnapResult {
  dx: number;
  dy: number;
  lines: ResizeGuideLine[];
}

export interface PreviewAutolayoutDragContext {
  parentId: string;
  isVertical: boolean;
  cursorPos: number;
  targets: ReorderTargetPoint[];
}

export interface PreviewDragMoveState {
  cid: string;
  cids: string[];
  startX: number;
  startY: number;
  hasMoved?: boolean;
  autolayout?: boolean;
  reorderTarget?: DragReorderTarget | null;
  origDeltas: Record<string, PreviewDragDelta | undefined>;
  snapTargets?: PreviewDragSnapTargets | null;
}

export interface PreviewDragMoveDispatchOptions {
  state: PreviewDragMoveState;
  clientX: number;
  clientY: number;
  snapStep?: number;
  autolayoutContext?: PreviewAutolayoutDragContext | null;
  showReorderIndicator: (parentId: string, insertIndex: number, isVertical: boolean) => void;
  clearReorderIndicator: () => void;
  resolveSnap?: (
    cid: string,
    proposedDx: number,
    proposedDy: number,
    targets: PreviewDragSnapTargets,
  ) => PreviewDragSnapResult;
  renderGuideLines: (lines: ResizeGuideLine[]) => void;
  clampDragDelta: (cid: string, proposedDx: number, proposedDy: number) => PreviewDragDelta;
  setOverride: (cid: string, patch: InteractionDeltaPatch) => void;
  applyAllOverrides: () => void;
  updateInspector: (cid: string) => void;
  shouldUpdateInspector?: boolean;
}

export interface PreviewDragMoveResult {
  kind: 'none' | 'autolayout' | 'free-drag';
  moved: boolean;
  appliedIds: string[];
  guideLineCount: number;
}

export function dispatchPreviewDragMove(
  options: PreviewDragMoveDispatchOptions,
): PreviewDragMoveResult {
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
      appliedIds: [],
      guideLineCount: 0,
    };
  }

  if (state.autolayout && state.cids.length === 1) {
    const context = options.autolayoutContext;
    if (context) {
      const reorderResolution = resolveAutolayoutReorderTarget({
        cid: state.cids[0] ?? state.cid,
        cursorPos: context.cursorPos,
        targets: context.targets,
      });
      if (reorderResolution.isNoop) {
        options.clearReorderIndicator();
        state.reorderTarget = null;
      } else {
        options.showReorderIndicator(
          context.parentId,
          reorderResolution.insertIndex,
          context.isVertical,
        );
        state.reorderTarget = {
          parentId: context.parentId,
          insertIndex: reorderResolution.insertIndex,
        };
      }
    }

    return {
      kind: 'autolayout',
      moved: true,
      appliedIds: [],
      guideLineCount: 0,
    };
  }

  const step = Math.max(1, options.snapStep ?? 8);
  let guideLines: ResizeGuideLine[] = [];

  for (const id of state.cids) {
    const orig = state.origDeltas[id] ?? { dx: 0, dy: 0 };
    let nextDx = Math.round((orig.dx + dx) / step) * step;
    let nextDy = Math.round((orig.dy + dy) / step) * step;

    if (state.snapTargets && state.cids.length === 1 && options.resolveSnap) {
      const snap = options.resolveSnap(id, nextDx, nextDy, state.snapTargets);
      nextDx = snap.dx;
      nextDy = snap.dy;
      guideLines = snap.lines;
    }

    const clamped = options.clampDragDelta(id, nextDx, nextDy);
    options.setOverride(id, {
      dx: clamped.dx,
      dy: clamped.dy,
    });
  }

  if (state.snapTargets && state.cids.length === 1 && options.resolveSnap) {
    options.renderGuideLines(guideLines);
  }

  options.applyAllOverrides();
  if (options.shouldUpdateInspector) {
    options.updateInspector(state.cid);
  }

  return {
    kind: 'free-drag',
    moved: true,
    appliedIds: [...state.cids],
    guideLineCount: guideLines.length,
  };
}
