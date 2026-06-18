import { describe, expect, it } from 'vitest';
import {
  cancelPreviewTextEdit,
  completePreviewTextEdit,
  schedulePreviewTextEditCommitHost,
  startPreviewTextEditHost,
  suspendPreviewTextEditSelectionChromeHost,
} from '../src/preview-shell/app-text-edit-host.js';

describe('preview text-edit host helpers', () => {
  it('starts a text edit session, creates a textarea, and wires commit/cancel handlers', () => {
    const actions: unknown[] = [];
    const listeners: Record<string, (event: any) => void> = {};
    const textarea = {
      value: '',
      style: {} as Record<string, string>,
      remove() {},
      focus() {
        actions.push('focus');
      },
      select() {
        actions.push('select');
      },
      addEventListener(type: string, handler: (event: any) => void) {
        listeners[type] = handler;
      },
    };
    const document = {
      createElement() {
        return textarea;
      },
      body: {
        appendChild(node: unknown) {
          actions.push({ appendChild: node });
        },
      },
    } as unknown as Document;
    const svg = {
      getScreenCTM() {
        return { a: 2 };
      },
      querySelectorAll() {
        return [];
      },
    } as unknown as SVGSVGElement;
    const textEl = {
      style: {
        opacity: '',
      },
      querySelectorAll() {
        return [{
          textContent: 'Heading',
          getAttribute(name: string) {
            const map: Record<string, string> = {
              'font-size': '16',
              'font-weight': '700',
              fill: '#111111',
              'font-family': 'Ubuntu Sans',
              y: '12',
            };
            return map[name] ?? null;
          },
        }];
      },
      getBoundingClientRect() {
        return { left: 12, top: 30, width: 100, height: 20 };
      },
      closest() {
        return { getAttribute: () => 'alpha' };
      },
    };
    const group = {
      querySelectorAll(selector: string) {
        return selector === ':scope > text' ? [textEl] : [];
      },
      querySelector(selector: string) {
        if (selector === ':scope > rect') {
          return {
            getBoundingClientRect() {
              return { left: 10, top: 20, width: 180, height: 80 };
            },
            getAttribute(name: string) {
              return name === 'fill' ? '#ffffff' : null;
            },
          };
        }
        return null;
      },
    };
    svg.querySelectorAll = () => [group as unknown as Element];

    const result = startPreviewTextEditHost({
      document,
      svg,
      cid: 'alpha',
      headingText: 'Heading',
      labelText: [],
      iconSize: 48,
      columnGap: 24,
      startInteraction(state) {
        actions.push({ startInteraction: state.cid });
      },
      suspendSelectionChrome() {
        actions.push('suspendSelectionChrome');
      },
      scheduleBlurCommit() {
        actions.push('scheduleBlurCommit');
      },
      commitTextEdit() {
        actions.push('commitTextEdit');
      },
      cancelTextEdit() {
        actions.push('cancelTextEdit');
      },
      stopPropagation() {
        actions.push('stopPropagation');
      },
    });

    expect(result).toEqual({
      kind: 'started',
      cid: 'alpha',
      changed: false,
    });
    expect(textEl.style.opacity).toBe('0');
    expect(textarea.value).toBe('Heading');
    expect(textarea.style.left).toBe('26px');
    expect(textarea.style.width).toBe('148px');
    expect(actions).toContainEqual({ startInteraction: 'alpha' });
    listeners.blur?.({});
    listeners.keydown?.({
      key: 'Escape',
      stopPropagation() {
        actions.push('keydown-stop');
      },
    });
    listeners.keydown?.({
      key: 'Enter',
      ctrlKey: true,
      preventDefault() {
        actions.push('preventDefault');
      },
      stopPropagation() {
        actions.push('keydown-stop');
      },
    });
    expect(actions).toContain('scheduleBlurCommit');
    expect(actions).toContain('cancelTextEdit');
    expect(actions).toContain('commitTextEdit');
  });

  it('commits text edits, cleans up DOM state, and schedules relayout', () => {
    const actions: unknown[] = [];
    const textEl = {
      style: {
        opacity: '0',
      },
    };
    const editor = {
      role: 'heading' as const,
      originalValue: 'Before',
      ta: {
        value: 'After',
        remove() {
          actions.push('remove-textarea');
        },
      },
    };

    const result = completePreviewTextEdit({
      state: {
        cid: 'alpha',
        textEl,
        editor,
      },
      getExistingTextOverride() {
        return { label: ['keep'] };
      },
      setTextOverride(cid, nextTextOverride) {
        actions.push({ setTextOverride: [cid, nextTextOverride] });
      },
      captureOverrideEntries(ids) {
        return { ids };
      },
      commitOverridePatchAction(label, beforeEntries, afterEntries) {
        actions.push({ commit: { label, beforeEntries, afterEntries } });
      },
      endInteraction() {
        actions.push('endInteraction');
      },
      reapplySelection() {
        actions.push('reapplySelection');
      },
      scheduleRelayout(cid) {
        actions.push({ scheduleRelayout: cid });
      },
    });

    expect(result).toEqual({
      kind: 'committed',
      cid: 'alpha',
      changed: true,
    });
    expect(textEl.style.opacity).toBe('');
    expect(actions).toEqual([
      { setTextOverride: ['alpha', { label: ['keep'], heading: 'After' }] },
      {
        commit: {
          label: 'Edit text',
          beforeEntries: { ids: ['alpha'] },
          afterEntries: { ids: ['alpha'] },
        },
      },
      'remove-textarea',
      'endInteraction',
      'reapplySelection',
      { scheduleRelayout: 'alpha' },
    ]);
  });

  it('cancels text edits without scheduling relayout', () => {
    const actions: unknown[] = [];
    const textEl = {
      style: {
        opacity: '0',
      },
    };

    expect(cancelPreviewTextEdit({
      state: {
        cid: 'alpha',
        textEl,
        editor: {
          role: 'label',
          originalValue: 'Before',
          ta: {
            value: 'Before',
            remove() {
              actions.push('remove-textarea');
            },
          },
        },
      },
      endInteraction() {
        actions.push('endInteraction');
      },
      reapplySelection() {
        actions.push('reapplySelection');
      },
    })).toEqual({
      kind: 'cancelled',
      cid: 'alpha',
      changed: false,
    });

    expect(textEl.style.opacity).toBe('');
    expect(actions).toEqual([
      'remove-textarea',
      'endInteraction',
      'reapplySelection',
    ]);
  });

  it('suspends selection chrome and removes resize handles for text edit', () => {
    const removals: string[] = [];
    const actions: string[] = [];

    suspendPreviewTextEditSelectionChromeHost({
      svg: {
        querySelectorAll() {
          return [{
            classList: {
              remove(name: string) {
                removals.push(name);
              },
            },
          }];
        },
      },
      removeResizeHandles() {
        actions.push('removeResizeHandles');
      },
    });

    expect(removals).toEqual(['dg-selected']);
    expect(actions).toEqual(['removeResizeHandles']);
  });

  it('commits text edit after blur when the editor is no longer active', () => {
    const actions: string[] = [];
    const activeTextarea = {};
    let scheduledCallback: (() => void) | null = null;

    schedulePreviewTextEditCommitHost({
      setTimeoutFn(callback) {
        scheduledCallback = callback;
        return 1;
      },
      isTextEditing() {
        return true;
      },
      getEditorTextarea() {
        return activeTextarea as any;
      },
      getActiveElement() {
        return null;
      },
      commitTextEdit() {
        actions.push('commitTextEdit');
      },
    });

    scheduledCallback?.();
    expect(actions).toEqual(['commitTextEdit']);
  });
});
