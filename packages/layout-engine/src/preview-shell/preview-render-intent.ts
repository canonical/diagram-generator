import {
  normalizePreviewWorkspaceEngineId,
  resolveActivePreviewLayoutEngine,
} from './preview-engine-workspace.js';

export interface PreviewRenderIntent {
  readonly engineId: string | null;
  readonly pageDirection: string | null;
  readonly frameOverrides: Readonly<Record<string, unknown>>;
  readonly engineOverrides: Readonly<Record<string, unknown>>;
  readonly gridOverrides: Readonly<Record<string, unknown>>;
}

export interface PreviewRenderIntentFrameTree {
  layoutEngine?: string | null;
  root?: {
    id?: string | null;
    direction?: string | null;
  } | null;
}

export interface CreatePreviewRenderIntentOptions {
  readonly current?: PreviewRenderIntent | null;
  readonly activeEngineId?: string | null;
  readonly frameTreeJson?: PreviewRenderIntentFrameTree | null;
  readonly layoutEngine?: string | null;
  readonly persistedEngineId?: string | null;
  readonly fallbackEngineId?: string | null;
  readonly pageDirection?: string | null;
  readonly frameOverrides?: Record<string, unknown> | null;
  readonly engineOverrides?: Record<string, unknown> | null;
  readonly gridOverrides?: Record<string, unknown> | null;
}

export interface ResolvePreviewRenderIntentLayoutEngineOptions {
  readonly intent?: PreviewRenderIntent | null;
  readonly activeEngineId?: string | null;
  readonly frameTreeJson?: PreviewRenderIntentFrameTree | null;
  readonly layoutEngine?: string | null;
  readonly persistedEngineId?: string | null;
  readonly fallbackEngineId?: string | null;
}

export interface PreviewRenderIntentWindowLike {
  __DG_previewRenderIntent?: PreviewRenderIntent | null;
  __DG_CONFIG?: {
    active_engine_id?: string | null;
    layout_engine?: string | null;
    persisted_layout_engine?: string | null;
  } | null;
}

function cloneRecord(value: Readonly<Record<string, unknown>> | null | undefined): Record<string, unknown> {
  return value ? { ...value } : {};
}

function normalizePageDirection(value: string | null | undefined): string | null {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (normalized === 'HORIZONTAL' || normalized === 'VERTICAL') {
    return normalized;
  }
  return normalized.length > 0 ? normalized : null;
}

function readRootFrameOverrideDirection(
  frameTreeJson: PreviewRenderIntentFrameTree | null | undefined,
  frameOverrides: Record<string, unknown>,
): string | null {
  const rootId = typeof frameTreeJson?.root?.id === 'string' && frameTreeJson.root.id.trim()
    ? frameTreeJson.root.id
    : 'root';
  const rootOverride = frameOverrides[rootId];
  if (rootOverride && typeof rootOverride === 'object' && !Array.isArray(rootOverride)) {
    return normalizePageDirection((rootOverride as { direction?: string | null }).direction);
  }
  return null;
}

export function createPreviewRenderIntent(
  options: CreatePreviewRenderIntentOptions,
): PreviewRenderIntent {
  const frameOverrides = options.frameOverrides != null
    ? cloneRecord(options.frameOverrides)
    : cloneRecord(options.current?.frameOverrides);
  const engineOverrides = options.engineOverrides != null
    ? cloneRecord(options.engineOverrides)
    : cloneRecord(options.current?.engineOverrides);
  const gridOverrides = options.gridOverrides != null
    ? cloneRecord(options.gridOverrides)
    : cloneRecord(options.current?.gridOverrides);
  const engineId = resolvePreviewRenderIntentLayoutEngine({
    intent: options.current,
    activeEngineId: options.activeEngineId,
    frameTreeJson: options.frameTreeJson,
    layoutEngine: options.layoutEngine,
    persistedEngineId: options.persistedEngineId,
    fallbackEngineId: options.fallbackEngineId,
  });
  const pageDirection = normalizePageDirection(options.pageDirection)
    ?? readRootFrameOverrideDirection(options.frameTreeJson, frameOverrides)
    ?? normalizePageDirection(options.frameTreeJson?.root?.direction)
    ?? options.current?.pageDirection
    ?? null;
  return {
    engineId,
    pageDirection,
    frameOverrides,
    engineOverrides,
    gridOverrides,
  };
}

export function resolvePreviewRenderIntentLayoutEngine(
  options: ResolvePreviewRenderIntentLayoutEngineOptions,
): string | null {
  return normalizePreviewWorkspaceEngineId(options.activeEngineId)
    ?? resolveActivePreviewLayoutEngine({
      frameTreeJson: options.frameTreeJson,
      layoutEngine: options.layoutEngine,
      persistedEngineId: options.persistedEngineId,
      fallbackEngineId: options.fallbackEngineId,
    })
    ?? normalizePreviewWorkspaceEngineId(options.intent?.engineId);
}

export function applyPreviewRenderIntentToFrameTreeJson(
  frameTreeJson: Record<string, unknown> | null | undefined,
  intent: PreviewRenderIntent | null | undefined,
): void {
  if (!frameTreeJson || !intent) {
    return;
  }
  if (intent.engineId) {
    frameTreeJson.layoutEngine = intent.engineId;
  }
  const root = frameTreeJson.root;
  if (
    intent.pageDirection
    && root
    && typeof root === 'object'
    && !Array.isArray(root)
  ) {
    (root as { direction?: string }).direction = intent.pageDirection;
  }
}
