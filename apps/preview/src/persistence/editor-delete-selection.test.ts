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

  const assignmentPrefixes = [
    `const ${functionName} =`,
    `let ${functionName} =`,
    `var ${functionName} =`,
  ];
  for (const prefix of assignmentPrefixes) {
    const start = source.indexOf(prefix);
    if (start === -1) continue;
    const statementEnd = source.indexOf(";", start + prefix.length);
    if (statementEnd === -1) {
      throw new Error(`${functionName} assignment statement end not found`);
    }
    return source.slice(start, statementEnd + 1);
  }

  const destructurePrefixes = [
    "const {",
    "let {",
    "var {",
  ];

  for (const prefix of destructurePrefixes) {
    let searchIndex = 0;
    while (true) {
      const start = source.indexOf(prefix, searchIndex);
      if (start === -1) {
        break;
      }

      const bodyStart = source.indexOf("{", start);
      if (bodyStart === -1) {
        break;
      }

      let depth = 0;
      let bodyEnd = -1;
      for (let index = bodyStart; index < source.length; index += 1) {
        const char = source[index];
        if (char === "{") depth += 1;
        else if (char === "}") {
          depth -= 1;
          if (depth === 0) {
            bodyEnd = index;
            break;
          }
        }
      }

      if (bodyEnd === -1) {
        throw new Error(`${functionName} destructured body end not found`);
      }

      const statementEnd = source.indexOf(";", bodyEnd);
      if (statementEnd === -1) {
        throw new Error(`${functionName} destructured statement end not found`);
      }

      const statement = source.slice(start, statementEnd + 1);
      const aliasPattern = new RegExp(
        String.raw`(?:^|[,{])\s*(?:[A-Za-z_$][\w$]*\s*:\s*)?${functionName}(?:\s*[=,}])`,
        "m",
      );
      if (aliasPattern.test(statement)) {
        throw new Error(`${functionName} is still read from the deleted preview grid editor facade`);
      }

      searchIndex = statementEnd + 1;
    }
  }

  throw new Error(`${functionName} definition not found`);
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
  context._getEditorSceneFacade ??= () => ({});
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

test("deleteSelectedFrames delegates through the typed editor scene facade", async () => {
  let delegated = false;

  const deleteSelectedFrames = loadAsyncEditorFunction<() => Promise<boolean>>(
    "deleteSelectedFrames",
    "()",
    {
      _getEditorSceneFacade() {
        return {
          async deleteSelectedFrames() {
            delegated = true;
            return {
              kind: "deleted",
              removedIds: ["alpha"],
              topLevelIds: ["alpha"],
              rerendered: true,
            };
          },
        };
      },
      model: {
        roots: [],
        removedIds: new Set<string>(),
        clearOverride() {},
        get() {
          return null;
        },
      },
      setDirty() {},
      _rerenderStageFromModel: async () => true,
      deselectAll() {},
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
  assert.equal(delegated, true);
});
