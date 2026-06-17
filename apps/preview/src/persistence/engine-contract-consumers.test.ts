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
            return layoutEngine === "elk-layered" ? { id: "elk-layered" } : null;
          },
          getPreviewEngine(id: string) {
            if (id !== "elk-layered") return null;
            return {
              id,
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
            };
          },
        },
        elk: {
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
  const elkLayoutControls = (context.window as { ElkLayoutControls: { buildPanel: (frameTreeJson: unknown) => void } }).ElkLayoutControls;

  elkLayoutControls.buildPanel({ layoutEngine: "elk-layered", elkLayout: {} });

  assert.equal(section.hidden, false);
  assert.match(container.innerHTML, /Node spacing/);
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
            return layoutEngine === "elk-layered" ? { id: "elk-layered" } : null;
          },
        },
      },
    },
  };

  vm.runInNewContext(readPreviewScript("elk-controller.js"), context);
  const elkPreviewController = (context.window as { ElkPreviewController: { isElkLayeredDiagram: (frameTreeJson: unknown) => boolean } }).ElkPreviewController;

  assert.equal(elkPreviewController.isElkLayeredDiagram({ layoutEngine: "elk-layered" }), true);
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
    window: {
      __DG_getPreviewBridgeRelayoutContract() {
        return context.LayoutEngine.previewBridge.relayout;
      },
    },
    overrides: { alpha: { dx: 8 } },
    replaced: null as Record<string, unknown> | null,
    cleaned: [] as string[],
    model: {
      cleanOverride(id: string) {
        context.cleaned.push(id);
      },
    },
    replaceOverrides(nextOverrides: Record<string, unknown>) {
      context.replaced = nextOverrides;
      context.overrides = nextOverrides;
      return nextOverrides;
    },
    LayoutEngine: {
      previewBridge: {
        relayout: {
          restorePreviewOverrideEntries({ currentOverrides, entries }: { currentOverrides: Record<string, unknown>; entries: Record<string, unknown> }) {
            return { ...currentOverrides, ...entries, restored: true };
          },
        },
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

  assert.deepEqual(normalizeVmValue(context.replaced), {
    alpha: { dx: 8 },
    beta: { dy: 12 },
    restored: true,
  });
  assert.deepEqual(context.cleaned, ["beta"]);
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

test("editor relayout status helper accepts the namespaced previewBridge.relayout contract", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    _v3RelayoutRuntime: {
      lastMode: "local",
      lastReason: "ready",
      sequence: 2,
    },
    getLocalRelayoutStatus() {
      return { ready: true, reason: "ready" };
    },
    window: {
      __DG_getPreviewBridgeRelayoutContract() {
        return context.LayoutEngine.previewBridge.relayout;
      },
    },
    LayoutEngine: {
      previewBridge: {
        relayout: {
          resolvePreviewV3RelayoutStatus(options: Record<string, unknown>) {
            capturedCalls.push(options);
            return { localReady: true, local: { reason: "ready" }, frameManaged: true };
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "getV3RelayoutStatus", "()"),
    "this.__loaded = { getV3RelayoutStatus };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      getV3RelayoutStatus: () => Record<string, unknown>;
    };
  }).__loaded;

  assert.deepEqual(
    normalizeVmValue(loaded.getV3RelayoutStatus()),
    { localReady: true, local: { reason: "ready" }, frameManaged: true },
  );
  assert.deepEqual(normalizeVmValue(capturedCalls), [
    {
      runtimeState: {
        lastMode: "local",
        lastReason: "ready",
        sequence: 2,
      },
    },
  ]);
  assert.equal(typeof capturedCalls[0]?.getLocalRelayoutStatus, "function");
});

test("editor relayout lifecycle helpers accept the namespaced previewBridge.relayout contract", async () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    _v3RelayoutRuntime: {
      lastMode: "not-run",
      lastReason: "not-run",
      sequence: 0,
    },
    overrides: {
      alpha: { dx: 8 },
    },
    buildTreeUI() {},
    applyWaypointOverrides() {},
    bindInteraction() {},
    applyAllOverrides() {},
    reapplySelection() {},
    refreshV3GridInfoFromLayout() {},
    renderGridOverlay() {},
    renderSelectionInspector() {},
    updateOverrideSummary() {},
    refreshTreeColors() {},
    runConstraints() {},
    setStatus() {},
    getV3RelayoutStatus() {
      return { local: { reason: "ready" } };
    },
    _failV3Relayout(reason: string, triggerCid: string) {
      return { reason, triggerCid };
    },
    window: {
      __DG_getPreviewBridgeRelayoutContract() {
        return context.LayoutEngine.previewBridge.relayout;
      },
    },
    LayoutEngine: {
      previewBridge: {
        relayout: {
          dispatchPreviewRelayoutSuccessHost(options: Record<string, unknown>) {
            capturedCalls.push({
              triggerCid: options.triggerCid,
              result: options.result,
              executionLabel: options.executionLabel,
              runtimeState: options.runtimeState,
              hasGetRelayoutStatus: typeof options.getRelayoutStatus,
              hasFailRelayout: typeof options.failRelayout,
              hasBuildTreeUi: typeof options.buildTreeUi,
              hasApplyWaypointOverrides: typeof options.applyWaypointOverrides,
              hasBindInteraction: typeof options.bindInteraction,
              hasApplyAllOverrides: typeof options.applyAllOverrides,
              hasReapplySelection: typeof options.reapplySelection,
              hasRefreshGridInfo: typeof options.refreshGridInfo,
              hasRenderGridOverlay: typeof options.renderGridOverlay,
              hasRenderSelectionInspector: typeof options.renderSelectionInspector,
              hasUpdateOverrideSummary: typeof options.updateOverrideSummary,
              hasRefreshTreeColors: typeof options.refreshTreeColors,
              hasRunConstraints: typeof options.runConstraints,
              hasSetStatus: typeof options.setStatus,
            });
            return true;
          },
        },
      },
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
      runtimeState: {
        lastMode: "not-run",
        lastReason: "not-run",
        sequence: 0,
      },
      hasGetRelayoutStatus: "function",
      hasFailRelayout: "function",
      hasBuildTreeUi: "function",
      hasApplyWaypointOverrides: "function",
      hasBindInteraction: "function",
      hasApplyAllOverrides: "function",
      hasReapplySelection: "function",
      hasRefreshGridInfo: "function",
      hasRenderGridOverlay: "function",
      hasRenderSelectionInspector: "function",
      hasUpdateOverrideSummary: "function",
      hasRefreshTreeColors: "function",
      hasRunConstraints: "function",
      hasSetStatus: "function",
    },
  ]);
});

test("editor arrow-point helper accepts the namespaced previewShell.interaction contract", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    window: {
      __DG_getPreviewShellInteractionContract() {
        return context.LayoutEngine.previewShell.interaction;
      },
      __DG_getPreviewBridgeRenderContract() {
        return context.LayoutEngine.previewBridge.render;
      },
    },
    document: {
      querySelector(selector: string) {
        return selector === "#stage svg" ? { tagName: "svg" } : null;
      },
    },
    getArrowNode(cid: string) {
      return cid === "arrow-1" ? { id: cid } : null;
    },
    LayoutEngine: {
      previewShell: {
        interaction: {
          readPreviewArrowPointsHost(options: Record<string, unknown>) {
            capturedCalls.push({
              kind: "readPreviewArrowPointsHost",
              componentId: options.componentId,
              hasReadArrowEndpoints: typeof options.readArrowEndpoints,
              hasArrowNode: options.hasArrowNode,
            });
            return [{ x: 1, y: 2 }];
          },
        },
      },
      previewBridge: {
        render: {
          readPreviewArrowEndpoints() {
            return [{ x: 1, y: 2 }];
          },
        },
      },
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
      kind: "readPreviewArrowPointsHost",
      componentId: "arrow-1",
      hasReadArrowEndpoints: "function",
      hasArrowNode: true,
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
    getV3RelayoutStatus() {
      return { localReady: true };
    },
    getOwnDelta() {
      return { dx: 0, dy: 0, dw: 0, dh: 0 };
    },
    getEffectiveDelta() {
      return { dx: 8, dy: 0, dw: 0, dh: 0 };
    },
    showResizeHandles() {},
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
  const context = {
    console,
    window: {
      __DG_getPreviewBridgeRenderContract() {
        return context.LayoutEngine.previewBridge.render;
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
          async renderFreshPreviewSvg(options: Record<string, unknown>) {
            return {
              svg: { tagName: "svg" },
              width: 640,
              height: 480,
              coerced: new Map(),
            };
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
    "refreshV3GridInfoFromLayout",
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

test("editor grid overlay helper accepts the namespaced previewShell.scene contract", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    guideMode: "grid",
    gridInfo: { cols: 8 },
    BASELINE_STEP: 24,
    document: {},
    window: {
      __DG_getPreviewShellSceneContract() {
        return context.LayoutEngine.previewShell.scene;
      },
    },
    LayoutEngine: {
      previewShell: {
        scene: {
          renderPreviewGridOverlayHost(options: Record<string, unknown>) {
            capturedCalls.push({
              guideMode: options.guideMode,
              gridInfo: options.gridInfo,
              baselineStep: options.baselineStep,
              hasCreateScene: typeof options.createScene,
            });
          },
          createPreviewGridOverlayScene() {
            return { shapes: [] };
          },
        },
      },
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
      guideMode: "grid",
      gridInfo: { cols: 8 },
      baselineStep: 24,
      hasCreateScene: "function",
    },
  ]);
});

test("editor grid-control helpers accept the namespaced previewShell.scene contract", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const badge = {
    className: "",
    textContent: "",
  };
  const gridRowsInput = {
    value: "",
  };
  let pendingAction: unknown = null;
  const context = {
    console,
    guideMode: "off",
    GUIDE_MODES: ["off", "all"],
    gridInfo: { _rows: 2 },
    BASELINE_STEP: 8,
    GRID_DEFAULTS: {
      margin_top: 24,
    },
    relayoutTimer: null,
    model: {
      gridOverrides: { rows: 3 },
      roots: [{ id: "root-1" }],
    },
    document: {
      activeElement: null,
      getElementById(id: string) {
        if (id === "guide-badge") return badge;
        if (id === "grid-rows") return gridRowsInput;
        if (id === "grid-margin-top") return null;
        return null;
      },
    },
    _gridEl(id: string) {
      return context.document.getElementById(id);
    },
    renderGridOverlay() {
      capturedCalls.push({ kind: "renderGridOverlay" });
    },
    setDirty() {},
    _pruneLinkedRootGridOverrides() {
      capturedCalls.push({ kind: "prune" });
    },
    requestV3Relayout(id: string) {
      capturedCalls.push({ kind: "requestV3Relayout", id });
      return Promise.resolve();
    },
    EditorState: {
      getPendingGridAction() {
        return pendingAction;
      },
      beginUndoableAction(label: string) {
        return { label };
      },
      setPendingGridAction(action: unknown) {
        pendingAction = action;
        capturedCalls.push({ kind: "setPendingGridAction", action });
      },
      commitUndoableAction(action: unknown) {
        capturedCalls.push({ kind: "commitUndoableAction", action });
      },
    },
    clearTimeout() {},
    setTimeout() {
      return 41;
    },
    window: {
      __DG_getPreviewShellSceneContract() {
        return context.LayoutEngine.previewShell.scene;
      },
    },
    LayoutEngine: {
      previewShell: {
        scene: {
          cyclePreviewGuideModeHost(options: Record<string, unknown>) {
            capturedCalls.push({
              kind: "cyclePreviewGuideModeHost",
              guideMode: options.guideMode,
              guideModes: options.guideModes,
              hasSetGuideMode: typeof options.setGuideMode,
              hasRenderGridOverlay: typeof options.renderGridOverlay,
            });
            options.setGuideMode("all");
            return "all";
          },
          populatePreviewGridControlsHost(options: Record<string, unknown>) {
            capturedCalls.push({
              kind: "populatePreviewGridControlsHost",
              gridInfo: options.gridInfo,
              gridOverrides: options.gridOverrides,
              hasDocument: typeof options.document,
            });
            return true;
          },
          dispatchPreviewGridControlChangeHost(options: Record<string, unknown>) {
            capturedCalls.push({
              kind: "dispatchPreviewGridControlChangeHost",
              gridInfo: options.gridInfo,
              baselineStep: options.baselineStep,
              rootId: options.rootId,
              hasDocument: typeof options.document,
              hasGetPendingAction: typeof options.getPendingAction,
              hasBeginPendingAction: typeof options.beginPendingAction,
              hasSetPendingAction: typeof options.setPendingAction,
              hasSetGridOverrides: typeof options.setGridOverrides,
              hasPruneLinkedRootOverrides: typeof options.pruneLinkedRootOverrides,
              hasSetDirty: typeof options.setDirty,
              hasRequestRelayout: typeof options.requestRelayout,
              hasCommitPendingAction: typeof options.commitPendingAction,
              hasSetOverlayGridInfo: typeof options.setOverlayGridInfo,
              hasSetRowsControlValue: typeof options.setRowsControlValue,
              hasRenderGridOverlay: typeof options.renderGridOverlay,
            });
            return { kind: "applied" };
          },
        },
      },
    },
  };

  const helperSource = [
    "let relayoutTimer = null;",
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

  assert.equal(context.guideMode, "all");
  assert.deepEqual(normalizeVmValue(capturedCalls), [
    {
      kind: "cyclePreviewGuideModeHost",
      guideMode: "off",
      guideModes: ["off", "all"],
      hasSetGuideMode: "function",
      hasRenderGridOverlay: "function",
    },
    {
      kind: "populatePreviewGridControlsHost",
      gridInfo: { _rows: 2 },
      gridOverrides: { rows: 3 },
      hasDocument: "object",
    },
    {
      kind: "dispatchPreviewGridControlChangeHost",
      gridInfo: { _rows: 2 },
      baselineStep: 8,
      rootId: "root-1",
      hasDocument: "object",
      hasGetPendingAction: "function",
      hasBeginPendingAction: "function",
      hasSetPendingAction: "function",
      hasSetGridOverrides: "function",
      hasPruneLinkedRootOverrides: "function",
      hasSetDirty: "function",
      hasRequestRelayout: "function",
      hasCommitPendingAction: "function",
      hasSetOverlayGridInfo: "function",
      hasSetRowsControlValue: "function",
      hasRenderGridOverlay: "function",
    },
  ]);
});

test("editor constraint helper accepts the namespaced previewShell.scene contract", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
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
  assert.deepEqual(normalizeVmValue({
    kind: capturedCalls[0]?.kind,
    selectionDepth: capturedCalls[0]?.selectionDepth,
    selectedIds: Array.from((capturedCalls[0]?.selectedIds as Set<string>) || []),
    hasFindEditableTextTarget: typeof capturedCalls[0]?.findEditableTextTarget,
    hasResolveEditableComponentId: typeof capturedCalls[0]?.resolveEditableComponentId,
    hasGetAncestors: typeof capturedCalls[0]?.getAncestors,
    hasSetSelectionDepth: typeof capturedCalls[0]?.setSelectionDepth,
    hasSelectComponent: typeof capturedCalls[0]?.selectComponent,
    hasStartTextEdit: typeof capturedCalls[0]?.startTextEdit,
    hasFindComponentAtDepth: typeof capturedCalls[0]?.findComponentAtDepth,
    hasGetChildIds: typeof capturedCalls[0]?.getChildIds,
    hasApplySelectionState: typeof capturedCalls[0]?.applySelectionState,
  }), {
    kind: "handlePreviewDoubleClickSelectionHost",
    selectionDepth: 2,
    selectedIds: ["alpha"],
    hasFindEditableTextTarget: "function",
    hasResolveEditableComponentId: "function",
    hasGetAncestors: "function",
    hasSetSelectionDepth: "function",
    hasSelectComponent: "function",
    hasStartTextEdit: "function",
    hasFindComponentAtDepth: "function",
    hasGetChildIds: "function",
    hasApplySelectionState: "function",
  });
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
    _scheduleTextEditCommit() {},
    commitTextEdit() {},
    cancelTextEdit() {},
    removeResizeHandles() {
      capturedCalls.push({ kind: "removeResizeHandles" });
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
    extractNamedFunctionSource(source, "_suspendSelectionChromeForTextEdit", "(svg)"),
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
    _coercedKeys: new Set<string>(),
    overrides: { alpha: {}, beta: {} },
    gridInfo: { cols: 8 },
    _inspectorWidthUnit: "px",
    _inspectorHeightUnit: "px",
    BASELINE_STEP: 24,
    model: {
      get(id: string) {
        return { id };
      },
    },
    snapToGrid(value: number) {
      return value;
    },
    setDirty() {},
    EditorState: {
      captureOverrideEntries(ids: string[]) {
        return { ids };
      },
      commitOverridePatchAction() {},
    },
    _v3RelayoutTimer: null,
    requestV3Relayout() {
      return Promise.resolve(true);
    },
    renderSelectionInspector() {},
    renderMultiSelectionInspector() {},
    selectedIds: new Set(["alpha", "beta"]),
    getComponentType() {
      return "box";
    },
    _normaliseStyleName(value: string) {
      return value;
    },
    window: {
      __DG_getPreviewShellInspectorContract() {
        return context.LayoutEngine.previewShell.inspector;
      },
    },
    LayoutEngine: {
      previewShell: {
        inspector: {
          dispatchPreviewSingleFramePropHost(options: Record<string, unknown>) {
            capturedCalls.push({
              kind: "singleProp",
              cid: options.cid,
              prop: options.prop,
              value: options.value,
              hasCaptureOverrideEntries: typeof options.captureOverrideEntries,
              hasApplySingleFramePropMutation: typeof options.applySingleFramePropMutation,
              hasScheduleRelayout: typeof options.scheduleRelayout,
              hasRenderSelectionInspector: typeof options.renderSelectionInspector,
            });
          },
          dispatchPreviewMultiFrameSizeHost(options: Record<string, unknown>) {
            capturedCalls.push({
              kind: "multiSize",
              selectedIds: Array.from(options.selectedIds as Set<string> | string[]),
              dimension: options.dimension,
              value: options.value,
              widthUnit: options.widthUnit,
              heightUnit: options.heightUnit,
              baselineStep: options.baselineStep,
              hasResolveFrameSizePx: typeof options.resolveFrameSizePx,
              hasApplyMultiFrameSizeMutation: typeof options.applyMultiFrameSizeMutation,
              hasScheduleRelayout: typeof options.scheduleRelayout,
              hasRenderMultiSelectionInspector: typeof options.renderMultiSelectionInspector,
            });
          },
        },
      },
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
      hasCaptureOverrideEntries: "function",
      hasApplySingleFramePropMutation: "function",
      hasScheduleRelayout: "function",
      hasRenderSelectionInspector: "function",
    },
    {
      kind: "multiSize",
      selectedIds: ["alpha", "beta"],
      dimension: "width",
      value: 320,
      widthUnit: "px",
      heightUnit: "px",
      baselineStep: 24,
      hasResolveFrameSizePx: "function",
      hasApplyMultiFrameSizeMutation: "function",
      hasScheduleRelayout: "function",
      hasRenderMultiSelectionInspector: "function",
    },
  ]);
});

test("editor selection action helpers accept the namespaced previewShell.inspector contract", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    BASELINE_STEP: 24,
    multiActionGap: 17,
    EditorState: {
      captureOverrideEntries(ids: string[]) {
        return { ids };
      },
      commitOverridePatchAction() {},
    },
    setOverride() {},
    applyAllOverrides() {},
    reapplySelection() {},
    renderSelectionInspector() {},
    updateOverrideSummary() {},
    refreshTreeColors() {},
    runConstraints() {},
    getSelectionActionItems() {
      return {
        items: [{ id: "alpha" }, { id: "beta" }],
        sameParent: true,
        hasUnsupported: false,
      };
    },
    alert() {},
    window: {
      __DG_getPreviewShellInspectorContract() {
        return context.LayoutEngine.previewShell.inspector;
      },
      __DG_getPreviewShellInteractionContract() {
        return context.LayoutEngine.previewShell.interaction;
      },
    },
    LayoutEngine: {
      previewShell: {
        inspector: {
          dispatchPreviewApplySelectionTargetsHost(options: Record<string, unknown>) {
            capturedCalls.push({
              kind: "applyTargets",
              targets: options.targets,
              snapStep: options.snapStep,
              hasCaptureOverrideEntries: typeof options.captureOverrideEntries,
              hasCreateSelectionTargetOverrideEntries: typeof options.createSelectionTargetOverrideEntries,
              hasSetOverride: typeof options.setOverride,
              hasRunConstraints: typeof options.runConstraints,
            });
          },
          dispatchPreviewDistributeSelectionHost(options: Record<string, unknown>) {
            capturedCalls.push({
              kind: "distribute",
              axis: options.axis,
              currentGap: options.currentGap,
              snapStep: options.snapStep,
              hasNormalizeSelectionGap: typeof options.normalizeSelectionGap,
              hasSetGap: typeof options.setGap,
              hasResolveSelectionDistributeTargets: typeof options.resolveSelectionDistributeTargets,
              hasApplySelectionTargets: typeof options.applySelectionTargets,
            });
          },
          dispatchPreviewAlignSelectionHost(options: Record<string, unknown>) {
            capturedCalls.push({
              kind: "align",
              mode: options.mode,
              snapStep: options.snapStep,
              hasResolveSelectionAlignTargets: typeof options.resolveSelectionAlignTargets,
              hasApplySelectionTargets: typeof options.applySelectionTargets,
            });
          },
        },
        interaction: {
          createSelectionTargetOverrideEntries() {
            return [];
          },
          normalizeSelectionGap() {
            return 24;
          },
          resolveSelectionDistributeTargets() {
            return {};
          },
          resolveSelectionAlignTargets() {
            return {};
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "applySelectionTargets", "(items, targets)"),
    extractNamedFunctionSource(source, "distributeSelection", "(axis)"),
    extractNamedFunctionSource(source, "alignSelection", "(mode)"),
    "this.__loaded = { applySelectionTargets, distributeSelection, alignSelection };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      applySelectionTargets: (items: unknown[], targets: Record<string, unknown>) => void;
      distributeSelection: (axis: string) => void;
      alignSelection: (mode: string) => void;
    };
  }).__loaded;

  loaded.applySelectionTargets([{ id: "alpha" }], { alpha: { dx: 8 } });
  loaded.distributeSelection("x");
  loaded.alignSelection("left");

  assert.deepEqual(normalizeVmValue(capturedCalls), [
    {
      kind: "applyTargets",
      targets: { alpha: { dx: 8 } },
      snapStep: 24,
      hasCaptureOverrideEntries: "function",
      hasCreateSelectionTargetOverrideEntries: "function",
      hasSetOverride: "function",
      hasRunConstraints: "function",
    },
    {
      kind: "distribute",
      axis: "x",
      currentGap: 17,
      snapStep: 24,
      hasNormalizeSelectionGap: "function",
      hasSetGap: "function",
      hasResolveSelectionDistributeTargets: "function",
      hasApplySelectionTargets: "function",
    },
    {
      kind: "align",
      mode: "left",
      snapStep: 24,
      hasResolveSelectionAlignTargets: "function",
      hasApplySelectionTargets: "function",
    },
  ]);
});

test("editor inspector render helpers accept the namespaced previewShell.inspector contract", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const inspector = { id: "inspector", innerHTML: "" };
  const context = {
    console,
    selectedIds: new Set(["alpha", "beta"]),
    overrides: {
      alpha: { dx: 8 },
      beta: { style: "highlight" },
    },
    _coercedKeys: new Set(["alpha:sizing_w"]),
    _inspectorWidthUnit: "px",
    _inspectorHeightUnit: "rows",
    gridInfo: { col_widths: [120] },
    BASELINE_STEP: 8,
    BOX_STYLES: { highlight: { label: "Highlight" } },
    window: {
      __DG_getPreviewShellInspectorContract() {
        return context.LayoutEngine.previewShell.inspector;
      },
      getLayoutTextAdapter() {
        return { name: "adapter" };
      },
      __DG_CONFIG: {
        col_gap: 24,
      },
    },
    getInspectorElement() {
      return inspector;
    },
    getSelectionActionItems() {
      return {
        items: [
          { id: "alpha", node: { data: { width: 120, height: 64 } } },
          { id: "beta", node: { data: { width: 80, height: 48 } } },
        ],
        hasUnsupported: false,
        sameParent: true,
        parentId: "root",
      };
    },
    _getMultiStyleValues() {
      return {
        count: 2,
        mixed: false,
        style: "highlight",
        originalStyleName: "highlight",
        originalStyleMixed: false,
      };
    },
    _formatAsDefinedStyleLabel() {
      return "Defined";
    },
    renderBoxStyleOptions() {
      return "<option>highlight</option>";
    },
    model: {
      get(id: string) {
        return id === "root"
          ? { layout: "horizontal", layoutGap: 24, layoutRowGap: 24, layoutColGap: 24 }
          : { id, data: { width: 120, height: 64 } };
      },
    },
    getArrowNode() {
      return { waypoints: [] };
    },
    getOwnDelta() {
      return { dx: 0, dy: 0, dw: 0, dh: 0 };
    },
    getEffectiveDelta() {
      return { dx: 0, dy: 0 };
    },
    _readRenderedStyleFields() {
      return { fill: "#ffffff", stroke: "#111111" };
    },
    getComponentType() {
      return "panel";
    },
    getParentNode() {
      return { layout: "horizontal" };
    },
    getViolationsForComponent() {
      return [];
    },
    escapeHtml(message: string) {
      return `escaped:${message}`;
    },
    LayoutEngine: {
      previewShell: {
        inspector: {
          renderPreviewMultiSelectionInspectorRuntimeHost(options: Record<string, unknown>) {
            capturedCalls.push({ kind: "renderPreviewMultiSelectionInspectorRuntimeHost", ...options });
            return { kind: "rendered", inferredGap: 40 };
          },
          renderPreviewSingleSelectionInspectorRuntimeHost(options: Record<string, unknown>) {
            capturedCalls.push({ kind: "renderPreviewSingleSelectionInspectorRuntimeHost", ...options });
            return true;
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "renderMultiSelectionInspector", "()"),
    extractNamedFunctionSource(source, "updateInspector", "(cid)"),
    "this.__loaded = { renderMultiSelectionInspector, updateInspector };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      renderMultiSelectionInspector: () => void;
      updateInspector: (cid: string) => void;
    };
  }).__loaded;

  loaded.renderMultiSelectionInspector();
  loaded.updateInspector("alpha");

  assert.deepEqual(normalizeVmValue({
    multiKind: capturedCalls[0]?.kind,
    multiInspector: capturedCalls[0]?.inspector,
    multiSelectedCount: capturedCalls[0]?.selectedCount,
    multiFallbackGap: capturedCalls[0]?.fallbackGap,
    multiHasGetNode: typeof capturedCalls[0]?.getNode,
    multiHasResolveMultiStyleState: typeof capturedCalls[0]?.resolveMultiStyleState,
    multiHasRenderStyleOptions: typeof capturedCalls[0]?.renderStyleOptions,
    singleKind: capturedCalls[1]?.kind,
    singleInspector: capturedCalls[1]?.inspector,
    singleCid: capturedCalls[1]?.cid,
    singleWidthCoerced: capturedCalls[1]?.widthCoerced,
    singleHeightUnit: capturedCalls[1]?.heightUnit,
    singleBaselineStep: capturedCalls[1]?.baselineStep,
    singleHasGetNode: typeof capturedCalls[1]?.getNode,
    singleHasGetArrowNode: typeof capturedCalls[1]?.getArrowNode,
    singleHasGetRenderedStyle: typeof capturedCalls[1]?.getRenderedStyle,
    singleHasGetViolations: typeof capturedCalls[1]?.getViolations,
    singleHasTextAdapter: typeof capturedCalls[1]?.textAdapter,
    singleHasFormatControlErrorMessage: typeof capturedCalls[1]?.formatControlErrorMessage,
    singleHasRenderStyleOptions: typeof capturedCalls[1]?.renderStyleOptions,
  }), {
    multiKind: "renderPreviewMultiSelectionInspectorRuntimeHost",
    multiInspector: { id: "inspector", innerHTML: "" },
    multiSelectedCount: 2,
    multiFallbackGap: 24,
    multiHasGetNode: "function",
    multiHasResolveMultiStyleState: "function",
    multiHasRenderStyleOptions: "function",
    singleKind: "renderPreviewSingleSelectionInspectorRuntimeHost",
    singleInspector: { id: "inspector", innerHTML: "" },
    singleCid: "alpha",
    singleWidthCoerced: true,
    singleHeightUnit: "rows",
    singleBaselineStep: 8,
    singleHasGetNode: "function",
    singleHasGetArrowNode: "function",
    singleHasGetRenderedStyle: "function",
    singleHasGetViolations: "function",
    singleHasTextAdapter: "object",
    singleHasFormatControlErrorMessage: "function",
    singleHasRenderStyleOptions: "function",
  });
});

test("editor selection-inspector dispatcher accepts the namespaced previewShell.inspector contract", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    selectedIds: new Set(["alpha", "beta"]),
    window: {
      __DG_getPreviewShellInspectorContract() {
        return context.LayoutEngine.previewShell.inspector;
      },
    },
    getPrimarySelectedId(preferredId?: string | null) {
      return preferredId || "beta";
    },
    renderEmptyInspector() {},
    updateInspector() {},
    renderMultiSelectionInspector() {},
    LayoutEngine: {
      previewShell: {
        inspector: {
          renderPreviewSelectionInspectorHost(options: Record<string, unknown>) {
            capturedCalls.push({ kind: "renderPreviewSelectionInspectorHost", ...options });
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "renderSelectionInspector", "(preferredCid)"),
    "this.__loaded = { renderSelectionInspector };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      renderSelectionInspector: (preferredCid?: string | null) => void;
    };
  }).__loaded;

  loaded.renderSelectionInspector("alpha");

  assert.deepEqual(normalizeVmValue({
    kind: capturedCalls[0]?.kind,
    preferredId: capturedCalls[0]?.preferredId,
    selectedCount: capturedCalls[0]?.selectedCount,
    hasResolvePrimaryId: typeof capturedCalls[0]?.resolvePrimaryId,
    hasRenderEmptyInspector: typeof capturedCalls[0]?.renderEmptyInspector,
    hasRenderSingleSelectionInspector: typeof capturedCalls[0]?.renderSingleSelectionInspector,
    hasRenderMultiSelectionInspector: typeof capturedCalls[0]?.renderMultiSelectionInspector,
  }), {
    kind: "renderPreviewSelectionInspectorHost",
    preferredId: "alpha",
    selectedCount: 2,
    hasResolvePrimaryId: "function",
    hasRenderEmptyInspector: "function",
    hasRenderSingleSelectionInspector: "function",
    hasRenderMultiSelectionInspector: "function",
  });
});

test("editor resize host helpers accept the namespaced previewShell.interaction contract", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    BASELINE_STEP: 8,
    GUIDE_COLOR: "#E95420",
    GUIDE_OPACITY: 0.4,
    selectedIds: new Set(["alpha"]),
    document: {
      querySelector(selector: string) {
        return selector === "#stage svg"
          ? {
              tagName: "svg",
            }
          : null;
      },
      addEventListener(type: string, handler: unknown) {
        capturedCalls.push({ kind: "addDocumentListener", type, handlerType: typeof handler });
      },
    },
    model: {
      diagramGrid: { cols: 8 },
      get(id: string) {
        return id === "alpha"
          ? {
              id,
              data: { x: 20, y: 30, width: 120, height: 64 },
            }
          : null;
      },
      getSiblings() {
        return [];
      },
      relayoutChildren() {
        return {};
      },
      relayoutSiblingsAfterChildResize() {
        return {};
      },
    },
    mgr: {
      state: {
        cid: "alpha",
      },
      isMode() {
        return true;
      },
      startResize(state: Record<string, unknown>) {
        capturedCalls.push({ kind: "startInteraction", state });
      },
    },
    InteractionMode: {
      RESIZING: "resizing",
    },
    EditorState: {
      captureOverrideEntries(ids: string[]) {
        capturedCalls.push({ kind: "captureOverrideEntries", ids });
        return { before: ids };
      },
    },
    getAncestors() {
      return [];
    },
    getOwnDelta() {
      return { dx: 0, dy: 0, dw: 0, dh: 0 };
    },
    getEffectiveDelta() {
      return { dx: 0, dy: 0, dw: 0, dh: 0 };
    },
    getPrimarySelectedId() {
      return "alpha";
    },
    _hasLayoutChildren() {
      return false;
    },
    _isAutolayoutChild() {
      return false;
    },
    _gridSnapTargets() {
      return { xs: [80], ys: [120] };
    },
    _applyInteractionOverrideEntries() {},
    applyAllOverrides() {},
    clearGuideLines() {},
    renderSelectionInspector() {},
    updateInspector() {},
    setOverride() {},
    _scheduleV3ResizeRelayout() {},
    onResizeUp() {},
    SHARED_MIN_NODE_SIZE: 8,
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

  assert.deepEqual(normalizeVmValue({
    startKind: capturedCalls[0]?.kind,
    startEventTargetHasGetAttribute: typeof capturedCalls[0]?.event?.target?.getAttribute,
    startSvg: capturedCalls[0]?.svg,
    startSelectedIds: Array.from((capturedCalls[0]?.selectedIds as Set<string>) || []),
    startHasGetNode: typeof capturedCalls[0]?.getNode,
    startHasCaptureOverrides: typeof capturedCalls[0]?.captureOverrideEntries,
    startHasStartInteraction: typeof capturedCalls[0]?.startInteraction,
    startHasAddDocumentListener: typeof capturedCalls[0]?.addDocumentListener,
    moveKind: capturedCalls[1]?.kind,
    moveStateCid: capturedCalls[1]?.state?.cid,
    moveSvg: capturedCalls[1]?.svg,
    moveHasGetNode: typeof capturedCalls[1]?.getNode,
    moveHasLayoutChildrenForId: typeof capturedCalls[1]?.hasLayoutChildrenForId,
    moveGridTargets: capturedCalls[1]?.gridTargets,
    moveSnapStep: capturedCalls[1]?.snapStep,
    moveHasRelayoutChildren: typeof capturedCalls[1]?.relayoutChildren,
    moveHasRelayoutSiblings: typeof capturedCalls[1]?.relayoutSiblingsAfterChildResize,
    moveHasScheduleRelayout: typeof capturedCalls[1]?.scheduleV3ResizeRelayout,
  }), {
    startKind: "startPreviewResizeHost",
    startEventTargetHasGetAttribute: "function",
    startSvg: { tagName: "svg" },
    startSelectedIds: ["alpha"],
    startHasGetNode: "function",
    startHasCaptureOverrides: "function",
    startHasStartInteraction: "function",
    startHasAddDocumentListener: "function",
    moveKind: "dispatchPreviewResizeMoveHost",
    moveStateCid: "alpha",
    moveSvg: { tagName: "svg" },
    moveHasGetNode: "function",
    moveHasLayoutChildrenForId: "function",
    moveGridTargets: { xs: [80], ys: [120] },
    moveSnapStep: 8,
    moveHasRelayoutChildren: "function",
    moveHasRelayoutSiblings: "function",
    moveHasScheduleRelayout: "function",
  });
});

test("editor waypoint host helpers accept the namespaced previewShell.interaction contract", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    selectedIds: new Set(["arrow-1"]),
    document: {
      querySelector(selector: string) {
        return selector === "#stage svg" ? { tagName: "svg" } : null;
      },
      addEventListener(type: string, handler: unknown) {
        capturedCalls.push({ kind: "addDocumentListener", type, handlerType: typeof handler });
      },
    },
    model: {
      get(id: string) {
        return id === "arrow-1"
          ? {
              type: "arrow",
              data: {
                waypoints: [[24, 32]],
              },
            }
          : null;
      },
    },
    mgr: {
      state: {
        cid: "arrow-1",
        idx: 0,
      },
      isMode() {
        return true;
      },
      startWaypointDrag(state: Record<string, unknown>) {
        capturedCalls.push({ kind: "startWaypointDrag", state });
      },
    },
    InteractionMode: {
      WAYPOINT_DRAGGING: "waypoint_dragging",
    },
    getEffectiveDelta() {
      return { dx: 4, dy: 8 };
    },
    addWaypoint() {},
    removeWaypoint() {},
    getArrowPoints() {
      return { start: [0, 0], end: [80, 0] };
    },
    updateArrowVisual() {},
    onWpDragUp() {},
    window: {
      __DG_getPreviewShellInteractionContract() {
        return context.LayoutEngine.previewShell.interaction;
      },
    },
    LayoutEngine: {
      previewShell: {
        interaction: {
          renderPreviewWaypointHandlesHost(options: Record<string, unknown>) {
            capturedCalls.push({ kind: "renderPreviewWaypointHandlesHost", ...options });
          },
          startPreviewWaypointDragHost(options: Record<string, unknown>) {
            capturedCalls.push({ kind: "startPreviewWaypointDragHost", ...options });
          },
          dispatchPreviewWaypointDragMoveHost(options: Record<string, unknown>) {
            capturedCalls.push({ kind: "dispatchPreviewWaypointDragMoveHost", ...options });
            return { kind: "moved", cid: "arrow-1" };
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "getArrowNode", "(cid)"),
    extractNamedFunctionSource(source, "showArrowWaypointHandles", "(cid)"),
    extractNamedFunctionSource(source, "startWpDrag", "(e)"),
    extractNamedFunctionSource(source, "onWpDragMove", "(e)"),
    "this.__loaded = { showArrowWaypointHandles, startWpDrag, onWpDragMove };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      showArrowWaypointHandles: (cid: string) => void;
      startWpDrag: (event: Record<string, unknown>) => void;
      onWpDragMove: (event: Record<string, unknown>) => void;
    };
  }).__loaded;

  loaded.showArrowWaypointHandles("arrow-1");
  loaded.startWpDrag({
    target: {
      getAttribute(name: string) {
        const map: Record<string, string> = {
          "data-wp-cid": "arrow-1",
          "data-wp-idx": "0",
        };
        return map[name] ?? null;
      },
    },
    clientX: 100,
    clientY: 120,
    preventDefault() {},
    stopPropagation() {},
  });
  loaded.onWpDragMove({
    clientX: 132,
    clientY: 120,
    preventDefault() {},
  });

  assert.deepEqual(normalizeVmValue({
    renderKind: capturedCalls[0]?.kind,
    renderSvg: capturedCalls[0]?.svg,
    renderComponentId: capturedCalls[0]?.componentId,
    renderWaypoints: capturedCalls[0]?.waypoints,
    renderDelta: capturedCalls[0]?.delta,
    renderIsSelected: capturedCalls[0]?.isSelected,
    renderHasOnAddWaypoint: typeof capturedCalls[0]?.onAddWaypoint,
    renderHasOnHandleMouseDown: typeof capturedCalls[0]?.onHandleMouseDown,
    renderHasOnHandleDoubleClick: typeof capturedCalls[0]?.onHandleDoubleClick,
    startKind: capturedCalls[1]?.kind,
    startHasGetNode: typeof capturedCalls[1]?.getNode,
    startHasStartInteraction: typeof capturedCalls[1]?.startInteraction,
    startHasAddDocumentListener: typeof capturedCalls[1]?.addDocumentListener,
    startHasOnMove: typeof capturedCalls[1]?.onWaypointDragMove,
    startHasOnUp: typeof capturedCalls[1]?.onWaypointDragUp,
    moveKind: capturedCalls[2]?.kind,
    moveStateCid: capturedCalls[2]?.state?.cid,
    moveHasGetNode: typeof capturedCalls[2]?.getNode,
    moveHasReadEndpoints: typeof capturedCalls[2]?.readEndpoints,
    moveHasUpdateArrowVisual: typeof capturedCalls[2]?.updateArrowVisual,
  }), {
    renderKind: "renderPreviewWaypointHandlesHost",
    renderSvg: { tagName: "svg" },
    renderComponentId: "arrow-1",
    renderWaypoints: [[24, 32]],
    renderDelta: { dx: 4, dy: 8 },
    renderIsSelected: true,
    renderHasOnAddWaypoint: "function",
    renderHasOnHandleMouseDown: "function",
    renderHasOnHandleDoubleClick: "function",
    startKind: "startPreviewWaypointDragHost",
    startHasGetNode: "function",
    startHasStartInteraction: "function",
    startHasAddDocumentListener: "function",
    startHasOnMove: "function",
    startHasOnUp: "function",
    moveKind: "dispatchPreviewWaypointDragMoveHost",
    moveStateCid: "arrow-1",
    moveHasGetNode: "function",
    moveHasReadEndpoints: "function",
    moveHasUpdateArrowVisual: "function",
  });
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

  assert.deepEqual(normalizeVmValue({
    kind: capturedCalls[0]?.kind,
    svg: capturedCalls[0]?.svg,
    currentSelectionDepth: capturedCalls[0]?.currentSelectionDepth,
    selectedIds: Array.from((capturedCalls[0]?.selectedIds as Set<string>) || []),
    hasCommitTextEditIfActive: typeof capturedCalls[0]?.commitTextEditIfActive,
    hasStartResize: typeof capturedCalls[0]?.startResize,
    hasFindArrowAtPoint: typeof capturedCalls[0]?.findArrowAtPoint,
    hasFindDeepestComponent: typeof capturedCalls[0]?.findDeepestComponent,
    hasFindComponentAtDepth: typeof capturedCalls[0]?.findComponentAtDepth,
    hasGetAncestors: typeof capturedCalls[0]?.getAncestors,
    hasSetSelectionDepth: typeof capturedCalls[0]?.setSelectionDepth,
    hasGetOwnDelta: typeof capturedCalls[0]?.getOwnDelta,
    hasCollectSnapTargets: typeof capturedCalls[0]?.collectSnapTargets,
    hasCaptureOverrideEntries: typeof capturedCalls[0]?.captureOverrideEntries,
    hasStartDragInteraction: typeof capturedCalls[0]?.startDragInteraction,
    hasAddDocumentListener: typeof capturedCalls[0]?.addDocumentListener,
  }), {
    kind: "startPreviewPointerInteractionHost",
    svg: { tagName: "svg" },
    currentSelectionDepth: 2,
    selectedIds: ["alpha"],
    hasCommitTextEditIfActive: "function",
    hasStartResize: "function",
    hasFindArrowAtPoint: "function",
    hasFindDeepestComponent: "function",
    hasFindComponentAtDepth: "function",
    hasGetAncestors: "function",
    hasSetSelectionDepth: "function",
    hasGetOwnDelta: "function",
    hasCollectSnapTargets: "function",
    hasCaptureOverrideEntries: "function",
    hasStartDragInteraction: "function",
    hasAddDocumentListener: "function",
  });
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
      state: {
        cid: "alpha",
        cids: ["alpha"],
        autolayout: true,
      },
      svg: { tagName: "svg" },
      clientX: 120,
      clientY: 80,
      hasGetParentNodeForAutolayout: "function",
      snapStep: 8,
      hasShowReorderIndicator: "function",
      hasClearReorderIndicator: "function",
      hasResolveSnap: "function",
      hasRenderGuideLines: "function",
      hasClampDragDelta: "function",
      hasSetOverride: "function",
      hasApplyAllOverrides: "function",
      hasUpdateInspector: "function",
      shouldUpdateInspector: true,
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
    window: {
      __DG_getPreviewShellInteractionContract() {
        return context.LayoutEngine.previewShell.interaction;
      },
    },
    LayoutEngine: {
      previewShell: {
        interaction: {
          dispatchPreviewKeyboardShortcutHost(options: Record<string, unknown>) {
            capturedCalls.push({
              eventKey: options.event?.key,
              selectedIds: Array.from(options.selectedIds as Set<string> | string[]),
              selectionDepth: options.selectionDepth,
              hasSave: typeof options.save,
              hasUndo: typeof options.undo,
              hasRedo: typeof options.redo,
              hasDeleteSelection: typeof options.deleteSelection,
              hasClearGuideLines: typeof options.clearGuideLines,
              hasApplyAllOverrides: typeof options.applyAllOverrides,
              hasRenderSelectionInspector: typeof options.renderSelectionInspector,
            });
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
    getFrameTreeJson() {
      return { root: { id: "tree-root" } };
    },
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
    },
    LayoutEngine: {
      previewBridge: {
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
    document: { tagName: "document" },
    _interactionSvg: null,
    selectionDepth: 2,
    mgr: {
      suppressHover: false,
    },
    onSvgMouseDown() {},
    onSvgDblClick() {},
    findArrowAtPoint() {
      return null;
    },
    findComponentAtDepth() {
      return "alpha";
    },
    ensureArrowHitAreas() {},
    buildTreeUI() {},
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
    {
      previousSvg: null,
      suppressHover: false,
      selectionDepth: 2,
      hasOnMouseDown: "function",
      hasOnDoubleClick: "function",
      hasFindArrowAtPoint: "function",
      hasFindComponentAtDepth: "function",
      hasSyncHoverState: "function",
      hasClearHoverState: "function",
      hasEnsureArrowHitAreas: "function",
      hasRebuildTreeUi: "function",
    },
  ]);
});

test("editor selection chrome helpers accept the namespaced previewShell.interaction contract", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const svg = { tagName: "svg" };
  const context = {
    console,
    document: {
      querySelector(selector: string) {
        if (selector === "#stage svg") {
          return svg;
        }
        return null;
      },
    },
    selectedIds: new Set(["alpha"]),
    SHARED_HANDLE_SIZE: 8,
    clearHandlesByClass(className: string) {
      capturedCalls.push({ kind: "clearHandlesByClass", className });
    },
    _getMultiResizeSelection() {
      return { left: 10, top: 20, right: 30, bottom: 40 };
    },
    _getRenderedComponentBounds() {
      return { left: 8, top: 16, right: 32, bottom: 48 };
    },
    getComponentType() {
      return "panel";
    },
    showArrowWaypointHandles(id: string) {
      capturedCalls.push({ kind: "showArrowWaypointHandles", id });
    },
    renderResizeHandles(...args: unknown[]) {
      capturedCalls.push({ kind: "renderResizeHandles", args });
    },
    getArrowNode() {
      return { waypoints: [[20, 24]] };
    },
    getEffectiveDelta() {
      return { dx: 4, dy: 8 };
    },
    window: {
      __DG_CONFIG: {
        head_len: 10,
        head_half: 5,
      },
      __DG_getPreviewShellInteractionContract() {
        return context.LayoutEngine.previewShell.interaction;
      },
      __DG_getPreviewBridgeRenderContract() {
        return context.LayoutEngine.previewBridge.render;
      },
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
          readPreviewArrowPointsHost(options: Record<string, unknown>) {
            capturedCalls.push({
              kind: "readPreviewArrowPointsHost",
              componentId: options.componentId,
              hasReadArrowEndpoints: typeof options.readArrowEndpoints,
              hasArrowNode: options.hasArrowNode,
            });
            return [[4, 8], [20, 24]];
          },
          updatePreviewArrowVisualHost(options: Record<string, unknown>) {
            capturedCalls.push({
              kind: "updatePreviewArrowVisualHost",
              componentId: options.componentId,
              delta: options.delta,
              headLen: options.headLen,
              headHalf: options.headHalf,
              hasUpdateArrowSvg: typeof options.updateArrowSvg,
            });
            return true;
          },
          rebuildPreviewArrowSvgHost(options: Record<string, unknown>) {
            capturedCalls.push({
              kind: "rebuildPreviewArrowSvgHost",
              componentId: options.componentId,
              headLen: options.headLen,
              headHalf: options.headHalf,
              color: options.color,
              hasRebuildArrowSvg: typeof options.rebuildArrowSvg,
            });
            return true;
          },
        },
      },
      previewBridge: {
        render: {
          readPreviewArrowEndpoints() {
            return { start: [4, 8], end: [20, 24] };
          },
          updatePreviewArrowSvg() {},
          rebuildPreviewArrowSvg() {},
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
      kind: "showPreviewResizeHandlesHost",
      componentId: "alpha",
      selectedCount: 1,
      singleBounds: { left: 8, top: 16, right: 32, bottom: 48 },
      componentType: "panel",
      hasClearHandlesByClass: "function",
      hasResolveHandlePlan: "function",
      hasRenderResizeHandles: "function",
      hasShowArrowWaypointHandles: "function",
      handleSize: 8,
    },
    {
      kind: "removePreviewHandlesHost",
      hasClearHandlesByClass: "function",
    },
    {
      kind: "readPreviewArrowPointsHost",
      componentId: "alpha",
      hasReadArrowEndpoints: "function",
      hasArrowNode: true,
    },
    {
      kind: "updatePreviewArrowVisualHost",
      componentId: "alpha",
      delta: { dx: 4, dy: 8 },
      headLen: 10,
      headHalf: 5,
      hasUpdateArrowSvg: "function",
    },
    {
      kind: "rebuildPreviewArrowSvgHost",
      componentId: "alpha",
      headLen: 10,
      headHalf: 5,
      color: "#E95420",
      hasRebuildArrowSvg: "function",
    },
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
    renderContainer: capturedCalls[0]?.container,
    renderNodes: capturedCalls[0]?.nodes,
    renderOverrides: capturedCalls[0]?.overrides,
    renderSelectedIds: Array.from((capturedCalls[0]?.selectedIds as Set<string>) || []),
    renderHasSelectComponent: typeof capturedCalls[0]?.selectComponent,
    renderHasDeleteSelection: typeof capturedCalls[0]?.onDeleteSelection,
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
    renderKind: "renderTree",
    renderContainer: { id: "tree" },
    renderNodes: [{ id: "alpha" }, { id: "beta" }],
    renderOverrides: { beta: { dx: 8 } },
    renderSelectedIds: ["alpha"],
    renderHasSelectComponent: "function",
    renderHasDeleteSelection: "function",
    clearKind: "clearSelection",
    clearSelectedIds: ["alpha"],
    clearSelectionDepth: 2,
    clearAppliedKind: "applySnapshot",
    clearAppliedState: { selectedIds: [], selectionDepth: 0 },
    resolveKind: "resolveSelection",
    resolveCid: "beta",
    resolveAdditive: false,
    resolveHasAncestorDepth: "function",
    resolveAppliedKind: "applySnapshot",
    resolveAppliedPreferredCid: "beta",
    resolveAppliedState: { selectedIds: ["beta"], selectionDepth: 2 },
  });
});

test("editor navigation helper accepts the namespaced previewShell.bootstrap contract", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    DIRTY_DIAGRAM_NAV_CONFIRM: "Leave?",
    _allowInternalDirtyNavigation: false,
    PreviewSaveClient: {
      isDirty() {
        return true;
      },
    },
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
        return 1;
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
  const source = readPreviewScript("editor.js");
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
    },
    LayoutEngine: {
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
  const source = readPreviewScript("editor.js");
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
            const metrics = (options.readFallbackMetrics as () => Record<string, unknown>)();
            const resolved = (options.resolvePreviewGridInfo as (value: Record<string, unknown>) => unknown)({
              canvasWidth: metrics.canvasWidth,
            });
            assert.deepEqual(normalizeVmValue(resolved), { resolved: true, canvasWidth: 640 });
            await (options.fetchGridInfo as () => Promise<unknown>)();
            return {
              gridInfo: { cols: 12 },
              baseGridInfo: { cols: 12, cloned: true },
            };
          },
        },
        scene: {
          resolvePreviewGridInfo(value: Record<string, unknown>) {
            return { resolved: true, canvasWidth: value.canvasWidth };
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

  assert.equal(capturedCalls.length, 2);
  assert.match(String(capturedCalls[1]?.fetchUrl || ""), /^\/api\/grid\/demo\?t=\d+$/);
  assert.deepEqual(normalizeVmValue({
    canonicalState: capturedCalls[0]?.canonicalState,
    hasFetchGridInfo: typeof capturedCalls[0]?.fetchGridInfo,
    hasCloneValue: typeof capturedCalls[0]?.cloneValue,
    hasReadFallbackMetrics: typeof capturedCalls[0]?.readFallbackMetrics,
    hasResolvePreviewGridInfo: typeof capturedCalls[0]?.resolvePreviewGridInfo,
    fetchUrl: capturedCalls[1]?.fetchUrl,
    fetchCache: capturedCalls[1]?.init?.cache,
    gridInfo: context.gridInfo,
    baseGridInfo: context.baseGridInfo,
  }), {
    canonicalState: { gridInfo: { cols: 4 } },
    hasFetchGridInfo: "function",
    hasCloneValue: "function",
    hasReadFallbackMetrics: "function",
    hasResolvePreviewGridInfo: "function",
    fetchUrl: String(capturedCalls[1]?.fetchUrl || ""),
    fetchCache: "no-store",
    gridInfo: { cols: 12 },
    baseGridInfo: { cols: 12, cloned: true },
  });
});

test("layout bridge override collector accepts the namespaced previewBridge.relayout contract", () => {
  const source = readPreviewScript("layout-bridge.js");
  const context = {
    console,
    window: {
      __DG_getPreviewBridgeRelayoutContract() {
        return context.window.LayoutEngine.previewBridge.relayout;
      },
      LayoutEngine: {
        previewBridge: {
          relayout: {
            collectPreviewRelayoutFrameOverrides(overrides: Record<string, unknown>) {
              return { collected: overrides };
            },
          },
        },
      },
    },
    LayoutEngine: {
      filterRelayoutOverrideEntry() {
        throw new Error("flat fallback should not be used");
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "_collectRelayoutFrameOverrides", "(overrides)"),
    "this.__loaded = { _collectRelayoutFrameOverrides };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      _collectRelayoutFrameOverrides: (overrides: Record<string, unknown>) => unknown;
    };
  }).__loaded;

  assert.deepEqual(
    normalizeVmValue(loaded._collectRelayoutFrameOverrides({ root: { gap_delta: null } })),
    { collected: { root: { gap_delta: null } } },
  );
});

test("layout bridge override application accepts the namespaced previewBridge.relayout contract", () => {
  const source = readPreviewScript("layout-bridge.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const diagram = { root: { id: "root" } };
  const overrides = { root: { gap: 24 } };
  const gridOverrides = { col_gap: 40 };
  const context = {
    console,
    window: {
      __DG_getPreviewBridgeRelayoutContract() {
        return context.window.LayoutEngine.previewBridge.relayout;
      },
      LayoutEngine: {
        previewBridge: {
          relayout: {
            applyPreviewOverridesToFrameTree(
              nextDiagram: Record<string, unknown>,
              nextOverrides: Record<string, unknown>,
              nextGridOverrides: Record<string, unknown>,
            ) {
              capturedCalls.push({
                diagram: nextDiagram,
                overrides: nextOverrides,
                gridOverrides: nextGridOverrides,
              });
            },
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "applyOverridesToFrameTree", "(diagram, allOverrides, gridOverrides)"),
    "this.__loaded = { applyOverridesToFrameTree };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      applyOverridesToFrameTree: (
        diagram: Record<string, unknown>,
        allOverrides: Record<string, unknown>,
        gridOverrides: Record<string, unknown>,
      ) => void;
    };
  }).__loaded;

  loaded.applyOverridesToFrameTree(diagram, overrides, gridOverrides);

  assert.deepEqual(normalizeVmValue(capturedCalls), [
    {
      diagram,
      overrides,
      gridOverrides,
    },
  ]);
});

test("layout bridge fresh-render wrapper accepts the namespaced previewBridge.render contract", async () => {
  const source = readPreviewScript("layout-bridge.js");
  const refreshCalls: string[] = [];
  const context = {
    console,
    document: { tagName: "document" },
    _previewDocumentJson: { kind: "frame-diagram" },
    _frameTreeJson: { root: { id: "root" } },
    _textAdapter: { measurementBackend: "mock" },
    _lastElkSnapshot: null as unknown,
    _lastElkFrameLabels: null as unknown,
    applySessionRemovalsToDiagramJson() {},
    applyOverridesToFrameTree() {},
    _collectRelayoutFrameOverrides(value: Record<string, unknown>) {
      return value;
    },
    _isElkLayeredDiagramJson() {
      return false;
    },
    _resolveElkOptionOverrides() {
      return {};
    },
    updateComponentModelFromLayout() {},
    syncArrowsInModel() {},
    refreshElkViewMode() {
      refreshCalls.push("refreshElkViewMode");
    },
    window: {
      LayoutEngine: {
        previewBridge: {
          render: {
            async renderFreshPreviewSvg(options: Record<string, unknown>) {
              context.captured = options;
              return {
                svg: { tagName: "svg" },
                width: 320,
                height: 200,
                coerced: new Map(),
                elkSnapshot: { id: "elk" },
                elkFrameLabels: { root: "Root" },
              };
            },
          },
        },
      },
    },
    captured: null as Record<string, unknown> | null,
  };

  const helperSource = [
    extractNamedFunctionSource(source, "previewBridgeRenderContract", "()"),
    extractNamedFunctionSource(source, "renderFreshSvg", "(overrides, gridOverrides, model)").replace(/^function /, "async function "),
    "this.__loaded = { renderFreshSvg };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      renderFreshSvg: (
        overrides: Record<string, unknown>,
        gridOverrides: Record<string, unknown> | null,
        model: Record<string, unknown>,
      ) => Promise<Record<string, unknown>>;
    };
  }).__loaded;

  const result = await loaded.renderFreshSvg({ alpha: { dx: 8 } }, { cols: 8 }, { id: "model" });

  assert.deepEqual(normalizeVmValue({
    ownerDocument: context.captured?.ownerDocument,
    previewDocumentJson: context.captured?.previewDocumentJson,
    frameTreeJson: context.captured?.frameTreeJson,
    overrides: context.captured?.overrides,
    gridOverrides: context.captured?.gridOverrides,
    model: context.captured?.model,
    textAdapter: context.captured?.textAdapter,
  }), {
    ownerDocument: { tagName: "document" },
    previewDocumentJson: { kind: "frame-diagram" },
    frameTreeJson: { root: { id: "root" } },
    overrides: { alpha: { dx: 8 } },
    gridOverrides: { cols: 8 },
    model: { id: "model" },
    textAdapter: { measurementBackend: "mock" },
  });
  assert.equal(typeof context.captured?.applySessionRemovalsToDiagramJson, "function");
  assert.equal(typeof context.captured?.applyOverridesToFrameTree, "function");
  assert.equal(typeof context.captured?.collectRelayoutFrameOverrides, "function");
  assert.equal(typeof context.captured?.isElkLayeredDiagramJson, "function");
  assert.equal(typeof context.captured?.resolveElkOptionOverrides, "function");
  assert.equal(typeof context.captured?.updateModelFromLayout, "function");
  assert.equal(typeof context.captured?.syncArrowsInModel, "function");
  assert.deepEqual(normalizeVmValue(result), {
    svg: { tagName: "svg" },
    width: 320,
    height: 200,
    coerced: {},
  });
  assert.deepEqual(normalizeVmValue(context._lastElkSnapshot), { id: "elk" });
  assert.deepEqual(normalizeVmValue(context._lastElkFrameLabels), { root: "Root" });
  assert.deepEqual(refreshCalls, ["refreshElkViewMode"]);
});

test("layout bridge core helpers accept the namespaced core contract", () => {
  const source = readPreviewScript("layout-bridge.js");
  const context = {
    console,
    window: {
      __DG_getPreviewCoreContract() {
        return context.window.LayoutEngine.core;
      },
      LayoutEngine: {
        core: {
          deserializeFrameWire(json: Record<string, unknown>) {
            return { restored: json };
          },
        },
      },
    },
    LayoutEngine: {
      deserializeFrameWire() {
        throw new Error("flat fallback should not be used");
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "previewCoreContract", "()"),
    extractNamedFunctionSource(source, "deserializeFrame", "(json)"),
    "this.__loaded = { deserializeFrame };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      deserializeFrame: (json: Record<string, unknown>) => unknown;
    };
  }).__loaded;

  assert.deepEqual(
    normalizeVmValue(loaded.deserializeFrame({ id: "alpha" })),
    { restored: { id: "alpha" } },
  );
});

test("layout bridge ELK view helpers accept the namespaced previewEngines.elk contract", () => {
  const source = readPreviewScript("layout-bridge.js");
  const context = {
    console,
    window: {
      __DG_getPreviewElkEngineContract() {
        return context.window.LayoutEngine.previewEngines.elk;
      },
      LayoutEngine: {
        previewEngines: {
          elk: {
            renderPreviewElkDebugOverlay() {
              return { mode: "debug" };
            },
          },
        },
      },
    },
    LayoutEngine: {
      renderPreviewElkDebugOverlay() {
        throw new Error("flat fallback should not be used");
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "previewElkEngineContract", "()"),
    "this.__loaded = { previewElkEngineContract };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      previewElkEngineContract: () => { renderPreviewElkDebugOverlay: () => { mode: string } };
    };
  }).__loaded;

  assert.deepEqual(
    normalizeVmValue(loaded.previewElkEngineContract().renderPreviewElkDebugOverlay()),
    { mode: "debug" },
  );
});
