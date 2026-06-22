import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";

import {
  attachPreviewCompat,
  extractNamedFunctionSource,
  normalizeVmValue,
  readPreviewScript,
} from "./preview-script-test-helpers.js";

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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

