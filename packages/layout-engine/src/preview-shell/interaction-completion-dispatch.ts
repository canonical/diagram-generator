import {
  resolveDragCompletion,
  resolveResizeCompletion,
  type DragCompletionPlan,
  type DragReorderTarget,
  type ResizeCompletionPlan,
} from './interaction-completion.js';

/**
 * Completion dispatch helpers (spec 043 interaction slice H).
 *
 * These helpers own the branchy drag-end and resize-end controller flow while
 * the shell still handles DOM teardown and passes concrete callbacks.
 */

export interface PreviewDragCompletionState {
  hasMoved?: boolean;
  autolayout?: boolean;
  cid: string;
  cids: string[];
  reorderTarget?: DragReorderTarget | null;
  overrideSnapshotBefore: unknown;
}

export interface PreviewResizeCompletionState {
  hasMoved?: boolean;
  cid: string;
  selectionIds?: string[] | null;
  origOverrideIds: Iterable<string>;
  propagatedIds?: Iterable<string> | null;
  baseSizes?: Record<string, { width: number; height: number }> | null;
  overrideSnapshotBefore: unknown;
}

export interface PreviewDragCompletionDispatchOptions {
  state?: PreviewDragCompletionState | null;
  applyReorder: (parentId: string, cid: string, insertIndex: number) => void;
  cleanOverride: (id: string) => void;
  captureOverrideEntries: (ids: string[]) => unknown;
  reapplySelection: () => void;
  selectComponent: (id: string) => void;
  commitOverridePatchAction: (
    label: string,
    beforeEntries: unknown,
    afterEntries: unknown,
  ) => void;
  endInteraction: () => void;
  autoFitArtboard: () => void;
}

export interface PreviewResizeCompletionDispatchOptions {
  state?: PreviewResizeCompletionState | null;
  cleanOverride: (id: string) => void;
  captureOverrideEntries: (ids: string[]) => unknown;
  reapplySelection: () => void;
  selectComponent: (id: string) => void;
  commitOverridePatchAction: (
    label: string,
    beforeEntries: unknown,
    afterEntries: unknown,
  ) => void;
  persistResize: (
    resizedIds: string[],
    propagatedIds: Iterable<string> | null | undefined,
    triggerCid: string,
    baseSizes?: Record<string, { width: number; height: number }> | null,
  ) => void;
  showHandles: () => void;
  endInteraction: () => void;
  autoFitArtboard: () => void;
}

export function dispatchPreviewDragCompletion(
  options: PreviewDragCompletionDispatchOptions,
): DragCompletionPlan {
  const state = options.state;
  const plan: DragCompletionPlan = state
    ? resolveDragCompletion({
      hasMoved: state.hasMoved,
      autolayout: state.autolayout,
      cid: state.cid,
      cids: state.cids,
      reorderTarget: state.reorderTarget,
    })
    : { kind: 'none', autoFit: false };

  if (plan.kind === 'apply-reorder') {
    options.applyReorder(
      plan.parentId,
      state?.cids[0] ?? plan.selectedId,
      plan.insertIndex,
    );
    options.selectComponent(plan.selectedId);
  } else if (plan.kind === 'commit-free-drag' && state) {
    for (const id of plan.cleanIds) {
      options.cleanOverride(id);
    }
    const afterOverrides = options.captureOverrideEntries(plan.captureAfterIds);
    if (plan.reapplySelection) {
      options.reapplySelection();
    } else {
      options.selectComponent(plan.selectedId);
    }
    options.commitOverridePatchAction(
      plan.actionLabel,
      state.overrideSnapshotBefore,
      afterOverrides,
    );
  } else if (plan.kind === 'select-only') {
    options.selectComponent(plan.selectedId);
  }

  options.endInteraction();
  if (plan.autoFit) {
    options.autoFitArtboard();
  }
  return plan;
}

export function dispatchPreviewResizeCompletion(
  options: PreviewResizeCompletionDispatchOptions,
): ResizeCompletionPlan {
  const state = options.state;
  const plan: ResizeCompletionPlan = state
    ? resolveResizeCompletion({
      hasMoved: state.hasMoved,
      cid: state.cid,
      selectionIds: state.selectionIds,
      origOverrideIds: state.origOverrideIds,
      propagatedIds: state.propagatedIds,
    })
    : { kind: 'none', showHandles: false, autoFit: false };

  if (plan.kind === 'commit-resize' && state) {
    for (const id of plan.cleanIds) {
      options.cleanOverride(id);
    }
    for (const id of plan.propagatedIdsToClean) {
      options.cleanOverride(id);
    }
    const afterOverrides = options.captureOverrideEntries(plan.captureAfterIds);
    if (plan.reapplySelection) {
      options.reapplySelection();
    } else {
      options.selectComponent(plan.selectedId);
    }
    options.commitOverridePatchAction(
      plan.actionLabel,
      state.overrideSnapshotBefore,
      afterOverrides,
    );
    options.persistResize(plan.resizedIds, state.propagatedIds, state.cid, state.baseSizes ?? null);
  } else if (plan.kind === 'none' && plan.showHandles) {
    options.showHandles();
  }

  options.endInteraction();
  if (plan.autoFit) {
    options.autoFitArtboard();
  }
  return plan;
}
