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
  const callbackActions: Array<Record<string, unknown>> = [];

  const onWpDragUp = loadEditorFunction<(event?: unknown) => void>(
    "onWpDragUp",
    "(e)",
    {
      _getArrowWaypointRuntime() {
        return {
          onWaypointDragUp(event?: unknown) {
            callbackActions.push({ onWaypointDragUp: event ?? null });
          },
        };
      },
      document: {
        removeEventListener() {
          throw new Error("document listeners should be removed inside the typed runtime");
        },
      },
    },
  );

  onWpDragUp();

  assert.deepEqual(callbackActions, [
    { onWaypointDragUp: null },
  ]);
});
