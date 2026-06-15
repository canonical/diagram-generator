import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  connectPreviewSse,
  createPreviewSaveClientInitConfig,
  ensurePreviewEditorState,
  ensurePreviewElkPreviewController,
  registerPreviewPageshowReload,
} from '../src/preview-shell/app-bootstrap.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('preview bootstrap helpers', () => {
  it('installs fallback editor-state and elk controller globals when absent', () => {
    const previewWindow = {} as Window & typeof globalThis;
    const editorInit = {
      getOverrides: vi.fn(),
      getGridOverrides: vi.fn(),
      getElkLayoutOverrides: vi.fn(),
      getRemovedIds: vi.fn(),
      getFrameTree: vi.fn(),
    };
    const elkInit = {
      getElkLayoutOverrides: vi.fn(() => ({})),
      setElkLayoutOverrides: vi.fn(),
      getRootId: vi.fn(() => 'root'),
      requestV3Relayout: vi.fn(async () => undefined),
    };

    const editorState = ensurePreviewEditorState(previewWindow, editorInit);
    const elkController = ensurePreviewElkPreviewController(previewWindow, elkInit);

    expect(previewWindow.EditorState).toBe(editorState);
    expect(previewWindow.ElkPreviewController).toBe(elkController);
    expect(editorState.init).toBeTypeOf('function');
    expect(elkController.init).toBeTypeOf('function');
  });

  it('builds beforeunload protection from preview save-client state', () => {
    const config = createPreviewSaveClientInitConfig({
      slug: 'demo',
      previewSaveClient: {
        init: vi.fn(),
        isDirty: () => true,
      },
      getModel: vi.fn(),
      getSelectedIds: vi.fn(() => []),
      restoreSelectionIds: vi.fn(),
      serializeDirtyState: vi.fn(() => '{}'),
      reloadDiagram: vi.fn(),
      isElkLayeredDiagram: vi.fn(() => false),
      wireElkLayoutPanel: vi.fn(),
      applyElkLayoutOverrides: vi.fn(),
      getV3RelayoutStatus: vi.fn(),
      getV3RelayoutRuntime: vi.fn(),
      getConstraintSummary: vi.fn(),
      getConstraintErrorCount: vi.fn(() => 0),
      runConstraints: vi.fn(),
      clearCoercedKeys: vi.fn(),
      setStatus: vi.fn(),
      sanitizeSvgCloneForExport: vi.fn(),
      allowInternalDirtyNavigation: () => false,
    });
    const event = {
      returnValue: undefined,
      preventDefault: vi.fn(),
    } as unknown as BeforeUnloadEvent;

    expect(config.onBeforeUnload(event)).toBe('');
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.returnValue).toBe('');
  });

  it('reloads on newer sse generations and schedules reconnects on error', () => {
    let source: { onmessage: ((event: { data: string }) => void) | null; onerror: (() => void) | null } | null = null;
    let generation = 2;
    const reloadDiagram = vi.fn();
    const setBuildStatus = vi.fn();
    const scheduleReconnect = vi.fn((callback: () => void) => {
      callback();
    });

    connectPreviewSse({
      eventSourceFactory: vi.fn(() => {
        source = { onmessage: null, onerror: null };
        return source;
      }),
      getGeneration: () => generation,
      setGeneration: (value) => {
        generation = value;
      },
      reloadDiagram,
      setBuildStatus,
      scheduleReconnect,
      reconnectDelayMs: 250,
    });

    source?.onmessage?.({ data: JSON.stringify({ generation: 3, error: true }) });
    source?.onerror?.();

    expect(generation).toBe(3);
    expect(reloadDiagram).toHaveBeenCalledTimes(1);
    expect(setBuildStatus).toHaveBeenCalledWith({
      kind: 'error',
      message: 'Build error',
    });
    expect(scheduleReconnect).toHaveBeenCalledTimes(1);
    expect(scheduleReconnect).toHaveBeenCalledWith(expect.any(Function), 250);
  });

  it('reloads persisted pageshow restores and ignores fresh navigations', () => {
    const reloadDiagram = vi.fn();
    let listener: ((event: PageTransitionEvent) => void) | null = null;

    registerPreviewPageshowReload({
      addPageshowListener: (nextListener) => {
        listener = nextListener;
      },
      reloadDiagram,
    });

    listener?.({ persisted: false } as PageTransitionEvent);
    listener?.({ persisted: true } as PageTransitionEvent);

    expect(reloadDiagram).toHaveBeenCalledTimes(1);
  });
});
