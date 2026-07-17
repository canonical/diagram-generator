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
  __DG_CONFIG?: { slug?: string } | null;
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

function setStatus(document: Document, message: string, kind: 'ok' | 'error' = 'ok'): void {
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
): Promise<PreviewLocalFolderOpenResult> {
  const response = await fetchFn('/api/workspaces/open', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      label,
      sourceId,
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
  const createSourceId = options.createSourceId ?? defaultSourceId;
  const states = new Map<string, PreviewLocalFolderState>();
  const knownLocalSourceIds = new Set<string>();
  let storedRecords: PreviewLocalFolderHandleRecord[] = [];
  let deniedRecords: PreviewLocalFolderHandleRecord[] = [];
  let opening = false;

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
  ): Promise<PreviewLocalFolderOpenResult> {
    const files = await readDirectory(directory);
    if (files.length === 0) {
      throw new Error('The selected folder has no root-level .yaml diagrams.');
    }
    const requestedSourceId = record?.sourceId ?? createSourceId(directory.name);
    const result = await uploadFolder(fetchFn, directory.name, files, requestedSourceId);
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
    setStatus(
      document,
      `${result.slugs.length} diagram${result.slugs.length === 1 ? '' : 's'} loaded from ${result.label}.`,
    );
    const firstSlug = result.slugs[0];
    if (navigate && firstSlug) {
      windowObject.location.assign(`/view/v3:${result.sourceId}:${firstSlug}`);
    }
    return result;
  }

  async function mirrorSavedYaml(): Promise<void> {
    const address = configuredAddress(windowObject);
    if (!address) return;
    const targetsLocalFolder = knownLocalSourceIds.has(address.sourceId)
      || address.sourceId.startsWith('local-');
    if (!targetsLocalFolder) return;
    const state = states.get(address.sourceId);
    if (!state) {
      throw new Error(`Reconnect ${address.sourceId} before saving.`);
    }
    const fileState = state.files.get(address.slug);
    if (!fileState) {
      throw new Error(`The opened folder no longer contains ${address.slug}.yaml.`);
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

  windowObject.__DG_workspaceFetch = async (input, init) => {
    const response = await fetchFn(input, init);
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const workspaceMutation = url.includes('/api/overrides/')
      || url.includes('/api/import/mermaid')
      || url.includes('/api/import/d2');
    if (!response.ok || init?.method !== 'POST' || !workspaceMutation) {
      return response;
    }
    try {
      await mirrorSavedYaml();
      return response;
    } catch (error) {
      console.warn('Could not save YAML to the opened folder', error);
      return saveFailureResponse(error);
    }
  };

  const controller: PreviewLocalFolderController = {
    async openFolder() {
      if (opening) return;
      const picker = (windowObject as Window & {
        showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
      }).showDirectoryPicker;
      if (typeof picker !== 'function') {
        setStatus(
          document,
          'Folder access requires a Chromium-based browser on localhost. You can still start the preview with --root "Name=path".',
          'error',
        );
        return;
      }
      opening = true;
      try {
        const directory = await picker.call(windowObject, { mode: 'readwrite' });
        await openDirectory(directory, await findExistingRecord(directory), true);
      } catch (error) {
        if ((error as { name?: string })?.name !== 'AbortError') {
          setStatus(document, error instanceof Error ? error.message : String(error), 'error');
        }
      } finally {
        opening = false;
      }
    },

    async restoreFolders() {
      try {
        storedRecords = await handleStore.load();
      } catch (error) {
        console.warn('Could not read remembered folder handles', error);
        setStatus(document, 'This browser could not restore remembered folders.', 'error');
        return;
      }
      for (const record of storedRecords) knownLocalSourceIds.add(record.sourceId);
      deniedRecords = [];
      let restored = 0;
      for (const record of storedRecords) {
        try {
          if (await directoryPermission(record.handle, false) !== 'granted') {
            deniedRecords.push(record);
            continue;
          }
          await openDirectory(record.handle, record, false);
          restored += 1;
        } catch (error) {
          console.warn(`Could not restore folder '${record.label}'`, error);
          deniedRecords.push(record);
        }
      }
      setReconnectVisibility(document, deniedRecords.length);
      if (deniedRecords.length > 0) {
        setStatus(
          document,
          `${deniedRecords.length} folder${deniedRecords.length === 1 ? '' : 's'} need permission to reconnect.`,
          'error',
        );
      } else if (restored > 0) {
        setStatus(document, `${restored} folder${restored === 1 ? '' : 's'} reconnected.`);
      }
    },

    async reconnectFolders() {
      const stillDenied: PreviewLocalFolderHandleRecord[] = [];
      let restored = 0;
      for (const record of deniedRecords) {
        try {
          if (await directoryPermission(record.handle, true) !== 'granted') {
            stillDenied.push(record);
            continue;
          }
          await openDirectory(record.handle, record, false);
          restored += 1;
        } catch (error) {
          console.warn(`Could not reconnect folder '${record.label}'`, error);
          stillDenied.push(record);
        }
      }
      deniedRecords = stillDenied;
      setReconnectVisibility(document, deniedRecords.length);
      if (deniedRecords.length > 0) {
        setStatus(document, 'Folder permission was not granted. Your files were not changed.', 'error');
      } else if (restored > 0) {
        setStatus(document, `${restored} folder${restored === 1 ? '' : 's'} reconnected.`);
      }
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
