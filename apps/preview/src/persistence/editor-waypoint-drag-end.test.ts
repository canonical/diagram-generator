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

test("onWpDragUp delegates waypoint drag completion through the typed host helper", () => {
  const removedListeners: Array<{ type: string; handlerName: string }> = [];
  const callbackActions: Array<string | Record<string, unknown>> = [];
  let delegatedState: Record<string, unknown> | null = null;

  const onWpDragUp = loadEditorFunction<(event?: unknown) => void>(
    "onWpDragUp",
    "(e)",
    {
      document: {
        removeEventListener(type: string, handler: { name?: string }) {
          removedListeners.push({ type, handlerName: handler.name ?? "" });
        },
      },
      onWpDragMove() {},
      getArrowNode(cid: string) {
        return { id: cid };
      },
      getArrowPoints(cid: string) {
        return { cid };
      },
      rebuildArrowSVG(cid: string) {
        callbackActions.push({ rebuildArrowSVG: cid });
      },
      showArrowWaypointHandles(cid: string) {
        callbackActions.push({ showArrowWaypointHandles: cid });
      },
      setWaypointOverride(cid: string) {
        callbackActions.push({ setWaypointOverride: cid });
      },
      _refreshSelectedArrowInspector(cid: string) {
        callbackActions.push({ refreshInspector: cid });
      },
      EditorState: {
        captureOverrideEntries(ids: string[]) {
          return { ids };
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
      mgr: {
        state: {
          cid: "arrow-1",
          idx: 0,
          startX: 10,
          startY: 20,
          origX: 40,
          origY: 60,
          hasMoved: true,
          axis: "free",
        },
        endInteraction() {
          callbackActions.push("endInteraction");
        },
      },
      LayoutEngine: {
        completePreviewWaypointDragInteraction(options: Record<string, any>) {
          delegatedState = normalizeVmValue(options.state);
          options.removeDocumentListener("mousemove", options.onWaypointDragMove);
          options.removeDocumentListener("mouseup", options.onWaypointDragUp);
          options.rebuildArrowSvg("arrow-1");
          options.showArrowWaypointHandles("arrow-1");
          options.persistWaypointOverride("arrow-1");
          options.refreshInspector("arrow-1");
          options.commitOverridePatchAction(
            "Move waypoint",
            options.captureOverrideEntries(["arrow-1"]),
            options.captureOverrideEntries(["arrow-1"]),
          );
          options.endInteraction();
        },
      },
    },
  );

  onWpDragUp();

  assert.deepEqual(delegatedState, {
    cid: "arrow-1",
    idx: 0,
    startX: 10,
    startY: 20,
    origX: 40,
    origY: 60,
    hasMoved: true,
    axis: "free",
  });
  assert.deepEqual(removedListeners, [
    { type: "mousemove", handlerName: "onWpDragMove" },
    { type: "mouseup", handlerName: "onWpDragUp" },
  ]);
  assert.deepEqual(callbackActions, [
    { rebuildArrowSVG: "arrow-1" },
    { showArrowWaypointHandles: "arrow-1" },
    { setWaypointOverride: "arrow-1" },
    { refreshInspector: "arrow-1" },
    {
      commitOverridePatchAction: {
        label: "Move waypoint",
        beforeEntries: { ids: ["arrow-1"] },
        afterEntries: { ids: ["arrow-1"] },
      },
    },
    "endInteraction",
  ]);
});
