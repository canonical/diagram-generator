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

test("onResizeUp delegates resize completion through the typed resize host helper and shell callbacks", () => {
  const removedListeners: Array<{ type: string; handlerName: string }> = [];
  const handleDisplayStates: string[] = [];
  const callbackActions: Array<string | Record<string, unknown>> = [];
  let delegatedState: Record<string, unknown> | null = null;
  const clearedHoverTargets: unknown[] = [];
  const handleNode = {
    style: {
      set display(value: string) {
        handleDisplayStates.push(value);
      },
    },
  };
  const svg = {
    querySelectorAll(selector: string) {
      if (selector === ".dg-hover") return [hoverNode];
      if (selector === ".dg-handle") return [handleNode];
      return [];
    },
  };

  const onResizeUp = loadEditorFunction<() => void>(
    "onResizeUp",
    "()",
    {
      _cancelV3ResizeRelayout() {
        callbackActions.push("cancel-relayout");
      },
      document: {
        removeEventListener(type: string, handler: { name?: string }) {
          removedListeners.push({ type, handlerName: handler.name ?? "" });
        },
        querySelector(selector: string) {
          return selector === "#stage svg" ? svg : null;
        },
      },
      onResizeMove() {},
      clearGuideLines() {
        callbackActions.push("clear-guides");
      },
      mgr: {
        state: {
          hasMoved: true,
          cid: "alpha",
          selection: { ids: ["alpha", "beta"] },
          origOverrides: {
            alpha: { dw: 24 },
            beta: { dx: 8 },
          },
          propagatedIds: ["beta"],
          overrideSnapshotBefore: {
            alpha: { dw: 24 },
          },
        },
        endInteraction() {
          callbackActions.push("end-interaction");
        },
      },
      LayoutEngine: {
        clearPreviewSvgHoverState(svgNode: unknown) {
          clearedHoverTargets.push(svgNode);
        },
        completePreviewResizeInteraction(options: Record<string, any>) {
          delegatedState = normalizeVmValue(options.state);
          options.cancelLiveRelayout();
          options.removeDocumentListener("mousemove", options.onResizeMove);
          options.removeDocumentListener("mouseup", options.onResizeUp);
          options.clearGuideLines();
          options.clearSvgHoverState();
          options.cleanOverride("alpha");
          const before = options.captureOverrideEntries(["alpha"]);
          options.commitOverridePatchAction("Resize selection", before, before);
          options.reapplySelection();
          options.selectComponent("beta");
          options.persistResize(["alpha"], ["beta"], "alpha");
          options.showHandles();
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
        commitOverridePatchAction(label: string, beforeEntries: string[], afterEntries: string[]) {
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
      _persistResizeToV3(resizedIds: string[], propagatedIds: string[], triggerCid: string) {
        callbackActions.push({
          persistResize: {
            resizedIds,
            propagatedIds,
            triggerCid,
          },
        });
      },
      autoFitArtboard() {
        callbackActions.push("auto-fit-artboard");
      },
    },
  );

  onResizeUp();

  assert.deepEqual(delegatedState, {
    hasMoved: true,
    cid: "alpha",
    selectionIds: ["alpha", "beta"],
    origOverrideIds: ["alpha", "beta"],
    propagatedIds: ["beta"],
    overrideSnapshotBefore: {
      alpha: { dw: 24 },
    },
  });
  assert.deepEqual(removedListeners, [
    { type: "mousemove", handlerName: "onResizeMove" },
    { type: "mouseup", handlerName: "onResizeUp" },
  ]);
  assert.deepEqual(clearedHoverTargets, [svg]);
  assert.deepEqual(handleDisplayStates, [""]);
  assert.deepEqual(callbackActions, [
    "cancel-relayout",
    "clear-guides",
    { cleanOverride: "alpha" },
    {
      commitOverridePatchAction: {
        label: "Resize selection",
        beforeEntries: ["alpha"],
        afterEntries: ["alpha"],
      },
    },
    "reapply-selection",
    { selectComponent: "beta" },
    {
      persistResize: {
        resizedIds: ["alpha"],
        propagatedIds: ["beta"],
        triggerCid: "alpha",
      },
    },
    "end-interaction",
    "auto-fit-artboard",
  ]);
});
