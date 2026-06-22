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

  const destructurePrefixes = [
    "const {",
    "let {",
    "var {",
  ];

  for (const prefix of destructurePrefixes) {
    let searchIndex = 0;
    while (true) {
      const start = source.indexOf(prefix, searchIndex);
      if (start === -1) {
        break;
      }

      const bodyStart = source.indexOf("{", start);
      if (bodyStart === -1) {
        break;
      }

      let depth = 0;
      let bodyEnd = -1;
      for (let index = bodyStart; index < source.length; index += 1) {
        const char = source[index];
        if (char === "{") depth += 1;
        else if (char === "}") {
          depth -= 1;
          if (depth === 0) {
            bodyEnd = index;
            break;
          }
        }
      }

      if (bodyEnd === -1) {
        throw new Error(`${functionName} destructured body end not found`);
      }

      const statementEnd = source.indexOf(";", bodyEnd);
      if (statementEnd === -1) {
        throw new Error(`${functionName} destructured statement end not found`);
      }

      const statement = source.slice(start, statementEnd + 1);
      const aliasPattern = new RegExp(
        String.raw`(?:^|[,{])\s*(?:[A-Za-z_$][\w$]*\s*:\s*)?${functionName}(?:\s*[=,}])`,
        "m",
      );
      const aliasMatch = statement.match(
        new RegExp(
          String.raw`(?:^|[,{])\s*(?:([A-Za-z_$][\w$]*)\s*:\s*)?${functionName}(?:\s*[=,}])`,
          "m",
        ),
      );
      if (aliasPattern.test(statement)) {
        const compatKey = aliasMatch?.[1] ?? functionName;
        return `const ${functionName} = _getPreviewGridEditorCompat().${compatKey};`;
      }

      searchIndex = statementEnd + 1;
    }
  }

  throw new Error(`${functionName} definition not found`);
}

function normalizeVmValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

test("layout bridge setup delegates through the typed legacy-browser install helper", () => {
  const source = readPreviewScript("layout-bridge.js");
  assert.match(
    source,
    /createPreviewLayoutBridgeInstallRuntimeFromLegacyBrowserHost\(\{/,
  );
  assert.match(
    source,
    /installCompatWindowBindings\(\);/,
  );
});

test("layout bridge fresh-render wrapper accepts the typed layout-bridge runtime contract", async () => {
  const source = readPreviewScript("layout-bridge.js");
  let captured: Record<string, unknown> | null = null;
  const context = {
    console,
    _previewLayoutBridgeInstallRuntime: {
      async renderFreshSvg(
        overrides: Record<string, unknown>,
        gridOverrides: Record<string, unknown> | null,
        model: Record<string, unknown>,
        relayoutOptions: unknown,
      ) {
        captured = { overrides, gridOverrides, model, relayoutOptions };
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
    relayoutOptions: null,
  });
  assert.deepEqual(normalizeVmValue(result), {
    svg: { tagName: "svg" },
    width: 320,
    height: 200,
    coerced: {},
  });
});

test("layout bridge frame-tree render helper delegates through the typed install runtime", () => {
  const source = readPreviewScript("layout-bridge.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const diagram = { root: { id: "root" } };
  const result = { width: 320, height: 200 };
  const context = {
    console,
    _previewLayoutBridgeInstallRuntime: {
      renderFrameTreeToSvg(
        nextDiagram: Record<string, unknown>,
        nextResult: Record<string, unknown>,
        nextOptions: Record<string, unknown>,
      ) {
        capturedCalls.push({
          diagram: nextDiagram,
          result: nextResult,
          options: nextOptions,
        });
        return { tagName: "svg" };
      },
    },
  };

  const helperSource = [
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
      diagram,
      result,
      options: {
        iconElements: [{ id: "icon" }],
        overlays: [{ id: "overlay" }],
      },
    },
  ]);
});

test("layout bridge host helpers accept the namespaced previewBridge.host contract", () => {
  const source = readPreviewScript("layout-bridge.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    _previewLayoutBridgeInstallRuntime: {
      applyFrameTreeRemovalsToJson(
        treeJson: Record<string, unknown>,
        frameIds: string[],
      ) {
        capturedCalls.push({ kind: "removals", treeJson, frameIds });
        return ["alpha"];
      },
    },
  };

  const helperSource = [
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
});

test("layout bridge setup no longer assembles core/render/elk contracts inline in JS", () => {
  const source = readPreviewScript("layout-bridge.js");
  assert.doesNotMatch(source, /function previewCoreContract\(\)/);
  assert.doesNotMatch(source, /function previewBridgeRenderContract\(\)/);
  assert.doesNotMatch(source, /function previewBridgeBundleRenderContract\(\)/);
  assert.doesNotMatch(source, /function previewBridgeHostContract\(\)/);
  assert.doesNotMatch(source, /function previewElkEngineContract\(\)/);
});

test("layout bridge runtime setup uses the typed install runtime instead of JS-local bridge assembly", () => {
  const source = readPreviewScript("layout-bridge.js");

  assert.match(source, /createPreviewLayoutBridgeInstallRuntimeFromLegacyBrowserHost\(\{/);
  assert.doesNotMatch(source, /createPreviewLayoutBridgeRuntimeFromBrowserHost\(\{/);
  assert.doesNotMatch(source, /createPreviewElkViewModeRuntimeFromBrowserHost\(\{/);
});

test("layout bridge routes engine relayout through the manifest/runtime seam instead of ELK-local helpers", () => {
  const source = readPreviewScript("layout-bridge.js");

  assert.match(
    source,
    /async function performEngineRelayout\(model, overrides, gridOverrides\)\s*\{\s*return _previewLayoutBridgeInstallRuntime\.performEngineRelayout\(/s,
  );
  assert.doesNotMatch(source, /function _isElkLayeredDiagramJson\(json\)/);
  assert.doesNotMatch(source, /function _resolveElkOptionOverrides\(diagram, model\)/);
});
