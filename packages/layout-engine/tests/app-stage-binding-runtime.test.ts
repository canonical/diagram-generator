import { describe, expect, it, vi } from 'vitest';
import { createPreviewStageBindingRuntime } from '../src/preview-shell/app-stage-binding-runtime.js';
import * as stageSvgModule from '../src/preview-shell/app-stage-svg.js';
import * as selectionHostModule from '../src/preview-shell/app-selection-host.js';

describe('createPreviewStageBindingRuntime', () => {
  it('delegates tree rendering and stage binding through typed hosts', () => {
    const treeCalls: Array<Record<string, unknown>> = [];
    const bindCalls: Array<Record<string, unknown>> = [];
    const svg = { tagName: 'svg' } as unknown as SVGSVGElement;
    const treeSpy = vi.spyOn(selectionHostModule, 'renderPreviewTreeSelectionHost')
      .mockImplementation((options) => {
        treeCalls.push({
          nodes: options.nodes,
          overrides: options.overrides,
          selectedIds: [...options.selectedIds],
        });
        return true;
      });
    const bindSpy = vi.spyOn(stageSvgModule, 'bindPreviewStageSvgInteractionHost')
      .mockImplementation((options) => {
        bindCalls.push({
          previousSvg: options.previousSvg,
          suppressHover: options.suppressHover,
          selectionDepth: options.selectionDepth,
          hasRebuildTreeUi: typeof options.rebuildTreeUi,
        });
        options.rebuildTreeUi?.();
        return svg;
      });

    try {
      const runtime = createPreviewStageBindingRuntime({
        document: {
          getElementById() {
            return { id: 'tree' } as unknown as HTMLElement;
          },
          querySelector() {
            return svg;
          },
        } as unknown as Document,
        getTreeNodes: () => [{ id: 'alpha' }] as never[],
        getOverrides: () => ({ alpha: { dx: 8 } }),
        getSelectedIds: () => new Set(['alpha']),
        selectComponent() {},
        onDeleteSelection() {},
        getSuppressHover: () => false,
        getSelectionDepth: () => 2,
        onMouseDown() {},
        onDoubleClick() {},
        findArrowAtPoint() {
          return null;
        },
        findComponentAtDepth() {
          return 'alpha';
        },
        syncHoverState() {},
        clearHoverState() {},
      });

      expect(runtime.buildTreeUi()).toBe(true);
      expect(runtime.bindInteraction()).toBe(svg);

      expect(treeCalls).toEqual([
        {
          nodes: [{ id: 'alpha' }],
          overrides: { alpha: { dx: 8 } },
          selectedIds: ['alpha'],
        },
        {
          nodes: [{ id: 'alpha' }],
          overrides: { alpha: { dx: 8 } },
          selectedIds: ['alpha'],
        },
      ]);
      expect(bindCalls).toEqual([
        {
          previousSvg: null,
          suppressHover: false,
          selectionDepth: 2,
          hasRebuildTreeUi: 'function',
        },
      ]);
    } finally {
      treeSpy.mockRestore();
      bindSpy.mockRestore();
    }
  });
});
