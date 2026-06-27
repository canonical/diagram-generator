export interface PreviewOverrideModelNode {
  type?: string | null;
  data?: Record<string, unknown> | null;
  ancestorIds?: readonly string[] | null;
}

export interface PreviewOverrideModelLike {
  overrides?: Record<string, unknown> | null;
  gridOverrides?: Record<string, unknown> | null;
  layoutOverrides?: Record<string, unknown> | null;
  elkLayoutOverrides?: Record<string, unknown> | null;
  removedIds?: Iterable<string> | null;
  get?: ((id: string) => PreviewOverrideModelNode | null | undefined) | null;
}

export interface PreviewOverridePayload extends Record<string, unknown> {
  overrides: Record<string, unknown>;
  format_version: 1;
  removed_ids?: string[];
  grid_overrides?: Record<string, unknown>;
  engine_layout_overrides?: Record<string, Record<string, unknown>>;
  elk_layout_overrides?: Record<string, unknown>;
}

const NON_PERSISTABLE_GRID_KEYS = new Set<string>([
  'rows',
  'slack_absorption',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneRecord(value: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!isRecord(value)) {
    return null;
  }
  return Object.keys(value).length > 0 ? { ...value } : null;
}

function readPreviewPersistedLayoutOverrides(
  model: PreviewOverrideModelLike | null | undefined,
): Record<string, unknown> | null {
  const layoutOverrides = cloneRecord(model?.layoutOverrides);
  if (layoutOverrides) {
    return layoutOverrides;
  }
  return cloneRecord(model?.elkLayoutOverrides);
}

function syncPreviewLayoutOverrideAliases(
  model: PreviewOverrideModelLike | null | undefined,
  layoutOverrides: Record<string, unknown> | null,
): void {
  if (!model || !layoutOverrides) {
    return;
  }
  model.layoutOverrides = { ...layoutOverrides };
  model.elkLayoutOverrides = { ...layoutOverrides };
}

export function collectPreviewTopLevelRemovalIds(
  model: PreviewOverrideModelLike | null | undefined,
): string[] {
  const removedIds = model?.removedIds
    ? [...model.removedIds].filter((id): id is string => typeof id === 'string' && id.length > 0)
    : [];
  if (removedIds.length === 0) {
    return [];
  }

  const removed = new Set(removedIds);
  return removedIds.filter((id) => {
    const node = model?.get?.(id) ?? null;
    const ancestors = Array.isArray(node?.ancestorIds) ? node.ancestorIds : [];
    return !ancestors.some((ancestor) => removed.has(ancestor));
  });
}

export function createPreviewOverridePayload(
  model: PreviewOverrideModelLike | null | undefined,
): PreviewOverridePayload {
  const payload: PreviewOverridePayload = {
    overrides: isRecord(model?.overrides) ? { ...model.overrides } : {},
    format_version: 1,
  };

  const removedIds = collectPreviewTopLevelRemovalIds(model);
  if (removedIds.length > 0) {
    payload.removed_ids = removedIds;
  }

  if (isRecord(model?.gridOverrides)) {
    const persistableGridOverrides = { ...model.gridOverrides };
    for (const key of NON_PERSISTABLE_GRID_KEYS) {
      delete persistableGridOverrides[key];
    }
    if (Object.keys(persistableGridOverrides).length > 0) {
      payload.grid_overrides = persistableGridOverrides;
    }
  }

  const layoutOverrides = readPreviewPersistedLayoutOverrides(model);
  syncPreviewLayoutOverrideAliases(model, layoutOverrides);
  if (layoutOverrides) {
    payload.engine_layout_overrides = {
      'meta.elk': { ...layoutOverrides },
    };
    payload.elk_layout_overrides = { ...layoutOverrides };
  }

  return payload;
}
