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
      const aliasMatch = statement.match(
        new RegExp(
          String.raw`(?:^|[,{])\s*(?:([A-Za-z_$][\w$]*)\s*:\s*)?${functionName}(?:\s*[=,}])`,
          "m",
        ),
      );
      if (aliasPattern.test(statement)) {
        const compatKey = aliasMatch?.[1] ?? functionName;
        return `const ${functionName} = _getPreviewGridEditorCompat().${compatKey};`;
      }

      searchIndex = statementEnd + 1;
    }
  }

  throw new Error(`${functionName} definition not found`);
}

function loadKeydownHandler(overrides: Record<string, unknown>) {
  const context: Record<string, any> = {
    console,
    ...overrides,
  };
  context.document ??= {
    querySelector() {
      return null;
    },
    removeEventListener() {},
  };
  context.window ??= {};
  if (typeof context.window.__DG_getPreviewShellInteractionContract !== "function") {
    context.window.__DG_getPreviewShellInteractionContract = () => (
      context.LayoutEngine?.previewShell?.interaction
      ?? context.LayoutEngine
      ?? null
    );
  }
  if (typeof context._getPreviewGridEditorCompat !== "function") {
    context._getPreviewGridEditorCompat = () => (
      typeof context._getKeyboardRuntime === "function"
        ? context._getKeyboardRuntime()
        : context._getEditorInteractionFacade?.().getKeyboardRuntime?.() ?? {}
    );
  }

  const source = [
    "let _keyboardRuntime = null;",
    extractNamedFunctionSource(loadEditorSource(), "_getKeyboardRuntime", "()"),
    extractNamedFunctionSource(loadEditorSource(), "onDocumentKeyDown", "(e)"),
    "this.__keydownHandler = onDocumentKeyDown;",
  ].join("\n");
  vm.runInNewContext(source, context);
  const keydownHandler = (context as { __keydownHandler?: (event: Record<string, unknown>) => void }).__keydownHandler ?? null;
  if (!keydownHandler) {
    throw new Error("keydown handler was not loaded");
  }
  return keydownHandler;
}

function normalizeVmValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createShellNoops() {
  return {
    PreviewSaveClient: {
      trySaveIfDirty() {},
    },
    EditorState: {
      undo() {},
      redo() {},
      captureOverrideEntries() {
        return [];
      },
      commitOverridePatchAction() {},
    },
    _applyUndoCommand() {},
    deleteSelectedFrames() {},
    cancelTextEdit() {},
    cycleGuideMode() {},
    clearGuideLines() {},
    onDragMove() {},
    onDragUp() {},
    onResizeMove() {},
    onResizeUp() {},
    getParentNode() {
      return null;
    },
    model: {
      get() {
        return { children: [] };
      },
    },
    getAncestors() {
      return [];
    },
    selectComponent() {},
    _applySelectionStateSnapshot() {},
    getOwnDelta() {
      return { dx: 0, dy: 0, dw: 0, dh: 0 };
    },
    _applyInteractionOverrideEntries() {},
    applyAllOverrides() {},
    showResizeHandles() {},
    renderSelectionInspector() {},
  };
}

test("editor shell keydown delegates current selection state to the extracted keyboard dispatcher", () => {
  let delegatedOptions: Record<string, unknown> | null = null;

  const selectedIds = new Set(["alpha", "beta"]);
  const handler = loadKeydownHandler({
    ...createShellNoops(),
    selectedIds,
    selectionDepth: 2,
    mgr: {
      isMode() {
        return false;
      },
      isBusy: true,
    },
    InteractionMode: {
      TEXT_EDITING: "text",
      DRAGGING: "drag",
      RESIZING: "resize",
    },
    document: {
      querySelector() {
        return null;
      },
      removeEventListener() {},
    },
    _getEditorInteractionFacade() {
      return {
        getKeyboardRuntime() {
          return {
            onDocumentKeyDown(event: Record<string, unknown>) {
              delegatedOptions = normalizeVmValue({
                key: event?.key,
                shiftKey: event?.shiftKey,
                selectedIds: Array.from(selectedIds),
                selectionDepth: 2,
                interactionManagerIsBusy: true,
                textMode: "text",
                dragMode: "drag",
                resizeMode: "resize",
                hasIsAutolayoutChild: "function",
                hasDocument: "function",
              });
            },
          };
        },
      };
    },
    _isAutolayoutChild() {
      return false;
    },
  });

  handler({
    key: "ArrowLeft",
    shiftKey: true,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    target: {
      tagName: "DIV",
      isContentEditable: false,
    },
    preventDefault() {},
  });

  assert.deepEqual(delegatedOptions, {
    key: "ArrowLeft",
    shiftKey: true,
    selectedIds: ["alpha", "beta"],
    selectionDepth: 2,
    interactionManagerIsBusy: true,
    textMode: "text",
    dragMode: "drag",
    resizeMode: "resize",
    hasIsAutolayoutChild: "function",
    hasDocument: "function",
  });
});

test("editor shell keydown forwards autolayout-selection state to the dispatcher", () => {
  let delegatedOptions: Record<string, unknown> | null = null;

  const selectedIds = new Set(["autolayout-child"]);
  const handler = loadKeydownHandler({
    ...createShellNoops(),
    selectedIds,
    selectionDepth: 1,
    mgr: {
      isMode() {
        return false;
      },
      isBusy: false,
    },
    InteractionMode: {
      TEXT_EDITING: "text",
      DRAGGING: "drag",
      RESIZING: "resize",
    },
    document: {
      querySelector() {
        return null;
      },
      removeEventListener() {},
    },
    _getEditorInteractionFacade() {
      return {
        getKeyboardRuntime() {
          return {
            onDocumentKeyDown(event: Record<string, unknown>) {
              delegatedOptions = normalizeVmValue({
                key: event?.key,
                selectedIds: Array.from(selectedIds),
                selectionDepth: 1,
                hasIsAutolayoutChild: "function",
                hasDocument: "function",
              });
            },
          };
        },
      };
    },
    _isAutolayoutChild() {
      return true;
    },
  });

  handler({
    key: "ArrowRight",
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    target: {
      tagName: "DIV",
      isContentEditable: false,
    },
    preventDefault() {},
  });

  assert.deepEqual(delegatedOptions, {
    key: "ArrowRight",
    selectedIds: ["autolayout-child"],
    selectionDepth: 1,
    hasIsAutolayoutChild: "function",
    hasDocument: "function",
  });
});
