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
  if (typeof context.window.__DG_getPreviewShellInteractionContract !== "function") {
    context.window.__DG_getPreviewShellInteractionContract = () => (
      context.LayoutEngine?.previewShell?.interaction
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

function normalizeVmValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

test("onDragUp delegates drag completion through the typed drag host helper and shell callbacks", () => {
  const removedListeners: Array<{ type: string; handlerName: string }> = [];
  const callbackActions: Array<string | Record<string, unknown>> = [];
  let delegatedState: Record<string, unknown> | null = null;

  const onDragUp = loadEditorFunction<() => void>(
    "onDragUp",
    "()",
    {
      document: {
        removeEventListener(type: string, handler: { name?: string }) {
          removedListeners.push({ type, handlerName: handler.name ?? "" });
        },
      },
      onDragMove() {},
      clearGuideLines() {
        callbackActions.push("clear-guides");
      },
      _clearReorderIndicator() {
        callbackActions.push("clear-reorder");
      },
      mgr: {
        state: {
          hasMoved: true,
          autolayout: false,
          cid: "alpha",
          cids: ["alpha", "beta"],
          reorderTarget: null,
          overrideSnapshotBefore: {
            alpha: { dx: 24 },
          },
        },
        endInteraction() {
          callbackActions.push("end-interaction");
        },
      },
      LayoutEngine: {
        completePreviewDragInteraction(options: Record<string, any>) {
          delegatedState = normalizeVmValue(options.state);
          options.removeDocumentListener("mousemove", options.onDragMove);
          options.removeDocumentListener("mouseup", options.onDragUp);
          options.clearGuideLines();
          options.clearReorderIndicator();
          options.cleanOverride("alpha");
          options.cleanOverride("beta");
          const after = options.captureOverrideEntries(["alpha", "beta"]);
          options.reapplySelection();
          options.commitOverridePatchAction("Move selection", options.state.overrideSnapshotBefore, after);
          options.endInteraction();
          options.autoFitArtboard();
        },
      },
      cleanOverride(id: string) {
        callbackActions.push({ cleanOverride: id });
      },
      EditorState: {
        captureOverrideEntries(ids: string[]) {
          return ids;
        },
        commitOverridePatchAction(label: string, beforeEntries: unknown, afterEntries: unknown) {
          callbackActions.push({
            commitOverridePatchAction: {
              label,
              beforeEntries,
              afterEntries,
            },
          });
        },
      },
      reapplySelection() {
        callbackActions.push("reapply-selection");
      },
      selectComponent(id: string) {
        callbackActions.push({ selectComponent: id });
      },
      _applyReorder(parentId: string, cid: string, insertIndex: number) {
        callbackActions.push({ applyReorder: [parentId, cid, insertIndex] });
      },
      autoFitArtboard() {
        callbackActions.push("auto-fit-artboard");
      },
    },
  );

  onDragUp();

  assert.deepEqual(delegatedState, {
    hasMoved: true,
    autolayout: false,
    cid: "alpha",
    cids: ["alpha", "beta"],
    reorderTarget: null,
    overrideSnapshotBefore: {
      alpha: { dx: 24 },
    },
  });
  assert.deepEqual(removedListeners, [
    { type: "mousemove", handlerName: "onDragMove" },
    { type: "mouseup", handlerName: "onDragUp" },
  ]);
  assert.deepEqual(callbackActions, [
    "clear-guides",
    "clear-reorder",
    { cleanOverride: "alpha" },
    { cleanOverride: "beta" },
    "reapply-selection",
    {
      commitOverridePatchAction: {
        label: "Move selection",
        beforeEntries: {
          alpha: { dx: 24 },
        },
        afterEntries: ["alpha", "beta"],
      },
    },
    "end-interaction",
    "auto-fit-artboard",
  ]);
});
