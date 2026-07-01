import { describe, expect, it } from 'vitest';
import {
  applyPreviewSvgOverrides,
  applyPreviewSvgOverridesHost,
  resolvePreviewArrowShiftedSegments,
  resolvePreviewArrowSideShift,
  resolvePreviewReflowShiftMap,
  shiftPreviewArrowheadPoints,
} from '../src/preview-shell/app-override-application.js';

describe('preview override application helpers', () => {
  it('computes side-aware arrow endpoint shifts with reflow adjustments', () => {
    expect(resolvePreviewArrowSideShift({
      delta: { dx: 10, dy: 20, dw: 40, dh: 16 },
      side: 'right',
      reflowDh: 8,
      reflowDy: 24,
    })).toEqual({
      dx: 50,
      dy: 56,
    });

    expect(resolvePreviewArrowSideShift({
      delta: { dx: -5, dy: 12, dw: 18, dh: 6 },
      side: 'bottom',
      reflowDh: 10,
      reflowDy: 4,
    })).toEqual({
      dx: 4,
      dy: 32,
    });
  });

  it('computes cumulative reflow shifts for lower root rows only', () => {
    const result = resolvePreviewReflowShiftMap({
      reflowDhByComponent: {
        alpha: 8,
        beta: 24,
        gamma: 16,
      },
      rootNodes: [
        { id: 'root-a', gridRow: 0 },
        { id: 'root-b', gridRow: 1 },
        { id: 'root-c', gridRow: 3 },
      ],
      getNode: (cid) => ({
        id: cid,
        gridRow: {
          alpha: 0,
          beta: 1,
          gamma: 1,
        }[cid] ?? 0,
      }),
    });

    expect(result).toEqual({
      'root-b': 8,
      'root-c': 32,
    });
  });

  it('shifts orthogonal arrow segments while preserving waypoint continuity', () => {
    expect(resolvePreviewArrowShiftedSegments({
      segments: [
        { x1: 0, y1: 0, x2: 100, y2: 0 },
        { x1: 100, y1: 0, x2: 100, y2: 80 },
        { x1: 100, y1: 80, x2: 180, y2: 80 },
      ],
      sourceShift: { dx: 10, dy: 20 },
      targetShift: { dx: -5, dy: 15 },
    })).toEqual([
      { x1: 10, y1: 20, x2: 100, y2: 20 },
      { x1: 100, y1: 20, x2: 100, y2: 95 },
      { x1: 100, y1: 95, x2: 175, y2: 95 },
    ]);
  });

  it('shifts arrowhead polygon point strings by the target delta', () => {
    expect(shiftPreviewArrowheadPoints('10,20 30,40 50,60', { dx: 5, dy: -10 }))
      .toBe('15,10 35,30 55,50');
  });

  it('applies preview svg overrides through the host wrapper', () => {
    const captured: unknown[] = [];
    const svg = { tagName: 'svg' } as unknown as SVGSVGElement;

    expect(applyPreviewSvgOverridesHost({
      document: {
        querySelector(selector: string) {
          return selector === '#stage svg' ? svg : null;
        },
      },
      selectedIds: new Set(['alpha', 'beta']),
      componentTree: [{ id: 'alpha' }],
      rootNodes: [{ id: 'root' }],
      overrides: { alpha: { text: 'x' } },
      relayoutStatus: { frameManaged: true },
      boxStyles: {},
      inset: 8,
      iconSize: 48,
      gridStep: 8,
      hasDiagramGrid: true,
      getNode() {
        return { id: 'alpha' };
      },
      getOwnDelta() {
        return { dx: 0, dy: 0, dw: 0, dh: 0 };
      },
      getEffectiveDelta() {
        return { dx: 0, dy: 0, dw: 0, dh: 0 };
      },
      isFrameManagedTarget() {
        return false;
      },
      showResizeHandles(id: string) {
        captured.push({ showResizeHandles: id });
      },
      applyPreviewSvgOverrides(options) {
        captured.push(options);
      },
    })).toBe(true);

    expect(captured).toEqual([
      {
        svg,
        componentTree: [{ id: 'alpha' }],
        rootNodes: [{ id: 'root' }],
        overrides: { alpha: { text: 'x' } },
        relayoutStatus: { frameManaged: true },
        boxStyles: {},
        inset: 8,
        iconSize: 48,
        gridStep: 8,
        hasDiagramGrid: true,
        getNode: expect.any(Function),
        getOwnDelta: expect.any(Function),
        getEffectiveDelta: expect.any(Function),
        isFrameManagedTarget: expect.any(Function),
        selectedId: 'beta',
        showResizeHandles: expect.any(Function),
      },
    ]);
  });

  it('applies style overrides to frame-managed svg groups without mutating geometry', () => {
    const OriginalSvgElement = globalThis.SVGElement;
    class FakeSvgElement {
      private readonly attrs = new Map<string, string>();
      style = {};
      innerHTML = '';

      constructor(
        private readonly queries: Record<string, FakeSvgElement | null> = {},
        private readonly queryLists: Record<string, FakeSvgElement[]> = {},
      ) {}

      getAttribute(name: string) {
        return this.attrs.get(name) ?? null;
      }

      setAttribute(name: string, value: string) {
        this.attrs.set(name, value);
      }

      hasAttribute(name: string) {
        return this.attrs.has(name);
      }

      querySelector(selector: string) {
        return this.queries[selector] ?? null;
      }

      querySelectorAll(selector: string) {
        return this.queryLists[selector] ?? [];
      }
    }
    (globalThis as { SVGElement?: typeof FakeSvgElement }).SVGElement = FakeSvgElement;

    try {
      const tspan = new FakeSvgElement();
      tspan.setAttribute('fill', '#111111');
      const text = new FakeSvgElement({}, {
        tspan: [tspan],
      });
      const rect = new FakeSvgElement();
      rect.setAttribute('width', '120');
      rect.setAttribute('height', '80');
      rect.setAttribute('fill', '#ffffff');
      const group = new FakeSvgElement({
        ':scope > rect:first-of-type': rect,
        text,
      }, {
        'text tspan': [tspan],
        '.dg-icon': [],
      });
      group.setAttribute('data-component-id', 'alpha');
      group.setAttribute('data-frame-managed', 'true');
      group.setAttribute('transform', 'translate(10 20)');
      const ownerDocument = {
        createElement() {
          return {
            getContext() {
              return null;
            },
          };
        },
      };
      const svg = new FakeSvgElement({}, {
        '[data-component-id] text': [text],
        '[data-component-id="alpha"]': [group],
      }) as unknown as SVGSVGElement & { ownerDocument: typeof ownerDocument };
      Object.assign(svg, { ownerDocument });

      applyPreviewSvgOverrides({
        svg,
        componentTree: [{ id: 'alpha' }],
        rootNodes: [{ id: 'alpha', gridRow: 0 }],
        overrides: { alpha: { style: 'parent' } },
        relayoutStatus: { frameManaged: true },
        boxStyles: {
          parent: {
            fill: '#eeeeee',
            text: '#222222',
            icon: '#333333',
          },
        },
        inset: 8,
        iconSize: 48,
        gridStep: 8,
        hasDiagramGrid: true,
        getNode() {
          return { id: 'alpha', gridRow: 0 };
        },
        getOwnDelta() {
          return { dx: 0, dy: 0, dw: 24, dh: 12 };
        },
        getEffectiveDelta() {
          return { dx: 5, dy: 7, dw: 24, dh: 12 };
        },
        isFrameManagedTarget(element) {
          return element instanceof FakeSvgElement
            && element.getAttribute('data-frame-managed') === 'true';
        },
        selectedId: null,
        showResizeHandles() {},
      });

      expect(rect.getAttribute('fill')).toBe('#eeeeee');
      expect(rect.getAttribute('width')).toBe('120');
      expect(rect.getAttribute('height')).toBe('80');
      expect(group.getAttribute('style') ?? '').not.toContain('translate');
      expect(tspan.getAttribute('fill')).toBe('#222222');
    } finally {
      (globalThis as { SVGElement?: typeof FakeSvgElement }).SVGElement = OriginalSvgElement;
    }
  });
});
