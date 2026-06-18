import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

function loadEditorSource(): string {
  const repoRoot = path.resolve(process.cwd(), "..", "..");
  return fs.readFileSync(path.join(repoRoot, "scripts", "preview", "editor.js"), "utf8");
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

function loadEditorFunction<T extends (...args: any[]) => unknown>(
  functionName: string,
  signature: string,
  overrides: Record<string, unknown>,
): T {
  const context: Record<string, any> = {
    console,
    ...overrides,
  };
  context.window ??= {};
  if (typeof context.window.__DG_getPreviewShellInspectorContract !== "function") {
    context.window.__DG_getPreviewShellInspectorContract = () => (
      context.LayoutEngine?.previewShell?.inspector
      ?? context.LayoutEngine
      ?? null
    );
  }
  const source = `${extractNamedFunctionSource(loadEditorSource(), functionName, signature)}\nthis.__loaded = ${functionName};`;
  vm.runInNewContext(source, context);
  const loaded = (context as { __loaded?: T }).__loaded;
  if (!loaded) {
    throw new Error(`${functionName} was not loaded`);
  }
  return loaded;
}

function createMutationTrap(label: string) {
  return new Proxy({}, {
    set() {
      throw new Error(`${label} should be mutated only inside the typed helper`);
    },
    defineProperty() {
      throw new Error(`${label} should be mutated only inside the typed helper`);
    },
  });
}

test("setFrameAlign delegates through the typed single-frame mutation helper", () => {
  let delegatedOptions: Record<string, unknown> | null = null;
  let relayoutCid: string | null = null;

  const setFrameAlign = loadEditorFunction<(cid: string, align: string) => void>(
    "setFrameAlign",
    "(cid, align)",
    {
      overrides: createMutationTrap("overrides"),
      _coercedKeys: new Set<string>(),
      snapToGrid(value: number) {
        return value;
      },
      model: {
        get() {
          return { data: { width: 120, height: 64 } };
        },
      },
      _getInspectorMutationRuntime() {
        return {
          setFrameAlign(cid: string, align: string) {
            delegatedOptions = { cid, align };
            relayoutCid = cid;
          },
        };
      },
      LayoutEngine: {
        dispatchPreviewSingleFrameAlignHost(options: Record<string, unknown>) {
          delegatedOptions = {
            cid: options.cid,
            align: options.align,
          };
          options.scheduleRelayout(options.cid);
          return { kind: "change" };
        },
      },
      EditorState: {
        captureOverrideEntries(ids: string[]) {
          return ids;
        },
        commitOverridePatchAction() {},
      },
      setDirty() {},
      renderSelectionInspector() {},
      requestV3Relayout(cid: string) {
        relayoutCid = cid;
      },
      clearTimeout() {},
      setTimeout(callback: () => void) {
        callback();
        return 1;
      },
      _v3RelayoutTimer: null,
    },
  );

  setFrameAlign("alpha", "CENTER_RIGHT");

  assert.deepEqual(delegatedOptions, {
    cid: "alpha",
    align: "CENTER_RIGHT",
  });
  assert.equal(relayoutCid, "alpha");
});

test("setMultiFrameAlign delegates through the typed multi-frame mutation helper", () => {
  let delegatedOptions: Record<string, unknown> | null = null;

  const setMultiFrameAlign = loadEditorFunction<(align: string) => void>(
    "setMultiFrameAlign",
    "(align)",
    {
      _getInspectorSelectionRuntime() {
        return {
          setMultiFrameAlign(align: string) {
            delegatedOptions = { align };
          },
        };
      },
      selectedIds: new Set(["alpha", "beta"]),
      overrides: createMutationTrap("overrides"),
      _coercedKeys: new Set<string>(),
      model: {
        get(cid: string) {
          return { id: cid, data: { width: 120, height: 64 } };
        },
      },
      EditorState: {
        captureOverrideEntries(ids: string[]) {
          return ids;
        },
        commitOverridePatchAction() {},
      },
      setDirty() {},
      renderMultiSelectionInspector() {},
      clearTimeout() {},
      setTimeout(callback: () => void) {
        callback();
        return 1;
      },
      _v3RelayoutTimer: null,
    },
  );

  setMultiFrameAlign("BOTTOM_CENTER");

  assert.deepEqual(delegatedOptions, {
    align: "BOTTOM_CENTER",
  });
});
