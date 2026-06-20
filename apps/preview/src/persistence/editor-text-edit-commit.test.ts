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
  const context = {
    console,
    ...overrides,
  };
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

test("commitTextEdit delegates text edit completion through the typed host helper", () => {
  const callbackActions: Array<string | Record<string, unknown>> = [];
  const clearedTimers: unknown[] = [];
  let delegatedState: Record<string, unknown> | null = null;
  const inspectorContract = {
    completePreviewTextEdit(options: Record<string, any>) {
      delegatedState = normalizeVmValue(options.state);
      options.setTextOverride("alpha", { heading: "After", label: ["keep"] });
      options.commitOverridePatchAction(
        "Edit text",
        options.captureOverrideEntries(["alpha"]),
        options.captureOverrideEntries(["alpha"]),
      );
      options.endInteraction();
      options.reapplySelection();
      options.scheduleRelayout("alpha");
    },
  };

  const commitTextEdit = loadEditorFunction<() => void>(
    "commitTextEdit",
    "()",
    {
      window: {
        LayoutEngine: {
          previewShell: {
            inspector: inspectorContract,
          },
        },
        __DG_getPreviewShellInspectorContract() {
          return this.LayoutEngine.previewShell.inspector;
        },
      },
      InteractionMode: {
        TEXT_EDITING: "text_editing",
      },
      mgr: {
        isMode(mode: string) {
          return mode === "text_editing";
        },
        state: {
          cid: "alpha",
          textEl: {
            style: {
              opacity: "0",
            },
          },
          editor: {
            role: "heading",
            originalValue: "Before",
            ta: {
              value: "After",
              remove() {},
            },
          },
        },
        endInteraction() {
          callbackActions.push("endInteraction");
        },
      },
      model: {
        overrides: {
          alpha: {
            text: {
              label: ["keep"],
            },
          },
        },
      },
      setOverride(cid: string, partial: unknown) {
        callbackActions.push({ setOverride: [cid, normalizeVmValue(partial)] });
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
      reapplySelection() {
        callbackActions.push("reapplySelection");
      },
      clearTimeout(timer: unknown) {
        clearedTimers.push(timer);
      },
      _layoutRelayoutTimer: 41,
      _v3RelayoutTimer: 41,
      setTimeout(callback: () => void, delayMs: number) {
        callbackActions.push({ setTimeout: delayMs });
        callback();
        return 99;
      },
      requestLayoutRelayout(cid: string) {
        callbackActions.push({ requestV3Relayout: cid });
      },
      requestV3Relayout(cid: string) {
        callbackActions.push({ requestV3Relayout: cid });
      },
      LayoutEngine: {
        previewShell: {
          inspector: inspectorContract,
        },
      },
    },
  );

  commitTextEdit();

  assert.deepEqual(delegatedState, {
    cid: "alpha",
    textEl: {
      style: {
        opacity: "0",
      },
    },
    editor: {
      role: "heading",
      originalValue: "Before",
      ta: {
        value: "After",
      },
    },
  });
  assert.deepEqual(clearedTimers, [41]);
  assert.deepEqual(callbackActions, [
    { setOverride: ["alpha", { text: { heading: "After", label: ["keep"] } }] },
    {
      commitOverridePatchAction: {
        label: "Edit text",
        beforeEntries: { ids: ["alpha"] },
        afterEntries: { ids: ["alpha"] },
      },
    },
    "endInteraction",
    "reapplySelection",
    { setTimeout: 100 },
    { requestV3Relayout: "alpha" },
  ]);
});
