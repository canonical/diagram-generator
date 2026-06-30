import {
  type ElkLayoutSnapshot,
} from '../elk-layout.js';
import { deserializeFrameDiagramWire } from '../frame-serialize.js';
import {
  type Arrow,
  type DiagramOverlay,
  type Frame,
  type FrameDiagram,
} from '../frame-model.js';
import { type LayoutOutput } from '../layout.js';
import {
  type PreviewRenderableDocument,
  layoutPreviewFrameDiagramForEngine,
  renderPreviewDocumentToSvg,
  type PreviewFrameLayoutResult,
  type PreviewEngineManifest,
  resolvePreviewEngine,
  summarizeFrameDiagramCompatibility,
} from '../preview-engine/index.js';
import {
  resolveEffectiveLayoutOperatorOverrides,
} from './layout-operator-overrides.js';
import { type TextMeasureAdapter } from '../text-measure.js';
import {
  routePreviewArrows,
  type PreviewRoutedArrow,
} from './app-arrow-render.js';
import { appendPreviewDisplayListItems } from './app-display-list-dom.js';
import {
  invalidatePreviewArrowWaypointGeometry,
  shouldInvalidatePreviewArrowWaypointGeometry,
} from './preview-arrow-reroute-invalidation.js';
import {
  applyPreviewRenderIntentToFrameTreeJson,
  resolvePreviewRenderIntentLayoutEngine,
  type PreviewRenderIntent,
} from './preview-render-intent.js';
import {
  collectPreviewPlacedBounds,
} from './app-frame-svg.js';
import { emitFrameDiagramDisplayList } from '../render-adapter/display-list.js';
import { recolorIconElementShapes } from '../icon-markup.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICON_CACHE = new Map<string, string | null>();

type PreviewLayoutResult = PreviewFrameLayoutResult | LayoutOutput;

export interface RenderPreviewFrameTreeToSvgOptions {
  ownerDocument: Document;
  diagram: FrameDiagram;
  result: PreviewLayoutResult;
  textAdapter: TextMeasureAdapter;
  iconElements?: Map<string, Element> | null;
  overlays?: DiagramOverlay[] | null;
}

export interface FreshPreviewDocument extends PreviewRenderableDocument {}

export interface RenderFreshPreviewSvgOptions<TModel = unknown> {
  ownerDocument: Document;
  previewDocumentJson?: FreshPreviewDocument | null;
  frameTreeJson: Record<string, unknown> | null;
  overrides?: Record<string, unknown> | null;
  gridOverrides?: Record<string, unknown> | null;
  renderIntent?: PreviewRenderIntent | null;
  model: TModel;
  textAdapter: TextMeasureAdapter;
  skipModelUpdate?: boolean | null;
  applySessionRemovalsToDiagramJson?: ((diagramJson: Record<string, unknown>, model: TModel) => void) | null;
  applyOverridesToFrameTree: (
    diagram: FrameDiagram,
    allOverrides: Record<string, unknown>,
    gridOverrides?: Record<string, unknown> | null,
  ) => void;
  collectRelayoutFrameOverrides: (overrides: Record<string, unknown>) => Record<string, unknown>;
  /** @deprecated Render-family resolution now uses the preview-engine manifest. */
  isEngineLayoutDiagramJson?: (diagramJson: Record<string, unknown>) => boolean;
  resolveEngineLayoutOptionOverrides: (
    diagram: FrameDiagram,
    model: TModel,
  ) => Record<string, string>;
  updateModelFromLayout: (model: TModel, root: Frame) => void;
  syncArrowsInModel: (model: TModel, arrows: Arrow[], routedArrows: PreviewRoutedArrow[]) => void;
}

export interface FreshPreviewSvgRenderResult<TSvg = SVGSVGElement> {
  svg: TSvg;
  width: number;
  height: number;
  coerced: PreviewLayoutResult['coerced'];
  elkSnapshot: ElkLayoutSnapshot | null;
  elkFrameLabels: Record<string, string> | null;
}

function headingTextForFrame(frame: Frame): string {
  if (frame.heading?.content) {
    return frame.heading.content;
  }
  const headingChild = frame.children.find(
    (child) => child.role === 'heading' || Boolean(child.id && child.id.endsWith('__heading')),
  );
  return headingChild?.label[0]?.content || '';
}

function collectElkFrameLabels(frame: Frame): Record<string, string> {
  const map: Record<string, string> = {};

  const walk = (node: Frame): void => {
    if (node.id && !node.id.startsWith('__')) {
      const lines: string[] = [];
      const heading = headingTextForFrame(node);
      if (heading) {
        lines.push(heading);
      }
      for (const line of node.label) {
        if (line.content) {
          lines.push(line.content);
        }
      }
      map[node.id] = lines.length > 0 ? lines.join('\n') : node.id;
    }
    for (const child of node.children) {
      walk(child);
    }
  };

  walk(frame);
  return map;
}

function parseMarkupDocument(ownerDocument: Document, markup: string): SVGSVGElement {
  const parserCtor = ownerDocument.defaultView?.DOMParser ?? globalThis.DOMParser;
  if (!parserCtor) {
    throw new Error('renderFreshPreviewSvg: DOMParser is unavailable');
  }
  const parser = new parserCtor();
  const parsed = parser.parseFromString(markup, 'image/svg+xml');
  return ownerDocument.importNode(parsed.documentElement, true) as unknown as SVGSVGElement;
}

export function filterPreviewEngineLayoutOptionOverrides(
  overrides: Record<string, string> | null | undefined,
  engine: Pick<PreviewEngineManifest, 'controlSpecs'> | null | undefined,
): Record<string, string> {
  if (!overrides) {
    return {};
  }
  if (!engine) {
    return { ...overrides };
  }
  return resolveEffectiveLayoutOperatorOverrides({
    manifest: {
      id: 'active-preview-engine',
      controlSpecs: engine.controlSpecs ?? [],
    },
    sessionOverrides: overrides,
  }) as Record<string, string>;
}

async function fetchPreviewIconSvg(name: string): Promise<string | null> {
  if (ICON_CACHE.has(name)) {
    return ICON_CACHE.get(name) ?? null;
  }
  try {
    const response = await fetch(`/api/icon/${encodeURIComponent(name)}`);
    if (!response.ok) {
      ICON_CACHE.set(name, null);
      return null;
    }
    const markup = await response.text();
    ICON_CACHE.set(name, markup);
    return markup;
  } catch {
    ICON_CACHE.set(name, null);
    return null;
  }
}

function buildPreviewIconElement(
  ownerDocument: Document,
  svgContent: string,
  fill: string | null | undefined,
): Element | null {
  const parserCtor = ownerDocument.defaultView?.DOMParser ?? globalThis.DOMParser;
  if (!parserCtor) {
    return null;
  }
  const parser = new parserCtor();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');
  const svgRoot = doc.documentElement;
  const group = ownerDocument.createElementNS(SVG_NS, 'g');
  group.setAttribute('class', 'dg-icon');
  for (const child of Array.from(svgRoot.childNodes)) {
    group.appendChild(ownerDocument.importNode(child, true));
  }
  if (fill) {
    group.querySelectorAll('path, circle, rect, polygon, ellipse').forEach((element) => {
      element.setAttribute('fill', fill);
    });
  }
  return group;
}

async function collectPreviewIconElements(
  ownerDocument: Document,
  root: Frame,
): Promise<Map<string, Element>> {
  const iconNames = new Set<string>();
  const collectIcons = (frame: Frame): void => {
    if (frame.icon) {
      iconNames.add(frame.icon);
    }
    for (const child of frame.children) {
      collectIcons(child);
    }
  };
  collectIcons(root);

  const iconElements = new Map<string, Element>();
  const entries = await Promise.all(
    Array.from(iconNames).map(async (name) => {
      const svgContent = await fetchPreviewIconSvg(name);
      if (!svgContent) {
        return [name, null] as const;
      }
      return [name, buildPreviewIconElement(ownerDocument, svgContent, null)] as const;
    }),
  );

  for (const [name, element] of entries) {
    if (element) {
      iconElements.set(name, element);
    }
  }
  return iconElements;
}

function collectFrameIconElementsByComponentId(
  root: Frame,
  iconElementsByName: Map<string, Element> | null | undefined,
): Map<string, Element> {
  const result = new Map<string, Element>();
  if (!iconElementsByName) {
    return result;
  }

  const walk = (frame: Frame): void => {
    if (frame.id && frame.icon && iconElementsByName.has(frame.icon)) {
      const icon = iconElementsByName.get(frame.icon)!.cloneNode(true) as Element;
      const iconFill = frame.resolvedIconFill ?? frame.iconFill ?? '#000000';
      recolorIconElementShapes(icon, iconFill);
      result.set(frame.id, icon);
    }
    for (const child of frame.children) {
      walk(child);
    }
  };

  walk(root);
  return result;
}

export function renderPreviewFrameTreeToSvg(
  options: RenderPreviewFrameTreeToSvgOptions,
): SVGSVGElement {
  const width = options.result.width || 400;
  const height = options.result.height || 200;
  const iconElements = options.iconElements ?? new Map<string, Element>();
  const svg = options.ownerDocument.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('xml:space', 'preserve');

  const background = options.ownerDocument.createElementNS(SVG_NS, 'rect');
  background.setAttribute('width', String(width));
  background.setAttribute('height', String(height));
  background.setAttribute('fill', '#FFFFFF');
  svg.appendChild(background);

  const styledLayer = options.ownerDocument.createElementNS(SVG_NS, 'g');
  styledLayer.id = 'dg-styled-layer';
  svg.appendChild(styledLayer);
  // Paint order (back to front): frames, then arrows, then overlays. Arrows must
  // sit above frame fills so a connector into a nested box stays visible where it
  // crosses opaque container backgrounds (matches DisplayListLayer ordering).
  const frameLayer = options.ownerDocument.createElementNS(SVG_NS, 'g');
  frameLayer.id = 'dg-frame-layer';
  styledLayer.appendChild(frameLayer);
  const arrowLayer = options.ownerDocument.createElementNS(SVG_NS, 'g');
  arrowLayer.id = 'dg-arrow-layer';
  styledLayer.appendChild(arrowLayer);
  const overlayLayer = options.ownerDocument.createElementNS(SVG_NS, 'g');
  overlayLayer.id = 'dg-overlay-layer';
  styledLayer.appendChild(overlayLayer);

  if (!options.diagram.root) {
    return svg;
  }
  const diagramForDisplay = options.overlays
    ? ({ ...options.diagram, overlays: options.overlays } as FrameDiagram)
    : options.diagram;
  const frameIconsByComponentId = collectFrameIconElementsByComponentId(
    diagramForDisplay.root,
    iconElements,
  );
  const displayList = emitFrameDiagramDisplayList(
    diagramForDisplay,
    options.result,
    options.textAdapter,
    { includeLayers: ['frame', 'overlay', 'arrow'], previewElkLabels: true },
  );
  appendPreviewDisplayListItems({
    ownerDocument: options.ownerDocument,
    parent: arrowLayer,
    items: displayList.items,
    allowedLayers: ['arrow'],
  });
  appendPreviewDisplayListItems({
    ownerDocument: options.ownerDocument,
    parent: frameLayer,
    items: displayList.items,
    allowedLayers: ['frame'],
    frameIconsByComponentId,
  });
  appendPreviewDisplayListItems({
    ownerDocument: options.ownerDocument,
    parent: overlayLayer,
    items: displayList.items,
    allowedLayers: ['overlay'],
  });

  return svg;
}

export async function renderFreshPreviewSvg<TModel = unknown>(
  options: RenderFreshPreviewSvgOptions<TModel>,
): Promise<FreshPreviewSvgRenderResult> {
  const renderedPreviewDocument = options.previewDocumentJson
    ? await renderPreviewDocumentToSvg(options.previewDocumentJson)
    : null;
  if (renderedPreviewDocument) {
    const svg = parseMarkupDocument(options.ownerDocument, renderedPreviewDocument.svgMarkup);
    const previewDocumentLayoutEngine = resolvePreviewRenderIntentLayoutEngine({
      intent: options.renderIntent ?? null,
      layoutEngine: options.previewDocumentJson?.layoutEngine ?? null,
      fallbackEngineId: options.previewDocumentJson?.kind === 'sequence' ? 'sequence' : null,
    });
    if (previewDocumentLayoutEngine) {
      svg.setAttribute('data-layout-engine', previewDocumentLayoutEngine);
    }
    return {
      svg,
      width: renderedPreviewDocument.width,
      height: renderedPreviewDocument.height,
      coerced: new Map(),
      elkSnapshot: null,
      elkFrameLabels: null,
    };
  }

  if (!options.frameTreeJson) {
    throw new Error('renderFreshPreviewSvg: frameTreeJson is unavailable');
  }

  const diagramJson = JSON.parse(JSON.stringify(options.frameTreeJson)) as Record<string, unknown>;
  applyPreviewRenderIntentToFrameTreeJson(diagramJson, options.renderIntent ?? null);
  options.applySessionRemovalsToDiagramJson?.(diagramJson, options.model);
  const rawOverlays = Array.isArray(diagramJson.overlays)
    ? (diagramJson.overlays as DiagramOverlay[])
    : [];
  const diagram = deserializeFrameDiagramWire(diagramJson);
  const allFrameOverrides = options.collectRelayoutFrameOverrides(options.overrides || {});
  options.applyOverridesToFrameTree(diagram, allFrameOverrides, options.gridOverrides || {});
  if (shouldInvalidatePreviewArrowWaypointGeometry(allFrameOverrides)) {
    invalidatePreviewArrowWaypointGeometry(diagram.arrows);
  }

  const activeLayoutEngine = resolvePreviewRenderIntentLayoutEngine({
    intent: options.renderIntent ?? null,
    frameTreeJson: diagramJson as { layoutEngine?: string | null },
    layoutEngine: diagram.layoutEngine ?? null,
  });
  const engineManifest = resolvePreviewEngine({
    layoutEngine: activeLayoutEngine,
    shellMode: 'grid',
    previewDocumentKind: 'frame-diagram',
    frameDiagramSummary: summarizeFrameDiagramCompatibility(diagram),
  });
  const result = await layoutPreviewFrameDiagramForEngine({
    diagram,
    textAdapter: options.textAdapter,
    engine: engineManifest,
    elkOptionOverrides: filterPreviewEngineLayoutOptionOverrides(
      options.resolveEngineLayoutOptionOverrides(diagram, options.model),
      engineManifest,
    ),
  });

  const iconElements = await collectPreviewIconElements(options.ownerDocument, diagram.root);
  const svg = renderPreviewFrameTreeToSvg({
    ownerDocument: options.ownerDocument,
    diagram,
    result,
    textAdapter: options.textAdapter,
    iconElements,
    overlays: rawOverlays,
  });
  const renderedLayoutEngine = engineManifest?.layoutEngineKey
    ?? engineManifest?.id
    ?? 'v3';
  if (renderedLayoutEngine) {
    svg.setAttribute('data-layout-engine', renderedLayoutEngine);
  }

  if (!options.skipModelUpdate) {
    options.updateModelFromLayout(options.model, diagram.root);
    const boundsMap = collectPreviewPlacedBounds(diagram.root);
    const routedArrows = diagram.arrows.length > 0
      ? routePreviewArrows(diagram.arrows, boundsMap)
      : [];
    options.syncArrowsInModel(options.model, diagram.arrows, routedArrows);
  }

  return {
    svg,
    width: result.width,
    height: result.height,
    coerced: result.coerced,
    elkSnapshot: 'elkSnapshot' in result ? result.elkSnapshot ?? null : null,
    elkFrameLabels: 'elkSnapshot' in result && result.elkSnapshot ? collectElkFrameLabels(diagram.root) : null,
  };
}
