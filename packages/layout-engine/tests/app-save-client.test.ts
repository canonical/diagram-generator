import { describe, expect, it, vi } from 'vitest';
import { createPreviewSaveClientRuntime } from '../src/preview-shell/app-save-client.js';

describe('preview save client runtime', () => {
  it('persists through generic relayout/runtime getters and reloads from canonical state', async () => {
    const saveButton = {
      disabled: false,
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
      },
      addEventListener: vi.fn(),
    };
    const saveSvgButton = {
      addEventListener: vi.fn(),
    };
    const document = {
      body: {
        appendChild() {},
      },
      activeElement: null,
      createElement() {
        return {
          click() {},
          remove() {},
        };
      },
      getElementById(id: string) {
        if (id === 'btn-save') return saveButton;
        if (id === 'btn-save-svg') return saveSvgButton;
        return null;
      },
      querySelector() {
        return null;
      },
    };
    const previewWindow = {
      addEventListener: vi.fn(),
    };
    const fetchFn = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '',
      json: async () => ({
        canonicalState: {
          slug: 'demo',
          previewDocument: { kind: 'sequence' },
        },
      }),
    }));
    const runtime = createPreviewSaveClientRuntime({
      document,
      previewWindow,
      fetchFn,
      alertFn: vi.fn(),
    });

    const reloadDiagram = vi.fn(async () => undefined);
    const restoreSelectionIds = vi.fn();
    const setStatus = vi.fn();
    const clearCoercedKeys = vi.fn();
    const runConstraints = vi.fn();
    const model = {
      overrides: { alpha: { dx: 8 } },
      gridOverrides: {},
      removedIds: new Set(['stale']),
      toOverridePayload: () => ({ overrides: { alpha: { dx: 8 } } }),
    };

    runtime.init({
      slug: 'demo',
      getModel: () => model,
      getSelectedIds: () => ['alpha'],
      restoreSelectionIds,
      serializeDirtyState: () => '{"dirty":true}',
      reloadDiagram,
      collectEngineSavePayload: (payload) => ({ ...payload, engine: 'sequence' }),
      getLayoutRelayoutStatus: () => ({ localReady: true }),
      getLayoutRelayoutRuntime: () => ({ lastMode: 'local-ready' }),
      getConstraintSummary: () => ({ errors: 0 }),
      getConstraintErrorCount: () => 0,
      runConstraints,
      clearCoercedKeys,
      setStatus,
    });

    runtime.setDirty(true);
    await runtime.saveOverrides();

    expect(fetchFn).toHaveBeenCalledWith('/api/overrides/demo', expect.objectContaining({
      method: 'POST',
    }));
    expect(reloadDiagram).toHaveBeenCalledWith({
      preserveSelectionIds: ['alpha'],
      canonicalState: {
        slug: 'demo',
        previewDocument: { kind: 'sequence' },
      },
    });
    expect(restoreSelectionIds).toHaveBeenCalledWith(['alpha']);
    expect(clearCoercedKeys).toHaveBeenCalledTimes(1);
    expect(setStatus).toHaveBeenCalledWith('Ready', 'ok');
    expect(model.removedIds.size).toBe(0);
    expect(runConstraints).toHaveBeenCalled();
  });

  it('blocks saves when local relayout is unavailable and there are pending overrides', async () => {
    const alertFn = vi.fn();
    const runtime = createPreviewSaveClientRuntime({
      document: {
        body: { appendChild() {} },
        activeElement: null,
        createElement() {
          return { click() {}, remove() {} };
        },
        getElementById() {
          return null;
        },
        querySelector() {
          return null;
        },
      },
      previewWindow: {},
      fetchFn: vi.fn(),
      alertFn,
    });

    runtime.init({
      slug: 'demo',
      getModel: () => ({
        overrides: { alpha: { dx: 8 } },
        gridOverrides: {},
        toOverridePayload: () => ({ overrides: { alpha: { dx: 8 } } }),
      }),
      getSelectedIds: () => [],
      restoreSelectionIds() {},
      serializeDirtyState: () => '{}',
      reloadDiagram: async () => undefined,
      getLayoutRelayoutStatus: () => ({ localReady: false }),
      getLayoutRelayoutRuntime: () => ({ lastMode: 'local-ready' }),
      getConstraintSummary: () => ({ errors: 0 }),
    });

    await runtime.saveOverrides();

    expect(alertFn).toHaveBeenCalledWith('Cannot save while local relayout is unavailable.');
  });
});
