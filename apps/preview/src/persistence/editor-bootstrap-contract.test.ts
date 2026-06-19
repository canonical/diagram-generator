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

  const bodyStart = start + marker.length - 1;
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
  const capturedCalls: Array<Record<string, unknown> | null | undefined> = [];
  const context = {
    console,
    _previewGridRuntime: {
      async loadGridInfo(canonicalState?: Record<string, unknown> | null) {
        capturedCalls.push(canonicalState);
        return {
          gridInfo: { cols: 8 },
          baseGridInfo: { cols: 8 },
        };
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

  assert.deepEqual(normalizeVmValue(capturedCalls), [
    { gridInfo: { cols: 4 } },
  ]);
});

test("editor svg loader accepts the namespaced previewShell.bootstrap contract", async () => {
  const source = loadEditorSource();
  let capturedHostOptions: Record<string, unknown> | null = null;
  let capturedLoadOptions: Record<string, unknown> | null = null;
  const previewBridgeBundleRenderContract = {
    async renderFreshPreviewSvg() {
      return { svg: { tagName: "svg" }, width: 640, height: 480 };
    },
  };
  const previewBridgeMergedRenderContract = {
    ...previewBridgeBundleRenderContract,
    hostWrapper: true,
  };
  const stage = {
    id: "stage",
    innerHTML: "",
    replaceChildren() {},
  };
  const context = {
    console,
    SLUG: "demo",
    ACTIVE_ENGINE: "v3",
    GRID: true,
    gridInfo: { cols: 8 },
    selectedIds: new Set(["stale"]),
    overrides: {},
    model: {
      gridOverrides: { rows: 2 },
      setDiagramGrid() {},
    },
    deselectAll() {},
    resetOverrideState() {},
    loadTree() {
      return Promise.resolve();
    },
    loadGridInfo() {
      return Promise.resolve();
    },
    populateGridControls() {},
    applyWaypointOverrides() {},
    applyAllOverrides() {},
    bindInteraction() {},
    renderGridOverlay() {},
    reapplySelection() {},
    runConstraints() {},
    escapeHtml(value: string) {
      return value;
    },
    _signalDiagramLoaded() {},
    _getPreviewBridgeHostContract() {
      return context.LayoutEngine.previewBridge.host;
    },
    _isPreviewEngineShellLayoutActive() {
      return true;
    },
    _initPreviewEngineShellPanel() {},
    _getLocalBridgeRelayoutStatus() {
      return { ready: true };
    },
    _pruneLinkedRootGridOverrides() {},
    _previewGridRuntime: {
      getGridInfo() {
        return { cols: 4 };
      },
    },
    fitSvgToRenderedContent() {},
    PreviewSaveClient: {
      markSaved() {},
    },
    EditorState: {
      serializeDirtyState() {
        return "{}";
      },
    },
    window: {
      __DG_getPreviewShellBootstrapContract() {
        return context.LayoutEngine.previewShell.bootstrap;
      },
      __DG_getPreviewBridgeRenderContract() {
        return previewBridgeMergedRenderContract;
      },
      __DG_getPreviewBridgeBundleRenderContract() {
        return context.LayoutEngine.previewBridge.render;
      },
    },
    document: {
      getElementById(id: string) {
        return id === "stage" ? stage : null;
      },
    },
    LayoutEngine: {
      previewBridge: {
        host: {
          initLayoutBridge() {
            return Promise.resolve();
          },
          setFrameTreeJson() {},
        },
        render: previewBridgeBundleRenderContract,
      },
      previewShell: {
        bootstrap: {
          createLoadPreviewSvgHostOptionsFromRuntime(options: Record<string, unknown>) {
            capturedHostOptions = normalizeVmValue({
              slug: options.slug,
              engine: options.engine,
              gridEnabled: options.gridEnabled,
              stageId: (options.stage as { id?: string } | null)?.id ?? null,
              previewBridgeHostMatches: options.previewBridgeHost === context.LayoutEngine.previewBridge.host,
              isEngineLayoutActive: (options.isEngineLayoutActive as (() => boolean))(),
              hasGridStateGet: typeof options.gridState?.getGridInfo,
              hasGridStateSet: typeof options.gridState?.setDiagramGrid,
              hasGetGridOverrides: typeof options.gridState?.getGridOverrides,
              hasPruneLinkedRootGridOverrides: typeof options.gridState?.pruneLinkedRootGridOverrides,
              selectedIds: Array.from(options.selectionState?.selectedIds as Set<string>),
              hasReapplySelection: typeof options.selectionState?.reapplySelection,
              hasMarkSaved: typeof options.previewSaveClient?.markSaved,
              hasSerializeDirtyState: typeof options.dirtyStateSerializer?.serializeDirtyState,
              previewBridgeRenderMatches:
                options.previewBridgeRender === previewBridgeMergedRenderContract,
              hasFitRenderedSvgToContent: typeof options.fitRenderedSvgToContent,
            });
            return { kind: "load-options" };
          },
          async loadPreviewSvg(options: Record<string, unknown>) {
            capturedLoadOptions = normalizeVmValue(options);
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "loadSVG", "(options = {})").replace(/^function /, "async function "),
    "this.__loaded = { loadSVG };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      loadSVG: (options?: Record<string, unknown>) => Promise<void>;
    };
  }).__loaded;

  await loaded.loadSVG({ preserveSelectionIds: ["alpha"] });

  assert.deepEqual(capturedHostOptions, {
    slug: "demo",
    engine: "v3",
    gridEnabled: true,
    stageId: "stage",
    previewBridgeHostMatches: true,
    isEngineLayoutActive: true,
    hasGridStateGet: "function",
    hasGridStateSet: "function",
    hasGetGridOverrides: "function",
    hasPruneLinkedRootGridOverrides: "function",
    selectedIds: ["stale"],
    hasReapplySelection: "function",
    hasMarkSaved: "function",
    hasSerializeDirtyState: "function",
    previewBridgeRenderMatches: true,
    hasFitRenderedSvgToContent: "function",
  });
  assert.deepEqual(capturedLoadOptions, {
    kind: "load-options",
  });
});

test("editor relayout runtime bootstrap accepts the namespaced previewBridge.relayout contract", () => {
  const source = loadEditorSource();
  let capturedHostOptions: Record<string, unknown> | null = null;
  const context = {
    console,
    _relayoutRuntime: null,
    overrides: {
      alpha: { dx: 8 },
    },
    _coercedKeys: new Set(["alpha:sizing_w"]),
    model: {
      gridOverrides: { cols: 8 },
      clearOverride() {},
    },
    selectedIds: new Set(["alpha"]),
    EditorState: {
      normalizeGridOverrides(value: unknown) {
        return value;
      },
      captureOverrideEntries() {
        return { ids: ["alpha"] };
      },
      commitOverridePatchAction() {},
    },
    getRelayoutStatus() {
      return { localReady: true };
    },
    _getPreviewBridgeHostContract() {
      return context.LayoutEngine.previewBridge.host;
    },
    _isPreviewEngineShellLayoutActive() {
      return true;
    },
    _failV3Relayout() {},
    _finishV3Relayout() {},
    setDirty() {},
    applyAllOverrides() {},
    updateInspector() {},
    loadTree() {
      return Promise.resolve();
    },
    rebuildArrowSVG() {},
    window: {
      __DG_getPreviewBridgeRelayoutContract() {
        return context.LayoutEngine.previewBridge.relayout;
      },
    },
    LayoutEngine: {
      previewBridge: {
        host: {
          performLocalRelayout() {
            return null;
          },
        },
        relayout: {
          createPreviewRelayoutRuntimeFromRuntime(options: Record<string, unknown>) {
            capturedHostOptions = normalizeVmValue({
              previewBridgeHostMatches: options.previewBridgeHost === context.LayoutEngine.previewBridge.host,
              overridesKeys: Object.keys((options.overrides as Record<string, unknown>) ?? {}),
              coercedKeys: Array.from(options.coercedKeys as Set<string>),
              modelMatches: options.model === context.model,
              selectedIds: Array.from(options.selectionState?.selectedIds as Set<string>),
              hasGetGridOverrides: typeof options.gridState?.getGridOverrides,
              hasNormalizeGridOverrides: typeof options.gridState?.normalizeGridOverrides,
              relayoutStatus: (options.getRelayoutStatus as () => unknown)(),
              isEngineLayoutActive: (options.isEngineLayoutActive as () => boolean)(),
              hasFailRelayout: typeof options.failRelayout,
              hasFinishRelayout: typeof options.finishRelayout,
              hasClearOverride: typeof options.clearOverride,
              hasSetDirty: typeof options.setDirty,
              hasApplyAllOverrides: typeof options.applyAllOverrides,
              hasUpdateInspector: typeof options.updateInspector,
              hasReloadTreeAfterArrowRestore: typeof options.reloadTreeAfterArrowRestore,
              hasRebuildArrowSvg: typeof options.rebuildArrowSvg,
              hasCaptureOverrideEntries: typeof options.editorState?.captureOverrideEntries,
              hasCommitOverridePatchAction: typeof options.editorState?.commitOverridePatchAction,
            });
            return { kind: "runtime" };
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "_getRelayoutRuntime", "()"),
    "this.__loaded = { _getRelayoutRuntime };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      _getRelayoutRuntime: () => { kind: string };
    };
  }).__loaded;

  assert.deepEqual(normalizeVmValue(loaded._getRelayoutRuntime()), {
    kind: "runtime",
  });
  assert.deepEqual(capturedHostOptions, {
    previewBridgeHostMatches: true,
    overridesKeys: ["alpha"],
    coercedKeys: ["alpha:sizing_w"],
    modelMatches: true,
    selectedIds: ["alpha"],
    hasGetGridOverrides: "function",
    hasNormalizeGridOverrides: "function",
    relayoutStatus: { localReady: true },
    isEngineLayoutActive: true,
    hasFailRelayout: "function",
    hasFinishRelayout: "function",
    hasClearOverride: "function",
    hasSetDirty: "function",
    hasApplyAllOverrides: "function",
    hasUpdateInspector: "function",
    hasReloadTreeAfterArrowRestore: "function",
    hasRebuildArrowSvg: "function",
    hasCaptureOverrideEntries: "function",
    hasCommitOverridePatchAction: "function",
  });
});

test("editor bootstrap tail accepts the namespaced previewShell.bootstrap contract", () => {
  const source = loadEditorSource();
  let capturedHostOptions: Record<string, unknown> | null = null;
  let capturedRuntimeOptions: Record<string, unknown> | null = null;
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
      __DG_getPreviewShellBootstrapContract() {
        return context.LayoutEngine.previewShell.bootstrap;
      },
      __DG_getPreviewBridgeHostContract() {
        return context.LayoutEngine.previewBridge.host;
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
      serializeDirtyState() {
        return "{}";
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
      previewBridge: {
        host: {
          getFrameTreeJson() {
            return { frames: [] };
          },
        },
      },
      previewShell: {
        bootstrap: {
          createBootstrapPreviewEditorRuntimeOptionsFromHost(options: Record<string, unknown>) {
            capturedHostOptions = normalizeVmValue({
              slug: options.slug,
              hasEditorStateUndo: typeof options.editorState?.undo,
              hasEditorStateRedo: typeof options.editorState?.redo,
              hasEditorStateSerializeDirtyState: typeof options.editorState?.serializeDirtyState,
              applyUndoCommandMatches: options.applyUndoCommand === context._applyUndoCommand,
              hasAttemptNavigation: typeof options.attemptNavigation,
              hasInitNavTabs: typeof options.initNavTabs,
              gridOverrides: (options.model as Record<string, unknown>).gridOverrides,
              elkLayoutOverrides: (options.model as Record<string, unknown>).elkLayoutOverrides,
              removedIds: Array.from((options.model as { removedIds: Set<string> }).removedIds),
              frameTree: (options.getFrameTree as () => unknown)(),
              selectedIds: Array.from(options.selectedIds as Set<string>),
              constraintSummary: (options.constraints as { summarise: (violations: unknown) => unknown })
                .summarise(options.lastViolations),
              allowInternalDirtyNavigation: (
                options.allowInternalDirtyNavigationState as { get: () => boolean }
              ).get(),
              hasWriteClipboardText: typeof options.writeClipboardText,
              hasPreviewSaveClientSaveOverrides: typeof options.previewSaveClient?.saveOverrides,
              hasConfirmClearAll: typeof options.confirmClearAll,
              hasOnClearAllOverrides: typeof options.onClearAllOverrides,
              generation: (options.generationState as { get: () => number }).get(),
              hasGenerationSet: typeof (options.generationState as { set: (value: number) => void }).set,
              hasScheduleReconnect: typeof options.scheduleReconnect,
            });
            return {
              slug: options.slug,
              model: options.model,
              selectedIds: options.selectedIds,
              onDocumentKeyDown: options.onDocumentKeyDown,
              undo: () => options.editorState.undo(options.applyUndoCommand),
              redo: () => options.editorState.redo(options.applyUndoCommand),
              saveOverrides: () => options.previewSaveClient.saveOverrides(),
              canUndo: () => options.editorState.canUndo(),
              canRedo: () => options.editorState.canRedo(),
              attemptNavigation: options.attemptNavigation,
              initNavTabs: options.initNavTabs,
              getFrameTree: options.getFrameTree,
              serializeDirtyState: () => options.editorState.serializeDirtyState(),
              getV3RelayoutStatus: options.getV3RelayoutStatus,
              getV3RelayoutRuntime: options.getV3RelayoutRuntime,
              getConstraintSummary: () => options.constraints.summarise(options.lastViolations),
              allowInternalDirtyNavigation: () => options.allowInternalDirtyNavigationState.get(),
              writeClipboardText: options.writeClipboardText,
              confirmClearAll: options.confirmClearAll,
              onClearAllOverrides: options.onClearAllOverrides,
              getGeneration: () => options.generationState.get(),
              scheduleReconnect: options.scheduleReconnect,
            };
          },
          bootstrapPreviewEditorRuntime(options: Record<string, unknown>) {
            capturedRuntimeOptions = normalizeVmValue({
              slug: options.slug,
              hasOnDocumentKeyDown: typeof options.onDocumentKeyDown,
              hasUndo: typeof options.undo,
              hasRedo: typeof options.redo,
              hasSaveOverrides: typeof options.saveOverrides,
              hasAttemptNavigation: typeof options.attemptNavigation,
              hasInitNavTabs: typeof options.initNavTabs,
              frameTree: (options.getFrameTree as () => unknown)(),
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
    extractNamedFunctionSource(source, "_getPreviewBridgeHostContract", "()"),
    extractNamedFunctionSource(source, "_readFrameTreeJson", "()"),
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

  assert.deepEqual(capturedHostOptions, {
    slug: "demo",
    hasEditorStateUndo: "function",
    hasEditorStateRedo: "function",
    hasEditorStateSerializeDirtyState: "function",
    applyUndoCommandMatches: true,
    hasAttemptNavigation: "function",
    hasInitNavTabs: "function",
    gridOverrides: { rows: 2 },
    elkLayoutOverrides: { root: { spacing: 24 } },
    removedIds: ["stale"],
    frameTree: { frames: [] },
    selectedIds: ["alpha", "beta"],
    constraintSummary: { errors: 0 },
    allowInternalDirtyNavigation: false,
    hasWriteClipboardText: "function",
    hasPreviewSaveClientSaveOverrides: "function",
    hasConfirmClearAll: "function",
    hasOnClearAllOverrides: "function",
    generation: 3,
    hasGenerationSet: "function",
    hasScheduleReconnect: "function",
  });

  assert.deepEqual(capturedRuntimeOptions, {
    slug: "demo",
    hasOnDocumentKeyDown: "function",
    hasUndo: "function",
    hasRedo: "function",
    hasSaveOverrides: "function",
    hasAttemptNavigation: "function",
    hasInitNavTabs: "function",
    frameTree: { frames: [] },
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
