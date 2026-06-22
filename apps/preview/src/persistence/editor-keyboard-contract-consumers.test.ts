import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";

import {
  attachPreviewCompat,
  extractNamedFunctionSource,
  normalizeVmValue,
  readPreviewScript,
} from "./preview-script-test-helpers.js";

test("editor keyboard helper accepts the namespaced previewShell.interaction contract", () => {
  const source = readPreviewScript("editor.js");
  const capturedCalls: Array<Record<string, unknown>> = [];
  const context = {
    console,
    document: { tagName: "document" },
    selectedIds: new Set(["alpha"]),
    selectionDepth: 1,
    mgr: {
      isBusy: false,
      isMode() {
        return false;
      },
    },
    InteractionMode: {
      TEXT_EDITING: "TEXT_EDITING",
      DRAGGING: "DRAGGING",
      RESIZING: "RESIZING",
    },
    PreviewSaveClient: {
      trySaveIfDirty() {},
    },
    EditorState: {
      undo() {
        return Promise.resolve();
      },
      redo() {
        return Promise.resolve();
      },
      captureOverrideEntries() {
        return [];
      },
      commitOverridePatchAction() {},
    },
    _applyUndoCommand: {},
    deleteSelectedFrames() {},
    cancelTextEdit() {},
    clearGuideLines() {},
    onDragMove() {},
    onDragUp() {},
    onResizeMove() {},
    onResizeUp() {},
    cycleGuideMode() {},
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
    _isAutolayoutChild() {
      return false;
    },
    _getKeyboardRuntime() {
      return context.window.__DG_getPreviewShellInteractionContract()
        .createPreviewKeyboardRuntimeFromHost({
          document: context.document,
          selectedIds: context.selectedIds,
          selectionDepthState: {
            get: () => context.selectionDepth,
          },
          interactionManager: context.mgr,
          interactionModes: context.InteractionMode,
          isAutolayoutChild: context._isAutolayoutChild,
          save: () => context.PreviewSaveClient.trySaveIfDirty(),
          undo: () => context.EditorState.undo(context._applyUndoCommand),
          redo: () => context.EditorState.redo(context._applyUndoCommand),
          deleteSelection: () => context.deleteSelectedFrames(),
          cancelTextEdit: context.cancelTextEdit,
          clearGuideLines: context.clearGuideLines,
          onDragMove: context.onDragMove,
          onDragUp: context.onDragUp,
          onResizeMove: context.onResizeMove,
          onResizeUp: context.onResizeUp,
          cycleGuideMode: context.cycleGuideMode,
          model: context.model,
          getParentId: (id: string) => context.getParentNode(id)?.id || null,
          getAncestorDepth: (id: string) => context.getAncestors(id).length,
          selectComponent: (id: string) => context.selectComponent(id),
          applySelectionState: (nextState: unknown, preferredId?: string) => (
            context._applySelectionStateSnapshot(nextState, preferredId)
          ),
          captureOverrideEntries: (ids: string[]) => context.EditorState.captureOverrideEntries(ids),
          commitOverridePatchAction: (label: string, beforeEntries: unknown, afterEntries: unknown) => {
            context.EditorState.commitOverridePatchAction(label, beforeEntries, afterEntries);
          },
          getOwnDelta: context.getOwnDelta,
          applyInteractionOverrideEntries: context._applyInteractionOverrideEntries,
          applyAllOverrides: context.applyAllOverrides,
          showResizeHandles: context.showResizeHandles,
          renderSelectionInspector: context.renderSelectionInspector,
        });
    },
    window: {
      __DG_getPreviewShellInteractionContract() {
        return context.LayoutEngine.previewShell.interaction;
      },
    },
    LayoutEngine: {
      previewShell: {
        interaction: {
          dispatchPreviewKeyboardShortcut(options: Record<string, unknown>) {
            capturedCalls.push({
              eventKey: options.event?.key,
              selectedIds: Array.from(options.selectedIds as Set<string> | string[]),
              selectionDepth: options.selectionDepth,
              hasInteractionManager: typeof options.interactionManager?.isMode,
              textMode: options.interactionModes?.TEXT_EDITING,
              hasSave: typeof options.save,
              hasUndo: typeof options.undo,
              hasRedo: typeof options.redo,
              hasDeleteSelection: typeof options.deleteSelection,
              hasClearGuideLines: typeof options.clearGuideLines,
              hasApplyAllOverrides: typeof options.applyAllOverrides,
              hasRenderSelectionInspector: typeof options.renderSelectionInspector,
            });
          },
          createPreviewKeyboardRuntimeFromHost(options: Record<string, unknown>) {
            return {
              onDocumentKeyDown(event: Record<string, unknown>) {
                capturedCalls.push({
                  eventKey: event?.key,
                  selectedIds: Array.from(options.selectedIds as Set<string> | string[]),
                  selectionDepth: options.selectionDepthState?.get?.(),
                  hasInteractionManager: typeof options.interactionManager?.isMode,
                  textMode: options.interactionModes?.TEXT_EDITING,
                  hasSave: typeof options.save,
                  hasUndo: typeof options.undo,
                  hasRedo: typeof options.redo,
                  hasDeleteSelection: typeof options.deleteSelection,
                  hasClearGuideLines: typeof options.clearGuideLines,
                  hasApplyAllOverrides: typeof options.applyAllOverrides,
                  hasRenderSelectionInspector: typeof options.renderSelectionInspector,
                });
              },
            };
          },
        },
      },
    },
  };

  const helperSource = [
    extractNamedFunctionSource(source, "onDocumentKeyDown", "(e)"),
    "this.__loaded = { onDocumentKeyDown };",
  ].join("\n");

  vm.runInNewContext(helperSource, attachPreviewCompat(context));
  const loaded = (context as {
    __loaded: {
      onDocumentKeyDown: (event: Record<string, unknown>) => void;
    };
  }).__loaded;

  loaded.onDocumentKeyDown({
    key: "s",
    target: { tagName: "DIV", isContentEditable: false },
    preventDefault() {},
  });

  assert.deepEqual(normalizeVmValue(capturedCalls), [
    {
      eventKey: "s",
      selectedIds: ["alpha"],
      selectionDepth: 1,
      hasInteractionManager: "function",
      textMode: "TEXT_EDITING",
      hasSave: "function",
      hasUndo: "function",
      hasRedo: "function",
      hasDeleteSelection: "function",
      hasClearGuideLines: "function",
      hasApplyAllOverrides: "function",
      hasRenderSelectionInspector: "function",
    },
  ]);
});

