import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

function loadEditorSource(): string {
  const repoRoot = path.resolve(process.cwd(), "..", "..");
  return fs.readFileSync(path.join(repoRoot, "scripts", "preview", "editor.js"), "utf8");
}

function extractNamedFunctionSource(source: string, functionName: string): string {
  const marker = `function ${functionName}(e) {`;
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

function loadKeydownHandler(overrides: Record<string, unknown>) {
  const context = {
    console,
    ...overrides,
  };

  const source = `${extractNamedFunctionSource(loadEditorSource(), "onDocumentKeyDown")}\nthis.__keydownHandler = onDocumentKeyDown;`;
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
    cancelTextEdit() {},
    cycleGuideMode() {},
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
    LayoutEngine: {
      dispatchPreviewKeyboardShortcut(options: Record<string, unknown>) {
        delegatedOptions = normalizeVmValue({
          key: options.key,
          shiftKey: options.shiftKey,
          selectedIds: options.selectedIds,
          selectionDepth: options.selectionDepth,
          isBusy: options.isBusy,
          isEditableTarget: options.isEditableTarget,
          isTextEditing: options.isTextEditing,
          isDragging: options.isDragging,
          isResizing: options.isResizing,
          hasAutolayoutSelection: options.hasAutolayoutSelection,
        });
      },
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
    isBusy: true,
    isEditableTarget: false,
    isTextEditing: false,
    isDragging: false,
    isResizing: false,
    hasAutolayoutSelection: false,
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
    LayoutEngine: {
      dispatchPreviewKeyboardShortcut(options: Record<string, unknown>) {
        delegatedOptions = normalizeVmValue({
          key: options.key,
          selectedIds: options.selectedIds,
          selectionDepth: options.selectionDepth,
          hasAutolayoutSelection: options.hasAutolayoutSelection,
        });
      },
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
    hasAutolayoutSelection: true,
  });
});
