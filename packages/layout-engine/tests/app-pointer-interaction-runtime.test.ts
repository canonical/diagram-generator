import { describe, expect, it, vi } from 'vitest';
import { createPreviewPointerInteractionRuntime } from '../src/preview-shell/app-pointer-interaction-runtime.js';
import * as dragHostModule from '../src/preview-shell/app-drag-host.js';
import * as selectionHostModule from '../src/preview-shell/app-selection-host.js';

describe('createPreviewPointerInteractionRuntime', () => {
  it('routes double click, pointer down, and drag move through typed hosts', () => {
    const capturedCalls: Array<Record<string, unknown>> = [];
    const dblClickSpy = vi.spyOn(selectionHostModule, 'handlePreviewDoubleClickSelectionHost')
      .mockImplementation((options) => {
        capturedCalls.push({
          kind: 'double-click',
          selectionDepth: options.selectionDepth,
          selectedIds: [...options.selectedIds],
        });
        return { kind: 'noop' };
      });
    const mouseDownSpy = vi.spyOn(dragHostModule, 'startPreviewPointerInteractionHost')
      .mockImplementation((options) => {
        capturedCalls.push({
          kind: 'mouse-down',
          currentSelectionDepth: options.currentSelectionDepth,
          selectedIds: [...options.selectedIds],
          hasOnDragMove: typeof options.onDragMove,
          hasOnDragUp: typeof options.onDragUp,
        });
        return { kind: 'drag-start' };
      });
    const dragMoveSpy = vi.spyOn(dragHostModule, 'dispatchPreviewDragMoveHost')
      .mockImplementation((options) => {
        capturedCalls.push({
          kind: 'drag-move',
          state: options.state,
          clientX: options.clientX,
          clientY: options.clientY,
          shouldUpdateInspector: options.shouldUpdateInspector,
        });
        return {
          kind: 'moved',
          moved: true,
          appliedIds: [],
          guideLineCount: 0,
        };
      });

    try {
      const runtime = createPreviewPointerInteractionRuntime({
        document: {
          addEventListener() {},
          querySelector() {
            return { tagName: 'svg' } as unknown as SVGSVGElement;
          },
        } as unknown as Document,
        getSvg: () => ({ tagName: 'svg' } as unknown as SVGSVGElement),
        getSelectedIds: () => new Set(['alpha']),
        getSelectionDepth: () => 2,
        setSelectionDepth() {},
        isTextEditing: () => false,
        findEditableTextTarget() {
          return null;
        },
        resolveEditableComponentId() {
          return 'alpha';
        },
        getAncestors() {
          return [];
        },
        selectComponent() {},
        startTextEdit() {},
        findComponentAtDepth() {
          return 'alpha';
        },
        getChildIds() {
          return [];
        },
        applySelectionState() {},
        commitTextEditIfActive() {},
        startResize() {},
        findArrowAtPoint() {
          return null;
        },
        findDeepestComponent() {
          return 'alpha';
        },
        deselectAll() {},
        getOwnDelta() {
          return { dx: 0, dy: 0 };
        },
        collectSnapTargets() {
          return null;
        },
        isAutolayoutChild() {
          return false;
        },
        captureOverrideEntries() {
          return {};
        },
        startDragInteraction() {},
        interactionManager: {
          state: { cid: 'alpha', cids: ['alpha'] },
          isMode(mode) {
            return mode === 'DRAGGING';
          },
        },
        draggingMode: 'DRAGGING',
        getParentNodeForAutolayout() {
          return null;
        },
        snapStep: 8,
        showReorderIndicator() {},
        clearReorderIndicator() {},
        resolveSnap() {
          return { dx: 0, dy: 0, lines: [] };
        },
        renderGuideLines() {},
        clampDragDelta() {
          return { dx: 0, dy: 0 };
        },
        setOverride() {},
        applyAllOverrides() {},
        updateInspector() {},
        shouldUpdateInspector: () => true,
        onDragUp() {},
      });

      runtime.onSvgDoubleClick({
        target: { classList: { contains: () => false } },
        clientX: 100,
        clientY: 80,
      });
      runtime.onSvgMouseDown({
        target: { classList: { contains: () => false } },
        button: 0,
        clientX: 100,
        clientY: 80,
        preventDefault() {},
      });
      runtime.onDragMove({ clientX: 120, clientY: 96 });

      expect(capturedCalls).toEqual([
        {
          kind: 'double-click',
          selectionDepth: 2,
          selectedIds: ['alpha'],
        },
        {
          kind: 'mouse-down',
          currentSelectionDepth: 2,
          selectedIds: ['alpha'],
          hasOnDragMove: 'function',
          hasOnDragUp: 'function',
        },
        {
          kind: 'drag-move',
          state: { cid: 'alpha', cids: ['alpha'] },
          clientX: 120,
          clientY: 96,
          shouldUpdateInspector: true,
        },
      ]);
    } finally {
      dblClickSpy.mockRestore();
      mouseDownSpy.mockRestore();
      dragMoveSpy.mockRestore();
    }
  });
});
