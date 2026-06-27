import { describe, expect, it, vi } from 'vitest';
import {
  createPreviewSaveClientRuntime,
  resolvePreviewSaveButtonState,
  resolvePreviewSaveSvgButtonState,
} from '../src/preview-shell/app-save-client.js';

describe('preview save client runtime', () => {
  it('resolves save and svg export button disabled states', () => {
    expect(resolvePreviewSaveButtonState({ dirty: false })).toEqual({
      disabled: true,
      reason: 'clean',
    });
    expect(resolvePreviewSaveButtonState({ dirty: true, saving: true })).toEqual({
      disabled: true,
      reason: 'saving',
    });
    expect(resolvePreviewSaveButtonState({ dirty: true, errorCount: 1 })).toEqual({
      disabled: true,
      reason: 'constraint-errors',
    });
    expect(resolvePreviewSaveButtonState({ dirty: true, relayoutLastMode: 'local-error' })).toEqual({
      disabled: true,
      reason: 'relayout-error',
    });
    expect(resolvePreviewSaveButtonState({ dirty: true, relayoutLocalReady: false })).toEqual({
      disabled: true,
      reason: 'relayout-unavailable',
    });
    expect(resolvePreviewSaveButtonState({ dirty: true, relayoutLocalReady: true })).toEqual({
      disabled: false,
      reason: 'ready',
    });
    expect(resolvePreviewSaveSvgButtonState({ hasRenderedSvg: false })).toEqual({
      disabled: true,
      reason: 'missing-render',
    });
    expect(resolvePreviewSaveSvgButtonState({ hasRenderedSvg: true, exporting: true })).toEqual({
      disabled: true,
      reason: 'exporting',
    });
  });

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
    const fetchFn = vi.fn();
    const reloadDiagram = vi.fn(async () => undefined);
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
      fetchFn,
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
      reloadDiagram,
      getLayoutRelayoutStatus: () => ({ localReady: false }),
      getLayoutRelayoutRuntime: () => ({ lastMode: 'local-ready' }),
      getConstraintSummary: () => ({ errors: 0 }),
    });

    await runtime.saveOverrides();

    expect(alertFn).toHaveBeenCalledWith('Cannot save while local relayout is unavailable.');
    // No partial persist: the rejected save must not issue a persist request and
    // must not trigger a canonical-state reload (T043 / SC).
    expect(fetchFn).not.toHaveBeenCalled();
    expect(reloadDiagram).not.toHaveBeenCalled();
  });

  it('syncs save and svg button disabled state from relayout and in-flight work', async () => {
    const saveButton = {
      disabled: false,
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
      },
      addEventListener: vi.fn(),
    };
    const saveSvgButton = {
      disabled: false,
      addEventListener: vi.fn(),
    };
    const svg = {
      cloneNode: () => ({
        getAttribute: () => 'set',
        setAttribute: vi.fn(),
      }),
    };
    let resolveFetch: ((value: {
      ok: boolean;
      status: number;
      statusText: string;
      text: () => Promise<string>;
      json: () => Promise<unknown>;
    }) => void) | null = null;
    const fetchFn = vi.fn(() => new Promise<{
      ok: boolean;
      status: number;
      statusText: string;
      text: () => Promise<string>;
      json: () => Promise<unknown>;
    }>((resolve) => {
      resolveFetch = resolve;
    }));
    const runtime = createPreviewSaveClientRuntime({
      document: {
        body: { appendChild() {} },
        activeElement: null,
        createElement() {
          return { click() {}, remove() {} };
        },
        getElementById(id: string) {
          if (id === 'btn-save') return saveButton;
          if (id === 'btn-save-svg') return saveSvgButton;
          return null;
        },
        querySelector(selector: string) {
          return selector === '#stage svg' ? svg : null;
        },
      },
      previewWindow: {},
      fetchFn,
      alertFn: vi.fn(),
      blobCtor: class FakeBlob {},
      urlApi: {
        createObjectURL: () => 'blob:demo',
        revokeObjectURL: vi.fn(),
      },
      xmlSerializerFactory: () => ({
        serializeToString: () => '<svg />',
      }),
    });
    const model = {
      overrides: { alpha: { dx: 8 } },
      gridOverrides: {},
      removedIds: new Set<string>(),
      toOverridePayload: () => ({ overrides: { alpha: { dx: 8 } } }),
    };
    let relayoutReady = false;

    runtime.init({
      slug: 'demo',
      getModel: () => model,
      getSelectedIds: () => [],
      restoreSelectionIds: vi.fn(),
      serializeDirtyState: () => '{"dirty":true}',
      reloadDiagram: vi.fn(async () => undefined),
      getLayoutRelayoutStatus: () => ({ localReady: relayoutReady }),
      getLayoutRelayoutRuntime: () => ({ lastMode: 'local-ready' }),
      getConstraintSummary: () => ({ errors: 0 }),
    });
    runtime.setDirty(true);
    expect(saveButton.disabled).toBe(true);
    expect(saveSvgButton.disabled).toBe(false);

    relayoutReady = true;
    runtime.syncSaveButton();
    expect(saveButton.disabled).toBe(false);

    const savePromise = runtime.saveOverrides();
    expect(saveButton.disabled).toBe(true);
    resolveFetch?.({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '',
      json: async () => ({}),
    });
    await savePromise;
    expect(saveButton.disabled).toBe(false);
  });
});
