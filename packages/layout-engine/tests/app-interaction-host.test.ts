import { describe, expect, it } from 'vitest';
import {
  clearPreviewReorderIndicator,
  collectPreviewMultiResizeSelection,
  createPreviewDragStartState,
  createPreviewResizeStartState,
  readPreviewRenderedComponentBounds,
  renderPreviewReorderIndicator,
  resolvePreviewAutolayoutDragContext,
  resolvePreviewResizeHandlePlan,
  type PreviewInteractionNode,
} from '../src/preview-shell/app-interaction-host.js';

function createNode(
  id: string,
  data: Partial<PreviewInteractionNode['data']>,
  options: {
    type?: string;
    parentId?: string | null;
    parentLayout?: string | null;
    children?: PreviewInteractionNode['children'];
    layout?: string | null;
  } = {},
): PreviewInteractionNode {
  return {
    id,
    type: options.type || 'Box',
    layout: options.layout ?? null,
    data: {
      id,
      x: data.x ?? 0,
      y: data.y ?? 0,
      width: data.width ?? 100,
      height: data.height ?? 80,
      layout: data.layout ?? options.layout ?? null,
      layout_gap: data.layout_gap ?? null,
      padding_left: data.padding_left ?? null,
      padding_top: data.padding_top ?? null,
      pad: data.pad ?? null,
    },
    parent: options.parentId
      ? { id: options.parentId, layout: options.parentLayout ?? null }
      : null,
    children: options.children || [],
  };
}

describe('preview interaction host helpers', () => {
  it('reads rendered bounds from svg groups and falls back to model bounds', () => {
    const svg = {
      querySelectorAll(selector: string) {
        if (selector === '[data-component-id="alpha"]') {
          return [
            {
              style: { transform: 'translate(8px, 16px)' },
              getBBox() {
                return { x: 10, y: 20, width: 30, height: 40 };
              },
            },
            {
              style: { transform: '' },
              getBBox() {
                return { x: 0, y: 5, width: 25, height: 15 };
              },
            },
          ];
        }
        return [];
      },
    } as unknown as ParentNode;

    expect(readPreviewRenderedComponentBounds({
      svg,
      componentId: 'alpha',
    })).toEqual({
      left: 0,
      top: 5,
      right: 48,
      bottom: 76,
      width: 48,
      height: 71,
    });

    expect(readPreviewRenderedComponentBounds({
      svg,
      componentId: 'missing',
      fallbackNodeBounds: { x: 50, y: 70, width: 120, height: 90 },
      delta: { dx: 8, dy: -8, dw: 24, dh: 16 },
    })).toEqual({
      left: 58,
      top: 62,
      right: 202,
      bottom: 168,
      width: 144,
      height: 106,
    });
  });

  it('collects multi-resize selection bounds and rejects nested selections', () => {
    const nodes = new Map<string, PreviewInteractionNode>([
      ['alpha', createNode('alpha', { x: 10, y: 20, width: 80, height: 40 })],
      ['beta', createNode('beta', { x: 110, y: 40, width: 40, height: 20 })],
      ['parent', createNode('parent', { x: 0, y: 0, width: 200, height: 120 }, {
        children: [{ id: 'alpha' }, { id: 'beta' }],
      })],
    ]);

    const selection = collectPreviewMultiResizeSelection({
      ids: ['alpha', 'beta'],
      getNode: (id) => nodes.get(id) || null,
      getAncestors: () => [],
      getRenderedBounds: (id) => {
        const node = nodes.get(id);
        return node
          ? {
            left: node.data.x,
            top: node.data.y,
            right: node.data.x + node.data.width,
            bottom: node.data.y + node.data.height,
            width: node.data.width,
            height: node.data.height,
          }
          : null;
      },
      getOwnDelta: () => ({ dx: 0, dy: 0, dw: 0, dh: 0 }),
      getEffectiveDelta: () => ({ dx: 0, dy: 0, dw: 0, dh: 0 }),
      hasLayoutChildren: () => false,
      isAutolayoutChild: () => false,
      resolvePrimaryId: (preferredId) => preferredId || null,
      minNodeSize: 16,
    });

    expect(selection).toEqual({
      ids: ['alpha', 'beta'],
      members: [
        {
          id: 'alpha',
          bounds: { left: 10, top: 20, right: 90, bottom: 60, width: 80, height: 40 },
          ancestorDx: 0,
          ancestorDy: 0,
          baseX: 10,
          baseY: 20,
          baseW: 80,
          baseH: 40,
          hasLayoutChildren: false,
        },
        {
          id: 'beta',
          bounds: { left: 110, top: 40, right: 150, bottom: 60, width: 40, height: 20 },
          ancestorDx: 0,
          ancestorDy: 0,
          baseX: 110,
          baseY: 40,
          baseW: 40,
          baseH: 20,
          hasLayoutChildren: false,
        },
      ],
      primaryId: 'beta',
      bounds: { left: 10, top: 20, right: 150, bottom: 60, width: 140, height: 40 },
      minWidth: 56,
      minHeight: 32,
    });

    expect(collectPreviewMultiResizeSelection({
      ids: ['parent', 'alpha'],
      getNode: (id) => nodes.get(id) || null,
      getAncestors: (id) => (id === 'alpha' ? ['parent'] : []),
      getRenderedBounds: () => ({
        left: 0,
        top: 0,
        right: 1,
        bottom: 1,
        width: 1,
        height: 1,
      }),
      getOwnDelta: () => ({ dx: 0, dy: 0, dw: 0, dh: 0 }),
      getEffectiveDelta: () => ({ dx: 0, dy: 0, dw: 0, dh: 0 }),
      hasLayoutChildren: () => false,
      isAutolayoutChild: () => false,
      resolvePrimaryId: (preferredId) => preferredId || null,
    })).toBeNull();
  });

  it('plans resize handles by selection and component type', () => {
    const bounds = { left: 10, top: 20, right: 90, bottom: 70, width: 80, height: 50 };

    expect(resolvePreviewResizeHandlePlan({
      selectedCount: 2,
      multiSelection: { bounds } as never,
    })).toEqual({ kind: 'multi', bounds });

    expect(resolvePreviewResizeHandlePlan({
      selectedCount: 1,
      singleBounds: bounds,
      componentType: 'Separator',
    })).toEqual({ kind: 'separator', bounds });

    expect(resolvePreviewResizeHandlePlan({
      selectedCount: 1,
      singleBounds: bounds,
      componentType: 'arrow',
    })).toEqual({ kind: 'arrow' });
  });

  it('creates single-node resize start state with parent and sibling captures', () => {
    const root = createNode('root', { width: 300, height: 200 }, {
      children: [{ id: 'alpha' }, { id: 'beta' }],
    });
    const alpha = createNode('alpha', { x: 20, y: 30, width: 80, height: 40 }, {
      parentId: 'root',
      children: [{ id: 'alpha-child' }],
    });
    const alphaChild = createNode('alpha-child', { x: 24, y: 34, width: 30, height: 20 }, {
      parentId: 'alpha',
    });
    const beta = createNode('beta', { x: 140, y: 30, width: 80, height: 40 }, {
      parentId: 'root',
    });
    const nodes = new Map([
      ['root', root],
      ['alpha', alpha],
      ['alpha-child', alphaChild],
      ['beta', beta],
    ]);

    const plan = createPreviewResizeStartState({
      componentId: 'alpha',
      axis: 'r',
      clientX: 100,
      clientY: 120,
      selectedIds: ['alpha'],
      getNode: (id) => nodes.get(id) || null,
      getSiblings: () => [{ id: 'beta' }],
      getAncestors: () => [],
      getOwnDelta: (id) => ({ dx: 1, dy: 2, dw: 3, dh: 4, ...(id === 'root' ? { dx: 8 } : null) }),
      getEffectiveDelta: () => ({ dx: 0, dy: 0, dw: 0, dh: 0 }),
      hasLayoutChildren: () => false,
      isAutolayoutChild: () => false,
      resolvePrimaryId: (preferredId) => preferredId || null,
    });

    expect(plan).toEqual({
      kind: 'start',
      touchedIds: ['alpha', 'alpha-child', 'root', 'beta'],
      state: {
        cid: 'alpha',
        axis: 'r',
        startX: 100,
        startY: 120,
        origDx: 1,
        origDy: 2,
        origDw: 3,
        origDh: 4,
        origOverrides: {
          alpha: { dx: 1, dy: 2, dw: 3, dh: 4 },
          'alpha-child': { dx: 1, dy: 2, dw: 3, dh: 4 },
          root: { dx: 8, dy: 2, dw: 3, dh: 4 },
          beta: { dx: 1, dy: 2, dw: 3, dh: 4 },
        },
        hasMoved: false,
        snapshotRecorded: false,
        v3BaseW: 80,
        v3BaseH: 40,
      },
    });
  });

  it('creates drag start state and autolayout drag context', () => {
    const dragPlan = createPreviewDragStartState({
      componentId: 'alpha',
      selectedIds: ['alpha', 'beta'],
      clientX: 40,
      clientY: 64,
      getOwnDelta: (id) => (id === 'alpha' ? { dx: 8, dy: 16 } : { dx: -8, dy: 0 }),
      collectSnapTargets: () => ({ xs: [10], ys: [20] }),
      isAutolayoutChild: () => true,
    });

    expect(dragPlan).toEqual({
      kind: 'start',
      captureIds: ['alpha', 'beta'],
      state: {
        cid: 'alpha',
        cids: ['alpha', 'beta'],
        startX: 40,
        startY: 64,
        origDeltas: {
          alpha: { dx: 8, dy: 16 },
          beta: { dx: -8, dy: 0 },
        },
        hasMoved: false,
        snapTargets: null,
        autolayout: true,
        reorderTarget: null,
      },
    });

    const autolayoutContext = resolvePreviewAutolayoutDragContext({
      componentId: 'alpha',
      svg: {
        createSVGPoint() {
          return {
            x: 0,
            y: 0,
            matrixTransform() {
              return { x: 120, y: 180 };
            },
          };
        },
        getScreenCTM() {
          return { inverse() { return {}; } };
        },
      } as unknown as SVGSVGElement,
      clientX: 200,
      clientY: 240,
      getParentNode: () => ({
        data: { id: 'root', layout: 'vertical' },
        children: [
          { data: { id: 'alpha', x: 0, y: 20, width: 80, height: 40 } },
          { data: { id: 'beta', x: 0, y: 90, width: 80, height: 40 } },
        ],
      }),
    });

    expect(autolayoutContext).toEqual({
      parentId: 'root',
      isVertical: true,
      cursorPos: 180,
      targets: [
        { cid: 'alpha', midpoint: 40 },
        { cid: 'beta', midpoint: 110 },
      ],
    });
  });

  it('renders and clears reorder indicators', () => {
    const appended = [] as Array<Record<string, string>>;
    const removed = { count: 0 };
    const svg = {
      ownerDocument: {
        createElementNS(_ns: string, kind: string) {
          return {
            kind,
            attrs: {} as Record<string, string>,
            setAttribute(name: string, value: string) {
              this.attrs[name] = value;
            },
          };
        },
      },
      appendChild(node: { attrs: Record<string, string> }) {
        appended.push(node.attrs);
      },
      querySelectorAll() {
        return [
          {
            remove() {
              removed.count += 1;
            },
          },
        ];
      },
    } as unknown as SVGSVGElement;

    renderPreviewReorderIndicator({
      svg,
      parent: {
        id: 'root',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        layout_gap: 24,
        padding_left: 12,
      },
      siblings: [
        { id: 'alpha', x: 10, y: 20, width: 80, height: 40 },
        { id: 'beta', x: 10, y: 100, width: 80, height: 40 },
      ],
      insertIndex: 1,
      isVertical: true,
    });

    expect(removed.count).toBe(1);
    expect(appended[0]).toMatchObject({
      x1: '12',
      x2: '92',
      y1: '80',
      y2: '80',
      stroke: '#E95420',
      'stroke-width': '3',
      'stroke-dasharray': '6 4',
      'data-reorder-indicator': 'true',
    });

    clearPreviewReorderIndicator(svg);
    expect(removed.count).toBe(2);
  });
});
