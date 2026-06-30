/**
 * Serializable editor snapshot helpers for the preview shell (spec 026 T012).
 */

import type { LayoutOperatorOverrideState } from './layout-operator-overrides.js';

export interface EditorSnapshot {
  o: Record<string, unknown>;
  g: Record<string, unknown>;
  e?: Record<string, unknown>;
  ep?: LayoutOperatorOverrideState;
  r?: string[];
  f?: unknown;
}

export interface EditorSnapshotInput {
  overrides: Record<string, unknown>;
  gridOverrides?: Record<string, unknown> | null;
  layoutOverrides?: Record<string, unknown> | null;
  layoutOperatorOverrides?: LayoutOperatorOverrideState | null;
  removedIds?: Iterable<string> | null;
  frameTree?: unknown | null;
}

export function cloneEditorSnapshotValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? ({} as T)));
}

export function normalizeGridOverrides(
  gridOverrides: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  if (!gridOverrides) return next;

  if (Number.isFinite(gridOverrides.cols as number)) next.cols = gridOverrides.cols;
  if (Number.isFinite(gridOverrides.rows as number)) next.rows = gridOverrides.rows;
  if (Number.isFinite(gridOverrides.col_gap as number)) next.col_gap = gridOverrides.col_gap;
  if (Number.isFinite(gridOverrides.row_gap as number)) next.row_gap = gridOverrides.row_gap;
  if (Number.isFinite(gridOverrides.margin_top as number)) next.margin_top = gridOverrides.margin_top;
  if (Number.isFinite(gridOverrides.margin_right as number)) next.margin_right = gridOverrides.margin_right;
  if (Number.isFinite(gridOverrides.margin_bottom as number)) next.margin_bottom = gridOverrides.margin_bottom;
  if (Number.isFinite(gridOverrides.margin_left as number)) next.margin_left = gridOverrides.margin_left;

  if (Number.isFinite(next.margin_top as number)) {
    next.outer_margin = next.margin_top;
  } else if (Number.isFinite(next.col_gap as number)) {
    next.outer_margin = next.col_gap;
  }

  if (typeof gridOverrides.link_to_root === 'boolean') next.link_to_root = gridOverrides.link_to_root;
  if (typeof gridOverrides.slack_absorption === 'boolean') {
    next.slack_absorption = gridOverrides.slack_absorption;
  }

  return next;
}

export function captureEditorSnapshot(input: EditorSnapshotInput): EditorSnapshot {
  const snapshot: EditorSnapshot = {
    o: cloneEditorSnapshotValue(input.overrides),
    g: cloneEditorSnapshotValue(input.gridOverrides || {}),
  };

  if (input.layoutOverrides && Object.keys(input.layoutOverrides).length > 0) {
    snapshot.e = cloneEditorSnapshotValue(input.layoutOverrides);
  }

  if (input.layoutOperatorOverrides) {
    snapshot.ep = cloneEditorSnapshotValue(input.layoutOperatorOverrides);
  }

  if (input.removedIds) {
    const removed = [...input.removedIds];
    if (removed.length > 0) snapshot.r = removed;
  }

  if (input.frameTree != null) snapshot.f = input.frameTree;

  return snapshot;
}

export function serializeEditorSnapshot(snapshot: EditorSnapshot): string {
  return JSON.stringify(snapshot);
}

export function parseEditorSnapshot(serialized: string | null | undefined): EditorSnapshot {
  const parsed = JSON.parse(serialized || '{}') as Partial<EditorSnapshot>;
  return {
    o: cloneEditorSnapshotValue(parsed.o || {}),
    g: cloneEditorSnapshotValue(parsed.g || {}),
    e: parsed.e ? cloneEditorSnapshotValue(parsed.e) : undefined,
    ep: parsed.ep ? cloneEditorSnapshotValue(parsed.ep) : undefined,
    r: Array.isArray(parsed.r) ? [...parsed.r] : undefined,
    f: parsed.f,
  };
}
