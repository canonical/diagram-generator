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
  const markers = [
    `async function ${functionName}${signature} {`,
    `function ${functionName}${signature} {`,
  ];
  let start = -1;
  for (const marker of markers) {
    start = source.indexOf(marker);
    if (start !== -1) {
      break;
    }
  }
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

function loadAsyncEditorFunction<T extends (...args: any[]) => Promise<unknown>>(
  functionName: string,
  signature: string,
  overrides: Record<string, unknown>,
): T {
  const context: Record<string, any> = {
    console,
    ...overrides,
  };
  context.window ??= {};
  if (typeof context.window.__DG_getPreviewShellInteractionContract !== "function") {
    context.window.__DG_getPreviewShellInteractionContract = () => (
      context.LayoutEngine?.previewShell?.interaction
      ?? context.LayoutEngine
      ?? null
    );
  }
  if (typeof context.window.__DG_getPreviewBridgeHostContract !== "function") {
    context.window.__DG_getPreviewBridgeHostContract = () => (
      context.LayoutEngine?.previewBridge?.host
      ?? context.LayoutEngine
      ?? null
    );
  }
  const editorSource = loadEditorSource();
  const source = [
    extractNamedFunctionSource(editorSource, "_getPreviewBridgeHostContract", "()"),
    extractNamedFunctionSource(editorSource, "_readFrameTreeJson", "()"),
    extractNamedFunctionSource(editorSource, functionName, signature),
    `this.__loaded = ${functionName};`,
  ].join("\n");
  vm.runInNewContext(source, context);
  const loaded = (context as { __loaded?: T }).__loaded;
  if (!loaded) {
    throw new Error(`${functionName} was not loaded`);
  }
  return loaded;
}

test("deleteSelectedFrames delegates through the typed delete dispatcher", async () => {
  let delegatedOptions: Record<string, unknown> | null = null;
  const removedIds = new Set<string>();
  const selectedIds = new Set(["alpha", "beta"]);
  const cleared: string[] = [];
  let dirtied = false;
  let deselected = false;

  const deleteSelectedFrames = loadAsyncEditorFunction<() => Promise<boolean>>(
    "deleteSelectedFrames",
    "()",
    {
      selectedIds,
      mgr: {
        isMode() {
          return false;
        },
      },
      InteractionMode: {
        TEXT_EDITING: "text_editing",
      },
      LayoutEngine: {
        previewBridge: {
          host: {
            getFrameTreeJson() {
              return { root: { id: "root" } };
            },
          },
        },
        async deletePreviewSelectedFramesHost(options: Record<string, any>) {
          delegatedOptions = {
            selectedIds: Array.from(options.selectedIds as Iterable<string>),
            isTextEditing: options.isTextEditing,
            hasGetFrameTreeJson: typeof options.getFrameTreeJson,
            rootNodeIds: Array.from(options.rootNodes as Array<{ id: string }>).map((node) => node.id),
            fallbackRootId: options.fallbackRootId,
          };
          options.markRemoved("alpha");
          options.clearOverride("alpha");
          options.unselect("beta");
          options.setDirty(true);
          options.deselectAll();
          return {
            kind: "deleted",
            removedIds: ["alpha"],
            topLevelIds: ["alpha"],
            rerendered: true,
          };
        },
      },
      model: {
        roots: [{ id: "page-root" }],
        removedIds,
        clearOverride(id: string) {
          cleared.push(id);
        },
        get() {
          return null;
        },
      },
      setDirty(value: boolean) {
        dirtied = value;
      },
      _rerenderStageFromModel: async () => true,
      deselectAll() {
        deselected = true;
      },
      EditorState: {
        beginUndoableAction() {
          throw new Error("editor.js should not begin delete actions inline anymore");
        },
        commitUndoableAction() {
          throw new Error("editor.js should not commit delete actions inline anymore");
        },
      },
      alert() {},
    },
  );

  const result = await deleteSelectedFrames();

  assert.equal(result, true);
  assert.deepEqual(delegatedOptions, {
    selectedIds: ["alpha", "beta"],
    isTextEditing: false,
    hasGetFrameTreeJson: "function",
    rootNodeIds: ["page-root"],
    fallbackRootId: "page",
  });
  assert.deepEqual([...removedIds], ["alpha"]);
  assert.deepEqual(cleared, ["alpha"]);
  assert.deepEqual([...selectedIds], ["alpha"]);
  assert.equal(dirtied, true);
  assert.equal(deselected, true);
});
