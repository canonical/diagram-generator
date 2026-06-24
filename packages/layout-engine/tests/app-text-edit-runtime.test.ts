import { describe, expect, it, vi } from 'vitest';
import { createPreviewTextEditRuntimeFromHost } from '../src/preview-shell/app-text-edit-runtime.js';
import * as textEditHostModule from '../src/preview-shell/app-text-edit-host.js';

describe('preview text-edit runtime', () => {
  it('routes start, commit, and cancel through typed text-edit hosts', () => {
    const captured: Array<Record<string, unknown>> = [];
    const startSpy = vi.spyOn(textEditHostModule, 'startPreviewTextEditHost')
      .mockImplementation((options) => {
        captured.push({
          kind: 'start',
          cid: options.cid,
          headingText: options.headingText,
          labelText: options.labelText,
        });
        return { kind: 'started', cid: options.cid, changed: false };
      });
    const commitSpy = vi.spyOn(textEditHostModule, 'completePreviewTextEdit')
      .mockImplementation((options) => {
        captured.push({
          kind: 'commit',
          hasState: Boolean(options.state),
          hasScheduleRelayout: typeof options.scheduleRelayout,
        });
        return { kind: 'committed', cid: options.state?.cid ?? null, changed: true };
      });
    const cancelSpy = vi.spyOn(textEditHostModule, 'cancelPreviewTextEdit')
      .mockImplementation((options) => {
        captured.push({
          kind: 'cancel',
          hasState: Boolean(options.state),
          hasReapplySelection: typeof options.reapplySelection,
        });
        return { kind: 'cancelled', cid: options.state?.cid ?? null, changed: false };
      });

    try {
      const runtime = createPreviewTextEditRuntimeFromHost({
        document: {
          querySelector() {
            return { tagName: 'svg' } as unknown as SVGSVGElement;
          },
          activeElement: null,
        } as unknown as Document,
        model: {
          overrides: {
            alpha: { text: { heading: 'Old' } },
          },
          get() {
            return {
              data: {
                heading_text: 'Heading',
                label_text: ['Line 1'],
              },
            };
          },
        },
        interactionManager: {
          state: { cid: 'alpha', editor: { ta: null } },
          isMode(mode) {
            return mode === 'TEXT';
          },
          startTextEdit() {},
          endInteraction() {},
        },
        textEditingMode: 'TEXT',
        iconSize: 24,
        columnGap: 32,
        removeResizeHandles() {},
        setTextOverride() {},
        captureOverrideEntries() {
          return {};
        },
        commitOverridePatchAction() {},
        reapplySelection() {},
        scheduleRelayout() {},
      });

      runtime.startTextEdit('alpha', { stopPropagation() {} }, { textEl: null });
      runtime.commitTextEdit();
      runtime.cancelTextEdit();

      expect(captured).toEqual([
        {
          kind: 'start',
          cid: 'alpha',
          headingText: 'Heading',
          labelText: ['Line 1'],
        },
        {
          kind: 'commit',
          hasState: true,
          hasScheduleRelayout: 'function',
        },
        {
          kind: 'cancel',
          hasState: true,
          hasReapplySelection: 'function',
        },
      ]);
    } finally {
      startSpy.mockRestore();
      commitSpy.mockRestore();
      cancelSpy.mockRestore();
    }
  });

  it('preserves the model binding when resolving the edited node (T022 regression)', () => {
    // The real ComponentModel.get reads `this._index`. If the runtime forwards
    // `model.get` as an unbound method reference, calling it loses `this` and
    // throws `Cannot read properties of undefined (reading 'get')` on every
    // double-click. This guards against that regression.
    class IndexedModel {
      private _index = new Map<string, { data: { heading_text: string; label_text: string[] } }>();
      overrides: Record<string, unknown> = {};

      constructor() {
        this._index.set('alpha', { data: { heading_text: 'Bound heading', label_text: ['Line'] } });
      }

      get(id: string) {
        return this._index.get(id) ?? null;
      }
    }

    const captured: Array<Record<string, unknown>> = [];
    const startSpy = vi.spyOn(textEditHostModule, 'startPreviewTextEditHost')
      .mockImplementation((options) => {
        captured.push({ cid: options.cid, headingText: options.headingText });
        return { kind: 'started', cid: options.cid, changed: false };
      });

    try {
      const runtime = createPreviewTextEditRuntimeFromHost({
        document: {
          querySelector() {
            return { tagName: 'svg' } as unknown as SVGSVGElement;
          },
          activeElement: null,
        } as unknown as Document,
        model: new IndexedModel(),
        interactionManager: {
          state: { cid: 'alpha', editor: { ta: null } },
          isMode() {
            return false;
          },
          startTextEdit() {},
          endInteraction() {},
        },
        textEditingMode: 'TEXT',
        iconSize: 24,
        columnGap: 32,
        removeResizeHandles() {},
        setTextOverride() {},
        captureOverrideEntries() {
          return {};
        },
        commitOverridePatchAction() {},
        reapplySelection() {},
        scheduleRelayout() {},
      });

      expect(() => runtime.startTextEdit('alpha', { stopPropagation() {} }, { textEl: null }))
        .not.toThrow();
      expect(captured).toEqual([{ cid: 'alpha', headingText: 'Bound heading' }]);
    } finally {
      startSpy.mockRestore();
    }
  });
});
