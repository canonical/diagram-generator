import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";

import {
  attachPreviewCompat,
  extractNamedFunctionSource,
  normalizeVmValue,
  readPreviewScript,
} from "./preview-script-test-helpers.js";

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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

