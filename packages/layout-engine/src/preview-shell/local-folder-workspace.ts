/** Browser-local folder workspace controller (spec 075). */

export interface PreviewLocalFolderFile {
  readonly name: string;
  readonly content: string;
  readonly handle: FileSystemFileHandle;
}

export interface PreviewLocalFolderOpenResult {
  readonly sourceId: string;
  readonly label: string;
  readonly slugs: readonly string[];
  readonly registered?: boolean;
}

export interface PreviewLocalFolderHandleRecord {
  readonly sourceId: string;
  readonly label: string;
  readonly handle: FileSystemDirectoryHandle;
}

export interface PreviewLocalFolderHandleStore {
  load(): Promise<PreviewLocalFolderHandleRecord[]>;
  save(records: readonly PreviewLocalFolderHandleRecord[]): Promise<void>;
}

export interface PreviewLocalFolderController {
  openFolder(): Promise<void>;
  restoreFolders(): Promise<void>;
  reconnectFolders(): Promise<void>;
  forgetCurrentFolder(): Promise<void>;
}

interface PreviewLocalFolderFileState {
  readonly handle: FileSystemFileHandle;
  content: string;
}

interface PreviewLocalFolderState {
  readonly sourceId: string;
  readonly label: string;
  readonly directory: FileSystemDirectoryHandle;
  readonly files: Map<string, PreviewLocalFolderFileState>;
}

interface PreviewLocalFolderWindow extends Window {
  __DG_CONFIG?: {
    slug?: string;
    workspace_writable?: boolean;
    workspace_revision?: string | null;
  } | null;
  __DG_workspaceFetch?: typeof fetch;
  __DG_localFolderWorkspace?: PreviewLocalFolderController;
}

type PreviewDirectoryHandle = FileSystemDirectoryHandle & {
  queryPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>;
  requestPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>;
  isSameEntry?: (other: FileSystemHandle) => Promise<boolean>;
};

export interface PreviewLocalFolderWorkspaceOptions {
  readonly windowObject: PreviewLocalFolderWindow;
  readonly document: Document;
  readonly fetchFn: typeof fetch;
  readonly handleStore?: PreviewLocalFolderHandleStore;
  readonly confirmExternalOverwrite?: (message: string) => boolean | Promise<boolean>;
  readonly confirmForgetFolder?: (message: string) => boolean | Promise<boolean>;
  readonly createSourceId?: (label: string) => string;
}

const DB_NAME = 'diagram-generator-preview-workspaces';
const DB_STORE = 'handles';
const DB_KEY = 'folders';
const LEGACY_DB_KEY = 'last-folder';
const MAX_WORKSPACE_FILE_COUNT = 500;
const MAX_WORKSPACE_FILE_BYTES = 2 * 1024 * 1024;
const MAX_WORKSPACE_TOTAL_BYTES = 25 * 1024 * 1024;

class PreviewWorkspaceConflictError extends Error {}

function isYamlFilename(name: string): boolean {
  return name.toLowerCase().endsWith('.yaml') && name.slice(0, -5).length > 0;
}

function slugFromFilename(name: string): string {
  return name.slice(0, -5);
}

function sourceToken(label: string): string {
  return label.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'folder';
}

function defaultSourceId(label: string): string {
  const randomPart = globalThis.crypto?.randomUUID?.().slice(0, 8)
    ?? Math.random().toString(36).slice(2, 10);
  return `local-${sourceToken(label)}-${randomPart}`;
}

type PreviewWorkspaceStatusKind = 'ok' | 'error' | 'pending' | 'cancelled';

function setStatus(
  document: Document,
  message: string,
  kind: PreviewWorkspaceStatusKind = 'ok',
): void {
  const node = document.getElementById('dg-workspace-status');
  if (node) {
    node.textContent = message;
    node.setAttribute('data-status-kind', kind);
  }
}

function setReconnectVisibility(document: Document, count: number): void {
  const button = document.getElementById('dg-reconnect-folders') as HTMLElement | null;
  if (!button) return;
  button.hidden = count === 0;
  button.textContent = count === 1 ? 'Reconnect folder…' : `Reconnect ${count} folders…`;
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(DB_STORE)) {
        request.result.createObjectStore(DB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function readDatabaseValue(database: IDBDatabase, key: string): Promise<unknown> {
  return new Promise((resolve) => {
    const request = database.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

function asStoredRecord(value: unknown): PreviewLocalFolderHandleRecord | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as {
    sourceId?: unknown;
    label?: unknown;
    handle?: unknown;
  };
  return typeof record.sourceId === 'string'
    && typeof record.label === 'string'
    && Boolean(record.handle)
    ? {
        sourceId: record.sourceId,
        label: record.label,
        handle: record.handle as FileSystemDirectoryHandle,
      }
    : null;
}

export function createIndexedDbPreviewLocalFolderHandleStore(): PreviewLocalFolderHandleStore {
  return {
    async load() {
      const database = await openDatabase();
      if (!database) return [];
      const current = await readDatabaseValue(database, DB_KEY);
      const legacy = current ? null : await readDatabaseValue(database, LEGACY_DB_KEY);
      database.close();
      const values = Array.isArray(current) ? current : legacy ? [legacy] : [];
      return values
        .map(asStoredRecord)
        .filter((record): record is PreviewLocalFolderHandleRecord => record !== null);
    },
    async save(records) {
      const database = await openDatabase();
      if (!database) return;
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(DB_STORE, 'readwrite');
        transaction.objectStore(DB_STORE).put([...records], DB_KEY);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error('Could not store folder handles'));
        transaction.onabort = () => reject(transaction.error ?? new Error('Could not store folder handles'));
      });
      database.close();
    },
  };
}

async function directoryPermission(
  directory: FileSystemDirectoryHandle,
  request: boolean,
): Promise<PermissionState> {
  const handle = directory as PreviewDirectoryHandle;
  const permissionFn = request ? handle.requestPermission : handle.queryPermission;
  if (typeof permissionFn !== 'function') return 'granted';
  return permissionFn.call(handle, { mode: 'readwrite' });
}

async function readDirectory(directory: FileSystemDirectoryHandle): Promise<PreviewLocalFolderFile[]> {
  const files: PreviewLocalFolderFile[] = [];
  let totalBytes = 0;
  for await (const [name, handle] of directory.entries()) {
    if (handle.kind !== 'file' || !isYamlFilename(name)) continue;
    if (files.length >= MAX_WORKSPACE_FILE_COUNT) {
      throw new Error(`A folder can contain at most ${MAX_WORKSPACE_FILE_COUNT} YAML diagrams.`);
    }
    const fileHandle = handle as FileSystemFileHandle;
    const file = await fileHandle.getFile();
    if (file.size > MAX_WORKSPACE_FILE_BYTES) {
      throw new Error(`${name} exceeds the 2 MiB diagram limit.`);
    }
    totalBytes += file.size;
    if (totalBytes > MAX_WORKSPACE_TOTAL_BYTES) {
      throw new Error('The selected folder exceeds the 25 MiB workspace limit.');
    }
    files.push({ name, content: await file.text(), handle: fileHandle });
  }
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

async function uploadFolder(
  fetchFn: typeof fetch,
  label: string,
  files: readonly PreviewLocalFolderFile[],
  sourceId: string,
  allowEmpty = false,
): Promise<PreviewLocalFolderOpenResult> {
  const response = await fetchFn('/api/workspaces/open', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      label,
      sourceId,
      allowEmpty,
      files: files.map(({ name, content }) => ({ name, content })),
    }),
  });
  if (!response.ok) throw new Error(await response.text() || `Folder open failed (${response.status})`);
  return response.json() as Promise<PreviewLocalFolderOpenResult>;
}

function configuredAddress(
  windowObject: PreviewLocalFolderWindow,
): { sourceId: string; slug: string; address: string } | null {
  const configuredSlug = windowObject.__DG_CONFIG?.slug ?? '';
  const separator = configuredSlug.indexOf(':');
  if (separator <= 0 || separator === configuredSlug.length - 1) return null;
  return {
    sourceId: configuredSlug.slice(0, separator),
    slug: configuredSlug.slice(separator + 1),
    address: configuredSlug,
  };
}

function parseQualifiedAddress(address: string): {
  sourceId: string;
  slug: string;
  address: string;
} | null {
  const separator = address.indexOf(':');
  if (separator <= 0 || separator === address.length - 1) return null;
  return {
    sourceId: address.slice(0, separator),
    slug: address.slice(separator + 1),
    address,
  };
}

function currentSourceSlug(windowObject: PreviewLocalFolderWindow): string {
  const address = windowObject.__DG_CONFIG?.slug ?? '';
  const separator = address.indexOf(':');
  return separator >= 0 ? address.slice(separator + 1) : address;
}

function copySlug(sourceSlug: string, state: PreviewLocalFolderState): string {
  const occupied = new Set([...state.files.keys()].map((slug) => slug.toLocaleLowerCase('en-US')));
  if (!occupied.has(sourceSlug.toLocaleLowerCase('en-US'))) return sourceSlug;
  let suffix = 1;
  while (true) {
    const candidate = `${sourceSlug}-copy${suffix === 1 ? '' : `-${suffix}`}`;
    if (!occupied.has(candidate.toLocaleLowerCase('en-US'))) return candidate;
    suffix += 1;
  }
}

async function currentFileText(handle: FileSystemFileHandle): Promise<string> {
  return (await handle.getFile()).text();
}

async function writeFile(handle: FileSystemFileHandle, yaml: string): Promise<void> {
  const writable = await handle.createWritable();
  try {
    await writable.write(yaml);
  } finally {
    await writable.close();
  }
}

function saveFailureResponse(error: unknown): Response {
  const conflict = error instanceof PreviewWorkspaceConflictError;
  const message = error instanceof Error ? error.message : String(error);
  return new Response(message, {
    status: conflict ? 409 : 502,
    statusText: conflict ? 'Workspace file changed' : 'Workspace write failed',
  });
}

export function createPreviewLocalFolderWorkspace(
  options: PreviewLocalFolderWorkspaceOptions,
): PreviewLocalFolderController {
  const {
    document,
    fetchFn,
    windowObject,
  } = options;
  const handleStore = options.handleStore ?? createIndexedDbPreviewLocalFolderHandleStore();
  const confirmExternalOverwrite = options.confirmExternalOverwrite
    ?? ((message: string) => windowObject.confirm(message));
  const confirmForgetFolder = options.confirmForgetFolder
    ?? ((message: string) => windowObject.confirm(message));
  const createSourceId = options.createSourceId ?? defaultSourceId;
  const states = new Map<string, PreviewLocalFolderState>();
  const knownLocalSourceIds = new Set<string>();
  let storedRecords: PreviewLocalFolderHandleRecord[] = [];
  let deniedRecords: PreviewLocalFolderHandleRecord[] = [];
  let opening = false;
  let restoreInFlight: Promise<void> | null = null;
  let latestOperation = 0;
  let restoreReloadTriggered = false;

  function beginOperation(): number {
    latestOperation += 1;
    return latestOperation;
  }

  function operationIsCurrent(operation: number): boolean {
    return latestOperation === operation;
  }

  function setOperationStatus(
    operation: number,
    message: string,
    kind: PreviewWorkspaceStatusKind = 'ok',
  ): void {
    if (operationIsCurrent(operation)) setStatus(document, message, kind);
  }

  function setOperationReconnectVisibility(operation: number, count: number): void {
    if (operationIsCurrent(operation)) setReconnectVisibility(document, count);
  }

  function reloadAfterRestoredRegistration(operation: number, registered: boolean): void {
    if (!registered || !operationIsCurrent(operation) || restoreReloadTriggered) return;
    restoreReloadTriggered = true;
    windowObject.location.reload();
  }

  async function persistRecords(): Promise<void> {
    try {
      await handleStore.save(storedRecords);
    } catch (error) {
      console.warn('Could not persist opened folder handles', error);
      setStatus(document, 'Folder opened, but this browser could not remember it for next time.', 'error');
    }
  }

  async function findExistingRecord(
    directory: FileSystemDirectoryHandle,
  ): Promise<PreviewLocalFolderHandleRecord | null> {
    for (const record of storedRecords) {
      const sameEntry = (record.handle as PreviewDirectoryHandle).isSameEntry;
      if (typeof sameEntry === 'function' && await sameEntry.call(record.handle, directory)) {
        return record;
      }
    }
    return null;
  }

  async function openDirectory(
    directory: FileSystemDirectoryHandle,
    record: PreviewLocalFolderHandleRecord | null,
    navigate: boolean,
    allowEmpty = false,
    operation?: number,
  ): Promise<PreviewLocalFolderOpenResult> {
    const files = await readDirectory(directory);
    if (files.length === 0 && !allowEmpty) {
      throw new Error('The selected folder has no root-level .yaml diagrams.');
    }
    const requestedSourceId = record?.sourceId ?? createSourceId(directory.name);
    const result = await uploadFolder(fetchFn, directory.name, files, requestedSourceId, allowEmpty);
    const state: PreviewLocalFolderState = {
      sourceId: result.sourceId,
      label: result.label,
      directory,
      files: new Map(files.map((file) => [
        slugFromFilename(file.name),
        { handle: file.handle, content: file.content },
      ])),
    };
    states.set(result.sourceId, state);
    knownLocalSourceIds.add(result.sourceId);
    const nextRecord = { sourceId: result.sourceId, label: result.label, handle: directory };
    storedRecords = [
      ...storedRecords.filter((candidate) => candidate.sourceId !== result.sourceId),
      nextRecord,
    ];
    await persistRecords();
    const loadedMessage = navigate
      ? `Opened ${result.label}. Loading its first diagram…`
      : `${result.slugs.length} diagram${result.slugs.length === 1 ? '' : 's'} loaded from ${result.label}.`;
    if (operation === undefined) setStatus(document, loadedMessage);
    else setOperationStatus(operation, loadedMessage);
    const firstSlug = result.slugs[0];
    if (navigate && firstSlug) {
      windowObject.location.assign(`/view/v3:${result.sourceId}:${firstSlug}`);
    }
    return result;
  }

  async function mirrorSavedYaml(addressOverride?: string, allowCreate = false): Promise<void> {
    const address = addressOverride
      ? parseQualifiedAddress(addressOverride)
      : configuredAddress(windowObject);
    if (!address) return;
    const targetsLocalFolder = knownLocalSourceIds.has(address.sourceId)
      || address.sourceId.startsWith('local-');
    if (!targetsLocalFolder) return;
    const state = states.get(address.sourceId);
    if (!state) {
      throw new Error(`Reconnect ${address.sourceId} before saving.`);
    }
    let fileState = state.files.get(address.slug);
    if (!fileState) {
      if (!allowCreate) {
        throw new Error(`The opened folder no longer contains ${address.slug}.yaml.`);
      }
      const handle = await state.directory.getFileHandle(`${address.slug}.yaml`, { create: true });
      fileState = { handle, content: await currentFileText(handle) };
      state.files.set(address.slug, fileState);
    }
    const yamlResponse = await fetchFn(
      `/api/workspaces/yaml/${encodeURIComponent(address.address)}`,
      { cache: 'no-store' },
    );
    if (!yamlResponse.ok) {
      throw new Error(await yamlResponse.text() || 'Could not read the saved workspace YAML.');
    }
    const nextYaml = await yamlResponse.text();
    const diskYaml = await currentFileText(fileState.handle);
    if (diskYaml !== fileState.content) {
      const overwrite = await confirmExternalOverwrite(
        `${address.slug}.yaml changed outside the editor. `
        + 'Choose OK to overwrite the external change, or Cancel to keep the external file and leave your editor changes unsaved.',
      );
      if (!overwrite) {
        setStatus(document, `External changes kept in ${address.slug}.yaml; editor changes remain unsaved.`, 'error');
        throw new PreviewWorkspaceConflictError(
          `${address.slug}.yaml changed outside the editor. The external file was kept; reload to use it.`,
        );
      }
    }
    await writeFile(fileState.handle, nextYaml);
    fileState.content = nextYaml;
    setStatus(document, `Saved ${address.slug}.yaml to ${state.label}.`);
  }

  async function saveCopy(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const picker = (windowObject as Window & {
      showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
    }).showDirectoryPicker;
    if (typeof picker !== 'function') {
      return saveFailureResponse(new Error(
        'Saving a copy requires a Chromium-based browser on localhost. '
        + 'You can also restart the preview with --root "Name=path".',
      ));
    }
    const sourceAddress = windowObject.__DG_CONFIG?.slug ?? '';
    const sourceSlug = currentSourceSlug(windowObject);
    if (!sourceAddress || !sourceSlug) {
      return saveFailureResponse(new Error('The source diagram address is unavailable.'));
    }

    let directory: FileSystemDirectoryHandle | null = null;
    let state: PreviewLocalFolderState | null = null;
    let targetSlug = '';
    try {
      directory = await picker.call(windowObject, { mode: 'readwrite' });
      const result = await openDirectory(
        directory,
        await findExistingRecord(directory),
        false,
        true,
      );
      state = states.get(result.sourceId) ?? null;
      if (!state) throw new Error('The selected folder could not be connected.');
      targetSlug = copySlug(sourceSlug, state);
      const targetHandle = await directory.getFileHandle(`${targetSlug}.yaml`, { create: true });
      const initialContent = await currentFileText(targetHandle);
      state.files.set(targetSlug, { handle: targetHandle, content: initialContent });

      const copyResponse = await fetchFn('/api/workspaces/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceAddress,
          targetSourceId: state.sourceId,
          targetSlug,
        }),
      });
      if (!copyResponse.ok) {
        throw new Error(await copyResponse.text() || `Copy failed (${copyResponse.status})`);
      }
      const copyResult = await copyResponse.json() as {
        address?: string;
        workspaceRevision?: string | null;
      };
      const targetAddress = copyResult.address;
      if (typeof targetAddress !== 'string') throw new Error('The copy response had no target address.');

      let targetInit = init;
      if (typeof init?.body === 'string') {
        const body = JSON.parse(init.body) as Record<string, unknown>;
        if (typeof copyResult.workspaceRevision === 'string') {
          body.workspaceRevision = copyResult.workspaceRevision;
        }
        targetInit = { ...init, body: JSON.stringify(body) };
      }
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const targetUrl = url.replace(/\/api\/overrides\/[^?#]*/, `/api/overrides/${targetAddress}`);
      const targetResponse = await fetchFn(targetUrl, targetInit);
      if (!targetResponse.ok) {
        throw new Error(await targetResponse.text() || `Save copy failed (${targetResponse.status})`);
      }
      await mirrorSavedYaml(targetAddress);
      const responsePayload = await targetResponse.json() as Record<string, unknown>;
      return new Response(JSON.stringify({
        ...responsePayload,
        workspaceCopyAddress: targetAddress,
      }), {
        status: targetResponse.status,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      if (directory && state && targetSlug) {
        state.files.delete(targetSlug);
        try {
          await directory.removeEntry(`${targetSlug}.yaml`);
        } catch {
          // Best-effort cleanup of a target file created before a failed copy.
        }
        try {
          const record = storedRecords.find((candidate) => candidate.sourceId === state?.sourceId) ?? null;
          await openDirectory(directory, record, false, true);
        } catch {
          // The original error remains the actionable failure.
        }
      }
      return saveFailureResponse(error);
    }
  }

  windowObject.__DG_workspaceFetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const workspaceMutation = url.includes('/api/overrides/')
      || url.includes('/api/import/mermaid')
      || url.includes('/api/import/d2');
    const currentAddress = configuredAddress(windowObject);
    if (
      init?.method === 'POST'
      && workspaceMutation
      && currentAddress?.sourceId.startsWith('local-')
      && restoreInFlight
    ) {
      await restoreInFlight;
    }
    if (
      init?.method === 'POST'
      && url.includes('/api/overrides/')
      && windowObject.__DG_CONFIG?.workspace_writable === false
    ) {
      return saveCopy(input, init);
    }
    const response = await fetchFn(input, init);
    if (!response.ok || init?.method !== 'POST' || !workspaceMutation) {
      return response;
    }
    try {
      const importAddress = url.includes('/api/import/')
        ? new URL(url, windowObject.location.href || 'http://127.0.0.1').searchParams.get('slug')
        : null;
      await mirrorSavedYaml(importAddress ?? undefined, importAddress !== null);
      return response;
    } catch (error) {
      console.warn('Could not save YAML to the opened folder', error);
      return saveFailureResponse(error);
    }
  };

  const controller: PreviewLocalFolderController = {
    async openFolder() {
      if (opening) {
        setStatus(document, 'A folder chooser is already open.', 'pending');
        return;
      }
      const operation = beginOperation();
      const picker = (windowObject as Window & {
        showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
      }).showDirectoryPicker;
      if (typeof picker !== 'function') {
        setOperationStatus(
          operation,
          'This browser cannot open local folders. Use a Chromium-based browser on localhost, or start the preview with --root "Name=path".',
          'error',
        );
        return;
      }
      opening = true;
      setOperationStatus(operation, 'Opening folder chooser…', 'pending');
      try {
        const directory = await picker.call(windowObject, { mode: 'readwrite' });
        await openDirectory(directory, await findExistingRecord(directory), true, false, operation);
      } catch (error) {
        if ((error as { name?: string })?.name === 'AbortError') {
          setOperationStatus(operation, 'No folder was opened.', 'cancelled');
        } else {
          setOperationStatus(operation, error instanceof Error ? error.message : String(error), 'error');
        }
      } finally {
        opening = false;
      }
    },

    async restoreFolders() {
      const operationId = beginOperation();
      const operation = (async () => {
        try {
          storedRecords = await handleStore.load();
        } catch (error) {
          console.warn('Could not read remembered folder handles', error);
          setOperationStatus(operationId, 'This browser could not restore remembered folders.', 'error');
          return;
        }
        for (const record of storedRecords) knownLocalSourceIds.add(record.sourceId);
        deniedRecords = [];
        let restored = 0;
        let registered = false;
        let activeWorkspace: PreviewLocalFolderOpenResult | null = null;
        const activeAddress = configuredAddress(windowObject);
        for (const record of storedRecords) {
          try {
            if (await directoryPermission(record.handle, false) !== 'granted') {
              deniedRecords.push(record);
              continue;
            }
            const result = await openDirectory(record.handle, record, false, false, operationId);
            registered ||= result.registered === true;
            restored += 1;
            if (activeAddress?.sourceId === result.sourceId) activeWorkspace = result;
          } catch (error) {
            console.warn(`Could not restore folder '${record.label}'`, error);
            deniedRecords.push(record);
          }
        }
        setOperationReconnectVisibility(operationId, deniedRecords.length);
        if (deniedRecords.length > 0) {
          setOperationStatus(
            operationId,
            `${deniedRecords.length} folder${deniedRecords.length === 1 ? '' : 's'} need permission to reconnect.`,
            'error',
          );
        } else if (activeWorkspace) {
          setOperationStatus(
            operationId,
            `${activeWorkspace.label} is active (${activeWorkspace.slugs.length} diagram${activeWorkspace.slugs.length === 1 ? '' : 's'}).`,
          );
        } else if (restored > 0) {
          setOperationStatus(operationId, `${restored} folder${restored === 1 ? '' : 's'} reconnected.`);
        } else {
          setOperationStatus(
            operationId,
            'Open a folder to edit its YAML diagrams. Folders are remembered for this local browser address.',
          );
        }
        reloadAfterRestoredRegistration(operationId, registered);
      })();
      restoreInFlight = operation;
      try {
        await operation;
      } finally {
        if (restoreInFlight === operation) restoreInFlight = null;
      }
    },

    async reconnectFolders() {
      const operationId = beginOperation();
      const stillDenied: PreviewLocalFolderHandleRecord[] = [];
      let restored = 0;
      let registered = false;
      let activeWorkspace: PreviewLocalFolderOpenResult | null = null;
      const activeAddress = configuredAddress(windowObject);
      for (const record of deniedRecords) {
        try {
          if (await directoryPermission(record.handle, true) !== 'granted') {
            stillDenied.push(record);
            continue;
          }
          const result = await openDirectory(record.handle, record, false, false, operationId);
          registered ||= result.registered === true;
          restored += 1;
          if (activeAddress?.sourceId === result.sourceId) activeWorkspace = result;
        } catch (error) {
          console.warn(`Could not reconnect folder '${record.label}'`, error);
          stillDenied.push(record);
        }
      }
      deniedRecords = stillDenied;
      setOperationReconnectVisibility(operationId, deniedRecords.length);
      if (deniedRecords.length > 0) {
        setOperationStatus(operationId, 'Folder permission was not granted. Your files were not changed.', 'error');
      } else if (activeWorkspace) {
        setOperationStatus(
          operationId,
          `${activeWorkspace.label} is active (${activeWorkspace.slugs.length} diagram${activeWorkspace.slugs.length === 1 ? '' : 's'}).`,
        );
      } else if (restored > 0) {
        setOperationStatus(operationId, `${restored} folder${restored === 1 ? '' : 's'} reconnected.`);
      }
      reloadAfterRestoredRegistration(operationId, registered);
    },

    async forgetCurrentFolder() {
      const address = configuredAddress(windowObject);
      if (!address || !address.sourceId.startsWith('local-')) return;
      if (restoreInFlight) await restoreInFlight;
      if (storedRecords.length === 0 && !states.has(address.sourceId)) {
        try {
          storedRecords = await handleStore.load();
        } catch {
          // The server-side registration can still be removed.
        }
      }
      const state = states.get(address.sourceId);
      const label = state?.label
        ?? storedRecords.find((record) => record.sourceId === address.sourceId)?.label
        ?? address.sourceId;
      if (!await confirmForgetFolder(
        `Forget ${label}? This removes the folder from the preview but does not delete any files.`,
      )) return;
      const response = await fetchFn('/api/workspaces/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: address.sourceId }),
      });
      if (!response.ok && response.status !== 404) {
        setStatus(document, await response.text() || 'Could not forget the folder.', 'error');
        return;
      }
      states.delete(address.sourceId);
      knownLocalSourceIds.delete(address.sourceId);
      storedRecords = storedRecords.filter((record) => record.sourceId !== address.sourceId);
      deniedRecords = deniedRecords.filter((record) => record.sourceId !== address.sourceId);
      await persistRecords();
      windowObject.location.assign('/');
    },
  };

  return controller;
}

export function initPreviewLocalFolderWorkspace(): PreviewLocalFolderController | null {
  const windowObject = globalThis as unknown as PreviewLocalFolderWindow;
  const document = windowObject.document;
  if (!document) return null;
  if (windowObject.__DG_localFolderWorkspace) return windowObject.__DG_localFolderWorkspace;

  const nativeFetch = windowObject.fetch.bind(windowObject);
  const controller = createPreviewLocalFolderWorkspace({
    windowObject,
    document,
    fetchFn: nativeFetch,
  });
  windowObject.__DG_localFolderWorkspace = controller;

  const openButton = document.getElementById('dg-open-folder');
  const pickerSupported = typeof (windowObject as Window & {
    showDirectoryPicker?: unknown;
  }).showDirectoryPicker === 'function';
  if (openButton) {
    openButton.hidden = !pickerSupported;
    openButton.addEventListener('click', () => void controller.openFolder());
  }
  const reconnectButton = document.getElementById('dg-reconnect-folders');
  reconnectButton?.addEventListener('click', () => void controller.reconnectFolders());
  const forgetButton = document.getElementById('dg-forget-folder') as HTMLElement | null;
  const currentAddress = configuredAddress(windowObject);
  if (forgetButton) {
    forgetButton.hidden = !currentAddress?.sourceId.startsWith('local-');
    forgetButton.addEventListener('click', () => void controller.forgetCurrentFolder());
  }
  if (windowObject.__DG_CONFIG?.workspace_writable === false) {
    const saveButton = document.getElementById('btn-save');
    if (saveButton) {
      saveButton.textContent = 'Save a copy…';
      saveButton.setAttribute(
        'aria-label',
        'Save a copy of this read-only example to a folder you choose',
      );
      saveButton.setAttribute(
        'title',
        'This example is read-only. Save your edits as a copy in a folder you choose.',
      );
    }
    setStatus(
      document,
      'This example is read-only. Edit it, then choose Save a copy… to keep your own YAML file.',
    );
  }
  if (!pickerSupported) {
    setStatus(
      document,
      'To edit a folder, use a Chromium-based browser on localhost or start the preview with --root "Name=path".',
    );
  } else {
    document.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        void controller.openFolder();
      }
    });
  }
  void controller.restoreFolders();
  return controller;
}
