import type { ElkLayoutSnapshot } from '../elk-layout.js';
import type { Arrow, Frame, FrameDiagram } from '../frame-model.js';
import type { TextMeasureAdapter } from '../text-measure.js';
import type { PreviewRoutedArrow } from './app-arrow-render.js';
import type { FreshPreviewSvgRenderResult } from './app-fresh-render.js';
import type { PreviewLocalRelayoutStatus, PreviewRelayoutOverrideEntry } from './app-relayout.js';

export type PreviewLocalRelayoutOverrideMode = 'auto' | 'unready';

export interface PreviewLayoutBridgeState<
  TPreviewDocumentJson = Record<string, unknown>,
  TFrameTreeJson = Record<string, unknown>,
> {
  previewDocumentJson: TPreviewDocumentJson | null;
  frameTreeJson: TFrameTreeJson | null;
  lastElkSnapshot: ElkLayoutSnapshot | null;
  lastElkFrameLabels: Record<string, string> | null;
  textAdapter: TextMeasureAdapter | null;
  textAdapterError: string | null;
  localRelayoutOverrideMode: PreviewLocalRelayoutOverrideMode;
}

export interface PreviewLayoutBridgeRelayoutResult {
  coerced?: Map<string, unknown> | null;
  width: number;
  height: number;
}

export interface PreviewLayoutBridgeOldBoundsEntry {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PreviewLayoutBridgeLocalRelayoutOptions {
  skipModelUpdate?: boolean;
}

export interface PreviewLayoutBridgeRemovalModel {
  removedIds?: Set<string>;
  topLevelRemovalIds?: (() => string[]) | null;
}

export interface PreviewLayoutBridgeModelTreeLoader {
  loadTree: (nodes: unknown[]) => void;
}

export interface CreatePreviewLayoutBridgeRuntimeOptions<
  TModel,
  TPreviewDocumentJson = Record<string, unknown>,
  TFrameTreeJson = Record<string, unknown>,
> {
  state: PreviewLayoutBridgeState<TPreviewDocumentJson, TFrameTreeJson>;
  fetchPreviewDocument: (slug: string) => Promise<TPreviewDocumentJson | null>;
  extractFrameTreeFromPreviewDocument: (
    previewDocumentJson: TPreviewDocumentJson | null,
  ) => TFrameTreeJson | null;
  createTextAdapter: () => Promise<TextMeasureAdapter>;
  getTextAdapterBackend: (textAdapter: TextMeasureAdapter | null) => string | null;
  isAuthoritativeTextAdapter: (textAdapter: TextMeasureAdapter | null) => boolean;
  isElkLayeredDiagramJson: (json: TFrameTreeJson | Record<string, unknown> | null) => boolean;
  deserializeFrameDiagram: (json: TFrameTreeJson | Record<string, unknown>) => FrameDiagram;
  collectRelayoutFrameOverrides: (
    overrides: Record<string, PreviewRelayoutOverrideEntry>,
  ) => Record<string, PreviewRelayoutOverrideEntry>;
  applyOverridesToFrameTree: (
    diagram: FrameDiagram,
    allOverrides: Record<string, PreviewRelayoutOverrideEntry>,
    gridOverrides: Record<string, unknown>,
  ) => void;
  layoutLocalDiagram: (
    diagram: FrameDiagram,
    textAdapter: TextMeasureAdapter,
  ) => PreviewLayoutBridgeRelayoutResult;
  collectPlacedBounds: (
    root: Frame,
  ) => Record<string, PreviewLayoutBridgeOldBoundsEntry>;
  collectFramesById: (root: Frame) => Record<string, Frame>;
  queryStageSvg: () => SVGSVGElement | null;
  patchSvgFromLayout: (options: {
    svg: SVGSVGElement | null;
    oldBounds: Record<string, PreviewLayoutBridgeOldBoundsEntry>;
    newBounds: Record<string, PreviewLayoutBridgeOldBoundsEntry>;
    framesById: Record<string, Frame>;
  }) => void;
  routeArrows: (
    arrows: Arrow[],
    boundsMap: Record<string, PreviewLayoutBridgeOldBoundsEntry>,
  ) => PreviewRoutedArrow[];
  patchArrowsSvg: (options: {
    svg: SVGSVGElement | null;
    routedArrows: PreviewRoutedArrow[];
    boundsMap: Record<string, PreviewLayoutBridgeOldBoundsEntry>;
  }) => void;
  updateModelFromLayout: (model: TModel, root: Frame) => void;
  syncArrowsInModel: (model: TModel, arrows: Arrow[], routedArrows: PreviewRoutedArrow[]) => void;
  renderFreshPreviewSvg: (options: {
    ownerDocument: Document;
    previewDocumentJson: TPreviewDocumentJson | null;
    frameTreeJson: TFrameTreeJson | null;
    overrides: Record<string, PreviewRelayoutOverrideEntry>;
    gridOverrides: Record<string, unknown> | null;
    model: TModel;
    textAdapter: TextMeasureAdapter;
    applySessionRemovalsToDiagramJson: (
      diagramJson: Record<string, unknown>,
      model: TModel,
    ) => void;
    applyOverridesToFrameTree: (
      diagram: FrameDiagram,
      allOverrides: Record<string, PreviewRelayoutOverrideEntry>,
      gridOverrides: Record<string, unknown>,
    ) => void;
    collectRelayoutFrameOverrides: (
      overrides: Record<string, PreviewRelayoutOverrideEntry>,
    ) => Record<string, PreviewRelayoutOverrideEntry>;
    isElkLayeredDiagramJson: (json: TFrameTreeJson | Record<string, unknown> | null) => boolean;
    resolveElkOptionOverrides: (diagram: FrameDiagram, model: TModel) => Record<string, string>;
    updateModelFromLayout: (model: TModel, root: Frame) => void;
    syncArrowsInModel: (model: TModel, arrows: Arrow[], routedArrows: PreviewRoutedArrow[]) => void;
  }) => Promise<FreshPreviewSvgRenderResult<SVGSVGElement>>;
  ownerDocument: Document;
  getStageContainer: () => HTMLElement | null;
  fitRenderedSvg: (
    svg: SVGSVGElement,
    options: { minWidth: number; minHeight: number },
  ) => unknown;
  resolveElkOptionOverrides: (diagram: FrameDiagram, model: TModel) => Record<string, string>;
  refreshElkViewMode: () => void;
  warn: (message: string, error?: unknown) => void;
  error: (message: string, error?: unknown) => void;
}

export interface PreviewLayoutBridgeRuntime<
  TModel,
  TPreviewDocumentJson = Record<string, unknown>,
  TFrameTreeJson = Record<string, unknown>,
> {
  state: PreviewLayoutBridgeState<TPreviewDocumentJson, TFrameTreeJson>;
  init: (slug: string) => Promise<void>;
  getLocalRelayoutStatus: () => PreviewLocalRelayoutStatus;
  isLocalRelayoutReady: () => boolean;
  setLocalRelayoutOverrideMode: (mode: string | null | undefined) => PreviewLocalRelayoutStatus;
  getPreviewDocumentJson: () => TPreviewDocumentJson | null;
  getFrameTreeJson: () => TFrameTreeJson | null;
  setFrameTreeJson: (json: TFrameTreeJson | null) => void;
  getTextAdapter: () => TextMeasureAdapter | null;
  getLastElkSnapshot: () => ElkLayoutSnapshot | null;
  getLastElkFrameLabels: () => Record<string, string> | null;
  applyFrameTreeRemovals: (frameIds: string[]) => string[];
  performLocalRelayout: (
    model: TModel,
    overrides: Record<string, PreviewRelayoutOverrideEntry>,
    gridOverrides: Record<string, unknown>,
    opts?: PreviewLayoutBridgeLocalRelayoutOptions | null,
  ) => PreviewLayoutBridgeRelayoutResult | null;
  renderFreshSvg: (
    overrides: Record<string, PreviewRelayoutOverrideEntry>,
    gridOverrides: Record<string, unknown> | null,
    model: TModel,
  ) => Promise<PreviewLayoutBridgeRelayoutResult & { svg: SVGSVGElement }>;
  performElkRelayout: (
    model: TModel,
    overrides: Record<string, PreviewRelayoutOverrideEntry>,
    gridOverrides: Record<string, unknown>,
  ) => Promise<PreviewLayoutBridgeRelayoutResult | null>;
}

interface PreviewLayoutBridgeTreeNode {
  id?: string | null;
  role?: string | null;
  direction?: string | null;
  gap?: number | null;
  gapDelta?: number | null;
  border?: string | null;
  paddingTop?: number | null;
  paddingRight?: number | null;
  paddingBottom?: number | null;
  paddingLeft?: number | null;
  sizingW?: string | null;
  sizingH?: string | null;
  fillWeight?: number | null;
  minWidth?: number | null;
  maxWidth?: number | null;
  maxWidthChars?: number | null;
  minHeight?: number | null;
  maxHeight?: number | null;
  align?: string | null;
  level?: number | null;
  fill?: string | null;
  borderFill?: string | null;
  heading?: { content?: string | null } | null;
  label?: Array<{ content?: string | null }>;
  children: PreviewLayoutBridgeTreeNode[];
  _layout: {
    placedX: number;
    placedY: number;
    placedW: number;
    placedH: number;
  };
}

function clonePreviewLayoutBridgeValue<T>(value: T): T {
  if (value == null) {
    return value;
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

export function normalizePreviewLayoutBridgeLocalRelayoutOverrideMode(
  mode: string | null | undefined,
): PreviewLocalRelayoutOverrideMode {
  return mode === 'unready' ? 'unready' : 'auto';
}

export function createPreviewLayoutBridgeState<
  TPreviewDocumentJson = Record<string, unknown>,
  TFrameTreeJson = Record<string, unknown>,
>(): PreviewLayoutBridgeState<TPreviewDocumentJson, TFrameTreeJson> {
  return {
    previewDocumentJson: null,
    frameTreeJson: null,
    lastElkSnapshot: null,
    lastElkFrameLabels: null,
    textAdapter: null,
    textAdapterError: null,
    localRelayoutOverrideMode: 'auto',
  };
}

export function resolvePreviewLayoutBridgeLocalRelayoutStatus(
  state: PreviewLayoutBridgeState<unknown, unknown>,
  getTextAdapterBackend: (textAdapter: TextMeasureAdapter | null) => string | null,
): PreviewLocalRelayoutStatus {
  const overrideMode = normalizePreviewLayoutBridgeLocalRelayoutOverrideMode(
    state.localRelayoutOverrideMode,
  );
  const frameTreeLoaded = Boolean(state.frameTreeJson || state.previewDocumentJson);
  const textAdapterReady = Boolean(state.textAdapter);
  const textAdapterBackend = getTextAdapterBackend(state.textAdapter);
  const textAdapterError = state.textAdapterError;

  if (overrideMode === 'unready') {
    return {
      ready: false,
      reason: 'forced-unready',
      overrideMode,
      frameTreeLoaded,
      textAdapterReady,
      textAdapterBackend,
      textAdapterError,
    };
  }

  if (!frameTreeLoaded) {
    return {
      ready: false,
      reason: 'missing-frame-tree',
      overrideMode,
      frameTreeLoaded,
      textAdapterReady,
      textAdapterBackend,
      textAdapterError,
    };
  }

  if (textAdapterError) {
    return {
      ready: false,
      reason: 'text-adapter-init-failed',
      overrideMode,
      frameTreeLoaded,
      textAdapterReady,
      textAdapterBackend,
      textAdapterError,
    };
  }

  if (!textAdapterReady) {
    return {
      ready: false,
      reason: 'missing-text-adapter',
      overrideMode,
      frameTreeLoaded,
      textAdapterReady,
      textAdapterBackend,
      textAdapterError,
    };
  }

  if (textAdapterBackend !== 'harfbuzz') {
    return {
      ready: false,
      reason: 'non-harfbuzz-text-adapter',
      overrideMode,
      frameTreeLoaded,
      textAdapterReady,
      textAdapterBackend,
      textAdapterError,
    };
  }

  return {
    ready: true,
    reason: 'ready',
    overrideMode,
    frameTreeLoaded,
    textAdapterReady,
    textAdapterBackend,
    textAdapterError,
  };
}

export function applyFrameTreeRemovalsToPreviewTreeJson(
  treeJson: Record<string, unknown> | null | undefined,
  frameIds: string[] | null | undefined,
): string[] {
  const root = treeJson?.root as PreviewLayoutBridgeTreeNode | undefined;
  if (!root || !frameIds || frameIds.length === 0) {
    return [];
  }

  const rootId = typeof root.id === 'string' ? root.id : null;
  const requested = [...new Set(frameIds.filter((id) => Boolean(id) && id !== rootId))];
  if (requested.length === 0) {
    return [];
  }

  const removed = new Set<string>();

  const collectDescendants = (node: PreviewLayoutBridgeTreeNode | null | undefined): void => {
    if (!node) {
      return;
    }
    if (node.id) {
      removed.add(node.id);
    }
    for (const child of node.children || []) {
      collectDescendants(child);
    }
  };

  const findNode = (
    node: PreviewLayoutBridgeTreeNode | null | undefined,
    id: string,
  ): PreviewLayoutBridgeTreeNode | null => {
    if (!node) {
      return null;
    }
    if (node.id === id) {
      return node;
    }
    for (const child of node.children || []) {
      const hit = findNode(child, id);
      if (hit) {
        return hit;
      }
    }
    return null;
  };

  const pruneChildren = (
    children: PreviewLayoutBridgeTreeNode[] | null | undefined,
  ): PreviewLayoutBridgeTreeNode[] => {
    if (!Array.isArray(children)) {
      return [];
    }
    const next: PreviewLayoutBridgeTreeNode[] = [];
    for (const child of children) {
      if (!child || typeof child !== 'object') {
        continue;
      }
      if (child.id && requested.includes(child.id)) {
        collectDescendants(child);
        continue;
      }
      child.children = pruneChildren(child.children);
      next.push(child);
    }
    return next;
  };

  for (const id of requested) {
    const node = findNode(root, id);
    if (node) {
      collectDescendants(node);
    }
  }

  root.children = pruneChildren(root.children);

  const arrows = Array.isArray(treeJson?.arrows)
    ? (treeJson?.arrows as Array<{ source?: string; target?: string }>)
    : null;
  if (arrows) {
    (treeJson as { arrows: Array<{ source?: string; target?: string }> }).arrows = arrows.filter(
      (arrow) => arrow && !removed.has(String(arrow.source || '')) && !removed.has(String(arrow.target || '')),
    );
  }

  return [...removed];
}

export function applyPreviewSessionRemovalsToDiagramJson<TModel extends PreviewLayoutBridgeRemovalModel>(
  diagramJson: Record<string, unknown> | null | undefined,
  model: TModel | null | undefined,
): void {
  if (!diagramJson || !model?.removedIds || model.removedIds.size === 0) {
    return;
  }
  const topLevelIds = typeof model.topLevelRemovalIds === 'function'
    ? model.topLevelRemovalIds()
    : [...model.removedIds];
  applyFrameTreeRemovalsToPreviewTreeJson(diagramJson, topLevelIds);
}

function headingTextForPreviewFrame(frame: PreviewLayoutBridgeTreeNode): string {
  if (frame.heading?.content) {
    return frame.heading.content;
  }
  const headingChild = frame.children.find(
    (child) => child.role === 'heading' || Boolean(child.id && child.id.endsWith('__heading')),
  );
  return headingChild?.label?.[0]?.content || '';
}

function resolvePreviewAuthoredLayoutFrame(frame: PreviewLayoutBridgeTreeNode): {
  layoutChildren: PreviewLayoutBridgeTreeNode[];
  layoutGap: number;
  layoutDirection: string | null;
  layoutHeaderGap?: number | null;
} {
  if (!frame.children || frame.children.length === 0) {
    return {
      layoutChildren: [],
      layoutGap: 0,
      layoutDirection: frame.direction || null,
    };
  }

  const body = frame.children.find(
    (child) => child.id === '__body' || Boolean(child.id && child.id.endsWith('__body')),
  );
  const hasHeading = frame.children.some(
    (child) => child.role === 'heading' || Boolean(child.id && child.id.endsWith('__heading')),
  );
  if (body && hasHeading) {
    return {
      layoutChildren: body.children || [],
      layoutGap: body.gap || 0,
      layoutDirection: body.direction || null,
      layoutHeaderGap: frame.gap || 0,
    };
  }
  return {
    layoutChildren: frame.children.filter(
      (child) => !(child.id && child.id.endsWith('__body'))
        && !(child.id && child.id.endsWith('__heading'))
        && child.role !== 'heading',
    ),
    layoutGap: frame.gap || 0,
    layoutDirection: frame.direction || null,
    layoutHeaderGap: frame.gap || 0,
  };
}

export function updatePreviewComponentModelFromLayout<
  TModel extends PreviewLayoutBridgeModelTreeLoader,
>(
  model: TModel,
  frame: PreviewLayoutBridgeTreeNode,
): void {
  const frameToTreeData = (node: PreviewLayoutBridgeTreeNode): Record<string, unknown> | null => {
    if (!node.id || node.id.startsWith('__')) {
      return null;
    }
    const layout = node._layout;
    const { layoutChildren, layoutGap, layoutDirection, layoutHeaderGap } =
      resolvePreviewAuthoredLayoutFrame(node);
    const children = layoutChildren
      .map((child) => frameToTreeData(child))
      .filter((child): child is Record<string, unknown> => Boolean(child));
    const hasLayout = layoutChildren.length > 0;
    return {
      id: node.id,
      type: hasLayout || node.children.length > 0 ? 'panel' : 'box',
      x: layout.placedX,
      y: layout.placedY,
      width: layout.placedW,
      height: layout.placedH,
      children,
      layout: hasLayout
        ? (layoutDirection === 'VERTICAL' ? 'vertical' : 'horizontal')
        : '',
      layout_gap: hasLayout ? layoutGap : 0,
      layout_col_gap: hasLayout ? layoutGap : 0,
      layout_row_gap: hasLayout ? layoutGap : 0,
      layout_header_gap: hasLayout ? layoutHeaderGap || 0 : 0,
      gap_delta: node.gapDelta ?? undefined,
      pad: node.border !== 'NONE' ? node.paddingTop || 0 : 0,
      sizing_w: node.sizingW || null,
      sizing_h: node.sizingH || null,
      fill_weight: node.fillWeight ?? null,
      min_width: node.minWidth ?? null,
      max_width: node.maxWidth ?? null,
      max_width_chars: node.maxWidthChars ?? null,
      min_height: node.minHeight ?? null,
      max_height: node.maxHeight ?? null,
      align: node.align ?? null,
      padding_top: node.paddingTop ?? null,
      padding_right: node.paddingRight ?? null,
      padding_bottom: node.paddingBottom ?? null,
      padding_left: node.paddingLeft ?? null,
      level: node.level ?? null,
      fill: node.fill ?? null,
      border: node.border ?? null,
      heading_text: headingTextForPreviewFrame(node),
      label_text: Array.isArray(node.label)
        ? node.label.map((line) => line.content || '')
        : [],
    };
  };

  const rootData = frameToTreeData(frame);
  if (!rootData) {
    return;
  }

  if (frame.id && !frame.id.startsWith('__')) {
    model.loadTree([rootData]);
    return;
  }

  model.loadTree((rootData.children as unknown[]) || []);
}

export function createPreviewLayoutBridgeRuntime<
  TModel extends PreviewLayoutBridgeRemovalModel,
  TPreviewDocumentJson = Record<string, unknown>,
  TFrameTreeJson = Record<string, unknown>,
>(
  options: CreatePreviewLayoutBridgeRuntimeOptions<TModel, TPreviewDocumentJson, TFrameTreeJson>,
): PreviewLayoutBridgeRuntime<TModel, TPreviewDocumentJson, TFrameTreeJson> {
  const runtime: PreviewLayoutBridgeRuntime<TModel, TPreviewDocumentJson, TFrameTreeJson> = {
    state: options.state,
    async init(slug) {
      options.state.previewDocumentJson = null;
      options.state.frameTreeJson = null;
      options.state.textAdapter = null;
      options.state.textAdapterError = null;
      options.state.lastElkSnapshot = null;
      options.state.lastElkFrameLabels = null;

      try {
        const previewDocumentJson = await options.fetchPreviewDocument(slug);
        options.state.previewDocumentJson = clonePreviewLayoutBridgeValue(previewDocumentJson);
        options.state.frameTreeJson = clonePreviewLayoutBridgeValue(
          options.extractFrameTreeFromPreviewDocument(previewDocumentJson),
        );
      } catch (error) {
        options.warn('layout-bridge: failed to load preview document', error);
      }

      try {
        const textAdapter = await options.createTextAdapter();
        if (!options.isAuthoritativeTextAdapter(textAdapter)) {
          throw new Error(
            'layout-bridge requires a HarfBuzz text adapter, got '
            + String(options.getTextAdapterBackend(textAdapter) || 'unknown'),
          );
        }
        options.state.textAdapter = textAdapter;
      } catch (error) {
        options.state.textAdapter = null;
        options.state.textAdapterError = error instanceof Error ? error.message : String(error);
        options.error('layout-bridge: failed to initialize HarfBuzz text adapter', error);
      }
    },
    getLocalRelayoutStatus() {
      return resolvePreviewLayoutBridgeLocalRelayoutStatus(
        options.state,
        options.getTextAdapterBackend,
      );
    },
    isLocalRelayoutReady() {
      return runtime.getLocalRelayoutStatus().ready;
    },
    setLocalRelayoutOverrideMode(mode) {
      options.state.localRelayoutOverrideMode =
        normalizePreviewLayoutBridgeLocalRelayoutOverrideMode(mode);
      return runtime.getLocalRelayoutStatus();
    },
    getPreviewDocumentJson() {
      return clonePreviewLayoutBridgeValue(options.state.previewDocumentJson);
    },
    getFrameTreeJson() {
      return clonePreviewLayoutBridgeValue(options.state.frameTreeJson);
    },
    setFrameTreeJson(json) {
      options.state.frameTreeJson = clonePreviewLayoutBridgeValue(json);
    },
    getTextAdapter() {
      return options.state.textAdapter;
    },
    getLastElkSnapshot() {
      return options.state.lastElkSnapshot;
    },
    getLastElkFrameLabels() {
      return options.state.lastElkFrameLabels
        ? { ...options.state.lastElkFrameLabels }
        : null;
    },
    applyFrameTreeRemovals(frameIds) {
      if (!options.state.frameTreeJson) {
        return [];
      }
      return applyFrameTreeRemovalsToPreviewTreeJson(
        options.state.frameTreeJson as Record<string, unknown>,
        frameIds,
      );
    },
    performLocalRelayout(model, overrides, gridOverrides, relayoutOptions) {
      const readiness = runtime.getLocalRelayoutStatus();
      if (!readiness.ready) {
        options.warn(`layout-bridge: not ready (${readiness.reason})`);
        return null;
      }

      if (!options.state.frameTreeJson || !options.state.textAdapter) {
        options.warn('layout-bridge: missing frame tree or text adapter');
        return null;
      }

      try {
        const diagramJson = clonePreviewLayoutBridgeValue(
          options.state.frameTreeJson,
        ) as Record<string, unknown>;
        applyPreviewSessionRemovalsToDiagramJson(diagramJson, model);
        if (options.isElkLayeredDiagramJson(diagramJson)) {
          options.warn('layout-bridge: performLocalRelayout skipped for elk-layered diagram');
          return null;
        }

        const diagram = options.deserializeFrameDiagram(diagramJson);
        const allFrameOverrides = options.collectRelayoutFrameOverrides(overrides || {});
        options.applyOverridesToFrameTree(diagram, allFrameOverrides, gridOverrides || {});

        const oldBounds: Record<string, PreviewLayoutBridgeOldBoundsEntry> = {};
        const modelIds = (model as { allIds?: Iterable<string> }).allIds;
        const getModelNode = (model as { get?: (id: string) => { data?: Record<string, number> } | null }).get;
        if (modelIds && typeof getModelNode === 'function') {
          for (const id of modelIds) {
            const node = getModelNode(id);
            if (node?.data) {
              oldBounds[id] = {
                x: Number(node.data.x || 0),
                y: Number(node.data.y || 0),
                w: Number(node.data.width || 0),
                h: Number(node.data.height || 0),
              };
            }
          }
        }

        const result = options.layoutLocalDiagram(diagram, options.state.textAdapter);
        const newBounds = options.collectPlacedBounds(diagram.root);
        const framesById = options.collectFramesById(diagram.root);
        options.patchSvgFromLayout({
          svg: options.queryStageSvg(),
          oldBounds,
          newBounds,
          framesById,
        });

        let routedArrows: PreviewRoutedArrow[] = [];
        if (diagram.arrows.length > 0) {
          routedArrows = options.routeArrows(diagram.arrows, newBounds);
          options.patchArrowsSvg({
            svg: options.queryStageSvg(),
            routedArrows,
            boundsMap: newBounds,
          });
        }

        if (!relayoutOptions?.skipModelUpdate) {
          options.updateModelFromLayout(model, diagram.root);
          options.syncArrowsInModel(model, diagram.arrows, routedArrows);
        }

        return {
          coerced: result.coerced,
          width: result.width,
          height: result.height,
        };
      } catch (error) {
        options.error('layout-bridge: local relayout failed', error);
        return null;
      }
    },
    async renderFreshSvg(overrides, gridOverrides, model) {
      if (!options.state.textAdapter) {
        throw new Error('layout-bridge: renderFreshSvg requires an initialized text adapter');
      }
      const renderResult = await options.renderFreshPreviewSvg({
        ownerDocument: options.ownerDocument,
        previewDocumentJson: options.state.previewDocumentJson,
        frameTreeJson: options.state.frameTreeJson,
        overrides: overrides || {},
        gridOverrides: gridOverrides || null,
        model,
        textAdapter: options.state.textAdapter,
        applySessionRemovalsToDiagramJson: (diagramJson, nextModel) => {
          applyPreviewSessionRemovalsToDiagramJson(diagramJson, nextModel);
        },
        applyOverridesToFrameTree: options.applyOverridesToFrameTree,
        collectRelayoutFrameOverrides: options.collectRelayoutFrameOverrides,
        isElkLayeredDiagramJson: options.isElkLayeredDiagramJson,
        resolveElkOptionOverrides: options.resolveElkOptionOverrides,
        updateModelFromLayout: options.updateModelFromLayout,
        syncArrowsInModel: options.syncArrowsInModel,
      });
      options.state.lastElkSnapshot = renderResult.elkSnapshot || null;
      options.state.lastElkFrameLabels = renderResult.elkFrameLabels || null;
      options.refreshElkViewMode();
      return {
        svg: renderResult.svg,
        width: renderResult.width,
        height: renderResult.height,
        coerced: renderResult.coerced,
      };
    },
    async performElkRelayout(model, overrides, gridOverrides) {
      const readiness = runtime.getLocalRelayoutStatus();
      if (!readiness.ready) {
        options.warn(`layout-bridge: not ready (${readiness.reason})`);
        return null;
      }

      try {
        const renderResult = await runtime.renderFreshSvg(
          overrides,
          gridOverrides && Object.keys(gridOverrides).length > 0 ? gridOverrides : null,
          model,
        );
        const stage = options.getStageContainer();
        if (!stage) {
          return null;
        }
        stage.replaceChildren(renderResult.svg);
        options.fitRenderedSvg(renderResult.svg, {
          minWidth: renderResult.width,
          minHeight: renderResult.height,
        });
        return {
          coerced: renderResult.coerced,
          width: renderResult.width,
          height: renderResult.height,
        };
      } catch (error) {
        options.error('layout-bridge: ELK relayout failed', error);
        return null;
      }
    },
  };

  return runtime;
}
