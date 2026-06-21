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

test("bindInspectorActions delegates to the typed previewShell.inspector host binder", () => {
  const inspector = { dataset: {} };
  let received: Record<string, unknown> | null = null;

  const context = {
    console,
    _inspectorActionsBound: false,
    getInspectorElement() {
      return inspector;
    },
    _warnUnknownInspectorAction() {},
    setFrameAlign() {},
    clearOverride() {},
    alignSelection() {},
    distributeSelection() {},
    setMultiFrameAlign() {},
    applyStyleOverride() {},
    setFrameProp() {},
    setFrameSize() {},
    setWidthUnit() {},
    setHeightUnit() {},
    applyMultiStyleOverride() {},
    setMultiFrameProp() {},
    setMultiFrameSize() {},
    setMultiActionGap() {},
    window: {
      __DG_getPreviewShellInspectorContract() {
        return {
          bindPreviewInspectorActions(options: Record<string, unknown>) {
            received = options;
            return true;
          },
        };
      },
    },
  };
  (
    context as {
      _getPreviewShellInspectorContract?: () => {
        bindPreviewInspectorActions: (options: Record<string, unknown>) => boolean;
      };
      window: { __DG_getPreviewShellInspectorContract: () => {
        bindPreviewInspectorActions: (options: Record<string, unknown>) => boolean;
      } };
    }
  )._getPreviewShellInspectorContract = () =>
    context.window.__DG_getPreviewShellInspectorContract();

  const source = `${extractNamedFunctionSource(loadEditorSource(), "bindInspectorActions", "()")}\nthis.__loaded = bindInspectorActions;`;
  vm.runInNewContext(source, context);
  const bindInspectorActions = (context as { __loaded: () => void }).__loaded;

  bindInspectorActions();

  assert.equal((context as { _inspectorActionsBound: boolean })._inspectorActionsBound, true);
  assert.equal(received?.inspector, inspector);
  assert.equal(typeof received?.setFrameAlign, "function");
  assert.equal(typeof received?.setFrameProp, "function");
  assert.equal(typeof received?.setMultiActionGap, "function");
});
