import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

function repoRoot(): string {
  return path.resolve(process.cwd(), "..", "..");
}

function loadEditorSource(): string {
  return fs.readFileSync(path.join(repoRoot(), "scripts", "preview", "editor.js"), "utf8");
}

function extractNamedFunctionSource(source: string, functionName: string, signature: string): string {
  const marker = `function ${functionName}${signature} {`;
  const start = source.indexOf(marker);
  if (start === -1) {
    throw new Error(`${functionName} definition not found`);
  }

  const bodyStart = source.indexOf("{", start);
  if (bodyStart === -1) {
    throw new Error(`${functionName} body start not found`);
  }

  let depth = 0;
  let end = -1;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        end = index;
        break;
      }
    }
  }

  if (end === -1) {
    throw new Error(`${functionName} body end not found`);
  }

  return source.slice(start, end + 1);
}

function normalizeVmValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

test("editor navigation helper accepts the namespaced previewShell.bootstrap contract", () => {
  const source = loadEditorSource();
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    DIRTY_DIAGRAM_NAV_CONFIRM: "Leave?",
    PreviewSaveClient: {
      isDirty() {
        return true;
      },
    },
    _allowInternalDirtyNavigation: false,
    window: {
      location: {
        pathname: "/view/alpha",
        origin: "http://127.0.0.1:8100",
        assign() {},
      },
      confirm() {
        return true;
      },
      setTimeout(callback: () => void) {
        callback();
        return 0;
      },
      __DG_getPreviewShellBootstrapContract() {
        return context.LayoutEngine.previewShell.bootstrap;
      },
    },
    LayoutEngine: {
      previewShell: {
        bootstrap: {
          attemptPreviewDiagramNavigation(options: Record<string, unknown>) {
            capturedCalls.push(options);
            return true;
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "_attemptDiagramNavigation", "(nextUrl, syncUi)"),
    "this.__loaded = { _attemptDiagramNavigation };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      _attemptDiagramNavigation: (nextUrl: string, syncUi: () => void) => boolean;
    };
  }).__loaded;

  const syncUi = () => {};
  assert.equal(loaded._attemptDiagramNavigation("/view/beta", syncUi), true);
  assert.equal(capturedCalls.length, 1);
  assert.deepEqual(normalizeVmValue({
    nextUrl: capturedCalls[0]?.nextUrl,
    currentPath: capturedCalls[0]?.currentPath,
    origin: capturedCalls[0]?.origin,
    isDirty: capturedCalls[0]?.isDirty,
    dirtyConfirmMessage: capturedCalls[0]?.dirtyConfirmMessage,
    hasConfirm: typeof capturedCalls[0]?.confirmNavigation,
    hasSyncUi: typeof capturedCalls[0]?.syncUi,
    hasSetAllow: typeof capturedCalls[0]?.setAllowInternalDirtyNavigation,
    hasAssign: typeof capturedCalls[0]?.assignLocation,
    hasSchedule: typeof capturedCalls[0]?.schedulePostNavigationReset,
  }), {
    nextUrl: "/view/beta",
    currentPath: "/view/alpha",
    origin: "http://127.0.0.1:8100",
    isDirty: true,
    dirtyConfirmMessage: "Leave?",
    hasConfirm: "function",
    hasSyncUi: "function",
    hasSetAllow: "function",
    hasAssign: "function",
    hasSchedule: "function",
  });
});

test("editor tree loader accepts the namespaced previewShell.bootstrap contract", async () => {
  const source = loadEditorSource();
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    SLUG: "demo",
    model: { loadTree() {}, loadArrows() {} },
    fetch(url: string, init: Record<string, unknown>) {
      capturedCalls.push({ fetchUrl: url, init });
      return Promise.resolve({
        ok: true,
        async json() {
          return [];
        },
      });
    },
    getPreviewDocumentJson() {
      return { kind: "frame-diagram" };
    },
    getFrameTreeJson() {
      return { arrows: [{ source: "a", target: "b" }] };
    },
    syncArrowsInModel() {},
    arrowComponentId() {
      return "arrow-1";
    },
    window: {
      __DG_getPreviewShellBootstrapContract() {
        return context.LayoutEngine.previewShell.bootstrap;
      },
      __DG_getPreviewBridgeHostContract() {
        return context.LayoutEngine.previewBridge.host;
      },
    },
    LayoutEngine: {
      previewBridge: {
        host: {
          getPreviewDocumentJson() {
            return { kind: "frame-diagram" };
          },
          getFrameTreeJson() {
            return { arrows: [{ source: "a", target: "b" }] };
          },
        },
      },
      previewShell: {
        bootstrap: {
          async loadPreviewComponentTree(options: Record<string, unknown>) {
            capturedCalls.push(options);
            await (options.fetchTree as () => Promise<unknown>)();
            return "fetched";
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "_getPreviewBridgeHostContract", "()"),
    extractNamedFunctionSource(source, "_readPreviewDocumentJson", "()"),
    extractNamedFunctionSource(source, "_readFrameTreeJson", "()"),
    extractNamedFunctionSource(source, "loadTree", "(canonicalState = null)").replace(/^function /, "async function "),
    "this.__loaded = { loadTree };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      loadTree: (canonicalState?: Record<string, unknown> | null) => Promise<string>;
    };
  }).__loaded;

  assert.equal(await loaded.loadTree({ componentTree: [] }), "fetched");
  assert.equal(capturedCalls.length, 2);
  assert.match(String(capturedCalls[1]?.fetchUrl || ""), /^\/api\/tree\/demo\?t=\d+$/);
  assert.deepEqual(normalizeVmValue({
    canonicalState: capturedCalls[0]?.canonicalState,
    hasReadPreviewDocument: typeof capturedCalls[0]?.readPreviewDocument,
    hasFetchTree: typeof capturedCalls[0]?.fetchTree,
    model: capturedCalls[0]?.model,
    hasReadFrameTreeJson: typeof capturedCalls[0]?.readFrameTreeJson,
    hasSyncArrowsInModel: typeof capturedCalls[0]?.syncArrowsInModel,
    hasArrowComponentId: typeof capturedCalls[0]?.arrowComponentId,
    fetchUrl: capturedCalls[1]?.fetchUrl,
    fetchCache: capturedCalls[1]?.init?.cache,
  }), {
    canonicalState: { componentTree: [] },
    hasReadPreviewDocument: "function",
    hasFetchTree: "function",
    model: {},
    hasReadFrameTreeJson: "function",
    hasSyncArrowsInModel: "function",
    hasArrowComponentId: "function",
    fetchUrl: String(capturedCalls[1]?.fetchUrl || ""),
    fetchCache: "no-store",
  });
});

test("editor grid loader accepts the namespaced previewShell.bootstrap contract", async () => {
  const source = loadEditorSource();
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    SLUG: "demo",
    BASELINE_STEP: 8,
    gridInfo: null as unknown,
    baseGridInfo: null as unknown,
    EditorState: {
      cloneValue(value: unknown) {
        return { cloned: value };
      },
    },
    model: {
      roots: [{ data: { layout_gap: 24, padding_top: 32 } }],
    },
    document: {
      querySelector(selector: string) {
        if (selector !== "#stage svg") return null;
        return {
          viewBox: { baseVal: { width: 640, height: 480 } },
          getAttribute(name: string) {
            return name === "width" ? "640" : "480";
          },
        };
      },
    },
    fetch(url: string, init: Record<string, unknown>) {
      capturedCalls.push({ fetchUrl: url, init });
      return Promise.resolve({
        ok: true,
        async json() {
          return { cols: 8 };
        },
      });
    },
    window: {
      __DG_getPreviewShellBootstrapContract() {
        return context.LayoutEngine.previewShell.bootstrap;
      },
      __DG_getPreviewShellSceneContract() {
        return context.LayoutEngine.previewShell.scene;
      },
    },
    LayoutEngine: {
      previewShell: {
        bootstrap: {
          async loadPreviewGridInfo(options: Record<string, unknown>) {
            capturedCalls.push(options);
            await (options.fetchGridInfo as () => Promise<unknown>)();
            const resolved = (options.resolvePreviewGridInfo as (value: Record<string, unknown>) => unknown)({
              canvasWidth: 640,
              canvasHeight: 480,
              baselineStep: 8,
              columnCount: 8,
              columnGutter: 24,
              rowGutter: 24,
              marginTop: 32,
              marginRight: 32,
              marginBottom: 32,
              marginLeft: 32,
            });
            assert.deepEqual(normalizeVmValue(resolved), { resolved: true, canvasWidth: 640 });
            return {
              mode: "fetched",
              gridInfo: { cols: 8 },
              baseGridInfo: { cols: 8 },
            };
          },
        },
        scene: {
          resolvePreviewGridInfo(options: Record<string, unknown>) {
            return { resolved: true, canvasWidth: options.canvasWidth };
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "loadGridInfo", "(canonicalState = null)").replace(/^function /, "async function "),
    "this.__loaded = { loadGridInfo };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      loadGridInfo: (canonicalState?: Record<string, unknown> | null) => Promise<void>;
    };
  }).__loaded;

  await loaded.loadGridInfo({ gridInfo: { cols: 4 } });

  assert.deepEqual(normalizeVmValue({
    canonicalState: capturedCalls[0]?.canonicalState,
    hasFetchGridInfo: typeof capturedCalls[0]?.fetchGridInfo,
    hasCloneValue: typeof capturedCalls[0]?.cloneValue,
    hasReadFallbackMetrics: typeof capturedCalls[0]?.readFallbackMetrics,
    hasResolvePreviewGridInfo: typeof capturedCalls[0]?.resolvePreviewGridInfo,
    fetchUrl: capturedCalls[1]?.fetchUrl,
    fetchCache: capturedCalls[1]?.init?.cache,
  }), {
    canonicalState: { gridInfo: { cols: 4 } },
    hasFetchGridInfo: "function",
    hasCloneValue: "function",
    hasReadFallbackMetrics: "function",
    hasResolvePreviewGridInfo: "function",
    fetchUrl: String(capturedCalls[1]?.fetchUrl || ""),
    fetchCache: "no-store",
  });
  assert.deepEqual(normalizeVmValue({
    gridInfo: context.gridInfo,
    baseGridInfo: context.baseGridInfo,
  }), {
    gridInfo: { cols: 8 },
    baseGridInfo: { cols: 8 },
  });
});

test("editor bootstrap tail accepts the namespaced previewShell.bootstrap contract", () => {
  const source = loadEditorSource();
  let capturedOptions: Record<string, unknown> | null = null;
  const context = {
    console,
    SLUG: "demo",
    navigator: {
      clipboard: {
        writeText() {},
      },
    },
    alert() {},
    confirm() {
      return true;
    },
    fetch() {
      return Promise.resolve({
        ok: true,
        text() {
          return Promise.resolve("<html></html>");
        },
      });
    },
    EventSource: function EventSource(url: string) {
      this.url = url;
    },
    window: {
      location: { pathname: "/view/v3:demo" },
      EditorState: {
        serializeDirtyState() {
          return "{}";
        },
      },
      __DG_getPreviewShellBootstrapContract() {
        return context.LayoutEngine.previewShell.bootstrap;
      },
      addEventListener() {},
      removeEventListener() {},
    },
    document: {
      getElementById(id: string) {
        return { id };
      },
    },
    onDocumentKeyDown() {},
    _applyUndoCommand() {},
    _syncBrowseNavToLocation() {},
    _attemptDiagramNavigation() {
      return true;
    },
    initNavTabs() {},
    PreviewSaveClient: {
      saveOverrides() {},
    },
    EditorState: {
      undo() {
        return Promise.resolve();
      },
      redo() {
        return Promise.resolve();
      },
      canUndo() {
        return true;
      },
      canRedo() {
        return false;
      },
      runUndoableAction(_label: string, mutate: () => void) {
        mutate();
      },
    },
    overrides: { alpha: { dx: 8 } },
    model: {
      gridOverrides: { rows: 2 },
      elkLayoutOverrides: { root: { spacing: 24 } },
      removedIds: new Set(["stale"]),
      roots: [{ id: "root" }],
    },
    getFrameTreeJson() {
      return { frames: [] };
    },
    requestV3Relayout() {
      return Promise.resolve();
    },
    selectedIds: new Set(["alpha", "beta"]),
    reapplySelection() {},
    loadSVG() {},
    _v3RelayoutRuntime: { sequence: 1 },
    constraints: {
      summarise() {
        return { errors: 0 };
      },
    },
    runConstraints() {},
    lastViolations: [],
    _coercedKeys: new Set(["coerced"]),
    setStatus() {},
    sanitizeSvgCloneForExport() {},
    _allowInternalDirtyNavigation: false,
    replaceOverrides() {},
    setDirty() {},
    applyAllOverrides() {},
    renderSelectionInspector() {},
    generation: 3,
    getV3RelayoutStatus() {
      return context.v3RelayoutStatus;
    },
    v3RelayoutStatus: { localReady: true },
    LayoutEngine: {
      previewShell: {
        bootstrap: {
          bootstrapPreviewEditorRuntime(options: Record<string, unknown>) {
            capturedOptions = normalizeVmValue({
              slug: options.slug,
              hasOnDocumentKeyDown: typeof options.onDocumentKeyDown,
              hasUndo: typeof options.undo,
              hasRedo: typeof options.redo,
              hasSaveOverrides: typeof options.saveOverrides,
              hasAttemptNavigation: typeof options.attemptNavigation,
              hasInitNavTabs: typeof options.initNavTabs,
              gridOverrides: (options.model as Record<string, unknown>).gridOverrides,
              elkLayoutOverrides: (options.model as Record<string, unknown>).elkLayoutOverrides,
              removedIds: Array.from((options.model as { removedIds: Set<string> }).removedIds),
              frameTree: (options.getFrameTree as () => unknown)(),
              rootId: ((options.model as { roots: Array<{ id: string }> }).roots[0] || {}).id,
              selectedIds: Array.from(options.selectedIds as Set<string>),
              serializedState: (options.serializeDirtyState as () => string)(),
              relayoutStatus: (options.getV3RelayoutStatus as () => unknown)(),
              relayoutRuntime: (options.getV3RelayoutRuntime as () => unknown)(),
              constraintSummary: (options.getConstraintSummary as () => unknown)(),
              allowInternalDirtyNavigation: (options.allowInternalDirtyNavigation as () => boolean)(),
              hasWriteClipboardText: typeof options.writeClipboardText,
              hasConfirmClearAll: typeof options.confirmClearAll,
              hasOnClearAllOverrides: typeof options.onClearAllOverrides,
              generation: (options.getGeneration as () => number)(),
              hasScheduleReconnect: typeof options.scheduleReconnect,
            });
          },
        },
      },
    },
    __DG_getOverrideToolbarContract() {
      return {
        slug: "demo",
        confirmClearAllMessage: "Clear all overrides for demo?",
      };
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "bootstrapPreviewEditor", "()"),
    "this.__loaded = { bootstrapPreviewEditor };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      bootstrapPreviewEditor: () => void;
    };
  }).__loaded;

  loaded.bootstrapPreviewEditor();

  assert.deepEqual(capturedOptions, {
    slug: "demo",
    hasOnDocumentKeyDown: "function",
    hasUndo: "function",
    hasRedo: "function",
    hasSaveOverrides: "function",
    hasAttemptNavigation: "function",
    hasInitNavTabs: "function",
    gridOverrides: { rows: 2 },
    elkLayoutOverrides: { root: { spacing: 24 } },
    removedIds: ["stale"],
    frameTree: { frames: [] },
    rootId: "root",
    selectedIds: ["alpha", "beta"],
    serializedState: "{}",
    relayoutStatus: { localReady: true },
    relayoutRuntime: { sequence: 1 },
    constraintSummary: { errors: 0 },
    allowInternalDirtyNavigation: false,
    hasWriteClipboardText: "function",
    hasConfirmClearAll: "function",
    hasOnClearAllOverrides: "function",
    generation: 3,
    hasScheduleReconnect: "function",
  });
});
