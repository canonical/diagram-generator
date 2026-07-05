import type { PreviewEngineManifest } from '../preview-engine/types.js';
import { FRAME_PREVIEW_SHELL_MODE } from '../preview-engine/shell-mode.js';

export type PreviewEngineWorkspaceEngine = Pick<
  PreviewEngineManifest,
  'id' | 'label' | 'layoutEngineKey' | 'shellMode' | 'capabilities' | 'hostView'
>;

export interface PreviewEngineWorkspaceTab<TSession = unknown> {
  readonly index: number;
  readonly engineId: string;
  readonly engine: PreviewEngineWorkspaceEngine;
  readonly active: boolean;
  readonly persisted: boolean;
  readonly sessionState: TSession | null;
}

export interface PreviewEngineWorkspaceNavigation {
  readonly activeIndex: number;
  readonly total: number;
  readonly hasPrev: boolean;
  readonly hasNext: boolean;
  readonly prevEngineId: string | null;
  readonly nextEngineId: string | null;
}

export interface PreviewEngineWorkspaceState<TSession = unknown> {
  readonly activeEngineId: string | null;
  readonly activeEngine: PreviewEngineWorkspaceEngine | null;
  readonly persistedEngineId: string | null;
  readonly invalidPersistedEngine: boolean;
  readonly compatibleEngineIds: readonly string[];
  readonly compatibleEngines: readonly PreviewEngineWorkspaceEngine[];
  readonly sessionStateByEngine: Readonly<Record<string, TSession>>;
  readonly tabs: readonly PreviewEngineWorkspaceTab<TSession>[];
  readonly navigation: PreviewEngineWorkspaceNavigation;
}

export interface CreatePreviewEngineWorkspaceStateOptions<TSession = unknown> {
  readonly activeEngine?: PreviewEngineWorkspaceEngine | null;
  readonly activeEngineId?: string | null;
  readonly compatibleEngines?: readonly PreviewEngineWorkspaceEngine[] | null;
  readonly compatibleEngineIds?: readonly string[] | null;
  readonly getEngineById?: ((engineId: string) => PreviewEngineWorkspaceEngine | null | undefined) | null;
  readonly persistedEngineId?: string | null;
  readonly sessionStateByEngine?: Readonly<Record<string, TSession>> | null;
}

export interface ResolveActivePreviewLayoutEngineOptions {
  readonly activeEngineId?: string | null;
  readonly frameTreeJson?: { layoutEngine?: string | null } | null | undefined;
  readonly layoutEngine?: string | null;
  readonly persistedEngineId?: string | null;
  readonly fallbackEngineId?: string | null;
}

export function normalizePreviewWorkspaceEngineId(value: string | null | undefined): string | null {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized.length > 0 ? normalized : null;
}

export function resolveActivePreviewLayoutEngine(
  options: ResolveActivePreviewLayoutEngineOptions,
): string | null {
  return normalizePreviewWorkspaceEngineId(options.activeEngineId)
    ?? normalizePreviewWorkspaceEngineId(options.frameTreeJson?.layoutEngine)
    ?? normalizePreviewWorkspaceEngineId(options.layoutEngine)
    ?? normalizePreviewWorkspaceEngineId(options.persistedEngineId)
    ?? normalizePreviewWorkspaceEngineId(options.fallbackEngineId);
}

function normalizeEngineId(value: string | null | undefined): string | null {
  return normalizePreviewWorkspaceEngineId(value);
}

function workspaceEngineId(engine: PreviewEngineWorkspaceEngine | null | undefined): string | null {
  return normalizeEngineId(engine?.layoutEngineKey) ?? normalizeEngineId(engine?.id);
}

function createFallbackWorkspaceEngine(engineId: string): PreviewEngineWorkspaceEngine {
  return {
    id: engineId,
    label: engineId,
    layoutEngineKey: engineId,
    shellMode: FRAME_PREVIEW_SHELL_MODE,
    capabilities: {
      layoutControls: false,
      localRelayout: false,
      serverRelayout: false,
      engineBackedSave: false,
      nodeInspector: false,
      gridEditing: false,
      referenceImage: false,
      simulationControls: false,
      rawDebugView: false,
    },
    hostView: {
      sidebarSections: [],
    },
  };
}

function cloneSessionStateByEngine<TSession>(
  value: Readonly<Record<string, TSession>> | null | undefined,
): Record<string, TSession> {
  return value ? { ...value } : {};
}

function resolveCompatibleEngines(
  options: CreatePreviewEngineWorkspaceStateOptions,
): PreviewEngineWorkspaceEngine[] {
  const compatible = new Map<string, PreviewEngineWorkspaceEngine>();

  for (const engine of options.compatibleEngines ?? []) {
    const engineId = workspaceEngineId(engine);
    if (!engineId || compatible.has(engineId)) {
      continue;
    }
    compatible.set(engineId, engine);
  }

  for (const engineIdValue of options.compatibleEngineIds ?? []) {
    const engineId = normalizeEngineId(engineIdValue);
    if (!engineId || compatible.has(engineId)) {
      continue;
    }
    const resolved = options.getEngineById?.(engineId) ?? null;
    compatible.set(engineId, resolved ?? createFallbackWorkspaceEngine(engineId));
  }

  return [...compatible.values()];
}

function resolveActiveEngineId(
  compatibleEngineIds: readonly string[],
  options: CreatePreviewEngineWorkspaceStateOptions,
): string | null {
  const compatible = new Set(compatibleEngineIds);
  const explicitActiveId = workspaceEngineId(options.activeEngine)
    ?? normalizeEngineId(options.activeEngineId);
  if (explicitActiveId && compatible.has(explicitActiveId)) {
    return explicitActiveId;
  }

  const persistedEngineId = normalizeEngineId(options.persistedEngineId);
  if (persistedEngineId && compatible.has(persistedEngineId)) {
    return persistedEngineId;
  }

  return compatibleEngineIds[0] ?? null;
}

function resolveNavigation(
  compatibleEngineIds: readonly string[],
  activeEngineId: string | null,
): PreviewEngineWorkspaceNavigation {
  const activeIndex = activeEngineId ? compatibleEngineIds.indexOf(activeEngineId) : -1;
  const prevEngineId = activeIndex > 0 ? compatibleEngineIds[activeIndex - 1] ?? null : null;
  const nextEngineId = activeIndex >= 0 && activeIndex < compatibleEngineIds.length - 1
    ? compatibleEngineIds[activeIndex + 1] ?? null
    : null;
  return {
    activeIndex,
    total: compatibleEngineIds.length,
    hasPrev: prevEngineId != null,
    hasNext: nextEngineId != null,
    prevEngineId,
    nextEngineId,
  };
}

export function createPreviewEngineWorkspaceState<TSession = unknown>(
  options: CreatePreviewEngineWorkspaceStateOptions<TSession>,
): PreviewEngineWorkspaceState<TSession> {
  const compatibleEngines = resolveCompatibleEngines(options);
  const compatibleWorkspaceIds = compatibleEngines
    .map((engine) => workspaceEngineId(engine))
    .filter((engineId): engineId is string => Boolean(engineId));
  const persistedEngineId = normalizeEngineId(options.persistedEngineId);
  const invalidPersistedEngine = Boolean(
    persistedEngineId && !compatibleWorkspaceIds.includes(persistedEngineId),
  );
  const activeEngineId = resolveActiveEngineId(compatibleWorkspaceIds, options);
  const activeEngine = activeEngineId
    ? compatibleEngines.find((engine) => workspaceEngineId(engine) === activeEngineId) ?? null
    : null;
  const sessionStateByEngine = cloneSessionStateByEngine(options.sessionStateByEngine);
  const tabs = compatibleEngines.map((engine, index) => ({
    index,
    engineId: workspaceEngineId(engine) ?? engine.id,
    engine,
    active: workspaceEngineId(engine) === activeEngineId,
    persisted: workspaceEngineId(engine) === persistedEngineId,
    sessionState: sessionStateByEngine[workspaceEngineId(engine) ?? engine.id] ?? null,
  }));

  return {
    activeEngineId,
    activeEngine,
    persistedEngineId,
    invalidPersistedEngine,
    compatibleEngineIds: compatibleWorkspaceIds,
    compatibleEngines,
    sessionStateByEngine,
    tabs,
    navigation: resolveNavigation(compatibleWorkspaceIds, activeEngineId),
  };
}

function requireCompatibleWorkspaceEngine(
  state: PreviewEngineWorkspaceState,
  engineId: string,
): void {
  const normalized = normalizeEngineId(engineId);
  if (!normalized || !state.compatibleEngineIds.includes(normalized)) {
    throw new Error(`Unknown compatible preview workspace engine '${engineId}'`);
  }
}

export function setPreviewEngineWorkspaceActiveEngine<TSession = unknown>(
  state: PreviewEngineWorkspaceState<TSession>,
  engineId: string,
): PreviewEngineWorkspaceState<TSession> {
  requireCompatibleWorkspaceEngine(state, engineId);
  return createPreviewEngineWorkspaceState({
    activeEngineId: engineId,
    compatibleEngines: state.compatibleEngines,
    persistedEngineId: state.persistedEngineId,
    sessionStateByEngine: state.sessionStateByEngine,
  });
}

export function setPreviewEngineWorkspaceSessionState<TSession = unknown>(
  state: PreviewEngineWorkspaceState<TSession>,
  engineId: string,
  sessionState: TSession,
): PreviewEngineWorkspaceState<TSession> {
  requireCompatibleWorkspaceEngine(state, engineId);
  return createPreviewEngineWorkspaceState({
    activeEngineId: state.activeEngineId,
    compatibleEngines: state.compatibleEngines,
    persistedEngineId: state.persistedEngineId,
    sessionStateByEngine: {
      ...state.sessionStateByEngine,
      [engineId]: sessionState,
    },
  });
}

export function clearPreviewEngineWorkspaceSessionState<TSession = unknown>(
  state: PreviewEngineWorkspaceState<TSession>,
  engineId: string,
): PreviewEngineWorkspaceState<TSession> {
  requireCompatibleWorkspaceEngine(state, engineId);
  const nextSessionStateByEngine = { ...state.sessionStateByEngine };
  delete nextSessionStateByEngine[engineId];
  return createPreviewEngineWorkspaceState({
    activeEngineId: state.activeEngineId,
    compatibleEngines: state.compatibleEngines,
    persistedEngineId: state.persistedEngineId,
    sessionStateByEngine: nextSessionStateByEngine,
  });
}

export function reopenPreviewEngineWorkspace<TSession = unknown>(
  state: PreviewEngineWorkspaceState<TSession>,
): PreviewEngineWorkspaceState<TSession> {
  return createPreviewEngineWorkspaceState({
    activeEngineId: state.persistedEngineId ?? state.activeEngineId,
    compatibleEngines: state.compatibleEngines,
    persistedEngineId: state.persistedEngineId,
    sessionStateByEngine: state.sessionStateByEngine,
  });
}

export function persistPreviewEngineWorkspaceActiveEngine<TSession = unknown>(
  state: PreviewEngineWorkspaceState<TSession>,
): PreviewEngineWorkspaceState<TSession> {
  return createPreviewEngineWorkspaceState({
    activeEngineId: state.activeEngineId,
    compatibleEngines: state.compatibleEngines,
    persistedEngineId: state.activeEngineId,
    sessionStateByEngine: state.sessionStateByEngine,
  });
}
