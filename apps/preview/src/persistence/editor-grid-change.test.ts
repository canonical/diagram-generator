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

function loadEditorRuntime<T extends (...args: any[]) => unknown>(
  functionName: string,
  signature: string,
  overrides: Record<string, unknown>,
): { fn: T; context: Record<string, unknown> } {
  const context: Record<string, unknown> = {
    console,
    ...overrides,
  };
  const source = `${extractNamedFunctionSource(loadEditorSource(), functionName, signature)}\nthis.__loaded = ${functionName};`;
  vm.runInNewContext(source, context);
  const loaded = context.__loaded as T | undefined;
  if (!loaded) {
    throw new Error(`${functionName} was not loaded`);
  }
  return {
    fn: loaded,
    context,
  };
}

test("onGridControlChange delegates through the typed grid host helper and shell callbacks", async () => {
  let delegatedOptions: Record<string, unknown> | null = null;
  const dirtied: boolean[] = [];
  const clearedTimers: number[] = [];
  const relayoutRequests: string[] = [];
  let scheduledCallback: (() => Promise<void>) | null = null;
  let pruned = false;
  let renderedOverlay = 0;

  const runtimeUpdate = {
    gridOverrides: {
      rows: 9,
      col_gap: 32,
    },
    shouldPruneLinkedRootOverrides: true,
    relayoutRootId: "root-1",
    overlayGridInfo: {
      _rows: 11,
    },
  };
  const gridRowsInput = { value: "" };
  let pendingGridAction: unknown = null;

  const { fn: onGridControlChange, context } = loadEditorRuntime<() => void>(
    "onGridControlChange",
    "()",
    {
      BASELINE_STEP: 24,
      GRID_DEFAULTS: {
        margin_top: 24,
      },
      window: {
        __DG_getPreviewShellSceneContract() {
          return (context.LayoutEngine as {
            previewShell: {
              scene: {
                dispatchPreviewGridControlChangeHost: (options: Record<string, any>) => unknown;
              };
            };
          }).previewShell.scene;
        },
      },
      gridInfo: {
        _rows: 3,
      },
      _gridEl() {
        return null;
      },
      EditorState: {
        getPendingGridAction() {
          return pendingGridAction;
        },
        setPendingGridAction(action: unknown) {
          pendingGridAction = action;
        },
        beginUndoableAction(label: string) {
          return { label };
        },
        commitUndoableAction(action: unknown) {
          delegatedOptions = {
            ...(delegatedOptions ?? {}),
            committedAction: action,
          };
        },
      },
      model: {
        roots: [{ id: "root-1" }],
        gridOverrides: {},
      },
      _pruneLinkedRootGridOverrides() {
        pruned = true;
      },
      setDirty(value: boolean) {
        dirtied.push(value);
      },
      relayoutTimer: 41,
      clearTimeout(timerId: number) {
        clearedTimers.push(timerId);
      },
      setTimeout(callback: () => Promise<void>) {
        scheduledCallback = callback;
        return 42;
      },
      LayoutEngine: {
        previewShell: {
          scene: {
            dispatchPreviewGridControlChangeHost(options: Record<string, any>) {
              delegatedOptions = {
                gridInfoRows: options.gridInfo?._rows,
                baselineStep: options.baselineStep,
                rootId: options.rootId,
                relayoutTimer: options.relayoutTimer,
                hasDocument: typeof options.document?.getElementById,
                hasSetGridOverrides: typeof options.setGridOverrides,
                hasRequestRelayout: typeof options.requestRelayout,
                startedAction: options.beginPendingAction(),
              };
              options.clearRelayoutTimer(options.relayoutTimer);
              options.setPendingAction((delegatedOptions as Record<string, unknown>).startedAction);
              options.setGridOverrides(runtimeUpdate.gridOverrides);
              options.pruneLinkedRootOverrides();
              options.setDirty(true);
              options.setRelayoutTimer(options.scheduleRelayout(async () => {
                await options.requestRelayout(runtimeUpdate.relayoutRootId);
                options.commitPendingAction(options.getPendingAction());
                options.setPendingAction(null);
              }, 200));
              options.setOverlayGridInfo(runtimeUpdate.overlayGridInfo);
              options.setRowsControlValue(runtimeUpdate.overlayGridInfo._rows);
              options.renderGridOverlay();
              return { kind: "applied" };
            },
          },
        },
      },
      requestV3Relayout: async (cid: string) => {
        relayoutRequests.push(cid);
      },
      document: {
        getElementById(id: string) {
          return id === "grid-rows" ? gridRowsInput : null;
        },
      },
      renderGridOverlay() {
        renderedOverlay += 1;
      },
    },
  );

  onGridControlChange();
  assert.ok(scheduledCallback, "expected grid relayout debounce callback");
  await scheduledCallback?.();

  assert.deepEqual(delegatedOptions, {
    gridInfoRows: 3,
    baselineStep: 24,
    rootId: "root-1",
    relayoutTimer: 41,
    hasDocument: "function",
    hasSetGridOverrides: "function",
    hasRequestRelayout: "function",
    startedAction: { label: "Adjust grid" },
    committedAction: { label: "Adjust grid" },
  });
  assert.deepEqual(dirtied, [true]);
  assert.deepEqual(clearedTimers, [41]);
  assert.deepEqual(relayoutRequests, ["root-1"]);
  assert.equal(pruned, true);
  assert.equal(renderedOverlay, 1);
  assert.deepEqual((context.model as { gridOverrides: unknown }).gridOverrides, runtimeUpdate.gridOverrides);
  assert.deepEqual(context.gridInfo, runtimeUpdate.overlayGridInfo);
  assert.equal(gridRowsInput.value, 11);
});
