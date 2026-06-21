import { describe, expect, it, vi } from 'vitest';
import { createPreviewSelectionChromeRuntime } from '../src/preview-shell/app-selection-chrome-runtime.js';
import * as selectionChromeModule from '../src/preview-shell/app-selection-chrome.js';

describe('createPreviewSelectionChromeRuntime', () => {
  it('routes resize-handle and arrow-visual helpers through typed owners', () => {
    const capturedCalls: Array<Record<string, unknown>> = [];
    const showSpy = vi.spyOn(selectionChromeModule, 'showPreviewResizeHandlesHost')
      .mockImplementation((options) => {
        capturedCalls.push({
          kind: 'show',
          componentId: options.componentId,
          selectedCount: options.selectedCount,
          componentType: options.componentType,
        });
        return true;
      });
    const removeSpy = vi.spyOn(selectionChromeModule, 'removePreviewHandlesHost')
      .mockImplementation((options) => {
        capturedCalls.push({
          kind: 'remove',
          hasClearHandlesByClass: typeof options.clearHandlesByClass,
        });
      });

    try {
      const runtime = createPreviewSelectionChromeRuntime({
        document: {
          querySelector() {
            return { tagName: 'svg' } as unknown as SVGSVGElement;
          },
        } as unknown as Document,
        getSelectedIds: () => new Set(['alpha']),
        getMultiResizeSelection() {
          return null;
        },
        getRenderedComponentBounds() {
          return { left: 8, top: 16, right: 32, bottom: 48, width: 24, height: 32 };
        },
        getComponentType() {
          return 'panel';
        },
        clearHandlesByClass() {},
        resolveHandlePlan() {
          return { kind: 'box', bounds: { left: 8, top: 16, right: 32, bottom: 48 } };
        },
        renderResizeHandles() {},
        showArrowWaypointHandles() {},
        handleSize: 8,
        getArrowPoints() {
          capturedCalls.push({ kind: 'points' });
          return [[4, 8], [20, 24]];
        },
        updateArrowVisual() {
          capturedCalls.push({ kind: 'update' });
        },
        rebuildArrowSvg() {
          capturedCalls.push({ kind: 'rebuild' });
        },
      });

      expect(runtime.showResizeHandles('alpha')).toBe(true);
      runtime.removeResizeHandles();
      expect(runtime.getArrowPoints('alpha')).toEqual([[4, 8], [20, 24]]);
      runtime.updateArrowVisual('alpha');
      runtime.rebuildArrowSvg('alpha');

      expect(capturedCalls).toEqual([
        {
          kind: 'show',
          componentId: 'alpha',
          selectedCount: 1,
          componentType: 'panel',
        },
        {
          kind: 'remove',
          hasClearHandlesByClass: 'function',
        },
        { kind: 'points' },
        { kind: 'update' },
        { kind: 'rebuild' },
      ]);
    } finally {
      showSpy.mockRestore();
      removeSpy.mockRestore();
    }
  });
});
