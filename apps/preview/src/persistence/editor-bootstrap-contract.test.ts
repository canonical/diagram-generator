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
  const functionMarkers = [
    `async function ${functionName}${signature} {`,
    `function ${functionName}${signature} {`,
  ];
  let functionStart = -1;
  for (const marker of functionMarkers) {
    functionStart = source.indexOf(marker);
    if (functionStart !== -1) {
      break;
    }
  }
  if (functionStart !== -1) {
    const bodyStart = source.indexOf("{", functionStart);
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

    return source.slice(functionStart, end + 1);
  }

  const arrowPrefixes = [
    `const ${functionName} = async ${signature} =>`,
    `const ${functionName} = ${signature} =>`,
    `let ${functionName} = async ${signature} =>`,
    `let ${functionName} = ${signature} =>`,
    `var ${functionName} = async ${signature} =>`,
    `var ${functionName} = ${signature} =>`,
  ];

  for (const prefix of arrowPrefixes) {
    const start = source.indexOf(prefix);
    if (start === -1) {
      continue;
    }

    let cursor = start + prefix.length;
    while (cursor < source.length && /\s/.test(source[cursor] ?? "")) {
      cursor += 1;
    }

    if (source[cursor] === "{") {
      let depth = 0;
      let end = -1;
      for (let index = cursor; index < source.length; index += 1) {
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

      while (end + 1 < source.length && /\s/.test(source[end + 1] ?? "")) {
        end += 1;
      }
      if (source[end + 1] === ";") {
        end += 1;
      }
      return source.slice(start, end + 1);
    }

    const statementEnd = source.indexOf(";", cursor);
    if (statementEnd === -1) {
      throw new Error(`${functionName} statement end not found`);
    }
    return source.slice(start, statementEnd + 1);
  }

  throw new Error(`${functionName} definition not found`);
}

function normalizeVmValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

test("editor navigation helper delegates through the typed bootstrap facade", () => {
  const source = loadEditorSource();
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    _getEditorBootstrapFacade() {
      return {
        attemptDiagramNavigation(nextUrl: string, syncUi: () => void) {
          capturedCalls.push({
            nextUrl,
            hasSyncUi: typeof syncUi,
          });
          return true;
        },
      };
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

  assert.equal(loaded._attemptDiagramNavigation("/view/beta", () => {}), true);
  assert.deepEqual(normalizeVmValue(capturedCalls), [
    {
      nextUrl: "/view/beta",
      hasSyncUi: "function",
    },
  ]);
});

test("editor diagram-load helpers delegate through the typed bootstrap facade", async () => {
  const source = loadEditorSource();
  const capturedCalls: string[] = [];
  const context = {
    console,
    _getEditorBootstrapFacade() {
      return {
        signalDiagramLoaded() {
          capturedCalls.push("signal");
          return 7;
        },
        whenDiagramLoaded() {
          capturedCalls.push("when");
          return Promise.resolve(11);
        },
        syncBrowseNavToLocation() {
          capturedCalls.push("sync");
        },
      };
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "_signalDiagramLoaded", "()"),
    extractNamedFunctionSource(source, "whenDiagramLoaded", "()"),
    extractNamedFunctionSource(source, "_syncBrowseNavToLocation", "()"),
    "this.__loaded = { _signalDiagramLoaded, whenDiagramLoaded, _syncBrowseNavToLocation };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      _signalDiagramLoaded: () => number;
      whenDiagramLoaded: () => Promise<number>;
      _syncBrowseNavToLocation: () => void;
    };
  }).__loaded;

  assert.equal(loaded._signalDiagramLoaded(), 7);
  assert.equal(await loaded.whenDiagramLoaded(), 11);
  loaded._syncBrowseNavToLocation();
  assert.deepEqual(capturedCalls, ["signal", "when", "sync"]);
});

test("editor tree loader delegates through the typed bootstrap facade", async () => {
  const source = loadEditorSource();
  const capturedCalls: Array<Record<string, unknown> | null> = [];
  const context = {
    console,
    _getEditorBootstrapFacade() {
      return {
        async loadTree(canonicalState?: Record<string, unknown> | null) {
          capturedCalls.push(canonicalState ?? null);
          return "fetched";
        },
      };
    },
  };

  const helperSource = [
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
  assert.deepEqual(normalizeVmValue(capturedCalls), [
    { componentTree: [] },
  ]);
});

test("editor bootstrap-facade bootstrap accepts the namespaced previewShell.bootstrap contract", () => {
  const source = loadEditorSource();
  let capturedOptions: Record<string, unknown> | null = null;
  const previewBridgeHost = {
    initLayoutBridge() {
      return Promise.resolve();
    },
    setFrameTreeJson() {},
    getPreviewDocumentJson() {
      return { kind: "frame-diagram" };
    },
    getFrameTreeJson() {
      return { frames: [] };
    },
  };
  const previewBridgeRenderContract = {
    renderFreshPreviewSvg() {
      return Promise.resolve({ svg: { tagName: "svg" } });
    },
  };
  const stage = {
    id: "stage",
    innerHTML: "",
    replaceChildren() {},
  };
  const context = {
    console,
    SLUG: "demo",
    ACTIVE_LAYOUT_ENGINE: "v3",
    GRID: true,
    DIRTY_DIAGRAM_NAV_CONFIRM: "Leave?",
    _allowInternalDirtyNavigation: false,
    generation: 3,
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
        async json() {
          return [];
        },
      });
    },
    requestLayoutRelayout() {
      return Promise.resolve(true);
    },
    requestV3Relayout() {
      return Promise.resolve(true);
    },
    onDocumentKeyDown() {},
    _applyUndoCommand() {},
    initNavTabs() {},
    loadGridInfo() {
      return Promise.resolve();
    },
    deselectAll() {},
    resetOverrideState() {},
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
    fitSvgToRenderedContent() {},
    _isPreviewEngineShellLayoutActive() {
      return true;
    },
    _initPreviewEngineShellPanel() {},
    _getLocalBridgeRelayoutStatus() {
      return { ready: true };
    },
    _pruneLinkedRootGridOverrides() {},
    _getEditorSceneFacade() {
      return {
        getGridRuntime() {
          return {
            getGridInfo() {
              return { cols: 4 };
            },
          };
        },
      };
    },
    PreviewSaveClient: {
      isDirty() {
        return true;
      },
      saveOverrides() {},
      markSaved() {},
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
      setDiagramGrid() {},
      loadTree() {},
      loadArrows() {},
    },
    selectedIds: new Set(["alpha", "beta"]),
    constraints: {
      summarise() {
        return { errors: 0 };
      },
    },
    lastViolations: [],
    _coercedKeys: new Set(["coerced"]),
    setStatus() {},
    sanitizeSvgCloneForExport() {},
    replaceOverrides() {},
    setDirty() {},
    renderSelectionInspector() {},
    getLayoutRelayoutStatus() {
      return { localReady: true };
    },
    getV3RelayoutStatus() {
      return { localReady: true };
    },
    _getEditorRelayoutFacade() {
      return {
        layoutRuntimeState: { sequence: 1 },
      };
    },
    _getPreviewBridgeHostContract() {
      return previewBridgeHost;
    },
    _readPreviewDocumentJson() {
      return previewBridgeHost.getPreviewDocumentJson();
    },
    _readFrameTreeJson() {
      return previewBridgeHost.getFrameTreeJson();
    },
    window: {
      location: {
        pathname: "/view/v3:demo",
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
      __DG_getPreviewBridgeRenderContract() {
        return previewBridgeRenderContract;
      },
    },
    document: {
      getElementById(id: string) {
        return id === "stage" ? stage : { id };
      },
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
    },
    LayoutEngine: {
      previewShell: {
        bootstrap: {
          createPreviewEditorBootstrapFacadeFromRuntime(options: Record<string, unknown>) {
            capturedOptions = normalizeVmValue({
              slug: options.shared?.slug,
              hasReadPreviewDocument: typeof options.componentTree?.readPreviewDocument,
              hasFetchTree: typeof options.componentTree?.fetchTree,
              hasReadFrameTreeJson: typeof options.componentTree?.readFrameTreeJson,
              hasSyncArrowsInModel: typeof options.componentTree?.syncArrowsInModel,
              hasArrowComponentId: typeof options.componentTree?.arrowComponentId,
              stageId: (options.shared?.stage as { id?: string } | null)?.id ?? null,
              engine: options.shared?.engine,
              gridEnabled: options.shared?.gridEnabled,
              previewBridgeHostMatches: options.contracts?.previewBridgeHost === previewBridgeHost,
              hasLoadGridInfo: typeof options.svgLoad?.loadGridInfo,
              hasGridStateGet: typeof options.svgLoad?.gridState?.getGridInfo,
              selectedIds: Array.from(options.shared?.selectedIds as Set<string>),
              hasReapplySelection: typeof options.svgLoad?.selectionState?.reapplySelection,
              previewBridgeRenderMatches:
                options.contracts?.previewBridgeRender === previewBridgeRenderContract,
              isDirty: (options.navigation?.isDirty as () => boolean)(),
              dirtyConfirmMessage: options.navigation?.dirtyConfirmMessage,
              runtimeSelectedIds: Array.from(options.shared?.selectedIds as Set<string>),
              runtimeFrameTree: (options.shared?.getFrameTree as () => unknown)(),
              runtimeConstraintSummary:
                (options.runtimeBootstrap?.constraints as { summarise: (value: unknown) => unknown })
                  .summarise(options.runtimeBootstrap?.lastViolations),
              allowInternalDirtyNavigation:
                (options.runtimeBootstrap?.allowInternalDirtyNavigationState as { get: () => boolean }).get(),
              generation: (options.runtimeBootstrap?.generationState as { get: () => number }).get(),
              hasScheduleReconnect: typeof options.runtimeBootstrap?.scheduleReconnect,
            });
            return { kind: "facade" };
          },
        },
      },
    },
  };

  const helperSource = [
    "let _editorBootstrapFacade = null;",
    extractNamedFunctionSource(source, "_getEditorBootstrapFacade", "()"),
    "this.__loaded = { _getEditorBootstrapFacade };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      _getEditorBootstrapFacade: () => { kind: string };
    };
  }).__loaded;

  assert.deepEqual(normalizeVmValue(loaded._getEditorBootstrapFacade()), {
    kind: "facade",
  });
  assert.deepEqual(capturedOptions, {
    slug: "demo",
    hasReadPreviewDocument: "function",
    hasFetchTree: "function",
    hasReadFrameTreeJson: "function",
    hasSyncArrowsInModel: "object",
    hasArrowComponentId: "object",
    stageId: "stage",
    engine: "v3",
    gridEnabled: true,
    previewBridgeHostMatches: true,
    hasLoadGridInfo: "function",
    hasGridStateGet: "function",
    selectedIds: ["alpha", "beta"],
    hasReapplySelection: "function",
    previewBridgeRenderMatches: true,
    isDirty: true,
    dirtyConfirmMessage: "Leave?",
    runtimeSelectedIds: ["alpha", "beta"],
    runtimeFrameTree: { frames: [] },
    runtimeConstraintSummary: { errors: 0 },
    allowInternalDirtyNavigation: false,
    generation: 3,
    hasScheduleReconnect: "function",
  });
});

test("editor relayout-facade bootstrap accepts the namespaced previewBridge.relayout contract", () => {
  const source = loadEditorSource();
  let capturedOptions: Record<string, unknown> | null = null;
  const previewBridgeHost = {
    performLocalRelayout() {
      return { rerendered: true };
    },
  };
  const context = {
    console,
    overrides: { alpha: { dx: 8 } },
    _coercedKeys: new Set(["coerced"]),
    model: {
      gridOverrides: { rows: 2 },
    },
    EditorState: {
      normalizeGridOverrides<T>(value: T) {
        return value;
      },
      commitOverridePatchAction() {},
    },
    selectedIds: new Set(["alpha", "beta"]),
    _getPreviewBridgeHostContract() {
      return previewBridgeHost;
    },
    _getLocalBridgeRelayoutStatus() {
      return { ready: true };
    },
    _isPreviewEngineShellLayoutActive() {
      return true;
    },
    _hasLayoutRelayoutFrameOverride() {
      return false;
    },
    replaceOverrides() {},
    _pruneLinkedRootGridOverrides() {},
    _clearPendingRestoreRuntime() {},
    _rerenderStageFromModel() {
      return Promise.resolve(true);
    },
    _applyLocalRestoreRefresh() {},
    _getEditorSceneFacade() {
      return {
        getGridRuntime() {
          return {
            getGridInfo() {
              return { cols: 4 };
            },
          };
        },
      };
    },
    populateGridControls() {},
    PreviewSaveClient: {
      syncDirtyFromSerialized() {},
    },
    buildTreeUI() {},
    applyWaypointOverrides() {},
    bindInteraction() {},
    applyAllOverrides() {},
    reapplySelection() {},
    refreshLayoutGridInfoFromLayout() {},
    renderGridOverlay() {},
    renderSelectionInspector() {},
    updateOverrideSummary() {},
    refreshTreeColors() {},
    runConstraints() {},
    setStatus() {},
    setDirty() {},
    updateInspector() {},
    loadTree() {
      return Promise.resolve(true);
    },
    rebuildArrowSVG() {},
    getOwnDelta() {
      return { dx: 0, dy: 0, dw: 0, dh: 0 };
    },
    setOverride() {},
    requestAnimationFrame(callback: () => void) {
      callback();
      return 1;
    },
    cancelAnimationFrame() {},
    window: {
      __DG_getPreviewBridgeRelayoutContract() {
        return context.LayoutEngine.previewBridge.relayout;
      },
    },
    LayoutEngine: {
      previewBridge: {
        relayout: {
          createPreviewEditorRelayoutFacadeFromRuntime(options: Record<string, unknown>) {
            capturedOptions = normalizeVmValue({
              hasGetOverrides: typeof options.shared?.getOverrides,
              coercedKeys: Array.from(options.shared?.coercedKeys as Set<string>),
              modelMatches: options.shared?.model === context.model,
              hasNormalizeGridOverrides: typeof options.shared?.editorState?.normalizeGridOverrides,
              hasCommitOverridePatchAction: typeof options.shared?.editorState?.commitOverridePatchAction,
              previewBridgeHostMatches: options.shared?.previewBridgeHost === previewBridgeHost,
              selectedIds: Array.from(options.shared?.selectedIds as Set<string>),
              hasGetLocalRelayoutStatus: typeof options.runtime?.getLocalRelayoutStatus,
              engineLayoutActive: (options.runtime?.isEngineLayoutActive as () => boolean)(),
              hasRelayoutFrameOverride: typeof options.runtime?.hasRelayoutFrameOverride,
              hasReplaceOverrides: typeof options.runtime?.replaceOverrides,
              hasClearPendingRuntime: typeof options.runtime?.clearPendingRuntime,
              hasApplyLocalRefresh: typeof options.runtime?.applyLocalRefresh,
              hasSyncGridControls: typeof options.runtime?.syncGridControls,
              hasSyncDirtyFromSerialized: typeof options.runtime?.syncDirtyFromSerialized,
              hasBuildTreeUi: typeof options.runtime?.buildTreeUi,
              hasRefreshGridInfo: typeof options.runtime?.refreshGridInfo,
              hasRunConstraints: typeof options.runtime?.runConstraints,
              hasRequestAnimationFrame: typeof options.runtime?.requestAnimationFrameFn,
              hasCancelAnimationFrame: typeof options.runtime?.cancelAnimationFrameFn,
              minSize: options.runtime?.minSize,
            });
            return { kind: "relayout-facade" };
          },
        },
      },
    },
  };

  const helperSource = [
    "let _editorRelayoutFacade = null;",
    extractNamedFunctionSource(source, "_getEditorRelayoutFacade", "()"),
    "this.__loaded = { _getEditorRelayoutFacade };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      _getEditorRelayoutFacade: () => { kind: string };
    };
  }).__loaded;

  assert.deepEqual(normalizeVmValue(loaded._getEditorRelayoutFacade()), {
    kind: "relayout-facade",
  });
  assert.deepEqual(capturedOptions, {
    hasGetOverrides: "function",
    coercedKeys: ["coerced"],
    modelMatches: true,
    hasNormalizeGridOverrides: "function",
    hasCommitOverridePatchAction: "function",
    previewBridgeHostMatches: true,
    selectedIds: ["alpha", "beta"],
    hasGetLocalRelayoutStatus: "function",
    engineLayoutActive: true,
    hasRelayoutFrameOverride: "function",
    hasReplaceOverrides: "function",
    hasClearPendingRuntime: "function",
    hasApplyLocalRefresh: "function",
    hasSyncGridControls: "function",
    hasSyncDirtyFromSerialized: "function",
    hasBuildTreeUi: "function",
    hasRefreshGridInfo: "function",
    hasRunConstraints: "function",
    hasRequestAnimationFrame: "function",
    hasCancelAnimationFrame: "function",
    minSize: 8,
  });
});

test("editor grid loader accepts the namespaced previewShell.scene contract", async () => {
  const source = loadEditorSource();
  const capturedCalls: Array<Record<string, unknown> | null | undefined> = [];
  const context = {
    console,
    _getEditorSceneFacade() {
      return {
        async loadGridInfo(canonicalState?: Record<string, unknown> | null) {
          capturedCalls.push(canonicalState);
          return {
            gridInfo: { cols: 8 },
            baseGridInfo: { cols: 8 },
          };
        },
      };
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

test("editor svg loader delegates through the typed bootstrap facade", async () => {
  const source = loadEditorSource();
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    _getEditorBootstrapFacade() {
      return {
        async loadSvg(options?: Record<string, unknown>) {
          capturedCalls.push({
            options,
          });
        },
      };
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
  assert.deepEqual(normalizeVmValue(capturedCalls), [
    {
      options: { preserveSelectionIds: ["alpha"] },
    },
  ]);
});

test("editor relayout runtime wrapper delegates through the typed relayout facade", () => {
  const source = loadEditorSource();
  let runtimeRequests = 0;
  const context = {
    console,
    _relayoutRuntime: null,
    _getEditorRelayoutFacade() {
      return {
        getRelayoutRuntime() {
          runtimeRequests += 1;
          return { kind: "runtime" };
        },
      };
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
  assert.equal(runtimeRequests, 1);
});

test("editor bootstrap tail delegates through the typed bootstrap facade", () => {
  const source = loadEditorSource();
  let bootstrapCalls = 0;
  const context = {
    console,
    _getEditorBootstrapFacade() {
      return {
        bootstrapEditorRuntime() {
          bootstrapCalls += 1;
        },
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
  assert.equal(bootstrapCalls, 1);
});

