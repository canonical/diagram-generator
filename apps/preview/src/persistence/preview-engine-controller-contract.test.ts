import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";

import {
  attachPreviewCompat,
  extractNamedFunctionSource,
  readPreviewScript,
} from "./preview-script-test-helpers.js";

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

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
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

