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

    const model = {
      overrides: { alpha: { dx: 8 } },
      gridOverrides: {},
      removedIds: new Set(['stale']),
      toOverridePayload: () => ({ overrides: { alpha: { dx: 8 } } }),
      get(id: string) {
        if (id === 'alpha') {
          return {
            type: 'box',
            data: {
              position: 'ABSOLUTE',
              authored_x: 24,
              authored_y: 32,
              width: 120,
              height: 64,
            },
          };
        }
        return null;
      },
    };
    const reloadDiagram = vi.fn(async () => {
      expect(model.removedIds.size).toBe(0);
    });
    const restoreSelectionIds = vi.fn();
    const setStatus = vi.fn();
    const clearCoercedKeys = vi.fn();
    const runConstraints = vi.fn();
    const onSaveSuccess = vi.fn();

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
      onSaveSuccess,
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
    expect(onSaveSuccess).toHaveBeenCalledTimes(1);
    expect(setStatus).toHaveBeenCalledWith('Ready', 'ok');
    expect(model.removedIds.size).toBe(0);
    expect(runConstraints).toHaveBeenCalled();
  });

  it('treats external workspace changes as dirty save state', async () => {
    const saveButton = {
      disabled: true,
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
      },
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
        return null;
      },
      querySelector() {
        return null;
      },
    };
    const fetchFn = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '',
      json: async () => ({}),
    }));
    const runtime = createPreviewSaveClientRuntime({
      document,
      previewWindow: {},
      fetchFn,
      alertFn: vi.fn(),
    });
    const externalDirtyState = { dirty: true };

    runtime.init({
      slug: 'demo',
      getModel: () => ({
        overrides: {},
        gridOverrides: {},
        removedIds: new Set<string>(),
        get() {
          return null;
        },
      }),
      getSelectedIds: () => [],
      restoreSelectionIds: vi.fn(),
      serializeDirtyState: () => '{}',
      reloadDiagram: vi.fn(async () => undefined),
      getLayoutRelayoutStatus: () => ({ localReady: true }),
      getLayoutRelayoutRuntime: () => ({ lastMode: 'local-ready' }),
      getConstraintSummary: () => ({ errors: 0 }),
      getConstraintErrorCount: () => 0,
      runConstraints: vi.fn(),
      clearCoercedKeys: vi.fn(),
      setStatus: vi.fn(),
      hasExternalDirtyState: () => externalDirtyState.dirty,
    });

    expect(runtime.isDirty()).toBe(true);
    runtime.syncSaveButton();
    expect(saveButton.disabled).toBe(false);

    externalDirtyState.dirty = false;
    runtime.syncSaveButton();
    expect(runtime.isDirty()).toBe(false);
    expect(saveButton.disabled).toBe(true);
  });

  it('emits canonical drag, nudge, multi-select, and resize overrides before POST', async () => {
    const fetchFn = vi.fn(async (_input, init) => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '',
      json: async () => ({}),
    }));
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
      alertFn: vi.fn(),
    });

    const model = {
      overrides: {
        floating: { dx: 8, dy: -8 },
        nudged: { dx: 1, dy: -1 },
        multi_left: { dx: 16, dy: 8 },
        multi_right: { dx: 16, dy: 8 },
        resizable: { dw: 24, dh: 16 },
        panel__body: { align: 'BOTTOM_RIGHT' },
        panel__heading: { text: { heading: 'Ignored synthetic heading' } },
      },
      gridOverrides: {},
      removedIds: new Set<string>(),
      get(id: string) {
        if (id === 'floating') {
          return {
            type: 'box',
            data: {
              position: 'ABSOLUTE',
              authored_x: 32,
              authored_y: 48,
              width: 120,
              height: 64,
            },
          };
        }
        if (id === 'resizable') {
          return {
            type: 'panel',
            data: {
              width: 160,
              height: 96,
            },
          };
        }
        if (id === 'nudged') {
          return {
            type: 'box',
            data: {
              position: 'ABSOLUTE',
              authored_x: 96,
              authored_y: 32,
            },
          };
        }
        if (id === 'multi_left') {
          return {
            type: 'box',
            data: {
              position: 'ABSOLUTE',
              authored_x: 160,
              authored_y: 80,
            },
          };
        }
        if (id === 'multi_right') {
          return {
            type: 'box',
            data: {
              position: 'ABSOLUTE',
              authored_x: 240,
              authored_y: 80,
            },
          };
        }
        return null;
      },
    };

    runtime.init({
      slug: 'demo',
      getModel: () => model,
      getSelectedIds: () => [],
      restoreSelectionIds: vi.fn(),
      serializeDirtyState: () => '{"dirty":true}',
      reloadDiagram: vi.fn(async () => undefined),
      getLayoutRelayoutStatus: () => ({ localReady: true }),
      getLayoutRelayoutRuntime: () => ({ lastMode: 'local-ready' }),
      getConstraintSummary: () => ({ errors: 0 }),
    });

    await runtime.saveOverrides();

    const request = fetchFn.mock.calls[0]?.[1] as { body?: string } | undefined;
    expect(request?.body).toBeTruthy();
    expect(JSON.parse(String(request?.body))).toEqual({
      format_version: 1,
      overrides: {
        floating: {
          position: 'ABSOLUTE',
          x: 40,
          y: 40,
        },
        nudged: {
          position: 'ABSOLUTE',
          x: 97,
          y: 31,
        },
        multi_left: {
          position: 'ABSOLUTE',
          x: 176,
          y: 88,
        },
        multi_right: {
          position: 'ABSOLUTE',
          x: 256,
          y: 88,
        },
        resizable: {
          width: 184,
          height: 112,
          sizing_w: 'FIXED',
          sizing_h: 'FIXED',
        },
      },
    });
  });

  it('drops unsupported arrow save keys without aborting frame persistence', async () => {
    const alertFn = vi.fn();
    const fetchFn = vi.fn(async (_input, init) => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '',
      json: async () => ({}),
    }));
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

    const model = {
      overrides: {
        alpha: { dx: 8 },
        'arrow:id:edge-1': {
          waypoints: [[24, 32]],
          color: '#E95420',
          selected: true,
        },
      },
      gridOverrides: {},
      removedIds: new Set<string>(),
      get(id: string) {
        if (id === 'alpha') {
          return {
            type: 'box',
            data: {
              position: 'ABSOLUTE',
              authored_x: 32,
              authored_y: 48,
              width: 120,
              height: 64,
            },
          };
        }
        if (id === 'arrow:id:edge-1') {
          return {
            type: 'arrow',
            data: {},
          };
        }
        return null;
      },
    };

    runtime.init({
      slug: 'demo',
      getModel: () => model,
      getSelectedIds: () => [],
      restoreSelectionIds: vi.fn(),
      serializeDirtyState: () => '{"dirty":true}',
      reloadDiagram: vi.fn(async () => undefined),
      getLayoutRelayoutStatus: () => ({ localReady: true }),
      getLayoutRelayoutRuntime: () => ({ lastMode: 'local-ready' }),
      getConstraintSummary: () => ({ errors: 0 }),
    });

    await runtime.saveOverrides();

    expect(alertFn).not.toHaveBeenCalled();
    const request = fetchFn.mock.calls[0]?.[1] as { body?: string } | undefined;
    expect(JSON.parse(String(request?.body))).toEqual({
      format_version: 1,
      overrides: {
        alpha: {
          position: 'ABSOLUTE',
          x: 40,
          y: 48,
        },
        'arrow:id:edge-1': {
          waypoints: [[24, 32]],
        },
      },
    });
  });

  it('blocks saves when layout overrides use a non-frame-YAML persist namespace', async () => {
    const alertFn = vi.fn();
    const fetchFn = vi.fn();
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

    const model = {
      overrides: {},
      gridOverrides: {},
      layoutOverrides: {
        alpha: 0.8,
      },
      layoutOverrideNamespace: 'simulation',
      removedIds: new Set<string>(),
      get() {
        return null;
      },
    };

    runtime.init({
      slug: 'demo',
      getModel: () => model,
      getSelectedIds: () => [],
      restoreSelectionIds: vi.fn(),
      serializeDirtyState: () => '{"dirty":true}',
      reloadDiagram: vi.fn(async () => undefined),
      getLayoutRelayoutStatus: () => ({ localReady: true }),
      getLayoutRelayoutRuntime: () => ({ lastMode: 'local-ready' }),
      getConstraintSummary: () => ({ errors: 0 }),
    });

    await runtime.saveOverrides();

    expect(alertFn).toHaveBeenCalledWith(
      "Cannot save: model.layoutOverrides uses non-frame-YAML persist namespace 'simulation' (expected meta.<engine>)",
    );
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('blocks saves when layout overrides contain unsupported frame-YAML keys', async () => {
    const alertFn = vi.fn();
    const fetchFn = vi.fn();
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

    const model = {
      overrides: {},
      gridOverrides: {},
      layoutOverrides: {
        'elk.direction': 'RIGHT',
        transient: 'ignored',
      },
      layoutOverrideNamespace: 'meta.elk',
      removedIds: new Set<string>(),
      get() {
        return null;
      },
    };

    runtime.init({
      slug: 'demo',
      getModel: () => model,
      getSelectedIds: () => [],
      restoreSelectionIds: vi.fn(),
      serializeDirtyState: () => '{"dirty":true}',
      reloadDiagram: vi.fn(async () => undefined),
      getLayoutRelayoutStatus: () => ({ localReady: true }),
      getLayoutRelayoutRuntime: () => ({ lastMode: 'local-ready' }),
      getConstraintSummary: () => ({ errors: 0 }),
    });

    await runtime.saveOverrides();

    expect(alertFn).toHaveBeenCalledWith(
      "Cannot save: model.layoutOverrides contains unsupported frame-YAML engine layout keys: transient; engine_layout_overrides.meta.elk is ambiguous across supported engines in 'meta.elk'; set the active layout engine before saving",
    );
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('blocks saves when shared meta.elk overrides mix keys from incompatible engines', async () => {
    const alertFn = vi.fn();
    const fetchFn = vi.fn();
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

    const model = {
      overrides: {},
      gridOverrides: {},
      layoutOverrides: {
        'elk.layered.layering.strategy': 'LONGEST_PATH',
        'elk.force.iterations': 400,
      },
      layoutOverrideNamespace: 'meta.elk',
      removedIds: new Set<string>(),
      get() {
        return null;
      },
    };

    runtime.init({
      slug: 'demo',
      getModel: () => model,
      getSelectedIds: () => [],
      restoreSelectionIds: vi.fn(),
      serializeDirtyState: () => '{"dirty":true}',
      reloadDiagram: vi.fn(async () => undefined),
      getLayoutRelayoutStatus: () => ({ localReady: true }),
      getLayoutRelayoutRuntime: () => ({ lastMode: 'local-ready' }),
      getConstraintSummary: () => ({ errors: 0 }),
    });

    await runtime.saveOverrides();

    expect(alertFn).toHaveBeenCalledWith(
      "Cannot save: model.layoutOverrides mixes frame-YAML engine layout keys that do not belong to any single supported engine in 'meta.elk'",
    );
    expect(fetchFn).not.toHaveBeenCalled();
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
      get(id: string) {
        if (id === 'alpha') {
          return {
            type: 'box',
            data: {
              position: 'ABSOLUTE',
              authored_x: 16,
              authored_y: 24,
              width: 120,
              height: 64,
            },
          };
        }
        return null;
      },
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

  it('keeps removal state and reports reload failures after a successful persist', async () => {
    const alertFn = vi.fn();
    const clearCoercedKeys = vi.fn();
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
      fetchFn: vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => '',
        json: async () => ({}),
      })),
      alertFn,
    });

    const removedIds = new Set(['alpha']);
    const model = {
      overrides: {},
      gridOverrides: {},
      removedIds,
      toOverridePayload: () => ({ overrides: {}, removed_ids: ['alpha'] }),
      get() {
        return null;
      },
    };
    const reloadDiagram = vi.fn(async () => {
      expect(model.removedIds.size).toBe(0);
      throw new Error('reload exploded');
    });

    runtime.init({
      slug: 'demo',
      getModel: () => model,
      getSelectedIds: () => [],
      restoreSelectionIds: vi.fn(),
      serializeDirtyState: () => '{"dirty":true}',
      reloadDiagram,
      getLayoutRelayoutStatus: () => ({ localReady: true }),
      getLayoutRelayoutRuntime: () => ({ lastMode: 'local-ready' }),
      getConstraintSummary: () => ({ errors: 0 }),
      clearCoercedKeys,
      setStatus: vi.fn(),
    });

    await runtime.saveOverrides();

    expect(alertFn).toHaveBeenCalledWith(
      'Save succeeded, but reload failed: Error: reload exploded',
    );
    expect(model.removedIds).toBe(removedIds);
    expect(clearCoercedKeys).not.toHaveBeenCalled();
  });
});
