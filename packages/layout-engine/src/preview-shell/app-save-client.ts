export interface PreviewSaveClientRuntimeWindow {
  addEventListener?: (type: string, listener: (event: unknown) => unknown) => void;
}

export interface PreviewSaveClientRuntimeDocument {
  body: { appendChild: (node: unknown) => void };
  activeElement: unknown;
  createElement: (tagName: string) => {
    href?: string;
    download?: string;
    click: () => void;
    remove: () => void;
  };
  getElementById: (id: string) => {
    disabled?: boolean;
    classList?: { add: (name: string) => void; remove: (name: string) => void };
    addEventListener?: (type: string, listener: () => void) => void;
  } | null;
  querySelector: (selector: string) => {
    cloneNode: (deep?: boolean) => unknown;
    getAttribute: (name: string) => string | null;
    setAttribute: (name: string, value: string) => void;
  } | null;
}

export interface PreviewSaveClientRuntimeBlobLike {
  // Marker only for runtime constructor compatibility.
}

export interface PreviewSaveClientRuntimeOptions {
  document: PreviewSaveClientRuntimeDocument;
  previewWindow: PreviewSaveClientRuntimeWindow;
  fetchFn?: (input: string, init?: Record<string, unknown>) => Promise<{
    ok: boolean;
    status: number;
    statusText?: string;
    text: () => Promise<string>;
    json: () => Promise<unknown>;
  }>;
  alertFn?: (message: string) => void;
  blobCtor?: new (parts: unknown[], options?: { type?: string }) => PreviewSaveClientRuntimeBlobLike;
  urlApi?: {
    createObjectURL: (value: PreviewSaveClientRuntimeBlobLike) => string;
    revokeObjectURL: (url: string) => void;
  };
  xmlSerializerFactory?: () => { serializeToString: (node: unknown) => string };
}

export interface PreviewSaveClientRuntimeDeps {
  slug: string;
  getModel: () => unknown;
  getSelectedIds: () => string[];
  restoreSelectionIds: (ids: string[]) => void;
  serializeDirtyState: () => string;
  reloadDiagram: (options?: unknown) => Promise<unknown> | unknown;
  collectEngineSavePayload?: (
    basePayload: Record<string, unknown>,
    model: Record<string, unknown>,
  ) => Record<string, unknown>;
  getLayoutRelayoutStatus?: () => Record<string, unknown>;
  /** @deprecated Prefer `getLayoutRelayoutStatus`. */
  getV3RelayoutStatus?: () => Record<string, unknown>;
  getLayoutRelayoutRuntime?: () => Record<string, unknown>;
  /** @deprecated Prefer `getLayoutRelayoutRuntime`. */
  getV3RelayoutRuntime?: () => Record<string, unknown>;
  getConstraintSummary?: () => { errors?: number };
  getConstraintErrorCount?: () => number;
  runConstraints?: () => void;
  clearCoercedKeys?: () => void;
  setStatus?: (message: string, kind?: string) => void;
  sanitizeSvgCloneForExport?: (clone: unknown) => void;
  onBeforeUnload?: (event: unknown) => unknown;
}

export interface PreviewSaveClientRuntime {
  init: (deps: PreviewSaveClientRuntimeDeps) => void;
  isDirty: () => boolean;
  setDirty: (dirty: boolean) => void;
  markSaved: (serializedState: string | null) => void;
  syncDirtyFromSerialized: (serializedState: string) => void;
  getLastSavedState: () => string | null;
  syncSaveButton: (errorCount?: number | null) => void;
  syncSaveSvgButton: () => void;
  saveOverrides: () => Promise<void>;
  saveCurrentSvg: () => void;
  trySaveIfDirty: () => void;
}

export interface PreviewSaveButtonStateOptions {
  dirty: boolean;
  saving?: boolean | null;
  errorCount?: number | null;
  relayoutLocalReady?: boolean | null;
  relayoutLastMode?: string | null;
}

export interface PreviewSaveSvgButtonStateOptions {
  hasRenderedSvg: boolean;
  exporting?: boolean | null;
}

export interface PreviewButtonState {
  disabled: boolean;
  reason: string;
}

function resolveLayoutRelayoutStatus(
  deps: PreviewSaveClientRuntimeDeps,
): Record<string, unknown> {
  return deps.getLayoutRelayoutStatus?.()
    ?? deps.getV3RelayoutStatus?.()
    ?? { localReady: true };
}

function resolveLayoutRelayoutRuntime(
  deps: PreviewSaveClientRuntimeDeps,
): Record<string, unknown> {
  return deps.getLayoutRelayoutRuntime?.()
    ?? deps.getV3RelayoutRuntime?.()
    ?? {};
}

function currentSvgFilename(slug: string): string {
  const baseSlug = String(slug || '').replace(/^v3:/, '');
  return `${baseSlug}-onbrand-v3.svg`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

export function resolvePreviewSaveButtonState(
  options: PreviewSaveButtonStateOptions,
): PreviewButtonState {
  if (!options.dirty) {
    return { disabled: true, reason: 'clean' };
  }
  if (options.saving) {
    return { disabled: true, reason: 'saving' };
  }
  if ((options.errorCount ?? 0) > 0) {
    return { disabled: true, reason: 'constraint-errors' };
  }
  if (options.relayoutLastMode === 'local-error') {
    return { disabled: true, reason: 'relayout-error' };
  }
  if (options.relayoutLocalReady === false) {
    return { disabled: true, reason: 'relayout-unavailable' };
  }
  return { disabled: false, reason: 'ready' };
}

export function resolvePreviewSaveSvgButtonState(
  options: PreviewSaveSvgButtonStateOptions,
): PreviewButtonState {
  if (options.exporting) {
    return { disabled: true, reason: 'exporting' };
  }
  if (!options.hasRenderedSvg) {
    return { disabled: true, reason: 'missing-render' };
  }
  return { disabled: false, reason: 'ready' };
}

export function createPreviewSaveClientRuntime(
  options: PreviewSaveClientRuntimeOptions,
): PreviewSaveClientRuntime {
  let deps: PreviewSaveClientRuntimeDeps | null = null;
  let dirty = false;
  let saving = false;
  let svgExporting = false;
  let lastSavedState: string | null = null;
  let initialized = false;

  const alertFn = options.alertFn ?? ((message: string) => globalThis.alert?.(message));

  function requireDeps(): PreviewSaveClientRuntimeDeps {
    if (!deps) {
      throw new Error('PreviewSaveClient.init() must run before save operations');
    }
    return deps;
  }

  function getConstraintErrorCount(): number {
    if (!deps) {
      return 0;
    }
    return deps.getConstraintErrorCount?.()
      ?? deps.getConstraintSummary?.().errors
      ?? 0;
  }

  function syncSaveButton(errorCount?: number | null): void {
    const saveButton = options.document.getElementById('btn-save');
    if (!saveButton) {
      return;
    }
    const errors = errorCount ?? getConstraintErrorCount();
    const relayoutStatus = asRecord(deps ? resolveLayoutRelayoutStatus(deps) : null) as { localReady?: boolean };
    const relayoutRuntime = asRecord(deps ? resolveLayoutRelayoutRuntime(deps) : null) as { lastMode?: string };
    saveButton.disabled = resolvePreviewSaveButtonState({
      dirty,
      saving,
      errorCount: errors,
      relayoutLocalReady: relayoutStatus.localReady ?? null,
      relayoutLastMode: relayoutRuntime.lastMode ?? null,
    }).disabled;
    if (dirty) {
      saveButton.classList?.add('dirty');
    } else {
      saveButton.classList?.remove('dirty');
    }
  }

  function syncSaveSvgButton(): void {
    const saveSvgButton = options.document.getElementById('btn-save-svg');
    if (!saveSvgButton) {
      return;
    }
    const svg = options.document.querySelector('#stage svg');
    saveSvgButton.disabled = resolvePreviewSaveSvgButtonState({
      hasRenderedSvg: Boolean(svg),
      exporting: svgExporting,
    }).disabled;
  }

  function setDirty(nextDirty: boolean): void {
    dirty = Boolean(nextDirty);
    syncSaveButton();
    if (dirty) {
      deps?.runConstraints?.();
    }
  }

  function markSaved(serializedState: string | null): void {
    lastSavedState = serializedState;
    setDirty(false);
    syncSaveSvgButton();
  }

  function syncDirtyFromSerialized(serializedState: string): void {
    setDirty(serializedState !== lastSavedState);
  }

  function downloadTextFile(filename: string, content: string, mimeType: string): void {
    if (!options.blobCtor || !options.urlApi) {
      throw new Error('Preview save client requires Blob and URL APIs for SVG export');
    }
    const blob = new options.blobCtor([content], { type: mimeType });
    const url = options.urlApi.createObjectURL(blob);
    const link = options.document.createElement('a');
    link.href = url;
    link.download = filename;
    options.document.body.appendChild(link);
    link.click();
    link.remove();
    options.urlApi.revokeObjectURL(url);
  }

  function commitFocusedControl(): void {
    const active = options.document.activeElement as { blur?: () => void } | null;
    if (!active || active === options.document.body || typeof active.blur !== 'function') {
      return;
    }
    active.blur();
  }

  function saveCurrentSvg(): void {
    const runtimeDeps = requireDeps();
    if (svgExporting) {
      return;
    }
    svgExporting = true;
    syncSaveSvgButton();
    try {
      const svg = options.document.querySelector('#stage svg');
      if (!svg) {
        alertFn('No SVG is loaded.');
        return;
      }
      if (!options.xmlSerializerFactory) {
        throw new Error('Preview save client requires XMLSerializer for SVG export');
      }
      const clone = svg.cloneNode(true) as {
        getAttribute: (name: string) => string | null;
        setAttribute: (name: string, value: string) => void;
      };
      runtimeDeps.sanitizeSvgCloneForExport?.(clone);
      if (!clone.getAttribute('xmlns')) {
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      }
      if (!clone.getAttribute('xmlns:xlink')) {
        clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
      }
      const serialized = options.xmlSerializerFactory().serializeToString(clone);
      const prolog = serialized.startsWith('<?xml')
        ? ''
        : '<?xml version="1.0" encoding="UTF-8"?>\n';
      downloadTextFile(
        currentSvgFilename(runtimeDeps.slug),
        `${prolog}${serialized}\n`,
        'image/svg+xml;charset=utf-8',
      );
    } finally {
      svgExporting = false;
      syncSaveSvgButton();
    }
  }

  async function saveOverrides(): Promise<void> {
    const runtimeDeps = requireDeps();
    if (saving) {
      return;
    }
    commitFocusedControl();

    const summary = runtimeDeps.getConstraintSummary?.() ?? { errors: 0 };
    if ((summary.errors ?? 0) > 0) {
      alertFn(`Cannot save: ${summary.errors} constraint error(s) must be resolved first.`);
      return;
    }

    const model = runtimeDeps.getModel() as {
      toOverridePayload?: () => Record<string, unknown>;
      overrides?: Record<string, unknown>;
      gridOverrides?: Record<string, unknown>;
      removedIds?: Set<string>;
    } | null;
    if (!model || typeof model.toOverridePayload !== 'function') {
      throw new Error('PreviewSaveClient requires a component model with toOverridePayload()');
    }

    let payload = model.toOverridePayload();
    if (typeof runtimeDeps.collectEngineSavePayload === 'function') {
      payload = runtimeDeps.collectEngineSavePayload(payload, model as Record<string, unknown>);
    }

    const relayoutStatus = asRecord(resolveLayoutRelayoutStatus(runtimeDeps)) as {
      localReady?: boolean;
    };
    const relayoutRuntime = asRecord(resolveLayoutRelayoutRuntime(runtimeDeps)) as {
      lastMode?: string;
    };
    if (relayoutRuntime.lastMode === 'local-error') {
      alertFn('Cannot save while local relayout is in an error state. Resolve the local relayout error first.');
      return;
    }
    if (
      relayoutStatus.localReady === false
      && (Object.keys(model.overrides || {}).length > 0 || Object.keys(model.gridOverrides || {}).length > 0)
    ) {
      alertFn('Cannot save while local relayout is unavailable.');
      return;
    }

    if (typeof options.fetchFn !== 'function') {
      throw new Error('Preview save client requires fetch() support');
    }

    const preservedSelectionIds = runtimeDeps.getSelectedIds?.() ?? [];
    let canonicalState: unknown = null;

    saving = true;
    syncSaveButton(summary.errors ?? 0);
    try {
      const response = await options.fetchFn(`/api/overrides/${runtimeDeps.slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const message = await response.text();
        alertFn(`Save failed: ${message || response.statusText || 'Unknown error'}`);
        return;
      }
      try {
        const responsePayload = await response.json() as { canonicalState?: unknown } | null;
        if (responsePayload && typeof responsePayload.canonicalState === 'object') {
          canonicalState = responsePayload.canonicalState;
        }
      } catch {
        // Best-effort canonical-state decode only.
      }

      runtimeDeps.clearCoercedKeys?.();
      model.removedIds = new Set();
      await runtimeDeps.reloadDiagram({ preserveSelectionIds: preservedSelectionIds, canonicalState });
      if (preservedSelectionIds.length > 0) {
        runtimeDeps.restoreSelectionIds?.(preservedSelectionIds);
      }
      runtimeDeps.setStatus?.('Ready', 'ok');
    } catch (error) {
      alertFn(`Save failed: ${String(error)}`);
      return;
    } finally {
      saving = false;
      syncSaveButton(summary.errors ?? 0);
    }
  }

  function trySaveIfDirty(): void {
    if (dirty) {
      void saveOverrides();
    }
  }

  function init(runtimeDeps: PreviewSaveClientRuntimeDeps): void {
    if (initialized) {
      return;
    }
    deps = runtimeDeps;
    initialized = true;

    options.document.getElementById('btn-save')?.addEventListener?.('click', () => {
      if (dirty) {
        void saveOverrides();
      }
    });
    options.document.getElementById('btn-save-svg')?.addEventListener?.('click', () => {
      saveCurrentSvg();
    });
    syncSaveButton();
    syncSaveSvgButton();
    if (typeof runtimeDeps.onBeforeUnload === 'function') {
      options.previewWindow.addEventListener?.('beforeunload', runtimeDeps.onBeforeUnload);
    }
  }

  return {
    init,
    isDirty: () => dirty,
    setDirty,
    markSaved,
    syncDirtyFromSerialized,
    getLastSavedState: () => lastSavedState,
    syncSaveButton,
    syncSaveSvgButton,
    saveOverrides,
    saveCurrentSvg,
    trySaveIfDirty,
  };
}
