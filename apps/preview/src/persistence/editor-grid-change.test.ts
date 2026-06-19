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
  let runtimeCalls = 0;

  const { fn: onGridControlChange } = loadEditorRuntime<() => void>(
    "onGridControlChange",
    "()",
    {
      _previewGridRuntime: {
        onGridControlChange() {
          runtimeCalls += 1;
          return { kind: "applied" };
        },
      },
    },
  );

  assert.deepEqual(onGridControlChange(), { kind: "applied" });
  assert.equal(runtimeCalls, 1);
});
