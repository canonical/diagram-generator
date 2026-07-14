/** Browser folder-open bridge for the preview workspace (spec 075, Phase 2). */

export interface PreviewLocalFolderFile {
  readonly name: string;
  readonly content: string;
  readonly handle?: FileSystemFileHandle;
}

export interface PreviewLocalFolderOpenResult {
  readonly sourceId: string;
  readonly label: string;
  readonly slugs: readonly string[];
}

interface PreviewLocalFolderState {
  readonly sourceId: string;
  readonly label: string;
  readonly directory?: FileSystemDirectoryHandle;
  readonly files: Map<string, FileSystemFileHandle>;
}

interface PreviewLocalFolderWindow extends Window {
  __DG_CONFIG?: { slug?: string } | null;
  __DG_workspaceFetch?: typeof fetch;
  __DG_localFolderWorkspace?: PreviewLocalFolderController;
}

type PreviewDirectoryHandle = FileSystemDirectoryHandle & {
  queryPermission: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>;
};

function asFileHandle(handle: FileSystemHandle): FileSystemFileHandle | null {
  return handle.kind === 'file' ? handle as FileSystemFileHandle : null;
}

export interface PreviewLocalFolderController {
  openFolder: () => Promise<void>;
  restoreFolder: () => Promise<void>;
}

const DB_NAME = 'diagram-generator-preview-workspaces';
const DB_STORE = 'handles';
const DB_KEY = 'last-folder';

function isYamlFilename(name: string): boolean {
  return name.toLowerCase().endsWith('.yaml') && name.slice(0, -5).length > 0;
}

function slugFromFilename(name: string): string {
  return name.slice(0, -5);
}

function status(document: Document, message: string, kind: 'ok' | 'error' = 'ok'): void {
  const node = document.getElementById('dg-workspace-status');
  if (node) {
    node.textContent = message;
    node.setAttribute('data-status-kind', kind);
  }
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(DB_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function storeHandle(handle: FileSystemDirectoryHandle, sourceId: string, label: string): Promise<void> {
  const database = await openDatabase();
  if (!database) return;
  await new Promise<void>((resolve) => {
    const transaction = database.transaction(DB_STORE, 'readwrite');
    transaction.objectStore(DB_STORE).put({ handle, sourceId, label }, DB_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
  });
  database.close();
}

async function readStoredHandle(): Promise<{ handle: FileSystemDirectoryHandle; sourceId: string; label: string } | null> {
  const database = await openDatabase();
  if (!database) return null;
  const value = await new Promise<unknown>((resolve) => {
    const request = database.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(DB_KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
  database.close();
  if (!value || typeof value !== 'object') return null;
  const record = value as { handle?: FileSystemDirectoryHandle; sourceId?: string; label?: string };
  return record.handle && typeof record.sourceId === 'string' && typeof record.label === 'string'
    ? { handle: record.handle, sourceId: record.sourceId, label: record.label }
    : null;
}

async function readDirectory(
  directory: FileSystemDirectoryHandle,
): Promise<PreviewLocalFolderFile[]> {
  const files: PreviewLocalFolderFile[] = [];
  for await (const [name, handle] of directory.entries()) {
    const fileHandle = asFileHandle(handle);
    if (!fileHandle || !isYamlFilename(name)) continue;
    const file = await fileHandle.getFile();
    files.push({ name, content: await file.text(), handle: fileHandle });
  }
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

async function uploadFolder(
  label: string,
  files: readonly PreviewLocalFolderFile[],
  sourceId?: string,
): Promise<PreviewLocalFolderOpenResult> {
  const response = await fetch('/api/workspaces/open', {
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

function currentLocalAddress(state: PreviewLocalFolderState): { address: string; slug: string } | null {
  const configuredSlug = (window as PreviewLocalFolderWindow).__DG_CONFIG?.slug || '';
  const prefix = `${state.sourceId}:`;
  if (!configuredSlug.startsWith(prefix)) return null;
  const slug = configuredSlug.slice(prefix.length);
  return slug ? { address: configuredSlug, slug } : null;
}

async function mirrorSavedYaml(state: PreviewLocalFolderState): Promise<void> {
  const address = currentLocalAddress(state);
  if (!address) return;
  const handle = state.files.get(address.slug);
  if (!handle) return;
  const response = await fetch(`/api/workspaces/yaml/${encodeURIComponent(address.address)}`, { cache: 'no-store' });
  if (!response.ok) return;
  const writable = await handle.createWritable();
  await writable.write(await response.text());
  await writable.close();
}

async function openDirectory(
  windowObject: PreviewLocalFolderWindow,
  document: Document,
  directory: FileSystemDirectoryHandle,
  requestedSourceId?: string,
  navigate = true,
): Promise<void> {
  const files = await readDirectory(directory);
  if (files.length === 0) throw new Error('The selected folder has no root-level .yaml diagrams.');
  const result = await uploadFolder(directory.name, files, requestedSourceId);
  const state: PreviewLocalFolderState = {
    sourceId: result.sourceId,
    label: result.label,
    directory,
    files: new Map(files.filter((file): file is PreviewLocalFolderFile & { handle: FileSystemFileHandle } => Boolean(file.handle))
      .map((file) => [slugFromFilename(file.name), file.handle])),
  };
  await storeHandle(directory, result.sourceId, result.label);
  windowObject.__DG_workspaceFetch = async (input, init) => {
    const response = await fetch(input, init);
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (response.ok && init?.method === 'POST' && url.includes('/api/overrides/')) {
      try {
        await mirrorSavedYaml(state);
      } catch (error) {
        console.warn('Could not mirror saved YAML to the opened folder', error);
      }
    }
    return response;
  };
  status(document, `${result.slugs.length} diagram${result.slugs.length === 1 ? '' : 's'} loaded from ${result.label}`);
  const firstSlug = result.slugs[0];
  if (navigate && firstSlug) windowObject.location.assign(`/view/v3:${result.sourceId}:${firstSlug}`);
}

export function initPreviewLocalFolderWorkspace(): PreviewLocalFolderController | null {
  const windowObject = globalThis as unknown as PreviewLocalFolderWindow;
  const document = windowObject.document;
  if (!document) return null;
  if (windowObject.__DG_localFolderWorkspace) return windowObject.__DG_localFolderWorkspace;

  let opening = false;
  const controller: PreviewLocalFolderController = {
    async openFolder() {
      if (opening) return;
      opening = true;
      try {
        const picker = (windowObject as Window & { showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle> })
          .showDirectoryPicker;
        if (typeof picker !== 'function') {
          status(document, 'Open folder is unavailable in this browser.', 'error');
          return;
        }
        const directory = await picker.call(windowObject);
        await openDirectory(windowObject, document, directory);
      } catch (error) {
        if ((error as { name?: string })?.name !== 'AbortError') {
          status(document, error instanceof Error ? error.message : String(error), 'error');
        }
      } finally {
        opening = false;
      }
    },
    async restoreFolder() {
      const stored = await readStoredHandle();
      if (!stored) return;
      try {
        const permission = await (stored.handle as PreviewDirectoryHandle).queryPermission({ mode: 'readwrite' });
        if (permission !== 'granted') return;
        await openDirectory(windowObject, document, stored.handle, stored.sourceId, false);
      } catch (error) {
        console.warn('Could not restore the previously opened folder', error);
      }
    },
  };
  windowObject.__DG_localFolderWorkspace = controller;

  const button = document.getElementById('dg-open-folder');
  button?.addEventListener('click', () => void controller.openFolder());
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') {
      event.preventDefault();
      void controller.openFolder();
    }
  });
  void controller.restoreFolder();
  return controller;
}
