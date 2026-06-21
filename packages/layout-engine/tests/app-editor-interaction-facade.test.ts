import { describe, expect, it, vi } from 'vitest';
import { createPreviewEditorInteractionFacadeFromEditorHost } from '../src/preview-shell/app-editor-interaction-facade.js';

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
});
