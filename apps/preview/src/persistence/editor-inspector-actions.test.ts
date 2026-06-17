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
