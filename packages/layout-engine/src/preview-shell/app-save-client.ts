import {
  normalizePreviewSavePayload,
  type PreviewSavePayloadModelLike,
} from './app-save-payload.js';
import { createPreviewOverridePayload } from './preview-override-model.js';

export interface PreviewSaveClientRuntimeWindow {
  addEventListener?: (type: string, listener: (event: unknown) => unknown) => void;
  location?: { assign?: (url: string) => void };
  __DG_CONFIG?: {
    workspace_revision?: string | null;
  } | null;
}

export interface PreviewImportFileLike {
  name: string;
  text: () => Promise<string>;
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
    value?: string;
    accept?: string;
    files?: { length: number; [index: number]: PreviewImportFileLike | undefined } | null;
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
  confirmFn?: (message: string) => boolean;
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
  getLayoutRelayoutRuntime?: () => Record<string, unknown>;
  getConstraintSummary?: () => { errors?: number };
  getConstraintErrorCount?: () => number;
  runConstraints?: () => void;
  clearCoercedKeys?: () => void;
  setStatus?: (message: string, kind?: string) => void;
  sanitizeSvgCloneForExport?: (clone: unknown) => void;
  onBeforeUnload?: (event: unknown) => unknown;
  hasExternalDirtyState?: () => boolean;
  onSaveSuccess?: () => void;
}

export interface PreviewSaveClientRuntime {
  init: (deps: PreviewSaveClientRuntimeDeps) => void;
  isDirty: () => boolean;
  setDirty: (dirty: boolean) => void;
  markSaved: (serializedState: string | null) => void;
  syncDirtyFromSerialized: (serializedState: string) => void;
  getLastSavedState: () => string | null;
  syncSaveButton: (errorCount?: number | null) => void;
  saveOverrides: () => Promise<void>;
  saveCurrentSvg: () => void;
  saveCurrentDrawio: () => Promise<void>;
  exportCurrentFormat: () => Promise<void>;
  importCurrentFile: () => Promise<void>;
  trySaveIfDirty: () => void;
}

export type PreviewDocumentExportFormat = 'svg' | 'drawio' | 'mermaid' | 'd2';

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
  return deps.getLayoutRelayoutStatus?.() ?? { localReady: true };
}

function resolveLayoutRelayoutRuntime(
  deps: PreviewSaveClientRuntimeDeps,
): Record<string, unknown> {
  return deps.getLayoutRelayoutRuntime?.() ?? {};
}

function currentSvgFilename(slug: string): string {
  const baseSlug = String(slug || '').replace(/^v3:/, '');
  return `${baseSlug}-onbrand-v3.svg`;
}

function currentDrawioFilename(slug: string): string {
  const baseSlug = String(slug || '').replace(/^v3:/, '');
  return `${baseSlug}.drawio`;
}

function currentDocumentSlug(slug: string): string {
  return String(slug || '').replace(/^v3:/, '');
}

function currentInterchangeFilename(slug: string, format: 'mermaid' | 'd2'): string {
  return `${currentDocumentSlug(slug)}.${format === 'mermaid' ? 'mmd' : 'd2'}`;
}

function importSlugFromFilename(filename: string): string {
  const withoutExtension = filename.replace(/\.(?:mmd|mermaid|d2)$/i, '');
  return withoutExtension
    .replace(/[^A-Za-z0-9._:-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'imported-diagram';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

interface PreviewImportDiagnostic {
  message?: string;
}

interface PreviewImportSummary {
  preserved: number;
  downgraded: PreviewImportDiagnostic[];
  blocked: PreviewImportDiagnostic[];
}

function normalizeImportDiagnostics(value: unknown): PreviewImportDiagnostic[] {
  if (!Array.isArray(value)) return [];
  return value.map(entry => {
    const record = asRecord(entry);
    return typeof record.message === 'string' ? { message: record.message } : {};
  });
}

function normalizeImportSummary(
  value: unknown,
  fallbackWarnings: PreviewImportDiagnostic[],
): PreviewImportSummary {
  const record = asRecord(value);
  const preserved = typeof record.preserved === 'number' && Number.isFinite(record.preserved)
    ? Math.max(0, Math.floor(record.preserved))
    : 0;
  return {
    preserved,
    downgraded: Array.isArray(record.downgraded)
      ? normalizeImportDiagnostics(record.downgraded)
      : fallbackWarnings,
    blocked: normalizeImportDiagnostics(record.blocked),
  };
}

function importSummaryText(summary: PreviewImportSummary): string {
  return `${summary.preserved} preserved, ${summary.downgraded.length} downgraded, ${summary.blocked.length} blocked`;
}

function importDiagnosticDetails(
  label: 'Downgraded' | 'Blocked',
  diagnostics: readonly PreviewImportDiagnostic[],
): string {
  const messages = diagnostics
    .map(diagnostic => diagnostic.message)
    .filter((message): message is string => typeof message === 'string' && message.length > 0);
  if (messages.length === 0) return '';
  const visible = messages.slice(0, 3);
  const remaining = messages.length - visible.length;
  return `\n${label}:\n${visible.join('\n')}${remaining > 0 ? `\n…and ${remaining} more.` : ''}`;
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
  let drawioExporting = false;
  let interchangeExporting = false;
  let lastSavedState: string | null = null;
  let initialized = false;

  const alertFn = options.alertFn ?? ((message: string) => globalThis.alert?.(message));
  const confirmFn = options.confirmFn ?? ((message: string) => globalThis.confirm?.(message) ?? false);

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

  function hasPendingDirtyState(): boolean {
    return dirty || Boolean(deps?.hasExternalDirtyState?.());
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
      dirty: hasPendingDirtyState(),
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
    syncExportButton();
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

  async function downloadRouteFile(routePath: string, filename: string, mimeType: string): Promise<void> {
    if (typeof options.fetchFn !== 'function') {
      throw new Error('Preview save client requires fetch() support for route export');
    }
    const response = await options.fetchFn(routePath, {
      method: 'GET',
    });
    if (!response.ok) {
      throw new Error(await response.text() || response.statusText || 'Unknown export error');
    }
    downloadTextFile(filename, await response.text(), mimeType);
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
    syncExportButton();
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
      syncExportButton();
    }
  }

  async function saveCurrentDrawio(): Promise<void> {
    const runtimeDeps = requireDeps();
    if (drawioExporting) {
      return;
    }
    drawioExporting = true;
    syncExportButton();
    try {
      const svg = options.document.querySelector('#stage svg');
      if (!svg) {
        alertFn('No SVG is loaded.');
        return;
      }
      await downloadRouteFile(
        `/drawio/${encodeURIComponent(currentDocumentSlug(runtimeDeps.slug))}.drawio`,
        currentDrawioFilename(runtimeDeps.slug),
        'application/xml;charset=utf-8',
      );
    } catch (error) {
      alertFn(`Drawio export failed: ${String(error)}`);
    } finally {
      drawioExporting = false;
      syncExportButton();
    }
  }

  async function saveCurrentInterchange(format: 'mermaid' | 'd2'): Promise<void> {
    const runtimeDeps = requireDeps();
    const routeFormat = format === 'mermaid' ? 'mermaid' : 'd2';
    if (interchangeExporting) {
      return;
    }
    interchangeExporting = true;
    syncExportButton();
    try {
      await downloadRouteFile(
        `/api/export/${routeFormat}?slug=${encodeURIComponent(currentDocumentSlug(runtimeDeps.slug))}`,
        currentInterchangeFilename(runtimeDeps.slug, format),
        'text/plain;charset=utf-8',
      );
    } catch (error) {
      alertFn(`${format === 'mermaid' ? 'Mermaid' : 'D2'} export failed: ${String(error)}`);
    } finally {
      interchangeExporting = false;
      syncExportButton();
    }
  }

  function readExportFormat(): PreviewDocumentExportFormat {
    const value = options.document.getElementById('export-format')?.value;
    return value === 'drawio' || value === 'mermaid' || value === 'd2' ? value : 'svg';
  }

  function readImportFormat(): 'mermaid' | 'd2' {
    return options.document.getElementById('interchange-import-format')?.value === 'd2'
      ? 'd2'
      : 'mermaid';
  }

  function syncImportFileAccept(): void {
    const fileInput = options.document.getElementById('interchange-import-file');
    if (fileInput) {
      fileInput.accept = readImportFormat() === 'd2' ? '.d2' : '.mmd,.mermaid';
    }
  }

  async function importCurrentFile(): Promise<void> {
    const runtimeDeps = requireDeps();
    const fileInput = options.document.getElementById('interchange-import-file');
    const slugInput = options.document.getElementById('interchange-import-slug');
    const file = fileInput?.files?.[0];
    if (!file) {
      alertFn('Choose a Mermaid or D2 file to import.');
      return;
    }
    const slug = String(slugInput?.value || importSlugFromFilename(file.name)).trim();
    if (!/^[A-Za-z0-9._:-]+$/.test(slug)) {
      alertFn('Import name may contain only letters, numbers, dot, underscore, colon, and hyphen.');
      return;
    }
    if (slugInput && !slugInput.value) {
      slugInput.value = slug;
    }
    const format = readImportFormat();
    try {
      const importPayload: Record<string, unknown> = { source: await file.text() };
      const workspaceRevision = options.previewWindow.__DG_CONFIG?.workspace_revision;
      if (
        typeof workspaceRevision === 'string'
        && slug === currentDocumentSlug(runtimeDeps.slug)
      ) {
        importPayload.workspaceRevision = workspaceRevision;
      }
      const response = await options.fetchFn?.(`/api/import/${format}?slug=${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importPayload),
      });
      if (!response) {
        throw new Error('Preview save client requires fetch() support for import');
      }
      if (!response.ok) {
        const message = await response.text();
        if (response.status === 409) {
          try {
            const conflict = JSON.parse(message) as { workspaceRevision?: string };
            if (typeof conflict.workspaceRevision === 'string') {
              const config = options.previewWindow.__DG_CONFIG;
              if (config) config.workspace_revision = conflict.workspaceRevision;
            }
          } catch {
            // Older hosts return a plain conflict message.
          }
          throw new Error(
            'The target YAML changed on disk. Review or reload it, then import again to overwrite it.',
          );
        }
        try {
          const failure = asRecord(JSON.parse(message));
          if ('summary' in failure) {
            const failureWarnings = normalizeImportDiagnostics(failure.warnings);
            const summary = normalizeImportSummary(failure.summary, failureWarnings);
            if (summary.blocked.length > 0) {
              const status = `Import blocked: ${importSummaryText(summary)}`;
              alertFn(`${status}${importDiagnosticDetails('Blocked', summary.blocked)}`);
              runtimeDeps.setStatus?.(status, 'error');
              return;
            }
          }
        } catch {
          // Plain-text and legacy import failures fall through to the generic error.
        }
        throw new Error(message || response.statusText || 'Unknown import error');
      }
      const result = asRecord(await response.json());
      const importedSlug = typeof result.slug === 'string' && result.slug.length > 0 ? result.slug : slug;
      const warnings = normalizeImportDiagnostics(result.warnings);
      const summary = normalizeImportSummary(result.summary, warnings);
      const summaryText = importSummaryText(summary);
      if (summary.blocked.length > 0) {
        const status = `Import blocked: ${summaryText}`;
        alertFn(`${status}${importDiagnosticDetails('Blocked', summary.blocked)}`);
        runtimeDeps.setStatus?.(status, 'error');
        return;
      }
      if (summary.downgraded.length > 0) {
        alertFn(`Imported: ${summaryText}${importDiagnosticDetails('Downgraded', summary.downgraded)}`);
      }
      runtimeDeps.setStatus?.(`Imported: ${summaryText}`, 'ok');
      options.previewWindow.location?.assign?.(`/view/v3:${importedSlug}`);
    } catch (error) {
      alertFn(`Import failed: ${String(error)}`);
    }
  }

  function syncExportButton(): void {
    const exportButton = options.document.getElementById('btn-export-format');
    if (!exportButton) {
      return;
    }
    const format = readExportFormat();
    const svg = options.document.querySelector('#stage svg');
    exportButton.disabled = svgExporting || drawioExporting || interchangeExporting || (format === 'svg'
      ? resolvePreviewSaveSvgButtonState({ hasRenderedSvg: Boolean(svg) }).disabled
      : false);
  }

  async function exportCurrentFormat(): Promise<void> {
    const format = readExportFormat();
    try {
      if (format === 'svg') {
        saveCurrentSvg();
        return;
      }
      if (format === 'drawio') {
        await saveCurrentDrawio();
        return;
      }
      await saveCurrentInterchange(format);
    } catch (error) {
      const label = format === 'drawio' ? 'draw.io' : format.toUpperCase();
      alertFn(`${label} export failed: ${String(error)}`);
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

    const model = runtimeDeps.getModel() as (PreviewSavePayloadModelLike & {
      overrides?: Record<string, unknown>;
      gridOverrides?: Record<string, unknown>;
      removedIds?: Set<string>;
      layoutOverrides?: Record<string, unknown>;
    }) | null;
    if (!model || typeof model !== 'object') {
      throw new Error('PreviewSaveClient requires a component model');
    }

    let payload: Record<string, unknown> = createPreviewOverridePayload(model);
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

    const normalized = normalizePreviewSavePayload(payload, model);
    if (normalized.errors.length > 0) {
      alertFn(`Cannot save: ${normalized.errors.join('; ')}`);
      return;
    }
    payload = normalized.payload;
    const workspaceRevision = options.previewWindow.__DG_CONFIG?.workspace_revision;
    if (typeof workspaceRevision === 'string') {
      payload.workspaceRevision = workspaceRevision;
    }

    if (typeof options.fetchFn !== 'function') {
      throw new Error('Preview save client requires fetch() support');
    }

    const preservedSelectionIds = runtimeDeps.getSelectedIds?.() ?? [];
    let canonicalState: unknown = null;
    const removedIdsBeforeSave = model.removedIds instanceof Set
      ? model.removedIds
      : null;

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
        if (response.status === 409 && !message.includes('external file was kept')) {
          let conflictPayload: { error?: string; workspaceRevision?: string } = {};
          try {
            conflictPayload = JSON.parse(message) as typeof conflictPayload;
          } catch {
            // Older hosts return a plain conflict message.
          }
          const reloadExternal = confirmFn(
            'This diagram changed on disk after you opened it.\n\n'
            + 'Choose OK to reload the external version and discard your editor changes, '
            + 'or Cancel to keep your editor changes. If you keep them, Save again to overwrite the external version.',
          );
          if (typeof conflictPayload.workspaceRevision === 'string') {
            const config = options.previewWindow.__DG_CONFIG;
            if (config) config.workspace_revision = conflictPayload.workspaceRevision;
          }
          if (reloadExternal) {
            await runtimeDeps.reloadDiagram();
            dirty = false;
            runtimeDeps.onSaveSuccess?.();
            runtimeDeps.setStatus?.('External version reloaded', 'ok');
          } else {
            runtimeDeps.setStatus?.('External version changed; editor changes kept', 'error');
          }
          return;
        }
        alertFn(`Save failed: ${message || response.statusText || 'Unknown error'}`);
        return;
      }
      try {
        const responsePayload = await response.json() as {
          canonicalState?: unknown;
          workspaceRevision?: string | null;
          workspaceCopyAddress?: string;
        } | null;
        if (responsePayload && typeof responsePayload.canonicalState === 'object') {
          canonicalState = responsePayload.canonicalState;
        }
        if (typeof responsePayload?.workspaceRevision === 'string') {
          const config = options.previewWindow.__DG_CONFIG;
          if (config) config.workspace_revision = responsePayload.workspaceRevision;
        }
        if (typeof responsePayload?.workspaceCopyAddress === 'string') {
          dirty = false;
          runtimeDeps.clearCoercedKeys?.();
          runtimeDeps.onSaveSuccess?.();
          runtimeDeps.setStatus?.('Copy saved', 'ok');
          options.previewWindow.location?.assign?.(
            `/view/v3:${responsePayload.workspaceCopyAddress}`,
          );
          return;
        }
      } catch {
        // Best-effort canonical-state decode only.
      }

      try {
        if (removedIdsBeforeSave) {
          model.removedIds = new Set();
        }
        await runtimeDeps.reloadDiagram({ preserveSelectionIds: preservedSelectionIds, canonicalState });
      } catch (error) {
        if (removedIdsBeforeSave) {
          model.removedIds = removedIdsBeforeSave;
        }
        alertFn(`Save succeeded, but reload failed: ${String(error)}`);
        return;
      }

      runtimeDeps.clearCoercedKeys?.();
      runtimeDeps.onSaveSuccess?.();
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
    if (hasPendingDirtyState()) {
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
      if (hasPendingDirtyState()) {
        void saveOverrides();
      }
    });
    options.document.getElementById('export-format')?.addEventListener?.('change', () => {
      syncExportButton();
    });
    options.document.getElementById('btn-export-format')?.addEventListener?.('click', () => {
      void exportCurrentFormat();
    });
    options.document.getElementById('interchange-import-format')?.addEventListener?.('change', () => {
      syncImportFileAccept();
    });
    options.document.getElementById('interchange-import-file')?.addEventListener?.('change', () => {
      const fileInput = options.document.getElementById('interchange-import-file');
      const slugInput = options.document.getElementById('interchange-import-slug');
      const file = fileInput?.files?.[0];
      if (file && slugInput && !slugInput.value) {
        slugInput.value = importSlugFromFilename(file.name);
      }
    });
    options.document.getElementById('btn-import-interchange')?.addEventListener?.('click', () => {
      void importCurrentFile();
    });
    syncSaveButton();
    syncExportButton();
    syncImportFileAccept();
    if (typeof runtimeDeps.onBeforeUnload === 'function') {
      options.previewWindow.addEventListener?.('beforeunload', runtimeDeps.onBeforeUnload);
    }
  }

  return {
    init,
    isDirty: () => hasPendingDirtyState(),
    setDirty,
    markSaved,
    syncDirtyFromSerialized,
    getLastSavedState: () => lastSavedState,
    syncSaveButton,
    saveOverrides,
    saveCurrentSvg,
    saveCurrentDrawio,
    exportCurrentFormat,
    importCurrentFile,
    trySaveIfDirty,
  };
}
