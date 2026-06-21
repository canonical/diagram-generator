import { beforeEach, describe, expect, it, vi } from 'vitest';

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
        requestV3Relayout: vi.fn(),
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
