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

  throw new Error(`${functionName} definition not found`);
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
  const capturedCalls: Array<Record<string, unknown>> = [];

  const onResizeUp = loadEditorFunction<() => void>(
    "onResizeUp",
    "()",
    {
      _getResizeInteractionRuntime() {
        return {
          onResizeUp() {
            capturedCalls.push({ kind: "runtimeResizeUp" });
          },
        };
      },
    },
  );

  onResizeUp();

  assert.deepEqual(normalizeVmValue(capturedCalls), [
    { kind: "runtimeResizeUp" },
  ]);
});
