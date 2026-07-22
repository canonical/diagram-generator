import { describe, expect, it, vi } from 'vitest';

import {
  createPreviewLocalFolderWorkspace,
  type PreviewLocalFolderHandleRecord,
  type PreviewLocalFolderHandleStore,
} from '../src/preview-shell/local-folder-workspace.js';
import { compileDiagramYaml } from '../src/diagram-author/compile.js';
import { importMermaid } from '../src/diagram-author/import-mermaid.js';
import { serializeDiagramYaml } from '../src/diagram-author/serialize-yaml.js';

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
  const mutableFiles = [...files];
  const directory = {
    kind: 'directory',
    name,
    async *entries() {
      for (const file of mutableFiles) yield [file.name, file] as [string, FileSystemHandle];
    },
    async getFileHandle(filename: string, options?: { create?: boolean }) {
      const existing = mutableFiles.find((file) => file.name === filename);
      if (existing) return existing;
      if (!options?.create) throw new DOMException('Not found', 'NotFoundError');
      const created = fakeFileHandle(filename, '');
      mutableFiles.push(created);
      return created;
    },
    async removeEntry(filename: string) {
      const index = mutableFiles.findIndex((file) => file.name === filename);
      if (index < 0) throw new DOMException('Not found', 'NotFoundError');
      mutableFiles.splice(index, 1);
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
  it('reports a distinct supported-browser explanation when folder picking is unavailable', async () => {
    const { document, elements } = fakeDocument();
    const windowObject = {
      __DG_CONFIG: { slug: '' },
      location: { assign() {} },
    } as unknown as Window;
    const controller = createPreviewLocalFolderWorkspace({
      windowObject,
      document,
      fetchFn: vi.fn() as unknown as typeof fetch,
      handleStore: memoryStore().store,
    });

    await controller.openFolder();

    expect(elements.get('dg-workspace-status')?.textContent).toContain('This browser cannot open local folders.');
    expect(elements.get('dg-workspace-status')?.attributes.get('data-status-kind')).toBe('error');
  });

  it('reports a visible pending state and explicit cancellation for Open folder', async () => {
    const { document, elements } = fakeDocument();
    let rejectPicker: ((reason?: unknown) => void) | null = null;
    const windowObject = {
      __DG_CONFIG: { slug: '' },
      location: { assign() {} },
      showDirectoryPicker: vi.fn(() => new Promise<FileSystemDirectoryHandle>((_resolve, reject) => {
        rejectPicker = reject;
      })),
    } as unknown as Window;
    const controller = createPreviewLocalFolderWorkspace({
      windowObject,
      document,
      fetchFn: vi.fn() as unknown as typeof fetch,
      handleStore: memoryStore().store,
    });

    const opening = controller.openFolder();
    expect(elements.get('dg-workspace-status')?.textContent).toBe('Opening folder chooser…');
    expect(elements.get('dg-workspace-status')?.attributes.get('data-status-kind')).toBe('pending');

    rejectPicker?.(new DOMException('Cancelled', 'AbortError'));
    await opening;

    expect(elements.get('dg-workspace-status')?.textContent).toBe('No folder was opened.');
    expect(elements.get('dg-workspace-status')?.attributes.get('data-status-kind')).toBe('cancelled');
  });

  it('reports a picker failure instead of silently abandoning the operation', async () => {
    const { document, elements } = fakeDocument();
    const windowObject = {
      __DG_CONFIG: { slug: '' },
      location: { assign() {} },
      showDirectoryPicker: async () => { throw new DOMException('Access blocked', 'NotAllowedError'); },
    } as unknown as Window;
    const controller = createPreviewLocalFolderWorkspace({
      windowObject,
      document,
      fetchFn: vi.fn() as unknown as typeof fetch,
      handleStore: memoryStore().store,
    });

    await controller.openFolder();

    expect(elements.get('dg-workspace-status')?.textContent).toBe('Access blocked');
    expect(elements.get('dg-workspace-status')?.attributes.get('data-status-kind')).toBe('error');
  });

  it('does not let a stale restore overwrite a newer folder-operation status', async () => {
    const permission: { value: PermissionState } = { value: 'prompt' };
    const handle = fakeDirectory('Alpha', [fakeFileHandle('alpha.yaml', 'alpha: original\n')], permission);
    let resolveRecords: ((records: PreviewLocalFolderHandleRecord[]) => void) | null = null;
    const store: PreviewLocalFolderHandleStore = {
      load: () => new Promise((resolve) => { resolveRecords = resolve; }),
      save: async () => {},
    };
    const { document, elements } = fakeDocument();
    const windowObject = {
      __DG_CONFIG: { slug: '' },
      location: { assign() {} },
      showDirectoryPicker: async () => { throw new DOMException('Cancelled', 'AbortError'); },
    } as unknown as Window;
    const controller = createPreviewLocalFolderWorkspace({
      windowObject,
      document,
      fetchFn: vi.fn() as unknown as typeof fetch,
      handleStore: store,
    });

    const restoring = controller.restoreFolders();
    await controller.openFolder();
    resolveRecords?.([{ sourceId: 'local-alpha', label: 'Alpha', handle }]);
    await restoring;

    expect(elements.get('dg-workspace-status')?.textContent).toBe('No folder was opened.');
    expect(elements.get('dg-workspace-status')?.attributes.get('data-status-kind')).toBe('cancelled');
  });

  it('does not mirror a structurally blocked import into the opened folder', async () => {
    const alpha = fakeFileHandle('alpha.yaml', 'alpha: original\n');
    const directory = fakeDirectory('Alpha', [alpha]);
    const { document } = fakeDocument();
    const yamlReads: string[] = [];
    const windowObject = {
      __DG_CONFIG: { slug: 'local-alpha:alpha' },
      location: { assign() {} },
      showDirectoryPicker: async () => directory,
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
          yamlReads.push(url);
          return new Response('alpha: falsified\n', { status: 200 });
        }
        if (url.startsWith('/api/import/mermaid')) {
          return new Response(JSON.stringify({
            summary: {
              preserved: 0,
              downgraded: [],
              blocked: [{ message: 'An edge would be dropped.' }],
            },
          }), {
            status: 422,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return jsonResponse({});
      }) as typeof fetch,
      handleStore: memoryStore().store,
      createSourceId: () => 'local-alpha',
    });

    await controller.openFolder();
    const response = await windowObject.__DG_workspaceFetch?.(
      '/api/import/mermaid?slug=local-alpha%3Aalpha',
      { method: 'POST' },
    );

    expect(response?.status).toBe(422);
    expect(yamlReads).toEqual([]);
    expect(alpha.content).toBe('alpha: original\n');
  });

  it('mirrors a successful compound import and reloads topology, direction, and engine', async () => {
    const alpha = fakeFileHandle('alpha.yaml', 'engine: v3\nroot:\n  id: alpha\n');
    const directory = fakeDirectory('Alpha', [alpha]);
    const { document } = fakeDocument();
    const imported = importMermaid([
      'flowchart TB',
      'subgraph left["Left"]',
      '  direction RL',
      '  a["A"]',
      'end',
      'subgraph right["Right"]',
      '  b["B"]',
      'end',
      'a --> b',
    ].join('\n'));
    const savedYaml = serializeDiagramYaml(imported.ast);
    const windowObject = {
      __DG_CONFIG: { slug: 'local-alpha:alpha' },
      location: { href: 'http://127.0.0.1/', assign() {} },
      showDirectoryPicker: async () => directory,
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
        if (url === '/api/workspaces/yaml/local-alpha%3Acompound') {
          return new Response(savedYaml, { status: 200 });
        }
        if (url.startsWith('/api/import/mermaid')) {
          return jsonResponse({ ok: true, slug: 'compound', summary: imported.summary });
        }
        return jsonResponse({});
      }) as typeof fetch,
      handleStore: memoryStore().store,
      createSourceId: () => 'local-alpha',
    });

    await controller.openFolder();
    const response = await windowObject.__DG_workspaceFetch?.(
      '/api/import/mermaid?slug=local-alpha%3Acompound',
      { method: 'POST' },
    );

    expect(response?.ok).toBe(true);
    const compound = await directory.getFileHandle('compound.yaml');
    const mirrored = await (await compound.getFile()).text();
    expect(mirrored).toBe(savedYaml);
    const reloaded = compileDiagramYaml(mirrored);
    expect(reloaded.errors).toEqual([]);
    expect(reloaded.ast.frameIndex.a?.parentId).toBe('left');
    expect(reloaded.ast.frameIndex.b?.parentId).toBe('right');
    expect(reloaded.ast.root?.children[0]?.flowDirection).toBe('RL');
    expect(reloaded.frameDiagram?.layoutEngine).toBe('elk-layered');
  });

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
    const reload = vi.fn();
    const windowObject = {
      __DG_CONFIG: { slug: '' },
      location: { assign() {}, reload },
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
          return jsonResponse({ sourceId: body.sourceId, label: 'Alpha', slugs: ['alpha'], registered: true });
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
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reconstructs the active-folder status after a reload', async () => {
    const handle = fakeDirectory('Alpha', [fakeFileHandle('alpha.yaml', 'alpha: original\n')]);
    const persisted = memoryStore([{ sourceId: 'local-alpha', label: 'Alpha', handle }]);
    const { document, elements } = fakeDocument();
    const reload = vi.fn();
    const windowObject = {
      __DG_CONFIG: { slug: 'local-alpha:alpha' },
      location: { assign() {}, reload },
    } as unknown as Window;
    const controller = createPreviewLocalFolderWorkspace({
      windowObject,
      document,
      fetchFn: (async (input: RequestInfo | URL) => {
        if (String(input) === '/api/workspaces/open') {
          return jsonResponse({
            sourceId: 'local-alpha',
            label: 'Alpha',
            slugs: ['alpha'],
            registered: false,
          });
        }
        return jsonResponse({});
      }) as typeof fetch,
      handleStore: persisted.store,
    });

    await controller.restoreFolders();

    expect(elements.get('dg-workspace-status')?.textContent).toBe('Alpha is active (1 diagram).');
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads once when restore recreates a server-side workspace registration', async () => {
    const file = fakeFileHandle('alpha.yaml', 'alpha: original\n');
    const handle = fakeDirectory('Alpha', [file]);
    const persisted = memoryStore([{ sourceId: 'local-alpha', label: 'Alpha', handle }]);
    const { document } = fakeDocument();
    const reload = vi.fn();
    const windowObject = {
      __DG_CONFIG: { slug: '' },
      location: { assign() {}, reload },
      confirm: () => true,
    } as unknown as Window;
    let registered = true;
    const controller = createPreviewLocalFolderWorkspace({
      windowObject,
      document,
      fetchFn: (async (input: RequestInfo | URL) => {
        if (String(input) === '/api/workspaces/open') {
          const response = jsonResponse({
            sourceId: 'local-alpha',
            label: 'Alpha',
            slugs: ['alpha'],
            registered,
          });
          registered = false;
          return response;
        }
        return jsonResponse({});
      }) as typeof fetch,
      handleStore: persisted.store,
    });

    await controller.restoreFolders();
    await controller.restoreFolders();

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('saves unsaved read-only edits as a new YAML file in a chosen folder', async () => {
    const targetDirectory = fakeDirectory('My diagrams', []);
    const assigned: string[] = [];
    const { document } = fakeDocument();
    const persisted = memoryStore();
    const windowObject = {
      __DG_CONFIG: {
        slug: 'examples:alpha',
        workspace_writable: false,
      },
      location: { assign: (url: string) => assigned.push(url) },
      confirm: () => true,
      showDirectoryPicker: async () => targetDirectory,
    } as unknown as Window & {
      __DG_CONFIG: { slug: string; workspace_writable: boolean };
      __DG_workspaceFetch?: typeof fetch;
    };
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    const fetchFn = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = typeof init?.body === 'string'
        ? JSON.parse(init.body) as Record<string, unknown>
        : {};
      calls.push({ url, body });
      if (url === '/api/workspaces/open') {
        return jsonResponse({
          sourceId: 'local-target',
          label: 'My diagrams',
          slugs: [],
        });
      }
      if (url === '/api/workspaces/copy') {
        return jsonResponse({
          address: 'local-target:alpha',
          workspaceRevision: 'copy-revision',
        });
      }
      if (url === '/api/overrides/local-target:alpha') {
        expect(body.workspaceRevision).toBe('copy-revision');
        return jsonResponse({
          canonicalState: { slug: 'alpha' },
          workspaceRevision: 'saved-revision',
        });
      }
      if (url === '/api/workspaces/yaml/local-target%3Aalpha') {
        return new Response('engine: v3\nroot:\n  id: copied\n', { status: 200 });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };
    createPreviewLocalFolderWorkspace({
      windowObject,
      document,
      fetchFn: fetchFn as typeof fetch,
      handleStore: persisted.store,
      createSourceId: () => 'local-target',
    });

    const response = await windowObject.__DG_workspaceFetch?.('/api/overrides/examples:alpha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ overrides: { copied: { dx: 8 } } }),
    });

    expect(response?.ok).toBe(true);
    expect(await response?.json()).toMatchObject({
      workspaceCopyAddress: 'local-target:alpha',
    });
    expect((await targetDirectory.getFileHandle('alpha.yaml')).getFile).toBeTypeOf('function');
    await expect((await (await targetDirectory.getFileHandle('alpha.yaml')).getFile()).text()).resolves.toBe(
      'engine: v3\nroot:\n  id: copied\n',
    );
    expect(calls.map((call) => call.url)).toEqual([
      '/api/workspaces/open',
      '/api/workspaces/copy',
      '/api/overrides/local-target:alpha',
      '/api/workspaces/yaml/local-target%3Aalpha',
    ]);
    expect(persisted.records().map((record) => record.sourceId)).toEqual(['local-target']);
    expect(assigned).toEqual([]);
  });

  it('forgets the current folder without deleting its YAML file', async () => {
    const file = fakeFileHandle('alpha.yaml', 'engine: v3\n');
    const directory = fakeDirectory('Alpha', [file]);
    const assigned: string[] = [];
    const persisted = memoryStore();
    const windowObject = {
      __DG_CONFIG: { slug: '' },
      location: { assign: (url: string) => assigned.push(url) },
      confirm: () => true,
      showDirectoryPicker: async () => directory,
    } as unknown as Window & {
      __DG_CONFIG: { slug: string };
    };
    const closed: string[] = [];
    const controller = createPreviewLocalFolderWorkspace({
      windowObject,
      document: fakeDocument().document,
      fetchFn: (async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input) === '/api/workspaces/open') {
          return jsonResponse({ sourceId: 'local-alpha', label: 'Alpha', slugs: ['alpha'] });
        }
        if (String(input) === '/api/workspaces/close') {
          closed.push((JSON.parse(String(init?.body)) as { sourceId: string }).sourceId);
          return jsonResponse({ ok: true });
        }
        return jsonResponse({});
      }) as typeof fetch,
      handleStore: persisted.store,
      createSourceId: () => 'local-alpha',
    });
    await controller.openFolder();
    windowObject.__DG_CONFIG.slug = 'local-alpha:alpha';

    await controller.forgetCurrentFolder();

    expect(closed).toEqual(['local-alpha']);
    expect(persisted.records()).toEqual([]);
    expect(file.content).toBe('engine: v3\n');
    expect(assigned).toEqual([
      '/view/v3:local-alpha:alpha',
      '/',
    ]);
  });
});
