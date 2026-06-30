import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";

import { createPreviewEngineLayoutControlsRuntime } from "@diagram-generator/layout-engine";

import {
  attachPreviewCompat,
  extractNamedFunctionSource,
  readPreviewScript,
} from "./preview-script-test-helpers.js";

test("layout-params-controls renders from the namespaced previewEngines contract", () => {
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
  const layoutEngine = {
    previewEngines: {
      registry: {
        resolvePreviewEngine({ layoutEngine }: { layoutEngine?: string | null }) {
          return layoutEngine === "elk-layered"
            ? { id: "synthetic-layered", hostView: { sidebarSections: ["layout-params"] } }
            : null;
        },
        listPreviewEnginesBySidebarSection(section: string) {
          if (section !== "layout-params") return [];
          return [
            {
              id: "synthetic-layered",
              hostView: { sidebarSections: ["layout-params"] },
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
      graph: {
        createPreviewEngineLayoutControlsRuntime(options: {
          document: { getElementById: (id: string) => unknown };
        }) {
          return {
            buildPanel() {
              const runtimeSection = options.document.getElementById("layout-params-section") as {
                hidden?: boolean;
              } | null;
              const runtimeContainer = options.document.getElementById("layout-params-controls") as {
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
  };

  const context = {
    window: {
      __DG_CONFIG: {},
      LayoutEngine: layoutEngine,
    },
    document: {
      getElementById(id: string) {
        if (id === "layout-params-section") return section;
        if (id === "layout-params-controls") return container;
        return null;
      },
    },
    console,
    setTimeout,
    clearTimeout,
    LayoutEngine: layoutEngine,
  };

  vm.runInNewContext(readPreviewScript("layout-params-controls.js"), context);
  const previewEngineLayoutControls = (
    context.window as {
      PreviewEngineLayoutControls: { buildPanel: (frameTreeJson: unknown) => void };
    }
  ).PreviewEngineLayoutControls;

  previewEngineLayoutControls.buildPanel({ layoutEngine: "elk-layered", elkLayout: {} });

  assert.equal(section.hidden, false);
  assert.match(container.innerHTML, /Node spacing/);
});

test("layout-params-controls does not fall back to layered controls for unresolved explicit engines", () => {
  const section = {
    hidden: false,
    attrs: new Map<string, string>(),
    hasAttribute(name: string) {
      return name === "hidden" ? this.hidden : this.attrs.has(name);
    },
    setAttribute(name: string, value: string) {
      this.attrs.set(name, value);
    },
    removeAttribute(name: string) {
      this.attrs.delete(name);
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
  const container = {
    innerHTML: "%ELK_LAYOUT_CONTROLS_HTML%",
    textContent: "",
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
  const layoutEngine = {
    previewEngines: {
      registry: {
        resolvePreviewEngine() {
          return null;
        },
        listPreviewEnginesBySidebarSection(sectionName: string) {
          if (sectionName !== "layout-params") return [];
          return [
            {
              id: "elk-layered",
              hostView: { sidebarSections: ["layout-params"] },
              controlSpecs: [
                {
                  key: "elk.layered.spacing.nodeNodeBetweenLayers",
                  label: "Layer gap",
                  group: "Layering",
                  kind: "number",
                  defaultValue: "64",
                },
              ],
            },
          ];
        },
      },
      graph: {
        createPreviewEngineLayoutControlsRuntime,
      },
    },
  };

  const context = {
    window: {
      __DG_CONFIG: { layout_engine: "elk-stress" },
      LayoutEngine: layoutEngine,
    },
    document: {
      getElementById(id: string) {
        if (id === "layout-params-section") return section;
        if (id === "layout-params-controls") return container;
        return null;
      },
    },
    console,
    setTimeout,
    clearTimeout,
    LayoutEngine: layoutEngine,
  };

  attachPreviewCompat(context);
  vm.runInNewContext(readPreviewScript("layout-params-controls.js"), context);
  const previewEngineLayoutControls = (
    context.window as {
      PreviewEngineLayoutControls: { buildPanel: (frameTreeJson: unknown) => void };
    }
  ).PreviewEngineLayoutControls;

  previewEngineLayoutControls.buildPanel({ layoutEngine: "elk-stress", elkLayout: {} });

  assert.equal(section.hidden, true);
  assert.doesNotMatch(container.innerHTML, /Layer gap/);
});


test("layout-params-controller resolves graph-engine diagrams from the namespaced previewEngines registry", () => {
  const layoutEngine = {
    previewEngines: {
      registry: {
        resolvePreviewEngine({ layoutEngine }: { layoutEngine?: string | null }) {
          return layoutEngine === "elk-layered"
            ? { id: "synthetic-layered", hostView: { sidebarSections: ["layout-params"] } }
            : null;
        },
      },
      graph: {
        createPreviewEngineShellControllerRuntime() {
          return {
            init() {},
            isActiveLayoutEngine(frameTreeJson: unknown) {
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
            applyLayoutOverrides() {},
            collectPersistedPayload() {
              return {};
            },
            requestRelayout() {},
          };
        },
      },
    },
  };

  const context = {
    window: {
      __DG_CONFIG: {},
      LayoutEngine: layoutEngine,
    },
    document: {
      getElementById() {
        return { hasAttribute: () => true };
      },
    },
    console,
    LayoutEngine: layoutEngine,
  };

  vm.runInNewContext(readPreviewScript("layout-params-controller.js"), context);
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

  assert.equal(previewEngineShellController.isActiveLayoutEngine({ layoutEngine: "elk-layered" }), true);
  assert.equal(requestPreviewEngineRelayout, previewEngineShellController.requestRelayout);
});

test("save-client resolves the namespaced previewShell.bootstrap runtime", () => {
  let resolvedFromNamespace = false;
  const previewSaveClient = { saveOverrides() {}, trySaveIfDirty() {} };
  const layoutEngine = {
    previewShell: {
      bootstrap: {
        createPreviewSaveClientRuntime() {
          resolvedFromNamespace = true;
          return previewSaveClient;
        },
      },
    },
  };
  const context = {
    window: {
      __DG_CONFIG: {},
      LayoutEngine: layoutEngine,
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
    LayoutEngine: layoutEngine,
  };

  vm.runInNewContext(readPreviewScript("save-client.js"), context);

  assert.equal(resolvedFromNamespace, true);
  assert.equal((context.window as { PreviewSaveClient?: unknown }).PreviewSaveClient, previewSaveClient);
});

test("browser preview wrappers no longer fall back to flat browser-entry aliases", () => {
  assert.equal(readPreviewScript("save-client.js").includes("LayoutEngine.createPreviewSaveClientRuntime"), false);
  assert.equal(readPreviewScript("layout-params-controls.js").includes("LayoutEngine.createPreviewEngineLayoutControlsRuntime"), false);
  assert.equal(readPreviewScript("layout-params-controller.js").includes("LayoutEngine.createPreviewEngineShellControllerRuntime"), false);
  const forceSource = readPreviewScript("force.js");
  assert.equal(forceSource.includes("window.LayoutEngine?.getPreviewEngine?.("), false);
  assert.equal(forceSource.includes("window.LayoutEngine?.[methodName]"), false);
  assert.equal(
    forceSource.includes("window.LayoutEngine && typeof window.LayoutEngine.updateForceSimulationParams"),
    false,
  );
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
