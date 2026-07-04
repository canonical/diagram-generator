import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREVIEW_BOX_STYLES } from '../src/preview-shell/frame-style.js';
import {
  installDagrePreviewEngine,
  installElkLayeredPreviewEngine,
  installV3PreviewEngine,
} from '../src/preview-engine/builtins.js';
import { installMindmapLitePreviewEngine } from '../src/preview-engine/mindmap-lite.js';
import { getPreviewEngine } from '../src/preview-engine/registry.js';
import { readLayoutOperatorOverrideState } from '../src/preview-shell/layout-operator-overrides.js';

const mocks = vi.hoisted(() => ({
  createBrowserState: vi.fn(),
  createRuntime: vi.fn(),
}));

vi.mock('../src/preview-shell/app-grid-editor-browser-state.js', () => ({
  createPreviewGridEditorBrowserStateFromBrowserHost: mocks.createBrowserState,
}));

vi.mock('../src/preview-shell/app-grid-editor-runtime.js', () => ({
  createPreviewGridEditorRuntimeFromBrowserHost: mocks.createRuntime,
}));

const {
  createPreviewGridEditorInstallOptionsFromLegacyEditorHost,
  createPreviewGridEditorInstallUnitFromLegacyEditorHost,
  createPreviewGridEditorInstallUnitFromEditorHost,
  createPreviewGridEditorInstallUnitFromBrowserHost,
} = await import('../src/preview-shell/app-grid-editor-install-unit.js');

describe('createPreviewGridEditorInstallUnitFromBrowserHost', () => {
  beforeEach(() => {
    mocks.createBrowserState.mockReset();
    mocks.createRuntime.mockReset();
  });

  it('keeps browser-state/runtime coupling in one lazy install unit', () => {
    let capturedBrowserStateOptions: Record<string, unknown> | null = null;
    let capturedRuntimeOptions: Record<string, unknown> | null = null;

    const previewWindow = {
      __DG_getPreviewBridgeRelayoutContract: vi.fn(() => ({ kind: 'relayout-contract' })),
      __DG_getPreviewShellInteractionContract: vi.fn(() => ({ kind: 'interaction-contract' })),
    };
    const sceneFacade = { kind: 'scene-facade' };
    const runtime = {
      getSceneFacade: vi.fn(() => sceneFacade),
      getBootstrapFacade: vi.fn(() => ({ kind: 'bootstrap-facade' })),
      getRelayoutFacade: vi.fn(() => ({ kind: 'relayout-facade' })),
      getInteractionFacade: vi.fn(() => ({ kind: 'interaction-facade' })),
      invalidateOverrideBoundFacades: vi.fn(),
    };
    const browserState = {
      replaceOverrides: vi.fn((nextOverrides: Record<string, unknown>) => {
        (
          capturedBrowserStateOptions as {
            invalidateOverrideBoundFacades: () => void;
          }
        ).invalidateOverrideBoundFacades();
        return nextOverrides;
      }),
      setDirty: vi.fn(),
      pruneLinkedRootGridOverrides: vi.fn(),
      restoreOverrideEntries: vi.fn(),
      clearPendingRestoreRuntime: vi.fn(),
      applyLocalRestoreRefresh: vi.fn(),
      setMultiActionGap: vi.fn(),
      setOverride: vi.fn(),
      setWaypointOverride: vi.fn(),
      cleanOverride: vi.fn(),
      getParentNode: vi.fn(() => null),
      getComponentNode: vi.fn(() => null),
      hasLayoutChildren: vi.fn(() => false),
      getArrowNode: vi.fn(() => null),
      getComponentType: vi.fn(() => 'box'),
      getViolationsForComponent: vi.fn(() => []),
      scheduleLayoutRelayout: vi.fn(),
      clearScheduledLayoutRelayout: vi.fn(),
    };

    mocks.createBrowserState.mockImplementation((options: Record<string, unknown>) => {
      capturedBrowserStateOptions = options;
      return browserState;
    });
    mocks.createRuntime.mockImplementation((options: Record<string, unknown>) => {
      capturedRuntimeOptions = options;
      return runtime;
    });

    const options = {
      shared: {
        model: { kind: 'model' },
        editorState: { kind: 'editor-state' },
        previewSaveClient: { kind: 'save-client' },
        constraints: { kind: 'constraints' },
        lastViolationsState: { get: vi.fn(() => []) },
        baselineStep: 24,
        previewWindow,
      },
      browser: {
        overridesState: {
          get: vi.fn(() => ({ alpha: { width: 120 } })),
          set: vi.fn(),
        },
        multiActionGapState: {
          get: vi.fn(() => 24),
          set: vi.fn(),
        },
        requestLayoutRelayout: vi.fn(),
        getMultiActionGapInput: vi.fn(() => null),
        setTimeoutFn: vi.fn((callback: () => void) => callback()),
        clearTimeoutFn: vi.fn(),
        relayoutDelayMs: 120,
        buildTreeUi: vi.fn(),
      },
    } as any;

    const installUnit = createPreviewGridEditorInstallUnitFromBrowserHost(options);

    const state = installUnit.getBrowserState();
    expect(state).toBe(browserState);
    expect(mocks.createBrowserState).toHaveBeenCalledTimes(1);
    expect(mocks.createRuntime).not.toHaveBeenCalled();

    state.replaceOverrides({ alpha: { width: 160 } });
    expect(mocks.createRuntime).not.toHaveBeenCalled();
    expect(runtime.invalidateOverrideBoundFacades).not.toHaveBeenCalled();

    const resolvedRuntime = installUnit.getRuntime();
    expect(resolvedRuntime).toBe(runtime);
    expect(mocks.createRuntime).toHaveBeenCalledTimes(1);
    expect((capturedRuntimeOptions as { shared: unknown }).shared).toBe(options.shared);
    expect((capturedRuntimeOptions as { browser: Record<string, unknown> }).browser.getOverrides)
      .toBe(options.browser.overridesState.get);
    const runtimeReplaceOverrides = (
      capturedRuntimeOptions as { browser: Record<string, unknown> }
    ).browser.replaceOverrides as (nextOverrides: Record<string, unknown>) => void;
    expect(typeof runtimeReplaceOverrides).toBe('function');
    runtimeReplaceOverrides({ gamma: { width: 240 } });
    expect(browserState.replaceOverrides).toHaveBeenLastCalledWith({
      gamma: { width: 240 },
    });
    runtime.invalidateOverrideBoundFacades.mockClear();
    expect((capturedRuntimeOptions as { browser: Record<string, unknown> }).browser.setDirty)
      .toBe(browserState.setDirty);
    expect((capturedRuntimeOptions as { browser: Record<string, unknown> }).browser.scheduleRelayout)
      .toBe(browserState.scheduleLayoutRelayout);

    expect((capturedBrowserStateOptions as { model: unknown }).model).toBe(options.shared.model);
    expect((capturedBrowserStateOptions as { editorState: unknown }).editorState).toBe(options.shared.editorState);
    expect((capturedBrowserStateOptions as { previewSaveClient: unknown }).previewSaveClient)
      .toBe(options.shared.previewSaveClient);
    expect((capturedBrowserStateOptions as { constraints: unknown }).constraints)
      .toBe(options.shared.constraints);
    expect((capturedBrowserStateOptions as { multiActionGapState: unknown }).multiActionGapState)
      .toBe(options.browser.multiActionGapState);
    expect(
      (capturedBrowserStateOptions as {
        getRequestLayoutRelayout: () => unknown;
      }).getRequestLayoutRelayout(),
    ).toBe(options.browser.requestLayoutRelayout);
    expect(
      (capturedBrowserStateOptions as {
        getPreviewBridgeRelayoutContract: () => unknown;
      }).getPreviewBridgeRelayoutContract(),
    ).toEqual({ kind: 'relayout-contract' });
    expect(
      (capturedBrowserStateOptions as {
        getPreviewShellInteractionContract: () => unknown;
      }).getPreviewShellInteractionContract(),
    ).toEqual({ kind: 'interaction-contract' });
    expect(
      (capturedBrowserStateOptions as {
        getSceneFacade: () => unknown;
      }).getSceneFacade(),
    ).toBe(sceneFacade);

    state.replaceOverrides({ beta: { height: 80 } });
    expect(runtime.invalidateOverrideBoundFacades).toHaveBeenCalledTimes(1);
  });
});

describe('createPreviewGridEditorInstallUnitFromLegacyEditorHost', () => {
  beforeEach(() => {
    mocks.createBrowserState.mockReset();
    mocks.createRuntime.mockReset();
  });

  it('defaults legacy editor mutable state inside the typed install unit owner', () => {
    let capturedBrowserStateOptions: Record<string, unknown> | null = null;
    let capturedRuntimeOptions: Record<string, unknown> | null = null;

    const browserState = {
      replaceOverrides: vi.fn(),
      setDirty: vi.fn(),
      pruneLinkedRootGridOverrides: vi.fn(),
      restoreOverrideEntries: vi.fn(),
      clearPendingRestoreRuntime: vi.fn(),
      applyLocalRestoreRefresh: vi.fn(),
      setMultiActionGap: vi.fn(),
      setOverride: vi.fn(),
      setWaypointOverride: vi.fn(),
      cleanOverride: vi.fn(),
      getParentNode: vi.fn(() => null),
      getComponentNode: vi.fn(() => null),
      hasLayoutChildren: vi.fn(() => false),
      getArrowNode: vi.fn(() => null),
      getComponentType: vi.fn(() => 'box'),
      getViolationsForComponent: vi.fn(() => []),
      scheduleLayoutRelayout: vi.fn(),
      clearScheduledLayoutRelayout: vi.fn(),
    };
    const runtime = {
      getSceneFacade: vi.fn(() => ({ kind: 'scene-facade' })),
      getBootstrapFacade: vi.fn(() => ({ kind: 'bootstrap-facade' })),
      getRelayoutFacade: vi.fn(() => ({ kind: 'relayout-facade' })),
      getInteractionFacade: vi.fn(() => ({ kind: 'interaction-facade' })),
      invalidateOverrideBoundFacades: vi.fn(),
    };

    mocks.createBrowserState.mockImplementation((options: Record<string, unknown>) => {
      capturedBrowserStateOptions = options;
      return browserState;
    });
    mocks.createRuntime.mockImplementation((options: Record<string, unknown>) => {
      capturedRuntimeOptions = options;
      return runtime;
    });

    const model = {
      _roots: [],
      roots: [{ id: 'root' }],
      overrides: { alpha: { width: 120 } },
      removedIds: new Set<string>(),
      setDiagramGrid() {},
      clearOverride() {},
      get() {
        return { data: { id: 'alpha' } };
      },
      getParent() {
        return null;
      },
      getType() {
        return 'box';
      },
      cleanOverride() {},
      setOverride() {},
      setWaypointOverride() {},
    } as any;
    const previewWindow = {
      __DG_CONFIG: {
        icon_size: 48,
        col_gap: 24,
        head_len: 10,
        head_half: 5,
      },
      __DG_getPreviewBridgeRelayoutContract: vi.fn(() => ({ kind: 'relayout-contract' })),
      __DG_getPreviewShellInteractionContract: vi.fn(() => ({
        kind: 'interaction-contract',
        resolvePrimarySelectedId: vi.fn(() => 'alpha'),
      })),
      navigator: {
        clipboard: {
          writeText: vi.fn(async () => undefined),
        },
      },
      setTimeout: vi.fn((_callback: () => void, _delayMs?: number) => 17),
      clearTimeout: vi.fn(),
      requestAnimationFrame: vi.fn((_callback: FrameRequestCallback) => 21),
      cancelAnimationFrame: vi.fn(),
      alert: vi.fn(),
    } as any;

    const installUnit = createPreviewGridEditorInstallUnitFromLegacyEditorHost({
      document: {
        getElementById: vi.fn(() => null),
        querySelector: vi.fn(() => null),
      } as any,
      previewWindow,
      config: {
        slug: 'demo',
        engine: 'v3',
        gridEnabled: true,
        guideModes: ['off', 'all'],
        baselineStep: 24,
        inset: 8,
        guideColor: '#f00',
        guideOpacity: '0.5',
        interactionMode: { TEXT_EDITING: 'text', WAYPOINT_DRAGGING: 'waypoint' } as any,
        handleSize: 12,
        minNodeSize: 24,
        fallbackGap: 24,
        snapToGrid: (value) => value,
      },
      state: {
        model,
        interactionManager: { state: { cid: 'alpha' }, isMode: vi.fn(() => false) } as any,
        selectedIds: new Set(['alpha', 'beta']),
        coercedKeys: new Set(['coerced']),
        editorState: {
          undo: vi.fn(),
          redo: vi.fn(),
        } as any,
        previewSaveClient: {
          trySaveIfDirty: vi.fn(),
          setDirty: vi.fn(),
        } as any,
        constraints: { kind: 'constraints', forComponent: vi.fn(() => []) } as any,
      },
      helpers: {
        applyInteractionOverrideEntries: vi.fn(),
      },
      modelOps: {
        getOwnDelta: vi.fn(() => ({ dx: 0, dy: 0, dw: 0, dh: 0 })),
        getEffectiveDelta: vi.fn(() => ({ dx: 4, dy: 8, dw: 0, dh: 0 })),
        getAncestors: vi.fn(() => ['page']),
      },
      facades: {
        getEditorSceneFacade: vi.fn(() => ({
          deleteSelectedFrames: vi.fn(async () => ({ rerendered: true })),
          cycleGuideMode: vi.fn(),
          updateOverrideSummary: vi.fn(),
          refreshTreeColors: vi.fn(),
          runConstraints: vi.fn(),
        })),
        getEditorRelayoutFacade: vi.fn(() => ({
          applyUndoCommand: vi.fn(),
          getRelayoutRuntime: vi.fn(() => ({
            requestRelayout: vi.fn(),
            clearOverride: vi.fn(),
          })),
          scheduleResizeRelayout: vi.fn(() => true),
          cancelResizeRelayout: vi.fn(),
          persistResize: vi.fn(),
        })),
        getEditorInteractionFacade: vi.fn(() => ({
          getStageBindingRuntime: vi.fn(() => ({
            buildTreeUi: vi.fn(),
            bindInteraction: vi.fn(),
          })),
          getSelectionRuntime: vi.fn(() => ({
            deselectAll: vi.fn(),
            reapplySelection: vi.fn(),
            selectComponent: vi.fn(),
            applySelectionStateSnapshot: vi.fn(),
          })),
          getInspectorDisplayRuntime: vi.fn(() => ({
            renderEmptyInspector: vi.fn(),
            renderSelectionInspector: vi.fn(),
            renderMultiSelectionInspector: vi.fn(),
          })),
          getInspectorMutationRuntime: vi.fn(() => ({
            setFrameProp: vi.fn(),
          })),
          getResizeInteractionRuntime: vi.fn(() => ({
            onResizeUp: vi.fn(),
          })),
        })),
      },
    });

    expect(installUnit.getRuntime()).toBe(runtime);

    const shared = (capturedRuntimeOptions as { shared: Record<string, unknown> }).shared;
    const browserStateOptions = capturedBrowserStateOptions as Record<string, unknown>;

    expect(
      (shared.selectionDepthState as { get: () => number; set: (value: number) => void }).get(),
    ).toBe(0);
    (shared.selectionDepthState as { set: (value: number) => void }).set(5);
    expect((shared.selectionDepthState as { get: () => number }).get()).toBe(5);

    expect(
      (shared.generationState as { get: () => number; set: (value: number) => void }).get(),
    ).toBe(0);
    (shared.generationState as { set: (value: number) => void }).set(2);
    expect((shared.generationState as { get: () => number }).get()).toBe(2);

    expect(
      (
        shared.allowInternalDirtyNavigationState as {
          get: () => boolean;
          set: (value: boolean) => void;
        }
      ).get(),
    ).toBe(false);
    (
      shared.allowInternalDirtyNavigationState as {
        set: (value: boolean) => void;
      }
    ).set(true);
    expect(
      (shared.allowInternalDirtyNavigationState as { get: () => boolean }).get(),
    ).toBe(true);

    expect(
      (shared.lastViolationsState as { get: () => unknown; set: (value: unknown) => void }).get(),
    ).toEqual([]);
    (shared.lastViolationsState as { set: (value: unknown) => void }).set(['violation']);
    expect((shared.lastViolationsState as { get: () => unknown }).get()).toEqual(['violation']);

    expect(
      (
        browserStateOptions.overridesState as {
          get: () => Record<string, unknown>;
          set: (value: Record<string, unknown>) => void;
        }
      ).get(),
    ).toBe(model.overrides);
    const nextOverrides = { beta: { height: 80 } };
    (
      browserStateOptions.overridesState as {
        set: (value: Record<string, unknown>) => void;
      }
    ).set(nextOverrides);
    expect(
      (browserStateOptions.overridesState as { get: () => Record<string, unknown> }).get(),
    ).toBe(nextOverrides);
    expect(model.overrides).toBe(nextOverrides);

    expect(
      (
        browserStateOptions.multiActionGapState as {
          get: () => number;
          set: (value: number) => void;
        }
      ).get(),
    ).toBe(24);
    (
      browserStateOptions.multiActionGapState as {
        set: (value: number) => void;
      }
    ).set(40);
    expect((browserStateOptions.multiActionGapState as { get: () => number }).get()).toBe(40);
  });

  it('exposes required legacy bootstrap runtime surfaces through the install unit', async () => {
    const stage = {
      innerHTML: '',
      replaceChildren: vi.fn(),
    };
    const document = {
      getElementById(id: string) {
        if (id === 'stage') {
          return stage;
        }
        return null;
      },
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => []),
    } as any;

    let capturedRuntimeOptions: Record<string, unknown> | null = null;
    const relayoutRuntime = { requestRelayout: vi.fn(), clearOverride: vi.fn() };
    const selectionRuntime = {
      deselectAll: vi.fn(),
      reapplySelection: vi.fn(),
      selectComponent: vi.fn(),
      applySelectionStateSnapshot: vi.fn(),
    };
    const inspectorDisplayRuntime = {
      renderEmptyInspector: vi.fn(),
      renderSelectionInspector: vi.fn(),
      renderMultiSelectionInspector: vi.fn(),
      updateInspector: vi.fn(),
    };
    const inspectorMutationRuntime = {
      setFrameProp: vi.fn(),
      setFrameAlign: vi.fn(),
      setFrameSize: vi.fn(),
      applyStyle: vi.fn(),
    };
    const inspectorSelectionRuntime = {
      applySelectionTargets: vi.fn(),
      distributeSelection: vi.fn(),
      alignSelection: vi.fn(),
      setMultiFrameAlign: vi.fn(),
      applyMultiStyleOverride: vi.fn(),
      setMultiFrameProp: vi.fn(),
      setMultiFrameSize: vi.fn(),
    };
    const arrowWaypointRuntime = {
      showArrowWaypointHandles: vi.fn(),
      startWaypointDrag: vi.fn(),
      onWaypointDragMove: vi.fn(),
      onWaypointDragUp: vi.fn(),
      addWaypoint: vi.fn(),
      removeWaypoint: vi.fn(),
      getArrowPoints: vi.fn(() => []),
      updateArrowVisual: vi.fn(),
      rebuildArrowSvg: vi.fn(),
    };
    const keyboardRuntime = {
      onDocumentKeyDown: vi.fn(),
    };
    const resizeInteractionRuntime = {
      startResize: vi.fn(),
      onResizeMove: vi.fn(),
      onResizeUp: vi.fn(),
    };
    const stageBindingRuntime = {
      buildTreeUi: vi.fn(),
      bindInteraction: vi.fn(),
    };
    const relayoutFacade = {
      applyUndoCommand: vi.fn(),
      getLayoutRelayoutStatus: vi.fn(() => ({ localReady: true })),
      getRelayoutRuntime: vi.fn(() => relayoutRuntime),
      finishRelayout: vi.fn(),
      failRelayout: vi.fn(),
      scheduleResizeRelayout: vi.fn(() => true),
      cancelResizeRelayout: vi.fn(),
      persistResize: vi.fn(),
    };
    const interactionFacade = {
      getStageBindingRuntime: vi.fn(() => stageBindingRuntime),
      getSelectionRuntime: vi.fn(() => selectionRuntime),
      getInspectorDisplayRuntime: vi.fn(() => inspectorDisplayRuntime),
      getInspectorMutationRuntime: vi.fn(() => inspectorMutationRuntime),
      getInspectorSelectionRuntime: vi.fn(() => inspectorSelectionRuntime),
      getArrowWaypointRuntime: vi.fn(() => arrowWaypointRuntime),
      getTextEditRuntime: vi.fn(),
      getResizeInteractionRuntime: vi.fn(() => resizeInteractionRuntime),
      getKeyboardRuntime: vi.fn(() => keyboardRuntime),
    };
    const bootstrapFacade = {
      loadSvg: vi.fn(async () => {
        stage.replaceChildren({ nodeName: 'svg' });
        return 'client-render';
      }),
      signalDiagramLoaded: vi.fn(() => 11),
      whenDiagramLoaded: vi.fn(async () => 11),
      syncBrowseNavToLocation: vi.fn(),
      attemptDiagramNavigation: vi.fn(() => true),
      loadTree: vi.fn(async () => 'loaded'),
      bootstrapEditorRuntime: vi.fn(),
    };
    const runtime = {
      getSceneFacade: vi.fn(() => ({ kind: 'scene-facade' })),
      getBootstrapFacade: vi.fn(() => bootstrapFacade),
      getRelayoutFacade: vi.fn(() => relayoutFacade),
      getInteractionFacade: vi.fn(() => interactionFacade),
      invalidateOverrideBoundFacades: vi.fn(),
    };
    const browserState = {
      replaceOverrides: vi.fn(),
      setDirty: vi.fn(),
      pruneLinkedRootGridOverrides: vi.fn(),
      restoreOverrideEntries: vi.fn(),
      clearPendingRestoreRuntime: vi.fn(),
      applyLocalRestoreRefresh: vi.fn(),
      setMultiActionGap: vi.fn(),
      setOverride: vi.fn(),
      setWaypointOverride: vi.fn(),
      cleanOverride: vi.fn(),
      getParentNode: vi.fn(() => null),
      getComponentNode: vi.fn(() => null),
      hasLayoutChildren: vi.fn(() => false),
      getArrowNode: vi.fn(() => null),
      getComponentType: vi.fn(() => 'box'),
      getViolationsForComponent: vi.fn(() => []),
      scheduleLayoutRelayout: vi.fn(),
      clearScheduledLayoutRelayout: vi.fn(),
    };
    mocks.createBrowserState.mockReturnValue(browserState);
    mocks.createRuntime.mockImplementation((options: Record<string, unknown>) => {
      capturedRuntimeOptions = options;
      return runtime;
    });

    const model = {
      _roots: [],
      roots: [{ id: 'root' }],
      overrides: { alpha: { width: 120 } },
      removedIds: new Set<string>(),
      setDiagramGrid() {},
      clearOverride() {},
      get() {
        return { data: { id: 'alpha' } };
      },
      getParent() {
        return null;
      },
      getType() {
        return 'box';
      },
      cleanOverride() {},
      setOverride() {},
      setWaypointOverride() {},
    } as any;

    const previewWindow = {
      __DG_CONFIG: {
        icon_size: 48,
        col_gap: 24,
        head_len: 10,
        head_half: 5,
      },
      __DG_getPreviewBridgeRelayoutContract: vi.fn(() => ({ kind: 'relayout-contract' })),
      __DG_getPreviewShellInteractionContract: vi.fn(() => ({
        kind: 'interaction-contract',
        resolvePrimarySelectedId: vi.fn(() => 'alpha'),
      })),
      navigator: {
        clipboard: {
          writeText: vi.fn(async () => undefined),
        },
      },
      setTimeout: vi.fn((_callback: () => void, _delayMs?: number) => 17),
      clearTimeout: vi.fn(),
      requestAnimationFrame: vi.fn((_callback: FrameRequestCallback) => 21),
      cancelAnimationFrame: vi.fn(),
      alert: vi.fn(),
    } as any;

    const installUnit = createPreviewGridEditorInstallUnitFromLegacyEditorHost({
      document,
      previewWindow,
      config: {
        slug: 'demo',
        engine: 'v3',
        gridEnabled: true,
        guideModes: ['off', 'all'],
        baselineStep: 24,
        inset: 8,
        guideColor: '#f00',
        guideOpacity: '0.5',
        interactionMode: { TEXT_EDITING: 'text', WAYPOINT_DRAGGING: 'waypoint' } as any,
        handleSize: 12,
        minNodeSize: 24,
        fallbackGap: 24,
        snapToGrid: (value) => value,
      },
      state: {
        model,
        interactionManager: { state: { cid: 'alpha' }, isMode: vi.fn(() => false) } as any,
        selectedIds: new Set(['alpha', 'beta']),
        coercedKeys: new Set(['coerced']),
        editorState: {
          undo: vi.fn(),
          redo: vi.fn(),
        } as any,
        previewSaveClient: {
          trySaveIfDirty: vi.fn(),
          setDirty: vi.fn(),
        } as any,
        constraints: { kind: 'constraints', forComponent: vi.fn(() => []) } as any,
      },
      helpers: {
        applyInteractionOverrideEntries: vi.fn(),
      },
      modelOps: {
        getOwnDelta: vi.fn(() => ({ dx: 0, dy: 0, dw: 0, dh: 0 })),
        getEffectiveDelta: vi.fn(() => ({ dx: 4, dy: 8, dw: 0, dh: 0 })),
        getAncestors: vi.fn(() => ['page']),
      },
      facades: {
        getEditorSceneFacade: vi.fn(() => ({})),
        getEditorRelayoutFacade: vi.fn(() => ({
          applyUndoCommand: vi.fn(),
          getRelayoutRuntime: vi.fn(() => relayoutRuntime),
          scheduleResizeRelayout: vi.fn(() => true),
          cancelResizeRelayout: vi.fn(),
          persistResize: vi.fn(),
        })),
        getEditorInteractionFacade: vi.fn(() => interactionFacade),
      },
    });

    expect(installUnit.getRuntime()).toBe(runtime);
    expect(capturedRuntimeOptions).not.toBeNull();
    const bootstrap = installUnit.getBootstrapFacade();
    const sceneFacade = installUnit.getSceneFacade();
    const relayout = installUnit.getRelayoutFacade();
    const interaction = installUnit.getInteractionFacade();

    expect(bootstrap).toBeTruthy();
    expect(sceneFacade).toBeTruthy();
    expect(relayout.getRelayoutRuntime()).toBe(relayoutRuntime);
    expect(interaction.getSelectionRuntime()).toBe(selectionRuntime);
    expect(interaction.getInspectorDisplayRuntime()).toBe(inspectorDisplayRuntime);
    expect(interaction.getInspectorMutationRuntime()).toBe(inspectorMutationRuntime);
    expect(interaction.getKeyboardRuntime()).toBe(keyboardRuntime);
    expect(capturedRuntimeOptions).not.toBeNull();
    expect(document.getElementById('stage')).toBe(stage);

    await expect(bootstrap.loadSvg()).resolves.toBe('client-render');
    expect(stage.replaceChildren).toHaveBeenCalledTimes(1);
  });
});

describe('createPreviewGridEditorInstallUnitFromEditorHost', () => {
  beforeEach(() => {
    mocks.createBrowserState.mockReset();
    mocks.createRuntime.mockReset();
  });

  it('derives typed install options from the legacy editor host boundary', async () => {
    const guideLines = [{ axis: 'x' }];
    const resizeSvg = { kind: 'svg' } as unknown as SVGSVGElement;
    const multiActionGapInput = { id: 'multi-action-gap' };
    const inspector = { id: 'inspector' };
    const writeText = vi.fn(async () => undefined);
    const previewWindow = {
      __DG_CONFIG: {
        icon_size: 48,
        col_gap: 24,
        head_len: 10,
        head_half: 5,
      },
      navigator: {
        clipboard: {
          writeText,
        },
      },
      setTimeout: vi.fn((_callback: () => void, _delayMs?: number) => 17),
      clearTimeout: vi.fn(),
      syncArrowsInModel: vi.fn(),
      arrowComponentId: vi.fn(() => 'arrow-alpha'),
      renderGuideLines: vi.fn(),
      clearGuideLines: vi.fn(),
      clearHandlesByClass: vi.fn(),
      renderResizeHandles: vi.fn(),
      collectPeerSnapTargets: vi.fn(() => ['peer']),
      collectGridSnapTargets: vi.fn(() => ({ xs: [24], ys: [48] })),
      snapRectToTargets: vi.fn(() => ({ dx: 2, dy: 4, lines: guideLines })),
      fitSvgToRenderedContent: vi.fn(),
      escapeHtml: vi.fn((value: string) => value),
      initNavTabs: vi.fn(),
      setStatus: vi.fn(),
      sanitizeSvgCloneForExport: vi.fn(),
      getLayoutTextAdapter: vi.fn(() => ({ name: 'adapter' })),
      requestAnimationFrame: vi.fn((_callback: FrameRequestCallback) => 21),
      cancelAnimationFrame: vi.fn(),
      alert: vi.fn(),
    } as any;
    const document = {
      getElementById: vi.fn((id: string) => {
        if (id === 'multi-action-gap') return multiActionGapInput;
        if (id === 'inspector') return inspector;
        return null;
      }),
      querySelector: vi.fn(() => null),
    } as any;

    const options = createPreviewGridEditorInstallOptionsFromLegacyEditorHost({
      document,
      previewWindow,
      config: {
        slug: 'demo',
        engine: 'v3',
        gridEnabled: true,
        guideModes: ['off', 'all'],
        baselineStep: 24,
        inset: 8,
        guideColor: '#f00',
        guideOpacity: '0.5',
        interactionMode: { TEXT_EDITING: 'text', WAYPOINT_DRAGGING: 'waypoint' } as any,
        handleSize: 12,
        minNodeSize: 24,
        fallbackGap: 24,
        snapToGrid: (value) => value,
      },
      state: {
        model: { kind: 'model' } as any,
        interactionManager: { kind: 'manager' } as any,
        selectedIds: new Set(['alpha', 'beta']),
        selectionDepthState: { get: vi.fn(() => 3), set: vi.fn() },
        coercedKeys: new Set(['coerced']),
        editorState: { kind: 'editor-state' } as any,
        previewSaveClient: { kind: 'save-client' } as any,
        generationState: { get: vi.fn(() => 7), set: vi.fn() },
        allowInternalDirtyNavigationState: { get: vi.fn(() => false), set: vi.fn() },
        constraints: { summarise: vi.fn(() => ({ total: 0 })) } as any,
        lastViolationsState: { get: vi.fn(() => []) },
        overridesState: { get: vi.fn(() => ({ alpha: { width: 120 } })), set: vi.fn() },
        multiActionGapState: { get: vi.fn(() => 24), set: vi.fn() },
        layoutRelayoutTimerState: { get: vi.fn(() => null), set: vi.fn() },
      },
      helpers: {
        applyInteractionOverrideEntries: vi.fn(),
      },
      modelOps: {
        getOwnDelta: vi.fn(() => ({ dx: 0, dy: 0, dw: 0, dh: 0 })),
        getEffectiveDelta: vi.fn(() => ({ dx: 4, dy: 8, dw: 0, dh: 0 })),
        getAncestors: vi.fn(() => ['page']),
      },
      facades: {
        getEditorSceneFacade: vi.fn(),
        getEditorRelayoutFacade: vi.fn(),
        getEditorInteractionFacade: vi.fn(),
      },
    });

    expect(options.shared.slug).toBe('demo');
    expect(options.shared.engine).toBe('v3');
    expect(options.state.getMultiActionGapInput()).toBe(multiActionGapInput);
    expect(options.browser.boxStyles).toEqual(DEFAULT_PREVIEW_BOX_STYLES);
    expect(options.browser.iconSize).toBe(48);
    expect(options.browser.columnGap).toBe(24);
    expect(options.browser.theme).toEqual({
      headLen: 10,
      headHalf: 5,
      color: '#E95420',
    });
    expect(options.browser.getInspector()).toBe(inspector);
    expect(options.browser.getTextAdapter?.()).toEqual({ name: 'adapter' });
    expect(options.browser.renderBoxStyleOptions('default')).toContain('value="default" selected');
    expect(options.browser.formatAsDefinedStyleLabel('parent', false))
      .toBe('Parent');
    expect(options.browser.normalizeStyleName('section')).toBe('section');
    expect(options.browser.collectPeerSnapTargets()).toEqual(['peer']);
    expect(options.browser.collectGridSnapTargets({ rows: 2 } as never)).toEqual({
      xs: [24],
      ys: [48],
    });
    expect(options.browser.snapRectToTargets({} as never)).toEqual({
      dx: 2,
      dy: 4,
      lines: guideLines,
    });

    const timerId = options.state.setTimeoutFn(() => undefined, 120);
    expect(previewWindow.setTimeout).toHaveBeenCalledWith(expect.any(Function), 120);
    expect(timerId).toBe(17);
    options.state.clearTimeoutFn(timerId);
    expect(previewWindow.clearTimeout).toHaveBeenCalledWith(17);

    options.browser.renderGuideLines(guideLines as never);
    expect(previewWindow.renderGuideLines).toHaveBeenCalledWith(guideLines, '#f00', '0.5');
    options.browser.renderResizeHandles({
      svg: resizeSvg,
      left: 1,
      top: 2,
      right: 3,
      bottom: 4,
      nodeId: 'alpha',
      options: {
        nodeAttr: 'data-node',
        dirAttr: 'data-dir',
      },
    });
    expect(previewWindow.renderResizeHandles).toHaveBeenCalledWith(
      resizeSvg,
      1,
      2,
      3,
      4,
      'alpha',
      {
        handleClass: 'dg-handle',
        nodeAttr: 'data-node',
        dirAttr: 'data-dir',
      },
    );

    await options.browser.writeClipboardText('copied');
    expect(writeText).toHaveBeenCalledWith('copied');
  });

  it('syncs panel visibility from the runtime document kind and active engine config', () => {
    const createPanel = () => ({
      hidden: false,
      style: { display: '' },
      setAttribute: vi.fn(),
      removeAttribute: vi.fn(),
      querySelectorAll: vi.fn(() => []),
    });
    const engineSwitcherSection = createPanel();
    const gridControlsSection = createPanel();
    const layoutParamsSection = createPanel();
    const previewWindow = {
      __DG_CONFIG: {
        engine: 'mindmap-tree',
        layout_engine: 'mindmap-tree',
        active_engine_id: 'mindmap-tree',
        persisted_layout_engine: 'mindmap-tree',
        shell_mode: 'grid',
        document_kind: 'mindmap-lite',
        compatible_engines: ['mindmap-tree'],
      },
      navigator: {
        clipboard: {
          writeText: vi.fn(async () => undefined),
        },
      },
      setTimeout: vi.fn((_callback: () => void, _delayMs?: number) => 17),
      clearTimeout: vi.fn(),
      requestAnimationFrame: vi.fn((_callback: FrameRequestCallback) => 21),
      cancelAnimationFrame: vi.fn(),
      alert: vi.fn(),
    } as any;
    const document = {
      getElementById: vi.fn((id: string) => {
        if (id === 'engine-switcher-section') return engineSwitcherSection;
        if (id === 'grid-controls-section') return gridControlsSection;
        if (id === 'layout-params-section') return layoutParamsSection;
        return null;
      }),
      querySelector: vi.fn(() => null),
    } as any;

    const options = createPreviewGridEditorInstallOptionsFromLegacyEditorHost({
      document,
      previewWindow,
      config: {
        slug: 'demo',
        engine: 'v3',
        gridEnabled: true,
        guideModes: ['off', 'all'],
        baselineStep: 24,
        inset: 8,
        guideColor: '#f00',
        guideOpacity: '0.5',
        interactionMode: { TEXT_EDITING: 'text', WAYPOINT_DRAGGING: 'waypoint' } as any,
        handleSize: 12,
        minNodeSize: 24,
        fallbackGap: 24,
        snapToGrid: (value) => value,
      },
      state: {
        model: { kind: 'model' } as any,
        interactionManager: { kind: 'manager' } as any,
        selectedIds: new Set<string>(),
        selectionDepthState: { get: vi.fn(() => 0), set: vi.fn() },
        coercedKeys: new Set<string>(),
        editorState: { kind: 'editor-state' } as any,
        previewSaveClient: { kind: 'save-client' } as any,
        generationState: { get: vi.fn(() => 7), set: vi.fn() },
        allowInternalDirtyNavigationState: { get: vi.fn(() => false), set: vi.fn() },
        constraints: { summarise: vi.fn(() => ({ total: 0 })) } as any,
        lastViolationsState: { get: vi.fn(() => []) },
        overridesState: { get: vi.fn(() => ({})), set: vi.fn() },
        multiActionGapState: { get: vi.fn(() => 24), set: vi.fn() },
        layoutRelayoutTimerState: { get: vi.fn(() => null), set: vi.fn() },
      },
      helpers: {
        applyInteractionOverrideEntries: vi.fn(),
      },
      modelOps: {
        getOwnDelta: vi.fn(() => ({ dx: 0, dy: 0, dw: 0, dh: 0 })),
        getEffectiveDelta: vi.fn(() => ({ dx: 0, dy: 0, dw: 0, dh: 0 })),
        getAncestors: vi.fn(() => []),
      },
      facades: {
        getEditorSceneFacade: vi.fn(),
        getEditorRelayoutFacade: vi.fn(),
        getEditorInteractionFacade: vi.fn(),
      },
    });

    options.browser.syncPanelVisibility({ count: 0, kind: 'empty' });
    expect(previewWindow.__DG_syncPreviewEngineWorkspacePanels).toBeTypeOf('function');
    previewWindow.__DG_syncPreviewEngineWorkspacePanels();

    expect(engineSwitcherSection.hidden).toBe(true);
    expect(layoutParamsSection.hidden).toBe(true);
  });

  it('syncs panel visibility from the live render intent when config is stale', () => {
    const unregisterers = [
      getPreviewEngine('v3') ? null : installV3PreviewEngine(),
      getPreviewEngine('elk-layered') ? null : installElkLayeredPreviewEngine(),
      getPreviewEngine('dagre') ? null : installDagrePreviewEngine(),
      getPreviewEngine('mindmap-tree') ? null : installMindmapLitePreviewEngine(),
    ].filter((value): value is () => void => typeof value === 'function');
    const createPanel = () => ({
      hidden: false,
      style: { display: '' },
      setAttribute: vi.fn(),
      removeAttribute: vi.fn(),
      querySelectorAll: vi.fn(() => []),
    });
    const engineSwitcherSection = createPanel();
    const gridControlsSection = createPanel();
    const layoutParamsSection = createPanel();
    const previewWindow = {
      __DG_CONFIG: {
        engine: 'v3',
        layout_engine: 'v3',
        active_engine_id: 'v3',
        persisted_layout_engine: 'missing-engine',
        shell_mode: 'grid',
        document_kind: 'frame-diagram',
        compatible_engines: ['v3'],
      },
      navigator: {
        clipboard: {
          writeText: vi.fn(async () => undefined),
        },
      },
      setTimeout: vi.fn((_callback: () => void, _delayMs?: number) => 17),
      clearTimeout: vi.fn(),
      requestAnimationFrame: vi.fn((_callback: FrameRequestCallback) => 21),
      cancelAnimationFrame: vi.fn(),
      alert: vi.fn(),
    } as any;
    const document = {
      getElementById: vi.fn((id: string) => {
        if (id === 'engine-switcher-section') return engineSwitcherSection;
        if (id === 'grid-controls-section') return gridControlsSection;
        if (id === 'layout-params-section') return layoutParamsSection;
        return null;
      }),
      querySelector: vi.fn(() => null),
    } as any;

    try {
      const options = createPreviewGridEditorInstallOptionsFromLegacyEditorHost({
        document,
        previewWindow,
        config: {
          slug: 'support-engineering-flow',
          engine: 'v3',
          gridEnabled: true,
          guideModes: ['off', 'all'],
          baselineStep: 24,
          inset: 8,
          guideColor: '#f00',
          guideOpacity: '0.5',
          interactionMode: { TEXT_EDITING: 'text', WAYPOINT_DRAGGING: 'waypoint' } as any,
          handleSize: 12,
          minNodeSize: 24,
          fallbackGap: 24,
          snapToGrid: (value) => value,
        },
        state: {
          model: { kind: 'model' } as any,
          interactionManager: { kind: 'manager' } as any,
          selectedIds: new Set<string>(),
          selectionDepthState: { get: vi.fn(() => 0), set: vi.fn() },
          coercedKeys: new Set<string>(),
          editorState: { kind: 'editor-state' } as any,
          previewSaveClient: { kind: 'save-client' } as any,
          generationState: { get: vi.fn(() => 7), set: vi.fn() },
          allowInternalDirtyNavigationState: { get: vi.fn(() => false), set: vi.fn() },
          constraints: { summarise: vi.fn(() => ({ total: 0 })) } as any,
          lastViolationsState: { get: vi.fn(() => []) },
          overridesState: { get: vi.fn(() => ({})), set: vi.fn() },
          multiActionGapState: { get: vi.fn(() => 24), set: vi.fn() },
          layoutRelayoutTimerState: { get: vi.fn(() => null), set: vi.fn() },
        },
        helpers: {
          applyInteractionOverrideEntries: vi.fn(),
        },
        modelOps: {
          getOwnDelta: vi.fn(() => ({ dx: 0, dy: 0, dw: 0, dh: 0 })),
          getEffectiveDelta: vi.fn(() => ({ dx: 0, dy: 0, dw: 0, dh: 0 })),
          getAncestors: vi.fn(() => []),
        },
        facades: {
          getEditorSceneFacade: vi.fn(),
          getEditorRelayoutFacade: vi.fn(),
          getEditorInteractionFacade: vi.fn(),
        },
      });
      createPreviewGridEditorInstallUnitFromEditorHost(options);

      options.browser.syncPanelVisibility({ count: 0, kind: 'empty' });
      expect(previewWindow.__DG_syncPreviewEngineWorkspacePanels).toBeTypeOf('function');
      expect(previewWindow.__DG_rerenderPreviewEngineWorkspaceStage).toBeTypeOf('function');
      expect(engineSwitcherSection.hidden).toBe(false);
      expect(gridControlsSection.hidden).toBe(true);
      expect(layoutParamsSection.hidden).toBe(true);

      previewWindow.__DG_CONFIG.persisted_layout_engine = 'v3';
      previewWindow.__DG_CONFIG.compatible_engines = ['v3', 'dagre'];
      previewWindow.__DG_previewRenderIntent = {
        engineId: 'dagre',
        pageDirection: null,
        frameOverrides: {},
        engineOverrides: {},
        gridOverrides: {},
      };
      options.browser.syncPanelVisibility({ count: 1, kind: 'root' });

      expect(previewWindow.__DG_CONFIG.active_engine_id).toBe('v3');
      expect(engineSwitcherSection.hidden).toBe(false);
      expect(gridControlsSection.hidden).toBe(true);
      expect(layoutParamsSection.hidden).toBe(false);

      previewWindow.__DG_CONFIG.document_kind = 'mindmap-lite';
      previewWindow.__DG_CONFIG.active_engine_id = 'mindmap-tree';
      previewWindow.__DG_CONFIG.persisted_layout_engine = 'mindmap-tree';
      previewWindow.__DG_CONFIG.compatible_engines = ['mindmap-tree'];
      previewWindow.__DG_previewRenderIntent = {
        engineId: 'mindmap-tree',
        pageDirection: null,
        frameOverrides: {},
        engineOverrides: {},
        gridOverrides: {},
      };
      previewWindow.__DG_syncPreviewEngineWorkspacePanels();

      expect(engineSwitcherSection.hidden).toBe(true);
      expect(layoutParamsSection.hidden).toBe(true);
    } finally {
      for (const unregister of unregisterers.reverse()) {
        unregister();
      }
    }
  });

  it('exposes a live engine-workspace rerender callback through the legacy host window', async () => {
    const rerenderStageCalls: string[] = [];
    const committedLayoutEngines: string[] = [];
    const graphControlsRuntime = { kind: 'graph-controls' };
    const graphControllerInit = vi.fn();
    const graphControllerSyncPanel = vi.fn();
    const graphControllerRuntime = {
      init: graphControllerInit,
      syncPanel: graphControllerSyncPanel,
    };
    const createGraphControlsRuntime = vi.fn(() => graphControlsRuntime);
    const createGraphControllerRuntime = vi.fn(() => graphControllerRuntime);
    const model = {
      kind: 'model',
      layoutOverrides: { 'dagre.ranksep': 128 },
      layoutOverrideNamespace: 'meta.dagre',
      layoutOperatorOverrides: {
        activeOperatorKey: 'dagre',
        byOperator: {
          dagre: { 'dagre.ranksep': 128 },
          'elk-force': { 'elk.spacing.nodeNode': 96 },
        },
      },
    };
    mocks.createBrowserState.mockReturnValue({
      replaceOverrides: vi.fn((nextOverrides: Record<string, unknown>) => nextOverrides),
      setDirty: vi.fn(),
      pruneLinkedRootGridOverrides: vi.fn(),
      restoreOverrideEntries: vi.fn(),
      clearPendingRestoreRuntime: vi.fn(),
      applyLocalRestoreRefresh: vi.fn(),
      setMultiActionGap: vi.fn(),
      setOverride: vi.fn(),
      setWaypointOverride: vi.fn(),
      cleanOverride: vi.fn(),
      getParentNode: vi.fn(() => null),
      getComponentNode: vi.fn(() => null),
      hasLayoutChildren: vi.fn(() => false),
      getArrowNode: vi.fn(() => null),
      getComponentType: vi.fn(() => 'box'),
      getViolationsForComponent: vi.fn(() => []),
      scheduleLayoutRelayout: vi.fn(),
      clearScheduledLayoutRelayout: vi.fn(),
    });
    mocks.createRuntime.mockReturnValue({
      getSceneFacade: vi.fn(() => ({
        rerenderStageFromModel: vi.fn(async () => {
          rerenderStageCalls.push('rerender');
          return true;
        }),
      })),
      getBootstrapFacade: vi.fn(() => ({})),
      getRelayoutFacade: vi.fn(() => ({})),
      getInteractionFacade: vi.fn(() => ({})),
      invalidateOverrideBoundFacades: vi.fn(),
    });
    const previewWindow = {
      __DG_CONFIG: {
        engine: 'v3',
        layout_engine: 'v3',
        active_engine_id: 'v3',
        persisted_layout_engine: 'v3',
        shell_mode: 'grid',
        document_kind: 'frame-diagram',
        compatible_engines: ['v3', 'dagre'],
      },
      navigator: {
        clipboard: {
          writeText: vi.fn(async () => undefined),
        },
      },
      setTimeout: vi.fn((_callback: () => void, _delayMs?: number) => 17),
      clearTimeout: vi.fn(),
      requestAnimationFrame: vi.fn((_callback: FrameRequestCallback) => 21),
      cancelAnimationFrame: vi.fn(),
      alert: vi.fn(),
      setFrameTreeLayoutEngine: vi.fn((layoutEngine: string | null | undefined) => {
        if (layoutEngine) {
          committedLayoutEngines.push(layoutEngine);
          return layoutEngine;
        }
        return null;
      }),
      LayoutEngine: {
        previewEngines: {
          registry: {
            resolvePreviewEngine: vi.fn(({ layoutEngine }: { layoutEngine?: string | null }) => {
              if (layoutEngine === 'dagre') {
                return {
                  id: 'dagre',
                  hostView: { sidebarSections: ['layout-params'] },
                  controlSpecs: [{ key: 'dagre.ranksep', persistNamespace: 'meta.dagre' }],
                  capabilities: { rawDebugView: false },
                };
              }
              if (layoutEngine === 'elk-force') {
                return {
                  id: 'elk-force',
                  hostView: { sidebarSections: ['layout-params'] },
                  controlSpecs: [{ key: 'elk.spacing.nodeNode', persistNamespace: 'meta.elk' }],
                  capabilities: { rawDebugView: true },
                };
              }
              return {
                id: String(layoutEngine || 'v3'),
                hostView: { sidebarSections: [] },
                controlSpecs: [],
                capabilities: { rawDebugView: false },
              };
            }),
          },
          graph: {
            createPreviewEngineLayoutControlsRuntime: createGraphControlsRuntime,
            createPreviewEngineShellControllerRuntime: createGraphControllerRuntime,
          },
        },
      },
    } as any;
    const document = {
      getElementById: vi.fn(() => null),
      querySelector: vi.fn(() => null),
    } as any;

    const options = createPreviewGridEditorInstallOptionsFromLegacyEditorHost({
      document,
      previewWindow,
      config: {
        slug: 'support-engineering-flow',
        engine: 'v3',
        gridEnabled: true,
        guideModes: ['off', 'all'],
        baselineStep: 24,
        inset: 8,
        guideColor: '#f00',
        guideOpacity: '0.5',
        interactionMode: { TEXT_EDITING: 'text', WAYPOINT_DRAGGING: 'waypoint' } as any,
        handleSize: 12,
        minNodeSize: 24,
        fallbackGap: 24,
        snapToGrid: (value) => value,
      },
      state: {
        model: model as any,
        interactionManager: { kind: 'manager' } as any,
        selectedIds: new Set<string>(),
        selectionDepthState: { get: vi.fn(() => 0), set: vi.fn() },
        coercedKeys: new Set<string>(),
        editorState: { kind: 'editor-state' } as any,
        previewSaveClient: { kind: 'save-client' } as any,
        generationState: { get: vi.fn(() => 7), set: vi.fn() },
        allowInternalDirtyNavigationState: { get: vi.fn(() => false), set: vi.fn() },
        constraints: { summarise: vi.fn(() => ({ total: 0 })) } as any,
        lastViolationsState: { get: vi.fn(() => []) },
        overridesState: { get: vi.fn(() => ({})), set: vi.fn() },
        multiActionGapState: { get: vi.fn(() => 24), set: vi.fn() },
        layoutRelayoutTimerState: { get: vi.fn(() => null), set: vi.fn() },
      },
      helpers: {
        applyInteractionOverrideEntries: vi.fn(),
      },
      modelOps: {
        getOwnDelta: vi.fn(() => ({ dx: 0, dy: 0, dw: 0, dh: 0 })),
        getEffectiveDelta: vi.fn(() => ({ dx: 0, dy: 0, dw: 0, dh: 0 })),
        getAncestors: vi.fn(() => []),
      },
      facades: {
        getEditorSceneFacade: vi.fn(() => ({
          deleteSelectedFrames: vi.fn(async () => ({ rerendered: true })),
          cycleGuideMode: vi.fn(),
          updateOverrideSummary: vi.fn(),
          refreshTreeColors: vi.fn(),
          runConstraints: vi.fn(),
          rerenderStageFromModel: vi.fn(async () => true),
        })),
        getEditorRelayoutFacade: vi.fn(() => ({
          applyUndoCommand: vi.fn(),
          getRelayoutRuntime: vi.fn(() => ({ requestRelayout: vi.fn() })),
          scheduleResizeRelayout: vi.fn(() => false),
          cancelResizeRelayout: vi.fn(),
          persistResize: vi.fn(),
          getLayoutRelayoutStatus: vi.fn(() => ({})),
        })),
        getEditorInteractionFacade: vi.fn(() => ({
          getStageBindingRuntime: vi.fn(() => ({ buildTreeUi: vi.fn(), bindInteraction: vi.fn() })),
          getSelectionRuntime: vi.fn(() => ({
            deselectAll: vi.fn(),
            reapplySelection: vi.fn(),
            selectComponent: vi.fn(),
            applySelectionStateSnapshot: vi.fn(),
          })),
          getInspectorDisplayRuntime: vi.fn(() => ({
            renderEmptyInspector: vi.fn(),
            renderSelectionInspector: vi.fn(),
            renderMultiSelectionInspector: vi.fn(),
          })),
          getInspectorMutationRuntime: vi.fn(() => ({ setFrameProp: vi.fn() })),
          getResizeInteractionRuntime: vi.fn(() => ({ onResizeUp: vi.fn() })),
          getInspectorSelectionRuntime: vi.fn(() => ({
            applySelectionTargets: vi.fn(),
            distributeSelection: vi.fn(),
            alignSelection: vi.fn(),
            setMultiFrameAlign: vi.fn(),
            applyMultiStyleOverride: vi.fn(),
            setMultiFrameProp: vi.fn(),
            setMultiFrameSize: vi.fn(),
          })),
          getArrowWaypointRuntime: vi.fn(() => ({
            showArrowWaypointHandles: vi.fn(),
            startWaypointDrag: vi.fn(),
            onWaypointDragMove: vi.fn(),
            onWaypointDragUp: vi.fn(),
            addWaypoint: vi.fn(),
            removeWaypoint: vi.fn(),
            getArrowPoints: vi.fn(),
            updateArrowVisual: vi.fn(),
            rebuildArrowSvg: vi.fn(),
          })),
        })),
      },
    });
    createPreviewGridEditorInstallUnitFromEditorHost(options);

    expect(previewWindow.__DG_rerenderPreviewEngineWorkspaceStage).toBeTypeOf('function');
    await previewWindow.__DG_rerenderPreviewEngineWorkspaceStage();
    expect(committedLayoutEngines).toEqual(['v3']);
    expect(rerenderStageCalls).toEqual(['rerender']);
    expect(createGraphControlsRuntime).not.toHaveBeenCalled();

    committedLayoutEngines.length = 0;
    rerenderStageCalls.length = 0;
    previewWindow.__DG_CONFIG.active_engine_id = 'v3';
    previewWindow.__DG_CONFIG.layout_engine = 'v3';
    previewWindow.__DG_previewRenderIntent = {
      engineId: 'dagre',
      pageDirection: null,
      frameOverrides: {},
      engineOverrides: {},
      gridOverrides: {},
    };

    await previewWindow.__DG_rerenderPreviewEngineWorkspaceStage();
    expect(committedLayoutEngines).toEqual(['dagre']);
    expect(previewWindow.__DG_CONFIG.active_engine_id).toBe('dagre');
    expect(previewWindow.__DG_previewRenderIntent?.engineId).toBe('dagre');
    expect(rerenderStageCalls).toEqual(['rerender']);
    expect(createGraphControlsRuntime).toHaveBeenCalledTimes(1);
    expect(createGraphControllerRuntime).toHaveBeenCalledTimes(1);
    expect(previewWindow.PreviewEngineLayoutControls).toBe(graphControlsRuntime);
    expect(previewWindow.PreviewEngineShellController).toBe(graphControllerRuntime);
    expect(graphControllerInit).toHaveBeenCalledTimes(1);
    expect(graphControllerInit.mock.calls[0]?.[0]?.getLayoutOverrides()).toEqual({
      'dagre.ranksep': 128,
    });
    expect(graphControllerSyncPanel).toHaveBeenCalledTimes(1);

    committedLayoutEngines.length = 0;
    rerenderStageCalls.length = 0;
    previewWindow.__DG_previewRenderIntent = {
      engineId: 'elk-force',
      pageDirection: null,
      frameOverrides: {},
      engineOverrides: {},
      gridOverrides: {},
    };

    await previewWindow.__DG_rerenderPreviewEngineWorkspaceStage();
    expect(committedLayoutEngines).toEqual(['elk-force']);
    expect(previewWindow.__DG_CONFIG.active_engine_id).toBe('elk-force');
    expect(previewWindow.__DG_previewRenderIntent?.engineId).toBe('elk-force');
    expect(rerenderStageCalls).toEqual(['rerender']);
    expect(createGraphControlsRuntime).toHaveBeenCalledTimes(2);
    expect(createGraphControllerRuntime).toHaveBeenCalledTimes(2);
    expect(previewWindow.PreviewEngineLayoutControls).toBe(graphControlsRuntime);
    expect(previewWindow.PreviewEngineShellController).toBe(graphControllerRuntime);
    expect(graphControllerInit).toHaveBeenCalledTimes(2);
    expect(graphControllerInit.mock.calls[1]?.[0]?.getLayoutOverrides()).toEqual({
      'elk.spacing.nodeNode': 96,
    });
    expect(readLayoutOperatorOverrideState(model)).toEqual({
      activeOperatorKey: 'elk-force',
      byOperator: {
        dagre: { 'dagre.ranksep': 128 },
        'elk-force': { 'elk.spacing.nodeNode': 96 },
      },
    });
    expect(model.layoutOverrides).toEqual({
      'elk.spacing.nodeNode': 96,
    });
    expect(model.layoutOverrideNamespace).toBe('meta.elk');
    expect(graphControllerSyncPanel).toHaveBeenCalledTimes(2);

    committedLayoutEngines.length = 0;
    rerenderStageCalls.length = 0;
    previewWindow.__DG_previewRenderIntent = {
      engineId: 'v3',
      pageDirection: null,
      frameOverrides: {},
      engineOverrides: {},
      gridOverrides: {},
    };

    await previewWindow.__DG_rerenderPreviewEngineWorkspaceStage();
    expect(committedLayoutEngines).toEqual(['v3']);
    expect(previewWindow.__DG_CONFIG.active_engine_id).toBe('v3');
    expect(previewWindow.__DG_previewRenderIntent?.engineId).toBe('v3');
    expect(rerenderStageCalls).toEqual(['rerender']);
    expect(previewWindow.PreviewEngineLayoutControls).toBeNull();
    expect(previewWindow.PreviewEngineShellController).toBeNull();
    expect(readLayoutOperatorOverrideState(model)).toEqual({
      activeOperatorKey: null,
      byOperator: {
        dagre: { 'dagre.ranksep': 128 },
        'elk-force': { 'elk.spacing.nodeNode': 96 },
      },
    });
    expect(model.layoutOverrides).toEqual({});
    expect(model.layoutOverrideNamespace).toBeNull();
  });

  it('restores engine-specific override runtime state when preview engine rerender fails', async () => {
    const committedLayoutEngines: string[] = [];
    const previousControlsRuntime = { kind: 'previous-controls-runtime' };
    const previousShellController = { kind: 'previous-shell-controller' };
    const nextControlsRuntime = { kind: 'next-controls-runtime' };
    const nextShellController = { kind: 'next-shell-controller', init: vi.fn(), syncPanel: vi.fn() };
    const createGraphControlsRuntime = vi.fn(() => nextControlsRuntime);
    const createGraphControllerRuntime = vi.fn(() => nextShellController);
    const browserState = {
      replaceOverrides: vi.fn((nextOverrides: Record<string, unknown>) => nextOverrides),
      setDirty: vi.fn(),
      pruneLinkedRootGridOverrides: vi.fn(),
      restoreOverrideEntries: vi.fn(),
      clearPendingRestoreRuntime: vi.fn(),
      applyLocalRestoreRefresh: vi.fn(),
      setMultiActionGap: vi.fn(),
      setOverride: vi.fn(),
      setWaypointOverride: vi.fn(),
      cleanOverride: vi.fn(),
      getParentNode: vi.fn(() => null),
      getComponentNode: vi.fn(() => null),
      hasLayoutChildren: vi.fn(() => false),
      getArrowNode: vi.fn(() => null),
      getComponentType: vi.fn(() => 'box'),
      getViolationsForComponent: vi.fn(() => []),
      scheduleLayoutRelayout: vi.fn(),
      clearScheduledLayoutRelayout: vi.fn(),
    };
    const rerenderStageFromModel = vi.fn(async () => {
      throw new Error('Unsupported ELK layered override keys: elk.radial.radius');
    });
    const runtime = {
      getSceneFacade: vi.fn(() => ({
        rerenderStageFromModel,
      })),
      getRelayoutFacade: vi.fn(() => ({
        getRelayoutRuntime: vi.fn(() => ({ requestRelayout: vi.fn() })),
      })),
      getBootstrapFacade: vi.fn(() => ({ kind: 'bootstrap-facade' })),
      getInteractionFacade: vi.fn(() => ({ kind: 'interaction-facade' })),
      invalidateOverrideBoundFacades: vi.fn(),
    };
    mocks.createBrowserState.mockReturnValue(browserState);
    mocks.createRuntime.mockReturnValue(runtime);
    const model = {
      roots: [{ id: 'root' }],
      layoutOverrides: { gap: 24 },
      layoutOverrideNamespace: 'meta.v3',
      layoutOperatorOverrides: {
        activeOperatorKey: 'v3',
        byOperator: {
          v3: { gap: 24 },
        },
      },
    };
    const previewWindow = {
      __DG_CONFIG: {
        slug: 'example-deployment-pipeline',
        active_engine_id: 'v3',
        layout_engine: 'v3',
        persisted_layout_engine: 'v3',
        shell_mode: 'grid',
        document_kind: 'frame-diagram',
      },
      __DG_previewRenderIntent: {
        engineId: 'elk-layered',
        pageDirection: null,
        frameOverrides: {},
        engineOverrides: {},
        gridOverrides: {},
      },
      __DG_activeLayoutOperatorKey: 'v3',
      getFrameTreeJson: vi.fn(() => ({
        layoutEngine: 'v3',
        engineLayout: {
          'meta.elk': {
            'elk.radial.radius': 240,
          },
        },
      })),
      setFrameTreeLayoutEngine: vi.fn((layoutEngine: string | null | undefined) => {
        if (layoutEngine) {
          committedLayoutEngines.push(layoutEngine);
          return layoutEngine;
        }
        return null;
      }),
      LayoutEngine: {
        previewEngines: {
          registry: {
            resolvePreviewEngine: vi.fn(({ layoutEngine }: { layoutEngine?: string | null }) => {
              if (layoutEngine === 'elk-layered') {
                return {
                  id: 'elk-layered',
                  hostView: { sidebarSections: ['layout-params'] },
                  controlSpecs: [{ key: 'elk.direction', persistNamespace: 'meta.elk' }],
                  capabilities: { rawDebugView: true },
                };
              }
              return {
                id: String(layoutEngine || 'v3'),
                hostView: { sidebarSections: [] },
                controlSpecs: [],
                capabilities: { rawDebugView: false },
              };
            }),
          },
          graph: {
            createPreviewEngineLayoutControlsRuntime: createGraphControlsRuntime,
            createPreviewEngineShellControllerRuntime: createGraphControllerRuntime,
          },
        },
      },
      PreviewEngineLayoutControls: previousControlsRuntime,
      PreviewEngineShellController: previousShellController,
    } as any;
    const document = {
      getElementById: vi.fn(() => null),
      querySelector: vi.fn(() => null),
    } as any;

    const options = createPreviewGridEditorInstallOptionsFromLegacyEditorHost({
      document,
      previewWindow,
      config: {
        slug: 'example-deployment-pipeline',
        engine: 'v3',
        gridEnabled: true,
        guideModes: ['off', 'all'],
        baselineStep: 24,
        inset: 8,
        guideColor: '#f00',
        guideOpacity: '0.5',
        interactionMode: { TEXT_EDITING: 'text', WAYPOINT_DRAGGING: 'waypoint' } as any,
        handleSize: 12,
        minNodeSize: 24,
        fallbackGap: 24,
        snapToGrid: (value) => value,
      },
      state: {
        model: model as any,
        interactionManager: { kind: 'manager' } as any,
        selectedIds: new Set<string>(),
        selectionDepthState: { get: vi.fn(() => 0), set: vi.fn() },
        coercedKeys: new Set<string>(),
        editorState: { kind: 'editor-state' } as any,
        previewSaveClient: { kind: 'save-client' } as any,
        generationState: { get: vi.fn(() => 7), set: vi.fn() },
        allowInternalDirtyNavigationState: { get: vi.fn(() => false), set: vi.fn() },
        constraints: { summarise: vi.fn(() => ({ total: 0 })) } as any,
        lastViolationsState: { get: vi.fn(() => []) },
        overridesState: { get: vi.fn(() => ({})), set: vi.fn() },
        multiActionGapState: { get: vi.fn(() => 24), set: vi.fn() },
        layoutRelayoutTimerState: { get: vi.fn(() => null), set: vi.fn() },
      },
      helpers: {
        applyInteractionOverrideEntries: vi.fn(),
      },
      modelOps: {
        getOwnDelta: vi.fn(() => ({ dx: 0, dy: 0, dw: 0, dh: 0 })),
        getEffectiveDelta: vi.fn(() => ({ dx: 0, dy: 0, dw: 0, dh: 0 })),
        getAncestors: vi.fn(() => []),
      },
      facades: {
        getEditorSceneFacade: vi.fn(() => ({
          deleteSelectedFrames: vi.fn(async () => ({ rerendered: true })),
          cycleGuideMode: vi.fn(),
          updateOverrideSummary: vi.fn(),
          refreshTreeColors: vi.fn(),
          runConstraints: vi.fn(),
          rerenderStageFromModel,
        })),
        getEditorRelayoutFacade: vi.fn(() => ({
          applyUndoCommand: vi.fn(),
          getRelayoutRuntime: vi.fn(() => ({ requestRelayout: vi.fn() })),
          scheduleResizeRelayout: vi.fn(() => false),
          cancelResizeRelayout: vi.fn(),
          persistResize: vi.fn(),
          getLayoutRelayoutStatus: vi.fn(() => ({})),
        })),
        getEditorInteractionFacade: vi.fn(() => ({
          getStageBindingRuntime: vi.fn(() => ({ buildTreeUi: vi.fn(), bindInteraction: vi.fn() })),
          getSelectionRuntime: vi.fn(() => ({
            deselectAll: vi.fn(),
            reapplySelection: vi.fn(),
            selectComponent: vi.fn(),
            applySelectionStateSnapshot: vi.fn(),
          })),
          getInspectorDisplayRuntime: vi.fn(() => ({
            renderEmptyInspector: vi.fn(),
            renderSelectionInspector: vi.fn(),
            renderMultiSelectionInspector: vi.fn(),
          })),
          getInspectorMutationRuntime: vi.fn(() => ({ setFrameProp: vi.fn() })),
          getResizeInteractionRuntime: vi.fn(() => ({ onResizeUp: vi.fn() })),
          getInspectorSelectionRuntime: vi.fn(() => ({
            applySelectionTargets: vi.fn(),
            distributeSelection: vi.fn(),
            alignSelection: vi.fn(),
            setMultiFrameAlign: vi.fn(),
            applyMultiStyleOverride: vi.fn(),
            setMultiFrameProp: vi.fn(),
            setMultiFrameSize: vi.fn(),
          })),
          getArrowWaypointRuntime: vi.fn(() => ({
            showArrowWaypointHandles: vi.fn(),
            startWaypointDrag: vi.fn(),
            onWaypointDragMove: vi.fn(),
            onWaypointDragUp: vi.fn(),
            addWaypoint: vi.fn(),
            removeWaypoint: vi.fn(),
            getArrowPoints: vi.fn(),
            updateArrowVisual: vi.fn(),
            rebuildArrowSvg: vi.fn(),
          })),
        })),
      },
    });
    createPreviewGridEditorInstallUnitFromEditorHost(options);
    previewWindow.__DG_previewRenderIntent = {
      engineId: 'elk-layered',
      pageDirection: null,
      frameOverrides: {},
      engineOverrides: {},
      gridOverrides: {},
    };

    await expect(previewWindow.__DG_rerenderPreviewEngineWorkspaceStage()).rejects.toThrow(
      'Unsupported ELK layered override keys: elk.radial.radius',
    );
    expect(committedLayoutEngines).toEqual(['elk-layered']);
    expect(createGraphControlsRuntime).toHaveBeenCalledTimes(1);
    expect(createGraphControllerRuntime).toHaveBeenCalledTimes(1);
    expect(readLayoutOperatorOverrideState(model)).toEqual({
      activeOperatorKey: 'v3',
      byOperator: {
        v3: { gap: 24 },
      },
    });
    expect(model.layoutOverrides).toEqual({ gap: 24 });
    expect(model.layoutOverrideNamespace).toBe('meta.v3');
    expect(previewWindow.PreviewEngineLayoutControls).toBe(previousControlsRuntime);
    expect(previewWindow.PreviewEngineShellController).toBe(previousShellController);
  });

  it('derives runtime callbacks from the compact editor-host contract', async () => {
    let capturedRuntimeOptions: Record<string, unknown> | null = null;

    const browserState = {
      replaceOverrides: vi.fn((nextOverrides: Record<string, unknown>) => nextOverrides),
      setDirty: vi.fn(),
      pruneLinkedRootGridOverrides: vi.fn(),
      restoreOverrideEntries: vi.fn(),
      clearPendingRestoreRuntime: vi.fn(),
      applyLocalRestoreRefresh: vi.fn(),
      setMultiActionGap: vi.fn(),
      setOverride: vi.fn(),
      setWaypointOverride: vi.fn(),
      cleanOverride: vi.fn(),
      getParentNode: vi.fn(() => null),
      getComponentNode: vi.fn(() => null),
      hasLayoutChildren: vi.fn(() => false),
      getArrowNode: vi.fn(() => null),
      getComponentType: vi.fn(() => 'box'),
      getViolationsForComponent: vi.fn(() => []),
      scheduleLayoutRelayout: vi.fn(),
      clearScheduledLayoutRelayout: vi.fn(),
    };
    const bootstrapFacade = {
      loadSvg: vi.fn(async () => 'loaded'),
      signalDiagramLoaded: vi.fn(() => 7),
      whenDiagramLoaded: vi.fn(async () => 11),
      syncBrowseNavToLocation: vi.fn(),
      attemptDiagramNavigation: vi.fn(() => true),
      loadTree: vi.fn(async () => 'tree-loaded'),
      bootstrapEditorRuntime: vi.fn(),
    };
    const sceneFacade = {
      loadGridInfo: vi.fn(async () => ({ gridInfo: { cols: 8 } })),
      cycleGuideMode: vi.fn(() => 'all'),
      renderGridOverlay: vi.fn(() => ({ kind: 'overlay' })),
      populateGridControls: vi.fn(() => ({ kind: 'controls' })),
      onGridControlChange: vi.fn(() => ({ kind: 'grid-change' })),
      refreshGridInfoFromLayout: vi.fn(() => ({ kind: 'grid-refresh' })),
      bindGridControls: vi.fn(),
      applyWaypointOverrides: vi.fn(() => 2),
      applyAllOverrides: vi.fn(() => true),
      autoFitArtboard: vi.fn(() => true),
      rerenderStageFromModel: vi.fn(async () => true),
      deleteSelectedFrames: vi.fn(async () => ({ rerendered: true })),
      updateOverrideSummary: vi.fn(),
      refreshTreeColors: vi.fn(),
      runConstraints: vi.fn(),
    };
    const relayoutRuntime = {
      requestRelayout: vi.fn(async () => 'relayouted'),
      clearOverride: vi.fn(),
    };
    const relayoutFacade = {
      applyUndoCommand: vi.fn(),
      getLayoutRelayoutStatus: vi.fn(() => ({ lastMode: 'local' })),
      getRelayoutRuntime: vi.fn(() => relayoutRuntime),
      finishRelayout: vi.fn(async () => 'finished'),
      failRelayout: vi.fn(() => 'failed'),
      scheduleResizeRelayout: vi.fn(() => true),
      cancelResizeRelayout: vi.fn(),
      persistResize: vi.fn(),
    };
    const stageBindingRuntime = {
      buildTreeUi: vi.fn(() => 'tree-ui'),
      bindInteraction: vi.fn(() => 'bound'),
    };
    const selectionRuntime = {
      deselectAll: vi.fn(),
      reapplySelection: vi.fn(),
      selectComponent: vi.fn(),
      applySelectionStateSnapshot: vi.fn(),
      syncSelectionUi: vi.fn(),
      clearSelection: vi.fn(),
    };
    const inspectorDisplayRuntime = {
      renderEmptyInspector: vi.fn(),
      renderSelectionInspector: vi.fn(),
      renderMultiSelectionInspector: vi.fn(),
      setWidthUnit: vi.fn(),
      setHeightUnit: vi.fn(),
      updateInspector: vi.fn(),
    };
    const inspectorMutationRuntime = {
      setFrameProp: vi.fn(),
      setFrameAlign: vi.fn(),
      setFrameSize: vi.fn(),
      applyStyle: vi.fn(),
    };
    const inspectorSelectionRuntime = {
      applySelectionTargets: vi.fn(),
      distributeSelection: vi.fn(),
      alignSelection: vi.fn(),
      setMultiFrameAlign: vi.fn(),
      applyMultiStyleOverride: vi.fn(),
      setMultiFrameProp: vi.fn(),
      setMultiFrameSize: vi.fn(),
    };
    const arrowWaypointRuntime = {
      showArrowWaypointHandles: vi.fn(),
      startWaypointDrag: vi.fn(),
      onWaypointDragMove: vi.fn(),
      onWaypointDragUp: vi.fn(),
      addWaypoint: vi.fn(),
      removeWaypoint: vi.fn(),
      getArrowPoints: vi.fn(() => [[0, 0]]),
      updateArrowVisual: vi.fn(),
      rebuildArrowSvg: vi.fn(),
    };
    const resizeInteractionRuntime = {
      startResize: vi.fn(),
      onResizeMove: vi.fn(),
      onResizeUp: vi.fn(),
    };
    const textEditRuntime = {
      startTextEdit: vi.fn(),
      commitTextEdit: vi.fn(),
      cancelTextEdit: vi.fn(),
    };
    const keyboardRuntime = {
      onDocumentKeyDown: vi.fn(),
    };
    const runtime = {
      getSceneFacade: vi.fn(() => sceneFacade),
      getBootstrapFacade: vi.fn(() => bootstrapFacade),
      getRelayoutFacade: vi.fn(() => relayoutFacade),
      getInteractionFacade: vi.fn(() => interactionFacade),
      invalidateOverrideBoundFacades: vi.fn(),
    };

    mocks.createBrowserState.mockReturnValue(browserState);
    mocks.createRuntime.mockImplementation((options: Record<string, unknown>) => {
      capturedRuntimeOptions = options;
      return runtime;
    });

    const interactionContract = {
      kind: 'interaction-contract',
      resolvePrimarySelectedId: vi.fn((_selectedIds: Set<string>, preferredCid?: string | null) => preferredCid || 'alpha'),
    };
    const previewWindow = {
      __DG_getPreviewBridgeRelayoutContract: vi.fn(() => ({ kind: 'relayout-contract' })),
      __DG_getPreviewShellInteractionContract: vi.fn(() => interactionContract),
    };
    const interactionFacade = {
      buildTreeUi: vi.fn(() => stageBindingRuntime.buildTreeUi()),
      bindInteraction: vi.fn(() => stageBindingRuntime.bindInteraction()),
      onSvgDoubleClick: vi.fn(),
      onSvgMouseDown: vi.fn(),
      onDragMove: vi.fn(),
      onDragUp: vi.fn(),
      showResizeHandles: vi.fn(() => true),
      removeResizeHandles: vi.fn(),
      startTextEdit: vi.fn(),
      commitTextEdit: vi.fn(),
      cancelTextEdit: vi.fn(),
      startResize: vi.fn(),
      onResizeMove: vi.fn(),
      onResizeUp: vi.fn(() => resizeInteractionRuntime.onResizeUp()),
      onDocumentKeyDown: vi.fn(),
      getStageBindingRuntime: vi.fn(() => stageBindingRuntime),
      getSelectionRuntime: vi.fn(() => selectionRuntime),
      getInspectorDisplayRuntime: vi.fn(() => inspectorDisplayRuntime),
      getInspectorMutationRuntime: vi.fn(() => inspectorMutationRuntime),
      getInspectorSelectionRuntime: vi.fn(() => inspectorSelectionRuntime),
      getArrowWaypointRuntime: vi.fn(() => arrowWaypointRuntime),
      getTextEditRuntime: vi.fn(() => textEditRuntime),
      getResizeInteractionRuntime: vi.fn(() => resizeInteractionRuntime),
      getKeyboardRuntime: vi.fn(() => keyboardRuntime),
    };
    const timerState = {
      current: null as unknown,
    };
    const setTimeoutFn = vi.fn((callback: () => void) => {
      timerState.current = callback;
      return callback;
    });

    const options = {
      shared: {
        document: {} as Document,
        previewWindow,
        slug: 'demo',
        engine: 'v3',
        gridEnabled: true,
        guideModes: ['off', 'all'],
        baselineStep: 24,
        model: { kind: 'model' },
        interactionManager: { kind: 'manager' },
        selectedIds: new Set<string>(['alpha', 'beta']),
        selectionDepthState: { get: vi.fn(() => 3), set: vi.fn() },
        coercedKeys: new Set<string>(),
        editorState: {
          undo: vi.fn(),
          redo: vi.fn(),
        },
        previewSaveClient: {
          trySaveIfDirty: vi.fn(),
        },
        generationState: { get: vi.fn(() => 7), set: vi.fn() },
        allowInternalDirtyNavigationState: { get: vi.fn(() => false), set: vi.fn() },
        constraints: { kind: 'constraints' },
        lastViolationsState: { get: vi.fn(() => []) },
      },
      state: {
        overridesState: {
          get: vi.fn(() => ({ alpha: { width: 120 } })),
          set: vi.fn(),
        },
        multiActionGapState: { get: vi.fn(() => 24), set: vi.fn() },
        layoutRelayoutTimerState: {
          get: vi.fn(() => timerState.current),
          set: vi.fn((value: unknown) => {
            timerState.current = value;
          }),
        },
        getMultiActionGapInput: vi.fn(() => null),
        setTimeoutFn,
        clearTimeoutFn: vi.fn(),
      },
      browser: {
        syncArrowsInModel: vi.fn(),
        arrowComponentId: vi.fn(() => 'arrow-alpha'),
        readRenderedStyleFields: vi.fn(() => ({ fill: '#fff' })),
        renderGuideLines: vi.fn(),
        clearGuideLines: vi.fn(),
        clearHandlesByClass: vi.fn(),
        renderResizeHandles: vi.fn(),
        collectPeerSnapTargets: vi.fn(() => []),
        collectGridSnapTargets: vi.fn(() => ({ xs: [24], ys: [48] })),
        snapRectToTargets: vi.fn(() => ({ dx: 0, dy: 0 })),
        fitRenderedSvgToContent: vi.fn(),
        escapeHtml: vi.fn((value: string) => value),
        initNavTabs: vi.fn(),
        setStatus: vi.fn(),
        sanitizeSvgCloneForExport: vi.fn(),
        applyInteractionOverrideEntries: vi.fn(),
        interactionMode: { TEXT_EDITING: 'text', WAYPOINT_DRAGGING: 'waypoint' },
        boxStyles: { default: { label: 'Default' } },
        inset: 8,
        iconSize: 48,
        handleSize: 12,
        textEditingMode: 'text',
        columnGap: 24,
        minNodeSize: 24,
        fallbackGap: 24,
        getInspector: vi.fn(() => ({ id: 'inspector' })),
        getTextAdapter: vi.fn(() => ({ name: 'adapter' })),
        renderBoxStyleOptions: vi.fn(() => '<option>default</option>'),
        formatAsDefinedStyleLabel: vi.fn(() => 'Defined'),
        snapToGrid: vi.fn((value: number) => value),
        alert: vi.fn(),
        normalizeStyleName: vi.fn((value: string) => value),
        waypointDraggingMode: 'waypoint',
        writeClipboardText: vi.fn(async () => undefined),
        requestAnimationFrameFn: vi.fn((callback: () => void) => {
          callback();
          return 17;
        }),
        cancelAnimationFrameFn: vi.fn(),
        theme: { headLen: 10, headHalf: 5, color: '#E95420' },
      },
      modelOps: {
        getOwnDelta: vi.fn(() => ({ dx: 0, dy: 0, dw: 0, dh: 0 })),
        getEffectiveDelta: vi.fn(() => ({ dx: 4, dy: 8, dw: 0, dh: 0 })),
        getAncestors: vi.fn(() => ['page']),
      },
      facades: {
        getEditorSceneFacade: vi.fn(() => sceneFacade),
        getEditorRelayoutFacade: vi.fn(() => relayoutFacade),
        getEditorInteractionFacade: vi.fn(() => interactionFacade),
      },
    } as any;

    const installUnit = createPreviewGridEditorInstallUnitFromEditorHost(options);
    expect(installUnit.getRuntime()).toBe(runtime);

    const runtimeBrowser = (capturedRuntimeOptions as { browser: Record<string, unknown> }).browser;
    expect(runtimeBrowser.getOwnDelta).toBe(options.modelOps.getOwnDelta);
    expect(runtimeBrowser.getEffectiveDelta).toBe(options.modelOps.getEffectiveDelta);
    expect(runtimeBrowser.getAncestors).toBe(options.modelOps.getAncestors);

    expect((runtimeBrowser.buildTreeUi as () => unknown)()).toBe('tree-ui');
    expect(stageBindingRuntime.buildTreeUi).toHaveBeenCalledTimes(1);
    (runtimeBrowser.bindInteraction as () => unknown)();
    expect(stageBindingRuntime.bindInteraction).toHaveBeenCalledTimes(1);
    (runtimeBrowser.renderSelectionInspector as (preferredCid?: string | null) => void)('alpha');
    expect(inspectorDisplayRuntime.renderSelectionInspector).toHaveBeenCalledWith('alpha');
    (runtimeBrowser.setFrameProp as (cid: string, prop: string, value: unknown) => void)('alpha', 'width', 120);
    expect(inspectorMutationRuntime.setFrameProp).toHaveBeenCalledWith('alpha', 'width', 120);
    expect(await (runtimeBrowser.deleteSelectedFrames as () => Promise<boolean>)()).toBe(true);
    expect(sceneFacade.deleteSelectedFrames).toHaveBeenCalledTimes(1);
    expect((runtimeBrowser.getPrimarySelectedId as (preferredCid?: string | null) => string | null | undefined)('beta'))
      .toBe('beta');
    expect(interactionContract.resolvePrimarySelectedId)
      .toHaveBeenCalledWith(options.shared.selectedIds, 'beta');

    (runtimeBrowser.scheduleTextRelayout as (cid: string) => void)('gamma');
    expect(setTimeoutFn).toHaveBeenCalledTimes(1);
    expect(typeof timerState.current).toBe('function');
    await (timerState.current as (() => Promise<unknown> | unknown))();
    expect(relayoutRuntime.requestRelayout).toHaveBeenCalledWith('gamma');

    (runtimeBrowser.requestRelayoutNow as (cid: string) => void)('delta');
    expect(relayoutRuntime.requestRelayout).toHaveBeenCalledWith('delta');
    (runtimeBrowser.save as () => void)();
    expect(options.shared.previewSaveClient.trySaveIfDirty).toHaveBeenCalledTimes(1);
    (runtimeBrowser.undo as () => void)();
    expect(options.shared.editorState.undo).toHaveBeenCalledWith(relayoutFacade.applyUndoCommand);
    (runtimeBrowser.redo as () => void)();
    expect(options.shared.editorState.redo).toHaveBeenCalledWith(relayoutFacade.applyUndoCommand);
    (runtimeBrowser.cycleGuideMode as () => void)();
    expect(sceneFacade.cycleGuideMode).toHaveBeenCalledTimes(1);
    (runtimeBrowser.onResizeUp as () => void)();
    expect(resizeInteractionRuntime.onResizeUp).toHaveBeenCalledTimes(1);
    (runtimeBrowser.updateOverrideSummary as () => void)();
    expect(sceneFacade.updateOverrideSummary).toHaveBeenCalledTimes(1);
    (runtimeBrowser.refreshTreeColors as () => void)();
    expect(sceneFacade.refreshTreeColors).toHaveBeenCalledTimes(1);
    (runtimeBrowser.runConstraints as () => unknown)();
    expect(sceneFacade.runConstraints).toHaveBeenCalledTimes(1);
    await expect(
      (runtimeBrowser.requestLayoutRelayout as (cid: string) => Promise<unknown>)('epsilon'),
    ).resolves.toBe('relayouted');

    const bootstrap = installUnit.getBootstrapFacade();
    const scene = installUnit.getSceneFacade();
    const relayout = installUnit.getRelayoutFacade();
    const interaction = installUnit.getInteractionFacade();
    const directRelayoutRuntime = relayout.getRelayoutRuntime();
    await expect(bootstrap.loadSvg({ preserveSelectionIds: ['alpha'] } as never)).resolves.toBe('loaded');
    expect(relayout.getLayoutRelayoutStatus()).toEqual({ lastMode: 'local' });
    await expect(relayout.finishRelayout('alpha', null, 'local')).resolves.toBe('finished');
    expect(relayout.failRelayout('broken', 'alpha')).toBe('failed');
    expect(await scene.deleteSelectedFrames()).toEqual({ rerendered: true });
    expect(interaction.getStageBindingRuntime().buildTreeUi()).toBe('tree-ui');
    interaction.onSvgDoubleClick({ kind: 'dbl' } as never);
    expect(interactionFacade.onSvgDoubleClick).toHaveBeenCalledTimes(1);
    interaction.startTextEdit('alpha', { kind: 'event' } as never, { textEl: null } as never);
    expect(interactionFacade.startTextEdit).toHaveBeenCalledTimes(1);
    interaction.showResizeHandles('alpha');
    expect(interactionFacade.showResizeHandles).toHaveBeenCalledWith('alpha');
    directRelayoutRuntime.requestRelayout('zeta');
    expect(relayoutRuntime.requestRelayout).toHaveBeenCalledWith('zeta');
    directRelayoutRuntime.clearOverride('alpha');
    expect(relayoutRuntime.clearOverride).toHaveBeenCalledWith('alpha');
    interactionContract.resolvePrimarySelectedId(options.shared.selectedIds, 'beta');
    expect(interactionContract.resolvePrimarySelectedId)
      .toHaveBeenCalledWith(options.shared.selectedIds, 'beta');
  });
});
