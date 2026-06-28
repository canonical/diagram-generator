import { describe, expect, it, vi } from 'vitest';
import {
  applyPreviewSelectionStateSnapshot,
  clearPreviewSelectionState,
  handlePreviewDoubleClickSelectionHost,
  renderPreviewTreeSelectionHost,
  resolvePreviewComponentSelectionState,
  syncPreviewSelectionUi,
} from '../src/preview-shell/app-selection-host.js';

describe('preview selection host helpers', () => {
  it('routes double-click selection and text-edit entry through the typed host', () => {
    const actions: unknown[] = [];
    const svg = {
      createSVGPoint() {
        return {
          x: 0,
          y: 0,
          matrixTransform() {
            return { x: 120, y: 90 };
          },
        };
      },
      getScreenCTM() {
        return {
          inverse() {
            return {};
          },
        };
      },
    };

    const textEditResult = handlePreviewDoubleClickSelectionHost({
      event: {
        target: {
          classList: {
            contains() {
              return false;
            },
          },
        },
        clientX: 120,
        clientY: 90,
      },
      isTextEditing: false,
      svg,
      selectionDepth: 0,
      selectedIds: [],
      findEditableTextTarget() {
        return { id: 'text-node' } as unknown as Element;
      },
      resolveEditableComponentId() {
        return 'alpha';
      },
      getAncestors() {
        return ['root'];
      },
      setSelectionDepth(depth) {
        actions.push({ setSelectionDepth: depth });
      },
      selectComponent(cid, additive) {
        actions.push({ selectComponent: [cid, additive] });
      },
      startTextEdit(cid, _event, options) {
        actions.push({ startTextEdit: [cid, options] });
      },
      findComponentAtDepth() {
        return null;
      },
      getChildIds() {
        return [];
      },
      applySelectionState() {
        actions.push('applySelectionState');
      },
    });

    expect(textEditResult).toEqual({ kind: 'text-edit' });
    expect(actions).toEqual([
      { setSelectionDepth: 1 },
      { selectComponent: ['alpha', false] },
      { startTextEdit: ['alpha', { textEl: { id: 'text-node' } }] },
    ]);

    actions.length = 0;
    const selectChildrenResult = handlePreviewDoubleClickSelectionHost({
      event: {
        target: {
          classList: {
            contains() {
              return false;
            },
          },
        },
        clientX: 120,
        clientY: 90,
      },
      isTextEditing: false,
      svg,
      selectionDepth: 1,
      selectedIds: ['parent'],
      findEditableTextTarget() {
        return null;
      },
      resolveEditableComponentId() {
        return '';
      },
      getAncestors() {
        return ['root'];
      },
      setSelectionDepth(depth) {
        actions.push({ setSelectionDepth: depth });
      },
      selectComponent(cid, additive) {
        actions.push({ selectComponent: [cid, additive] });
      },
      startTextEdit(cid) {
        actions.push({ startTextEdit: [cid] });
      },
      findComponentAtDepth(_x, _y, depth) {
        return depth === 1 ? 'parent' : null;
      },
      getChildIds() {
        return ['child-a', 'child-b'];
      },
      applySelectionState(nextState) {
        actions.push({ applySelectionState: nextState });
      },
    });

    expect(selectChildrenResult).toEqual({ kind: 'select-children' });
    expect(actions).toEqual([
      {
        applySelectionState: {
          selectedIds: ['child-a', 'child-b'],
          selectionDepth: 2,
        },
      },
    ]);
  });

  it('applies a snapshot into the shared selected-id set and forwards UI sync', () => {
    const selectedIds = new Set(['old']);
    const synced: Array<string | null | undefined> = [];
    let depth = 0;

    applyPreviewSelectionStateSnapshot({
      selectedIds,
      nextState: {
        selectedIds: ['alpha', 'beta'],
        selectionDepth: 3,
      },
      setSelectionDepth(value) {
        depth = value;
      },
      preferredId: 'beta',
      syncSelectionUi(preferredId) {
        synced.push(preferredId);
      },
    });

    expect([...selectedIds]).toEqual(['alpha', 'beta']);
    expect(depth).toBe(3);
    expect(synced).toEqual(['beta']);
  });

  it('resolves clear, replace, and additive selection state outside editor.js', () => {
    expect(clearPreviewSelectionState({
      selectedIds: ['alpha', 'beta'],
      selectionDepth: 3,
    })).toEqual({
      selectedIds: [],
      selectionDepth: 0,
    });

    expect(resolvePreviewComponentSelectionState({
      selectedIds: ['alpha'],
      selectionDepth: 1,
      cid: 'beta',
      additive: true,
      getAncestorDepth: () => 9,
    })).toEqual({
      selectedIds: ['alpha', 'beta'],
      selectionDepth: 1,
    });

    expect(resolvePreviewComponentSelectionState({
      selectedIds: ['alpha'],
      selectionDepth: 1,
      cid: 'child',
      additive: false,
      getAncestorDepth: () => 4,
    })).toEqual({
      selectedIds: ['child'],
      selectionDepth: 4,
    });
  });

  it('renders the tree host and routes context-menu deletion through the typed owner', () => {
    const selectCalls: Array<[string, boolean]> = [];
    const deleteCalls: string[] = [];
    const menuButtons: Array<{ click?: () => void }> = [];
    const createdTreeItems: Array<{
      dataset: Record<string, string>;
      click?: (event: { stopPropagation: () => void; shiftKey: boolean }) => void;
      contextmenu?: (event: {
        preventDefault: () => void;
        stopPropagation: () => void;
        clientX: number;
        clientY: number;
      }) => void;
    }> = [];

    const ownerDocument = {
      createElement(tag: string) {
        if (tag === 'button') {
          const button = {
            addEventListener(type: string, handler: () => void) {
              if (type === 'click') {
                this.click = handler;
              }
            },
          };
          menuButtons.push(button);
          return button;
        }
        const element = {
          dataset: {} as Record<string, string>,
          style: {} as Record<string, string>,
          className: '',
          textContent: '',
          children: [] as unknown[],
          addEventListener(type: string, handler: (...args: any[]) => void) {
            (this as Record<string, unknown>)[type] = handler;
          },
          appendChild(child: unknown) {
            this.children.push(child);
          },
          remove() {},
          contains() {
            return false;
          },
        };
        if (tag === 'div') {
          createdTreeItems.push(element as unknown as typeof createdTreeItems[number]);
        }
        return element;
      },
      body: {
        appendChild() {},
      },
      getElementById() {
        return null;
      },
      addEventListener() {},
      removeEventListener() {},
    } as unknown as Document;

    const container = {
      ownerDocument,
      replaceChildren() {},
      appendChild() {},
    } as unknown as HTMLElement;

    expect(renderPreviewTreeSelectionHost({
      document: ownerDocument,
      container,
      nodes: [{ id: 'alpha' }, { id: 'beta' }],
      overrides: {},
      selectedIds: ['alpha'],
      selectComponent(cid, additive) {
        selectCalls.push([cid, additive]);
      },
      onDeleteSelection() {
        deleteCalls.push('delete');
      },
    })).toBe(true);

    createdTreeItems[0]?.click?.({
      stopPropagation() {},
      shiftKey: true,
    });
    createdTreeItems[1]?.contextmenu?.({
      preventDefault() {},
      stopPropagation() {},
      clientX: 10,
      clientY: 20,
    });
    menuButtons[0]?.click?.();

    expect(selectCalls).toEqual([
      ['alpha', true],
      ['beta', false],
    ]);
    expect(deleteCalls).toEqual(['delete']);
  });

  it('moves tree selection up and down from the focused row on Enter and Shift+Enter', () => {
    const selectCalls: Array<[string, boolean]> = [];
    const createdTreeItems: Array<{
      dataset: Record<string, string>;
      tabIndex?: number;
      focusCalls: number;
      click?: (event: { stopPropagation: () => void; shiftKey: boolean }) => void;
      keydown?: (event: {
        key: string;
        shiftKey: boolean;
        preventDefault: () => void;
        stopPropagation: () => void;
      }) => void;
      focus: () => void;
    }> = [];

    const ownerDocument = {
      createElement(tag: string) {
        const element = {
          dataset: {} as Record<string, string>,
          style: {} as Record<string, string>,
          className: '',
          textContent: '',
          tabIndex: -1,
          focusCalls: 0,
          addEventListener(type: string, handler: (...args: any[]) => void) {
            (this as Record<string, unknown>)[type] = handler;
          },
          appendChild() {},
          remove() {},
          contains() {
            return false;
          },
          focus() {
            this.focusCalls += 1;
          },
        };
        if (tag === 'div') {
          createdTreeItems.push(element as unknown as typeof createdTreeItems[number]);
        }
        return element;
      },
      body: {
        appendChild() {},
      },
      getElementById() {
        return null;
      },
      addEventListener() {},
      removeEventListener() {},
    } as unknown as Document;

    const container = {
      ownerDocument,
      replaceChildren() {},
      appendChild() {},
    } as unknown as HTMLElement;

    expect(renderPreviewTreeSelectionHost({
      document: ownerDocument,
      container,
      nodes: [{ id: 'alpha' }, { id: 'beta' }, { id: 'gamma' }],
      overrides: {},
      selectedIds: ['alpha'],
      selectComponent(cid, additive) {
        selectCalls.push([cid, additive]);
      },
      onDeleteSelection() {},
    })).toBe(true);

    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    createdTreeItems[0]?.keydown?.({
      key: 'Enter',
      shiftKey: false,
      preventDefault,
      stopPropagation,
    });
    createdTreeItems[1]?.keydown?.({
      key: 'Enter',
      shiftKey: true,
      preventDefault,
      stopPropagation,
    });

    expect(selectCalls).toEqual([
      ['beta', false],
      ['alpha', false],
    ]);
    expect(createdTreeItems[0]?.tabIndex).toBe(0);
    expect(createdTreeItems[1]?.tabIndex).toBe(-1);
    expect(preventDefault).toHaveBeenCalledTimes(2);
    expect(stopPropagation).toHaveBeenCalledTimes(2);
  });

  it('syncs svg classes, tree selection, resize handles, and inspector state', () => {
    const alphaEl = { classList: { add: vi.fn(), remove: vi.fn() } };
    const staleEl = { classList: { add: vi.fn(), remove: vi.fn() } };
    const svg = {
      querySelectorAll(selector: string) {
        if (selector === '.dg-selected') {
          return [staleEl];
        }
        if (selector === '[data-component-id="alpha"]') {
          return [alphaEl];
        }
        return [];
      },
    };
    const document = {
      querySelector(selector: string) {
        return selector === '#stage svg' ? svg : null;
      },
    } as unknown as Document;
    const syncTreeSelectionState = vi.fn();
    const removeResizeHandles = vi.fn();
    const showResizeHandles = vi.fn();
    const renderEmptyInspector = vi.fn();
    const renderSelectionInspector = vi.fn();

    syncPreviewSelectionUi({
      document,
      selectedIds: ['alpha'],
      preferredId: 'alpha',
      resolvePrimaryId: (preferredId) => preferredId || null,
      syncTreeSelectionState,
      removeResizeHandles,
      showResizeHandles,
      renderEmptyInspector,
      renderSelectionInspector,
    });

    expect(staleEl.classList.remove).toHaveBeenCalledWith('dg-selected');
    expect(alphaEl.classList.add).toHaveBeenCalledWith('dg-selected');
    expect(syncTreeSelectionState).toHaveBeenCalledWith(document, ['alpha']);
    expect(removeResizeHandles).toHaveBeenCalledTimes(1);
    expect(showResizeHandles).toHaveBeenCalledWith('alpha');
    expect(renderSelectionInspector).toHaveBeenCalledWith('alpha');
    expect(renderEmptyInspector).not.toHaveBeenCalled();
  });

  it('renders the empty inspector when the selection clears', () => {
    const document = {
      querySelector() {
        return null;
      },
    } as unknown as Document;
    const removeResizeHandles = vi.fn();
    const renderEmptyInspector = vi.fn();

    syncPreviewSelectionUi({
      document,
      selectedIds: [],
      resolvePrimaryId: () => null,
      syncTreeSelectionState: vi.fn(),
      removeResizeHandles,
      showResizeHandles: vi.fn(),
      renderEmptyInspector,
      renderSelectionInspector: vi.fn(),
    });

    expect(removeResizeHandles).toHaveBeenCalledTimes(1);
    expect(renderEmptyInspector).toHaveBeenCalledTimes(1);
  });
});
