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

  it('keeps editor changes after a server-root conflict and retries against the new revision', async () => {
    const previewWindow = {
      __DG_CONFIG: { workspace_revision: 'opened-revision' as string | null },
    };
    const requestRevisions: unknown[] = [];
    const fetchFn = vi.fn(async (_input: string, init?: Record<string, unknown>) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      requestRevisions.push(body.workspaceRevision);
      if (requestRevisions.length === 1) {
        return {
          ok: false,
          status: 409,
          statusText: 'Conflict',
          text: async () => JSON.stringify({
            error: 'changed on disk',
            workspaceRevision: 'external-revision',
          }),
          json: async () => ({}),
        };
      }
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => '',
        json: async () => ({ workspaceRevision: 'saved-revision' }),
      };
    });
    const runtime = createPreviewSaveClientRuntime({
      document: {
        body: { appendChild() {} },
        activeElement: null,
        createElement: () => ({ click() {}, remove() {} }),
        getElementById: () => null,
        querySelector: () => null,
      },
      previewWindow,
      fetchFn,
      alertFn: vi.fn(),
      confirmFn: () => false,
    });
    const reloadDiagram = vi.fn();
    runtime.init({
      slug: 'other:demo',
      getModel: () => ({
        overrides: {},
        gridOverrides: {},
        removedIds: new Set<string>(),
        get: () => null,
      }),
      getSelectedIds: () => [],
      restoreSelectionIds: vi.fn(),
      serializeDirtyState: () => '{}',
      reloadDiagram,
      getConstraintSummary: () => ({ errors: 0 }),
      getLayoutRelayoutStatus: () => ({ localReady: true }),
      getLayoutRelayoutRuntime: () => ({ lastMode: 'local-ready' }),
      setStatus: vi.fn(),
    });
    runtime.setDirty(true);

    await runtime.saveOverrides();
    expect(runtime.isDirty()).toBe(true);
    expect(previewWindow.__DG_CONFIG.workspace_revision).toBe('external-revision');
    expect(reloadDiagram).not.toHaveBeenCalled();

    await runtime.saveOverrides();
    expect(requestRevisions).toEqual(['opened-revision', 'external-revision']);
    expect(previewWindow.__DG_CONFIG.workspace_revision).toBe('saved-revision');
  });

  it('navigates to a successfully saved read-only copy without reloading the old source', async () => {
    const assigned: string[] = [];
    const runtime = createPreviewSaveClientRuntime({
      document: {
        body: { appendChild() {} },
        activeElement: null,
        createElement: () => ({ click() {}, remove() {} }),
        getElementById: () => null,
        querySelector: () => null,
      },
      previewWindow: { location: { assign: (url) => assigned.push(url) } },
      fetchFn: async () => ({
        ok: true,
        status: 200,
        text: async () => '',
        json: async () => ({ workspaceCopyAddress: 'local-mine:demo' }),
      }),
      alertFn: vi.fn(),
    });
    const reloadDiagram = vi.fn();
    runtime.init({
      slug: 'examples:demo',
      getModel: () => ({
        overrides: {},
        gridOverrides: {},
        removedIds: new Set<string>(),
        get: () => null,
      }),
      getSelectedIds: () => [],
      restoreSelectionIds: vi.fn(),
      serializeDirtyState: () => '{}',
      reloadDiagram,
      getConstraintSummary: () => ({ errors: 0 }),
      getLayoutRelayoutStatus: () => ({ localReady: true }),
      getLayoutRelayoutRuntime: () => ({ lastMode: 'local-ready' }),
    });
    runtime.setDirty(true);

    await runtime.saveOverrides();

    expect(reloadDiagram).not.toHaveBeenCalled();
    expect(assigned).toEqual(['/view/v3:local-mine:demo']);
    expect(runtime.isDirty()).toBe(false);
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
    const saveDrawioButton = {
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
          if (id === 'btn-save-drawio') return saveDrawioButton;
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
    expect(saveDrawioButton.disabled).toBe(false);

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

  it('downloads drawio export through the preview host route', async () => {
    const link = {
      href: '',
      download: '',
      click: vi.fn(),
      remove: vi.fn(),
    };
    const saveDrawioButton = {
      disabled: false,
      addEventListener: vi.fn(),
    };
    const fetchFn = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '<mxfile />',
      json: async () => ({}),
    }));
    const runtime = createPreviewSaveClientRuntime({
      document: {
        body: { appendChild: vi.fn() },
        activeElement: null,
        createElement() {
          return link;
        },
        getElementById(id: string) {
          if (id === 'btn-save-drawio') return saveDrawioButton;
          return null;
        },
        querySelector(selector: string) {
          return selector === '#stage svg' ? { cloneNode: vi.fn() } : null;
        },
      },
      previewWindow: {},
      fetchFn,
      alertFn: vi.fn(),
      blobCtor: class FakeBlob {},
      urlApi: {
        createObjectURL: () => 'blob:drawio',
        revokeObjectURL: vi.fn(),
      },
    });

    runtime.init({
      slug: 'demo',
      getModel: () => ({ overrides: {}, gridOverrides: {}, removedIds: new Set<string>() }),
      getSelectedIds: () => [],
      restoreSelectionIds: vi.fn(),
      serializeDirtyState: () => '{}',
      reloadDiagram: vi.fn(async () => undefined),
      getLayoutRelayoutStatus: () => ({ localReady: true }),
      getLayoutRelayoutRuntime: () => ({ lastMode: 'local-ready' }),
      getConstraintSummary: () => ({ errors: 0 }),
    });

    await runtime.saveCurrentDrawio();

    expect(fetchFn).toHaveBeenCalledWith('/drawio/demo.drawio', { method: 'GET' });
    expect(link.download).toBe('demo.drawio');
    expect(link.click).toHaveBeenCalledTimes(1);
  });

  it('downloads the selected Mermaid or D2 format through the interchange route', async () => {
    const link = {
      href: '',
      download: '',
      click: vi.fn(),
      remove: vi.fn(),
    };
    const formatSelect = {
      value: 'mermaid',
      addEventListener: vi.fn(),
    };
    const exportButton = {
      disabled: false,
      addEventListener: vi.fn(),
    };
    const fetchFn = vi.fn(async (input: string) => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => input.includes('/d2?') ? 'value: {}' : 'flowchart TB',
      json: async () => ({}),
    }));
    const runtime = createPreviewSaveClientRuntime({
      document: {
        body: { appendChild: vi.fn() },
        activeElement: null,
        createElement() {
          return link;
        },
        getElementById(id: string) {
          if (id === 'export-format') return formatSelect;
          if (id === 'btn-export-format') return exportButton;
          return null;
        },
        querySelector() {
          return null;
        },
      },
      previewWindow: {},
      fetchFn,
      alertFn: vi.fn(),
      blobCtor: class FakeBlob {},
      urlApi: {
        createObjectURL: () => 'blob:interchange',
        revokeObjectURL: vi.fn(),
      },
    });

    runtime.init({
      slug: 'v3:demo',
      getModel: () => ({ overrides: {}, gridOverrides: {}, removedIds: new Set<string>() }),
      getSelectedIds: () => [],
      restoreSelectionIds: vi.fn(),
      serializeDirtyState: () => '{}',
      reloadDiagram: vi.fn(async () => undefined),
    });

    await runtime.exportCurrentFormat();
    expect(fetchFn).toHaveBeenCalledWith('/api/export/mermaid?slug=demo', { method: 'GET' });
    expect(link.download).toBe('demo.mmd');

    formatSelect.value = 'd2';
    await runtime.exportCurrentFormat();
    expect(fetchFn).toHaveBeenCalledWith('/api/export/d2?slug=demo', { method: 'GET' });
    expect(link.download).toBe('demo.d2');
    expect(link.click).toHaveBeenCalledTimes(2);
  });

  it('imports a selected source file as a new diagram and navigates to it', async () => {
    const file = {
      name: 'customer-flow.mmd',
      text: vi.fn(async () => 'flowchart TB\n  source[Source]'),
    };
    const fileInput = {
      accept: '',
      files: { length: 1, 0: file },
      addEventListener: vi.fn(),
    };
    const formatSelect = {
      value: 'mermaid',
      addEventListener: vi.fn(),
    };
    const slugInput = {
      value: '',
    };
    const importButton = {
      addEventListener: vi.fn(),
    };
    const locationAssign = vi.fn();
    const fetchFn = vi.fn(async () => ({
      ok: true,
      status: 201,
      statusText: 'Created',
      text: async () => '',
      json: async () => ({ ok: true, slug: 'customer-flow', warnings: [] }),
    }));
    const runtime = createPreviewSaveClientRuntime({
      document: {
        body: { appendChild() {} },
        activeElement: null,
        createElement() {
          return { click() {}, remove() {} };
        },
        getElementById(id: string) {
          if (id === 'interchange-import-file') return fileInput;
          if (id === 'interchange-import-format') return formatSelect;
          if (id === 'interchange-import-slug') return slugInput;
          if (id === 'btn-import-interchange') return importButton;
          return null;
        },
        querySelector() {
          return null;
        },
      },
      previewWindow: { location: { assign: locationAssign } },
      fetchFn,
      alertFn: vi.fn(),
    });

    runtime.init({
      slug: 'demo',
      getModel: () => ({ overrides: {}, gridOverrides: {}, removedIds: new Set<string>() }),
      getSelectedIds: () => [],
      restoreSelectionIds: vi.fn(),
      serializeDirtyState: () => '{}',
      reloadDiagram: vi.fn(async () => undefined),
      setStatus: vi.fn(),
    });

    await runtime.importCurrentFile();
    expect(fileInput.accept).toBe('.mmd,.mermaid');
    expect(slugInput.value).toBe('customer-flow');
    expect(fetchFn).toHaveBeenCalledWith('/api/import/mermaid?slug=customer-flow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'flowchart TB\n  source[Source]' }),
    });
    expect(locationAssign).toHaveBeenCalledWith('/view/v3:customer-flow');
  });

  it('names visual downgrades in the import summary and still navigates', async () => {
    const fileInput = {
      accept: '',
      files: {
        length: 1,
        0: {
          name: 'styled-flow.mmd',
          text: vi.fn(async () => 'flowchart TB\n  source[Source]:::highlight'),
        },
      },
      addEventListener: vi.fn(),
    };
    const formatSelect = { value: 'mermaid', addEventListener: vi.fn() };
    const slugInput = { value: 'styled-flow' };
    const locationAssign = vi.fn();
    const alertFn = vi.fn();
    const setStatus = vi.fn();
    const runtime = createPreviewSaveClientRuntime({
      document: {
        body: { appendChild() {} },
        activeElement: null,
        createElement: () => ({ click() {}, remove() {} }),
        getElementById(id: string) {
          if (id === 'interchange-import-file') return fileInput;
          if (id === 'interchange-import-format') return formatSelect;
          if (id === 'interchange-import-slug') return slugInput;
          return null;
        },
        querySelector: () => null,
      },
      previewWindow: { location: { assign: locationAssign } },
      fetchFn: vi.fn(async () => ({
        ok: true,
        status: 201,
        statusText: 'Created',
        text: async () => '',
        json: async () => ({
          ok: true,
          slug: 'styled-flow',
          warnings: [],
          summary: {
            preserved: 1,
            downgraded: [
              { message: 'Class highlight fill was not preserved.' },
              { message: 'Rounded shape was imported as a rectangle.' },
            ],
            blocked: [],
          },
        }),
      })),
      alertFn,
    });
    runtime.init({
      slug: 'demo',
      getModel: () => ({ overrides: {}, gridOverrides: {}, removedIds: new Set<string>() }),
      getSelectedIds: () => [],
      restoreSelectionIds: vi.fn(),
      serializeDirtyState: () => '{}',
      reloadDiagram: vi.fn(),
      setStatus,
    });

    await runtime.importCurrentFile();

    expect(alertFn).toHaveBeenCalledWith(expect.stringContaining(
      '1 preserved, 2 downgraded, 0 blocked',
    ));
    expect(alertFn).toHaveBeenCalledWith(expect.stringContaining(
      'Class highlight fill was not preserved.',
    ));
    expect(alertFn).toHaveBeenCalledWith(expect.stringContaining(
      'Rounded shape was imported as a rectangle.',
    ));
    expect(setStatus).toHaveBeenCalledWith(
      'Imported: 1 preserved, 2 downgraded, 0 blocked',
      'ok',
    );
    expect(locationAssign).toHaveBeenCalledWith('/view/v3:styled-flow');
  });

  it('does not report success or navigate when the import summary is blocked', async () => {
    const fileInput = {
      accept: '',
      files: {
        length: 1,
        0: {
          name: 'lossy-flow.mmd',
          text: vi.fn(async () => 'flowchart TB\n  source@{ animate: true } --> target'),
        },
      },
      addEventListener: vi.fn(),
    };
    const formatSelect = { value: 'mermaid', addEventListener: vi.fn() };
    const slugInput = { value: 'lossy-flow' };
    const locationAssign = vi.fn();
    const alertFn = vi.fn();
    const setStatus = vi.fn();
    const runtime = createPreviewSaveClientRuntime({
      document: {
        body: { appendChild() {} },
        activeElement: null,
        createElement: () => ({ click() {}, remove() {} }),
        getElementById(id: string) {
          if (id === 'interchange-import-file') return fileInput;
          if (id === 'interchange-import-format') return formatSelect;
          if (id === 'interchange-import-slug') return slugInput;
          return null;
        },
        querySelector: () => null,
      },
      previewWindow: { location: { assign: locationAssign } },
      fetchFn: vi.fn(async () => ({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Content',
        text: async () => JSON.stringify({
          ok: false,
          slug: 'lossy-flow',
          warnings: [],
          summary: {
            preserved: 0,
            downgraded: [],
            blocked: [{ message: 'Animated edge identity cannot be preserved.' }],
          },
        }),
        json: async () => {
          throw new Error('A blocked response must not be consumed as success JSON.');
        },
      })),
      alertFn,
    });
    runtime.init({
      slug: 'demo',
      getModel: () => ({ overrides: {}, gridOverrides: {}, removedIds: new Set<string>() }),
      getSelectedIds: () => [],
      restoreSelectionIds: vi.fn(),
      serializeDirtyState: () => '{}',
      reloadDiagram: vi.fn(),
      setStatus,
    });

    await runtime.importCurrentFile();

    expect(alertFn).toHaveBeenCalledWith(expect.stringContaining(
      'Import blocked: 0 preserved, 0 downgraded, 1 blocked',
    ));
    expect(alertFn).toHaveBeenCalledWith(expect.stringContaining(
      'Animated edge identity cannot be preserved.',
    ));
    expect(setStatus).toHaveBeenCalledWith(
      'Import blocked: 0 preserved, 0 downgraded, 1 blocked',
      'error',
    );
    expect(setStatus).not.toHaveBeenCalledWith(expect.anything(), 'ok');
    expect(locationAssign).not.toHaveBeenCalled();
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
