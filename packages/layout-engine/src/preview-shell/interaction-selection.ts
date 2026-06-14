/**
 * Interaction selection helpers (spec 043 interaction slice A).
 *
 * These helpers resolve click and double-click selection state while the
 * browser shell still owns DOM events, hit-testing, and drag lifecycle wiring.
 */

export interface PointerSelectionResolution {
  kind: 'deselect' | 'select-only' | 'prepare-drag';
  targetId?: string;
  additive?: boolean;
  nextSelectionDepth?: number;
}

export interface DoubleClickSelectionResolution {
  kind: 'none' | 'select-children' | 'select-deeper';
  targetId?: string;
  nextSelectionDepth?: number;
}

export function isAutolayoutParentLayout(layout?: string | null): boolean {
  return layout === 'vertical' || layout === 'horizontal';
}

export function resolvePointerSelection(options: {
  currentSelectionDepth: number;
  arrowId?: string | null;
  shiftKey?: boolean;
  jumpToDeepest?: boolean;
  deepestId?: string | null;
  deepestDepth?: number | null;
  currentDepthId?: string | null;
  topLevelId?: string | null;
  currentSelectedTopLevelId?: string | null;
}): PointerSelectionResolution {
  const shiftKey = Boolean(options.shiftKey);

  if (options.arrowId) {
    return {
      kind: 'select-only',
      targetId: options.arrowId,
      additive: shiftKey,
      nextSelectionDepth: 0,
    };
  }

  if (options.jumpToDeepest) {
    if (!options.deepestId) {
      return { kind: 'deselect' };
    }
    return {
      kind: 'select-only',
      targetId: options.deepestId,
      additive: shiftKey,
      nextSelectionDepth: Math.max(0, options.deepestDepth ?? 0),
    };
  }

  const effectiveId = options.currentDepthId || options.topLevelId || null;
  if (!effectiveId) {
    return { kind: 'deselect' };
  }

  const nextDepth = (
    options.topLevelId
    && options.currentSelectedTopLevelId
    && options.topLevelId !== options.currentSelectedTopLevelId
  )
    ? 0
    : Math.max(0, options.currentSelectionDepth);

  const finalId = nextDepth === 0
    ? (options.topLevelId || effectiveId)
    : effectiveId;

  if (shiftKey) {
    return {
      kind: 'select-only',
      targetId: finalId,
      additive: true,
      nextSelectionDepth: nextDepth,
    };
  }

  return {
    kind: 'prepare-drag',
    targetId: finalId,
    additive: false,
    nextSelectionDepth: nextDepth,
  };
}

export function resolveDoubleClickSelection(options: {
  currentSelectionDepth: number;
  currentHitId?: string | null;
  currentHitIsSelected?: boolean;
  currentHitChildIds?: string[] | null;
  deeperHitId?: string | null;
}): DoubleClickSelectionResolution {
  const childIds = options.currentHitChildIds ?? [];
  if (options.currentHitId && options.currentHitIsSelected && childIds.length > 0) {
    return {
      kind: 'select-children',
      nextSelectionDepth: Math.max(0, options.currentSelectionDepth) + 1,
    };
  }

  if (options.deeperHitId) {
    return {
      kind: 'select-deeper',
      targetId: options.deeperHitId,
      nextSelectionDepth: Math.max(0, options.currentSelectionDepth) + 1,
    };
  }

  return { kind: 'none' };
}
