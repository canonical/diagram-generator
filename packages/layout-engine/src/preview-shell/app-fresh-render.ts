import {
  layoutElkFrameDiagram,
  type ElkLayoutOptions,
  type ElkLayoutOutput,
  type ElkLayoutSnapshot,
} from '../elk-layout.js';
import { deserializeFrameDiagramWire } from '../frame-serialize.js';
import {
  type Arrow,
  type DiagramOverlay,
  type Frame,
  type FrameDiagram,
} from '../frame-model.js';
import { layoutFrameTree, type LayoutOutput } from '../layout.js';
import { resolveStyles } from '../resolve-styles.js';
import { layoutSequenceDiagram } from '../sequence-layout/layout.js';
import { renderSequenceDiagramToSvg } from '../sequence-layout/render-svg.js';
import { type TextMeasureAdapter } from '../text-measure.js';
import {
  createPreviewArrowSvgFragment,
  routePreviewArrows,
  type PreviewArrowBoundsMap,
  type PreviewArrowFrameBounds,
  type PreviewRoutedArrow,
} from './app-arrow-render.js';
import {
  collectPreviewPlacedBounds,
  patchPreviewFrameGroup,
} from './app-frame-svg.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const OVERLAY_PAD = 8;
const ICON_CACHE = new Map<string, string | null>();

type PreviewLayoutResult = LayoutOutput | ElkLayoutOutput;

export interface RenderPreviewFrameTreeToSvgOptions {
  ownerDocument: Document;
  diagram: FrameDiagram;
  result: PreviewLayoutResult;
  textAdapter: TextMeasureAdapter;
  iconElements?: Map<string, Element> | null;
  overlays?: DiagramOverlay[] | null;
}

export interface FreshPreviewDocument {
  kind?: string | null;
  title?: string | null;
  sequence?: Parameters<typeof layoutSequenceDiagram>[0];
}

export interface RenderFreshPreviewSvgOptions<TModel = unknown> {
  ownerDocument: Document;
  previewDocumentJson?: FreshPreviewDocument | null;
  frameTreeJson: Record<string, unknown> | null;
  overrides?: Record<string, unknown> | null;
  gridOverrides?: Record<string, unknown> | null;
  model: TModel;
  textAdapter: TextMeasureAdapter;
  applySessionRemovalsToDiagramJson?: ((diagramJson: Record<string, unknown>, model: TModel) => void) | null;
  applyOverridesToFrameTree: (
    diagram: FrameDiagram,
    allOverrides: Record<string, unknown>,
    gridOverrides?: Record<string, unknown> | null,
  ) => void;
  collectRelayoutFrameOverrides: (overrides: Record<string, unknown>) => Record<string, unknown>;
  isEngineLayoutDiagramJson: (diagramJson: Record<string, unknown>) => boolean;
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

function fmtSvgNumber(value: number): string {
  return String(Math.round(value * 100) / 100);
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

function renderOverlaysSvg(
  ownerDocument: Document,
  overlays: DiagramOverlay[],
  boundsMap: PreviewArrowBoundsMap,
): DocumentFragment {
  const fragment = ownerDocument.createDocumentFragment();
  for (const overlay of overlays) {
    const memberBounds = overlay.members
      .map((memberId) => boundsMap[memberId])
      .filter((member): member is PreviewArrowFrameBounds => Boolean(member));
    if (memberBounds.length === 0) {
      continue;
    }

    const minX = Math.min(...memberBounds.map((bounds) => bounds.x));
    const minY = Math.min(...memberBounds.map((bounds) => bounds.y));
    const maxX = Math.max(...memberBounds.map((bounds) => bounds.x + bounds.w));
    const maxY = Math.max(...memberBounds.map((bounds) => bounds.y + bounds.h));

    const group = ownerDocument.createElementNS(SVG_NS, 'g');
    if (overlay.id) {
      group.setAttribute('data-component-id', overlay.id);
    }

    const rect = ownerDocument.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', fmtSvgNumber(minX - OVERLAY_PAD));
    rect.setAttribute('y', fmtSvgNumber(minY - OVERLAY_PAD));
    rect.setAttribute('width', fmtSvgNumber(maxX - minX + OVERLAY_PAD * 2));
    rect.setAttribute('height', fmtSvgNumber(maxY - minY + OVERLAY_PAD * 2));
    rect.setAttribute('fill', 'transparent');
    rect.setAttribute('stroke', '#000000');
    rect.setAttribute('stroke-width', '1');
    rect.setAttribute('stroke-dasharray', '2 4');
    group.appendChild(rect);

    if (overlay.label) {
      const text = ownerDocument.createElementNS(SVG_NS, 'text');
      text.setAttribute('font-family', 'Ubuntu Sans');
      text.setAttribute('font-size', '14');
      text.setAttribute('font-weight', '400');
      text.setAttribute('fill', '#000000');
      const tspan = ownerDocument.createElementNS(SVG_NS, 'tspan');
      tspan.setAttribute('x', fmtSvgNumber(minX));
      tspan.setAttribute('y', fmtSvgNumber(minY - 12));
      tspan.textContent = overlay.label;
      text.appendChild(tspan);
      group.appendChild(text);
    }

    fragment.appendChild(group);
  }
  return fragment;
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

function layoutOptionsFromDiagram(diagram: FrameDiagram) {
  return {
    gridCols: diagram.gridCols,
    gridColGap: diagram.gridColGap,
    gridOuterMargin: diagram.gridOuterMargin,
    arrows: diagram.arrows,
  };
}

export function renderPreviewFrameTreeToSvg(
  options: RenderPreviewFrameTreeToSvgOptions,
): SVGSVGElement {
  const width = options.result.width || 400;
  const height = options.result.height || 200;
  const iconElements = options.iconElements ?? new Map<string, Element>();
  const overlays = options.overlays ?? [];
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
  const arrowLayer = options.ownerDocument.createElementNS(SVG_NS, 'g');
  arrowLayer.id = 'dg-arrow-layer';
  styledLayer.appendChild(arrowLayer);
  const frameLayer = options.ownerDocument.createElementNS(SVG_NS, 'g');
  frameLayer.id = 'dg-frame-layer';
  styledLayer.appendChild(frameLayer);
  const overlayLayer = options.ownerDocument.createElementNS(SVG_NS, 'g');
  overlayLayer.id = 'dg-overlay-layer';
  styledLayer.appendChild(overlayLayer);

  if (!options.diagram.root) {
    return svg;
  }

  const renderFrame = (frame: Frame): void => {
    const group = options.ownerDocument.createElementNS(SVG_NS, 'g');
    if (frame.id) {
      group.setAttribute('data-component-id', frame.id);
    }

    let iconElement: Element | null = null;
    if (frame.icon && iconElements.has(frame.icon)) {
      iconElement = iconElements.get(frame.icon)!.cloneNode(true) as Element;
      const iconFill = frame.resolvedIconFill ?? frame.iconFill ?? '#000000';
      iconElement.querySelectorAll('path, circle, rect, polygon, ellipse').forEach((element) => {
        element.setAttribute('fill', iconFill);
      });
    }

    patchPreviewFrameGroup({
      ownerDocument: options.ownerDocument,
      group,
      frame,
      textAdapter: options.textAdapter,
      iconElement,
    });
    frameLayer.appendChild(group);

    for (const child of frame.children) {
      renderFrame(child);
    }
  };

  renderFrame(options.diagram.root);

  if (options.diagram.arrows.length > 0) {
    const boundsMap = collectPreviewPlacedBounds(options.diagram.root);
    arrowLayer.appendChild(createPreviewArrowSvgFragment({
      ownerDocument: options.ownerDocument,
      routedArrows: routePreviewArrows(options.diagram.arrows, boundsMap),
      boundsMap,
    }));
  }

  if (overlays.length > 0) {
    const boundsMap = collectPreviewPlacedBounds(options.diagram.root);
    overlayLayer.appendChild(renderOverlaysSvg(options.ownerDocument, overlays, boundsMap));
  }

  return svg;
}

export async function renderFreshPreviewSvg<TModel = unknown>(
  options: RenderFreshPreviewSvgOptions<TModel>,
): Promise<FreshPreviewSvgRenderResult> {
  if (options.previewDocumentJson?.kind === 'sequence' && options.previewDocumentJson.sequence) {
    const layout = layoutSequenceDiagram(options.previewDocumentJson.sequence);
    const svgMarkup = renderSequenceDiagramToSvg(
      options.previewDocumentJson.sequence,
      layout,
      { title: options.previewDocumentJson.title || 'Sequence diagram' },
    );
    return {
      svg: parseMarkupDocument(options.ownerDocument, svgMarkup),
      width: layout.width,
      height: layout.height,
      coerced: new Map(),
      elkSnapshot: null,
      elkFrameLabels: null,
    };
  }

  if (!options.frameTreeJson) {
    throw new Error('renderFreshPreviewSvg: frameTreeJson is unavailable');
  }

  const diagramJson = JSON.parse(JSON.stringify(options.frameTreeJson)) as Record<string, unknown>;
  options.applySessionRemovalsToDiagramJson?.(diagramJson, options.model);
  const rawOverlays = Array.isArray(diagramJson.overlays)
    ? (diagramJson.overlays as DiagramOverlay[])
    : [];
  const diagram = deserializeFrameDiagramWire(diagramJson);
  const allFrameOverrides = options.collectRelayoutFrameOverrides(options.overrides || {});
  options.applyOverridesToFrameTree(diagram, allFrameOverrides, options.gridOverrides || {});

  let result: PreviewLayoutResult;
  if (options.isEngineLayoutDiagramJson(diagramJson)) {
    result = await layoutElkFrameDiagram(diagram, options.textAdapter, {
      diagramType: diagram.diagramType as ElkLayoutOptions['diagramType'],
      elkOptionOverrides: options.resolveEngineLayoutOptionOverrides(diagram, options.model),
    });
  } else {
    resolveStyles(diagram.root);
    result = layoutFrameTree(diagram.root, options.textAdapter, layoutOptionsFromDiagram(diagram));
  }

  const iconElements = await collectPreviewIconElements(options.ownerDocument, diagram.root);
  const svg = renderPreviewFrameTreeToSvg({
    ownerDocument: options.ownerDocument,
    diagram,
    result,
    textAdapter: options.textAdapter,
    iconElements,
    overlays: rawOverlays,
  });

  options.updateModelFromLayout(options.model, diagram.root);
  const boundsMap = collectPreviewPlacedBounds(diagram.root);
  const routedArrows = diagram.arrows.length > 0 ? routePreviewArrows(diagram.arrows, boundsMap) : [];
  options.syncArrowsInModel(options.model, diagram.arrows, routedArrows);

  return {
    svg,
    width: result.width,
    height: result.height,
    coerced: result.coerced,
    elkSnapshot: 'elkSnapshot' in result ? result.elkSnapshot ?? null : null,
    elkFrameLabels: 'elkSnapshot' in result && result.elkSnapshot ? collectElkFrameLabels(diagram.root) : null,
  };
}
