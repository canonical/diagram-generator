import { describe, expect, it, vi } from 'vitest';
import {
  createPreviewEditorInteractionFacadeFromBrowserHost,
  createPreviewEditorInteractionFacadeFromEditorHost,
} from '../src/preview-shell/app-editor-interaction-facade.js';

describe('preview editor interaction facade', () => {
  it('lazily composes interaction runtimes and runtime-set ownership behind one typed host seam', () => {
    const document = {
      activeElement: null,
      addEventListener() {},
      removeEventListener() {},
      getElementById() {
        return null;
      },
      querySelector() {
        return null;
      },
    } as unknown as Document;

    const selectedIds = new Set<string>(['alpha']);
    const model = {
      _roots: [],
      overrides: {},
      get() {
        return {
          type: 'box',
          data: {
            id: 'alpha',
            heading_text: 'Heading',
            label_text: ['Body'],
          },
          children: [],
        };
      },
      getParent() {
        return null;
      },
      getSiblings() {
        return [];
      },
      relayoutChildren() {
        return {};
      },
      relayoutSiblingsAfterChildResize() {
        return {};
      },
      cleanOverride() {},
    };
    const interactionManager = {
      state: null,
      suppressHover: false,
      isBusy: false,
      isMode() {
        return false;
      },
      startDrag() {},
      startResize() {},
      startTextEdit() {},
      endInteraction() {},
    };

    const facade = createPreviewEditorInteractionFacadeFromEditorHost({
      stageBinding: {
        document,
        model,
        getOverrides: () => ({}),
        selectedIds,
        selectComponent() {},
        deleteSelectedFrames() {
          return Promise.resolve();
        },
        interactionManager,
        selectionDepthState: {
          get: () => 0,
        },
        onMouseDown() {},
        onDoubleClick() {},
        findArrowAtPoint() {
          return null;
        },
        findComponentAtDepth() {
          return null;
        },
        syncHoverState() {},
        clearHoverState() {},
      },
      pointerInteraction: {
        document,
        model,
        interactionManager,
        interactionMode: {
          DRAGGING: 'dragging',
          TEXT_EDITING: 'text',
        },
        selectedIds,
        selectionDepthState: {
          get: () => 0,
          set() {},
        },
        previewShellInspector: {
          findPreviewEditableTextTarget() {
            return null;
          },
          resolvePreviewEditableComponentId() {
            return '';
          },
        },
        previewShellInteraction: {
          clampPreviewDragDeltaWithinParent() {
            return { dx: 0, dy: 0 };
          },
        },
        getAncestors() {
          return [];
        },
        applySelectionState() {},
        selectComponent() {},
        onDragUp() {},
        findArrowAtPoint() {
          return null;
        },
        findDeepestComponent() {
          return null;
        },
        findComponentAtDepth() {
          return null;
        },
        deselectAll() {},
        getOwnDelta() {
          return { dx: 0, dy: 0, dw: 0, dh: 0 };
        },
        collectSnapTargets() {
          return [];
        },
        isAutolayoutChild() {
          return false;
        },
        captureOverrideEntries() {
          return [];
        },
        baselineStep: 24,
        showReorderIndicator() {},
        clearReorderIndicator() {},
        resolveSnap() {
          return { dx: 0, dy: 0, lines: [] };
        },
        renderGuideLines() {},
        setOverride() {},
        applyAllOverrides() {},
        updateInspector() {},
        shouldUpdateInspector() {
          return false;
        },
        getParentNode() {
          return null;
        },
        getComponentNode() {
          return null;
        },
        getEffectiveDelta() {
          return { dx: 0, dy: 0, dw: 0, dh: 0 };
        },
        inset: 24,
      },
      selectionChrome: {
        document,
        selectedIds,
        getMultiResizeSelection() {
          return null;
        },
        getRenderedComponentBounds() {
          return null;
        },
        getComponentType() {
          return 'box';
        },
        clearHandlesByClass() {},
        resolveHandlePlan() {
          return null;
        },
        renderResizeHandles() {},
        handleSize: 8,
      },
      textEdit: {
        document,
        model,
        interactionManager,
        textEditingMode: 'text',
        iconSize: 48,
        columnGap: 24,
        setTextOverride() {},
        captureOverrideEntries() {
          return {};
        },
        commitOverridePatchAction() {},
        reapplySelection() {},
        scheduleRelayout() {},
      },
      resizeInteraction: {
        document,
        model,
        interactionManager,
        interactionMode: {
          RESIZING: 'resizing',
        },
        selectedIds,
        getAncestors() {
          return [];
        },
        getOwnDelta() {
          return { dx: 0, dy: 0, dw: 0, dh: 0 };
        },
        getEffectiveDelta() {
          return { dx: 0, dy: 0, dw: 0, dh: 0 };
        },
        hasLayoutChildren() {
          return false;
        },
        isAutolayoutChild() {
          return false;
        },
        resolvePrimaryId() {
          return 'alpha';
        },
        minNodeSize: 8,
        captureOverrideEntries() {
          return {};
        },
        gridTargets() {
          return [];
        },
        snapStep: 24,
        renderGuideLines() {},
        clearGuideLines() {},
        applyInteractionOverrideEntries() {},
        applyAllOverrides() {},
        renderSelectionInspector() {},
        updateInspector() {},
        setOverride() {},
        scheduleLayoutResizeRelayout() {
          return false;
        },
        scheduleV3ResizeRelayout() {
          return false;
        },
        cancelLiveRelayout() {},
        clearPreviewSvgHoverState() {},
        cleanOverride() {},
        reapplySelection() {},
        selectComponent() {},
        commitOverridePatchAction() {},
        persistResize() {},
        autoFitArtboard() {},
      },
      keyboard: {
        document,
        selectedIds,
        selectionDepthState: {
          get: () => 0,
        },
        interactionManager,
        interactionModes: {
          TEXT_EDITING: 'text',
          DRAGGING: 'dragging',
          RESIZING: 'resizing',
        },
        isAutolayoutChild() {
          return false;
        },
        save() {},
        undo() {},
        redo() {},
        deleteSelection() {},
        clearGuideLines() {},
        onDragUp() {},
        onResizeUp() {},
        cycleGuideMode() {},
        model,
        getParentId() {
          return null;
        },
        getAncestorDepth() {
          return 0;
        },
        selectComponent() {},
        applySelectionState() {},
        captureOverrideEntries() {
          return {};
        },
        commitOverridePatchAction() {},
        getOwnDelta() {
          return { dx: 0, dy: 0, dw: 0, dh: 0 };
        },
        applyInteractionOverrideEntries() {},
        applyAllOverrides() {},
      },
      editorRuntimeSet: {
        document,
        selectedIds,
        selectionDepthState: {
          get: () => 0,
          set() {},
        },
        getPrimarySelectedId() {
          return 'alpha';
        },
        getAncestors() {
          return [];
        },
        previewShellScene: {
          syncPreviewTreeSelectionState() {},
        },
        previewShellInteraction: {
          normalizeSelectionGap(value: unknown) {
            return value;
          },
          resolveSelectionDistributeTargets() {
            return [];
          },
          resolveSelectionAlignTargets() {
            return [];
          },
          createSelectionTargetOverrideEntries() {
            return [];
          },
        },
        previewBridgeRender: {
          readPreviewArrowEndpoints() {
            return null;
          },
          updatePreviewArrowSvg() {},
          rebuildPreviewArrowSvg() {},
        },
        model,
        getOverrides: () => ({}),
        coercedKeys: new Set<string>(),
        previewGridRuntime: {
          getGridInfo() {
            return null;
          },
        },
        baselineStep: 24,
        fallbackGap: 24,
        multiActionGapState: {
          get: () => 24,
          set() {},
        },
        getInspector() {
          return {
            innerHTML: '',
            querySelector() {
              return null;
            },
          };
        },
        getSelectionActionInfo() {
          return {
            count: 1,
          };
        },
        getArrowNode() {
          return null;
        },
        getOwnDelta() {
          return { dx: 0, dy: 0, dw: 0, dh: 0 };
        },
        getEffectiveDelta() {
          return { dx: 0, dy: 0, dw: 0, dh: 0 };
        },
        getComponentType() {
          return 'box';
        },
        getParentNode() {
          return null;
        },
        getViolations() {
          return [];
        },
        readRenderedStyleFields() {
          return null;
        },
        getTextAdapter: null,
        escapeHtml: null,
        renderBoxStyleOptions() {
          return '';
        },
        formatAsDefinedStyleLabel() {
          return '';
        },
        editorState: {
          captureOverrideEntries() {
            return {};
          },
          commitOverridePatchAction() {},
        },
        renderEmptyInspector() {},
        renderSelectionInspector() {},
        renderMultiSelectionInspector() {},
        snapToGrid(value: number) {
          return value;
        },
        setDirty() {},
        scheduleRelayout() {},
        requestRelayoutNow() {},
        applyAllOverrides() {},
        reapplySelection() {},
        updateOverrideSummary() {},
        refreshTreeColors() {},
        runConstraints() {},
        setOverride() {},
        alert() {},
        normalizeStyleName(value: string) {
          return value;
        },
        interactionManager,
        waypointDraggingMode: 'waypoint',
        persistWaypointOverride() {},
        theme: {
          headLen: 10,
          headHalf: 5,
          color: '#E95420',
        },
      },
    });

    expect(facade.getStageBindingRuntime()).toBe(facade.getStageBindingRuntime());
    expect(facade.getPointerInteractionRuntime()).toBe(facade.getPointerInteractionRuntime());
    expect(facade.getSelectionChromeRuntime()).toBe(facade.getSelectionChromeRuntime());
    expect(facade.getTextEditRuntime()).toBe(facade.getTextEditRuntime());
    expect(facade.getResizeInteractionRuntime()).toBe(facade.getResizeInteractionRuntime());
    expect(facade.getKeyboardRuntime()).toBe(facade.getKeyboardRuntime());
    expect(facade.getEditorRuntimeSet()).toBe(facade.getEditorRuntimeSet());
    expect(facade.getSelectionRuntime()).toBe(facade.getEditorRuntimeSet().selection);
    expect(facade.getInspectorDisplayRuntime()).toBe(facade.getEditorRuntimeSet().inspectorDisplay);
    expect(facade.getInspectorMutationRuntime()).toBe(facade.getEditorRuntimeSet().inspectorMutation);
    expect(facade.getInspectorSelectionRuntime()).toBe(facade.getEditorRuntimeSet().inspectorSelection);
    expect(facade.getArrowWaypointRuntime()).toBe(facade.getEditorRuntimeSet().arrowWaypoint);

    expect(() => facade.onSvgDoubleClick({
      target: { classList: { contains: vi.fn(() => false) } },
      clientX: 0,
      clientY: 0,
    })).not.toThrow();
    expect(() => facade.onSvgMouseDown({
      button: 0,
      target: { classList: { contains: vi.fn(() => false) } },
      clientX: 0,
      clientY: 0,
    })).not.toThrow();
    expect(() => facade.onDragMove({ clientX: 0, clientY: 0 })).not.toThrow();
    expect(() => facade.removeResizeHandles()).not.toThrow();
    expect(() => facade.commitTextEdit()).not.toThrow();
    expect(() => facade.cancelTextEdit()).not.toThrow();
    expect(() => facade.onResizeMove({ clientX: 0, clientY: 0 } as MouseEvent)).not.toThrow();
    expect(() => facade.onResizeUp()).not.toThrow();
    expect(() => facade.onDocumentKeyDown({
      key: 'Escape',
      target: { tagName: 'DIV', isContentEditable: false },
      preventDefault() {},
    })).not.toThrow();
  });

  it('records state-vector diagnostics for inspector mutations outside the engine-tab lane', () => {
    let dirty = false;
    let canUndo = false;
    const overrides: Record<string, Record<string, unknown>> = {};
    let stageViewBox = '-24 -24 256 180';
    const stageSvg = {
      getAttribute(name: string) {
        if (name === 'data-layout-engine') return 'v3';
        if (name === 'viewBox') return stageViewBox;
        return null;
      },
    };
    const selectedTab = {
      getAttribute(name: string) {
        if (name === 'data-engine-id') return 'v3';
        if (name === 'aria-selected') return 'true';
        return null;
      },
    };
    const document = {
      activeElement: null,
      defaultView: {
        __DG_previewRenderIntent: {
          engineId: 'v3',
          pageDirection: null,
          frameOverrides: {},
          engineOverrides: {},
          gridOverrides: {},
        },
        __DG_CONFIG: {
          active_engine_id: 'v3',
          layout_engine: 'v3',
          document_kind: 'frame-diagram',
        },
        __DG_activeLayoutOperatorKey: 'v3',
        __DG_getPreviewBridgeHostContract: () => ({
          getFrameTreeJson: () => ({ layoutEngine: 'v3' }),
        }),
        PreviewSaveClient: {
          isDirty: () => dirty,
        },
      },
      addEventListener() {},
      removeEventListener() {},
      getElementById(id: string) {
        if (id === 'btn-undo') return { disabled: !canUndo };
        if (id === 'btn-redo') return { disabled: true };
        return null;
      },
      querySelector(selector: string) {
        if (selector === '#stage svg') return stageSvg;
        if (selector === '[data-engine-id][aria-selected="true"]') return selectedTab;
        return null;
      },
    } as unknown as Document;

    const facade = createPreviewEditorInteractionFacadeFromBrowserHost({
      shared: {
        document,
        model: {
          _roots: [],
          previewInterpreterActiveNodeId: 'v3',
          layoutOperatorOverrides: {
            activeOperatorKey: 'v3',
            byOperator: {
              v3: {},
            },
          },
          get() {
            return { type: 'box', data: { id: 'root' }, children: [] };
          },
          getParent() {
            return null;
          },
          cleanOverride() {},
        },
        interactionManager: {
          state: null,
          suppressHover: false,
          isBusy: false,
          isMode() {
            return false;
          },
          endInteraction() {},
        },
        selectedIds: new Set<string>(['root']),
        selectionDepthState: {
          get: () => 0,
          set() {},
        },
      },
      contracts: {
        previewShellInteraction: {
          findPreviewArrowAtPoint() {
            return null;
          },
          findPreviewComponentAtDepth() {
            return null;
          },
          findDeepestPreviewComponent() {
            return null;
          },
          renderPreviewReorderIndicator() {},
          clearPreviewReorderIndicator() {},
          applyReorderOrder() {
            return null;
          },
          collectPreviewMultiResizeSelection() {
            return null;
          },
          collectPreviewSelectionActionInfo() {
            return { count: 1 };
          },
          clampPreviewDragDeltaWithinParent() {
            return { dx: 0, dy: 0 };
          },
          syncPreviewSvgHoverState() {},
          clearPreviewSvgHoverState() {},
          resolvePreviewResizeHandlePlan() {
            return null;
          },
          normalizeSelectionGap(value: unknown) {
            return value;
          },
          resolveSelectionDistributeTargets() {
            return [];
          },
          resolveSelectionAlignTargets() {
            return [];
          },
          createSelectionTargetOverrideEntries() {
            return [];
          },
        },
        previewBridgeRender: {
          readPreviewRenderedComponentBounds() {
            return null;
          },
          readPreviewArrowEndpoints() {
            return null;
          },
          updatePreviewArrowSvg() {},
          rebuildPreviewArrowSvg() {},
        },
        previewShellScene: {
          syncPreviewTreeSelectionState() {},
        },
        previewShellInspector: {
          findPreviewEditableTextTarget() {
            return null;
          },
          resolvePreviewEditableComponentId() {
            return '';
          },
        },
      },
      browser: {
        getOverrides: () => overrides,
        captureOverrideEntries(ids: string[]) {
          return Object.fromEntries(ids.map((id) => [id, { ...(overrides[id] || {}) }]));
        },
        commitOverridePatchAction() {
          canUndo = true;
        },
        getEffectiveDelta() {
          return { dx: 0, dy: 0, dw: 0, dh: 0 };
        },
        getOwnDelta() {
          return { dx: 0, dy: 0, dw: 0, dh: 0 };
        },
        getAncestors() {
          return [];
        },
        getPreviewGridInfo() {
          return null;
        },
        getWidthUnit() {
          return 'px';
        },
        getHeightUnit() {
          return 'px';
        },
        getInspector() {
          return {
            innerHTML: '',
            querySelector() {
              return null;
            },
          };
        },
        getArrowNode() {
          return null;
        },
        getParentNode() {
          return null;
        },
        getComponentType() {
          return 'box';
        },
        getViolations() {
          return [];
        },
        readRenderedStyleFields() {
          return null;
        },
        renderBoxStyleOptions() {
          return '';
        },
        formatAsDefinedStyleLabel() {
          return '';
        },
        normalizeStyleName(value: string) {
          return value;
        },
        snapToGrid(value: number) {
          return value;
        },
        setDirty(nextDirty: boolean) {
          dirty = nextDirty;
        },
        scheduleRelayout() {},
        requestRelayoutNow() {},
        applyAllOverrides() {},
        reapplySelection() {},
        updateOverrideSummary() {},
        refreshTreeColors() {},
        runConstraints() {},
        setOverride() {},
        selectComponent() {},
        deleteSelectedFrames() {
          return Promise.resolve();
        },
        renderSelectionInspector() {},
        renderMultiSelectionInspector() {},
        renderEmptyInspector() {},
        clearHandlesByClass() {},
        renderResizeHandles() {},
        showResizeHandles() {},
        clearGuideLines() {},
        renderGuideLines() {},
        applySelectionState() {},
        deselectAll() {},
        findReferenceImage() {
          return null;
        },
        gridTargets() {
          return [];
        },
        isAutolayoutChild() {
          return false;
        },
        hasLayoutChildren() {
          return false;
        },
        getPrimarySelectedId() {
          return 'root';
        },
        getTextAdapter: null,
        escapeHtml: null,
        baselineStep: 8,
        fallbackGap: 8,
        multiActionGapState: {
          get: () => 8,
          set() {},
        },
        coercedKeys: new Set<string>(),
        interactionMode: {
          DRAGGING: 'dragging',
          TEXT_EDITING: 'text',
          RESIZING: 'resizing',
        },
        previewShellInteraction: null,
        textEditingMode: 'text',
        iconSize: 48,
        columnGap: 24,
        minNodeSize: 8,
        handleSize: 8,
        theme: {
          headLen: 10,
          headHalf: 5,
          color: '#000000',
        },
        waypointDraggingMode: 'waypoint',
        setTextOverride() {},
        onResizeUp() {},
        cycleGuideMode() {},
        undo() {},
        redo() {},
        save() {},
        deleteSelection() {},
        applyInteractionOverrideEntries() {},
        scheduleLayoutResizeRelayout() {
          return false;
        },
        scheduleV3ResizeRelayout() {
          return false;
        },
        cancelLiveRelayout() {},
        cleanOverride() {},
        persistResize() {},
        persistWaypointOverride() {},
        autoFitArtboard() {},
        clearPreviewSvgHoverState() {},
        alert() {},
        shouldShowAutolayoutInspector() {
          return true;
        },
      },
    } as any);

    facade.getEditorRuntimeSet().inspectorMutation.setFrameProp('root', 'gap_delta', 24);

    const previewWindow = document.defaultView as Record<string, unknown>;
    expect(previewWindow.__DG_lastEditorMutationTransactionResult).toEqual(
      expect.objectContaining({
        kind: 'committed',
        mutationKind: 'inspector-layout',
        sourceControl: 'single-prop:gap_delta',
      }),
    );
    expect(previewWindow.__DG_lastEditorMutationStateViolations).toEqual([]);
  });

  it('records canvas-divergence for equivalent-geometry inspector appearance edits', () => {
    let dirty = false;
    let stageViewBox = '-24 -24 256 180';
    const overrides: Record<string, Record<string, unknown>> = {};
    const stageSvg = {
      getAttribute(name: string) {
        if (name === 'data-layout-engine') return 'v3';
        if (name === 'viewBox') return stageViewBox;
        return null;
      },
    };
    const selectedTab = {
      getAttribute(name: string) {
        if (name === 'data-engine-id') return 'v3';
        if (name === 'aria-selected') return 'true';
        return null;
      },
    };
    const document = {
      activeElement: null,
      defaultView: {
        __DG_previewRenderIntent: {
          engineId: 'v3',
          pageDirection: null,
          frameOverrides: {},
          engineOverrides: {},
          gridOverrides: {},
        },
        __DG_CONFIG: {
          active_engine_id: 'v3',
          layout_engine: 'v3',
          document_kind: 'frame-diagram',
        },
        __DG_getPreviewBridgeHostContract: () => ({
          getFrameTreeJson: () => ({ layoutEngine: 'v3' }),
        }),
        PreviewSaveClient: {
          isDirty: () => dirty,
        },
      },
      addEventListener() {},
      removeEventListener() {},
      getElementById(id: string) {
        if (id === 'btn-undo') return { disabled: false };
        if (id === 'btn-redo') return { disabled: true };
        return null;
      },
      querySelector(selector: string) {
        if (selector === '#stage svg') return stageSvg;
        if (selector === '[data-engine-id][aria-selected="true"]') return selectedTab;
        return null;
      },
    } as unknown as Document;

    const facade = createPreviewEditorInteractionFacadeFromBrowserHost({
      shared: {
        document,
        model: {
          _roots: [],
          previewInterpreterActiveNodeId: 'v3',
          layoutOperatorOverrides: {
            activeOperatorKey: 'v3',
            byOperator: {
              v3: {},
            },
          },
          get() {
            return {
              type: 'box',
              level: 1,
              fill: 'WHITE',
              border: 'SOLID',
              data: { id: 'root', level: 1, fill: 'WHITE', border: 'SOLID' },
              children: [],
            };
          },
          getParent() {
            return null;
          },
          cleanOverride() {},
        },
        interactionManager: {
          state: null,
          suppressHover: false,
          isBusy: false,
          isMode() {
            return false;
          },
          endInteraction() {},
        },
        selectedIds: new Set<string>(['root']),
        selectionDepthState: {
          get: () => 0,
          set() {},
        },
      },
      contracts: {
        previewShellInteraction: {
          findPreviewArrowAtPoint() {
            return null;
          },
          findPreviewComponentAtDepth() {
            return null;
          },
          findDeepestPreviewComponent() {
            return null;
          },
          renderPreviewReorderIndicator() {},
          clearPreviewReorderIndicator() {},
          applyReorderOrder() {
            return null;
          },
          collectPreviewMultiResizeSelection() {
            return null;
          },
          collectPreviewSelectionActionInfo() {
            return { count: 1 };
          },
          clampPreviewDragDeltaWithinParent() {
            return { dx: 0, dy: 0 };
          },
          syncPreviewSvgHoverState() {},
          clearPreviewSvgHoverState() {},
          resolvePreviewResizeHandlePlan() {
            return null;
          },
          normalizeSelectionGap(value: unknown) {
            return value;
          },
          resolveSelectionDistributeTargets() {
            return [];
          },
          resolveSelectionAlignTargets() {
            return [];
          },
          createSelectionTargetOverrideEntries() {
            return [];
          },
        },
        previewBridgeRender: {
          readPreviewRenderedComponentBounds() {
            return null;
          },
          readPreviewArrowEndpoints() {
            return null;
          },
          updatePreviewArrowSvg() {},
          rebuildPreviewArrowSvg() {},
        },
        previewShellScene: {
          syncPreviewTreeSelectionState() {},
        },
        previewShellInspector: {
          findPreviewEditableTextTarget() {
            return null;
          },
          resolvePreviewEditableComponentId() {
            return '';
          },
        },
      },
      browser: {
        getOverrides: () => overrides,
        captureOverrideEntries(ids: string[]) {
          return Object.fromEntries(ids.map((id) => [id, { ...(overrides[id] || {}) }]));
        },
        commitOverridePatchAction() {},
        getEffectiveDelta() {
          return { dx: 0, dy: 0, dw: 0, dh: 0 };
        },
        getOwnDelta() {
          return { dx: 0, dy: 0, dw: 0, dh: 0 };
        },
        getAncestors() {
          return [];
        },
        getPreviewGridInfo() {
          return null;
        },
        getWidthUnit() {
          return 'px';
        },
        getHeightUnit() {
          return 'px';
        },
        getInspector() {
          return {
            innerHTML: '',
            querySelector() {
              return null;
            },
          };
        },
        getArrowNode() {
          return null;
        },
        getParentNode() {
          return null;
        },
        getComponentType() {
          return 'box';
        },
        getViolations() {
          return [];
        },
        readRenderedStyleFields() {
          return null;
        },
        renderBoxStyleOptions() {
          return '';
        },
        formatAsDefinedStyleLabel() {
          return '';
        },
        normalizeStyleName(value: string) {
          return value;
        },
        snapToGrid(value: number) {
          return value;
        },
        setDirty(nextDirty: boolean) {
          dirty = nextDirty;
        },
        scheduleRelayout() {},
        requestRelayoutNow() {},
        applyAllOverrides() {
          stageViewBox = '0 0 256 180';
        },
        reapplySelection() {},
        updateOverrideSummary() {},
        refreshTreeColors() {},
        runConstraints() {},
        setOverride() {},
        selectComponent() {},
        deleteSelectedFrames() {
          return Promise.resolve();
        },
        renderSelectionInspector() {},
        renderMultiSelectionInspector() {},
        renderEmptyInspector() {},
        clearHandlesByClass() {},
        renderResizeHandles() {},
        showResizeHandles() {},
        clearGuideLines() {},
        renderGuideLines() {},
        applySelectionState() {},
        deselectAll() {},
        findReferenceImage() {
          return null;
        },
        gridTargets() {
          return [];
        },
        isAutolayoutChild() {
          return false;
        },
        hasLayoutChildren() {
          return false;
        },
        getPrimarySelectedId() {
          return 'root';
        },
        getTextAdapter: null,
        escapeHtml: null,
        baselineStep: 8,
        fallbackGap: 8,
        multiActionGapState: {
          get: () => 8,
          set() {},
        },
        coercedKeys: new Set<string>(),
        interactionMode: {
          DRAGGING: 'dragging',
          TEXT_EDITING: 'text',
          RESIZING: 'resizing',
        },
        previewShellInteraction: null,
        textEditingMode: 'text',
        iconSize: 48,
        columnGap: 24,
        minNodeSize: 8,
        handleSize: 8,
        theme: {
          headLen: 10,
          headHalf: 5,
          color: '#000000',
        },
        waypointDraggingMode: 'waypoint',
        setTextOverride() {},
        onResizeUp() {},
        cycleGuideMode() {},
        undo() {},
        redo() {},
        save() {},
        deleteSelection() {},
        applyInteractionOverrideEntries() {},
        scheduleLayoutResizeRelayout() {
          return false;
        },
        scheduleV3ResizeRelayout() {
          return false;
        },
        cancelLiveRelayout() {},
        cleanOverride() {},
        persistResize() {},
        persistWaypointOverride() {},
        autoFitArtboard() {},
        clearPreviewSvgHoverState() {},
        alert() {},
        shouldShowAutolayoutInspector() {
          return true;
        },
      },
    } as any);

    facade.getEditorRuntimeSet().inspectorMutation.applyStyle('root', 'parent');

    const previewWindow = document.defaultView as Record<string, unknown>;
    expect(previewWindow.__DG_lastEditorMutationTransactionResult).toEqual(
      expect.objectContaining({
        kind: 'committed',
        mutationKind: 'inspector-appearance',
        sourceControl: 'single-style',
      }),
    );
    expect(previewWindow.__DG_lastEditorMutationStateViolations).toEqual([
      expect.objectContaining({
        code: 'canvas-divergence',
        expected: {
          activeNodeId: 'v3',
          fittedViewBox: '-24 -24 256 180',
        },
        actual: {
          activeNodeId: 'v3',
          fittedViewBox: '0 0 256 180',
        },
      }),
    ]);
  });
});
