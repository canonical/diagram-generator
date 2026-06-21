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

test("layout bridge relayout setup forwards the namespaced previewBridge.relayout contract into the typed host runtime", () => {
  const source = readPreviewScript("layout-bridge.js");
  assert.match(
    source,
    /previewBridgeRelayout:\s*window\.__DG_getPreviewBridgeRelayoutContract\(\),/,
  );
  assert.match(
    source,
    /createPreviewLayoutBridgeRuntimeFromBrowserHost\(\{/,
  );
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

test("layout bridge render setup forwards the namespaced previewBridge.render contracts into the typed host runtime", () => {
  const source = readPreviewScript("layout-bridge.js");
  assert.match(
    source,
    /previewBridgeRender:\s*previewBridgeRenderContract\(\),/,
  );
  assert.match(
    source,
    /previewBridgeBundleRender:\s*previewBridgeBundleRenderContract\(\),/,
  );
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
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "previewBridgeHostContract", "()"),
    extractNamedFunctionSource(source, "applyFrameTreeRemovalsToJson", "(treeJson, frameIds)"),
    "this.__loaded = { applyFrameTreeRemovalsToJson };",
  ].join("\n");

  vm.runInNewContext(helperSource, context);
  const loaded = (context as {
    __loaded: {
      applyFrameTreeRemovalsToJson: (
        treeJson: Record<string, unknown>,
        frameIds: string[],
      ) => string[];
    };
  }).__loaded;

  assert.deepEqual(
    normalizeVmValue(loaded.applyFrameTreeRemovalsToJson({ root: { id: "root" } }, ["alpha"])),
    ["alpha"],
  );
  assert.deepEqual(normalizeVmValue(capturedCalls), [
    {
      kind: "removals",
      treeJson: { root: { id: "root" } },
      frameIds: ["alpha"],
    },
  ]);
  assert.match(source, /previewBridgeHost:\s*previewBridgeHostContract\(\),/);
});

test("layout bridge core setup accepts the namespaced core contract", () => {
  const source = readPreviewScript("layout-bridge.js");
  assert.match(source, /function previewCoreContract\(\)/);
  assert.match(source, /previewCore:\s*previewCoreContract\(\),/);
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

test("layout bridge runtime setup uses typed browser-host builders instead of JS-local bridge assembly", () => {
  const source = readPreviewScript("layout-bridge.js");

  assert.match(source, /createPreviewLayoutBridgeRuntimeFromBrowserHost\(\{/);
  assert.match(source, /createPreviewElkViewModeRuntimeFromBrowserHost\(\{/);
});

test("layout bridge fresh-render runtime uses the bundle previewBridge.render contract instead of the merged host wrapper", () => {
  const source = readPreviewScript("layout-bridge.js");

  assert.match(source, /function previewBridgeBundleRenderContract\(\)/);
  assert.match(source, /previewBridgeBundleRender:\s*previewBridgeBundleRenderContract\(\),/);
});

test("layout bridge routes engine relayout through the manifest/runtime seam instead of ELK-local helpers", () => {
  const source = readPreviewScript("layout-bridge.js");

  assert.match(source, /resolvePreviewEngineManifest,/);
  assert.match(
    source,
    /async function performEngineRelayout\(model, overrides, gridOverrides\)\s*\{\s*return _layoutBridgeRuntime\.performEngineRelayout\(/s,
  );
  assert.doesNotMatch(source, /function _isElkLayeredDiagramJson\(json\)/);
  assert.doesNotMatch(source, /function _resolveElkOptionOverrides\(diagram, model\)/);
});
