import { describe, expect, it, vi } from 'vitest';
import {
  createPreviewResizeInteractionRuntime,
  createPreviewResizeInteractionRuntimeFromHost,
} from '../src/preview-shell/app-resize-interaction-runtime.js';
import * as resizeHostModule from '../src/preview-shell/app-resize-host.js';

describe('createPreviewResizeInteractionRuntime', () => {
  it('routes start, move, and completion through typed resize hosts', () => {
    const capturedCalls: Array<Record<string, unknown>> = [];
    const startSpy = vi.spyOn(resizeHostModule, 'startPreviewResizeHost')
      .mockImplementation((options) => {
        capturedCalls.push({
          kind: 'start',
          selectedIds: [...options.selectedIds],
          hasOnResizeMove: typeof options.onResizeMove,
          hasOnResizeUp: typeof options.onResizeUp,
        });
        return { kind: 'started' };
      });
    const moveSpy = vi.spyOn(resizeHostModule, 'dispatchPreviewResizeMoveHost')
      .mockImplementation((options) => {
        capturedCalls.push({
          kind: 'move',
          clientX: options.clientX,
          clientY: options.clientY,
          hasRenderGuideLines: typeof options.renderGuideLines,
        });
        return { kind: 'moved', resizedIds: [], propagatedIds: [] } as never;
      });
    const upSpy = vi.spyOn(resizeHostModule, 'completePreviewResizeInteraction')
      .mockImplementation((options) => {
        capturedCalls.push({
          kind: 'up',
          hasCancelLiveRelayout: typeof options.cancelLiveRelayout,
          hasPersistResize: typeof options.persistResize,
          transaction: options.transaction,
        });
        return true as never;
      });

    try {
      const runtime = createPreviewResizeInteractionRuntime({
        document: {
          addEventListener() {},
          querySelector() {
            return { tagName: 'svg' } as unknown as SVGSVGElement;
          },
        } as unknown as Document,
        getSvg: () => ({ tagName: 'svg' } as unknown as SVGSVGElement),
        selectedIds: new Set(['alpha']),
        hasDiagramGrid: () => true,
        getNode() {
          return null;
        },
        getSiblings() {
          return [];
        },
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
        startInteraction() {},
        interactionManager: {
          state: { cid: 'alpha' },
          endInteraction() {},
          isMode(mode) {
            return mode === 'RESIZING';
          },
        },
        resizingMode: 'RESIZING',
        gridTargets() {
          return [];
        },
        snapStep: 8,
        renderGuideLines() {},
        clearGuideLines() {},
        applyInteractionOverrideEntries() {},
        applyAllOverrides() {},
        renderSelectionInspector() {},
        updateInspector() {},
        setOverride() {},
        relayoutChildren() {
          return {};
        },
        relayoutSiblingsAfterChildResize() {
          return {};
        },
        scheduleLayoutResizeRelayout() {
          return true;
        },
        scheduleV3ResizeRelayout() {
          return true;
        },
        cancelLiveRelayout() {},
        clearPreviewSvgHoverState() {},
        cleanOverride() {},
        reapplySelection() {},
        selectComponent() {},
        commitOverridePatchAction() {},
        persistResize() {},
        autoFitArtboard() {},
        getMutationContext() {
          return {
            activeEngineId: 'elk-force',
            documentKind: 'frame-diagram',
          };
        },
        onMutationTransaction() {},
      });

      runtime.startResize({} as MouseEvent);
      runtime.onResizeMove({ clientX: 120, clientY: 80 } as MouseEvent);
      runtime.onResizeUp();

      expect(capturedCalls).toEqual([
        {
          kind: 'start',
          selectedIds: ['alpha'],
          hasOnResizeMove: 'function',
          hasOnResizeUp: 'function',
        },
        {
          kind: 'move',
          clientX: 120,
          clientY: 80,
          hasRenderGuideLines: 'function',
        },
        {
          kind: 'up',
          hasCancelLiveRelayout: 'function',
          hasPersistResize: 'function',
          transaction: {
            activeEngineId: 'elk-force',
            documentKind: 'frame-diagram',
            onMutationTransaction: expect.any(Function),
          },
        },
      ]);
    } finally {
      startSpy.mockRestore();
      moveSpy.mockRestore();
      upSpy.mockRestore();
    }
  });

  it('keeps model sibling-relayout methods bound when root resize uses the diagram grid context', () => {
    const siblingCalls: Array<Record<string, unknown>> = [];
    const pageNode = {
      data: { id: 'page', x: 0, y: 0, width: 568, height: 456 },
      parent: null,
    };
    const model = {
      diagramGrid: { cols: 3 },
      get(id: string) {
        return id === 'page' ? pageNode : null;
      },
      getSiblings() {
        return [];
      },
      relayoutChildren() {
        return {};
      },
      relayoutSiblingsAfterChildResize(childId: string, rightEdgeDelta: number, bottomEdgeDelta: number) {
        siblingCalls.push({
          self: this,
          childId,
          rightEdgeDelta,
          bottomEdgeDelta,
        });
        return {};
      },
    };

    const runtime = createPreviewResizeInteractionRuntimeFromHost({
      document: {
        querySelector() {
          return {
            getAttribute(name: string) {
              return name === 'width' ? '568' : '456';
            },
            querySelectorAll() {
              return [];
            },
          } as unknown as SVGSVGElement;
        },
      } as unknown as Document,
      model,
      interactionManager: {
        state: {
          cid: 'page',
          axis: 'r',
          startX: 100,
          startY: 80,
          origDx: 0,
          origDy: 0,
          origDw: 0,
          origDh: 0,
          baseW: 568,
          baseH: 456,
          origOverrides: {
            page: { dx: 0, dy: 0, dw: 0, dh: 0 },
          },
          hasMoved: false,
        },
        endInteraction() {},
        isMode(mode: unknown) {
          return mode === 'RESIZING';
        },
        startResize() {},
      },
      interactionMode: {
        RESIZING: 'RESIZING',
      },
      selectedIds: new Set(['page']),
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
        return 'page';
      },
      minNodeSize: 8,
      captureOverrideEntries() {
        return {};
      },
      gridTargets() {
        return { xs: [], ys: [] };
      },
      snapStep: 8,
      renderGuideLines() {},
      clearGuideLines() {},
      applyInteractionOverrideEntries() {},
      applyAllOverrides() {},
      renderSelectionInspector() {},
      updateInspector() {},
      setOverride() {},
      scheduleLayoutResizeRelayout() {
        return true;
      },
      scheduleV3ResizeRelayout() {
        return true;
      },
      cancelLiveRelayout() {},
      clearPreviewSvgHoverState() {},
      cleanOverride() {},
      reapplySelection() {},
      selectComponent() {},
      commitOverridePatchAction() {},
      persistResize() {},
      autoFitArtboard() {},
    });

    expect(() => runtime.onResizeMove({ clientX: 148, clientY: 80 } as MouseEvent)).not.toThrow();
    expect(siblingCalls).toEqual([
      {
        self: model,
        childId: 'page',
        rightEdgeDelta: 48,
        bottomEdgeDelta: 0,
      },
    ]);
  });
});
