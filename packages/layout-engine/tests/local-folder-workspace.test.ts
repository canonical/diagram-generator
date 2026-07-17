import { describe, expect, it, vi } from 'vitest';

import {
  createPreviewLocalFolderWorkspace,
  type PreviewLocalFolderHandleRecord,
  type PreviewLocalFolderHandleStore,
} from '../src/preview-shell/local-folder-workspace.js';

interface FakeFileHandle extends FileSystemFileHandle {
  content: string;
}

function fakeFileHandle(
  name: string,
  content: string,
  options: { failWrite?: boolean } = {},
): FakeFileHandle {
  const handle = {
    kind: 'file',
    name,
    content,
    async getFile() {
      return {
        name,
        size: handle.content.length,
        text: async () => handle.content,
      } as File;
    },
    async createWritable() {
      if (options.failWrite) throw new DOMException('Permission denied', 'NotAllowedError');
      return {
        async write(value: string) {
          handle.content = String(value);
        },
        async close() {},
      } as FileSystemWritableFileStream;
    },
  };
  return handle as FakeFileHandle;
}

function fakeDirectory(
  name: string,
  files: readonly FakeFileHandle[],
  permission: { value: PermissionState } = { value: 'granted' },
): FileSystemDirectoryHandle {
  const directory = {
    kind: 'directory',
    name,
    async *entries() {
      for (const file of files) yield [file.name, file] as [string, FileSystemHandle];
    },
    async queryPermission() {
      return permission.value;
    },
    async requestPermission() {
      permission.value = 'granted';
      return permission.value;
    },
    async isSameEntry(other: FileSystemHandle) {
      return other === directory;
    },
  };
  return directory as FileSystemDirectoryHandle;
}

function fakeDocument() {
  const elements = new Map<string, {
    hidden: boolean;
    textContent: string | null;
    attributes: Map<string, string>;
    setAttribute(name: string, value: string): void;
  }>();
  for (const id of ['dg-workspace-status', 'dg-reconnect-folders']) {
    const attributes = new Map<string, string>();
    elements.set(id, {
      hidden: id === 'dg-reconnect-folders',
      textContent: '',
      attributes,
      setAttribute(name, value) {
        attributes.set(name, value);
      },
    });
  }
  return {
    document: {
      getElementById: (id: string) => elements.get(id) ?? null,
    } as unknown as Document,
    elements,
  };
}

function memoryStore(initial: readonly PreviewLocalFolderHandleRecord[] = []): {
  store: PreviewLocalFolderHandleStore;
  records: () => PreviewLocalFolderHandleRecord[];
} {
  let records = [...initial];
  return {
    store: {
      async load() {
        return [...records];
      },
      async save(next) {
        records = [...next];
      },
    },
    records: () => [...records],
  };
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('preview local-folder workspace', () => {
  it('keeps multiple folders connected and routes each save to its own handle', async () => {
    const alpha = fakeFileHandle('alpha.yaml', 'alpha: original\n');
    const beta = fakeFileHandle('beta.yaml', 'beta: original\n');
    const directories = [
      fakeDirectory('Same name', [alpha]),
      fakeDirectory('Same name', [beta]),
    ];
    const savedYaml = new Map([
      ['local-one:alpha', 'alpha: saved\n'],
      ['local-two:beta', 'beta: saved\n'],
    ]);
    const sourceIds = ['local-one', 'local-two'];
    const { document } = fakeDocument();
    const persisted = memoryStore();
    const windowObject = {
      __DG_CONFIG: { slug: '' },
      location: { assign() {} },
      confirm: () => true,
      showDirectoryPicker: async () => directories.shift(),
    } as unknown as Window & {
      __DG_CONFIG: { slug: string };
      __DG_workspaceFetch?: typeof fetch;
    };
    const fetchFn = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/workspaces/open') {
        const body = JSON.parse(String(init?.body)) as { sourceId: string; files: { name: string }[] };
        return jsonResponse({
          sourceId: body.sourceId,
          label: 'Same name',
          slugs: body.files.map((file) => file.name.replace(/\.yaml$/i, '')),
        });
      }
      if (url.startsWith('/api/workspaces/yaml/')) {
        const address = decodeURIComponent(url.slice('/api/workspaces/yaml/'.length));
        return new Response(savedYaml.get(address), { status: 200 });
      }
      return jsonResponse({ canonicalState: {} });
    };
    const controller = createPreviewLocalFolderWorkspace({
      windowObject,
      document,
      fetchFn: fetchFn as typeof fetch,
      handleStore: persisted.store,
      createSourceId: () => sourceIds.shift() ?? 'local-extra',
    });

    await controller.openFolder();
    await controller.openFolder();
    expect(persisted.records().map((record) => record.sourceId)).toEqual(['local-one', 'local-two']);

    windowObject.__DG_CONFIG.slug = 'local-one:alpha';
    expect((await windowObject.__DG_workspaceFetch?.('/api/overrides/local-one:alpha', {
      method: 'POST',
    }))?.ok).toBe(true);
    expect(alpha.content).toBe('alpha: saved\n');
    expect(beta.content).toBe('beta: original\n');

    savedYaml.set('local-one:alpha', 'alpha: imported\n');
    expect((await windowObject.__DG_workspaceFetch?.('/api/import/mermaid?slug=local-one%3Aalpha', {
      method: 'POST',
    }))?.ok).toBe(true);
    expect(alpha.content).toBe('alpha: imported\n');

    windowObject.__DG_CONFIG.slug = 'local-two:beta';
    expect((await windowObject.__DG_workspaceFetch?.('/api/overrides/local-two:beta', {
      method: 'POST',
    }))?.ok).toBe(true);
    expect(beta.content).toBe('beta: saved\n');
  });

  it('fails the save and preserves disk content when an external change is kept', async () => {
    const file = fakeFileHandle('alpha.yaml', 'alpha: original\n');
    const { document, elements } = fakeDocument();
    const windowObject = {
      __DG_CONFIG: { slug: 'local-alpha:alpha' },
      location: { assign() {} },
      confirm: () => false,
      showDirectoryPicker: async () => fakeDirectory('Alpha', [file]),
    } as unknown as Window & {
      __DG_CONFIG: { slug: string };
      __DG_workspaceFetch?: typeof fetch;
    };
    const controller = createPreviewLocalFolderWorkspace({
      windowObject,
      document,
      fetchFn: (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === '/api/workspaces/open') {
          const body = JSON.parse(String(init?.body)) as { sourceId: string };
          return jsonResponse({ sourceId: body.sourceId, label: 'Alpha', slugs: ['alpha'] });
        }
        if (url.startsWith('/api/workspaces/yaml/')) {
          return new Response('alpha: editor\n', { status: 200 });
        }
        return jsonResponse({ canonicalState: {} });
      }) as typeof fetch,
      handleStore: memoryStore().store,
      createSourceId: () => 'local-alpha',
      confirmExternalOverwrite: () => false,
    });
    await controller.openFolder();
    file.content = 'alpha: external\n';

    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const response = await windowObject.__DG_workspaceFetch?.('/api/overrides/local-alpha:alpha', {
      method: 'POST',
    });
    warning.mockRestore();
    expect(response?.status).toBe(409);
    expect(file.content).toBe('alpha: external\n');
    expect(elements.get('dg-workspace-status')?.textContent).toContain('External changes kept');
  });

  it('does not report success when the granted file handle cannot be written', async () => {
    const file = fakeFileHandle('alpha.yaml', 'alpha: original\n', { failWrite: true });
    const { document } = fakeDocument();
    const windowObject = {
      __DG_CONFIG: { slug: 'local-alpha:alpha' },
      location: { assign() {} },
      confirm: () => true,
      showDirectoryPicker: async () => fakeDirectory('Alpha', [file]),
    } as unknown as Window & {
      __DG_CONFIG: { slug: string };
      __DG_workspaceFetch?: typeof fetch;
    };
    const controller = createPreviewLocalFolderWorkspace({
      windowObject,
      document,
      fetchFn: (async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input) === '/api/workspaces/open') {
          const body = JSON.parse(String(init?.body)) as { sourceId: string };
          return jsonResponse({ sourceId: body.sourceId, label: 'Alpha', slugs: ['alpha'] });
        }
        if (String(input).startsWith('/api/workspaces/yaml/')) {
          return new Response('alpha: editor\n', { status: 200 });
        }
        return jsonResponse({ canonicalState: {} });
      }) as typeof fetch,
      handleStore: memoryStore().store,
      createSourceId: () => 'local-alpha',
    });
    await controller.openFolder();

    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const response = await windowObject.__DG_workspaceFetch?.('/api/overrides/local-alpha:alpha', {
      method: 'POST',
    });
    warning.mockRestore();
    expect(response?.status).toBe(502);
    expect(file.content).toBe('alpha: original\n');
  });

  it('offers a one-click reconnect when a stored handle lost permission', async () => {
    const permission: { value: PermissionState } = { value: 'prompt' };
    const file = fakeFileHandle('alpha.yaml', 'alpha: original\n');
    const handle = fakeDirectory('Alpha', [file], permission);
    const persisted = memoryStore([{ sourceId: 'local-alpha', label: 'Alpha', handle }]);
    const { document, elements } = fakeDocument();
    const windowObject = {
      __DG_CONFIG: { slug: '' },
      location: { assign() {} },
      confirm: () => true,
    } as unknown as Window;
    const uploads: string[] = [];
    const controller = createPreviewLocalFolderWorkspace({
      windowObject,
      document,
      fetchFn: (async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input) === '/api/workspaces/open') {
          const body = JSON.parse(String(init?.body)) as { sourceId: string };
          uploads.push(body.sourceId);
          return jsonResponse({ sourceId: body.sourceId, label: 'Alpha', slugs: ['alpha'] });
        }
        return jsonResponse({});
      }) as typeof fetch,
      handleStore: persisted.store,
    });

    await controller.restoreFolders();
    expect(elements.get('dg-reconnect-folders')?.hidden).toBe(false);
    expect(uploads).toEqual([]);

    await controller.reconnectFolders();
    expect(permission.value).toBe('granted');
    expect(elements.get('dg-reconnect-folders')?.hidden).toBe(true);
    expect(uploads).toEqual(['local-alpha']);
  });
});
