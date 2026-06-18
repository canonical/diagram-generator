import {
  collectPreviewTextEditingGroups,
  resolvePreviewTextEditCommit,
  resolvePreviewTextEditStartState,
  type PreviewTextEditorRole,
} from './app-text-edit.js';

/**
 * Preview text-edit host helpers (spec 043 shell coordinator slice P).
 *
 * These helpers keep commit/cancel cleanup and override orchestration in
 * TypeScript so `editor.js` only owns textarea creation and event hookup.
 */

export interface PreviewTextEditTextarea {
  value: string;
  className?: string;
  style?: Record<string, string>;
  focus?: () => void;
  select?: () => void;
  addEventListener?: (type: string, handler: (event: any) => void) => void;
  remove: () => void;
}

export interface PreviewTextEditElement {
  style: {
    opacity: string;
  };
}

export interface PreviewTextEditEditorState {
  role: PreviewTextEditorRole;
  ta: PreviewTextEditTextarea;
  originalValue: string;
}

export interface StartPreviewTextEditHostOptions {
  document: Document;
  svg: SVGSVGElement;
  cid: string;
  headingText: string;
  labelText: string[];
  targetedTextEl?: Element | null;
  iconSize: number;
  columnGap: number;
  startInteraction: (state: PreviewTextEditInteractionState & { hasHeading: boolean }) => void;
  suspendSelectionChrome: () => void;
  scheduleBlurCommit: () => void;
  commitTextEdit: () => void;
  cancelTextEdit: () => void;
  stopPropagation?: (() => void) | null;
}

export interface PreviewTextEditInteractionState {
  cid: string;
  textEl?: PreviewTextEditElement | null;
  editor?: PreviewTextEditEditorState | null;
}

export interface PreviewTextEditOverrideSnapshot {
  [key: string]: unknown;
}

export interface CompletePreviewTextEditOptions {
  state?: PreviewTextEditInteractionState | null;
  getExistingTextOverride: (cid: string) => Record<string, unknown> | null | undefined;
  setTextOverride: (cid: string, nextTextOverride: Record<string, unknown>) => void;
  captureOverrideEntries: (ids: string[]) => PreviewTextEditOverrideSnapshot;
  commitOverridePatchAction: (
    label: string,
    beforeEntries: PreviewTextEditOverrideSnapshot,
    afterEntries: PreviewTextEditOverrideSnapshot,
  ) => void;
  endInteraction: () => void;
  reapplySelection: () => void;
  scheduleRelayout: (cid: string) => void;
}

export interface CancelPreviewTextEditOptions {
  state?: PreviewTextEditInteractionState | null;
  endInteraction: () => void;
  reapplySelection: () => void;
}

export interface SuspendPreviewTextEditSelectionChromeHostOptions {
  svg: {
    querySelectorAll: (selector: string) => Iterable<{
      classList?: {
        remove: (name: string) => void;
      };
    }>;
  } | null | undefined;
  removeResizeHandles: () => void;
}

export interface SchedulePreviewTextEditCommitHostOptions {
  delayMs?: number;
  setTimeoutFn: (callback: () => void, delayMs: number) => unknown;
  isTextEditing: () => boolean;
  getEditorTextarea: () => PreviewTextEditTextarea | null | undefined;
  getActiveElement: () => unknown;
  commitTextEdit: () => void;
}

export interface PreviewTextEditHostResult {
  kind: 'noop' | 'started' | 'cancelled' | 'unchanged' | 'committed';
  cid: string | null;
  changed: boolean;
}

function cleanupPreviewTextEditDom(state: PreviewTextEditInteractionState | null | undefined): void {
  if (!state) {
    return;
  }
  state.editor?.ta.remove();
  if (state.textEl) {
    state.textEl.style.opacity = '';
  }
}

export function suspendPreviewTextEditSelectionChromeHost(
  options: SuspendPreviewTextEditSelectionChromeHostOptions,
): void {
  if (!options.svg) {
    return;
  }
  for (const element of options.svg.querySelectorAll('.dg-selected')) {
    element.classList?.remove('dg-selected');
  }
  options.removeResizeHandles();
}

export function schedulePreviewTextEditCommitHost(
  options: SchedulePreviewTextEditCommitHostOptions,
): void {
  options.setTimeoutFn(() => {
    if (!options.isTextEditing()) {
      return;
    }
    const editorTextarea = options.getEditorTextarea();
    if (editorTextarea && editorTextarea === options.getActiveElement()) {
      return;
    }
    options.commitTextEdit();
  }, options.delayMs ?? 100);
}

export function startPreviewTextEditHost(
  options: StartPreviewTextEditHostOptions,
): PreviewTextEditHostResult {
  const ctm = options.svg.getScreenCTM();
  const plan = resolvePreviewTextEditStartState({
    groups: collectPreviewTextEditingGroups(options.svg, options.cid),
    headingText: options.headingText,
    labelText: options.labelText,
    targetedTextEl: options.targetedTextEl ?? null,
    iconSize: options.iconSize,
    columnGap: options.columnGap,
    svgScale: ctm ? ctm.a : 1,
  });
  if (!plan) {
    return {
      kind: 'noop',
      cid: options.cid,
      changed: false,
    };
  }

  const ta = options.document.createElement('textarea') as unknown as PreviewTextEditTextarea;
  ta.className = 'dg-text-editor';
  ta.value = plan.semanticLines.join('\n');
  const style = ta.style as Record<string, string>;
  style.left = `${plan.editorLeft}px`;
  style.top = `${plan.editorTop}px`;
  style.width = `${plan.editorWidth}px`;
  style.minHeight = `${plan.editorMinHeight}px`;
  style.fontSize = `${plan.style.fontSize * (ctm ? ctm.a : 1)}px`;
  style.lineHeight = `${plan.style.lineHeight * (ctm ? ctm.a : 1)}px`;
  style.fontWeight = plan.style.fontWeight;
  style.color = plan.style.fill;
  style.caretColor = plan.style.fill;
  style.backgroundColor = plan.backgroundColor;
  style.fontFamily = plan.style.fontFamily;
  if (plan.style.letterSpacing) {
    style.letterSpacing = plan.style.letterSpacing;
  }
  if (plan.style.fontVariantCaps) {
    style.fontVariantCaps = plan.style.fontVariantCaps;
  }
  options.document.body.appendChild(ta as unknown as Node);

  ta.focus?.();
  ta.select?.();

  const textEl = plan.textEl as unknown as PreviewTextEditElement;
  textEl.style.opacity = '0';
  options.suspendSelectionChrome();
  options.startInteraction({
    cid: options.cid,
    textEl,
    editor: {
      role: plan.blockRole,
      ta,
      originalValue: ta.value,
    },
    hasHeading: plan.hasHeading,
  });

  ta.addEventListener?.('keydown', (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation?.();
      options.cancelTextEdit();
    } else if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault?.();
      options.commitTextEdit();
    }
    event.stopPropagation?.();
  });
  ta.addEventListener?.('blur', options.scheduleBlurCommit);
  options.stopPropagation?.();

  return {
    kind: 'started',
    cid: options.cid,
    changed: false,
  };
}

export function completePreviewTextEdit(
  options: CompletePreviewTextEditOptions,
): PreviewTextEditHostResult {
  const state = options.state ?? null;
  if (!state?.editor) {
    return {
      kind: 'noop',
      cid: state?.cid ?? null,
      changed: false,
    };
  }

  const resolution = resolvePreviewTextEditCommit({
    currentValue: state.editor.ta.value,
    originalValue: state.editor.originalValue,
    existingText: options.getExistingTextOverride(state.cid) ?? {},
    role: state.editor.role,
  });

  if (resolution.changed && resolution.nextTextOverride) {
    const editIds = [state.cid];
    const beforeEntries = options.captureOverrideEntries(editIds);
    options.setTextOverride(state.cid, resolution.nextTextOverride);
    options.commitOverridePatchAction(
      'Edit text',
      beforeEntries,
      options.captureOverrideEntries(editIds),
    );
  }

  cleanupPreviewTextEditDom(state);
  options.endInteraction();
  options.reapplySelection();

  if (resolution.changed) {
    options.scheduleRelayout(state.cid);
  }

  return {
    kind: resolution.changed ? 'committed' : 'unchanged',
    cid: state.cid,
    changed: resolution.changed,
  };
}

export function cancelPreviewTextEdit(
  options: CancelPreviewTextEditOptions,
): PreviewTextEditHostResult {
  const state = options.state ?? null;
  if (!state) {
    return {
      kind: 'noop',
      cid: null,
      changed: false,
    };
  }

  cleanupPreviewTextEditDom(state);
  options.endInteraction();
  options.reapplySelection();

  return {
    kind: 'cancelled',
    cid: state.cid,
    changed: false,
  };
}
