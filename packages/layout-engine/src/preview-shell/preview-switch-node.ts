import {
  applyPreviewRenderIntentToFrameTreeJson,
  createPreviewRenderIntent,
  type CreatePreviewRenderIntentOptions,
  type PreviewRenderIntent,
  type PreviewRenderIntentFrameTree,
} from './preview-render-intent.js';

export interface PreviewSwitchNodeCookEntry<TCook = unknown> {
  readonly cookKey: string;
  readonly cooked: TCook;
}

export interface PreviewSwitchNodeState<TCook = unknown> {
  readonly activeNodeId: string | null;
  readonly cookedByNodeId: Readonly<Record<string, PreviewSwitchNodeCookEntry<TCook>>>;
  readonly dirtyNodeIds: readonly string[];
}

export interface CreatePreviewSwitchNodeStateOptions<TCook = unknown> {
  readonly activeNodeId?: string | null;
  readonly cookedByNodeId?: Readonly<Record<string, PreviewSwitchNodeCookEntry<TCook>>> | null;
  readonly dirtyNodeIds?: readonly string[] | null;
}

export interface PreviewSwitchNodeCookOptions<TCook = unknown> {
  readonly nodeId: string;
  readonly cookKey: string;
  readonly cook: () => Promise<TCook> | TCook;
}

export interface PreviewSwitchNodeCookResult<TCook = unknown> {
  readonly state: PreviewSwitchNodeState<TCook>;
  readonly cooked: TCook;
  readonly didCook: boolean;
}

export interface PreviewSwitchNodeWindowLike {
  __DG_previewRenderIntent?: PreviewRenderIntent | null;
  __DG_CONFIG?: object | null;
  getFrameTreeJson?: (() => unknown) | null;
  setFrameTreeLayoutEngine?: ((layoutEngine: string | null | undefined) => string | null) | null;
  __DG_previewBridgeHostRuntime?: {
    getFrameTreeJson?: (() => unknown) | null;
    setFrameTreeLayoutEngine?: ((layoutEngine: string | null | undefined) => string | null) | null;
  } | null;
}

function normalizeNodeId(value: string | null | undefined): string | null {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized.length > 0 ? normalized : null;
}

function normalizeDirtyNodeIds(value: readonly string[] | null | undefined): string[] {
  const ids = new Set<string>();
  for (const entry of value ?? []) {
    const normalized = normalizeNodeId(entry);
    if (normalized) {
      ids.add(normalized);
    }
  }
  return [...ids];
}

function normalizeCookedByNodeId<TCook>(
  value: Readonly<Record<string, PreviewSwitchNodeCookEntry<TCook>>> | null | undefined,
): Record<string, PreviewSwitchNodeCookEntry<TCook>> {
  const normalized: Record<string, PreviewSwitchNodeCookEntry<TCook>> = {};
  for (const [nodeId, entry] of Object.entries(value ?? {})) {
    const normalizedNodeId = normalizeNodeId(nodeId);
    const cookKey = typeof entry?.cookKey === 'string' ? entry.cookKey : '';
    if (!normalizedNodeId || cookKey.length === 0) {
      continue;
    }
    normalized[normalizedNodeId] = {
      cookKey,
      cooked: entry.cooked,
    };
  }
  return normalized;
}

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) {
    return JSON.stringify(value);
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(',')}]`;
  }
  if (value instanceof Set) {
    return stableSerialize([...value].sort());
  }
  if (value instanceof Map) {
    return stableSerialize(
      [...value.entries()]
        .sort(([left], [right]) => String(left).localeCompare(String(right)))
        .map(([key, entryValue]) => ({ key, value: entryValue })),
    );
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(String(value));
}

export function createPreviewSwitchNodeCookKey(value: unknown): string {
  return stableSerialize(value);
}

export function createPreviewSwitchNodeState<TCook = unknown>(
  options: CreatePreviewSwitchNodeStateOptions<TCook> = {},
): PreviewSwitchNodeState<TCook> {
  return {
    activeNodeId: normalizeNodeId(options.activeNodeId) ?? null,
    cookedByNodeId: normalizeCookedByNodeId(options.cookedByNodeId),
    dirtyNodeIds: normalizeDirtyNodeIds(options.dirtyNodeIds),
  };
}

export function selectPreviewSwitchNode<TCook = unknown>(
  state: PreviewSwitchNodeState<TCook>,
  nodeId: string | null | undefined,
): PreviewSwitchNodeState<TCook> {
  return createPreviewSwitchNodeState({
    activeNodeId: nodeId,
    cookedByNodeId: state.cookedByNodeId,
    dirtyNodeIds: state.dirtyNodeIds,
  });
}

export function markPreviewSwitchNodeDirty<TCook = unknown>(
  state: PreviewSwitchNodeState<TCook>,
  nodeIds?: Iterable<string | null | undefined> | null,
): PreviewSwitchNodeState<TCook> {
  const nextDirty = new Set(state.dirtyNodeIds);
  const targets = nodeIds
    ? [...nodeIds]
    : [
      state.activeNodeId,
      ...Object.keys(state.cookedByNodeId),
    ];
  for (const entry of targets) {
    const normalized = normalizeNodeId(entry ?? null);
    if (normalized) {
      nextDirty.add(normalized);
    }
  }
  return createPreviewSwitchNodeState({
    activeNodeId: state.activeNodeId,
    cookedByNodeId: state.cookedByNodeId,
    dirtyNodeIds: [...nextDirty],
  });
}

export function readPreviewSwitchNodeCook<TCook = unknown>(
  state: PreviewSwitchNodeState<TCook>,
  nodeId: string,
  cookKey: string,
): PreviewSwitchNodeCookEntry<TCook> | null {
  const normalizedNodeId = normalizeNodeId(nodeId);
  if (!normalizedNodeId || state.dirtyNodeIds.includes(normalizedNodeId)) {
    return null;
  }
  const entry = state.cookedByNodeId[normalizedNodeId];
  if (!entry || entry.cookKey !== cookKey) {
    return null;
  }
  return entry;
}

export function commitPreviewSwitchNodeCook<TCook = unknown>(
  state: PreviewSwitchNodeState<TCook>,
  nodeId: string,
  cookKey: string,
  cooked: TCook,
): PreviewSwitchNodeState<TCook> {
  const normalizedNodeId = normalizeNodeId(nodeId);
  if (!normalizedNodeId) {
    throw new Error('Preview switch node cook commits require a non-empty node id');
  }
  const nextDirty = state.dirtyNodeIds.filter((entry) => entry !== normalizedNodeId);
  return createPreviewSwitchNodeState({
    activeNodeId: normalizedNodeId,
    cookedByNodeId: {
      ...state.cookedByNodeId,
      [normalizedNodeId]: {
        cookKey,
        cooked,
      },
    },
    dirtyNodeIds: nextDirty,
  });
}

export async function runPreviewSwitchNodeCook<TCook = unknown>(
  state: PreviewSwitchNodeState<TCook>,
  options: PreviewSwitchNodeCookOptions<TCook>,
): Promise<PreviewSwitchNodeCookResult<TCook>> {
  const cached = readPreviewSwitchNodeCook(state, options.nodeId, options.cookKey);
  if (cached) {
    return {
      state: selectPreviewSwitchNode(state, options.nodeId),
      cooked: cached.cooked,
      didCook: false,
    };
  }
  const cooked = await options.cook();
  const nextState = commitPreviewSwitchNodeCook(state, options.nodeId, options.cookKey, cooked);
  return {
    state: nextState,
    cooked,
    didCook: true,
  };
}

export function readPreviewSwitchNodeFrameTree(
  previewWindow: PreviewSwitchNodeWindowLike,
): PreviewRenderIntentFrameTree | null {
  return (
    previewWindow.getFrameTreeJson?.()
    ?? previewWindow.__DG_previewBridgeHostRuntime?.getFrameTreeJson?.()
    ?? null
  ) as PreviewRenderIntentFrameTree | null;
}

export function commitPreviewSwitchNode(
  previewWindow: PreviewSwitchNodeWindowLike,
  options: CreatePreviewRenderIntentOptions,
): PreviewRenderIntent {
  const frameTreeJson = options.frameTreeJson ?? readPreviewSwitchNodeFrameTree(previewWindow);
  const intent = createPreviewRenderIntent({
    ...options,
    current: options.current ?? previewWindow.__DG_previewRenderIntent ?? null,
    frameTreeJson,
  });
  previewWindow.__DG_previewRenderIntent = intent;
  if (frameTreeJson) {
    applyPreviewRenderIntentToFrameTreeJson(
      frameTreeJson as Record<string, unknown>,
      intent,
    );
  }
  const config = (previewWindow.__DG_CONFIG ?? null) as {
    active_engine_id?: string | null;
    layout_engine?: string | null;
    persisted_layout_engine?: string | null;
  } | null;
  if (config) {
    config.active_engine_id = intent.engineId;
    config.layout_engine = intent.engineId ?? config.layout_engine ?? null;
  }
  return intent;
}

export function commitPreviewSwitchNodeLayoutEngine(
  previewWindow: PreviewSwitchNodeWindowLike,
  layoutEngine: string | null | undefined,
  options: Omit<CreatePreviewRenderIntentOptions, 'activeEngineId' | 'frameTreeJson'> = {},
): string | null {
  const setter = previewWindow.setFrameTreeLayoutEngine
    ?? previewWindow.__DG_previewBridgeHostRuntime?.setFrameTreeLayoutEngine
    ?? null;
  const committed = typeof setter === 'function'
    ? setter(layoutEngine)
    : (normalizeNodeId(layoutEngine) ?? null);
  commitPreviewSwitchNode(previewWindow, {
    ...options,
    activeEngineId: committed,
    frameTreeJson: readPreviewSwitchNodeFrameTree(previewWindow),
  });
  return committed;
}
