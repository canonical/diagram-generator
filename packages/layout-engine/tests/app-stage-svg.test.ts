import { describe, expect, it, vi } from 'vitest';
import {
  bindPreviewStageSvgInteractionHost,
  bindPreviewStageSvgInteraction,
  clearPreviewSvgHoverState,
  dispatchPreviewStageSvgHoverHost,
  dispatchPreviewStageSvgHoverOutHost,
  ensurePreviewSvgHitAreas,
  syncPreviewSvgHoverState,
  teardownPreviewStageSvgInteraction,
} from '../src/preview-shell/app-stage-svg.js';

function createClassList() {
  const values = new Set<string>();
  return {
    add(value: string) {
      values.add(value);
    },
    remove(value: string) {
      values.delete(value);
    },
    has(value: string) {
      return values.has(value);
    },
  };
}

describe('preview stage svg helpers', () => {
  it('adds line and icon hit areas for components without a root rect', () => {
    const inserted: Array<{ kind: string; attrs: Record<string, string>; pointerEvents: string }> = [];
    const lines = [
      {
        getAttribute(name: string) {
          return ({ x1: '1', y1: '2', x2: '3', y2: '4' } as Record<string, string>)[name] ?? null;
        },
      },
    ];
    const lineGroup = {
      firstChild: {},
      querySelector(selector: string) {
        if (selector === ':scope > rect') return null;
        if (selector === ':scope > rect[data-dg-hit-area="1"]') return null;
        return null;
      },
      querySelectorAll(selector: string) {
        if (selector === 'line') return lines;
        if (selector === '.dg-icon') return [];
        return [];
      },
      insertBefore(node: { kind: string; attrs: Record<string, string>; style: { pointerEvents: string } }) {
        inserted.push({
          kind: node.kind,
          attrs: node.attrs,
          pointerEvents: node.style.pointerEvents,
        });
      },
      getBBox() {
        return { x: 0, y: 0, width: 0, height: 0 };
      },
    };
    const iconGroup = {
      firstChild: {},
      querySelector(selector: string) {
        if (selector === ':scope > rect') return null;
        if (selector === ':scope > rect[data-dg-hit-area="1"]') return null;
        return null;
      },
      querySelectorAll(selector: string) {
        if (selector === 'line') return [];
        if (selector === '.dg-icon') return [{}];
        return [];
      },
      insertBefore(node: { kind: string; attrs: Record<string, string>; style: { pointerEvents: string } }) {
        inserted.push({
          kind: node.kind,
          attrs: node.attrs,
          pointerEvents: node.style.pointerEvents,
        });
      },
      getBBox() {
        return { x: 10, y: 20, width: 30, height: 40 };
      },
    };
    const svg = {
      ownerDocument: {
        createElementNS(_ns: string, kind: string) {
          return {
            kind,
            attrs: {} as Record<string, string>,
            style: { pointerEvents: '' },
            setAttribute(name: string, value: string | null) {
              this.attrs[name] = String(value);
            },
          };
        },
      },
      querySelectorAll() {
        return [lineGroup, iconGroup];
      },
    } as unknown as SVGSVGElement;

    ensurePreviewSvgHitAreas(svg);

    expect(inserted).toEqual([
      {
        kind: 'line',
        attrs: {
          'data-dg-hit-area': '1',
          x1: '1',
          y1: '2',
          x2: '3',
          y2: '4',
          stroke: 'transparent',
          'stroke-width': '12',
        },
        pointerEvents: 'stroke',
      },
      {
        kind: 'rect',
        attrs: {
          'data-dg-hit-area': '1',
          x: '10',
          y: '20',
          width: '30',
          height: '40',
          fill: 'transparent',
        },
        pointerEvents: 'fill',
      },
    ]);
  });

  it('syncs and clears svg hover classes by component id', () => {
    const hovered = { classList: createClassList() };
    hovered.classList.add('dg-hover');
    const targetA = { classList: createClassList() };
    const targetB = { classList: createClassList() };
    const svg = {
      querySelectorAll(selector: string) {
        if (selector === '.dg-hover') {
          return [hovered, targetA, targetB].filter((element) => element.classList.has('dg-hover'));
        }
        if (selector === '[data-component-id="alpha"]') return [targetA, targetB];
        return [];
      },
    } as unknown as ParentNode;

    syncPreviewSvgHoverState(svg, 'alpha');
    expect(hovered.classList.has('dg-hover')).toBe(false);
    expect(targetA.classList.has('dg-hover')).toBe(true);
    expect(targetB.classList.has('dg-hover')).toBe(true);

    clearPreviewSvgHoverState(svg);
    expect(targetA.classList.has('dg-hover')).toBe(false);
    expect(targetB.classList.has('dg-hover')).toBe(false);
  });

  it('binds and tears down stage svg interaction handlers', () => {
    const previousAdd = vi.fn();
    const previousRemove = vi.fn();
    const nextAdd = vi.fn();
    const nextRemove = vi.fn();
    const previousSvg = {
      addEventListener: previousAdd,
      removeEventListener: previousRemove,
    } as unknown as SVGSVGElement;
    const nextSvg = {
      ownerDocument: { createElementNS: vi.fn() },
      querySelectorAll: vi.fn(() => []),
      addEventListener: nextAdd,
      removeEventListener: nextRemove,
    } as unknown as SVGSVGElement;
    const handlers = {
      onMouseDown: vi.fn(),
      onDoubleClick: vi.fn(),
      onMouseOver: vi.fn(),
      onMouseOut: vi.fn(),
    };

    const bound = bindPreviewStageSvgInteraction({
      svg: nextSvg,
      previousSvg,
      handlers,
      ensureArrowHitAreas: vi.fn(),
      rebuildTreeUi: vi.fn(),
    });

    expect(bound).toBe(nextSvg);
    expect(previousRemove).toHaveBeenCalledTimes(4);
    expect(nextAdd).toHaveBeenCalledTimes(4);

    teardownPreviewStageSvgInteraction(nextSvg, handlers);
    expect(nextRemove).toHaveBeenCalledTimes(4);
  });

  it('routes hover and bind host wiring through the shared stage helpers', () => {
    const syncHoverState = vi.fn();
    const clearHoverState = vi.fn();
    const binder = vi.fn(({ handlers }) => {
      handlers.onMouseOver({
        currentTarget: svg,
        clientX: 10,
        clientY: 12,
      });
      handlers.onMouseOut({
        currentTarget: svg,
      });
      return svg;
    });
    const svg = {
      createSVGPoint() {
        return {
          x: 0,
          y: 0,
          matrixTransform() {
            return { x: 20, y: 24 };
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
    } as unknown as SVGSVGElement;

    expect(dispatchPreviewStageSvgHoverHost({
      event: {
        currentTarget: svg,
        clientX: 8,
        clientY: 9,
      },
      selectionDepth: 1,
      findArrowAtPoint() {
        return null;
      },
      findComponentAtDepth() {
        return 'alpha';
      },
      syncHoverState,
    })).toBe(true);
    expect(syncHoverState).toHaveBeenCalledWith(svg, 'alpha');

    expect(dispatchPreviewStageSvgHoverOutHost({
      event: {
        currentTarget: svg,
      },
      clearHoverState,
    })).toBe(true);
    expect(clearHoverState).toHaveBeenCalledWith(svg);

    expect(bindPreviewStageSvgInteractionHost({
      document: {
        querySelector() {
          return svg;
        },
      },
      previousSvg: null,
      suppressHover: false,
      selectionDepth: 1,
      onMouseDown: vi.fn(),
      onDoubleClick: vi.fn(),
      findArrowAtPoint: () => null,
      findComponentAtDepth: () => 'beta',
      syncHoverState,
      clearHoverState,
      bindStageSvgInteraction: binder,
    })).toBe(svg);
    expect(binder).toHaveBeenCalledTimes(1);
  });
});
