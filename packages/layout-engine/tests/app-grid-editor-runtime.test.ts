import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createBootstrapFacade: vi.fn(),
  createInteractionFacade: vi.fn(),
  createRelayoutFacade: vi.fn(),
  createSceneFacade: vi.fn(),
}));

vi.mock('../src/preview-shell/app-editor-bootstrap-facade.js', () => ({
  createPreviewEditorBootstrapFacadeFromRuntime: mocks.createBootstrapFacade,
}));

vi.mock('../src/preview-shell/app-editor-interaction-facade.js', () => ({
  createPreviewEditorInteractionFacadeFromBrowserHost: mocks.createInteractionFacade,
}));

vi.mock('../src/preview-shell/app-editor-relayout-facade.js', () => ({
  createPreviewEditorRelayoutFacadeFromRuntime: mocks.createRelayoutFacade,
}));

vi.mock('../src/preview-shell/app-editor-scene-facade.js', () => ({
  createPreviewEditorSceneFacadeFromRuntime: mocks.createSceneFacade,
}));

const {
  createPreviewGridEditorRuntimeFromBrowserHost,
} = await import('../src/preview-shell/app-grid-editor-runtime.js');

describe('createPreviewGridEditorRuntimeFromBrowserHost', () => {
  const sceneGridRuntime = {
    getGridInfo: vi.fn(() => ({ cols: 8 })),
  };
  const sceneFacade = {
    getGridRuntime: vi.fn(() => sceneGridRuntime),
    applyWaypointOverrides: vi.fn(),
    applyAllOverrides: vi.fn(),
    populateGridControls: vi.fn(),
    renderGridOverlay: vi.fn(),
    refreshGridInfoFromLayout: vi.fn(),
    updateOverrideSummary: vi.fn(),
    refreshTreeColors: vi.fn(),
    runConstraints: vi.fn(),
    rerenderStageFromModel: vi.fn(async () => true),
    autoFitArtboard: vi.fn(() => true),
    loadGridInfo: vi.fn(async () => ({ cols: 8 })),
  };
  const bootstrapFacade = {
    loadTree: vi.fn(async () => 'tree-loaded'),
  };
  const relayoutFacade = {
    layoutRuntimeState: { sequence: 7 },
    getLayoutRelayoutStatus: vi.fn(() => ({ localReady: true })),
    applyUndoCommand: vi.fn(),
  };
  const inspectorDisplayRuntime = {
    updateInspector: vi.fn(),
  };
  const arrowWaypointRuntime = {
    rebuildArrowSvg: vi.fn(),
  };
  const interactionFacade = {
    onDocumentKeyDown: vi.fn(),
    getInspectorDisplayRuntime: vi.fn(() => inspectorDisplayRuntime),
    getArrowWaypointRuntime: vi.fn(() => arrowWaypointRuntime),
  };

  const previewShellBootstrapContract = {
    isPreviewEngineShellLayoutActive: vi.fn(() => true),
    initPreviewEngineShellPanel: vi.fn(),
  };
  const previewShellSceneContract = {
    resolvePreviewGridInfo: vi.fn(() => ({ cols: 8 })),
    resolvePreviewGridInfoFromRuntimeState: vi.fn(() => ({ cols: 8 })),
    createGridOverlayScene: vi.fn(() => null),
    formatPreviewOverrideSummary: vi.fn((count: number) => `${count} overrides`),
    syncPreviewTreeOverrideState: vi.fn(),
    syncPreviewTreeSelectionState: vi.fn(),
    syncPreviewConstraintStatus: vi.fn(),
  };
  const previewShellInspectorContract = {
    bindPreviewInspectorActions: vi.fn(),
  };
  const previewShellInteractionContract = {
    collectPreviewSnapTargets: vi.fn(() => ({ xs: [24], ys: [48] })),
    isAutolayoutParentLayout: vi.fn(() => false),
    resolvePreviewDragSnap: vi.fn(() => ({ dx: 4, dy: 8, lines: [] })),
    normalizeSelectionGap: vi.fn((gap: number) => gap),
    resolveSelectionDistributeTargets: vi.fn(() => ({})),
    resolveSelectionAlignTargets: vi.fn(() => ({})),
    createSelectionTargetOverrideEntries: vi.fn(() => ({})),
  };
  const previewBridgeRenderContract = {
    renderFreshPreviewSvg: vi.fn(),
    readPreviewRenderedComponentBounds: vi.fn(() => null),
    readPreviewArrowEndpoints: vi.fn(() => null),
    updatePreviewArrowSvg: vi.fn(),
    rebuildPreviewArrowSvg: vi.fn(),
  };
  const previewBridgeHostContract = {
    getPreviewDocumentJson: vi.fn(() => ({ version: 1 })),
    getFrameTreeJson: vi.fn(() => ({ root: { id: 'page' } })),
    getLocalRelayoutStatus: vi.fn(() => ({ ready: true })),
    performLocalRelayout: vi.fn(() => ({ rerendered: true })),
  };
  const previewBridgeRelayoutContract = {
    isPreviewFrameManagedTarget: vi.fn(() => false),
    hasPreviewRelayoutFrameOverride: vi.fn(() => false),
    hasV3FrameOverride: vi.fn(() => false),
  };

  function createOptions() {
    const requestLayoutRelayout = vi.fn(async () => undefined);
    const browser = {
      getOverrides: vi.fn(() => ({ alpha: { dx: 8 } })),
      replaceOverrides: vi.fn(),
      syncArrowsInModel: vi.fn(),
      arrowComponentId: vi.fn(() => 'arrow-alpha'),
      pruneLinkedRootGridOverrides: vi.fn(),
      clearPendingRestoreRuntime: vi.fn(),
      applyLocalRestoreRefresh: vi.fn(),
      buildTreeUi: vi.fn(),
      bindInteraction: vi.fn(),
      deselectAll: vi.fn(),
      reapplySelection: vi.fn(),
      renderEmptyInspector: vi.fn(),
      renderSelectionInspector: vi.fn(),
      renderMultiSelectionInspector: vi.fn(),
      selectComponent: vi.fn(),
      applySelectionStateSnapshot: vi.fn(),
      getPrimarySelectedId: vi.fn(() => 'alpha'),
      deleteSelectedFrames: vi.fn(async () => undefined),
      getOwnDelta: vi.fn(() => ({ dx: 0, dy: 0, dw: 0, dh: 0 })),
      getEffectiveDelta: vi.fn(() => ({ dx: 0, dy: 0, dw: 0, dh: 0 })),
      getAncestors: vi.fn(() => ['page']),
      getParentNode: vi.fn(() => ({ layout: 'column' })),
      getComponentNode: vi.fn(() => ({ id: 'alpha' })),
      getComponentType: vi.fn(() => 'box'),
      getArrowNode: vi.fn(() => ({ waypoints: [] })),
      getViolationsForComponent: vi.fn(() => []),
      readRenderedStyleFields: vi.fn(() => ({ fill: '#fff' })),
      renderGuideLines: vi.fn(),
      clearGuideLines: vi.fn(),
      clearHandlesByClass: vi.fn(),
      renderResizeHandles: vi.fn(),
      collectPeerSnapTargets: vi.fn(() => []),
      collectGridSnapTargets: vi.fn(() => ({ xs: [24], ys: [48] })),
      snapRectToTargets: vi.fn(() => ({ dx: 0, dy: 0 })),
      fitRenderedSvgToContent: vi.fn(),
      escapeHtml: vi.fn((value: string) => `escaped:${value}`),
      initNavTabs: vi.fn(),
      setDirty: vi.fn(),
      setStatus: vi.fn(),
      sanitizeSvgCloneForExport: vi.fn(),
      applyInteractionOverrideEntries: vi.fn(),
      setOverride: vi.fn(),
      cleanOverride: vi.fn(),
      setWaypointOverride: vi.fn(),
      setFrameProp: vi.fn(),
      scheduleTextRelayout: vi.fn(),
      scheduleLayoutResizeRelayout: vi.fn(() => true),
      scheduleV3ResizeRelayout: vi.fn(() => true),
      cancelLiveRelayout: vi.fn(),
      persistResize: vi.fn(),
      save: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      onResizeUp: vi.fn(),
      cycleGuideMode: vi.fn(),
      requestLayoutRelayout,
      interactionMode: {
        TEXT_EDITING: 'text',
        DRAGGING: 'drag',
        RESIZING: 'resize',
        WAYPOINT_DRAGGING: 'waypoint',
      },
      boxStyles: { default: { label: 'Default' } },
      inset: 8,
      iconSize: 48,
      handleSize: 12,
      textEditingMode: 'text',
      columnGap: 24,
      hasLayoutChildren: vi.fn(() => false),
      minNodeSize: 24,
      fallbackGap: 24,
      multiActionGapState: {
        get: vi.fn(() => 24),
        set: vi.fn(),
      },
      getInspector: vi.fn(() => ({ id: 'inspector' })),
      getTextAdapter: vi.fn(() => ({ name: 'adapter' })),
      renderBoxStyleOptions: vi.fn(() => '<option>default</option>'),
      formatAsDefinedStyleLabel: vi.fn(() => 'Defined'),
      snapToGrid: vi.fn((value: number) => value),
      scheduleRelayout: vi.fn(),
      requestRelayoutNow: vi.fn(),
      updateOverrideSummary: vi.fn(),
      refreshTreeColors: vi.fn(),
      runConstraints: vi.fn(),
      alert: vi.fn(),
      normalizeStyleName: vi.fn((styleName: string) => styleName),
      waypointDraggingMode: 'waypoint',
      writeClipboardText: vi.fn(async () => undefined),
      requestAnimationFrameFn: vi.fn((callback: () => void) => {
        callback();
        return 17;
      }),
      cancelAnimationFrameFn: vi.fn(),
      theme: {
        headLen: 10,
        headHalf: 5,
        color: '#E95420',
      },
    };

    return {
      browser,
      shared: {
        document: {
          getElementById: vi.fn(() => ({ id: 'stage' })),
        } as unknown as Document,
        previewWindow: {
          setTimeout: vi.fn((callback: () => void) => {
            callback();
            return 1;
          }),
          clearTimeout: vi.fn(),
          confirm: vi.fn(() => true),
          __DG_getPreviewShellBootstrapContract: () => previewShellBootstrapContract,
          __DG_getPreviewShellSceneContract: () => previewShellSceneContract,
          __DG_getPreviewShellInspectorContract: () => previewShellInspectorContract,
          __DG_getPreviewShellInteractionContract: () => previewShellInteractionContract,
          __DG_getPreviewBridgeRenderContract: () => previewBridgeRenderContract,
          __DG_getPreviewBridgeHostContract: () => previewBridgeHostContract,
          __DG_getPreviewBridgeRelayoutContract: () => previewBridgeRelayoutContract,
        } as unknown as Window & typeof globalThis,
        slug: 'demo',
        engine: 'v3',
        gridEnabled: true,
        guideModes: ['off', 'all'],
        baselineStep: 24,
        model: {
          _roots: [{ data: { id: 'alpha' }, id: 'alpha', type: 'box', gridRow: 1 }],
          roots: [{ id: 'alpha' }],
          diagramGrid: null,
          gridOverrides: { cols: 8 },
          layoutOverrides: {},
          removedIds: new Set<string>(),
          setDiagramGrid: vi.fn(),
          clearOverride: vi.fn(),
          get: vi.fn(() => ({ data: { id: 'alpha' } })),
        },
        interactionManager: {
          state: { cid: 'alpha' },
          isMode: vi.fn(() => false),
        },
        selectedIds: new Set<string>(['alpha']),
        selectionDepthState: {
          get: vi.fn(() => 2),
          set: vi.fn(),
        },
        coercedKeys: new Set<string>(['alpha:sizing_w']),
        editorState: {
          cloneValue: <T>(value: T) => value,
          captureOverrideEntries: vi.fn(() => ({ alpha: { dx: 8 } })),
          serializeDirtyState: vi.fn(() => '{"ok":true}'),
          normalizeGridOverrides: vi.fn(<T>(value: T) => value),
          commitOverridePatchAction: vi.fn(),
          beginUndoableAction: vi.fn(() => ({})),
          commitUndoableAction: vi.fn(),
          runUndoableAction: vi.fn((_label: string, mutate: () => unknown) => mutate()),
          clearUndoHistory: vi.fn(),
          getPendingGridAction: vi.fn(() => null),
          setPendingGridAction: vi.fn(),
          undo: vi.fn(async () => undefined),
          redo: vi.fn(async () => undefined),
        },
        previewSaveClient: {
          isDirty: vi.fn(() => false),
          trySaveIfDirty: vi.fn(),
          syncSaveButton: vi.fn(),
          syncDirtyFromSerialized: vi.fn(),
          markSaved: vi.fn(),
        },
        generationState: {
          get: vi.fn(() => 3),
          set: vi.fn(),
        },
        allowInternalDirtyNavigationState: {
          get: vi.fn(() => false),
          set: vi.fn(),
        },
        constraints: {
          validate: vi.fn(() => []),
          summarise: vi.fn(() => ({ errors: 0 })),
        },
        lastViolationsState: {
          get: vi.fn(() => ['violation']),
          set: vi.fn(),
        },
      },
    };
  }

  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    Object.values(sceneFacade).forEach((value) => {
      if (typeof value === 'function' && 'mockClear' in value) {
        value.mockClear();
      }
    });
    Object.values(bootstrapFacade).forEach((value) => {
      if (typeof value === 'function' && 'mockClear' in value) {
        value.mockClear();
      }
    });
    Object.values(relayoutFacade).forEach((value) => {
      if (typeof value === 'function' && 'mockClear' in value) {
        value.mockClear();
      }
    });
    Object.values(interactionFacade).forEach((value) => {
      if (typeof value === 'function' && 'mockClear' in value) {
        value.mockClear();
      }
    });
    inspectorDisplayRuntime.updateInspector.mockClear();
    arrowWaypointRuntime.rebuildArrowSvg.mockClear();

    mocks.createSceneFacade.mockReturnValue(sceneFacade);
    mocks.createBootstrapFacade.mockReturnValue(bootstrapFacade);
    mocks.createRelayoutFacade.mockReturnValue(relayoutFacade);
    mocks.createInteractionFacade.mockReturnValue(interactionFacade);
  });

  it('lazily composes the four facade owners and invalidates only override-bound caches', () => {
    const runtime = createPreviewGridEditorRuntimeFromBrowserHost(createOptions());

    expect(mocks.createSceneFacade).not.toHaveBeenCalled();
    expect(runtime.getSceneFacade()).toBe(sceneFacade);
    expect(runtime.getSceneFacade()).toBe(sceneFacade);
    expect(mocks.createSceneFacade).toHaveBeenCalledTimes(1);

    expect(runtime.getBootstrapFacade()).toBe(bootstrapFacade);
    expect(runtime.getRelayoutFacade()).toBe(relayoutFacade);
    expect(runtime.getInteractionFacade()).toBe(interactionFacade);
    expect(mocks.createBootstrapFacade).toHaveBeenCalledTimes(1);
    expect(mocks.createRelayoutFacade).toHaveBeenCalledTimes(1);
    expect(mocks.createInteractionFacade).toHaveBeenCalledTimes(1);

    runtime.invalidateOverrideBoundFacades();

    expect(runtime.getSceneFacade()).toBe(sceneFacade);
    expect(runtime.getBootstrapFacade()).toBe(bootstrapFacade);
    expect(runtime.getRelayoutFacade()).toBe(relayoutFacade);
    expect(runtime.getInteractionFacade()).toBe(interactionFacade);
    expect(mocks.createSceneFacade).toHaveBeenCalledTimes(1);
    expect(mocks.createBootstrapFacade).toHaveBeenCalledTimes(2);
    expect(mocks.createRelayoutFacade).toHaveBeenCalledTimes(2);
    expect(mocks.createInteractionFacade).toHaveBeenCalledTimes(2);
  });

  it('wires cross-facade callbacks through the typed runtime owner', async () => {
    const options = createOptions();
    const runtime = createPreviewGridEditorRuntimeFromBrowserHost(options);

    runtime.getSceneFacade();
    runtime.getBootstrapFacade();
    runtime.getRelayoutFacade();
    runtime.getInteractionFacade();

    const sceneOptions = mocks.createSceneFacade.mock.calls[0]?.[0] as any;
    const bootstrapOptions = mocks.createBootstrapFacade.mock.calls[0]?.[0] as any;
    const relayoutOptions = mocks.createRelayoutFacade.mock.calls[0]?.[0] as any;
    const interactionOptions = mocks.createInteractionFacade.mock.calls[0]?.[0] as any;

    expect(sceneOptions.shared.slug).toBe('demo');
    sceneOptions.gridRuntime.requestRelayout('alpha');
    expect(options.browser.requestLayoutRelayout).toHaveBeenCalledWith('alpha');

    relayoutOptions.runtime.updateInspector('alpha');
    expect(interactionFacade.getInspectorDisplayRuntime).toHaveBeenCalled();
    expect(inspectorDisplayRuntime.updateInspector).toHaveBeenCalledWith('alpha');

    relayoutOptions.runtime.rebuildArrowSvg('alpha');
    expect(interactionFacade.getArrowWaypointRuntime).toHaveBeenCalled();
    expect(arrowWaypointRuntime.rebuildArrowSvg).toHaveBeenCalledWith('alpha');

    bootstrapOptions.runtimeBootstrap.onDocumentKeyDown('event');
    expect(interactionFacade.onDocumentKeyDown).toHaveBeenCalledWith('event');

    bootstrapOptions.runtimeBootstrap.applyUndoCommand('command', 'undo');
    expect(relayoutFacade.applyUndoCommand).toHaveBeenCalledWith('command', 'undo');

    expect(
      interactionOptions.contracts.previewShellScene.syncPreviewTreeSelectionState,
    ).toBe(previewShellSceneContract.syncPreviewTreeSelectionState);
    expect(interactionOptions.browser.getPreviewGridInfo()).toEqual({ cols: 8 });
    expect(interactionOptions.browser.getResizeCompletionRelayoutPolicy()).toBe('engine');
    previewShellBootstrapContract.isPreviewEngineShellLayoutActive.mockReturnValueOnce(false);
    expect(interactionOptions.browser.getResizeCompletionRelayoutPolicy()).toBe('local');

    await bootstrapOptions.runtimeBootstrap.writeClipboardText('copy');
    expect(options.browser.writeClipboardText).toHaveBeenCalledWith('copy');
  });

  it('hydrates active-engine layout overrides from namespaced frame YAML on reset', () => {
    const options = createOptions();
    options.shared.model.layoutOverrides = { stale: true };
    options.shared.previewWindow.__DG_getPreviewBridgeHostContract = () => ({
      ...previewBridgeHostContract,
      getFrameTreeJson: () => ({
        layoutEngine: 'dagre',
        elkLayout: {
          'elk.spacing.nodeNode': 64,
        },
        engineLayout: {
          'meta.dagre': {
            'dagre.rankdir': 'LR',
            'dagre.ranksep': 128,
          },
          'meta.elk': {
            'elk.spacing.nodeNode': 64,
          },
        },
      }),
    });

    const runtime = createPreviewGridEditorRuntimeFromBrowserHost(options);
    runtime.getBootstrapFacade();

    const bootstrapOptions = mocks.createBootstrapFacade.mock.calls[0]?.[0] as any;
    bootstrapOptions.svgLoad.resetOverrideState();

    expect(options.browser.replaceOverrides).toHaveBeenCalledWith({});
    expect(options.shared.model.layoutOverrides).toEqual({
      'dagre.rankdir': 'LR',
      'dagre.ranksep': 128,
    });
    expect(options.shared.model.layoutOverrideNamespace).toBe('meta.dagre');
  });

  it('syncs render intent and workspace chrome from restored undo frame-tree state', () => {
    const options = createOptions();
    const syncChrome = vi.fn();
    const syncPanels = vi.fn();
    options.shared.previewWindow.__DG_CONFIG = {
      active_engine_id: 'elk-force',
      layout_engine: 'elk-force',
      persisted_layout_engine: 'elk-force',
      document_kind: 'frame-diagram',
    };
    options.shared.previewWindow.__DG_syncPreviewEngineWorkspaceChrome = syncChrome;
    options.shared.previewWindow.__DG_syncPreviewEngineWorkspacePanels = syncPanels;
    options.shared.model.layoutOverrides = { 'dagre.rankdir': 'LR' };
    options.shared.model.gridOverrides = { cols: 5 };

    const runtime = createPreviewGridEditorRuntimeFromBrowserHost(options);
    runtime.getRelayoutFacade();

    const relayoutOptions = mocks.createRelayoutFacade.mock.calls[0]?.[0] as any;
    relayoutOptions.runtime.syncRestoredFrameTreeState({
      layoutEngine: 'dagre',
      root: { id: 'root', direction: 'HORIZONTAL' },
    });

    expect(options.shared.previewWindow.__DG_CONFIG).toEqual(expect.objectContaining({
      active_engine_id: 'dagre',
      layout_engine: 'dagre',
      persisted_layout_engine: 'elk-force',
    }));
    expect(options.shared.previewWindow.__DG_previewRenderIntent).toEqual(expect.objectContaining({
      engineId: 'dagre',
      pageDirection: 'HORIZONTAL',
      engineOverrides: { 'dagre.rankdir': 'LR' },
      gridOverrides: { cols: 5 },
    }));
    expect(syncChrome).toHaveBeenCalledTimes(1);
    expect(syncPanels).toHaveBeenCalledTimes(1);
  });
});
