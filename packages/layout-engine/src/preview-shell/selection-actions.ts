/**
 * Multi-selection action helpers (spec 043 slice N).
 *
 * These helpers own the pure align/distribute target planning and target ->
 * override conversion while the shell still handles model lookups and undo.
 */

export interface SelectionParentBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface SelectionActionPlanItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  baseX: number;
  baseY: number;
  ancestorDx: number;
  ancestorDy: number;
  parentBounds?: SelectionParentBounds | null;
}

export interface SelectionTargetPoint {
  x: number;
  y: number;
}

export interface SelectionTargetOverrideEntry {
  id: string;
  dx: number;
  dy: number;
}

export type SelectionDistributeAxis = 'x' | 'y';
export type SelectionAlignMode =
  | 'left'
  | 'center'
  | 'right'
  | 'top'
  | 'middle'
  | 'bottom';

function snapValue(value: number, step: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value / step) * step;
}

export function normalizeSelectionGap(value: number, snapStep = 8): number {
  return Math.max(0, snapValue(value, Math.max(1, snapStep)));
}

export function clampSelectionTarget(
  item: SelectionActionPlanItem,
  targetX: number,
  targetY: number,
  snapStep = 8,
): SelectionTargetPoint {
  let nextX = snapValue(targetX, Math.max(1, snapStep));
  let nextY = snapValue(targetY, Math.max(1, snapStep));
  const bounds = item.parentBounds;
  if (!bounds) {
    return { x: nextX, y: nextY };
  }

  nextX = snapValue(Math.min(Math.max(nextX, bounds.minX), bounds.maxX), Math.max(1, snapStep));
  nextY = snapValue(Math.min(Math.max(nextY, bounds.minY), bounds.maxY), Math.max(1, snapStep));
  return { x: nextX, y: nextY };
}

export function resolveSelectionDistributeTargets(options: {
  items: SelectionActionPlanItem[];
  axis: SelectionDistributeAxis;
  gap: number;
  snapStep?: number;
}): Record<string, SelectionTargetPoint> {
  const snapStep = Math.max(1, options.snapStep ?? 8);
  const gap = normalizeSelectionGap(options.gap, snapStep);
  const items = [...options.items].sort((a, b) =>
    options.axis === 'x'
      ? ((a.x - b.x) || (a.y - b.y))
      : ((a.y - b.y) || (a.x - b.x)));
  const targets: Record<string, SelectionTargetPoint> = {};
  let cursor = options.axis === 'x' ? (items[0]?.x ?? 0) : (items[0]?.y ?? 0);

  for (const item of items) {
    const target = clampSelectionTarget(
      item,
      options.axis === 'x' ? cursor : item.x,
      options.axis === 'y' ? cursor : item.y,
      snapStep,
    );
    targets[item.id] = target;
    cursor = options.axis === 'x'
      ? (target.x + item.width + gap)
      : (target.y + item.height + gap);
  }

  return targets;
}

export function resolveSelectionAlignTargets(options: {
  items: SelectionActionPlanItem[];
  mode: SelectionAlignMode;
  snapStep?: number;
}): Record<string, SelectionTargetPoint> {
  const snapStep = Math.max(1, options.snapStep ?? 8);
  const left = Math.min(...options.items.map((item) => item.x));
  const top = Math.min(...options.items.map((item) => item.y));
  const right = Math.max(...options.items.map((item) => item.x + item.width));
  const bottom = Math.max(...options.items.map((item) => item.y + item.height));
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;
  const targets: Record<string, SelectionTargetPoint> = {};

  for (const item of options.items) {
    let targetX = item.x;
    let targetY = item.y;
    if (options.mode === 'left') targetX = left;
    if (options.mode === 'center') targetX = centerX - (item.width / 2);
    if (options.mode === 'right') targetX = right - item.width;
    if (options.mode === 'top') targetY = top;
    if (options.mode === 'middle') targetY = centerY - (item.height / 2);
    if (options.mode === 'bottom') targetY = bottom - item.height;
    targets[item.id] = clampSelectionTarget(item, targetX, targetY, snapStep);
  }

  return targets;
}

export function createSelectionTargetOverrideEntries(options: {
  items: SelectionActionPlanItem[];
  targets: Record<string, SelectionTargetPoint>;
  snapStep?: number;
}): SelectionTargetOverrideEntry[] {
  const snapStep = Math.max(1, options.snapStep ?? 8);
  const byId = new Map(options.items.map((item) => [item.id, item]));
  const entries: SelectionTargetOverrideEntry[] = [];

  for (const [id, target] of Object.entries(options.targets)) {
    const item = byId.get(id);
    if (!item) continue;
    entries.push({
      id,
      dx: snapValue(target.x - item.baseX - item.ancestorDx, snapStep),
      dy: snapValue(target.y - item.baseY - item.ancestorDy, snapStep),
    });
  }

  return entries;
}
