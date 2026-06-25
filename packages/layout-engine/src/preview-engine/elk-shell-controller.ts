import type { PreviewEngineManifest } from './types.js';

export interface PreviewElkShellControllerDeps {
  getLayoutOverrides?: () => Record<string, unknown>;
  /** @deprecated Prefer `getLayoutOverrides`. */
  getElkLayoutOverrides?: () => Record<string, unknown>;
  setLayoutOverrides?: (value: Record<string, unknown>) => void;
  /** @deprecated Prefer `setLayoutOverrides`. */
  setElkLayoutOverrides?: (value: Record<string, unknown>) => void;
  getRootId?: () => string;
  requestLayoutRelayout?: (cid: string) => Promise<unknown> | unknown;
  /** @deprecated Prefer `requestLayoutRelayout`. */
  requestV3Relayout?: (cid: string) => Promise<unknown> | unknown;
}

export interface PreviewElkShellControllerWindowLike {
  __DG_CONFIG?: { layout_engine?: string };
  PreviewEngineLayoutControls?: {
    init?: (options: {
      getOverrides: () => Record<string, unknown>;
      setOverrides: (value: Record<string, unknown>) => void;
    }) => void;
    refresh?: () => void;
    collectOverrides?: () => Record<string, unknown>;
  };
  ElkLayoutControls?: {
    init?: (options: {
      getOverrides: () => Record<string, unknown>;
      setOverrides: (value: Record<string, unknown>) => void;
    }) => void;
    refresh?: () => void;
    collectOverrides?: () => Record<string, unknown>;
  };
}

export interface PreviewElkShellControllerDocumentLike {
  getElementById: (id: string) => { hasAttribute: (name: string) => boolean } | null;
}

export interface PreviewElkShellControllerRuntimeOptions {
  document: PreviewElkShellControllerDocumentLike;
  previewWindow: PreviewElkShellControllerWindowLike;
  layoutEngineRoot?: {
    previewEngines?: {
      registry?: {
        resolvePreviewEngine?: (context: { layoutEngine?: string | null; shellMode?: string | null }) => PreviewEngineManifest | null;
      };
    };
    resolvePreviewEngine?: (context: { layoutEngine?: string | null; shellMode?: string | null }) => PreviewEngineManifest | null;
  } | null;
  getFrameTreeJson?: (() => unknown) | null;
  sectionId?: string;
}

export interface PreviewElkShellControllerRuntime {
  init: (deps: PreviewElkShellControllerDeps) => void;
  isElkLayeredDiagram: (frameTreeJson?: unknown) => boolean;
  isActiveLayoutEngine: (frameTreeJson?: unknown) => boolean;
  wirePanel: () => void;
  syncPanel: () => void;
  initPanel: () => void;
  initializePanel: () => void;
  getLayoutOverrides: () => Record<string, unknown>;
  applyLayoutOverrides: (overrides: Record<string, unknown>) => void;
  applyElkLayoutOverrides: (overrides: Record<string, unknown>) => void;
  collectPersistedPayload: (
    basePayload: Record<string, unknown>,
    model?: { layoutOverrides?: Record<string, unknown>; elkLayoutOverrides?: Record<string, unknown> } | null,
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
  previewWindow: PreviewElkShellControllerWindowLike,
): PreviewElkShellControllerWindowLike['ElkLayoutControls'] | null {
  return previewWindow.PreviewEngineLayoutControls
    ?? previewWindow.ElkLayoutControls
    ?? null;
}

export function createPreviewElkShellControllerRuntime(
  options: PreviewElkShellControllerRuntimeOptions,
): PreviewElkShellControllerRuntime {
  let deps: PreviewElkShellControllerDeps | null = null;
  let panelWired = false;

  function requireDeps(): PreviewElkShellControllerDeps {
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

  function readLayoutOverrides(): Record<string, unknown> {
    const runtimeDeps = requireDeps();
    return runtimeDeps.getLayoutOverrides?.()
      ?? runtimeDeps.getElkLayoutOverrides?.()
      ?? {};
  }

  function writeLayoutOverrides(overrides: Record<string, unknown>): void {
    const nextOverrides = { ...(overrides || {}) };
    const runtimeDeps = requireDeps();
    if (typeof runtimeDeps.setLayoutOverrides === 'function') {
      runtimeDeps.setLayoutOverrides(nextOverrides);
      return;
    }
    runtimeDeps.setElkLayoutOverrides?.(nextOverrides);
  }

  function isElkLayeredDiagram(frameTreeJson?: unknown): boolean {
    const tree = frameTreeJson !== undefined
      ? frameTreeJson as { layoutEngine?: string | null } | null
      : (options.getFrameTreeJson?.() as { layoutEngine?: string | null } | null | undefined) ?? null;
    const layoutEngine = tree?.layoutEngine ?? options.previewWindow.__DG_CONFIG?.layout_engine ?? null;
    if (engineSupportsSidebarSection(resolvePreviewEngine({ layoutEngine, shellMode: 'grid' }), 'elk-layout')) {
      return true;
    }
    return false;
  }

  function applyElkLayoutOverrides(overrides: Record<string, unknown>): void {
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
    model?: { layoutOverrides?: Record<string, unknown>; elkLayoutOverrides?: Record<string, unknown> } | null,
  ): Record<string, unknown> {
    wirePanel();
    const domOverrides = resolvePreviewEngineLayoutControls(options.previewWindow)?.collectOverrides?.() ?? {};
    const elkOverrides = {
      ...((model && (model.layoutOverrides || model.elkLayoutOverrides)) || {}),
      ...domOverrides,
    };
    applyElkLayoutOverrides(elkOverrides);
    if (model) {
      model.layoutOverrides = { ...elkOverrides };
      model.elkLayoutOverrides = { ...elkOverrides };
    }
    return {
      ...(basePayload || {}),
      engine_layout_overrides: {
        'meta.elk': { ...elkOverrides },
      },
      elk_layout_overrides: { ...elkOverrides },
    };
  }

  function requestRelayout(): Promise<unknown> | unknown {
    wirePanel();
    const domOverrides = resolvePreviewEngineLayoutControls(options.previewWindow)?.collectOverrides?.();
    if (domOverrides) {
      applyElkLayoutOverrides({
        ...readLayoutOverrides(),
        ...domOverrides,
      });
    }
    const runtimeDeps = requireDeps();
    const rootId = runtimeDeps.getRootId?.() ?? 'root';
    const requestLayoutRelayout = runtimeDeps.requestLayoutRelayout ?? runtimeDeps.requestV3Relayout;
    if (typeof requestLayoutRelayout !== 'function') {
      throw new Error('preview engine shell controller requires a layout relayout callback');
    }
    return requestLayoutRelayout(rootId);
  }

  return {
    init(nextDeps) {
      deps = nextDeps;
    },
    isElkLayeredDiagram,
    isActiveLayoutEngine: isElkLayeredDiagram,
    wirePanel,
    syncPanel,
    initPanel: syncPanel,
    initializePanel: syncPanel,
    getLayoutOverrides() {
      return deps ? readLayoutOverrides() : {};
    },
    applyLayoutOverrides: applyElkLayoutOverrides,
    applyElkLayoutOverrides,
    collectPersistedPayload,
    requestRelayout,
  };
}
