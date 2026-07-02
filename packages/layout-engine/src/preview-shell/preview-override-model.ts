import { isPreviewArrowComponentId } from '../preview-arrow-component-ids.js';
import {
  hasPreviewRerouteInvalidationFrameOverride,
  PERSIST_ARROW_KEYS,
  PERSIST_FRAME_KEYS,
  UNSUPPORTED_PERSIST_FRAME_KEYS,
} from './frame-override-manifest.js';
import {
  DEFAULT_FRAME_YAML_ENGINE_LAYOUT_NAMESPACE,
  filterSupportedFrameYamlEngineLayoutOverrides,
  resolveFrameYamlEngineLayoutCandidateId,
  resolveFrameYamlEngineLayoutNamespaceForOverrides,
} from './frame-yaml-engine-layout-contract.js';
import {
  collectNamespacedLayoutOperatorOverrides,
  persistNodeNamespaceForLayoutOperatorNamespace,
  pruneSessionBucketForManifest,
  readActiveLayoutOperatorOverrideBucket,
  readLayoutOperatorOverrideState,
  resolveActiveLayoutOperatorManifest,
  type LayoutOperatorOverrideState,
} from './layout-operator-overrides.js';
import type { PreviewInterpreterNodeRegistry } from './preview-interpreter-node.js';
import { getPreviewEngineByLayoutKey } from '../preview-engine/registry.js';

export interface PreviewOverrideModelNode {
  type?: string | null;
  data?: Record<string, unknown> | null;
  ancestorIds?: readonly string[] | null;
}

export interface PreviewOverrideModelLike {
  overrides?: Record<string, unknown> | null;
  gridOverrides?: Record<string, unknown> | null;
  layoutOverrides?: Record<string, unknown> | null;
  layoutOverrideNamespace?: string | null;
  layoutOperatorOverrides?: LayoutOperatorOverrideState | null;
  previewInterpreterNodeRegistry?: PreviewInterpreterNodeRegistry<Record<string, unknown>> | null;
  removedIds?: Iterable<string> | null;
  allIds?: Iterable<string> | null;
  get?: ((id: string) => PreviewOverrideModelNode | null | undefined) | null;
}

export interface PreviewOverridePayload extends Record<string, unknown> {
  overrides: Record<string, unknown>;
  format_version: 1;
  removed_ids?: string[];
  grid_overrides?: Record<string, unknown>;
  engine_layout_overrides?: Record<string, Record<string, unknown>>;
}

const NON_PERSISTABLE_GRID_KEYS = new Set<string>([
  'rows',
  'slack_absorption',
]);
const PERSISTABLE_ARROW_KEYS = new Set<string>(PERSIST_ARROW_KEYS);
const PERSISTABLE_FRAME_KEYS = new Set<string>([
  ...PERSIST_FRAME_KEYS,
  ...UNSUPPORTED_PERSIST_FRAME_KEYS.filter((key) => !PERSISTABLE_ARROW_KEYS.has(key)),
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numericValue(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function roundPersistedValue(value: number): number {
  return Math.round(value);
}

function cloneRecord(value: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!isRecord(value)) {
    return null;
  }
  return Object.keys(value).length > 0 ? { ...value } : null;
}

function syntheticComponentId(componentId: string): boolean {
  return componentId === '__body'
    || componentId.endsWith('__body')
    || componentId === '__heading'
    || componentId.endsWith('__heading');
}

function previewArrowComponent(
  componentId: string,
  node: PreviewOverrideModelNode | null | undefined,
): boolean {
  return node?.type === 'arrow' || isPreviewArrowComponentId(componentId);
}

function canonicalizeFrameOverrideEntry(
  override: Record<string, unknown>,
  node: PreviewOverrideModelNode | null | undefined,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...override };
  const nodeData = isRecord(node?.data) ? node.data : {};

  const dx = numericValue(override.dx) ?? 0;
  const dy = numericValue(override.dy) ?? 0;
  const dw = numericValue(override.dw) ?? 0;
  const dh = numericValue(override.dh) ?? 0;

  if (dx !== 0 || dy !== 0) {
    const baseX = numericValue(override.x) ?? numericValue(nodeData.authored_x) ?? numericValue(nodeData.x);
    const baseY = numericValue(override.y) ?? numericValue(nodeData.authored_y) ?? numericValue(nodeData.y);
    if (baseX != null && baseY != null) {
      normalized.position = 'ABSOLUTE';
      normalized.x = roundPersistedValue(baseX + dx);
      normalized.y = roundPersistedValue(baseY + dy);
      delete normalized.dx;
      delete normalized.dy;
    }
  } else {
    delete normalized.dx;
    delete normalized.dy;
  }

  if (dw !== 0) {
    const baseWidth = numericValue(override.width) ?? numericValue(nodeData.width);
    if (baseWidth != null) {
      normalized.width = roundPersistedValue(baseWidth + dw);
      normalized.sizing_w = 'FIXED';
      delete normalized.dw;
    }
  } else {
    delete normalized.dw;
  }

  if (dh !== 0) {
    const baseHeight = numericValue(override.height) ?? numericValue(nodeData.height);
    if (baseHeight != null) {
      normalized.height = roundPersistedValue(baseHeight + dh);
      normalized.sizing_h = 'FIXED';
      delete normalized.dh;
    }
  } else {
    delete normalized.dh;
  }

  return normalized;
}

function filterOverrideEntry(
  componentId: string,
  override: unknown,
  model: PreviewOverrideModelLike | null | undefined,
): Record<string, unknown> | null {
  if (!isRecord(override)) {
    return null;
  }

  const node = model?.get?.(componentId) ?? null;
  const isArrowOverride = previewArrowComponent(componentId, node);
  const allowedKeys = isArrowOverride ? PERSISTABLE_ARROW_KEYS : PERSISTABLE_FRAME_KEYS;
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(override)) {
    if (allowedKeys.has(key)) {
      filtered[key] = value;
    }
  }
  const normalized = isArrowOverride
    ? filtered
    : canonicalizeFrameOverrideEntry(filtered, node);
  return Object.keys(normalized).length > 0 ? normalized : null;
}

function collectPersistableOverrides(
  model: PreviewOverrideModelLike | null | undefined,
): Record<string, unknown> {
  const overrides = isRecord(model?.overrides) ? model!.overrides! : null;
  if (!overrides) {
    return {};
  }

  const persisted: Record<string, unknown> = {};
  for (const [componentId, override] of Object.entries(overrides)) {
    if (syntheticComponentId(componentId)) {
      continue;
    }
    const filtered = filterOverrideEntry(componentId, override, model);
    if (filtered) {
      persisted[componentId] = filtered;
    }
  }
  return persisted;
}

function hasPendingArrowRerouteInvalidation(
  model: PreviewOverrideModelLike | null | undefined,
): boolean {
  const overrides = isRecord(model?.overrides) ? model!.overrides! : null;
  if (!overrides) {
    return false;
  }
  for (const [componentId, override] of Object.entries(overrides)) {
    const node = model?.get?.(componentId) ?? null;
    if (previewArrowComponent(componentId, node)) {
      continue;
    }
    if (isRecord(override) && hasPreviewRerouteInvalidationFrameOverride(override)) {
      return true;
    }
  }
  return false;
}

function applyPendingArrowRerouteWaypointClears(
  model: PreviewOverrideModelLike | null | undefined,
  persisted: Record<string, unknown>,
): void {
  if (!hasPendingArrowRerouteInvalidation(model)) {
    return;
  }
  const allIds = model?.allIds ? [...model.allIds] : [];
  for (const componentId of allIds) {
    if (typeof componentId !== 'string' || componentId.length === 0) {
      continue;
    }
    const node = model?.get?.(componentId) ?? null;
    if (!previewArrowComponent(componentId, node)) {
      continue;
    }
    const existing = isRecord(persisted[componentId]) ? persisted[componentId] : null;
    const authoredWaypoints = Array.isArray(node?.data?.authoredWaypoints)
      ? node.data.authoredWaypoints
      : [];
    if (!existing && authoredWaypoints.length === 0) {
      continue;
    }
    persisted[componentId] = {
      ...(existing || {}),
      waypoints: [],
    };
  }
}

function readPreviewPersistedLayoutOverrides(
  model: PreviewOverrideModelLike | null | undefined,
): Record<string, Record<string, unknown>> | null {
  const registry = model?.previewInterpreterNodeRegistry ?? null;
  const nodeNamespacedOverrides: Record<string, Record<string, unknown>> = {};
  for (const node of registry?.nodes ?? []) {
    const bucket = pruneSessionBucketForManifest(
      node.manifest,
      registry?.paramsByNodeId?.[node.nodeId] ?? node.params ?? {},
      { persistNamespace: model?.layoutOverrideNamespace ?? null },
    );
    if (Object.keys(bucket).length === 0) {
      continue;
    }
    const baseNamespace = node.manifest.controlSpecs.find(
      (spec) => typeof spec.persistNamespace === 'string' && spec.persistNamespace.trim().length > 0,
    )?.persistNamespace ?? null;
    const nodeNamespace = persistNodeNamespaceForLayoutOperatorNamespace(baseNamespace);
    if (!nodeNamespace) {
      continue;
    }
    nodeNamespacedOverrides[nodeNamespace] = nodeNamespacedOverrides[nodeNamespace] ?? {};
    nodeNamespacedOverrides[nodeNamespace]![node.nodeId] = bucket;
  }

  const layoutOverrides = cloneRecord(model?.layoutOverrides);
  const activeOperatorOverrides = cloneRecord(readActiveLayoutOperatorOverrideBucket(model));
  const rawLayoutOverrides = layoutOverrides ?? activeOperatorOverrides;
  if (!rawLayoutOverrides) {
    return Object.keys(nodeNamespacedOverrides).length > 0
      ? nodeNamespacedOverrides
      : null;
  }

  const activeManifest = resolveActiveLayoutOperatorManifest(model);
  if (activeManifest) {
    const namespacedOverrides = collectNamespacedLayoutOperatorOverrides({
      manifest: activeManifest,
      sessionState: readLayoutOperatorOverrideState(model),
      sessionOverrides: activeOperatorOverrides,
      persistNamespace: model?.layoutOverrideNamespace,
    });
    const populatedEntries = Object.entries(namespacedOverrides)
      .filter(([, overrides]) => Object.keys(overrides).length > 0);
    if (populatedEntries.length === 0) {
      return Object.keys(nodeNamespacedOverrides).length > 0
        ? nodeNamespacedOverrides
        : null;
    }
    return {
      ...Object.fromEntries(populatedEntries),
      ...nodeNamespacedOverrides,
    };
  }

  const namespace = resolveFrameYamlEngineLayoutNamespaceForOverrides(
    rawLayoutOverrides,
    model?.layoutOverrideNamespace,
  );
  const candidateLayoutEngine = resolveFrameYamlEngineLayoutCandidateId(
    namespace,
    rawLayoutOverrides,
    null,
  );
  const candidateManifest = candidateLayoutEngine
    ? getPreviewEngineByLayoutKey(candidateLayoutEngine) ?? null
    : null;
  if (candidateManifest) {
    const namespacedOverrides = collectNamespacedLayoutOperatorOverrides({
      manifest: candidateManifest,
      sessionOverrides: rawLayoutOverrides,
      persistNamespace: namespace,
    });
    const populatedEntries = Object.entries(namespacedOverrides)
      .filter(([, overrides]) => Object.keys(overrides).length > 0);
    if (populatedEntries.length > 0) {
      return {
        ...Object.fromEntries(populatedEntries),
        ...nodeNamespacedOverrides,
      };
    }
  }

  const overrides = filterSupportedFrameYamlEngineLayoutOverrides(namespace, rawLayoutOverrides);
  if (Object.keys(overrides).length === 0) {
    return Object.keys(nodeNamespacedOverrides).length > 0
      ? nodeNamespacedOverrides
      : null;
  }
  return {
    [namespace]: overrides,
    ...nodeNamespacedOverrides,
  };
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
  const overrides = collectPersistableOverrides(model);
  applyPendingArrowRerouteWaypointClears(model, overrides);
  const payload: PreviewOverridePayload = {
    overrides,
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

  const layoutOverrideState = readPreviewPersistedLayoutOverrides(model);
  if (layoutOverrideState) {
    payload.engine_layout_overrides = layoutOverrideState;
  }

  return payload;
}
