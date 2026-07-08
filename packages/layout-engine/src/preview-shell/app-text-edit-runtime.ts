import {
  cancelPreviewTextEdit,
  completePreviewTextEdit,
  schedulePreviewTextEditCommitHost,
  startPreviewTextEditHost,
  suspendPreviewTextEditSelectionChromeHost,
  type PreviewTextEditInteractionState,
  type PreviewTextEditMutationTransactionOptions,
  type PreviewTextEditOverrideSnapshot,
} from './app-text-edit-host.js';

export interface CreatePreviewTextEditRuntimeOptions {
  document: Document;
  getSvg: () => SVGSVGElement | null;
  getNode: (cid: string) => {
    data?: {
      heading_text?: string;
      label_text?: string[];
      helper_text?: string[];
    };
  } | null | undefined;
  iconSize: number;
  columnGap: number;
  interactionManager: {
    state?: PreviewTextEditInteractionState | null;
    isMode: (mode: unknown) => boolean;
    startTextEdit: (state: PreviewTextEditInteractionState & { hasHeading: boolean }) => void;
    endInteraction: () => void;
  };
  textEditingMode: unknown;
  removeResizeHandles: () => void;
  getActiveElement: () => unknown;
  getExistingTextOverride: (cid: string) => Record<string, unknown> | null | undefined;
  setTextOverride: (cid: string, nextTextOverride: Record<string, unknown>) => void;
  captureOverrideEntries: (ids: string[]) => PreviewTextEditOverrideSnapshot;
  commitOverridePatchAction: (
    label: string,
    beforeEntries: PreviewTextEditOverrideSnapshot,
    afterEntries: PreviewTextEditOverrideSnapshot,
  ) => void;
  reapplySelection: () => void;
  scheduleRelayout: (cid: string) => void;
  getMutationContext?: (() => Pick<PreviewTextEditMutationTransactionOptions, 'activeEngineId' | 'documentKind'> | null | undefined) | null;
  onMutationTransaction?: PreviewTextEditMutationTransactionOptions['onMutationTransaction'];
}

export interface CreatePreviewTextEditRuntimeFromHostOptions {
  document: Document;
  model: {
    overrides: Record<string, unknown>;
    get: (cid: string) => {
      data?: {
        heading_text?: string;
        label_text?: string[];
        helper_text?: string[];
      };
    } | null | undefined;
  };
  interactionManager: CreatePreviewTextEditRuntimeOptions['interactionManager'];
  textEditingMode: unknown;
  iconSize: number;
  columnGap: number;
  removeResizeHandles: () => void;
  setTextOverride: (cid: string, nextTextOverride: Record<string, unknown>) => void;
  captureOverrideEntries: (ids: string[]) => PreviewTextEditOverrideSnapshot;
  commitOverridePatchAction: (
    label: string,
    beforeEntries: PreviewTextEditOverrideSnapshot,
    afterEntries: PreviewTextEditOverrideSnapshot,
  ) => void;
  reapplySelection: () => void;
  scheduleRelayout: (cid: string) => void;
  getMutationContext?: CreatePreviewTextEditRuntimeOptions['getMutationContext'];
  onMutationTransaction?: CreatePreviewTextEditRuntimeOptions['onMutationTransaction'];
}

export interface PreviewTextEditRuntime {
  startTextEdit: (
    cid: string,
    event: { stopPropagation: () => void },
    options?: { textEl?: Element | null } | null,
  ) => void;
  commitTextEdit: () => void;
  cancelTextEdit: () => void;
}

export function createPreviewTextEditRuntime(
  options: CreatePreviewTextEditRuntimeOptions,
): PreviewTextEditRuntime {
  const runtime: PreviewTextEditRuntime = {
    startTextEdit(cid, event, runtimeOptions) {
      const svg = options.getSvg();
      if (!svg) {
        return;
      }
      const node = options.getNode(cid);
      startPreviewTextEditHost({
        document: options.document,
        svg,
        cid,
        headingText: node?.data?.heading_text || '',
        labelText: node?.data?.label_text || [],
        helperText: node?.data?.helper_text || [],
        targetedTextEl: runtimeOptions?.textEl ?? null,
        iconSize: options.iconSize,
        columnGap: options.columnGap,
        startInteraction: (state) => options.interactionManager.startTextEdit(state),
        suspendSelectionChrome: () => {
          suspendPreviewTextEditSelectionChromeHost({
            svg,
            removeResizeHandles: options.removeResizeHandles,
          });
        },
        scheduleBlurCommit: () => {
          schedulePreviewTextEditCommitHost({
            setTimeoutFn: (callback, delayMs) => setTimeout(callback, delayMs),
            isTextEditing: () => options.interactionManager.isMode(options.textEditingMode),
            getEditorTextarea: () => options.interactionManager.state?.editor?.ta || null,
            getActiveElement: options.getActiveElement,
            commitTextEdit: runtime.commitTextEdit,
          });
        },
        commitTextEdit: runtime.commitTextEdit,
        cancelTextEdit: runtime.cancelTextEdit,
        stopPropagation: () => event.stopPropagation(),
      });
    },
    commitTextEdit() {
      if (!options.interactionManager.isMode(options.textEditingMode)) {
        return;
      }
      completePreviewTextEdit({
        state: options.interactionManager.state ?? null,
        getExistingTextOverride: options.getExistingTextOverride,
        setTextOverride: options.setTextOverride,
        captureOverrideEntries: options.captureOverrideEntries,
        commitOverridePatchAction: options.commitOverridePatchAction,
        endInteraction: () => options.interactionManager.endInteraction(),
        reapplySelection: options.reapplySelection,
        scheduleRelayout: options.scheduleRelayout,
        transaction: {
          ...(options.getMutationContext?.() ?? {}),
          onMutationTransaction: options.onMutationTransaction ?? null,
        },
      });
    },
    cancelTextEdit() {
      if (!options.interactionManager.isMode(options.textEditingMode)) {
        return;
      }
      cancelPreviewTextEdit({
        state: options.interactionManager.state ?? null,
        endInteraction: () => options.interactionManager.endInteraction(),
        reapplySelection: options.reapplySelection,
      });
    },
  };

  return runtime;
}

export function createPreviewTextEditRuntimeFromHost(
  options: CreatePreviewTextEditRuntimeFromHostOptions,
): PreviewTextEditRuntime {
  return createPreviewTextEditRuntime({
    document: options.document,
    getSvg: () => options.document.querySelector('#stage svg') as SVGSVGElement | null,
    getNode: (cid) => options.model.get(cid),
    iconSize: options.iconSize,
    columnGap: options.columnGap,
    interactionManager: options.interactionManager,
    textEditingMode: options.textEditingMode,
    removeResizeHandles: options.removeResizeHandles,
    getActiveElement: () => options.document.activeElement,
    getExistingTextOverride: (cid) => {
      const override = options.model.overrides[cid];
      if (override && typeof override === 'object' && 'text' in override) {
        const textOverride = (override as { text?: unknown }).text;
        return textOverride && typeof textOverride === 'object'
          ? textOverride as Record<string, unknown>
          : {};
      }
      return {};
    },
    setTextOverride: options.setTextOverride,
    captureOverrideEntries: options.captureOverrideEntries,
    commitOverridePatchAction: options.commitOverridePatchAction,
    reapplySelection: options.reapplySelection,
    scheduleRelayout: options.scheduleRelayout,
    getMutationContext: options.getMutationContext ?? null,
    onMutationTransaction: options.onMutationTransaction ?? null,
  });
}
