import {
  applyPreviewSelectionStateSnapshot,
  clearPreviewSelectionState,
  resolvePreviewComponentSelectionState,
  syncPreviewSelectionUi,
  type SyncPreviewSelectionUiOptions,
} from './app-selection-host.js';

export interface CreatePreviewSelectionRuntimeOptions {
  document: Document;
  selectedIds: Set<string>;
  getSelectionDepth: () => number;
  setSelectionDepth: (depth: number) => void;
  getPrimarySelectedId: (preferredId?: string | null) => string | null | undefined;
  getAncestorDepth: (cid: string) => number;
  syncTreeSelectionState: SyncPreviewSelectionUiOptions['syncTreeSelectionState'];
  removeResizeHandles: () => void;
  showResizeHandles: (cid: string) => void;
  renderEmptyInspector: () => void;
  renderSelectionInspector: (cid?: string | null) => void;
}

export interface PreviewSelectionRuntime {
  deselectAll: () => void;
  applySelectionStateSnapshot: (
    nextState: ReturnType<typeof clearPreviewSelectionState>,
    preferredId?: string | null,
  ) => void;
  syncSelectionUi: (preferredId?: string | null) => void;
  selectComponent: (cid: string, additive: boolean) => void;
  reapplySelection: () => void;
  clearSelection: () => void;
}

export function createPreviewSelectionRuntime(
  options: CreatePreviewSelectionRuntimeOptions,
): PreviewSelectionRuntime {
  const applySelectionState = (
    nextState: ReturnType<typeof clearPreviewSelectionState>,
    preferredId?: string | null,
  ): void => {
    applyPreviewSelectionStateSnapshot({
      selectedIds: options.selectedIds,
      nextState,
      setSelectionDepth: options.setSelectionDepth,
      preferredId,
      syncSelectionUi: (nextPreferredId) => {
        syncPreviewSelectionUi({
          document: options.document,
          selectedIds: options.selectedIds,
          preferredId: nextPreferredId,
          resolvePrimaryId: options.getPrimarySelectedId,
          syncTreeSelectionState: options.syncTreeSelectionState,
          removeResizeHandles: options.removeResizeHandles,
          showResizeHandles: options.showResizeHandles,
          renderEmptyInspector: options.renderEmptyInspector,
          renderSelectionInspector: options.renderSelectionInspector,
        });
      },
    });
  };

  return {
    deselectAll() {
      applySelectionState(clearPreviewSelectionState({
        selectedIds: options.selectedIds,
        selectionDepth: options.getSelectionDepth(),
      }));
    },
    applySelectionStateSnapshot: applySelectionState,
    syncSelectionUi(preferredId) {
      syncPreviewSelectionUi({
        document: options.document,
        selectedIds: options.selectedIds,
        preferredId,
        resolvePrimaryId: options.getPrimarySelectedId,
        syncTreeSelectionState: options.syncTreeSelectionState,
        removeResizeHandles: options.removeResizeHandles,
        showResizeHandles: options.showResizeHandles,
        renderEmptyInspector: options.renderEmptyInspector,
        renderSelectionInspector: options.renderSelectionInspector,
      });
    },
    selectComponent(cid, additive) {
      applySelectionState(resolvePreviewComponentSelectionState({
        selectedIds: options.selectedIds,
        selectionDepth: options.getSelectionDepth(),
        cid,
        additive,
        getAncestorDepth: options.getAncestorDepth,
      }), cid);
    },
    reapplySelection() {
      this.syncSelectionUi();
    },
    clearSelection() {
      this.deselectAll();
    },
  };
}
