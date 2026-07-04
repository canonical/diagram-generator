import { describe, expect, it, vi } from 'vitest';
import {
  createPreviewEditorSceneFacadeFromEditorHost,
  createPreviewEditorSceneFacadeFromRuntime,
} from '../src/preview-shell/app-editor-scene-facade.js';

describe('preview editor scene facade', () => {
  it('owns grid runtime, rerender refresh, delete, and scene-status coordination behind one typed seam', async () => {
    const calls: string[] = [];
    const stage = {
      replaceChildren: vi.fn(),
    };
    const summaryEl = {
      textContent: '',
    };
    const constraintEl = {
      textContent: '',
      className: '',
      style: {
        background: '',
        color: '',
      },
    };
    const svg = {
      viewBox: {
        baseVal: {
          x: 0,
          y: 0,
          width: 640,
          height: 480,
        },
      },
      getAttribute(name: string) {
        if (name === 'width') return '640';
        if (name === 'height') return '480';
        return null;
      },
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
      appendChild() {},
      setAttribute: vi.fn(),
      ownerDocument: {
        createElement() {
          return {
            getContext() {
              return null;
            },
          };
        },
      },
    } as unknown as SVGSVGElement;
    const documentLike = {
      activeElement: null,
      getElementById(id: string) {
        if (id === 'stage') {
          return stage;
        }
        if (id === 'override-summary') {
          return summaryEl;
        }
        if (id === 'constraint-status') {
          return constraintEl;
        }
        return null;
      },
      querySelector(selector: string) {
        return selector === '#stage svg' ? svg : null;
      },
      createElementNS() {
        return {
          style: {},
          setAttribute() {},
          appendChild() {},
        };
      },
    } as unknown as Document;
    const arrowNode = { waypoints: [] as unknown[] };
    const selectedIds = new Set<string>(['alpha']);
    const removedIds = new Set<string>();
    let lastViolations: string[] = [];
    let dirtied = false;
    let deselected = false;

    const model = {
      roots: [{ id: 'alpha', type: 'box' }],
      gridOverrides: null,
      setDiagramGrid() {},
      get() {
        return {
          id: 'alpha',
          type: 'box',
          data: {
            id: 'alpha',
            x: 0,
            y: 0,
            width: 160,
            height: 96,
          },
          ancestorIds: [],
          descendantIds: [],
        };
      },
      removedIds,
      clearOverride() {},
    };

    const facade = createPreviewEditorSceneFacadeFromEditorHost({
      gridRuntime: {
        document: documentLike,
        guideModes: ['off', 'all'],
        baselineStep: 24,
        slug: 'demo',
        model,
        editorState: {
          cloneValue<T>(value: T) {
            return value;
          },
          getPendingGridAction() {
            return null;
          },
          beginUndoableAction() {
            return {};
          },
          setPendingGridAction() {},
          commitUndoableAction() {},
        },
        resolvePreviewGridInfo() {
          return { cols: 8 };
        },
        resolvePreviewGridInfoFromRuntimeState() {
          return { cols: 8 };
        },
        createGridOverlayScene() {
          return null;
        },
        pruneLinkedRootOverrides() {},
        setDirty() {},
        requestRelayout() {},
      },
      sceneRefresh: {
        buildTreeUi() {
          calls.push('buildTreeUi');
        },
        bindInteraction() {
          calls.push('bindInteraction');
        },
        reapplySelection() {
          calls.push('reapplySelection');
        },
        renderSelectionInspector() {
          calls.push('renderSelectionInspector');
        },
      },
      waypointOverrides: {
        getOverrides() {
          return {
            alpha: {
              waypoints: [{ x: 12, y: 18 }],
            },
          };
        },
        getArrowNode() {
          return arrowNode;
        },
        rebuildArrowSvg(cid: string) {
          calls.push(`rebuildArrowSvg:${cid}`);
        },
      },
      overrideApplication: {
        document: documentLike,
        getSelectedIds() {
          return selectedIds;
        },
        getComponentTree() {
          return [{ id: 'alpha', type: 'box' }];
        },
        getRootNodes() {
          return [{ id: 'alpha' }];
        },
        getOverrides() {
          return {};
        },
        getRelayoutStatus() {
          return { frameManaged: false };
        },
        boxStyles: {},
        inset: 8,
        iconSize: 48,
        gridStep: 24,
        hasDiagramGrid() {
          return false;
        },
        getNode() {
          return { id: 'alpha', type: 'box' };
        },
        getOwnDelta() {
          return { dx: 0, dy: 0, dw: 0, dh: 0 };
        },
        getEffectiveDelta() {
          return { dx: 0, dy: 0, dw: 0, dh: 0 };
        },
        isFrameManagedTarget() {
          return false;
        },
      },
      rerenderStageFromModel: {
        document: documentLike,
        model,
        getOverrides() {
          return {};
        },
        async renderFreshSvg() {
          calls.push('renderFreshSvg');
          return {
            svg: { tagName: 'svg' } as unknown as SVGSVGElement,
            width: 640,
            height: 480,
          };
        },
        fitRenderedSvgToContent() {
          calls.push('fitRenderedSvgToContent');
        },
      },
      frameDelete: {
        selectedIds,
        isTextEditing: false,
        getFrameTreeJson() {
          return { root: { id: 'page' } };
        },
        getRootNodes() {
          return model.roots;
        },
        fallbackRootId: 'page',
        getNode() {
          return {
            id: 'alpha',
            type: 'box',
            ancestorIds: [],
            descendantIds: [],
          };
        },
        beginUndoableAction() {
          calls.push('beginDeleteAction');
          return {};
        },
        markRemoved(id: string) {
          removedIds.add(id);
        },
        clearOverride() {
          calls.push('clearOverride');
        },
        unselect(id: string) {
          selectedIds.delete(id);
        },
        setDirty(value: boolean) {
          dirtied = value;
        },
        deselectAll() {
          deselected = true;
        },
        commitUndoableAction() {
          calls.push('commitDeleteAction');
        },
      },
      artboard: {
        document: documentLike,
        getRoots() {
          return [{ id: 'alpha', type: 'box' }];
        },
        readBounds() {
          return {
            left: 0,
            top: 0,
            right: 800,
            bottom: 600,
            width: 800,
            height: 600,
          };
        },
        padding: 24,
      },
      overrideSummary: {
        document: documentLike,
        getOverrideCount() {
          return 2;
        },
        formatSummary(count: number) {
          return `${count} overrides`;
        },
      },
      treeOverrideState: {
        document: documentLike,
        getOverrides() {
          return { alpha: { dx: 8 } };
        },
        syncTreeOverrideState() {
          calls.push('refreshTreeColors');
        },
      },
      constraints: {
        document: documentLike,
        model,
        validateConstraints() {
          calls.push('validateConstraints');
          return ['warn'];
        },
        summarizeViolations(violations: string[]) {
          return {
            errors: 0,
            warnings: violations.length,
          };
        },
        setLastViolations(violations: string[]) {
          lastViolations = violations;
        },
        syncSaveButton() {
          calls.push('syncSaveButton');
        },
        syncConstraintStatus() {
          calls.push('syncConstraintStatus');
        },
      },
    });

    expect(facade.getGridRuntime()).toBe(facade.getGridRuntime());

    expect(facade.applyWaypointOverrides()).toBe(1);
    expect(arrowNode.waypoints).toEqual([{ x: 12, y: 18 }]);
    expect(summaryEl.textContent).toBe('');

    expect(await facade.rerenderStageFromModel()).toBe(true);
    expect(stage.replaceChildren).toHaveBeenCalledTimes(1);

    expect(facade.updateOverrideSummary()).toBe(true);
    expect(summaryEl.textContent).toBe('2 overrides');

    facade.refreshTreeColors();
    expect(lastViolations).toEqual(['warn']);
    expect(facade.runConstraints()).toEqual(['warn']);
    expect(lastViolations).toEqual(['warn']);

    expect(facade.autoFitArtboard()).toBe(true);
    expect(svg.setAttribute).toHaveBeenCalledWith('viewBox', '0 0 824 624');

    const deleteResult = await facade.deleteSelectedFrames();
    expect(deleteResult.kind).toBe('deleted');
    expect(deleteResult.rerendered).toBe(true);
    expect([...removedIds]).toEqual(['alpha']);
    expect([...selectedIds]).toEqual([]);
    expect(dirtied).toBe(true);
    expect(deselected).toBe(true);

    expect(calls).toEqual([
      'rebuildArrowSvg:alpha',
      'renderFreshSvg',
      'fitRenderedSvgToContent',
      'rebuildArrowSvg:alpha',
      'buildTreeUi',
      'bindInteraction',
      'reapplySelection',
      'renderSelectionInspector',
      'refreshTreeColors',
      'validateConstraints',
      'syncSaveButton',
      'syncConstraintStatus',
      'refreshTreeColors',
      'validateConstraints',
      'syncSaveButton',
      'syncConstraintStatus',
      'beginDeleteAction',
      'clearOverride',
      'renderFreshSvg',
      'fitRenderedSvgToContent',
      'rebuildArrowSvg:alpha',
      'buildTreeUi',
      'bindInteraction',
      'reapplySelection',
      'renderSelectionInspector',
      'refreshTreeColors',
      'validateConstraints',
      'syncSaveButton',
      'syncConstraintStatus',
      'commitDeleteAction',
    ]);
  });

  it('wraps previewBridge.render bounds readers with the stage svg when auto-fitting from runtime-owned state', () => {
    const svg = {
      viewBox: {
        baseVal: {
          x: 0,
          y: 0,
          width: 640,
          height: 480,
        },
      },
      getAttribute(name: string) {
        if (name === 'width') return '640';
        if (name === 'height') return '480';
        return null;
      },
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
      appendChild() {},
      setAttribute() {},
    } as unknown as SVGSVGElement;
    const readBounds = vi.fn(({ componentId }: { componentId: string }) => {
      return componentId === 'page'
        ? {
          left: 0,
          top: 0,
          right: 640,
          bottom: 480,
          width: 640,
          height: 480,
        }
        : null;
    });
    const documentLike = {
      getElementById() {
        return null;
      },
      querySelector(selector: string) {
        return selector === '#stage svg' ? svg : null;
      },
      createElementNS() {
        return {
          style: {},
          setAttribute() {},
          appendChild() {},
        };
      },
    } as unknown as Document;

    const facade = createPreviewEditorSceneFacadeFromRuntime({
      shared: {
        document: documentLike,
        guideModes: ['off', 'all'],
        baselineStep: 24,
        slug: 'demo',
        model: {
          roots: [{ id: 'page', type: 'box' }],
          gridOverrides: null,
          setDiagramGrid() {},
        },
        selectedIds: new Set<string>(),
        editorState: {
          cloneValue<T>(value: T) {
            return value;
          },
          getPendingGridAction() {
            return null;
          },
          beginUndoableAction() {
            return {};
          },
          setPendingGridAction() {},
          commitUndoableAction() {},
        },
        getOverrides() {
          return {};
        },
      },
      contracts: {
        previewShellScene: {
          resolvePreviewGridInfo() {
            return { cols: 4 };
          },
          resolvePreviewGridInfoFromRuntimeState() {
            return { cols: 4 };
          },
          createGridOverlayScene() {
            return null;
          },
          formatPreviewOverrideSummary(count: number) {
            return `${count} overrides`;
          },
          syncPreviewTreeOverrideState() {},
          syncPreviewConstraintStatus() {},
        },
        previewBridgeRender: {
          renderFreshPreviewSvg: vi.fn(),
          readPreviewRenderedComponentBounds: readBounds,
        },
      },
      gridRuntime: {
        pruneLinkedRootOverrides() {},
        setDirty() {},
        requestRelayout() {},
      },
      sceneRefresh: {},
      waypointOverrides: {
        getOverrides() {
          return {};
        },
        getArrowNode() {
          return null;
        },
        rebuildArrowSvg() {},
      },
      overrideApplication: {
        getComponentTree() {
          return [{ id: 'page', type: 'box' }];
        },
        getRootNodes() {
          return [{ id: 'page', type: 'box', children: [] }];
        },
        getRelayoutStatus() {
          return null;
        },
        boxStyles: {},
        inset: 8,
        iconSize: 48,
        gridStep: 24,
        hasDiagramGrid() {
          return false;
        },
        getNode() {
          return { id: 'page', type: 'box' };
        },
        getOwnDelta() {
          return { dx: 0, dy: 0, dw: 0, dh: 0 };
        },
        getEffectiveDelta() {
          return { dx: 0, dy: 0, dw: 0, dh: 0 };
        },
        isFrameManagedTarget() {
          return false;
        },
      },
      rerenderStageFromModel: {},
      frameDelete: {
        selectedIds: new Set<string>(),
        getFrameTreeJson() {
          return { root: { id: 'page' } };
        },
        getRootNodes() {
          return [{ id: 'page' }];
        },
        fallbackRootId: 'page',
        getNode() {
          return {
            id: 'page',
            type: 'box',
            ancestorIds: [],
            descendantIds: [],
          };
        },
        beginUndoableAction() {
          return {};
        },
        markRemoved() {},
        clearOverride() {},
        unselect() {},
        setDirty() {},
        deselectAll() {},
        commitUndoableAction() {},
        alert() {},
      },
      artboard: {
        getRoots() {
          return [{ id: 'page', type: 'box' }];
        },
        padding: 24,
      },
      overrideSummary: {
        getOverrideCount() {
          return 0;
        },
      },
      treeOverrideState: {},
      constraints: {
        validateConstraints() {
          return [];
        },
        summarizeViolations() {
          return { errors: 0 };
        },
        setLastViolations() {},
        syncSaveButton() {},
      },
    });

    expect(facade.autoFitArtboard()).toBe(true);
    expect(readBounds).toHaveBeenCalledWith({
      svg,
      componentId: 'page',
    });
  });
});
