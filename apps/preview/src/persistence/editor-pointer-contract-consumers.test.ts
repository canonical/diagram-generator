import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";

import {
  attachPreviewCompat,
  extractNamedFunctionSource,
  normalizeVmValue,
  readPreviewScript,
} from "./preview-script-test-helpers.js";

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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
  const loaded = (context as {
    __loaded: {
      getPrimarySelectedId: (preferredCid?: string | null) => string | null;
    };
  }).__loaded;

  assert.equal(loaded.getPrimarySelectedId("beta"), "beta");
  assert.equal(loaded.getPrimarySelectedId(null), "alpha");
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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

