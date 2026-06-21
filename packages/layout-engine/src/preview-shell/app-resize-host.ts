import {
  createPreviewResizeStartState,
  type CreatePreviewResizeStartStateOptions,
  type PreviewResizeStartPlan,
} from './app-interaction-host.js';
import {
  dispatchPreviewResizeMove,
  type PreviewResizeMoveDispatchOptions,
  type PreviewResizeMoveResult,
  type PreviewResizeMoveState,
} from './interaction-resize-dispatch.js';
import {
  createResizePersistencePlan,
  createOriginalOverrideEntries,
  collectRecursiveRelayoutEntries as collectRecursiveRelayoutEntriesCore,
  type InteractionOverrideEntry,
  type InteractionDeltaPatch,
} from './interaction-resize.js';
import {
  dispatchPreviewResizeCompletion,
  type PreviewResizeCompletionDispatchOptions,
  type PreviewResizeCompletionState,
} from './interaction-completion-dispatch.js';

/**
 * Preview resize host helpers (spec 043 shell coordinator slice N).
 *
 * These helpers keep resize-end persistence and DOM-teardown orchestration in
 * TypeScript so `editor.js` only passes the live shell callbacks.
 */

export interface PreviewResizePersistNode {
  data?: {
    x?: number | null;
    y?: number | null;
    width?: number | null;
    height?: number | null;
  } | null;
  parent?: {
    layout?: unknown;
  } | null;
  children?: Array<{
    data?: {
      id?: string | null;
    } | null;
  }> | null;
}

export interface PreviewResizeHostHandle {
  getAttribute: (name: string) => string | null;
}

export interface PreviewResizeHostEvent {
  target: PreviewResizeHostHandle;
  clientX: number;
  clientY: number;
  preventDefault: () => void;
  stopPropagation: () => void;
}

export interface StartPreviewResizeHostOptions extends Omit<
  CreatePreviewResizeStartStateOptions,
  'selectionToken' | 'componentId' | 'axis' | 'clientX' | 'clientY'
> {
  event: PreviewResizeHostEvent;
  captureOverrideEntries: (ids: string[]) => unknown;
  startInteraction: (state: PreviewResizeMoveState & { overrideSnapshotBefore: unknown }) => void;
  addDocumentListener: (
    type: 'mousemove' | 'mouseup',
    handler: ((event?: any) => void),
  ) => void;
  onResizeMove: (event?: any) => void;
  onResizeUp: (event?: any) => void;
}

export interface StartPreviewResizeHostResult {
  kind: 'noop' | 'started';
}

export interface CollectPreviewRecursiveRelayoutEntriesOptions {
  parentId: string;
  parentDelta: InteractionDeltaPatch;
  relayoutChildren: (
    parentId: string,
    parentDelta: {
      dx: number;
      dy: number;
      dw: number;
      dh: number;
    },
  ) => Record<string, InteractionDeltaPatch>;
  hasLayoutChildren: (id: string) => boolean;
}

export interface RestorePreviewPropagatedResizeOverridesOptions {
  state: Pick<PreviewResizeMoveState, 'propagatedIds' | 'origOverrides'>;
  applyInteractionOverrideEntries: (
    entries: InteractionOverrideEntry[],
    propagatedIds?: Set<string> | null,
  ) => void;
}

export interface DispatchPreviewResizeMoveHostOptions extends Omit<
  PreviewResizeMoveDispatchOptions,
  | 'nodeBounds'
  | 'hasLayoutChildren'
  | 'hasLayoutContext'
  | 'hideHandles'
  | 'restorePropagatedResizeOverrides'
  | 'collectRecursiveRelayoutEntries'
  | 'svgW'
  | 'svgH'
> {
  svg?: SVGSVGElement | null;
  hasDiagramGrid?: boolean;
  getNode: (cid: string) => PreviewResizePersistNode | null | undefined;
  hasLayoutChildrenForId: (cid: string) => boolean;
  relayoutChildren: (
    parentId: string,
    parentDelta: {
      dx: number;
      dy: number;
      dw: number;
      dh: number;
    },
    origOverrides: Record<string, InteractionDeltaPatch | undefined>,
  ) => Record<string, InteractionDeltaPatch>;
}

export interface PersistPreviewResizeToFrameOverridesOptions {
  resizeIds: Iterable<string>;
  propagatedIds?: Iterable<string> | null;
  triggerCid: string;
  baseSizes?: Record<string, { width: number; height: number }> | null;
  getNode: (cid: string) => PreviewResizePersistNode | null | undefined;
  getOwnDelta: (cid: string) => InteractionDeltaPatch | null | undefined;
  setOverride: (
    cid: string,
    partial: InteractionDeltaPatch & Record<string, unknown>,
  ) => void;
  requestRelayout: (triggerCid: string) => void;
  minSize?: number;
}

export interface CompletePreviewResizeInteractionOptions extends Omit<
  PreviewResizeCompletionDispatchOptions,
  'state'
> {
  state?: PreviewResizeCompletionState | (PreviewResizeMoveState & {
    overrideSnapshotBefore?: unknown;
  }) | null;
  cancelLiveRelayout: () => void;
  removeDocumentListener: (
    type: 'mousemove' | 'mouseup',
    handler: ((event?: any) => void),
  ) => void;
  onResizeMove: (event?: any) => void;
  onResizeUp: (event?: any) => void;
  clearGuideLines: () => void;
  clearSvgHoverState: () => void;
}

export interface PreviewResizeEditorHostHandleLike {
  style: {
    display: string;
  };
}

export interface CompletePreviewResizeInteractionEditorHostOptions extends Omit<
  CompletePreviewResizeInteractionOptions,
  'removeDocumentListener' | 'clearSvgHoverState' | 'state' | 'showHandles' | 'endInteraction'
> {
  document: {
    removeEventListener: (
      type: 'mousemove' | 'mouseup',
      handler: ((event?: any) => void),
    ) => void;
    querySelector: (selector: string) => {
      querySelectorAll: (selector: string) => Iterable<PreviewResizeEditorHostHandleLike>;
    } | null;
  };
  interactionManager: {
    state?: CompletePreviewResizeInteractionOptions['state'];
    endInteraction: () => void;
  };
  clearPreviewSvgHoverState: (svg: unknown) => void;
}

export type CompletePreviewResizeInteractionHostLikeOptions =
  | CompletePreviewResizeInteractionOptions
  | CompletePreviewResizeInteractionEditorHostOptions;

function normalizePreviewResizeCompletionState(
  state: CompletePreviewResizeInteractionOptions['state'],
): PreviewResizeCompletionState | null {
  if (!state) {
    return null;
  }

  if ('origOverrideIds' in state) {
    return state;
  }

  return {
    hasMoved: state.hasMoved,
    cid: state.cid,
    selectionIds: state.selection?.ids ?? null,
    origOverrideIds: Object.keys(state.origOverrides || {}),
    propagatedIds: state.propagatedIds,
    baseSizes: state.baseSizes ?? null,
    overrideSnapshotBefore: state.overrideSnapshotBefore,
  };
}

export function startPreviewResizeHost(
  options: StartPreviewResizeHostOptions,
): StartPreviewResizeHostResult {
  const startPlan: PreviewResizeStartPlan = createPreviewResizeStartState({
    selectionToken: options.event.target.getAttribute('data-resize-selection'),
    componentId: options.event.target.getAttribute('data-resize-cid'),
    axis: options.event.target.getAttribute('data-resize-axis'),
    clientX: options.event.clientX,
    clientY: options.event.clientY,
    svg: options.svg,
    selectedIds: options.selectedIds,
    hasDiagramGrid: options.hasDiagramGrid,
    getNode: options.getNode,
    getSiblings: options.getSiblings,
    getAncestors: options.getAncestors,
    getOwnDelta: options.getOwnDelta,
    getEffectiveDelta: options.getEffectiveDelta,
    hasLayoutChildren: options.hasLayoutChildren,
    isAutolayoutChild: options.isAutolayoutChild,
    resolvePrimaryId: options.resolvePrimaryId,
    minNodeSize: options.minNodeSize,
  });

  if (startPlan.kind !== 'start') {
    options.event.preventDefault();
    options.event.stopPropagation();
    return { kind: 'noop' };
  }

  options.startInteraction({
    ...startPlan.state,
    overrideSnapshotBefore: options.captureOverrideEntries(startPlan.touchedIds),
  });
  options.addDocumentListener('mousemove', options.onResizeMove);
  options.addDocumentListener('mouseup', options.onResizeUp);
  options.event.preventDefault();
  options.event.stopPropagation();

  return { kind: 'started' };
}

export function collectPreviewRecursiveRelayoutEntries(
  options: CollectPreviewRecursiveRelayoutEntriesOptions,
): InteractionOverrideEntry[] {
  return collectRecursiveRelayoutEntriesCore({
    parentId: options.parentId,
    parentDelta: options.parentDelta,
    relayoutChildren: options.relayoutChildren,
    hasLayoutChildren: options.hasLayoutChildren,
  });
}

export function restorePreviewPropagatedResizeOverrides(
  options: RestorePreviewPropagatedResizeOverridesOptions,
): void {
  if (!options.state.propagatedIds || options.state.propagatedIds.size === 0) {
    return;
  }
  options.applyInteractionOverrideEntries(
    createOriginalOverrideEntries(options.state.propagatedIds, options.state.origOverrides),
  );
  options.state.propagatedIds.clear();
}

export function dispatchPreviewResizeMoveHost(
  options: DispatchPreviewResizeMoveHostOptions,
): PreviewResizeMoveResult {
  const node = options.getNode(options.state.cid);
  const svg = options.svg ?? null;
  const svgW = svg ? Number.parseFloat(svg.getAttribute('width') || '0') : 0;
  const svgH = svg ? Number.parseFloat(svg.getAttribute('height') || '0') : 0;

  return dispatchPreviewResizeMove({
    ...options,
    svgW,
    svgH,
    nodeBounds: node ? {
      x: Number(node.data?.x ?? 0),
      y: Number(node.data?.y ?? 0),
      width: Number(node.data?.width ?? 0),
      height: Number(node.data?.height ?? 0),
    } : null,
    hasLayoutChildren: options.hasLayoutChildrenForId(options.state.cid),
    hasLayoutContext: Boolean(node && (
      (node.parent && node.parent.layout)
      || (!node.parent && options.hasDiagramGrid)
    )),
    hideHandles: () => {
      svg?.querySelectorAll('.dg-handle').forEach((handle) => {
        (handle as HTMLElement).style.display = 'none';
      });
    },
    restorePropagatedResizeOverrides: (state) => {
      restorePreviewPropagatedResizeOverrides({
        state,
        applyInteractionOverrideEntries: options.applyInteractionOverrideEntries,
      });
    },
    collectRecursiveRelayoutEntries: (parentId, parentDelta, origOverrides) => {
      return collectPreviewRecursiveRelayoutEntries({
        parentId,
        parentDelta,
        relayoutChildren: (relayoutParentId, relayoutParentDelta) => {
          return options.relayoutChildren(relayoutParentId, relayoutParentDelta, origOverrides);
        },
        hasLayoutChildren: options.hasLayoutChildrenForId,
      });
    },
  });
}

export function persistPreviewResizeToFrameOverrides(
  options: PersistPreviewResizeToFrameOverridesOptions,
): void {
  const items = [...options.resizeIds]
    .map((cid) => {
      const node = options.getNode(cid);
      if (!node) return null;
      return {
        id: cid,
        baseW: Number(options.baseSizes?.[cid]?.width ?? node.data?.width ?? 0),
        baseH: Number(options.baseSizes?.[cid]?.height ?? node.data?.height ?? 0),
        delta: options.getOwnDelta(cid) ?? {},
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const plan = createResizePersistencePlan({
    items,
    propagatedIds: options.propagatedIds,
    minSize: options.minSize ?? 8,
  });

  for (const entry of plan.entries) {
    const patch: InteractionDeltaPatch & Record<string, unknown> = {
      dx: 0,
      dy: 0,
      dw: 0,
      dh: 0,
    };
    if (entry.sizingWFixed) {
      patch.width = entry.width;
      patch.sizing_w = 'FIXED';
    }
    if (entry.sizingHFixed) {
      patch.height = entry.height;
      patch.sizing_h = 'FIXED';
    }
    options.setOverride(entry.id, patch);
  }

  for (const propagatedId of plan.resetIds) {
    options.setOverride(propagatedId, { dx: 0, dy: 0, dw: 0, dh: 0 });
  }

  if (plan.shouldTriggerRelayout) {
    options.requestRelayout(options.triggerCid);
  }
}

function isEditorResizeCompletionOptions(
  options: CompletePreviewResizeInteractionHostLikeOptions,
): options is CompletePreviewResizeInteractionEditorHostOptions {
  return 'interactionManager' in options;
}

export function completePreviewResizeInteraction(
  options: CompletePreviewResizeInteractionHostLikeOptions,
) {
  if (isEditorResizeCompletionOptions(options)) {
    const svg = options.document.querySelector('#stage svg');

    return completePreviewResizeInteraction({
      cancelLiveRelayout: options.cancelLiveRelayout,
      removeDocumentListener: (type, handler) => {
        options.document.removeEventListener(type, handler);
      },
      onResizeMove: options.onResizeMove,
      onResizeUp: options.onResizeUp,
      clearGuideLines: options.clearGuideLines,
      clearSvgHoverState: () => {
        if (svg) {
          options.clearPreviewSvgHoverState(svg);
        }
      },
      state: options.interactionManager.state ?? null,
      cleanOverride: options.cleanOverride,
      captureOverrideEntries: options.captureOverrideEntries,
      reapplySelection: options.reapplySelection,
      selectComponent: options.selectComponent,
      commitOverridePatchAction: options.commitOverridePatchAction,
      persistResize: options.persistResize,
      showHandles: () => {
        for (const handle of svg?.querySelectorAll('.dg-handle') || []) {
          handle.style.display = '';
        }
      },
      endInteraction: () => options.interactionManager.endInteraction(),
      autoFitArtboard: options.autoFitArtboard,
    });
  }

  options.cancelLiveRelayout();
  options.removeDocumentListener('mousemove', options.onResizeMove);
  options.removeDocumentListener('mouseup', options.onResizeUp);
  options.clearGuideLines();
  options.clearSvgHoverState();

  return dispatchPreviewResizeCompletion({
    state: normalizePreviewResizeCompletionState(options.state),
    cleanOverride: options.cleanOverride,
    captureOverrideEntries: options.captureOverrideEntries,
    reapplySelection: options.reapplySelection,
    selectComponent: options.selectComponent,
    commitOverridePatchAction: options.commitOverridePatchAction,
    persistResize: options.persistResize,
    showHandles: options.showHandles,
    endInteraction: options.endInteraction,
    autoFitArtboard: options.autoFitArtboard,
  });
}
