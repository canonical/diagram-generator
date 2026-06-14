/**
 * Inspector selection view-model helpers (spec 043 Slice 1).
 *
 * These helpers keep selection-derived inspector rules out of editor.js while
 * leaving DOM rendering and event hookup in the browser shell for now.
 */

export interface InspectorSelectionItem {
  id: string;
  type?: string | null;
  parentId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface InspectorSelectionParentLayout {
  layout?: string | null;
  layoutGap?: number | null;
  layoutRowGap?: number | null;
  layoutColGap?: number | null;
}

export interface SelectionActionInfo {
  items: InspectorSelectionItem[];
  hasUnsupported: boolean;
  sameParent: boolean;
  parentId: string | null;
}

export interface MultiSelectionInspectorViewModel {
  selectedCount: number;
  hasUnsupported: boolean;
  sameParent: boolean;
  parentId: string | null;
  inferredGap: number;
  showDistributeControls: boolean;
  showAlignOnlyHint: boolean;
  showStackSpacingHint: boolean;
}

function snapValue(value: number, step: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value / step) * step;
}

export function resolvePrimarySelectedId(
  selectedIds: Iterable<string>,
  preferredId?: string | null,
): string | null {
  const orderedIds = [...selectedIds];
  if (preferredId && orderedIds.includes(preferredId)) return preferredId;
  return orderedIds.at(-1) ?? null;
}

export function createSelectionActionInfo(
  items: Iterable<InspectorSelectionItem>,
  hasUnsupported = false,
): SelectionActionInfo {
  const nextItems = [...items];
  const parentIds = new Set(nextItems.map((item) => item.parentId));
  const onlyParentId = parentIds.size === 1 ? [...parentIds][0] ?? null : null;
  return {
    items: nextItems,
    hasUnsupported,
    sameParent: parentIds.size <= 1,
    parentId: onlyParentId,
  };
}

export function inferSelectionGap(
  info: SelectionActionInfo,
  options: {
    fallbackGap: number;
    parentLayout?: InspectorSelectionParentLayout | null;
    snapStep?: number;
  },
): number {
  const fallbackGap = Math.max(0, options.fallbackGap);
  const snapStep = Math.max(1, options.snapStep ?? 8);
  if (!info.sameParent || info.items.length < 2) {
    return snapValue(fallbackGap, snapStep);
  }

  const parentLayout = options.parentLayout;
  if (parentLayout?.layout === 'vertical') {
    return snapValue(parentLayout.layoutRowGap ?? parentLayout.layoutGap ?? fallbackGap, snapStep);
  }
  if (parentLayout?.layout === 'horizontal') {
    return snapValue(parentLayout.layoutColGap ?? parentLayout.layoutGap ?? fallbackGap, snapStep);
  }

  const byX = [...info.items].sort((a, b) => (a.x - b.x) || (a.y - b.y));
  const byY = [...info.items].sort((a, b) => (a.y - b.y) || (a.x - b.x));
  const xGaps: number[] = [];
  const yGaps: number[] = [];

  for (let i = 1; i < byX.length; i += 1) {
    const currentX = byX[i];
    const previousX = byX[i - 1];
    const currentY = byY[i];
    const previousY = byY[i - 1];
    if (!currentX || !previousX || !currentY || !previousY) continue;
    xGaps.push(currentX.x - (previousX.x + previousX.width));
    yGaps.push(currentY.y - (previousY.y + previousY.height));
  }

  const nonNegativeX = xGaps.filter((gap) => gap >= 0);
  const nonNegativeY = yGaps.filter((gap) => gap >= 0);
  const candidate = nonNegativeX.length >= nonNegativeY.length ? nonNegativeX[0] : nonNegativeY[0];
  return snapValue(candidate != null ? candidate : fallbackGap, snapStep);
}

export function createMultiSelectionInspectorViewModel(options: {
  selectedCount: number;
  info: SelectionActionInfo;
  fallbackGap: number;
  parentLayout?: InspectorSelectionParentLayout | null;
  snapStep?: number;
}): MultiSelectionInspectorViewModel {
  const inferredGap = inferSelectionGap(options.info, {
    fallbackGap: options.fallbackGap,
    parentLayout: options.parentLayout,
    snapStep: options.snapStep,
  });

  return {
    selectedCount: options.selectedCount,
    hasUnsupported: options.info.hasUnsupported,
    sameParent: options.info.sameParent,
    parentId: options.info.parentId,
    inferredGap,
    showDistributeControls: options.info.sameParent,
    showAlignOnlyHint: !options.info.sameParent,
    showStackSpacingHint: Boolean(
      options.info.sameParent && options.info.parentId && options.parentLayout?.layout,
    ),
  };
}
