import type { PreviewEngineManifest } from './types.js';
import {
  resolvePreviewRenderIntentLayoutEngine,
  type PreviewRenderIntent,
  type PreviewRenderIntentFrameTree,
} from '../preview-shell/preview-render-intent.js';
import {
  writeActiveLayoutOperatorOverrides,
  writeLayoutOperatorOverrideBucketForManifest,
} from '../preview-shell/layout-operator-overrides.js';
import type { LayoutOperatorOverrideState } from '../preview-shell/layout-operator-overrides.js';

export interface PreviewEngineShellControllerDeps {
  getLayoutOverrides?: () => Record<string, unknown>;
  setLayoutOverrides?: (value: Record<string, unknown>) => void;
  getRootId?: () => string;
  requestLayoutRelayout?: (cid: string) => Promise<unknown> | unknown;
}

export interface PreviewEngineShellControllerWindowLike {
  __DG_CONFIG?: { layout_engine?: string };
  __DG_previewRenderIntent?: PreviewRenderIntent | null;
  PreviewEngineLayoutControls?: {
    init?: (options: {
      getOverrides: () => Record<string, unknown>;
      setOverrides: (value: Record<string, unknown>) => void;
    }) => void;
    refresh?: () => void;
    collectOverrides?: () => Record<string, unknown>;
    collectNamespacedOverrides?: () => Record<string, Record<string, unknown>>;
  };
}

export interface PreviewEngineShellControllerDocumentLike {
  getElementById: (id: string) => { hasAttribute: (name: string) => boolean } | null;
}

export interface PreviewEngineShellControllerRuntimeOptions {
  document: PreviewEngineShellControllerDocumentLike;
  previewWindow: PreviewEngineShellControllerWindowLike;
  layoutEngineRoot?: {
    previewEngines?: {
      registry?: {
        resolvePreviewEngine?: (context: { layoutEngine?: string | null; shellMode?: string | null }) => PreviewEngineManifest | null;
      };
    };
    resolvePreviewEngine?: (context: { layoutEngine?: string | null; shellMode?: string | null }) => PreviewEngineManifest | null;
  } | null;
  getFrameTreeJson?: (() => unknown) | null;
  sidebarSectionId?: string;
  defaultPersistNamespace?: string;
  sectionId?: string;
}

export interface PreviewEngineShellControllerRuntime {
  init: (deps: PreviewEngineShellControllerDeps) => void;
  isActiveLayoutEngine: (frameTreeJson?: unknown) => boolean;
  wirePanel: () => void;
  syncPanel: () => void;
  initPanel: () => void;
  initializePanel: () => void;
  getLayoutOverrides: () => Record<string, unknown>;
  applyLayoutOverrides: (overrides: Record<string, unknown>) => void;
  collectPersistedPayload: (
    basePayload: Record<string, unknown>,
    model?: {
      layoutOverrides?: Record<string, unknown>;
      layoutOverrideNamespace?: string | null;
      layoutOperatorOverrides?: LayoutOperatorOverrideState | null;
    } | null,
  ) => Record<string, unknown>;
  requestRelayout: () => Promise<unknown> | unknown;
}

function engineSupportsSidebarSection(engine: PreviewEngineManifest | null | undefined, section: string): boolean {
  return Boolean(
    engine
    && engine.hostView
    && Array.isArray(engine.hostView.sidebarSections)
    && engine.hostView.sidebarSections.includes(section),
  );
}

function resolvePreviewEngineLayoutControls(
  previewWindow: PreviewEngineShellControllerWindowLike,
): PreviewEngineShellControllerWindowLike['PreviewEngineLayoutControls'] | null {
  return previewWindow.PreviewEngineLayoutControls ?? null;
}

export function createPreviewEngineShellControllerRuntime(
  options: PreviewEngineShellControllerRuntimeOptions,
): PreviewEngineShellControllerRuntime {
  const sidebarSectionId = options.sidebarSectionId ?? 'layout-params';
  const defaultPersistNamespace = options.defaultPersistNamespace ?? 'meta.elk';
  let deps: PreviewEngineShellControllerDeps | null = null;
  let panelWired = false;

  function requireDeps(): PreviewEngineShellControllerDeps {
    if (!deps) {
      throw new Error('PreviewEngineShellController.init() must run before engine shell operations');
    }
    return deps;
  }

  function resolvePreviewEngine(
    context: { layoutEngine?: string | null; shellMode?: string | null },
  ): PreviewEngineManifest | null {
    const registryResolved = options.layoutEngineRoot?.previewEngines?.registry?.resolvePreviewEngine?.(context);
    if (registryResolved) {
      return registryResolved;
    }
    return options.layoutEngineRoot?.resolvePreviewEngine?.(context) ?? null;
  }

  function activePreviewEngine(frameTreeJson?: unknown): PreviewEngineManifest | null {
    const tree = frameTreeJson !== undefined
      ? frameTreeJson as { layoutEngine?: string | null } | null
      : (options.getFrameTreeJson?.() as { layoutEngine?: string | null } | null | undefined) ?? null;
    const layoutEngine = resolvePreviewRenderIntentLayoutEngine({
      intent: options.previewWindow.__DG_previewRenderIntent ?? null,
      frameTreeJson: tree as PreviewRenderIntentFrameTree | null,
    });
    const engine = resolvePreviewEngine({ layoutEngine, shellMode: 'grid' });
    return engineSupportsSidebarSection(engine, sidebarSectionId) ? engine : null;
  }

  function activePersistNamespace(frameTreeJson?: unknown): string {
    const engine = activePreviewEngine(frameTreeJson);
    return (engine?.controlSpecs ?? []).find((spec) => spec.persistNamespace)?.persistNamespace
      ?? defaultPersistNamespace;
  }

  function readLayoutOverrides(): Record<string, unknown> {
    const runtimeDeps = requireDeps();
    return runtimeDeps.getLayoutOverrides?.() ?? {};
  }

  function writeLayoutOverrides(overrides: Record<string, unknown>): void {
    const nextOverrides = { ...(overrides || {}) };
    const runtimeDeps = requireDeps();
    if (typeof runtimeDeps.setLayoutOverrides === 'function') {
      runtimeDeps.setLayoutOverrides(nextOverrides);
    }
  }

  function isActiveLayoutEngine(frameTreeJson?: unknown): boolean {
    const tree = frameTreeJson !== undefined
      ? frameTreeJson as { layoutEngine?: string | null } | null
      : (options.getFrameTreeJson?.() as { layoutEngine?: string | null } | null | undefined) ?? null;
    const layoutEngine = resolvePreviewRenderIntentLayoutEngine({
      intent: options.previewWindow.__DG_previewRenderIntent ?? null,
      frameTreeJson: tree as PreviewRenderIntentFrameTree | null,
    });
    if (engineSupportsSidebarSection(resolvePreviewEngine({ layoutEngine, shellMode: 'grid' }), sidebarSectionId)) {
      return true;
    }
    return false;
  }

  function applyLayoutOverrides(overrides: Record<string, unknown>): void {
    if (!deps) {
      return;
    }
    writeLayoutOverrides(overrides);
  }

  function wirePanel(): void {
    const controls = resolvePreviewEngineLayoutControls(options.previewWindow);
    if (!controls || panelWired) {
      return;
    }
    requireDeps();
    controls.init?.({
      getOverrides: () => readLayoutOverrides(),
      setOverrides: (value) => writeLayoutOverrides(value),
    });
    panelWired = true;
  }

  function syncPanel(): void {
    wirePanel();
    resolvePreviewEngineLayoutControls(options.previewWindow)?.refresh?.();
  }

  function collectPersistedPayload(
    basePayload: Record<string, unknown>,
    model?: {
      layoutOverrides?: Record<string, unknown>;
      layoutOverrideNamespace?: string | null;
      layoutOperatorOverrides?: LayoutOperatorOverrideState | null;
    } | null,
  ): Record<string, unknown> {
    wirePanel();
    const controls = resolvePreviewEngineLayoutControls(options.previewWindow);
    const frameTreeJson = options.getFrameTreeJson?.();
    const engine = activePreviewEngine(frameTreeJson);
    const namespace = activePersistNamespace(frameTreeJson);
    const namespacedOverrides = {
      ...(controls?.collectNamespacedOverrides?.() ?? {}),
    };
    const layoutOverrides = {
      ...(namespacedOverrides[namespace] ?? controls?.collectOverrides?.() ?? {}),
    };
    applyLayoutOverrides(layoutOverrides);
    if (model) {
      if (engine) {
        writeLayoutOperatorOverrideBucketForManifest(model, engine, layoutOverrides, namespace);
      } else {
        writeActiveLayoutOperatorOverrides(model, layoutOverrides, namespace);
      }
    }
    if (Object.keys(namespacedOverrides).length === 0 && Object.keys(layoutOverrides).length > 0) {
      namespacedOverrides[namespace] = { ...layoutOverrides };
    }
    const payload: Record<string, unknown> = {
      ...(basePayload || {}),
      engine_layout_overrides: namespacedOverrides,
    };
    return {
      ...payload,
    };
  }

  function requestRelayout(): Promise<unknown> | unknown {
    wirePanel();
    const domOverrides = resolvePreviewEngineLayoutControls(options.previewWindow)?.collectOverrides?.();
    if (domOverrides) {
      applyLayoutOverrides({ ...domOverrides });
    }
    const runtimeDeps = requireDeps();
    const rootId = runtimeDeps.getRootId?.() ?? 'root';
    const requestLayoutRelayout = runtimeDeps.requestLayoutRelayout;
    if (typeof requestLayoutRelayout !== 'function') {
      throw new Error('preview engine shell controller requires a layout relayout callback');
    }
    return requestLayoutRelayout(rootId);
  }

  return {
    init(nextDeps) {
      deps = nextDeps;
    },
    isActiveLayoutEngine,
    wirePanel,
    syncPanel,
    initPanel: syncPanel,
    initializePanel: syncPanel,
    getLayoutOverrides() {
      return deps ? readLayoutOverrides() : {};
    },
    applyLayoutOverrides,
    collectPersistedPayload,
    requestRelayout,
  };
}
