import { describe, expect, it } from 'vitest';
import {
  findPreviewEditableTextTarget,
  resolvePreviewEditableComponentId,
  resolvePreviewTextEditCommit,
  resolvePreviewTextEditStartState,
  resolvePreviewTextEditorBlockStyle,
} from '../src/preview-shell/app-text-edit.js';

type QueryResult = unknown[] | (() => unknown[]);
type ClosestResult = unknown | (() => unknown);

type ElementStubOptions = {
  attrs?: Record<string, string>;
  rect?: { left: number; top: number; width: number; height: number; right?: number; bottom?: number };
  textContent?: string;
  queryMap?: Record<string, QueryResult>;
  closestMap?: Record<string, ClosestResult>;
};

function createElementStub(options: ElementStubOptions = {}) {
  const queryMap = options.queryMap;
  const closestMap = options.closestMap ?? {};
  return {
    textContent: options.textContent ?? '',
    queryMap,
    closestMap,
    getAttribute(name: string) {
      return options.attrs?.[name] ?? null;
    },
    querySelectorAll(selector: string) {
      const values = queryMap?.[selector];
      return (typeof values === 'function' ? values() : values ?? []) as unknown[];
    },
    querySelector(selector: string) {
      const values = queryMap?.[selector];
      const list = typeof values === 'function' ? values() : values ?? [];
      return list[0] ?? null;
    },
    closest(selector: string) {
      const value = closestMap?.[selector];
      if (typeof value === 'function') {
        return value();
      }
      return value ?? null;
    },
    getBoundingClientRect() {
      const rect = options.rect ?? { left: 0, top: 0, width: 0, height: 0 };
      return {
        ...rect,
        right: rect.right ?? rect.left + rect.width,
        bottom: rect.bottom ?? rect.top + rect.height,
      };
    },
  } as unknown as Element;
}

function assignComponentOwner(element: { closestMap?: Record<string, unknown> }, owner: unknown): void {
  if (!element.closestMap) {
    element.closestMap = {};
  }
  element.closestMap['[data-component-id]'] = owner;
}

describe('preview text edit helpers', () => {
  it('derives textarea typography from rendered tspans', () => {
    const first = createElementStub({
      attrs: {
        y: '12',
        'font-size': '18',
        'font-weight': '700',
        fill: '#123456',
        'font-family': 'IBM Plex Sans',
        'letter-spacing': '0.2px',
        'font-variant-caps': 'small-caps',
      },
    });
    const second = createElementStub({
      attrs: { y: '36' },
    });
    const text = createElementStub({
      attrs: { 'font-family': 'Fallback Sans' },
      queryMap: { tspan: [first, second] },
    });

    expect(resolvePreviewTextEditorBlockStyle(text)).toEqual({
      fontSize: 18,
      fontWeight: '700',
      fill: '#123456',
      fontFamily: 'IBM Plex Sans',
      letterSpacing: '0.2px',
      fontVariantCaps: 'small-caps',
      lineHeight: 24,
    });
  });

  it('plans a heading textarea with scaled geometry and icon gutter', () => {
    const first = createElementStub({
      attrs: {
        y: '10',
        'font-size': '16',
        'font-weight': '600',
        fill: '#111111',
      },
    });
    const second = createElementStub({
      attrs: { y: '30' },
    });
    const text = createElementStub({
      rect: { left: 120, top: 210, width: 100, height: 40 },
      queryMap: { tspan: [first, second] },
    });
    const rect = createElementStub({
      attrs: { fill: '#EFEFEF' },
      rect: { left: 10, top: 180, width: 300, height: 120 },
    });
    const icon = createElementStub();
    const group = createElementStub({
      queryMap: {
        text: [text],
        ':scope > text': [text],
        ':scope > rect': [rect],
        ':scope > .dg-icon': [icon],
      },
    });
    assignComponentOwner(text, group);

    const state = resolvePreviewTextEditStartState({
      groups: [group],
      headingText: 'Heading line',
      labelText: ['label'],
      targetedTextEl: text,
      iconSize: 16,
      columnGap: 8,
      svgScale: 2,
    });

    expect(state).toMatchObject({
      textEl: text,
      blockRole: 'heading',
      hasHeading: true,
      semanticLines: ['Heading line'],
      editorLeft: 26,
      editorTop: 210,
      editorWidth: 220,
      editorMinHeight: 40,
      backgroundColor: '#EFEFEF',
    });
  });

  it('finds the hovered fallback text block and maps heading proxy ids to authored ids', () => {
    const hit = createElementStub({
      rect: { left: 50, top: 60, width: 80, height: 30 },
    });
    const miss = createElementStub({
      rect: { left: 10, top: 10, width: 20, height: 20 },
    });
    const owner = createElementStub({
      attrs: { 'data-component-id': 'box__heading' },
      queryMap: {
        text: [miss, hit],
        ':scope > text': [miss, hit],
      },
    });
    assignComponentOwner(owner, owner);
    assignComponentOwner(hit, owner);

    const target = createElementStub({
      closestMap: {
        'text[data-dg-text-role], text': null,
        '[data-component-id]': owner,
      },
    });

    expect(findPreviewEditableTextTarget(target, 90, 75)).toBe(hit);
    expect(resolvePreviewEditableComponentId(createElementStub({
      closestMap: { '[data-component-id]': owner },
    }), (id) => id === 'box')).toBe('box');
  });

  it('finds nested text elements without direct text children', () => {
    const hit = createElementStub({
      rect: { left: 120, top: 130, width: 40, height: 20 },
    });
    const wrapper = createElementStub({
      queryMap: {
        text: [hit],
      },
      attrs: { 'data-component-id': 'box' },
    });
    assignComponentOwner(hit, wrapper);

    const target = createElementStub({
      closestMap: {
        'text[data-dg-text-role], text': null,
        '[data-component-id]': wrapper,
      },
    });

    expect(findPreviewEditableTextTarget(target, 130, 140)).toBe(hit);
  });

  it('resolves start state from nested text descendants', () => {
    const text = createElementStub({
      rect: { left: 120, top: 130, width: 100, height: 20 },
      queryMap: {
        tspan: [
          createElementStub({ attrs: { y: '10' } }),
          createElementStub({ attrs: { y: '34' } }),
        ],
      },
    });
    const group = createElementStub({
      queryMap: {
        text: [text],
        ':scope > rect': [createElementStub({
          attrs: { fill: '#fff' },
          rect: { left: 100, top: 100, width: 120, height: 80 },
        })],
      },
      attrs: { 'data-component-id': 'box' },
    });
    assignComponentOwner(text, group);

    const state = resolvePreviewTextEditStartState({
      groups: [group],
      headingText: 'Heading',
      labelText: ['label'],
      iconSize: 16,
      columnGap: 8,
      svgScale: 1,
    });

    expect(state).toMatchObject({
      textEl: text,
      blockRole: 'heading',
      hasHeading: true,
      semanticLines: ['Heading'],
      editorLeft: 108,
      editorTop: 130,
      editorWidth: 104,
      editorMinHeight: 24,
      backgroundColor: '#fff',
    });
  });

  it('shapes heading and label text overrides for commit', () => {
    expect(resolvePreviewTextEditCommit({
      currentValue: 'New heading\r',
      originalValue: 'Old heading',
      existingText: { label: ['keep'] },
      role: 'heading',
    })).toEqual({
      changed: true,
      normalizedValue: 'New heading',
      nextTextOverride: {
        label: ['keep'],
        heading: 'New heading',
      },
    });

    expect(resolvePreviewTextEditCommit({
      currentValue: '',
      originalValue: 'before',
      existingText: {},
      role: 'label',
    })).toEqual({
      changed: true,
      normalizedValue: '',
      nextTextOverride: {
        label: [],
      },
    });
  });
});
