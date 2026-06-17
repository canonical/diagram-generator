import {
  createPreviewDragStartState,
  resolvePreviewAutolayoutDragContext,
  type CreatePreviewDragStartStateOptions,
  type PreviewAutolayoutParentNode,
} from './app-interaction-host.js';
import {
  dispatchPreviewDragCompletion,
  type PreviewDragCompletionDispatchOptions,
  type PreviewDragCompletionState,
} from './interaction-completion-dispatch.js';
import {
  dispatchPreviewDragMove,
  type PreviewDragMoveDispatchOptions,
  type PreviewDragMoveResult,
  type PreviewDragMoveState,
} from './interaction-drag-dispatch.js';
import {
  resolvePointerSelection,
} from './interaction-selection.js';

/**
 * Preview drag host helpers (spec 043 shell coordinator slice O).
 *
 * These helpers keep drag-end teardown and parent-bounds clamping in
 * TypeScript so `editor.js` only supplies live model callbacks.
 */

export interface PreviewDragClampNode {
  x: number;
  y: number;
  width: number;
  height: number;
  type?: string | null;
}

export interface PreviewDragClampParentNode extends PreviewDragClampNode {
  id: string;
}

export interface PreviewDragClampDelta {
  dx?: number | null;
  dy?: number | null;
  dw?: number | null;
  dh?: number | null;
}

export interface PreviewPointerClassList {
  contains: (className: string) => boolean;
}

export interface PreviewPointerEventLike {
  target: {
    classList: PreviewPointerClassList;
  };
  button: number;
  clientX: number;
  clientY: number;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  preventDefault: () => void;
}

export interface PreviewPointerSvgLike {
  createSVGPoint: () => {
    x: number;
    y: number;
    matrixTransform: (matrix: unknown) => { x: number; y: number };
  };
  getScreenCTM: () => {
    inverse: () => unknown;
  } | null;
}

export interface StartPreviewPointerInteractionHostOptions extends Omit<
  CreatePreviewDragStartStateOptions,
  'componentId' | 'clientX' | 'clientY'
> {
  event: PreviewPointerEventLike;
  svg?: PreviewPointerSvgLike | null;
  currentSelectionDepth: number;
  commitTextEditIfActive: () => void;
  startResize: (event: PreviewPointerEventLike) => void;
  findArrowAtPoint: (clientX: number, clientY: number) => string | null | undefined;
  findDeepestComponent: (x: number, y: number) => string | null | undefined;
  findComponentAtDepth: (x: number, y: number, depth: number) => string | null | undefined;
  getAncestors: (id: string) => string[];
  deselectAll: () => void;
  setSelectionDepth: (depth: number) => void;
  selectComponent: (id: string, additive: boolean) => void;
  captureOverrideEntries: (ids: string[]) => unknown;
  startDragInteraction: (state: { overrideSnapshotBefore: unknown } & Record<string, unknown>) => void;
  addDocumentListener: (
    type: 'mousemove' | 'mouseup',
    handler: ((event?: any) => void),
  ) => void;
  onDragMove: (event?: any) => void;
  onDragUp: (event?: any) => void;
}

export interface StartPreviewPointerInteractionHostResult {
  kind: 'noop' | 'resize' | 'deselect' | 'select-only' | 'drag-start';
}

export interface ClampPreviewDragDeltaWithinParentOptions {
  cid: string;
  proposedDx: number;
  proposedDy: number;
  inset: number;
  getParentNode: (cid: string) => PreviewDragClampParentNode | null | undefined;
  getComponentNode: (cid: string) => PreviewDragClampNode | null | undefined;
  getOwnDelta: (cid: string) => PreviewDragClampDelta | null | undefined;
  getEffectiveDelta: (cid: string) => PreviewDragClampDelta | null | undefined;
}

export interface CompletePreviewDragInteractionOptions extends Omit<
  PreviewDragCompletionDispatchOptions,
  'state'
> {
  state?: PreviewDragCompletionState | null;
  removeDocumentListener: (
    type: 'mousemove' | 'mouseup',
    handler: ((event?: any) => void),
  ) => void;
  onDragMove: (event?: any) => void;
  onDragUp: (event?: any) => void;
  clearGuideLines: () => void;
  clearReorderIndicator: () => void;
}

export interface DispatchPreviewDragMoveHostOptions extends Omit<
  PreviewDragMoveDispatchOptions,
  'state' | 'autolayoutContext'
> {
  state?: PreviewDragMoveState | null;
  svg?: SVGSVGElement | null;
  getParentNodeForAutolayout: (
    cid: string,
  ) => PreviewAutolayoutParentNode | null | undefined;
}

function numberOrZero(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function startPreviewPointerInteractionHost(
  options: StartPreviewPointerInteractionHostOptions,
): StartPreviewPointerInteractionHostResult {
  options.commitTextEditIfActive();

  if (options.event.target.classList.contains('dg-handle')) {
    options.startResize(options.event);
    return { kind: 'resize' };
  }

  const svg = options.svg;
  if (!svg || options.event.button !== 0) {
    return { kind: 'noop' };
  }

  const point = svg.createSVGPoint();
  point.x = options.event.clientX;
  point.y = options.event.clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) {
    return { kind: 'noop' };
  }
  const svgPoint = point.matrixTransform(ctm.inverse());

  const arrowId = options.findArrowAtPoint(options.event.clientX, options.event.clientY) || null;
  const jumpToDeepest = Boolean(options.event.ctrlKey || options.event.metaKey);
  const deepestId = jumpToDeepest
    ? (options.findDeepestComponent(svgPoint.x, svgPoint.y) || null)
    : null;
  const currentDepthId = options.findComponentAtDepth(
    svgPoint.x,
    svgPoint.y,
    options.currentSelectionDepth,
  ) || null;
  const topLevelId = options.findComponentAtDepth(svgPoint.x, svgPoint.y, 0) || null;

  let currentSelectedTopLevelId: string | null = null;
  const selectedIdList = [...options.selectedIds];
  if (selectedIdList.length > 0) {
    const firstSelected = selectedIdList[0]!;
    const ancestors = options.getAncestors(firstSelected);
    currentSelectedTopLevelId = ancestors.length > 0 ? ancestors[0]! : firstSelected;
  }

  const pointerResolution = resolvePointerSelection({
    currentSelectionDepth: options.currentSelectionDepth,
    arrowId,
    shiftKey: Boolean(options.event.shiftKey),
    jumpToDeepest,
    deepestId,
    deepestDepth: deepestId ? options.getAncestors(deepestId).length : null,
    currentDepthId,
    topLevelId,
    currentSelectedTopLevelId,
  });

  if (pointerResolution.kind === 'deselect') {
    options.deselectAll();
    return { kind: 'deselect' };
  }

  if (pointerResolution.kind === 'select-only' && pointerResolution.targetId) {
    options.setSelectionDepth(
      pointerResolution.nextSelectionDepth ?? options.currentSelectionDepth,
    );
    options.selectComponent(pointerResolution.targetId, Boolean(pointerResolution.additive));
    options.event.preventDefault();
    return { kind: 'select-only' };
  }

  if (pointerResolution.kind !== 'prepare-drag' || !pointerResolution.targetId) {
    options.event.preventDefault();
    return { kind: 'noop' };
  }

  const dragStart = createPreviewDragStartState({
    componentId: pointerResolution.targetId,
    selectedIds: options.selectedIds,
    clientX: options.event.clientX,
    clientY: options.event.clientY,
    getOwnDelta: options.getOwnDelta,
    collectSnapTargets: options.collectSnapTargets,
    isAutolayoutChild: options.isAutolayoutChild,
  });
  if (dragStart.kind !== 'start') {
    options.event.preventDefault();
    return { kind: 'noop' };
  }

  options.startDragInteraction({
    ...dragStart.state,
    overrideSnapshotBefore: options.captureOverrideEntries(dragStart.captureIds),
  });
  options.addDocumentListener('mousemove', options.onDragMove);
  options.addDocumentListener('mouseup', options.onDragUp);
  options.event.preventDefault();

  return { kind: 'drag-start' };
}

export function clampPreviewDragDeltaWithinParent(
  options: ClampPreviewDragDeltaWithinParentOptions,
): { dx: number; dy: number } {
  const parent = options.getParentNode(options.cid);
  const node = options.getComponentNode(options.cid);
  if (!parent || !node || parent.type === 'arrow') {
    return {
      dx: options.proposedDx,
      dy: options.proposedDy,
    };
  }

  let nextDx = options.proposedDx;
  let nextDy = options.proposedDy;
  const parentEffective = options.getEffectiveDelta(parent.id);
  const parentOwn = options.getOwnDelta(parent.id);
  const own = options.getOwnDelta(options.cid);

  const parentLeft = parent.x + numberOrZero(parentEffective?.dx) + options.inset;
  const parentTop = parent.y + numberOrZero(parentEffective?.dy) + options.inset;
  const parentRight = parentLeft
    + parent.width
    + numberOrZero(parentOwn?.dw)
    - (2 * options.inset);
  const parentBottom = parentTop
    + parent.height
    + numberOrZero(parentOwn?.dh)
    - (2 * options.inset);
  const componentWidth = node.width + numberOrZero(own?.dw);
  const componentHeight = node.height + numberOrZero(own?.dh);
  const componentLeft = node.x + nextDx;
  const componentTop = node.y + nextDy;

  if (componentLeft < parentLeft) nextDx = parentLeft - node.x;
  if (componentTop < parentTop) nextDy = parentTop - node.y;
  if (componentLeft + componentWidth > parentRight) {
    nextDx = parentRight - componentWidth - node.x;
  }
  if (componentTop + componentHeight > parentBottom) {
    nextDy = parentBottom - componentHeight - node.y;
  }

  return { dx: nextDx, dy: nextDy };
}

export function dispatchPreviewDragMoveHost(
  options: DispatchPreviewDragMoveHostOptions,
): PreviewDragMoveResult {
  const state = options.state ?? null;
  if (!state) {
    return {
      kind: 'none',
      moved: false,
      appliedIds: [],
      guideLineCount: 0,
    };
  }

  const autolayoutContext = state.autolayout && state.cids.length === 1
    ? resolvePreviewAutolayoutDragContext({
      componentId: state.cids[0] ?? state.cid,
      svg: options.svg ?? null,
      clientX: options.clientX,
      clientY: options.clientY,
      getParentNode: options.getParentNodeForAutolayout,
    })
    : null;

  return dispatchPreviewDragMove({
    ...options,
    state,
    autolayoutContext,
  });
}

export function completePreviewDragInteraction(
  options: CompletePreviewDragInteractionOptions,
) {
  options.removeDocumentListener('mousemove', options.onDragMove);
  options.removeDocumentListener('mouseup', options.onDragUp);
  options.clearGuideLines();
  options.clearReorderIndicator();

  return dispatchPreviewDragCompletion({
    state: options.state ?? null,
    applyReorder: options.applyReorder,
    cleanOverride: options.cleanOverride,
    captureOverrideEntries: options.captureOverrideEntries,
    reapplySelection: options.reapplySelection,
    selectComponent: options.selectComponent,
    commitOverridePatchAction: options.commitOverridePatchAction,
    endInteraction: options.endInteraction,
    autoFitArtboard: options.autoFitArtboard,
  });
}
