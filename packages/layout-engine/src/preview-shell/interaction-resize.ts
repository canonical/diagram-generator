import type { ResizeBounds } from './interaction-geometry.js';

/**
 * Resize controller helpers (spec 043 interaction slice D).
 *
 * These keep `editor.js` focused on DOM/event wiring while TS owns the
 * deterministic override shaping used during live resize interactions.
 */

export interface InteractionDeltaPatch {
  dx?: number;
  dy?: number;
  dw?: number;
  dh?: number;
}

export interface InteractionDeltaValue {
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

export interface InteractionOverrideEntry extends InteractionDeltaValue {
  id: string;
}

export interface MultiSelectionResizeMember {
  id: string;
  bounds: Pick<ResizeBounds, 'left' | 'top' | 'right' | 'bottom'>;
  ancestorDx: number;
  ancestorDy: number;
  baseX: number;
  baseY: number;
  baseW: number;
  baseH: number;
  hasLayoutChildren: boolean;
}

export interface MultiSelectionResizeOverride extends InteractionOverrideEntry {
  hasLayoutChildren: boolean;
}

export interface ResizePersistenceItem {
  id: string;
  baseW: number;
  baseH: number;
  delta: InteractionDeltaPatch;
}

export interface ResizePersistenceEntry {
  id: string;
  width?: number;
  height?: number;
  sizingWFixed: boolean;
  sizingHFixed: boolean;
}

export interface ResizePersistencePlan {
  changed: boolean;
  entries: ResizePersistenceEntry[];
  resetIds: string[];
  shouldTriggerRelayout: boolean;
}

function toDeltaValue(patch?: InteractionDeltaPatch | null): InteractionDeltaValue {
  return {
    dx: Number(patch?.dx ?? 0),
    dy: Number(patch?.dy ?? 0),
    dw: Number(patch?.dw ?? 0),
    dh: Number(patch?.dh ?? 0),
  };
}

function normalizePersistedResizeDimension(value: number, minSize: number): number {
  return Math.round(Math.max(minSize, value));
}

export function createOriginalOverrideEntries(
  ids: Iterable<string>,
  origOverrides: Record<string, InteractionDeltaPatch | undefined>,
): InteractionOverrideEntry[] {
  const entries: InteractionOverrideEntry[] = [];
  const seen = new Set<string>();

  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    entries.push({
      id,
      ...toDeltaValue(origOverrides[id]),
    });
  }

  return entries;
}

export function createMultiSelectionResizeOverrides(options: {
  selectionBounds: Pick<ResizeBounds, 'left' | 'top' | 'width' | 'height'>;
  nextBounds: Pick<ResizeBounds, 'left' | 'top' | 'width' | 'height'>;
  members: MultiSelectionResizeMember[];
}): MultiSelectionResizeOverride[] {
  const scaleX = options.selectionBounds.width === 0
    ? 1
    : options.nextBounds.width / options.selectionBounds.width;
  const scaleY = options.selectionBounds.height === 0
    ? 1
    : options.nextBounds.height / options.selectionBounds.height;

  return options.members.map((member) => {
    const memberLeft = options.nextBounds.left
      + (member.bounds.left - options.selectionBounds.left) * scaleX;
    const memberTop = options.nextBounds.top
      + (member.bounds.top - options.selectionBounds.top) * scaleY;
    const memberRight = options.nextBounds.left
      + (member.bounds.right - options.selectionBounds.left) * scaleX;
    const memberBottom = options.nextBounds.top
      + (member.bounds.bottom - options.selectionBounds.top) * scaleY;

    return {
      id: member.id,
      dx: memberLeft - member.baseX - member.ancestorDx,
      dy: memberTop - member.baseY - member.ancestorDy,
      dw: (memberRight - memberLeft) - member.baseW,
      dh: (memberBottom - memberTop) - member.baseH,
      hasLayoutChildren: member.hasLayoutChildren,
    };
  });
}

export function mergeRelativeOverrideEntries(
  relativePatches: Record<string, InteractionDeltaPatch>,
  origOverrides: Record<string, InteractionDeltaPatch | undefined>,
): InteractionOverrideEntry[] {
  const entries: InteractionOverrideEntry[] = [];

  for (const [id, relativePatch] of Object.entries(relativePatches)) {
    const base = toDeltaValue(origOverrides[id]);
    entries.push({
      id,
      dx: relativePatch.dx === undefined ? base.dx : base.dx + relativePatch.dx,
      dy: relativePatch.dy === undefined ? base.dy : base.dy + relativePatch.dy,
      dw: relativePatch.dw === undefined ? base.dw : base.dw + relativePatch.dw,
      dh: relativePatch.dh === undefined ? base.dh : base.dh + relativePatch.dh,
    });
  }

  return entries;
}

export function collectRecursiveRelayoutEntries(options: {
  parentId: string;
  parentDelta: InteractionDeltaPatch;
  relayoutChildren: (
    parentId: string,
    parentDelta: InteractionDeltaValue,
  ) => Record<string, InteractionDeltaPatch>;
  hasLayoutChildren: (id: string) => boolean;
}): InteractionOverrideEntry[] {
  const entries: InteractionOverrideEntry[] = [];
  const activeParents = new Set<string>();

  function visit(parentId: string, parentDelta: InteractionDeltaValue) {
    if (activeParents.has(parentId)) return;
    activeParents.add(parentId);

    const childDeltas = options.relayoutChildren(parentId, parentDelta);
    for (const [childId, childPatch] of Object.entries(childDeltas)) {
      const childDelta = toDeltaValue(childPatch);
      entries.push({
        id: childId,
        ...childDelta,
      });
      if (options.hasLayoutChildren(childId)) {
        visit(childId, childDelta);
      }
    }

    activeParents.delete(parentId);
  }

  visit(options.parentId, toDeltaValue(options.parentDelta));
  return entries;
}

export function createResizePersistencePlan(options: {
  items: ResizePersistenceItem[];
  propagatedIds?: Iterable<string> | null;
  minSize?: number;
}): ResizePersistencePlan {
  const minSize = Math.max(1, options.minSize ?? 8);
  const entries: ResizePersistenceEntry[] = [];

  for (const item of options.items) {
    const delta = toDeltaValue(item.delta);
    const sizingWFixed = delta.dw !== 0;
    const sizingHFixed = delta.dh !== 0;
    if (!sizingWFixed && !sizingHFixed) continue;

    entries.push({
      id: item.id,
      width: sizingWFixed
        ? normalizePersistedResizeDimension(item.baseW + delta.dw, minSize)
        : undefined,
      height: sizingHFixed
        ? normalizePersistedResizeDimension(item.baseH + delta.dh, minSize)
        : undefined,
      sizingWFixed,
      sizingHFixed,
    });
  }

  const resetIds = options.propagatedIds
    ? [...new Set([...options.propagatedIds].filter(Boolean))]
    : [];

  return {
    changed: entries.length > 0,
    entries,
    resetIds,
    shouldTriggerRelayout: entries.length > 0 || resetIds.length > 0,
  };
}
