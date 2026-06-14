import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

function loadEditorSource(): string {
  const repoRoot = path.resolve(process.cwd(), "..", "..");
  return fs.readFileSync(path.join(repoRoot, "scripts", "preview", "editor.js"), "utf8");
}

function extractKeydownRegistrationSource(source: string): string {
  const marker = 'document.addEventListener("keydown", (e) => {';
  const start = source.indexOf(marker);
  if (start === -1) {
    throw new Error("editor.js keydown registration not found");
  }

  const bodyStart = source.indexOf("{", start);
  if (bodyStart === -1) {
    throw new Error("editor.js keydown body start not found");
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
    throw new Error("editor.js keydown body end not found");
  }

  const close = source.indexOf(");", end);
  if (close === -1) {
    throw new Error("editor.js keydown registration close not found");
  }

  return source.slice(start, close + 2);
}

function loadKeydownHandler(overrides: Record<string, unknown>) {
  let keydownHandler: ((event: Record<string, unknown>) => void) | null = null;
  const document = {
    addEventListener(type: string, listener: (event: Record<string, unknown>) => void) {
      if (type === "keydown") keydownHandler = listener;
    },
  };

  const context = {
    document,
    console,
    ...overrides,
  };

  const source = extractKeydownRegistrationSource(loadEditorSource());
  vm.runInNewContext(source, context);
  if (!keydownHandler) {
    throw new Error("keydown handler was not registered");
  }
  return keydownHandler;
}

function normalizeVmValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

test("editor shell keydown nudges selected items through the extracted LayoutEngine helper", () => {
  let createArgs: Record<string, unknown> | null = null;
  let appliedEntries: unknown = null;
  let commitArgs: unknown[] | null = null;
  let applied = false;
  let shownPrimary: string | null = null;
  let inspectedPrimary: string | null = null;
  let prevented = false;

  const selectedIds = new Set(["alpha", "beta"]);
  const handler = loadKeydownHandler({
    selectedIds,
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
      isNudgeKey(key: string) {
        return key.startsWith("Arrow");
      },
      createNudgeOverrideEntries(args: Record<string, unknown>) {
        createArgs = args;
        return [
          { id: "alpha", dx: -16, dy: 0, dw: 4, dh: 6 },
          { id: "beta", dx: -24, dy: 16, dw: 0, dh: 8 },
        ];
      },
    },
    _isAutolayoutChild() {
      return false;
    },
    EditorState: {
      captureOverrideEntries(ids: string[]) {
        return ids.map((id) => ({ id }));
      },
      commitOverridePatchAction(...args: unknown[]) {
        commitArgs = args;
      },
    },
    getOwnDelta(id: string) {
      if (id === "alpha") return { dx: 8, dy: 0, dw: 4, dh: 6 };
      return { dx: 0, dy: 16, dw: 0, dh: 8 };
    },
    _applyInteractionOverrideEntries(entries: unknown) {
      appliedEntries = entries;
    },
    applyAllOverrides() {
      applied = true;
    },
    showResizeHandles(id: string) {
      shownPrimary = id;
    },
    renderSelectionInspector(id: string) {
      inspectedPrimary = id;
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
    preventDefault() {
      prevented = true;
    },
  });

  assert.equal(prevented, true);
  assert.deepEqual(normalizeVmValue(createArgs), {
    items: [
      { id: "alpha", dx: 8, dy: 0, dw: 4, dh: 6 },
      { id: "beta", dx: 0, dy: 16, dw: 0, dh: 8 },
    ],
    key: "ArrowLeft",
    step: 24,
  });
  assert.deepEqual(appliedEntries, [
    { id: "alpha", dx: -16, dy: 0, dw: 4, dh: 6 },
    { id: "beta", dx: -24, dy: 16, dw: 0, dh: 8 },
  ]);
  assert.equal(applied, true);
  assert.deepEqual(normalizeVmValue(commitArgs), [
    "Nudge selection",
    [{ id: "alpha" }, { id: "beta" }],
    [{ id: "alpha" }, { id: "beta" }],
  ]);
  assert.equal(shownPrimary, "beta");
  assert.equal(inspectedPrimary, "beta");
});

test("editor shell keydown skips nudge when any selected item is autolayout-managed", () => {
  let helperCalled = false;
  let prevented = false;
  let committed = false;
  let applied = false;

  const selectedIds = new Set(["autolayout-child"]);
  const handler = loadKeydownHandler({
    selectedIds,
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
      isNudgeKey() {
        return true;
      },
      createNudgeOverrideEntries() {
        helperCalled = true;
        return [];
      },
    },
    _isAutolayoutChild() {
      return true;
    },
    EditorState: {
      captureOverrideEntries() {
        return [];
      },
      commitOverridePatchAction() {
        committed = true;
      },
    },
    getOwnDelta() {
      return { dx: 0, dy: 0, dw: 0, dh: 0 };
    },
    _applyInteractionOverrideEntries() {
      applied = true;
    },
    applyAllOverrides() {
      applied = true;
    },
    showResizeHandles() {},
    renderSelectionInspector() {},
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
    preventDefault() {
      prevented = true;
    },
  });

  assert.equal(prevented, false);
  assert.equal(helperCalled, false);
  assert.equal(committed, false);
  assert.equal(applied, false);
});
