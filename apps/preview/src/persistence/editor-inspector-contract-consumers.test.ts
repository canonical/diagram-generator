import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";

import {
  attachPreviewCompat,
  createPreviewGridEditorRuntimeContext,
  extractNamedFunctionSource,
  normalizeVmValue,
  readPreviewScript,
} from "./preview-script-test-helpers.js";

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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

  vm.runInNewContext(helperSource, attachPreviewCompat(harness.context));
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
  const config = capturedOptions?.config as Record<string, unknown> | undefined;
  const stateOptions = capturedOptions?.state as Record<string, unknown> | undefined;
  const previewWindow = capturedOptions?.previewWindow as
    | {
      __DG_CONFIG?: { head_len?: number; head_half?: number } | null;
      getLayoutTextAdapter?: unknown;
    }
    | undefined;
  const modelOps = capturedOptions?.modelOps as Record<string, unknown> | undefined;
  assert.deepEqual(normalizeVmValue({
    selectedIds: Array.from(stateOptions?.selectedIds as Iterable<string>),
    coercedKeys: Array.from(stateOptions?.coercedKeys as Iterable<string>),
    ancestorDepth: (
      modelOps?.getAncestors as ((id: string) => string[]) | undefined
    )?.("alpha")?.length,
    hasEditorCaptureOverrideEntries: typeof (
      stateOptions?.editorState as { captureOverrideEntries?: (...args: unknown[]) => unknown } | undefined
    )?.captureOverrideEntries,
    hasPreviewSaveTrySave: typeof (
      stateOptions?.previewSaveClient as { trySaveIfDirty?: (...args: unknown[]) => unknown } | undefined
    )?.trySaveIfDirty,
    hasGetTextAdapter: typeof previewWindow?.getLayoutTextAdapter,
    fallbackGap: config?.fallbackGap,
    handleSize: config?.handleSize,
    headLen: previewWindow?.__DG_CONFIG?.head_len,
    headHalf: previewWindow?.__DG_CONFIG?.head_half,
    guideOpacity: config?.guideOpacity,
    overrideKeys: Object.keys((
      stateOptions?.model as { overrides?: Record<string, unknown> } | undefined
    )?.overrides || {}),
  }), {
    selectedIds: ["alpha", "beta"],
    coercedKeys: ["coerced"],
    ancestorDepth: 1,
    hasEditorCaptureOverrideEntries: "function",
    hasPreviewSaveTrySave: "function",
    hasGetTextAdapter: "function",
    fallbackGap: 24,
    handleSize: 12,
    headLen: 10,
    headHalf: 5,
    guideOpacity: "0.5",
    overrideKeys: ["alpha"],
  });
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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

