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

describe('createPreviewGridEditorInstallUnitFromEditorHost', () => {
  beforeEach(() => {
    mocks.createBrowserState.mockReset();
    mocks.createRuntime.mockReset();
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

    const compat = installUnit.getCompatFacade();
    await expect(compat.loadSvg({ preserveSelectionIds: ['alpha'] } as never)).resolves.toBe('loaded');
    expect(compat.getLayoutRelayoutStatus()).toEqual({ lastMode: 'local' });
    await expect(compat.finishRelayout('alpha', null, 'local')).resolves.toBe('finished');
    expect(compat.failRelayout('broken', 'alpha')).toBe('failed');
    expect(await compat.deleteSelectedFrames()).toBe(true);
    expect(compat.buildTreeUi()).toBe('tree-ui');
    compat.onSvgDoubleClick({ kind: 'dbl' } as never);
    expect(interactionFacade.onSvgDoubleClick).toHaveBeenCalledTimes(1);
    compat.startTextEdit('alpha', { kind: 'event' } as never, { textEl: null } as never);
    expect(interactionFacade.startTextEdit).toHaveBeenCalledTimes(1);
    compat.showResizeHandles('alpha');
    expect(interactionFacade.showResizeHandles).toHaveBeenCalledWith('alpha');
    compat.requestLayoutRelayout('zeta');
    expect(relayoutRuntime.requestRelayout).toHaveBeenCalledWith('zeta');
    compat.clearOverride('alpha');
    expect(relayoutRuntime.clearOverride).toHaveBeenCalledWith('alpha');
    compat.getPrimarySelectedId('beta');
    expect(interactionContract.resolvePrimarySelectedId)
      .toHaveBeenCalledWith(options.shared.selectedIds, 'beta');
  });
});
