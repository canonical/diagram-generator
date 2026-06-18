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
    LayoutEngine: {
      dispatchPreviewKeyboardShortcut(options: Record<string, unknown>) {
        delegatedOptions = normalizeVmValue({
          key: options.event?.key,
          shiftKey: options.event?.shiftKey,
          selectedIds: Array.from(options.selectedIds as Iterable<string>),
          selectionDepth: options.selectionDepth,
          interactionManagerIsBusy: options.interactionManager?.isBusy,
          textMode: options.interactionModes?.TEXT_EDITING,
          dragMode: options.interactionModes?.DRAGGING,
          resizeMode: options.interactionModes?.RESIZING,
          hasIsAutolayoutChild: typeof options.isAutolayoutChild,
          hasDocument: typeof options.document?.querySelector,
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
    LayoutEngine: {
      dispatchPreviewKeyboardShortcut(options: Record<string, unknown>) {
        delegatedOptions = normalizeVmValue({
          key: options.event?.key,
          selectedIds: Array.from(options.selectedIds as Iterable<string>),
          selectionDepth: options.selectionDepth,
          hasIsAutolayoutChild: typeof options.isAutolayoutChild,
          hasDocument: typeof options.document?.querySelector,
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
    hasIsAutolayoutChild: "function",
    hasDocument: "function",
  });
});
