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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

  vm.runInNewContext(helperSource, attachPreviewCompat(harness.context));
  const loaded = (harness.context as {
    __loaded: {
      _getEditorSceneFacade: () => Record<string, unknown>;
    };
  }).__loaded;

  assert.deepEqual(normalizeVmValue(loaded._getEditorSceneFacade()), {
    kind: "scene-facade",
  });

  const capturedOptions = harness.getCapturedOptions();
  const config = capturedOptions?.config as Record<string, unknown> | undefined;
  const state = capturedOptions?.state as Record<string, unknown> | undefined;
  const previewWindow = capturedOptions?.previewWindow as
    | { __DG_CONFIG?: { icon_size?: number } | null }
    | undefined;
  const helpers = capturedOptions?.helpers as Record<string, unknown> | undefined;
  const modelOps = capturedOptions?.modelOps as Record<string, unknown> | undefined;
  const facades = capturedOptions?.facades as Record<string, unknown> | undefined;
  assert.deepEqual(normalizeVmValue({
    slug: config?.slug,
    baselineStep: config?.baselineStep,
    guideModes: Array.from(config?.guideModes as Iterable<string>),
    selectedIds: Array.from(state?.selectedIds as Iterable<string>),
    overrideKeys: Object.keys((
      state?.model as { overrides?: Record<string, unknown> } | undefined
    )?.overrides || {}),
    hasModelGet: typeof (
      state?.model as { get?: (...args: unknown[]) => unknown } | undefined
    )?.get,
    hasInteractionManagerIsMode: typeof (
      state?.interactionManager as { isMode?: (...args: unknown[]) => unknown } | undefined
    )?.isMode,
    hasGetOwnDelta: typeof modelOps?.getOwnDelta,
    hasGetAncestors: typeof modelOps?.getAncestors,
    hasGetEditorInteractionFacade: typeof facades?.getEditorInteractionFacade,
    hasGetEditorSceneFacade: typeof facades?.getEditorSceneFacade,
    hasApplyInteractionOverrideEntries: typeof helpers?.applyInteractionOverrideEntries,
    inset: config?.inset,
    iconSize: previewWindow?.__DG_CONFIG?.icon_size,
    minNodeSize: config?.minNodeSize,
  }), {
    slug: "demo",
    baselineStep: 24,
    guideModes: ["off", "all"],
    selectedIds: ["alpha", "beta"],
    overrideKeys: ["alpha"],
    hasModelGet: "function",
    hasInteractionManagerIsMode: "function",
    hasGetOwnDelta: "function",
    hasGetAncestors: "function",
    hasGetEditorInteractionFacade: "function",
    hasGetEditorSceneFacade: "function",
    hasApplyInteractionOverrideEntries: "function",
    inset: 8,
    iconSize: 48,
    minNodeSize: 24,
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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

