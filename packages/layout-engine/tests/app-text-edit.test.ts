import { describe, expect, it } from 'vitest';
import {
  findPreviewEditableTextTarget,
  resolvePreviewEditableComponentId,
  resolvePreviewTextEditCommit,
  resolvePreviewTextEditStartState,
  resolvePreviewTextEditorBlockStyle,
} from '../src/preview-shell/app-text-edit.js';

type ElementStubOptions = {
  attrs?: Record<string, string>;
  rect?: { left: number; top: number; width: number; height: number; right?: number; bottom?: number };
  textContent?: string;
  queryMap?: Record<string, unknown[]>;
  closestMap?: Record<string, unknown>;
};

function createElementStub(options: ElementStubOptions = {}) {
  return {
    textContent: options.textContent ?? '',
    getAttribute(name: string) {
      return options.attrs?.[name] ?? null;
    },
    querySelectorAll(selector: string) {
      return (options.queryMap?.[selector] ?? []) as unknown[];
    },
    querySelector(selector: string) {
      const values = (options.queryMap?.[selector] ?? []) as unknown[];
      return values[0] ?? null;
    },
    closest(selector: string) {
      return options.closestMap?.[selector] ?? null;
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
      rect: { left: 100, top: 180, width: 300, height: 120 },
    });
    const icon = createElementStub();
    const group = createElementStub({
      queryMap: {
        ':scope > text': [text],
        ':scope > rect': [rect],
        ':scope > .dg-icon': [icon],
      },
    });

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
      editorLeft: 116,
      editorTop: 210,
      editorWidth: 220,
      editorMinHeight: 40,
      backgroundColor: '#EFEFEF',
    });
  });

  it('finds the hovered fallback text block and maps heading proxy ids to authored ids', () => {
    const miss = createElementStub({
      rect: { left: 10, top: 10, width: 20, height: 20 },
    });
    const hit = createElementStub({
      rect: { left: 50, top: 60, width: 80, height: 30 },
    });
    const owner = createElementStub({
      queryMap: { ':scope > text': [miss, hit] },
      attrs: { 'data-component-id': 'box__heading' },
    });
    const target = createElementStub({
      closestMap: {
        'text[data-dg-text-role], text': null,
        '[data-component-id]': owner,
      },
    });
    const hitWithOwner = createElementStub({
      closestMap: { '[data-component-id]': owner },
    });

    expect(findPreviewEditableTextTarget(target, 90, 75)).toBe(hit);
    expect(resolvePreviewEditableComponentId(hitWithOwner, (id) => id === 'box')).toBe('box');
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
