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

test("layout bridge fresh-render wrapper accepts the typed layout-bridge runtime contract", async () => {
  const source = readPreviewScript("layout-bridge.js");
  let captured: Record<string, unknown> | null = null;
  const context = {
    console,
    _layoutBridgeRuntime: {
      async renderFreshSvg(
        overrides: Record<string, unknown>,
        gridOverrides: Record<string, unknown> | null,
        model: Record<string, unknown>,
      ) {
        captured = { overrides, gridOverrides, model };
        return {
          svg: { tagName: "svg" },
          width: 320,
          height: 200,
          coerced: new Map(),
        };
      },
    },
  };

  const helperSource = [
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

  assert.deepEqual(normalizeVmValue(captured), {
    overrides: { alpha: { dx: 8 } },
    gridOverrides: { cols: 8 },
    model: { id: "model" },
  });
  assert.deepEqual(normalizeVmValue(result), {
    svg: { tagName: "svg" },
    width: 320,
    height: 200,
    coerced: {},
  });
});

test("layout bridge frame-svg patch helpers accept the namespaced previewBridge.render contract", () => {
  const source = readPreviewScript("layout-bridge.js");
  const captured = {
    frames: [] as Array<{ frame: Record<string, unknown>; out: Record<string, unknown> }>,
    bounds: [] as Array<{ frame: Record<string, unknown>; out: Record<string, unknown> }>,
    fit: [] as Array<Record<string, unknown>>,
    patch: [] as Array<Record<string, unknown>>,
  };
  const sentinelSvg = { tagName: "svg" };
  const sentinelFrame = { id: "root" };
  const context = {
    console,
    _layoutBridgeRuntime: {
      getTextAdapter() {
        return { measurementBackend: "mock" };
      },
    },
    window: {
      __DG_getPreviewBridgeRenderContract() {
        return context.window.LayoutEngine.previewBridge.render;
      },
      LayoutEngine: {
        previewBridge: {
          render: {
            collectPreviewFramesById(frame: Record<string, unknown>, out: Record<string, unknown>) {
              captured.frames.push({ frame, out });
              return { root: frame };
            },
            collectPreviewPlacedBounds(frame: Record<string, unknown>, out: Record<string, unknown>) {
              captured.bounds.push({ frame, out });
              return { root: { x: 1, y: 2, w: 3, h: 4 } };
            },
            fitPreviewSvgToRenderedContent(options: Record<string, unknown>) {
              captured.fit.push(options);
              return { x: 0, y: 0, width: 300, height: 200 };
            },
            patchPreviewSvgFromLayout(options: Record<string, unknown>) {
              captured.patch.push(options);
            },
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "previewBridgeRenderContract", "()"),
    extractNamedFunctionSource(source, "collectFramesById", "(frame, out)"),
    extractNamedFunctionSource(source, "collectPlacedBounds", "(frame, out)"),
    extractNamedFunctionSource(source, "fitSvgToRenderedContent", "(svgEl, options)"),
    extractNamedFunctionSource(source, "patchSvgFromLayout", "(svgEl, oldBounds, newBounds, framesById)"),
    "this.__loaded = { collectFramesById, collectPlacedBounds, fitSvgToRenderedContent, patchSvgFromLayout };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      collectFramesById: (frame: Record<string, unknown>, out: Record<string, unknown>) => unknown;
      collectPlacedBounds: (frame: Record<string, unknown>, out: Record<string, unknown>) => unknown;
      fitSvgToRenderedContent: (svgEl: Record<string, unknown>, options: Record<string, unknown>) => unknown;
      patchSvgFromLayout: (
        svgEl: Record<string, unknown>,
        oldBounds: Record<string, unknown>,
        newBounds: Record<string, unknown>,
        framesById: Record<string, unknown>,
      ) => void;
    };
  }).__loaded;

  assert.deepEqual(
    normalizeVmValue(loaded.collectFramesById(sentinelFrame, { seeded: true })),
    { root: sentinelFrame },
  );
  assert.deepEqual(
    normalizeVmValue(loaded.collectPlacedBounds(sentinelFrame, { seeded: true })),
    { root: { x: 1, y: 2, w: 3, h: 4 } },
  );
  assert.deepEqual(
    normalizeVmValue(loaded.fitSvgToRenderedContent(sentinelSvg, {
      padding: 16,
      minWidth: 320,
      minHeight: 180,
    })),
    { x: 0, y: 0, width: 300, height: 200 },
  );
  loaded.patchSvgFromLayout(
    sentinelSvg,
    { before: { x: 0, y: 0, w: 10, h: 10 } },
    { after: { x: 2, y: 3, w: 11, h: 12 } },
    { root: sentinelFrame },
  );

  assert.deepEqual(normalizeVmValue(captured.frames), [
    { frame: sentinelFrame, out: { seeded: true } },
  ]);
  assert.deepEqual(normalizeVmValue(captured.bounds), [
    { frame: sentinelFrame, out: { seeded: true } },
  ]);
  assert.deepEqual(normalizeVmValue(captured.fit), [
    {
      svg: sentinelSvg,
      padding: 16,
      minWidth: 320,
      minHeight: 180,
    },
  ]);
  assert.deepEqual(normalizeVmValue(captured.patch), [
    {
      svg: sentinelSvg,
      oldBounds: { before: { x: 0, y: 0, w: 10, h: 10 } },
      newBounds: { after: { x: 2, y: 3, w: 11, h: 12 } },
      framesById: { root: sentinelFrame },
      textAdapter: { measurementBackend: "mock" },
    },
  ]);
});

test("layout bridge frame-tree render helper uses the bundle previewBridge.render contract when host wrappers overlap", () => {
  const source = readPreviewScript("layout-bridge.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const diagram = { root: { id: "root" } };
  const result = { width: 320, height: 200 };
  const context = {
    console,
    document: { tagName: "document" },
    _layoutBridgeRuntime: {
      getTextAdapter() {
        return { measurementBackend: "mock" };
      },
    },
    window: {
      __DG_getPreviewBridgeRenderContract() {
        return {
          renderPreviewFrameTreeToSvg() {
            throw new Error("merged render contract should not shadow the bundle renderer");
          },
        };
      },
      LayoutEngine: {
        previewBridge: {
          render: {
            renderPreviewFrameTreeToSvg(options: Record<string, unknown>) {
              capturedCalls.push(options);
              return { tagName: "svg" };
            },
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "previewBridgeBundleRenderContract", "()"),
    extractNamedFunctionSource(source, "renderFrameTreeToSvg", "(diagram, result, options)"),
    "this.__loaded = { renderFrameTreeToSvg };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      renderFrameTreeToSvg: (
        diagram: Record<string, unknown>,
        result: Record<string, unknown>,
        options: Record<string, unknown>,
      ) => unknown;
    };
  }).__loaded;

  assert.deepEqual(
    normalizeVmValue(loaded.renderFrameTreeToSvg(diagram, result, {
      iconElements: [{ id: "icon" }],
      overlays: [{ id: "overlay" }],
    })),
    { tagName: "svg" },
  );
  assert.deepEqual(normalizeVmValue(capturedCalls), [
    {
      ownerDocument: { tagName: "document" },
      diagram,
      result,
      textAdapter: { measurementBackend: "mock" },
      iconElements: [{ id: "icon" }],
      overlays: [{ id: "overlay" }],
    },
  ]);
});

test("layout bridge host helpers accept the namespaced previewBridge.host contract", () => {
  const source = readPreviewScript("layout-bridge.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    window: {
      __DG_getPreviewBridgeHostContract() {
        return context.window.LayoutEngine.previewBridge.host;
      },
      LayoutEngine: {
        previewBridge: {
          host: {
            applyFrameTreeRemovalsToPreviewTreeJson(
              treeJson: Record<string, unknown>,
              frameIds: string[],
            ) {
              capturedCalls.push({ kind: "removals", treeJson, frameIds });
              return ["alpha"];
            },
            updatePreviewComponentModelFromLayout(
              model: Record<string, unknown>,
              frame: Record<string, unknown>,
            ) {
              capturedCalls.push({ kind: "model", model, frame });
            },
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "previewBridgeHostContract", "()"),
    extractNamedFunctionSource(source, "applyFrameTreeRemovalsToJson", "(treeJson, frameIds)"),
    extractNamedFunctionSource(source, "updateComponentModelFromLayout", "(model, frame)"),
    "this.__loaded = { applyFrameTreeRemovalsToJson, updateComponentModelFromLayout };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      applyFrameTreeRemovalsToJson: (
        treeJson: Record<string, unknown>,
        frameIds: string[],
      ) => string[];
      updateComponentModelFromLayout: (
        model: Record<string, unknown>,
        frame: Record<string, unknown>,
      ) => void;
    };
  }).__loaded;

  assert.deepEqual(
    normalizeVmValue(loaded.applyFrameTreeRemovalsToJson({ root: { id: "root" } }, ["alpha"])),
    ["alpha"],
  );
  loaded.updateComponentModelFromLayout({ id: "model" }, { id: "root" });
  assert.deepEqual(normalizeVmValue(capturedCalls), [
    {
      kind: "removals",
      treeJson: { root: { id: "root" } },
      frameIds: ["alpha"],
    },
    {
      kind: "model",
      model: { id: "model" },
      frame: { id: "root" },
    },
  ]);
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
            return { ok: true, json };
          },
        },
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
    { ok: true, json: { id: "alpha" } },
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
              return { kind: "debug" };
            },
            renderPreviewElkRawView() {
              return { kind: "raw" };
            },
          },
        },
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
      previewElkEngineContract: () => Record<string, () => unknown>;
    };
  }).__loaded;

  assert.deepEqual(
    normalizeVmValue(loaded.previewElkEngineContract().renderPreviewElkDebugOverlay()),
    { kind: "debug" },
  );
  assert.deepEqual(
    normalizeVmValue(loaded.previewElkEngineContract().renderPreviewElkRawView()),
    { kind: "raw" },
  );
});

test("layout bridge runtime setup wires the local model-update wrapper into the typed runtime", () => {
  const source = readPreviewScript("layout-bridge.js");

  assert.match(source, /updateModelFromLayout:\s*updateComponentModelFromLayout,/);
  assert.doesNotMatch(source, /[^A-Za-z]updateModelFromLayout,\s*[\r\n]/);
});

test("layout bridge fresh-render runtime uses the bundle previewBridge.render contract instead of the merged host wrapper", () => {
  const source = readPreviewScript("layout-bridge.js");

  assert.match(source, /function previewBridgeBundleRenderContract\(\)/);
  assert.match(
    source,
    /renderFreshPreviewSvg:\s*async\s*\(options\)\s*=>\s*\{\s*const previewBridgeRender = previewBridgeBundleRenderContract\(\);/s,
  );
});

test("layout bridge routes engine relayout through the manifest/runtime seam instead of ELK-local helpers", () => {
  const source = readPreviewScript("layout-bridge.js");

  assert.match(source, /function _isEngineLayoutDiagramJson\(json\)/);
  assert.match(source, /resolvePreviewEngineManifest\(json\)/);
  assert.match(
    source,
    /async function performEngineRelayout\(model, overrides, gridOverrides\)\s*\{\s*return _layoutBridgeRuntime\.performEngineRelayout\(/s,
  );
  assert.doesNotMatch(source, /function _isElkLayeredDiagramJson\(json\)/);
  assert.doesNotMatch(source, /function _resolveElkOptionOverrides\(diagram, model\)/);
});
