import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

function repoRoot(): string {
  return path.resolve(process.cwd(), "..", "..");
}

function readPreviewScript(fileName: string): string {
  return fs.readFileSync(path.join(repoRoot(), "scripts", "preview", fileName), "utf8");
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

function createPreviewGridEditorRuntimeContext(options?: {
  interactionFacade?: unknown;
  sceneFacade?: unknown;
}) {
  let capturedOptions: Record<string, unknown> | null = null;
  const runtime = {
    invalidateOverrideBoundFacades() {},
    getBootstrapFacade() {
      return { kind: "bootstrap-facade" };
    },
    getInteractionFacade() {
      return options?.interactionFacade ?? { kind: "interaction-facade" };
    },
    getRelayoutFacade() {
      return { kind: "relayout-facade" };
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
    GUIDE_MODES: ["off", "all"],
    BASELINE_STEP: 24,
    selectionDepth: 3,
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
      DRAGGING: "dragging",
      RESIZING: "resizing",
      WAYPOINT_DRAGGING: "waypoint_dragging",
    },
    model: {
      _roots: [{ data: { id: "alpha" }, id: "alpha", type: "box", gridRow: 1 }],
      roots: [{ id: "page-root" }],
      gridOverrides: { cols: 8 },
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
      cloneValue<T>(value: T) {
        return value;
      },
      captureOverrideEntries() {
        return {};
      },
      commitOverridePatchAction() {},
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
      undo() {
        return Promise.resolve();
      },
      redo() {
        return Promise.resolve();
      },
    },
    PreviewSaveClient: {
      isDirty() {
        return false;
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
    _scheduleV3ResizeRelayout() {
      return false;
    },
    _cancelLayoutResizeRelayout() {},
    _persistResizeToLayout() {},
    cycleGuideMode() {},
    requestLayoutRelayout() {
      return Promise.resolve(true);
    },
    requestV3Relayout() {
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
      return { id: "inspector", innerHTML: "" };
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
          createPreviewGridEditorInstallUnitFromEditorHost(nextOptions: Record<string, unknown>) {
            capturedOptions = nextOptions;
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
      return capturedOptions;
    },
  };
}

test("elk-layout-controls renders from the namespaced previewEngines contract", () => {
  const section = {
    hidden: true,
    hasAttribute(name: string) {
      return name === "hidden" ? this.hidden : false;
    },
    querySelector() {
      return null;
    },
  };
  const container = {
    innerHTML: "%ELK_LAYOUT_CONTROLS_HTML%",
    textContent: "",
    querySelector(selector: string) {
      if (selector === "[data-elk-key]") return null;
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };

  const context = {
    window: {
      __DG_CONFIG: {},
    },
    document: {
      getElementById(id: string) {
        if (id === "elk-layout-section") return section;
        if (id === "elk-layout-controls") return container;
        return null;
      },
    },
    console,
    setTimeout,
    clearTimeout,
    LayoutEngine: {
      previewEngines: {
        registry: {
          resolvePreviewEngine({ layoutEngine }: { layoutEngine?: string | null }) {
            return layoutEngine === "elk-layered"
              ? { id: "synthetic-layered", hostView: { sidebarSections: ["elk-layout"] } }
              : null;
          },
          listPreviewEnginesBySidebarSection(section: string) {
            if (section !== "elk-layout") return [];
            return [
              {
                id: "synthetic-layered",
                hostView: { sidebarSections: ["elk-layout"] },
                controlSpecs: [
                  {
                    key: "elk.spacing.nodeNode",
                    label: "Node spacing",
                    group: "Spacing",
                    kind: "number",
                    defaultValue: "24",
                    step: 8,
                  },
                ],
              },
            ];
          },
        },
        elk: {
          createPreviewElkLayoutControlsRuntime(options: {
            document: { getElementById: (id: string) => unknown };
          }) {
            return {
              buildPanel() {
                const runtimeSection = options.document.getElementById("elk-layout-section") as {
                  hidden?: boolean;
                } | null;
                const runtimeContainer = options.document.getElementById("elk-layout-controls") as {
                  innerHTML?: string;
                } | null;
                if (runtimeSection) runtimeSection.hidden = false;
                if (runtimeContainer) runtimeContainer.innerHTML = "<label>Node spacing</label>";
              },
              refresh() {},
              collectOverrides() {
                return {};
              },
              init() {},
            };
          },
          elkParamGroups() {
            return [
              {
                group: "Spacing",
                specs: [
                  {
                    key: "elk.spacing.nodeNode",
                    label: "Node spacing",
                    group: "Spacing",
                    kind: "number",
                    defaultValue: "24",
                    step: 8,
                  },
                ],
              },
            ];
          },
        },
      },
    },
  };

  vm.runInNewContext(readPreviewScript("elk-layout-controls.js"), context);
  const previewEngineLayoutControls = (
    context.window as {
      PreviewEngineLayoutControls: { buildPanel: (frameTreeJson: unknown) => void };
    }
  ).PreviewEngineLayoutControls;
  const elkLayoutControls = (context.window as { ElkLayoutControls: { buildPanel: (frameTreeJson: unknown) => void } }).ElkLayoutControls;

  previewEngineLayoutControls.buildPanel({ layoutEngine: "elk-layered", elkLayout: {} });

  assert.equal(section.hidden, false);
  assert.match(container.innerHTML, /Node spacing/);
  assert.equal(previewEngineLayoutControls, elkLayoutControls);
});

test("elk-controller resolves ELK diagrams from the namespaced previewEngines registry", () => {
  const context = {
    window: {
      __DG_CONFIG: {},
    },
    document: {
      getElementById() {
        return { hasAttribute: () => true };
      },
    },
    console,
    LayoutEngine: {
      previewEngines: {
        registry: {
          resolvePreviewEngine({ layoutEngine }: { layoutEngine?: string | null }) {
            return layoutEngine === "elk-layered"
              ? { id: "synthetic-layered", hostView: { sidebarSections: ["elk-layout"] } }
              : null;
          },
        },
        elk: {
          createPreviewElkShellControllerRuntime() {
            return {
              init() {},
              isElkLayeredDiagram(frameTreeJson: unknown) {
                const layoutEngine = (frameTreeJson as { layoutEngine?: string | null })?.layoutEngine;
                return layoutEngine === "elk-layered";
              },
              isActiveLayoutEngine(frameTreeJson: unknown) {
                const layoutEngine = (frameTreeJson as { layoutEngine?: string | null })?.layoutEngine;
                return layoutEngine === "elk-layered";
              },
              wirePanel() {},
              syncPanel() {},
              initPanel() {},
              initializePanel() {},
              getLayoutOverrides() {
                return {};
              },
              applyLayoutOverrides() {},
              applyElkLayoutOverrides() {},
              collectPersistedPayload() {
                return {};
              },
              requestRelayout() {},
            };
          },
        },
      },
    },
  };

  vm.runInNewContext(readPreviewScript("elk-controller.js"), context);
  const elkPreviewController = (context.window as { ElkPreviewController: { isElkLayeredDiagram: (frameTreeJson: unknown) => boolean } }).ElkPreviewController;
  const previewEngineShellController = (
    context.window as {
      PreviewEngineShellController: {
        init: (deps: Record<string, unknown>) => void;
        isActiveLayoutEngine: (frameTreeJson: unknown) => boolean;
        requestRelayout: () => unknown;
      };
    }
  ).PreviewEngineShellController;

  previewEngineShellController.init({});
  const requestPreviewEngineRelayout = (
    context.window as { requestPreviewEngineRelayout: () => unknown }
  ).requestPreviewEngineRelayout;

  assert.equal(elkPreviewController.isElkLayeredDiagram({ layoutEngine: "elk-layered" }), true);
  assert.equal(previewEngineShellController.isActiveLayoutEngine({ layoutEngine: "elk-layered" }), true);
  assert.equal(requestPreviewEngineRelayout, previewEngineShellController.requestRelayout);
});

test("save-client resolves the namespaced previewShell.bootstrap runtime", () => {
  let resolvedFromNamespace = false;
  const previewSaveClient = { saveOverrides() {}, trySaveIfDirty() {} };
  const context = {
    window: {
      __DG_CONFIG: {},
    },
    document: {
      body: { appendChild() {} },
      activeElement: null,
      createElement() {
        return {
          click() {},
          remove() {},
        };
      },
      getElementById() {
        return null;
      },
      querySelector() {
        return null;
      },
    },
    fetch() {
      throw new Error("fetch should not be invoked in wrapper contract test");
    },
    alert() {},
    Blob: function Blob() {},
    URL: {
      createObjectURL() {
        return "blob:test";
      },
      revokeObjectURL() {},
    },
    XMLSerializer: class {
      serializeToString() {
        return "<svg />";
      }
    },
    console,
    LayoutEngine: {
      previewShell: {
        bootstrap: {
          createPreviewSaveClientRuntime() {
            resolvedFromNamespace = true;
            return previewSaveClient;
          },
        },
      },
      createPreviewSaveClientRuntime() {
        throw new Error("wrapper should prefer previewShell.bootstrap");
      },
    },
  };

  vm.runInNewContext(readPreviewScript("save-client.js"), context);

  assert.equal(resolvedFromNamespace, true);
  assert.equal((context.window as { PreviewSaveClient?: unknown }).PreviewSaveClient, previewSaveClient);
});

test("force preview helpers accept the namespaced previewEngines.force contract", () => {
  const source = readPreviewScript("force.js");
  const context = {
    window: {
      LayoutEngine: {
        previewEngines: {
          registry: {
            getPreviewEngine(id: string) {
              if (id !== "force") return null;
              return {
                id,
                apiRoutes: {
                  spec: "/api/force-spec/{slug}",
                },
              };
            },
          },
          force: {
            createInitialForceSnapshot(authoredSpec: Record<string, unknown>) {
              return { bootstrapped: authoredSpec };
            },
            updateForceSimulationParams() {},
          },
        },
      },
    },
    console,
  };

  const helperSource = [
    'const FORCE_RUNTIME_BUILD_HINT = "Layout engine bundle is required for force preview. Run `npm --prefix packages/layout-engine run build:browser`.";',
    extractNamedFunctionSource(source, "forceRuntimeContract", "()"),
    extractNamedFunctionSource(source, "forcePreviewEngine", "()"),
    extractNamedFunctionSource(source, "requireForceRuntimeMethod", "(methodName)"),
    extractNamedFunctionSource(source, "snapshotFromCanonicalState", "(canonicalState)"),
    "this.__loaded = { forcePreviewEngine, requireForceRuntimeMethod, snapshotFromCanonicalState };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      forcePreviewEngine: () => { id: string; apiRoutes: { spec: string } };
      requireForceRuntimeMethod: (methodName: string) => (...args: unknown[]) => unknown;
      snapshotFromCanonicalState: (canonicalState: unknown) => unknown;
    };
  }).__loaded;

  assert.equal(loaded.forcePreviewEngine().id, "force");
  assert.equal(typeof loaded.requireForceRuntimeMethod("createInitialForceSnapshot"), "function");
  assert.deepEqual(
    loaded.snapshotFromCanonicalState({ authoredSpec: { nodes: [] } }),
    { bootstrapped: { nodes: [] } },
  );
});

test("editor bridge restore helper accepts the namespaced previewBridge.relayout contract", () => {
  const source = readPreviewScript("editor.js");
  const context = {
    console,
    capturedEntries: null as Record<string, unknown> | null,
    previewGridEditorBrowserState: {
      restoreOverrideEntries(entries: Record<string, unknown>) {
        context.capturedEntries = entries;
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "_restoreOverrideEntries", "(entries)"),
    "this.__loaded = { _restoreOverrideEntries };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      _restoreOverrideEntries: (entries: Record<string, unknown>) => void;
    };
  }).__loaded;

  loaded._restoreOverrideEntries({ beta: { dy: 12 } });

  assert.deepEqual(normalizeVmValue(context.capturedEntries), {
    beta: { dy: 12 },
  });
});

test("editor clear-override helper accepts the namespaced previewBridge.relayout contract", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    selectedIds: new Set(["alpha"]),
    overrides: {
      alpha: {
        waypoints: [[24, 32]],
      },
    },
    model: {
      clearOverride(id: string) {
        capturedCalls.push({ kind: "model.clearOverride", id });
      },
    },
    setDirty(value: boolean) {
      capturedCalls.push({ kind: "setDirty", value });
    },
    getV3RelayoutStatus() {
      return { localReady: true };
    },
    requestV3Relayout(id: string) {
      capturedCalls.push({ kind: "requestV3Relayout", id });
      return Promise.resolve(true);
    },
    loadTree() {
      capturedCalls.push({ kind: "loadTree" });
      return Promise.resolve();
    },
    rebuildArrowSVG(id: string) {
      capturedCalls.push({ kind: "rebuildArrowSVG", id });
    },
    applyAllOverrides() {
      capturedCalls.push({ kind: "applyAllOverrides" });
    },
    updateInspector(id: string) {
      capturedCalls.push({ kind: "updateInspector", id });
    },
    EditorState: {
      captureOverrideEntries(ids: string[]) {
        capturedCalls.push({ kind: "captureOverrideEntries", ids });
        return { ids };
      },
      commitOverridePatchAction(label: string, beforeEntries: unknown, afterEntries: unknown) {
        capturedCalls.push({ kind: "commitOverridePatchAction", label, beforeEntries, afterEntries });
      },
    },
    _getRelayoutRuntime() {
      return {
        clearOverride(cid: string) {
          capturedCalls.push({
            kind: "dispatchPreviewClearOverride",
            cid,
            hasWaypointOverride: true,
            relayoutStatus: { localReady: true },
            clearOverride() {},
            setDirty() {},
            applyAllOverrides() {},
            isSelected() {},
            updateInspector() {},
            requestRelayout() {},
            restoreArrowFromTree() {},
            captureOverrideEntries() {},
            commitOverridePatchAction() {},
          });
        },
      };
    },
    window: {
      __DG_getPreviewBridgeRelayoutContract() {
        return context.LayoutEngine.previewBridge.relayout;
      },
    },
    LayoutEngine: {
      previewBridge: {
        relayout: {
          dispatchPreviewClearOverride(options: Record<string, unknown>) {
            capturedCalls.push({ kind: "dispatchPreviewClearOverride", ...options });
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "clearOverride", "(cid)"),
    "this.__loaded = { clearOverride };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      clearOverride: (cid: string) => void;
    };
  }).__loaded;

  loaded.clearOverride("alpha");

  assert.deepEqual(normalizeVmValue({
    kind: capturedCalls[0]?.kind,
    cid: capturedCalls[0]?.cid,
    hasWaypointOverride: capturedCalls[0]?.hasWaypointOverride,
    relayoutStatus: capturedCalls[0]?.relayoutStatus,
    hasClearOverride: typeof capturedCalls[0]?.clearOverride,
    hasSetDirty: typeof capturedCalls[0]?.setDirty,
    hasApplyAllOverrides: typeof capturedCalls[0]?.applyAllOverrides,
    hasIsSelected: typeof capturedCalls[0]?.isSelected,
    hasUpdateInspector: typeof capturedCalls[0]?.updateInspector,
    hasRequestRelayout: typeof capturedCalls[0]?.requestRelayout,
    hasRestoreArrowFromTree: typeof capturedCalls[0]?.restoreArrowFromTree,
    hasCaptureOverrideEntries: typeof capturedCalls[0]?.captureOverrideEntries,
    hasCommitOverridePatchAction: typeof capturedCalls[0]?.commitOverridePatchAction,
  }), {
    kind: "dispatchPreviewClearOverride",
    cid: "alpha",
    hasWaypointOverride: true,
    relayoutStatus: { localReady: true },
    hasClearOverride: "function",
    hasSetDirty: "function",
    hasApplyAllOverrides: "function",
    hasIsSelected: "function",
    hasUpdateInspector: "function",
    hasRequestRelayout: "function",
    hasRestoreArrowFromTree: "function",
    hasCaptureOverrideEntries: "function",
    hasCommitOverridePatchAction: "function",
  });
});

test("editor relayout status helpers accept the namespaced previewBridge.relayout contract", () => {
  const source = readPreviewScript("editor.js");
  const context = {
    console,
    _getEditorRelayoutFacade() {
      return {
        getLayoutRelayoutStatus() {
          return { localReady: true, local: { reason: "ready" }, frameManaged: true };
        },
      };
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "getLayoutRelayoutStatus", "()"),
    extractNamedFunctionSource(source, "getV3RelayoutStatus", "()"),
    "this.__loaded = { getLayoutRelayoutStatus, getV3RelayoutStatus };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      getLayoutRelayoutStatus: () => Record<string, unknown>;
      getV3RelayoutStatus: () => Record<string, unknown>;
    };
  }).__loaded;

  assert.deepEqual(
    normalizeVmValue(loaded.getLayoutRelayoutStatus()),
    { localReady: true, local: { reason: "ready" }, frameManaged: true },
  );
  assert.deepEqual(
    normalizeVmValue(loaded.getV3RelayoutStatus()),
    { localReady: true, local: { reason: "ready" }, frameManaged: true },
  );
});

test("editor live-resize relayout helper forwards the current v3 relayout status getter", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    _getEditorRelayoutFacade() {
      return {
        scheduleResizeRelayout(
          cid: string,
          newW: number,
          newH: number,
          resizedW: number,
          resizedH: number,
        ) {
          capturedCalls.push({ cid, newW, newH, resizedW, resizedH });
        },
      };
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "_scheduleV3ResizeRelayout", "(cid, newW, newH, resizedW, resizedH)"),
    "this.__loaded = { _scheduleV3ResizeRelayout };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      _scheduleV3ResizeRelayout: (
        cid: string,
        newW: number,
        newH: number,
        resizedW: number,
        resizedH: number,
      ) => void;
    };
  }).__loaded;

  loaded._scheduleV3ResizeRelayout("alpha", 320, 200, 320, 200);

  assert.deepEqual(normalizeVmValue(capturedCalls), [
    {
      cid: "alpha",
      newW: 320,
      newH: 200,
      resizedW: 320,
      resizedH: 200,
    },
  ]);
});

test("editor relayout lifecycle helpers accept the namespaced previewBridge.relayout contract", async () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    _getEditorRelayoutFacade() {
      return {
        finishRelayout(triggerCid: string, result: Record<string, unknown>, executionLabel: string) {
          capturedCalls.push({
            triggerCid,
            result,
            executionLabel,
          });
          return true;
        },
      };
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "_finishV3Relayout", "(triggerCid, localResult, executionLabel)"),
    "this.__loaded = { _finishV3Relayout };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      _finishV3Relayout: (triggerCid: string, localResult: Record<string, unknown>, executionLabel: string) => Promise<unknown>;
    };
  }).__loaded;

  assert.equal(await loaded._finishV3Relayout("alpha", { coerced: null }, "local"), true);
  assert.deepEqual(normalizeVmValue(capturedCalls), [
    {
      triggerCid: "alpha",
      result: { coerced: null },
      executionLabel: "local",
    },
  ]);
});

test("editor arrow-point helper accepts the namespaced previewShell.interaction contract", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    _getArrowWaypointRuntime() {
      return {
        getArrowPoints(cid: string) {
          capturedCalls.push({
            kind: "runtimeGetArrowPoints",
            componentId: cid,
          });
          return [{ x: 1, y: 2 }];
        },
      };
    },
    document: {
      querySelector(selector: string) {
        return selector === "#stage svg" ? { tagName: "svg" } : null;
      },
    },
    getArrowNode(cid: string) {
      return cid === "arrow-1" ? { id: cid } : null;
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "getArrowPoints", "(cid)"),
    "this.__loaded = { getArrowPoints };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      getArrowPoints: (cid: string) => unknown[];
    };
  }).__loaded;

  assert.deepEqual(normalizeVmValue(loaded.getArrowPoints("arrow-1")), [{ x: 1, y: 2 }]);
  assert.deepEqual(normalizeVmValue(capturedCalls), [
    {
      kind: "runtimeGetArrowPoints",
      componentId: "arrow-1",
    },
  ]);
});

test("editor override-application helper accepts the namespaced previewBridge.render contract", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    document: { tagName: "document" },
    selectedIds: new Set(["alpha"]),
    model: {
      _roots: [
        { id: "root-box", type: "box", gridRow: 0, data: { id: "root-box" } },
        { id: "root-arrow", type: "arrow", gridRow: 0, data: { id: "root-arrow" } },
      ],
      diagramGrid: { cols: 4 },
      get(id: string) {
        return { id };
      },
    },
    overrides: {
      alpha: { dx: 8 },
    },
    BOX_STYLES: {
      highlight: { fill: "#000", text: "#fff", icon: "#fff" },
    },
    BASELINE_STEP: 8,
    getLayoutRelayoutStatus() {
      return { localReady: true };
    },
    getV3RelayoutStatus() {
      return context.getLayoutRelayoutStatus();
    },
    getOwnDelta() {
      return { dx: 0, dy: 0, dw: 0, dh: 0 };
    },
    getEffectiveDelta() {
      return { dx: 8, dy: 0, dw: 0, dh: 0 };
    },
    showResizeHandles() {},
    _getEditorSceneFacade() {
      return {
        applyAllOverrides() {
          context.LayoutEngine.previewBridge.render.applyPreviewSvgOverridesHost({
            document: context.document,
            selectedIds: context.selectedIds,
            componentTree: context.model._roots.map((node: { data: { id: string } }) => node.data),
            rootNodes: context.model._roots
              .filter((node: { type: string }) => node.type !== "arrow")
              .map((node: { id: string }) => ({ id: node.id })),
            overrides: context.overrides,
            relayoutStatus: context.getLayoutRelayoutStatus(),
            getNode: context.model.get,
            getOwnDelta: context.getOwnDelta,
            getEffectiveDelta: context.getEffectiveDelta,
            isFrameManagedTarget: () => true,
            showResizeHandles: context.showResizeHandles,
          });
        },
      };
    },
    window: {
      __DG_CONFIG: {
        inset: 8,
        icon_size: 48,
      },
      __DG_getPreviewBridgeRenderContract() {
        return context.LayoutEngine.previewBridge.render;
      },
      __DG_getPreviewBridgeRelayoutContract() {
        return context.LayoutEngine.previewBridge.relayout;
      },
    },
    LayoutEngine: {
      previewBridge: {
        render: {
          applyPreviewSvgOverridesHost(options: Record<string, unknown>) {
            capturedCalls.push({
              relayoutStatus: options.relayoutStatus,
              hasDocument: typeof options.document,
              selectedIds: Array.from(options.selectedIds as Set<string>),
              componentTreeIds: Array.from(options.componentTree as Array<{ id: string }>).map((node) => node.id),
              rootNodeIds: Array.from(options.rootNodes as Array<{ id: string }>).map((node) => node.id),
              hasGetNode: typeof options.getNode,
              hasGetOwnDelta: typeof options.getOwnDelta,
              hasGetEffectiveDelta: typeof options.getEffectiveDelta,
              hasIsFrameManagedTarget: typeof options.isFrameManagedTarget,
              hasShowResizeHandles: typeof options.showResizeHandles,
            });
          },
        },
        relayout: {
          isPreviewFrameManagedTarget() {
            return true;
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "applyAllOverrides", "()"),
    "this.__loaded = { applyAllOverrides };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      applyAllOverrides: () => void;
    };
  }).__loaded;

  loaded.applyAllOverrides();

  assert.deepEqual(normalizeVmValue(capturedCalls), [
    {
      relayoutStatus: { localReady: true },
      hasDocument: "object",
      selectedIds: ["alpha"],
      componentTreeIds: ["root-box", "root-arrow"],
      rootNodeIds: ["root-box"],
      hasGetNode: "function",
      hasGetOwnDelta: "function",
      hasGetEffectiveDelta: "function",
      hasIsFrameManagedTarget: "function",
      hasShowResizeHandles: "function",
    },
  ]);
});

test("editor rerender helper accepts the namespaced previewShell.scene fresh-render contract", async () => {
  const source = readPreviewScript("editor.js");
  const sceneCalls: Array<Record<string, unknown>> = [];
  const followUps: string[] = [];
  let mergedRenderCalls = 0;
  const context = {
    console,
    _getEditorSceneFacade() {
      return {
        async rerenderStageFromModel() {
          sceneCalls.push({
            documentTagName: "document",
            overrides: context.overrides,
            model: context.model,
            hasRenderFreshSvg: "function",
            refreshSceneKeys: [
              "applyWaypointOverrides",
              "buildTreeUi",
              "bindInteraction",
              "applyAllOverrides",
              "renderGridOverlay",
              "reapplySelection",
              "refreshGridInfo",
              "renderSelectionInspector",
              "updateOverrideSummary",
              "refreshTreeColors",
              "runConstraints",
            ],
          });
          mergedRenderCalls += 1;
          followUps.push(
            "applyWaypointOverrides",
            "buildTreeUI",
            "bindInteraction",
            "applyAllOverrides",
            "renderGridOverlay",
            "reapplySelection",
            "refreshLayoutGridInfoFromLayout",
            "renderSelectionInspector",
            "updateOverrideSummary",
            "refreshTreeColors",
            "runConstraints",
          );
          return true;
        },
      };
    },
    window: {
      __DG_getPreviewBridgeRenderContract() {
        return {
          ...context.LayoutEngine.previewBridge.render,
          async renderFreshPreviewSvg() {
            mergedRenderCalls += 1;
            return {
              svg: { tagName: "svg" },
              width: 640,
              height: 480,
              coerced: new Map(),
            };
          },
        };
      },
      __DG_getPreviewShellSceneContract() {
        return context.LayoutEngine.previewShell.scene;
      },
    },
    document: {
      getElementById(id: string) {
        if (id === "stage") {
          return {
            replaceChildren() {},
          };
        }
        return null;
      },
    },
    model: {
      gridOverrides: { cols: 8 },
    },
    overrides: {
      alpha: { dx: 8 },
    },
    applyWaypointOverrides() {
      followUps.push("applyWaypointOverrides");
    },
    buildTreeUI() {
      followUps.push("buildTreeUI");
    },
    bindInteraction() {
      followUps.push("bindInteraction");
    },
    applyAllOverrides() {
      followUps.push("applyAllOverrides");
    },
    renderGridOverlay() {
      followUps.push("renderGridOverlay");
    },
    reapplySelection() {
      followUps.push("reapplySelection");
    },
    refreshLayoutGridInfoFromLayout() {
      followUps.push("refreshLayoutGridInfoFromLayout");
    },
    refreshV3GridInfoFromLayout() {
      followUps.push("refreshV3GridInfoFromLayout");
    },
    renderSelectionInspector() {
      followUps.push("renderSelectionInspector");
    },
    updateOverrideSummary() {
      followUps.push("updateOverrideSummary");
    },
    refreshTreeColors() {
      followUps.push("refreshTreeColors");
    },
    runConstraints() {
      followUps.push("runConstraints");
    },
    LayoutEngine: {
      previewBridge: {
        render: {
          async renderFreshPreviewSvg(_options: Record<string, unknown>) {
            return { svg: { tagName: "svg" }, width: 640, height: 480, coerced: new Map() };
          },
        },
      },
      previewShell: {
        scene: {
          async rerenderPreviewStageFromModelHost(options: Record<string, unknown>) {
            sceneCalls.push({
              documentTagName: options.document?.getElementById ? "document" : null,
              overrides: options.overrides,
              model: options.model,
              hasRenderFreshSvg: typeof options.renderFreshSvg,
              refreshSceneKeys: Object.keys(options.refreshScene || {}),
            });
            await options.renderFreshSvg({
              overrides: options.overrides,
              gridOverrides: options.model.gridOverrides,
              model: options.model,
            });
            const nextScene = options.refreshScene;
            nextScene.applyWaypointOverrides();
            nextScene.buildTreeUi();
            nextScene.bindInteraction();
            nextScene.applyAllOverrides();
            nextScene.renderGridOverlay();
            nextScene.reapplySelection();
            nextScene.refreshGridInfo();
            nextScene.renderSelectionInspector();
            nextScene.updateOverrideSummary();
            nextScene.refreshTreeColors();
            nextScene.runConstraints();
            return true;
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "_rerenderStageFromModel", "()").replace(/^function /, "async function "),
    "this.__loaded = { _rerenderStageFromModel };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      _rerenderStageFromModel: () => Promise<boolean>;
    };
  }).__loaded;

  assert.equal(await loaded._rerenderStageFromModel(), true);
  assert.equal(mergedRenderCalls, 1);
  assert.deepEqual(normalizeVmValue(sceneCalls), [
    {
      documentTagName: "document",
      overrides: { alpha: { dx: 8 } },
      model: { gridOverrides: { cols: 8 } },
      hasRenderFreshSvg: "function",
      refreshSceneKeys: [
        "applyWaypointOverrides",
        "buildTreeUi",
        "bindInteraction",
        "applyAllOverrides",
        "renderGridOverlay",
        "reapplySelection",
        "refreshGridInfo",
        "renderSelectionInspector",
        "updateOverrideSummary",
        "refreshTreeColors",
        "runConstraints",
      ],
    },
  ]);
  assert.deepEqual(followUps, [
    "applyWaypointOverrides",
    "buildTreeUI",
    "bindInteraction",
    "applyAllOverrides",
    "renderGridOverlay",
    "reapplySelection",
    "refreshLayoutGridInfoFromLayout",
    "renderSelectionInspector",
    "updateOverrideSummary",
    "refreshTreeColors",
    "runConstraints",
  ]);
});

test("editor scene helper accepts the namespaced previewShell.scene contract", () => {
  const source = readPreviewScript("editor.js");
  const summaryEl = { textContent: "" };
  const context = {
    console,
    _getEditorSceneFacade() {
      return {
        updateOverrideSummary() {
          summaryEl.textContent = "2 migrated";
        },
      };
    },
    window: {
      __DG_getPreviewShellSceneContract() {
        return context.LayoutEngine.previewShell.scene;
      },
    },
    overrides: {
      alpha: { dx: 8 },
      beta: { dy: 12 },
    },
    document: {
      getElementById(id: string) {
        return id === "override-summary" ? summaryEl : null;
      },
    },
    LayoutEngine: {
      previewShell: {
        scene: {
          updatePreviewOverrideSummaryHost(options: Record<string, unknown>) {
            const element = options.document.getElementById("override-summary");
            element.textContent = options.formatSummary(options.overrideCount);
          },
          formatPreviewOverrideSummary(count: number) {
            return `${count} migrated`;
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "updateOverrideSummary", "()"),
    "this.__loaded = { updateOverrideSummary };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      updateOverrideSummary: () => void;
    };
  }).__loaded;

  loaded.updateOverrideSummary();

  assert.equal(summaryEl.textContent, "2 migrated");
});

test("editor scene facade delegates through the typed preview-grid runtime", () => {
  const source = readPreviewScript("editor.js");
  const facade = { kind: "scene-facade" };
  const harness = createPreviewGridEditorRuntimeContext({
    sceneFacade: facade,
  });

  const helperSource = [
    "let _previewGridEditorInstallUnit = null;",
    "let _previewGridEditorRuntime = null;",
    extractNamedFunctionSource(source, "_createPreviewGridEditorInstallUnit", "()"),
    extractNamedFunctionSource(source, "_getPreviewGridEditorInstallUnit", "()"),
    extractNamedFunctionSource(source, "_getPreviewGridEditorRuntime", "()"),
    extractNamedFunctionSource(source, "_getEditorSceneFacade", "()"),
    "this.__loaded = { _getEditorSceneFacade };",
  ].join("\n");

  vm.runInNewContext(helperSource, harness.context);
  const loaded = (harness.context as {
    __loaded: {
      _getEditorSceneFacade: () => Record<string, unknown>;
    };
  }).__loaded;

  assert.deepEqual(normalizeVmValue(loaded._getEditorSceneFacade()), {
    kind: "scene-facade",
  });

  const capturedOptions = harness.getCapturedOptions();
  const shared = capturedOptions?.shared as Record<string, unknown> | undefined;
  const state = capturedOptions?.state as Record<string, unknown> | undefined;
  const browser = capturedOptions?.browser as Record<string, unknown> | undefined;
  const modelOps = capturedOptions?.modelOps as Record<string, unknown> | undefined;
  const facades = capturedOptions?.facades as Record<string, unknown> | undefined;
  assert.deepEqual(normalizeVmValue({
    slug: shared?.slug,
    baselineStep: shared?.baselineStep,
    guideModes: Array.from(shared?.guideModes as Iterable<string>),
    selectedIds: Array.from(shared?.selectedIds as Iterable<string>),
    overrideKeys: Object.keys((
      state?.overridesState as { get?: () => Record<string, unknown> } | undefined
    )?.get?.() || {}),
    hasOverrideStateSet: typeof (
      state?.overridesState as { set?: (nextOverrides: Record<string, unknown>) => void } | undefined
    )?.set,
    hasGetOwnDelta: typeof modelOps?.getOwnDelta,
    hasGetAncestors: typeof modelOps?.getAncestors,
    hasGetEditorInteractionFacade: typeof facades?.getEditorInteractionFacade,
    hasGetEditorSceneFacade: typeof facades?.getEditorSceneFacade,
    hasBoxStyles: typeof browser?.boxStyles,
    inset: browser?.inset,
    iconSize: browser?.iconSize,
  }), {
    slug: "demo",
    baselineStep: 24,
    guideModes: ["off", "all"],
    selectedIds: ["alpha", "beta"],
    overrideKeys: ["alpha"],
    hasOverrideStateSet: "function",
    hasGetOwnDelta: "function",
    hasGetAncestors: "function",
    hasGetEditorInteractionFacade: "function",
    hasGetEditorSceneFacade: "function",
    hasBoxStyles: "object",
    inset: 8,
    iconSize: 48,
  });
});

test("editor grid overlay helper accepts the namespaced previewShell.scene contract", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    _getEditorSceneFacade() {
      return {
        renderGridOverlay() {
          capturedCalls.push({ kind: "renderGridOverlay" });
        },
      };
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "renderGridOverlay", "()"),
    "this.__loaded = { renderGridOverlay };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      renderGridOverlay: () => void;
    };
  }).__loaded;

  loaded.renderGridOverlay();

  assert.deepEqual(normalizeVmValue(capturedCalls), [
    {
      kind: "renderGridOverlay",
    },
  ]);
});

test("editor grid-control helpers delegate through the typed grid runtime", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    _getEditorSceneFacade() {
      return {
        cycleGuideMode() {
          capturedCalls.push({ kind: "cycleGuideMode" });
          return "all";
        },
        populateGridControls() {
          capturedCalls.push({ kind: "populateGridControls" });
          return true;
        },
        onGridControlChange() {
          capturedCalls.push({ kind: "onGridControlChange" });
          return { kind: "applied" };
        },
      };
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "cycleGuideMode", "()"),
    extractNamedFunctionSource(source, "populateGridControls", "()"),
    extractNamedFunctionSource(source, "onGridControlChange", "()"),
    "this.__loaded = { cycleGuideMode, populateGridControls, onGridControlChange };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      cycleGuideMode: () => void;
      populateGridControls: () => void;
      onGridControlChange: () => void;
    };
  }).__loaded;

  loaded.cycleGuideMode();
  loaded.populateGridControls();
  loaded.onGridControlChange();

  assert.deepEqual(normalizeVmValue(capturedCalls), [
    { kind: "cycleGuideMode" },
    { kind: "populateGridControls" },
    { kind: "onGridControlChange" },
  ]);
});

test("editor constraint helper accepts the namespaced previewShell.scene contract", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    _getEditorSceneFacade() {
      return {
        runConstraints() {
          capturedCalls.push({
            hasValidateConstraints: "function",
            hasSummarizeViolations: "function",
            hasSetLastViolations: "function",
            hasSyncSaveButton: "function",
            hasSyncConstraintStatus: "function",
          });
        },
      };
    },
    document: {},
    model: { roots: [] },
    constraints: {
      validate() {
        return [];
      },
      summarise() {
        return { errors: 0 };
      },
    },
    lastViolations: null,
    PreviewSaveClient: {
      syncSaveButton() {},
    },
    window: {
      __DG_getPreviewShellSceneContract() {
        return context.LayoutEngine.previewShell.scene;
      },
    },
    LayoutEngine: {
      previewShell: {
        scene: {
          runPreviewConstraintValidationHost(options: Record<string, unknown>) {
            capturedCalls.push({
              hasValidateConstraints: typeof options.validateConstraints,
              hasSummarizeViolations: typeof options.summarizeViolations,
              hasSetLastViolations: typeof options.setLastViolations,
              hasSyncSaveButton: typeof options.syncSaveButton,
              hasSyncConstraintStatus: typeof options.syncConstraintStatus,
            });
          },
          syncPreviewConstraintStatus() {},
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "runConstraints", "()"),
    "this.__loaded = { runConstraints };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      runConstraints: () => void;
    };
  }).__loaded;

  loaded.runConstraints();

  assert.deepEqual(normalizeVmValue(capturedCalls), [
    {
      hasValidateConstraints: "function",
      hasSummarizeViolations: "function",
      hasSetLastViolations: "function",
      hasSyncSaveButton: "function",
      hasSyncConstraintStatus: "function",
    },
  ]);
});

test("editor double-click host helper accepts the namespaced previewShell contracts", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    window: {
      __DG_getPreviewShellInspectorContract() {
        return context.LayoutEngine.previewShell.inspector;
      },
      __DG_getPreviewShellInteractionContract() {
        return context.LayoutEngine.previewShell.interaction;
      },
    },
    document: {
      querySelector(selector: string) {
        return selector === "#stage svg" ? { tagName: "svg" } : null;
      },
    },
    _getPointerInteractionRuntime() {
      return {
        onSvgDoubleClick(event: Record<string, unknown>) {
          capturedCalls.push({
            kind: "runtimeDoubleClick",
            clientX: event.clientX,
            clientY: event.clientY,
          });
        },
      };
    },
    mgr: {
      isMode() {
        return false;
      },
    },
    model: {
      get(id: string) {
        return id === "alpha" ? { id } : null;
      },
    },
    selectionDepth: 2,
    selectedIds: new Set(["alpha"]),
    getAncestors() {
      return [];
    },
    findComponentAtDepth() {
      return "alpha";
    },
    _applySelectionStateSnapshot() {},
    selectComponent() {},
    startTextEdit() {},
    InteractionMode: {
      TEXT_EDITING: "text_editing",
    },
    LayoutEngine: {
      previewShell: {
        interaction: {
          handlePreviewDoubleClickSelectionHost(options: Record<string, unknown>) {
            capturedCalls.push({ kind: "handlePreviewDoubleClickSelectionHost", ...options });
          },
        },
        inspector: {
          findPreviewEditableTextTarget() {
            return { dataset: { componentId: "alpha" } };
          },
          resolvePreviewEditableComponentId() {
            return "alpha";
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "onSvgDblClick", "(e)"),
    "this.__loaded = { onSvgDblClick };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      onSvgDblClick: (event: Record<string, unknown>) => void;
    };
  }).__loaded;

  assert.doesNotThrow(() => {
    loaded.onSvgDblClick({
      target: { classList: { contains: () => false } },
      clientX: 10,
      clientY: 20,
      stopPropagation() {},
    });
  });
  assert.deepEqual(normalizeVmValue(capturedCalls), [
    {
      kind: "runtimeDoubleClick",
      clientX: 10,
      clientY: 20,
    },
  ]);
});

test("editor text-edit host helper accepts the namespaced previewShell.inspector contract", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    document: {
      querySelector(selector: string) {
        return selector === "#stage svg"
          ? {
              tagName: "svg",
              querySelectorAll() {
                return [];
              },
            }
          : null;
      },
    },
    model: {
      get(id: string) {
        if (id !== "alpha") return null;
        return {
          data: {
            heading_text: "Heading",
            label_text: ["Line 1", "Line 2"],
          },
        };
      },
    },
    mgr: {
      startTextEdit(state: Record<string, unknown>) {
        capturedCalls.push({ kind: "startInteraction", state });
      },
    },
    window: {
      __DG_CONFIG: {
        icon_size: 48,
        col_gap: 24,
      },
      __DG_getPreviewShellInspectorContract() {
        return context.LayoutEngine.previewShell.inspector;
      },
    },
    commitTextEdit() {},
    cancelTextEdit() {},
    _getTextEditRuntime() {
      return {
        startTextEdit(cid: string, event: Record<string, unknown>, opts?: Record<string, unknown>) {
          const node = context.model.get(cid);
          capturedCalls.push({
            kind: "startPreviewTextEditHost",
            document: context.document,
            svg: context.document.querySelector("#stage svg"),
            cid,
            headingText: node?.data?.heading_text || "",
            labelText: node?.data?.label_text || [],
            targetedTextEl: opts?.textEl ?? null,
            iconSize: context.window.__DG_CONFIG.icon_size,
            columnGap: context.window.__DG_CONFIG.col_gap,
            startInteraction: context.mgr.startTextEdit,
            suspendSelectionChrome() {},
            scheduleBlurCommit() {},
            commitTextEdit: context.commitTextEdit,
            cancelTextEdit: context.cancelTextEdit,
            stopPropagation: () => event.stopPropagation(),
          });
        },
      };
    },
    LayoutEngine: {
      previewShell: {
        inspector: {
          startPreviewTextEditHost(options: Record<string, unknown>) {
            capturedCalls.push({ kind: "startPreviewTextEditHost", ...options });
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "startTextEdit", "(cid, e, opts)"),
    "this.__loaded = { startTextEdit };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      startTextEdit: (cid: string, event: Record<string, unknown>, opts?: Record<string, unknown>) => void;
    };
  }).__loaded;

  loaded.startTextEdit(
    "alpha",
    {
      stopPropagation() {
        capturedCalls.push({ kind: "stopPropagation" });
      },
    },
    { textEl: { id: "target-text" } },
  );

  assert.deepEqual(normalizeVmValue({
    startKind: capturedCalls[0]?.kind,
    startSvg: capturedCalls[0]?.svg,
    startCid: capturedCalls[0]?.cid,
    startHeadingText: capturedCalls[0]?.headingText,
    startLabelText: capturedCalls[0]?.labelText,
    startTargetedTextEl: capturedCalls[0]?.targetedTextEl,
    startIconSize: capturedCalls[0]?.iconSize,
    startColumnGap: capturedCalls[0]?.columnGap,
    startHasStartInteraction: typeof capturedCalls[0]?.startInteraction,
    startHasSuspendSelectionChrome: typeof capturedCalls[0]?.suspendSelectionChrome,
    startHasScheduleBlurCommit: typeof capturedCalls[0]?.scheduleBlurCommit,
    startHasCommitTextEdit: typeof capturedCalls[0]?.commitTextEdit,
    startHasCancelTextEdit: typeof capturedCalls[0]?.cancelTextEdit,
    startHasStopPropagation: typeof capturedCalls[0]?.stopPropagation,
  }), {
    startKind: "startPreviewTextEditHost",
    startSvg: { tagName: "svg" },
    startCid: "alpha",
    startHeadingText: "Heading",
    startLabelText: ["Line 1", "Line 2"],
    startTargetedTextEl: { id: "target-text" },
    startIconSize: 48,
    startColumnGap: 24,
    startHasStartInteraction: "function",
    startHasSuspendSelectionChrome: "function",
    startHasScheduleBlurCommit: "function",
    startHasCommitTextEdit: "function",
    startHasCancelTextEdit: "function",
    startHasStopPropagation: "function",
  });
});

test("editor inspector mutation helpers accept the namespaced previewShell.inspector contract", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    _getInspectorMutationRuntime() {
      return {
        setFrameProp(cid: string, prop: string, value: unknown) {
          capturedCalls.push({
            kind: "singleProp",
            cid, prop, value,
          });
        },
      };
    },
    _getInspectorSelectionRuntime() {
      return {
        setMultiFrameSize(dimension: string, value: unknown) {
          capturedCalls.push({
            kind: "multiSize",
            dimension,
            value,
          });
        },
      };
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "setFrameProp", "(cid, prop, value)"),
    extractNamedFunctionSource(source, "setMultiFrameSize", "(dimension, value)"),
    "this.__loaded = { setFrameProp, setMultiFrameSize };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      setFrameProp: (cid: string, prop: string, value: unknown) => void;
      setMultiFrameSize: (dimension: string, value: unknown) => void;
    };
  }).__loaded;

  loaded.setFrameProp("alpha", "gap", 24);
  loaded.setMultiFrameSize("width", 320);

  assert.deepEqual(normalizeVmValue(capturedCalls), [
    {
      kind: "singleProp",
      cid: "alpha",
      prop: "gap",
      value: 24,
    },
    {
      kind: "multiSize",
      dimension: "width",
      value: 320,
    },
  ]);
});

test("editor runtime-set bootstrap accepts the namespaced previewShell.bootstrap contract", () => {
  const source = readPreviewScript("editor.js");
  const runtimeSet = {
    selection: { id: "selection-runtime" },
    inspectorDisplay: { id: "display-runtime" },
    inspectorMutation: { id: "mutation-runtime" },
    inspectorSelection: { id: "selection-inspector-runtime" },
    arrowWaypoint: { id: "waypoint-runtime" },
  };
  const interactionFacade = {
    getEditorRuntimeSet() {
      return runtimeSet;
    },
    getInspectorDisplayRuntime() {
      return runtimeSet.inspectorDisplay;
    },
    getInspectorMutationRuntime() {
      return runtimeSet.inspectorMutation;
    },
    getInspectorSelectionRuntime() {
      return runtimeSet.inspectorSelection;
    },
    getArrowWaypointRuntime() {
      return runtimeSet.arrowWaypoint;
    },
  };
  const harness = createPreviewGridEditorRuntimeContext({
    interactionFacade,
  });

  const helperSource = [
    "let _previewGridEditorInstallUnit = null;",
    "let _previewGridEditorRuntime = null;",
    extractNamedFunctionSource(source, "_createPreviewGridEditorInstallUnit", "()"),
    extractNamedFunctionSource(source, "_getPreviewGridEditorInstallUnit", "()"),
    extractNamedFunctionSource(source, "_getPreviewGridEditorRuntime", "()"),
    extractNamedFunctionSource(source, "_getEditorInteractionFacade", "()"),
    extractNamedFunctionSource(source, "_getEditorRuntimeSet", "()"),
    extractNamedFunctionSource(source, "_getInspectorSelectionRuntime", "()"),
    extractNamedFunctionSource(source, "_getInspectorDisplayRuntime", "()"),
    extractNamedFunctionSource(source, "_getArrowWaypointRuntime", "()"),
    "this.__loaded = { _getEditorRuntimeSet, _getInspectorSelectionRuntime, _getInspectorDisplayRuntime, _getArrowWaypointRuntime };",
  ].join("\n");

  vm.runInNewContext(helperSource, harness.context);
  const loaded = (harness.context as {
    __loaded: {
      _getEditorRuntimeSet: () => Record<string, unknown>;
      _getInspectorSelectionRuntime: () => Record<string, unknown>;
      _getInspectorDisplayRuntime: () => Record<string, unknown>;
      _getArrowWaypointRuntime: () => Record<string, unknown>;
    };
  }).__loaded;

  assert.equal(loaded._getEditorRuntimeSet(), runtimeSet);
  assert.equal(loaded._getInspectorSelectionRuntime(), runtimeSet.inspectorSelection);
  assert.equal(loaded._getInspectorDisplayRuntime(), runtimeSet.inspectorDisplay);
  assert.equal(loaded._getArrowWaypointRuntime(), runtimeSet.arrowWaypoint);

  const capturedOptions = harness.getCapturedOptions();
  const sharedOptions = capturedOptions?.shared as Record<string, unknown> | undefined;
  const stateOptions = capturedOptions?.state as Record<string, unknown> | undefined;
  const browserOptions = capturedOptions?.browser as Record<string, unknown> | undefined;
  const modelOps = capturedOptions?.modelOps as Record<string, unknown> | undefined;
  assert.deepEqual(normalizeVmValue({
    selectedIds: Array.from(sharedOptions?.selectedIds as Iterable<string>),
    selectionDepth: (
      sharedOptions?.selectionDepthState as { get?: () => number } | undefined
    )?.get?.(),
    ancestorDepth: (
      modelOps?.getAncestors as ((id: string) => string[]) | undefined
    )?.("alpha")?.length,
    inspector: (browserOptions?.getInspector as (() => unknown) | undefined)?.(),
    hasGetMultiActionGap: typeof (
      stateOptions?.multiActionGapState as { get?: () => number } | undefined
    )?.get,
    hasSetMultiActionGap: typeof (
      stateOptions?.multiActionGapState as { set?: (value: number) => void } | undefined
    )?.set,
    hasOverrideStateSet: typeof (
      stateOptions?.overridesState as { set?: (nextOverrides: Record<string, unknown>) => void } | undefined
    )?.set,
    hasGetTextAdapter: typeof browserOptions?.getTextAdapter,
    fallbackGap: browserOptions?.fallbackGap,
    headLen: (browserOptions?.theme as { headLen?: number } | undefined)?.headLen,
    headHalf: (browserOptions?.theme as { headHalf?: number } | undefined)?.headHalf,
    color: (browserOptions?.theme as { color?: string } | undefined)?.color,
  }), {
    selectedIds: ["alpha", "beta"],
    selectionDepth: 3,
    ancestorDepth: 1,
    inspector: { id: "inspector", innerHTML: "" },
    hasGetMultiActionGap: "function",
    hasSetMultiActionGap: "function",
    hasOverrideStateSet: "function",
    hasGetTextAdapter: "function",
    fallbackGap: 24,
    headLen: 10,
    headHalf: 5,
    color: "#E95420",
  });

  (sharedOptions?.selectionDepthState as { set: (value: number) => void }).set(9);
  (stateOptions?.multiActionGapState as { set: (value: number) => void }).set(33);
  assert.equal((harness.context as { selectionDepth: number }).selectionDepth, 9);
  assert.equal((harness.context as { multiActionGap: number }).multiActionGap, 33);
});

test("editor inspector-selection wrappers delegate through the typed runtime", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    _getInspectorSelectionRuntime() {
      return {
        applySelectionTargets(items: unknown[], targets: Record<string, unknown>) {
          capturedCalls.push({ kind: "applyTargets", items, targets });
        },
        distributeSelection(axis: string) {
          capturedCalls.push({ kind: "distribute", axis });
        },
        alignSelection(mode: string) {
          capturedCalls.push({ kind: "align", mode });
        },
        setMultiFrameAlign(align: string) {
          capturedCalls.push({ kind: "multiAlign", align });
        },
        applyMultiStyleOverride(styleName: string) {
          capturedCalls.push({ kind: "multiStyle", styleName });
        },
        setMultiFrameProp(prop: string, value: unknown) {
          capturedCalls.push({ kind: "multiProp", prop, value });
        },
        setMultiFrameSize(dimension: string, value: unknown) {
          capturedCalls.push({ kind: "multiSize", dimension, value });
        },
      };
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "applySelectionTargets", "(items, targets)"),
    extractNamedFunctionSource(source, "distributeSelection", "(axis)"),
    extractNamedFunctionSource(source, "alignSelection", "(mode)"),
    extractNamedFunctionSource(source, "setMultiFrameAlign", "(align)"),
    extractNamedFunctionSource(source, "applyMultiStyleOverride", "(styleName)"),
    extractNamedFunctionSource(source, "setMultiFrameProp", "(prop, value)"),
    extractNamedFunctionSource(source, "setMultiFrameSize", "(dimension, value)"),
    "this.__loaded = { applySelectionTargets, distributeSelection, alignSelection, setMultiFrameAlign, applyMultiStyleOverride, setMultiFrameProp, setMultiFrameSize };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      applySelectionTargets: (items: unknown[], targets: Record<string, unknown>) => void;
      distributeSelection: (axis: string) => void;
      alignSelection: (mode: string) => void;
      setMultiFrameAlign: (align: string) => void;
      applyMultiStyleOverride: (styleName: string) => void;
      setMultiFrameProp: (prop: string, value: unknown) => void;
      setMultiFrameSize: (dimension: string, value: unknown) => void;
    };
  }).__loaded;

  loaded.applySelectionTargets([{ id: "alpha" }], { alpha: { dx: 8 } });
  loaded.distributeSelection("x");
  loaded.alignSelection("left");
  loaded.setMultiFrameAlign("BOTTOM_CENTER");
  loaded.applyMultiStyleOverride("highlight");
  loaded.setMultiFrameProp("gap", 24);
  loaded.setMultiFrameSize("width", 320);

  assert.deepEqual(normalizeVmValue(capturedCalls), [
    { kind: "applyTargets", items: [{ id: "alpha" }], targets: { alpha: { dx: 8 } } },
    { kind: "distribute", axis: "x" },
    { kind: "align", mode: "left" },
    { kind: "multiAlign", align: "BOTTOM_CENTER" },
    { kind: "multiStyle", styleName: "highlight" },
    { kind: "multiProp", prop: "gap", value: 24 },
    { kind: "multiSize", dimension: "width", value: 320 },
  ]);
});

test("editor inspector-display wrappers delegate through the typed runtime", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    _getInspectorDisplayRuntime() {
      return {
        renderSelectionInspector(preferredId?: string | null) {
          capturedCalls.push({ kind: "renderSelectionInspector", preferredId });
        },
        renderMultiSelectionInspector() {
          capturedCalls.push({ kind: "renderMultiSelectionInspector" });
        },
        updateInspector(cid: string) {
          capturedCalls.push({ kind: "updateInspector", cid });
        },
        setWidthUnit(unit: string, cid?: string | null) {
          capturedCalls.push({ kind: "setWidthUnit", unit, cid });
        },
        setHeightUnit(unit: string, cid?: string | null) {
          capturedCalls.push({ kind: "setHeightUnit", unit, cid });
        },
      };
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "renderMultiSelectionInspector", "()"),
    extractNamedFunctionSource(source, "renderSelectionInspector", "(preferredCid)"),
    extractNamedFunctionSource(source, "updateInspector", "(cid)"),
    extractNamedFunctionSource(source, "setWidthUnit", "(unit, cid)"),
    extractNamedFunctionSource(source, "setHeightUnit", "(unit, cid)"),
    "this.__loaded = { renderMultiSelectionInspector, renderSelectionInspector, updateInspector, setWidthUnit, setHeightUnit };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      renderMultiSelectionInspector: () => void;
      renderSelectionInspector: (preferredCid?: string | null) => void;
      updateInspector: (cid: string) => void;
      setWidthUnit: (unit: string, cid?: string | null) => void;
      setHeightUnit: (unit: string, cid?: string | null) => void;
    };
  }).__loaded;

  loaded.renderMultiSelectionInspector();
  loaded.renderSelectionInspector("alpha");
  loaded.updateInspector("alpha");
  loaded.setWidthUnit("cols", "alpha");
  loaded.setHeightUnit("rows", "alpha");

  assert.deepEqual(normalizeVmValue(capturedCalls), [
    { kind: "renderMultiSelectionInspector" },
    { kind: "renderSelectionInspector", preferredId: "alpha" },
    { kind: "updateInspector", cid: "alpha" },
    { kind: "setWidthUnit", unit: "cols", cid: "alpha" },
    { kind: "setHeightUnit", unit: "rows", cid: "alpha" },
  ]);
});

test("editor resize host helpers accept the namespaced previewShell.interaction contract", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    _getResizeInteractionRuntime() {
      return {
        startResize(event: Record<string, unknown>) {
          capturedCalls.push({
            kind: "runtimeStartResize",
            clientX: event.clientX,
            clientY: event.clientY,
          });
        },
        onResizeMove(event: Record<string, unknown>) {
          capturedCalls.push({
            kind: "runtimeResizeMove",
            clientX: event.clientX,
            clientY: event.clientY,
          });
        },
      };
    },
    window: {
      __DG_getPreviewShellInteractionContract() {
        return context.LayoutEngine.previewShell.interaction;
      },
    },
    LayoutEngine: {
      previewShell: {
        interaction: {
          startPreviewResizeHost(options: Record<string, unknown>) {
            capturedCalls.push({ kind: "startPreviewResizeHost", ...options });
          },
          dispatchPreviewResizeMoveHost(options: Record<string, unknown>) {
            capturedCalls.push({ kind: "dispatchPreviewResizeMoveHost", ...options });
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "startResize", "(e)"),
    extractNamedFunctionSource(source, "onResizeMove", "(e)"),
    "this.__loaded = { startResize, onResizeMove };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      startResize: (event: Record<string, unknown>) => void;
      onResizeMove: (event: Record<string, unknown>) => void;
    };
  }).__loaded;

  loaded.startResize({
    target: {
      getAttribute(name: string) {
        const map: Record<string, string> = {
          "data-resize-cid": "alpha",
          "data-resize-axis": "e",
          "data-resize-selection": "single",
        };
        return map[name] ?? null;
      },
    },
    clientX: 100,
    clientY: 120,
    preventDefault() {},
    stopPropagation() {},
  });
  loaded.onResizeMove({
    clientX: 132,
    clientY: 120,
  });

  assert.deepEqual(normalizeVmValue(capturedCalls), [
    {
      kind: "runtimeStartResize",
      clientX: 100,
      clientY: 120,
    },
    {
      kind: "runtimeResizeMove",
      clientX: 132,
      clientY: 120,
    },
  ]);
});

test("editor resize persistence wrapper forwards typed baseSizes to the relayout facade", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    _getEditorRelayoutFacade() {
      return {
        persistResize(
          resizeIds: string[],
          propagatedIds: string[],
          triggerCid: string,
          baseSizes: Record<string, { width: number; height: number }> | null,
        ) {
          capturedCalls.push({
            resizeIds,
            propagatedIds,
            triggerCid,
            baseSizes,
          });
        },
      };
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "_persistResizeToLayout", "(resizeIds, propagatedIds, triggerCid, baseSizes)"),
    "this.__loaded = _persistResizeToLayout;",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: (
      resizeIds: string[],
      propagatedIds: string[],
      triggerCid: string,
      baseSizes: Record<string, { width: number; height: number }> | null,
    ) => void;
  }).__loaded;

  loaded(
    ["alpha"],
    ["beta"],
    "alpha",
    { alpha: { width: 224, height: 64 } },
  );

  assert.deepEqual(normalizeVmValue(capturedCalls), [
    {
      resizeIds: ["alpha"],
      propagatedIds: ["beta"],
      triggerCid: "alpha",
      baseSizes: {
        alpha: { width: 224, height: 64 },
      },
    },
  ]);
});

test("editor arrow-waypoint wrappers delegate through the typed runtime", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    _getArrowWaypointRuntime() {
      return {
        showArrowWaypointHandles(cid: string) {
          capturedCalls.push({ kind: "show", cid });
        },
        startWaypointDrag(event: unknown) {
          capturedCalls.push({ kind: "start", eventType: typeof event });
        },
        onWaypointDragMove(event: unknown) {
          capturedCalls.push({ kind: "move", eventType: typeof event });
        },
        onWaypointDragUp(event: unknown) {
          capturedCalls.push({ kind: "up", eventType: typeof event });
        },
        addWaypoint(cid: string, segmentIndex: number, x: number, y: number) {
          capturedCalls.push({ kind: "add", cid, segmentIndex, x, y });
        },
        removeWaypoint(cid: string, index: number) {
          capturedCalls.push({ kind: "remove", cid, index });
        },
        getArrowPoints(cid: string) {
          capturedCalls.push({ kind: "points", cid });
          return [[1, 2]];
        },
        updateArrowVisual(cid: string) {
          capturedCalls.push({ kind: "update", cid });
        },
        rebuildArrowSvg(cid: string) {
          capturedCalls.push({ kind: "rebuild", cid });
        },
      };
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "showArrowWaypointHandles", "(cid)"),
    extractNamedFunctionSource(source, "startWpDrag", "(e)"),
    extractNamedFunctionSource(source, "onWpDragMove", "(e)"),
    extractNamedFunctionSource(source, "onWpDragUp", "(e)"),
    extractNamedFunctionSource(source, "addWaypoint", "(cid, segIdx, x, y)"),
    extractNamedFunctionSource(source, "removeWaypoint", "(cid, idx)"),
    extractNamedFunctionSource(source, "getArrowPoints", "(cid)"),
    extractNamedFunctionSource(source, "updateArrowVisual", "(cid)"),
    extractNamedFunctionSource(source, "rebuildArrowSVG", "(cid)"),
    "this.__loaded = { showArrowWaypointHandles, startWpDrag, onWpDragMove, onWpDragUp, addWaypoint, removeWaypoint, getArrowPoints, updateArrowVisual, rebuildArrowSVG };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      showArrowWaypointHandles: (cid: string) => void;
      startWpDrag: (event: unknown) => void;
      onWpDragMove: (event: unknown) => void;
      onWpDragUp: (event?: unknown) => void;
      addWaypoint: (cid: string, segIdx: number, x: number, y: number) => void;
      removeWaypoint: (cid: string, idx: number) => void;
      getArrowPoints: (cid: string) => unknown;
      updateArrowVisual: (cid: string) => void;
      rebuildArrowSVG: (cid: string) => void;
    };
  }).__loaded;

  loaded.showArrowWaypointHandles("arrow-1");
  loaded.startWpDrag({});
  loaded.onWpDragMove({});
  loaded.onWpDragUp();
  loaded.addWaypoint("arrow-1", 1, 24, 32);
  loaded.removeWaypoint("arrow-1", 0);
  assert.deepEqual(normalizeVmValue(loaded.getArrowPoints("arrow-1")), [[1, 2]]);
  loaded.updateArrowVisual("arrow-1");
  loaded.rebuildArrowSVG("arrow-1");

  assert.deepEqual(normalizeVmValue(capturedCalls), [
    { kind: "show", cid: "arrow-1" },
    { kind: "start", eventType: "object" },
    { kind: "move", eventType: "object" },
    { kind: "up", eventType: "undefined" },
    { kind: "add", cid: "arrow-1", segmentIndex: 1, x: 24, y: 32 },
    { kind: "remove", cid: "arrow-1", index: 0 },
    { kind: "points", cid: "arrow-1" },
    { kind: "update", cid: "arrow-1" },
    { kind: "rebuild", cid: "arrow-1" },
  ]);
});

test("editor pointer-interaction host helper accepts the namespaced previewShell.interaction contract", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    selectionDepth: 2,
    selectedIds: new Set(["alpha"]),
    document: {
      querySelector(selector: string) {
        return selector === "#stage svg" ? { tagName: "svg" } : null;
      },
      addEventListener(type: string, handler: unknown) {
        capturedCalls.push({ kind: "addDocumentListener", type, handlerType: typeof handler });
      },
    },
    mgr: {
      isMode() {
        return false;
      },
      startDrag(state: Record<string, unknown>) {
        capturedCalls.push({ kind: "startDrag", state });
      },
    },
    InteractionMode: {
      TEXT_EDITING: "text_editing",
    },
    EditorState: {
      captureOverrideEntries(ids: string[]) {
        capturedCalls.push({ kind: "captureOverrideEntries", ids });
        return { before: ids };
      },
    },
    startResize() {},
    commitTextEdit() {},
    findArrowAtPoint() {
      return null;
    },
    findDeepestComponent() {
      return null;
    },
    findComponentAtDepth() {
      return "alpha";
    },
    getAncestors() {
      return [];
    },
    deselectAll() {},
    selectComponent() {},
    getOwnDelta() {
      return { dx: 0, dy: 0 };
    },
    collectSnapTargets() {
      return null;
    },
    _isAutolayoutChild() {
      return false;
    },
    onDragMove() {},
    onDragUp() {},
    _getPointerInteractionRuntime() {
      return {
        onSvgMouseDown(event: Record<string, unknown>) {
          capturedCalls.push({
            kind: "runtimePointerDown",
            clientX: event.clientX,
            clientY: event.clientY,
            button: event.button,
          });
        },
      };
    },
    window: {
      __DG_getPreviewShellInteractionContract() {
        return context.LayoutEngine.previewShell.interaction;
      },
    },
    LayoutEngine: {
      previewShell: {
        interaction: {
          startPreviewPointerInteractionHost(options: Record<string, unknown>) {
            capturedCalls.push({ kind: "startPreviewPointerInteractionHost", ...options });
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "onSvgMouseDown", "(e)"),
    "this.__loaded = { onSvgMouseDown };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      onSvgMouseDown: (event: Record<string, unknown>) => void;
    };
  }).__loaded;

  loaded.onSvgMouseDown({
    target: {
      classList: {
        contains() {
          return false;
        },
      },
    },
    button: 0,
    clientX: 120,
    clientY: 80,
    preventDefault() {},
  });

  assert.deepEqual(normalizeVmValue(capturedCalls), [
    {
      kind: "runtimePointerDown",
      clientX: 120,
      clientY: 80,
      button: 0,
    },
  ]);
});

test("editor drag-move helper accepts the namespaced previewShell.interaction contract", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    document: {
      querySelector(selector: string) {
        return selector === "#stage svg" ? { tagName: "svg" } : null;
      },
    },
    mgr: {
      state: {
        cid: "alpha",
        cids: ["alpha"],
        autolayout: true,
      },
      isMode(mode: string) {
        return mode === "DRAGGING";
      },
    },
    InteractionMode: {
      DRAGGING: "DRAGGING",
    },
    selectedIds: new Set(["alpha"]),
    BASELINE_STEP: 8,
    GUIDE_COLOR: "#f00",
    GUIDE_OPACITY: "0.5",
    INSET: 8,
    model: {
      getParent() {
        return { id: "parent" };
      },
    },
    findSnaps() {
      return { snapDx: 16, snapDy: 24, lines: [] };
    },
    renderGuideLines() {},
    _showReorderIndicator() {},
    _clearReorderIndicator() {},
    getParentNode() {
      return null;
    },
    getComponentNode() {
      return { x: 0, y: 0, width: 10, height: 10 };
    },
    getOwnDelta() {
      return { dx: 0, dy: 0, dw: 0, dh: 0 };
    },
    getEffectiveDelta() {
      return { dx: 0, dy: 0, dw: 0, dh: 0 };
    },
    setOverride() {},
    applyAllOverrides() {},
    updateInspector() {},
    _getPointerInteractionRuntime() {
      return {
        onDragMove(event: Record<string, unknown>) {
          capturedCalls.push({
            kind: "runtimeDragMove",
            clientX: event.clientX,
            clientY: event.clientY,
          });
        },
      };
    },
    window: {
      __DG_getPreviewShellInteractionContract() {
        return context.LayoutEngine.previewShell.interaction;
      },
    },
    LayoutEngine: {
      previewShell: {
        interaction: {
          dispatchPreviewDragMoveHost(options: Record<string, unknown>) {
            capturedCalls.push({
              state: options.state,
              svg: options.svg,
              clientX: options.clientX,
              clientY: options.clientY,
              hasGetParentNodeForAutolayout: typeof options.getParentNodeForAutolayout,
              snapStep: options.snapStep,
              hasShowReorderIndicator: typeof options.showReorderIndicator,
              hasClearReorderIndicator: typeof options.clearReorderIndicator,
              hasResolveSnap: typeof options.resolveSnap,
              hasRenderGuideLines: typeof options.renderGuideLines,
              hasClampDragDelta: typeof options.clampDragDelta,
              hasSetOverride: typeof options.setOverride,
              hasApplyAllOverrides: typeof options.applyAllOverrides,
              hasUpdateInspector: typeof options.updateInspector,
              shouldUpdateInspector: options.shouldUpdateInspector,
            });
            return { kind: "autolayout", moved: true, appliedIds: [], guideLineCount: 0 };
          },
          clampPreviewDragDeltaWithinParent() {
            return { dx: 0, dy: 0 };
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "onDragMove", "(e)"),
    "this.__loaded = { onDragMove };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      onDragMove: (event: Record<string, unknown>) => void;
    };
  }).__loaded;

  loaded.onDragMove({
    clientX: 120,
    clientY: 80,
  });

  assert.deepEqual(normalizeVmValue(capturedCalls), [
    {
      kind: "runtimeDragMove",
      clientX: 120,
      clientY: 80,
    },
  ]);
});

test("editor interaction helper accepts the namespaced previewShell.interaction contract", () => {
  const source = readPreviewScript("editor.js");
  const context = {
    console,
    window: {
      __DG_getPreviewShellInteractionContract() {
        return context.LayoutEngine.previewShell.interaction;
      },
    },
    selectedIds: new Set(["alpha"]),
    LayoutEngine: {
      previewShell: {
        interaction: {
          resolvePrimarySelectedId(ids: Set<string>, preferredCid?: string | null) {
            return preferredCid || [...ids][0] || null;
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "getPrimarySelectedId", "(preferredCid)"),
    "this.__loaded = { getPrimarySelectedId };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      getPrimarySelectedId: (preferredCid?: string | null) => string | null;
    };
  }).__loaded;

  assert.equal(loaded.getPrimarySelectedId("beta"), "beta");
  assert.equal(loaded.getPrimarySelectedId(null), "alpha");
});

test("editor keyboard helper accepts the namespaced previewShell.interaction contract", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    document: { tagName: "document" },
    selectedIds: new Set(["alpha"]),
    selectionDepth: 1,
    mgr: {
      isBusy: false,
      isMode() {
        return false;
      },
    },
    InteractionMode: {
      TEXT_EDITING: "TEXT_EDITING",
      DRAGGING: "DRAGGING",
      RESIZING: "RESIZING",
    },
    PreviewSaveClient: {
      trySaveIfDirty() {},
    },
    EditorState: {
      undo() {
        return Promise.resolve();
      },
      redo() {
        return Promise.resolve();
      },
      captureOverrideEntries() {
        return [];
      },
      commitOverridePatchAction() {},
    },
    _applyUndoCommand: {},
    deleteSelectedFrames() {},
    cancelTextEdit() {},
    clearGuideLines() {},
    onDragMove() {},
    onDragUp() {},
    onResizeMove() {},
    onResizeUp() {},
    cycleGuideMode() {},
    getParentNode() {
      return null;
    },
    model: {
      get() {
        return { children: [] };
      },
    },
    getAncestors() {
      return [];
    },
    selectComponent() {},
    _applySelectionStateSnapshot() {},
    getOwnDelta() {
      return { dx: 0, dy: 0, dw: 0, dh: 0 };
    },
    _applyInteractionOverrideEntries() {},
    applyAllOverrides() {},
    showResizeHandles() {},
    renderSelectionInspector() {},
    _isAutolayoutChild() {
      return false;
    },
    _getKeyboardRuntime() {
      return context.window.__DG_getPreviewShellInteractionContract()
        .createPreviewKeyboardRuntimeFromHost({
          document: context.document,
          selectedIds: context.selectedIds,
          selectionDepthState: {
            get: () => context.selectionDepth,
          },
          interactionManager: context.mgr,
          interactionModes: context.InteractionMode,
          isAutolayoutChild: context._isAutolayoutChild,
          save: () => context.PreviewSaveClient.trySaveIfDirty(),
          undo: () => context.EditorState.undo(context._applyUndoCommand),
          redo: () => context.EditorState.redo(context._applyUndoCommand),
          deleteSelection: () => context.deleteSelectedFrames(),
          cancelTextEdit: context.cancelTextEdit,
          clearGuideLines: context.clearGuideLines,
          onDragMove: context.onDragMove,
          onDragUp: context.onDragUp,
          onResizeMove: context.onResizeMove,
          onResizeUp: context.onResizeUp,
          cycleGuideMode: context.cycleGuideMode,
          model: context.model,
          getParentId: (id: string) => context.getParentNode(id)?.id || null,
          getAncestorDepth: (id: string) => context.getAncestors(id).length,
          selectComponent: (id: string) => context.selectComponent(id),
          applySelectionState: (nextState: unknown, preferredId?: string) => (
            context._applySelectionStateSnapshot(nextState, preferredId)
          ),
          captureOverrideEntries: (ids: string[]) => context.EditorState.captureOverrideEntries(ids),
          commitOverridePatchAction: (label: string, beforeEntries: unknown, afterEntries: unknown) => {
            context.EditorState.commitOverridePatchAction(label, beforeEntries, afterEntries);
          },
          getOwnDelta: context.getOwnDelta,
          applyInteractionOverrideEntries: context._applyInteractionOverrideEntries,
          applyAllOverrides: context.applyAllOverrides,
          showResizeHandles: context.showResizeHandles,
          renderSelectionInspector: context.renderSelectionInspector,
        });
    },
    window: {
      __DG_getPreviewShellInteractionContract() {
        return context.LayoutEngine.previewShell.interaction;
      },
    },
    LayoutEngine: {
      previewShell: {
        interaction: {
          dispatchPreviewKeyboardShortcut(options: Record<string, unknown>) {
            capturedCalls.push({
              eventKey: options.event?.key,
              selectedIds: Array.from(options.selectedIds as Set<string> | string[]),
              selectionDepth: options.selectionDepth,
              hasInteractionManager: typeof options.interactionManager?.isMode,
              textMode: options.interactionModes?.TEXT_EDITING,
              hasSave: typeof options.save,
              hasUndo: typeof options.undo,
              hasRedo: typeof options.redo,
              hasDeleteSelection: typeof options.deleteSelection,
              hasClearGuideLines: typeof options.clearGuideLines,
              hasApplyAllOverrides: typeof options.applyAllOverrides,
              hasRenderSelectionInspector: typeof options.renderSelectionInspector,
            });
          },
          createPreviewKeyboardRuntimeFromHost(options: Record<string, unknown>) {
            return {
              onDocumentKeyDown(event: Record<string, unknown>) {
                capturedCalls.push({
                  eventKey: event?.key,
                  selectedIds: Array.from(options.selectedIds as Set<string> | string[]),
                  selectionDepth: options.selectionDepthState?.get?.(),
                  hasInteractionManager: typeof options.interactionManager?.isMode,
                  textMode: options.interactionModes?.TEXT_EDITING,
                  hasSave: typeof options.save,
                  hasUndo: typeof options.undo,
                  hasRedo: typeof options.redo,
                  hasDeleteSelection: typeof options.deleteSelection,
                  hasClearGuideLines: typeof options.clearGuideLines,
                  hasApplyAllOverrides: typeof options.applyAllOverrides,
                  hasRenderSelectionInspector: typeof options.renderSelectionInspector,
                });
              },
            };
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "onDocumentKeyDown", "(e)"),
    "this.__loaded = { onDocumentKeyDown };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      onDocumentKeyDown: (event: Record<string, unknown>) => void;
    };
  }).__loaded;

  loaded.onDocumentKeyDown({
    key: "s",
    target: { tagName: "DIV", isContentEditable: false },
    preventDefault() {},
  });

  assert.deepEqual(normalizeVmValue(capturedCalls), [
    {
      eventKey: "s",
      selectedIds: ["alpha"],
      selectionDepth: 1,
      hasInteractionManager: "function",
      textMode: "TEXT_EDITING",
      hasSave: "function",
      hasUndo: "function",
      hasRedo: "function",
      hasDeleteSelection: "function",
      hasClearGuideLines: "function",
      hasApplyAllOverrides: "function",
      hasRenderSelectionInspector: "function",
    },
  ]);
});

test("editor delete helpers accept the namespaced previewShell.interaction contract", async () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    _getEditorSceneFacade() {
      return {
        async deleteSelectedFrames() {
          capturedCalls.push({
            kind: "deletePreviewSelectedFramesHost",
            hasGetFrameTreeJson: "function",
            rootNodeIds: ["page-root"],
            fallbackRootId: "page",
            isTextEditing: false,
            hasGetNode: "function",
            hasRerenderStage: "function",
            hasDeselectAll: "function",
          });
          capturedCalls.push({ kind: "rerenderStageFromModel" });
          return { rerendered: true };
        },
      };
    },
    model: {
      roots: [{ id: "page-root" }],
      removedIds: new Set<string>(),
      get(id: string) {
        return { id };
      },
      clearOverride() {},
    },
    selectedIds: new Set(["alpha"]),
    mgr: {
      isMode() {
        return false;
      },
    },
    InteractionMode: {
      TEXT_EDITING: "TEXT_EDITING",
    },
    overrides: {},
    setDirty() {},
    _rerenderStageFromModel() {
      capturedCalls.push({ kind: "rerenderStageFromModel" });
      return Promise.resolve(true);
    },
    deselectAll() {},
    EditorState: {
      beginUndoableAction() {
        return {};
      },
      commitUndoableAction() {},
    },
    alert() {},
    window: {
      __DG_getPreviewShellInteractionContract() {
        return context.LayoutEngine.previewShell.interaction;
      },
      __DG_getPreviewShellSceneContract() {
        return context.LayoutEngine.previewShell.scene;
      },
      __DG_getPreviewBridgeRenderContract() {
        return context.LayoutEngine.previewBridge.render;
      },
      __DG_getPreviewBridgeHostContract() {
        return context.LayoutEngine.previewBridge.host;
      },
    },
    LayoutEngine: {
      previewBridge: {
        host: {
          getFrameTreeJson() {
            return { root: { id: "tree-root" } };
          },
        },
        render: {
          renderFreshPreviewSvg() {
            return Promise.resolve({ svg: { tagName: "svg" } });
          },
        },
      },
      previewShell: {
        interaction: {
          deletePreviewSelectedFramesHost(options: Record<string, unknown>) {
            capturedCalls.push({
              kind: "deletePreviewSelectedFramesHost",
              hasGetFrameTreeJson: typeof options.getFrameTreeJson,
              rootNodeIds: Array.from(options.rootNodes as Array<{ id: string }>).map((node) => node.id),
              fallbackRootId: options.fallbackRootId,
              isTextEditing: options.isTextEditing,
              hasGetNode: typeof options.getNode,
              hasRerenderStage: typeof options.rerenderStage,
              hasDeselectAll: typeof options.deselectAll,
            });
            return Promise.resolve().then(async () => {
              await options.rerenderStage();
              return { rerendered: true };
            });
          },
        },
        scene: {
          rerenderPreviewStageFromModelHost() {
            capturedCalls.push({ kind: "rerenderPreviewStageFromModelHost" });
            return Promise.resolve(true);
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "_getPreviewBridgeHostContract", "()"),
    extractNamedFunctionSource(source, "_readFrameTreeJson", "()"),
    extractNamedFunctionSource(source, "deleteSelectedFrames", "()").replace(/^function /, "async function "),
    "this.__loaded = { deleteSelectedFrames };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      deleteSelectedFrames: () => Promise<boolean>;
    };
  }).__loaded;

  assert.equal(await loaded.deleteSelectedFrames(), true);
  assert.deepEqual(normalizeVmValue(capturedCalls), [
    {
      kind: "deletePreviewSelectedFramesHost",
      hasGetFrameTreeJson: "function",
      rootNodeIds: ["page-root"],
      fallbackRootId: "page",
      isTextEditing: false,
      hasGetNode: "function",
      hasRerenderStage: "function",
      hasDeselectAll: "function",
    },
    {
      kind: "rerenderStageFromModel",
    },
  ]);
});

test("editor stage-binding helper accepts the namespaced previewShell.interaction contract", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    _getStageBindingRuntime() {
      return {
        bindInteraction() {
          capturedCalls.push({ kind: "runtimeBindInteraction" });
          return { tagName: "svg" };
        },
      };
    },
    window: {
      __DG_getPreviewShellInteractionContract() {
        return context.LayoutEngine.previewShell.interaction;
      },
    },
    LayoutEngine: {
      previewShell: {
        interaction: {
          bindPreviewStageSvgInteractionHost(options: Record<string, unknown>) {
            capturedCalls.push({
              previousSvg: options.previousSvg,
              suppressHover: options.suppressHover,
              selectionDepth: options.selectionDepth,
              hasOnMouseDown: typeof options.onMouseDown,
              hasOnDoubleClick: typeof options.onDoubleClick,
              hasFindArrowAtPoint: typeof options.findArrowAtPoint,
              hasFindComponentAtDepth: typeof options.findComponentAtDepth,
              hasSyncHoverState: typeof options.syncHoverState,
              hasClearHoverState: typeof options.clearHoverState,
              hasEnsureArrowHitAreas: typeof options.ensureArrowHitAreas,
              hasRebuildTreeUi: typeof options.rebuildTreeUi,
            });
            return { tagName: "svg" };
          },
          syncPreviewSvgHoverState() {},
          clearPreviewSvgHoverState() {},
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "bindInteraction", "()"),
    "this.__loaded = { bindInteraction };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      bindInteraction: () => void;
    };
  }).__loaded;

  loaded.bindInteraction();

  assert.deepEqual(normalizeVmValue(capturedCalls), [
    { kind: "runtimeBindInteraction" },
  ]);
});

test("editor selection chrome helpers accept the namespaced previewShell.interaction contract", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    _getSelectionChromeRuntime() {
      return {
        showResizeHandles(cid: string) {
          capturedCalls.push({ kind: "runtimeShowResizeHandles", cid });
          return true;
        },
        removeResizeHandles() {
          capturedCalls.push({ kind: "runtimeRemoveResizeHandles" });
        },
      };
    },
    _getArrowWaypointRuntime() {
      return {
        getArrowPoints(cid: string) {
          capturedCalls.push({ kind: "runtimeGetArrowPoints", cid });
          return [[4, 8], [20, 24]];
        },
        updateArrowVisual(cid: string) {
          capturedCalls.push({ kind: "runtimeUpdateArrowVisual", cid });
        },
        rebuildArrowSvg(cid: string) {
          capturedCalls.push({ kind: "runtimeRebuildArrowSvg", cid });
        },
      };
    },
    window: {
      __DG_getPreviewShellInteractionContract() {
        return context.LayoutEngine.previewShell.interaction;
      },
    },
    _getStageBindingRuntime() {
      return {
        buildTreeUi() {
          capturedCalls.push({ kind: "runtimeBuildTreeUi" });
          return true;
        },
      };
    },
    LayoutEngine: {
      previewShell: {
        interaction: {
          showPreviewResizeHandlesHost(options: Record<string, unknown>) {
            capturedCalls.push({
              kind: "showPreviewResizeHandlesHost",
              componentId: options.componentId,
              selectedCount: options.selectedCount,
              singleBounds: options.singleBounds,
              componentType: options.componentType,
              hasClearHandlesByClass: typeof options.clearHandlesByClass,
              hasResolveHandlePlan: typeof options.resolveHandlePlan,
              hasRenderResizeHandles: typeof options.renderResizeHandles,
              hasShowArrowWaypointHandles: typeof options.showArrowWaypointHandles,
              handleSize: options.handleSize,
            });
            return true;
          },
          removePreviewHandlesHost(options: Record<string, unknown>) {
            capturedCalls.push({
              kind: "removePreviewHandlesHost",
              hasClearHandlesByClass: typeof options.clearHandlesByClass,
            });
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "showResizeHandles", "(cid)"),
    extractNamedFunctionSource(source, "removeResizeHandles", "()"),
    extractNamedFunctionSource(source, "getArrowPoints", "(cid)"),
    extractNamedFunctionSource(source, "updateArrowVisual", "(cid)"),
    extractNamedFunctionSource(source, "rebuildArrowSVG", "(cid)"),
    "this.__loaded = { showResizeHandles, removeResizeHandles, getArrowPoints, updateArrowVisual, rebuildArrowSVG };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      showResizeHandles: (cid: string) => void;
      removeResizeHandles: () => void;
      getArrowPoints: (cid: string) => unknown;
      updateArrowVisual: (cid: string) => void;
      rebuildArrowSVG: (cid: string) => void;
    };
  }).__loaded;

  loaded.showResizeHandles("alpha");
  loaded.removeResizeHandles();
  assert.deepEqual(normalizeVmValue(loaded.getArrowPoints("alpha")), [[4, 8], [20, 24]]);
  loaded.updateArrowVisual("alpha");
  loaded.rebuildArrowSVG("alpha");

    assert.deepEqual(normalizeVmValue(capturedCalls), [
    {
      kind: "runtimeShowResizeHandles",
      cid: "alpha",
    },
    { kind: "runtimeRemoveResizeHandles" },
    { kind: "runtimeGetArrowPoints", cid: "alpha" },
    { kind: "runtimeUpdateArrowVisual", cid: "alpha" },
    { kind: "runtimeRebuildArrowSvg", cid: "alpha" },
  ]);
});

test("editor selection UI helpers accept the namespaced previewShell.interaction contract", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    document: { tagName: "document" },
    selectedIds: new Set(["alpha"]),
    selectionDepth: 1,
    removeResizeHandles() {},
    showResizeHandles() {},
    renderEmptyInspector() {},
    renderSelectionInspector() {},
    _getSelectionRuntime() {
      return {
        applySelectionStateSnapshot(nextState: Record<string, unknown>, preferredCid?: string | null) {
          capturedCalls.push({
            kind: "apply",
            nextState,
            preferredId: preferredCid,
            setSelectionDepth() {},
            syncSelectionUi() {},
          });
        },
        syncSelectionUi(preferredCid?: string | null) {
          capturedCalls.push({
            kind: "sync",
            preferredId: preferredCid,
            resolvePrimaryId() {},
            syncTreeSelectionState() {},
            selectedIds: context.selectedIds,
          });
        },
      };
    },
    getPrimarySelectedId(preferredCid?: string | null) {
      return preferredCid || "alpha";
    },
    window: {
      __DG_getPreviewShellInteractionContract() {
        return context.LayoutEngine.previewShell.interaction;
      },
      __DG_getPreviewShellSceneContract() {
        return context.LayoutEngine.previewShell.scene;
      },
    },
    LayoutEngine: {
      previewShell: {
        interaction: {
          applyPreviewSelectionStateSnapshot(options: Record<string, unknown>) {
            capturedCalls.push({ kind: "apply", ...options });
          },
          syncPreviewSelectionUi(options: Record<string, unknown>) {
            capturedCalls.push({ kind: "sync", ...options });
          },
        },
        scene: {
          syncPreviewTreeSelectionState() {},
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "_applySelectionStateSnapshot", "(nextState, preferredCid)"),
    extractNamedFunctionSource(source, "_syncSelectionUi", "(preferredCid)"),
    "this.__loaded = { _applySelectionStateSnapshot, _syncSelectionUi };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      _applySelectionStateSnapshot: (nextState: Record<string, unknown>, preferredCid?: string | null) => void;
      _syncSelectionUi: (preferredCid?: string | null) => void;
    };
  }).__loaded;

  loaded._applySelectionStateSnapshot({ selectedIds: ["beta"], selectionDepth: 3 }, "beta");
  loaded._syncSelectionUi("beta");

  assert.equal(capturedCalls.length, 2);
  assert.deepEqual(normalizeVmValue({
    firstKind: capturedCalls[0]?.kind,
    firstPreferredId: capturedCalls[0]?.preferredId,
    firstHasSetSelectionDepth: typeof capturedCalls[0]?.setSelectionDepth,
    firstHasSyncSelectionUi: typeof capturedCalls[0]?.syncSelectionUi,
    secondKind: capturedCalls[1]?.kind,
    secondPreferredId: capturedCalls[1]?.preferredId,
    secondHasResolvePrimaryId: typeof capturedCalls[1]?.resolvePrimaryId,
    secondHasSyncTreeSelectionState: typeof capturedCalls[1]?.syncTreeSelectionState,
    secondSelectedIds: Array.from((capturedCalls[1]?.selectedIds as Set<string>) || []),
  }), {
    firstKind: "apply",
    firstPreferredId: "beta",
    firstHasSetSelectionDepth: "function",
    firstHasSyncSelectionUi: "function",
    secondKind: "sync",
    secondPreferredId: "beta",
    secondHasResolvePrimaryId: "function",
    secondHasSyncTreeSelectionState: "function",
    secondSelectedIds: ["alpha"],
  });
});

test("editor tree-selection host helpers accept the namespaced previewShell.interaction contract", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    document: {
      getElementById(id: string) {
        return id === "tree" ? { id } : null;
      },
    },
    model: {
      _roots: [{ data: { id: "alpha" } }, { data: { id: "beta" } }],
    },
    overrides: { beta: { dx: 8 } },
    selectedIds: new Set(["alpha"]),
    selectionDepth: 2,
    getAncestors(id: string) {
      return id === "beta" ? ["root", "group"] : [];
    },
    _applySelectionStateSnapshot(nextState: Record<string, unknown>, preferredCid?: string | null) {
      capturedCalls.push({
        kind: "applySnapshot",
        nextState,
        preferredCid,
      });
    },
    deleteSelectedFrames() {
      capturedCalls.push({ kind: "deleteSelectedFrames" });
      return Promise.resolve(true);
    },
    _getSelectionRuntime() {
      return {
        deselectAll() {
          capturedCalls.push({
            kind: "clearSelection",
            selectedIds: context.selectedIds,
            selectionDepth: context.selectionDepth,
          });
          capturedCalls.push({
            kind: "applySelectionState",
            nextState: { selectedIds: [], selectionDepth: 0 },
          });
        },
        selectComponent(cid: string, additive: boolean) {
          capturedCalls.push({
            kind: "resolveSelection",
            cid,
            additive,
            getAncestorDepth() {},
          });
          capturedCalls.push({
            kind: "applySelectionState",
            preferredCid: cid,
            nextState: { selectedIds: [cid], selectionDepth: 2 },
          });
        },
      };
    },
    _getStageBindingRuntime() {
      return {
        buildTreeUi() {
          capturedCalls.push({ kind: "runtimeBuildTreeUi" });
          return true;
        },
      };
    },
    window: {
      __DG_getPreviewShellInteractionContract() {
        return context.LayoutEngine.previewShell.interaction;
      },
    },
    LayoutEngine: {
      previewShell: {
        interaction: {
          renderPreviewTreeSelectionHost(options: Record<string, unknown>) {
            capturedCalls.push({ kind: "renderTree", ...options });
          },
          clearPreviewSelectionState(options: Record<string, unknown>) {
            capturedCalls.push({ kind: "clearSelection", ...options });
            return { selectedIds: [], selectionDepth: 0 };
          },
          resolvePreviewComponentSelectionState(options: Record<string, unknown>) {
            capturedCalls.push({ kind: "resolveSelection", ...options });
            return { selectedIds: [options.cid], selectionDepth: 2 };
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "buildTreeUI", "()"),
    extractNamedFunctionSource(source, "deselectAll", "()"),
    extractNamedFunctionSource(source, "selectComponent", "(cid, additive)"),
    "this.__loaded = { buildTreeUI, deselectAll, selectComponent };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      buildTreeUI: () => void;
      deselectAll: () => void;
      selectComponent: (cid: string, additive: boolean) => void;
    };
  }).__loaded;

  loaded.buildTreeUI();
  loaded.deselectAll();
  loaded.selectComponent("beta", false);

  assert.deepEqual(normalizeVmValue({
    renderKind: capturedCalls[0]?.kind,
    clearKind: capturedCalls[1]?.kind,
    clearSelectedIds: Array.from((capturedCalls[1]?.selectedIds as Set<string>) || []),
    clearSelectionDepth: capturedCalls[1]?.selectionDepth,
    clearAppliedKind: capturedCalls[2]?.kind,
    clearAppliedState: capturedCalls[2]?.nextState,
    resolveKind: capturedCalls[3]?.kind,
    resolveCid: capturedCalls[3]?.cid,
    resolveAdditive: capturedCalls[3]?.additive,
    resolveHasAncestorDepth: typeof capturedCalls[3]?.getAncestorDepth,
    resolveAppliedKind: capturedCalls[4]?.kind,
    resolveAppliedPreferredCid: capturedCalls[4]?.preferredCid,
    resolveAppliedState: capturedCalls[4]?.nextState,
  }), {
    renderKind: "runtimeBuildTreeUi",
    clearKind: "clearSelection",
    clearSelectedIds: ["alpha"],
    clearSelectionDepth: 2,
    clearAppliedKind: "applySelectionState",
    clearAppliedState: { selectedIds: [], selectionDepth: 0 },
    resolveKind: "resolveSelection",
    resolveCid: "beta",
    resolveAdditive: false,
    resolveHasAncestorDepth: "function",
    resolveAppliedKind: "applySelectionState",
    resolveAppliedPreferredCid: "beta",
    resolveAppliedState: { selectedIds: ["beta"], selectionDepth: 2 },
  });
});

