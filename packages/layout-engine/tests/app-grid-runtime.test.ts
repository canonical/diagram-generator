import { describe, expect, it, vi } from 'vitest';
import { createPreviewGridRuntimeFromEditorHost } from '../src/preview-shell/app-grid-runtime.js';

describe('preview grid runtime editor host', () => {
  it('derives fallback grid metrics from editor host state instead of editor.js', async () => {
    const resolvePreviewGridInfo = vi.fn(() => ({ cols: 8 }));
    const runtime = createPreviewGridRuntimeFromEditorHost({
      document: {
        getElementById() {
          return null;
        },
        querySelector(selector: string) {
          if (selector !== '#stage svg') {
            return null;
          }
          return {
            viewBox: {
              baseVal: {
                width: 960,
                height: 540,
              },
            },
            getAttribute(name: string) {
              return name === 'width' ? '960' : '540';
            },
          };
        },
        createElementNS() {
          return {} as never;
        },
      },
      guideModes: ['off', 'baseline'],
      baselineStep: 8,
      slug: 'demo',
      model: {
        roots: [
          {
            id: 'root',
            data: {
              layout_gap: 32,
              padding_top: 40,
            },
          },
        ],
        gridOverrides: {},
        setDiagramGrid() {},
      },
      editorState: {
        cloneValue: <T>(value: T) => value,
        getPendingGridAction: () => null,
        beginUndoableAction: () => ({ label: 'Adjust grid' }),
        setPendingGridAction() {},
        commitUndoableAction() {},
      },
      resolvePreviewGridInfo,
      resolvePreviewGridInfoFromRuntimeState: vi.fn(() => ({ cols: 8 })),
      createGridOverlayScene: vi.fn(() => null),
      pruneLinkedRootOverrides() {},
      setDirty() {},
      requestRelayout() {},
      fetchGridInfo: async () => ({ ok: false, json: async () => ({ cols: 2 }) }),
    });

    const loaded = await runtime.loadGridInfo();

    expect(loaded.mode).toBe('fallback');
    expect(resolvePreviewGridInfo).toHaveBeenCalledWith({
      canvasWidth: 960,
      canvasHeight: 540,
      baselineStep: 8,
      columnCount: 2,
      columnGutter: 32,
      rowGutter: 32,
      marginTop: 40,
      marginRight: 40,
      marginBottom: 40,
      marginLeft: 40,
    });
    expect(runtime.getGridInfo()).toEqual({ cols: 8 });
  });
});
