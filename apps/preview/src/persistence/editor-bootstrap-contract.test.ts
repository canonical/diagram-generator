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

  const assignmentPrefixes = [
    `const ${functionName} =`,
    `let ${functionName} =`,
    `var ${functionName} =`,
  ];
  for (const prefix of assignmentPrefixes) {
    const start = source.indexOf(prefix);
    if (start === -1) continue;
    const statementEnd = source.indexOf(";", start + prefix.length);
    if (statementEnd === -1) {
      throw new Error(`${functionName} assignment statement end not found`);
    }
    return source.slice(start, statementEnd + 1);
  }

  const destructurePrefixes = [
    "const {",
    "let {",
    "var {",
  ];

  for (const prefix of destructurePrefixes) {
    let searchIndex = 0;
    while (true) {
      const start = source.indexOf(prefix, searchIndex);
      if (start === -1) {
        break;
      }

      const bodyStart = source.indexOf("{", start);
      if (bodyStart === -1) {
        break;
      }

      let depth = 0;
      let bodyEnd = -1;
      for (let index = bodyStart; index < source.length; index += 1) {
        const char = source[index];
        if (char === "{") depth += 1;
        else if (char === "}") {
          depth -= 1;
          if (depth === 0) {
            bodyEnd = index;
            break;
          }
        }
      }

      if (bodyEnd === -1) {
        throw new Error(`${functionName} destructured body end not found`);
      }

      const statementEnd = source.indexOf(";", bodyEnd);
      if (statementEnd === -1) {
        throw new Error(`${functionName} destructured statement end not found`);
      }

      const statement = source.slice(start, statementEnd + 1);
      const aliasPattern = new RegExp(
        String.raw`(?:^|[,{])\s*(?:[A-Za-z_$][\w$]*\s*:\s*)?${functionName}(?:\s*[=,}])`,
        "m",
      );
      if (aliasPattern.test(statement)) {
        throw new Error(`${functionName} is still read from the deleted preview grid editor facade`);
      }

      searchIndex = statementEnd + 1;
    }
  }

  throw new Error(`${functionName} definition not found`);
}

function normalizeVmValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function attachPreviewCompat<T extends Record<string, any>>(context: T): T {
  const existingGetEditorBootstrapFacade = context._getEditorBootstrapFacade;
  const existingGetEditorSceneFacade = context._getEditorSceneFacade;
  const existingGetEditorInteractionFacade = context._getEditorInteractionFacade;
  const existingGetStageBindingRuntime = context._getStageBindingRuntime;
  const existingGetPointerInteractionRuntime = context._getPointerInteractionRuntime;
  const existingGetSelectionChromeRuntime = context._getSelectionChromeRuntime;
  const existingGetSelectionRuntime = context._getSelectionRuntime;
  const existingGetInspectorDisplayRuntime = context._getInspectorDisplayRuntime;
  const existingGetInspectorMutationRuntime = context._getInspectorMutationRuntime;
  const existingGetInspectorSelectionRuntime = context._getInspectorSelectionRuntime;
  const existingGetArrowWaypointRuntime = context._getArrowWaypointRuntime;
  const existingGetTextEditRuntime = context._getTextEditRuntime;
  const existingGetResizeInteractionRuntime = context._getResizeInteractionRuntime;
  const existingGetEditorRelayoutFacade = context._getEditorRelayoutFacade;
  const existingGetRelayoutRuntime = context._getRelayoutRuntime;
  const existingGetKeyboardRuntime = context._getKeyboardRuntime;
  const readRuntimeParts = () => {
    const bootstrap = typeof existingGetEditorBootstrapFacade === "function"
      ? existingGetEditorBootstrapFacade()
      : {};
    const scene = typeof existingGetEditorSceneFacade === "function"
      ? existingGetEditorSceneFacade()
      : {};
    const interaction = typeof existingGetEditorInteractionFacade === "function"
      ? existingGetEditorInteractionFacade()
      : {};
    const stageBinding = typeof existingGetStageBindingRuntime === "function"
      ? existingGetStageBindingRuntime()
      : interaction.getStageBindingRuntime?.() ?? {};
    const pointer = typeof existingGetPointerInteractionRuntime === "function"
      ? existingGetPointerInteractionRuntime()
      : interaction.getPointerInteractionRuntime?.() ?? {};
    const selectionChrome = typeof existingGetSelectionChromeRuntime === "function"
      ? existingGetSelectionChromeRuntime()
      : interaction.getSelectionChromeRuntime?.() ?? {};
    const selection = typeof existingGetSelectionRuntime === "function"
      ? existingGetSelectionRuntime()
      : interaction.getSelectionRuntime?.() ?? {};
    const inspectorDisplay = typeof existingGetInspectorDisplayRuntime === "function"
      ? existingGetInspectorDisplayRuntime()
      : interaction.getInspectorDisplayRuntime?.() ?? {};
    const inspectorMutation = typeof existingGetInspectorMutationRuntime === "function"
      ? existingGetInspectorMutationRuntime()
      : interaction.getInspectorMutationRuntime?.() ?? {};
    const inspectorSelection = typeof existingGetInspectorSelectionRuntime === "function"
      ? existingGetInspectorSelectionRuntime()
      : interaction.getInspectorSelectionRuntime?.() ?? {};
    const arrowWaypoint = typeof existingGetArrowWaypointRuntime === "function"
      ? existingGetArrowWaypointRuntime()
      : interaction.getArrowWaypointRuntime?.() ?? {};
    const textEdit = typeof existingGetTextEditRuntime === "function"
      ? existingGetTextEditRuntime()
      : interaction.getTextEditRuntime?.() ?? {};
    const resize = typeof existingGetResizeInteractionRuntime === "function"
      ? existingGetResizeInteractionRuntime()
      : interaction.getResizeInteractionRuntime?.() ?? {};
    const relayoutFacade = typeof existingGetEditorRelayoutFacade === "function"
      ? existingGetEditorRelayoutFacade()
      : {};
    const relayoutRuntime = typeof existingGetRelayoutRuntime === "function"
      ? existingGetRelayoutRuntime()
      : relayoutFacade.getRelayoutRuntime?.() ?? {};
    const keyboard = typeof existingGetKeyboardRuntime === "function"
      ? existingGetKeyboardRuntime()
      : interaction.getKeyboardRuntime?.() ?? {};
    return { bootstrap, scene, interaction, stageBinding, pointer, selectionChrome, selection, inspectorDisplay, inspectorMutation, inspectorSelection, arrowWaypoint, textEdit, resize, keyboard, relayoutFacade, relayoutRuntime };
  };
  context._getEditorBootstrapFacade ??= () => readRuntimeParts().bootstrap;
  context._getEditorSceneFacade ??= () => readRuntimeParts().scene;
  context._getEditorRelayoutFacade ??= () => readRuntimeParts().relayoutFacade;
  context._getEditorInteractionFacade ??= () => readRuntimeParts().interaction;
  context._getStageBindingRuntime ??= () => readRuntimeParts().stageBinding;
  context._getPointerInteractionRuntime ??= () => readRuntimeParts().pointer;
  context._getSelectionChromeRuntime ??= () => readRuntimeParts().selectionChrome;
  context._getSelectionRuntime ??= () => readRuntimeParts().selection;
  context._getInspectorDisplayRuntime ??= () => readRuntimeParts().inspectorDisplay;
  context._getInspectorMutationRuntime ??= () => readRuntimeParts().inspectorMutation;
  context._getInspectorSelectionRuntime ??= () => readRuntimeParts().inspectorSelection;
  context._getArrowWaypointRuntime ??= () => readRuntimeParts().arrowWaypoint;
  context._getTextEditRuntime ??= () => readRuntimeParts().textEdit;
  context._getResizeInteractionRuntime ??= () => readRuntimeParts().resize;
  context._getKeyboardRuntime ??= () => readRuntimeParts().keyboard;
  context._getRelayoutRuntime ??= () => readRuntimeParts().relayoutRuntime;
  return context;
}

function createPreviewGridEditorRuntimeContext(options?: {
  bootstrapFacade?: unknown;
  interactionFacade?: unknown;
  relayoutFacade?: unknown;
  sceneFacade?: unknown;
}) {
  let capturedLegacyOptions: Record<string, unknown> | null = null;
  const runtime = {
    invalidateOverrideBoundFacades() {},
    getBootstrapFacade() {
      return options?.bootstrapFacade ?? { kind: "bootstrap-facade" };
    },
    getInteractionFacade() {
      return options?.interactionFacade ?? { kind: "interaction-facade" };
    },
    getRelayoutFacade() {
      return options?.relayoutFacade ?? { kind: "relayout-facade" };
    },
    getSceneFacade() {
      return options?.sceneFacade ?? { kind: "scene-facade" };
    },
  };

  const context = {
    console,
    SLUG: "demo",
    ACTIVE_LAYOUT_ENGINE: "v3",
    GRID: true,
    FALLBACK_GAP: 24,
    GUIDE_MODES: ["off", "all"],
    GUIDE_COLOR: "#f00",
    GUIDE_OPACITY: "0.5",
    BASELINE_STEP: 24,
    selectionDepth: 2,
    generation: 3,
    _allowInternalDirtyNavigation: false,
    lastViolations: [],
    overrides: { alpha: { width: 120 } },
    _coercedKeys: new Set(["coerced"]),
    selectedIds: new Set(["alpha", "beta"]),
    multiActionGap: 24,
    BOX_STYLES: { default: {} },
    INSET: 8,
    SHARED_HANDLE_SIZE: 12,
    SHARED_MIN_NODE_SIZE: 24,
    InteractionMode: {
      TEXT_EDITING: "text_editing",
      WAYPOINT_DRAGGING: "waypoint_dragging",
    },
    model: {
      _roots: [],
      roots: [{ id: "root" }],
      overrides: { alpha: { width: 120 } },
      gridOverrides: { rows: 2 },
      removedIds: new Set<string>(),
      setDiagramGrid() {},
      clearOverride() {},
      get() {
        return { data: { id: "alpha" } };
      },
    },
    mgr: {
      state: { cid: "alpha" },
      isMode() {
        return false;
      },
    },
    EditorState: {
      captureOverrideEntries() {
        return {};
      },
      beginUndoableAction() {
        return {};
      },
      commitUndoableAction() {},
      runUndoableAction(_label: string, mutate: () => unknown) {
        return mutate();
      },
      clearUndoHistory() {},
      serializeDirtyState() {
        return "{}";
      },
      normalizeGridOverrides<T>(value: T) {
        return value;
      },
      commitOverridePatchAction() {},
      undo() {
        return Promise.resolve();
      },
      redo() {
        return Promise.resolve();
      },
    },
    PreviewSaveClient: {
      isDirty() {
        return true;
      },
      trySaveIfDirty() {},
      syncSaveButton() {},
      syncDirtyFromSerialized() {},
      markSaved() {},
    },
    constraints: {
      validate() {
        return [];
      },
      summarise() {
        return { errors: 0 };
      },
    },
    replaceOverrides() {},
    _pruneLinkedRootGridOverrides() {},
    _clearPendingRestoreRuntime() {},
    _applyLocalRestoreRefresh() {},
    buildTreeUI() {},
    bindInteraction() {},
    deselectAll() {},
    reapplySelection() {},
    renderEmptyInspector() {},
    renderSelectionInspector() {},
    renderMultiSelectionInspector() {},
    selectComponent() {},
    _applySelectionStateSnapshot() {},
    getPrimarySelectedId() {
      return "alpha";
    },
    async deleteSelectedFrames() {
      return true;
    },
    getOwnDelta() {
      return { dx: 0, dy: 0, dw: 0, dh: 0 };
    },
    getEffectiveDelta() {
      return { dx: 0, dy: 0, dw: 0, dh: 0 };
    },
    getAncestors() {
      return ["root"];
    },
    getParentNode() {
      return { layout: "horizontal" };
    },
    getComponentNode() {
      return null;
    },
    getComponentType() {
      return "box";
    },
    getArrowNode() {
      return { waypoints: [] };
    },
    collectPeerSnapTargets() {
      return [];
    },
    collectGridSnapTargets() {
      return { xs: [24], ys: [48] };
    },
    snapRectToTargets() {
      return { dx: 0, dy: 0 };
    },
    clearGuideLines() {},
    renderGuideLines() {},
    clearHandlesByClass() {},
    renderResizeHandles() {},
    setOverride() {},
    _readRenderedStyleFields() {
      return { fill: "#fff" };
    },
    _applyInteractionOverrideEntries() {},
    cleanOverride() {},
    setWaypointOverride() {},
    setFrameProp() {},
    _scheduleLayoutResizeRelayout() {
      return false;
    },
    _cancelLayoutResizeRelayout() {},
    _persistResizeToLayout() {},
    cycleGuideMode() {},
    requestLayoutRelayout() {
      return Promise.resolve(true);
    },
    snapToGrid(value: number) {
      return value;
    },
    _hasLayoutChildren() {
      return false;
    },
    _scheduleLayoutRelayout() {},
    renderBoxStyleOptions() {
      return "<option>default</option>";
    },
    _formatAsDefinedStyleLabel() {
      return "Defined";
    },
    _normaliseStyleName(value: string) {
      return value;
    },
    getInspectorElement() {
      return { id: "inspector" };
    },
    initNavTabs() {},
    setDirty() {},
    sanitizeSvgCloneForExport() {},
    getViolationsForComponent() {
      return [];
    },
    alert() {},
    requestAnimationFrame(callback: () => void) {
      callback();
      return 1;
    },
    cancelAnimationFrame() {},
    navigator: {
      clipboard: {
        writeText() {
          return Promise.resolve();
        },
      },
    },
    document: {
      getElementById() {
        return { id: "stage" };
      },
    },
    window: {
      __DG_CONFIG: {
        icon_size: 48,
        col_gap: 24,
        head_len: 10,
        head_half: 5,
      },
      getLayoutTextAdapter() {
        return { name: "adapter" };
      },
      __DG_getPreviewShellBootstrapContract() {
        return {
          createPreviewGridEditorInstallUnitFromLegacyEditorHost(
            nextOptions: Record<string, unknown>,
          ) {
            capturedLegacyOptions = nextOptions;
            return {
              getRuntime() {
                return runtime;
              },
              getBrowserState() {
                return { kind: "browser-state" };
              },
            };
          },
        };
      },
    },
  };

  return {
    context,
    runtime,
    getCapturedOptions() {
      return capturedLegacyOptions;
    },
  };
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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

test("editor bootstrap facade delegates through the typed preview-grid runtime", () => {
  const source = loadEditorSource();
  const facade = { kind: "facade" };
  const harness = createPreviewGridEditorRuntimeContext({
    bootstrapFacade: facade,
  });

  const helperSource = [
    "let _previewGridEditorInstallUnit = null;",
    "let _previewGridEditorRuntime = null;",
    extractNamedFunctionSource(source, "_createPreviewGridEditorInstallUnit", "()"),
    extractNamedFunctionSource(source, "_getPreviewGridEditorInstallUnit", "()"),
    extractNamedFunctionSource(source, "_getPreviewGridEditorRuntime", "()"),
    extractNamedFunctionSource(source, "_getEditorBootstrapFacade", "()"),
    "this.__loaded = { _getEditorBootstrapFacade };",
  ].join("\n");

  vm.runInNewContext(helperSource, attachPreviewCompat(harness.context));
  const loaded = (harness.context as {
    __loaded: {
      _getEditorBootstrapFacade: () => { kind: string };
    };
  }).__loaded;

  assert.deepEqual(normalizeVmValue(loaded._getEditorBootstrapFacade()), {
    kind: "facade",
  });

  const capturedOptions = harness.getCapturedOptions();
  const config = capturedOptions?.config as Record<string, unknown> | undefined;
  const state = capturedOptions?.state as Record<string, unknown> | undefined;
  const helpers = capturedOptions?.helpers as Record<string, unknown> | undefined;
  const modelOps = capturedOptions?.modelOps as Record<string, unknown> | undefined;
  const facades = capturedOptions?.facades as Record<string, unknown> | undefined;
  assert.deepEqual(normalizeVmValue({
    slug: config?.slug,
    engine: config?.engine,
    gridEnabled: config?.gridEnabled,
    guideModes: Array.from(config?.guideModes as Iterable<string>),
    selectedIds: Array.from(state?.selectedIds as Iterable<string>),
    coercedKeys: Array.from(state?.coercedKeys as Iterable<string>),
    hasInteractionManager: typeof state?.interactionManager,
    hasEditorUndo: typeof (
      state?.editorState as { undo?: (...args: unknown[]) => unknown } | undefined
    )?.undo,
    hasPreviewSave: typeof (
      state?.previewSaveClient as { trySaveIfDirty?: (...args: unknown[]) => unknown } | undefined
    )?.trySaveIfDirty,
    hasConstraintsValidate: typeof (
      state?.constraints as { validate?: (...args: unknown[]) => unknown } | undefined
    )?.validate,
    hasGetOwnDelta: typeof modelOps?.getOwnDelta,
    hasGetEditorInteractionFacade: typeof facades?.getEditorInteractionFacade,
    hasGetEditorSceneFacade: typeof facades?.getEditorSceneFacade,
    hasGetEditorRelayoutFacade: typeof facades?.getEditorRelayoutFacade,
    hasApplyInteractionOverrideEntries: typeof helpers?.applyInteractionOverrideEntries,
    fallbackGap: config?.fallbackGap,
  }), {
    slug: "demo",
    engine: "v3",
    gridEnabled: true,
    guideModes: ["off", "all"],
    selectedIds: ["alpha", "beta"],
    coercedKeys: ["coerced"],
    hasInteractionManager: "object",
    hasEditorUndo: "function",
    hasPreviewSave: "function",
    hasConstraintsValidate: "function",
    hasGetOwnDelta: "function",
    hasGetEditorInteractionFacade: "function",
    hasGetEditorSceneFacade: "function",
    hasGetEditorRelayoutFacade: "function",
    hasApplyInteractionOverrideEntries: "function",
    fallbackGap: 24,
  });
});

test("editor relayout facade delegates through the typed preview-grid runtime", () => {
  const source = loadEditorSource();
  const facade = { kind: "relayout-facade" };
  const harness = createPreviewGridEditorRuntimeContext({
    relayoutFacade: facade,
  });

  const helperSource = [
    "let _previewGridEditorInstallUnit = null;",
    "let _previewGridEditorRuntime = null;",
    extractNamedFunctionSource(source, "_createPreviewGridEditorInstallUnit", "()"),
    extractNamedFunctionSource(source, "_getPreviewGridEditorInstallUnit", "()"),
    extractNamedFunctionSource(source, "_getPreviewGridEditorRuntime", "()"),
    extractNamedFunctionSource(source, "_getEditorRelayoutFacade", "()"),
    "this.__loaded = { _getEditorRelayoutFacade };",
  ].join("\n");

  vm.runInNewContext(helperSource, attachPreviewCompat(harness.context));
  const loaded = (harness.context as {
    __loaded: {
      _getEditorRelayoutFacade: () => { kind: string };
    };
  }).__loaded;

  assert.deepEqual(normalizeVmValue(loaded._getEditorRelayoutFacade()), {
    kind: "relayout-facade",
  });

  const capturedOptions = harness.getCapturedOptions();
  const config = capturedOptions?.config as Record<string, unknown> | undefined;
  const state = capturedOptions?.state as Record<string, unknown> | undefined;
  const facades = capturedOptions?.facades as Record<string, unknown> | undefined;
  assert.deepEqual(normalizeVmValue({
    coercedKeys: Array.from(state?.coercedKeys as Iterable<string>),
    hasNormalizeGridOverrides: typeof (
      state?.editorState as { normalizeGridOverrides?: (...args: unknown[]) => unknown } | undefined
    )?.normalizeGridOverrides,
    hasCommitOverridePatchAction: typeof (
      state?.editorState as { commitOverridePatchAction?: (...args: unknown[]) => unknown } | undefined
    )?.commitOverridePatchAction,
    selectedIds: Array.from(state?.selectedIds as Iterable<string>),
    hasModelGet: typeof (
      state?.model as { get?: (...args: unknown[]) => unknown } | undefined
    )?.get,
    hasModelClearOverride: typeof (
      state?.model as { clearOverride?: (...args: unknown[]) => unknown } | undefined
    )?.clearOverride,
    hasPreviewSaveSync: typeof (
      state?.previewSaveClient as { syncSaveButton?: (...args: unknown[]) => unknown } | undefined
    )?.syncSaveButton,
    hasGetEditorSceneFacade: typeof facades?.getEditorSceneFacade,
    hasGetEditorRelayoutFacade: typeof facades?.getEditorRelayoutFacade,
    hasSnapToGrid: typeof config?.snapToGrid,
    handleSize: config?.handleSize,
    guideColor: config?.guideColor,
  }), {
    coercedKeys: ["coerced"],
    hasNormalizeGridOverrides: "function",
    hasCommitOverridePatchAction: "function",
    selectedIds: ["alpha", "beta"],
    hasModelGet: "function",
    hasModelClearOverride: "function",
    hasPreviewSaveSync: "function",
    hasGetEditorSceneFacade: "function",
    hasGetEditorRelayoutFacade: "function",
    hasSnapToGrid: "function",
    handleSize: 12,
    guideColor: "#f00",
  });
});

test("editor initializes coerced-key state before eager scene bootstrap", () => {
  const source = loadEditorSource();
  const coercedKeysIndex = source.indexOf("const _coercedKeys = new Set();");
  const bindGridControlsIndex = source.indexOf("bindGridControls();");

  assert.notEqual(coercedKeysIndex, -1);
  assert.notEqual(bindGridControlsIndex, -1);
  assert.ok(
    coercedKeysIndex < bindGridControlsIndex,
    "_coercedKeys must be initialized before eager scene bootstrap",
  );
});

test("editor defers eager scene bootstrap until resize persistence helpers exist", () => {
  const source = loadEditorSource();
  const persistResizeIndex = source.indexOf("const _persistResizeToLayout");
  const bindGridControlsIndex = source.indexOf("bindGridControls();");

  assert.notEqual(persistResizeIndex, -1);
  assert.notEqual(bindGridControlsIndex, -1);
  assert.ok(
    persistResizeIndex < bindGridControlsIndex,
    "grid-control bootstrap must run after resize persistence helpers initialize",
  );
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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
  const loaded = (context as {
    __loaded: {
      bootstrapPreviewEditor: () => void;
    };
  }).__loaded;

  loaded.bootstrapPreviewEditor();
  assert.equal(bootstrapCalls, 1);
});

