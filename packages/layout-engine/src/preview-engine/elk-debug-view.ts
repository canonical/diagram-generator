import type { PlacedNode } from '@diagram-generator/graph-layout-core';

import { resolveArrowheadGeometry } from '../arrow-geometry.js';
import type { ElkLayoutSnapshot } from '../elk-layout.js';

const DEFAULT_SVG_NS = 'http://www.w3.org/2000/svg';

function fmtSvgNumber(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function formatArrowPolygonPoints(points: readonly [number, number][]): string {
  return points
    .map(([x, y]) => `${fmtSvgNumber(x)},${fmtSvgNumber(y)}`)
    .join(' ');
}

function walkPlacedNodesAbsolute(
  nodes: PlacedNode[] | undefined,
  visit: (node: PlacedNode) => void,
): void {
  if (!nodes) return;
  for (const node of nodes) {
    visit(node);
    const children = node.children ?? [];
    if (children.length > 0) {
      walkPlacedNodesAbsolute(children, visit);
    }
  }
}

function attachElkDebugPayload(
  group: SVGGElement,
  snapshot: ElkLayoutSnapshot,
): void {
  if (!snapshot.debug) {
    return;
  }
  group.setAttribute('data-dg-elk-authored-tree', JSON.stringify(snapshot.debug.authoredTree));
  group.setAttribute('data-dg-elk-input-graph', JSON.stringify(snapshot.debug.inputGraph));
}

function countAuthoredTreeNodes(node: NonNullable<ElkLayoutSnapshot['debug']>['authoredTree']): number {
  return 1 + node.children.reduce((sum, child) => sum + countAuthoredTreeNodes(child), 0);
}

export interface RenderPreviewElkOverlayOptions {
  ownerDocument: Document;
  snapshot: ElkLayoutSnapshot;
  svgNs?: string;
}

export interface RenderPreviewElkRawViewOptions extends RenderPreviewElkOverlayOptions {
  labelMap?: Record<string, string> | null;
  headLen?: number;
  headHalf?: number;
}

export function renderPreviewElkDebugOverlay(
  options: RenderPreviewElkOverlayOptions,
): SVGGElement {
  const svgNs = options.svgNs ?? DEFAULT_SVG_NS;
  const group = options.ownerDocument.createElementNS(svgNs, 'g') as SVGGElement;
  group.id = 'dg-elk-debug-overlay';
  group.setAttribute('pointer-events', 'none');
  attachElkDebugPayload(group, options.snapshot);

  const originX = options.snapshot.originX || 0;
  const originY = options.snapshot.originY || 0;

  walkPlacedNodesAbsolute(options.snapshot.nodes, (node) => {
    const x = node.x + originX;
    const y = node.y + originY;
    const children = node.children ?? [];

    const rect = options.ownerDocument.createElementNS(svgNs, 'rect');
    rect.setAttribute('x', fmtSvgNumber(x));
    rect.setAttribute('y', fmtSvgNumber(y));
    rect.setAttribute('width', fmtSvgNumber(node.width));
    rect.setAttribute('height', fmtSvgNumber(node.height));
    rect.setAttribute('fill', 'none');
    rect.setAttribute('stroke', children.length > 0 ? '#3366cc' : '#0099cc');
    rect.setAttribute('stroke-width', '1');
    rect.setAttribute('stroke-dasharray', '4 3');
    group.appendChild(rect);

    const idText = options.ownerDocument.createElementNS(svgNs, 'text');
    idText.setAttribute('x', fmtSvgNumber(x + 4));
    idText.setAttribute('y', fmtSvgNumber(y + 12));
    idText.setAttribute('font-family', 'Ubuntu Sans, monospace');
    idText.setAttribute('font-size', '10');
    idText.setAttribute('fill', '#3366cc');
    idText.textContent = node.id;
    group.appendChild(idText);
  });

  for (const edge of options.snapshot.edges || []) {
    for (const section of edge.sections || []) {
      const points: Array<[number, number]> = [
        [section.startPoint.x + originX, section.startPoint.y + originY],
        ...(section.bendPoints || []).map((bendPoint) => [bendPoint.x + originX, bendPoint.y + originY] as [number, number]),
        [section.endPoint.x + originX, section.endPoint.y + originY],
      ];

      for (let index = 0; index < points.length - 1; index += 1) {
        const line = options.ownerDocument.createElementNS(svgNs, 'line');
        line.setAttribute('x1', fmtSvgNumber(points[index]![0]));
        line.setAttribute('y1', fmtSvgNumber(points[index]![1]));
        line.setAttribute('x2', fmtSvgNumber(points[index + 1]![0]));
        line.setAttribute('y2', fmtSvgNumber(points[index + 1]![1]));
        line.setAttribute('stroke', '#00aa66');
        line.setAttribute('stroke-width', '1.5');
        group.appendChild(line);
      }
    }

    for (const label of edge.labels || []) {
      const rect = options.ownerDocument.createElementNS(svgNs, 'rect');
      rect.setAttribute('x', fmtSvgNumber(label.x + originX));
      rect.setAttribute('y', fmtSvgNumber(label.y + originY));
      rect.setAttribute('width', fmtSvgNumber(label.width));
      rect.setAttribute('height', fmtSvgNumber(label.height));
      rect.setAttribute('fill', 'rgba(255, 180, 60, 0.15)');
      rect.setAttribute('stroke', '#cc7700');
      rect.setAttribute('stroke-width', '1');
      group.appendChild(rect);

      const text = options.ownerDocument.createElementNS(svgNs, 'text');
      text.setAttribute('x', fmtSvgNumber(label.x + originX + label.width / 2));
      text.setAttribute('y', fmtSvgNumber(label.y + originY + label.height / 2 + 4));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-family', 'Ubuntu Sans, monospace');
      text.setAttribute('font-size', '10');
      text.setAttribute('fill', '#884400');
      text.textContent = label.text;
      group.appendChild(text);
    }
  }

  const caption = options.ownerDocument.createElementNS(svgNs, 'text');
  caption.setAttribute('x', '8');
  caption.setAttribute('y', '16');
  caption.setAttribute('font-family', 'Ubuntu Sans, monospace');
  caption.setAttribute('font-size', '11');
  caption.setAttribute('fill', '#3366cc');
  caption.textContent = 'ELK debug: dashed rects = node boxes (not circles), green = edge routes, amber = ELK label boxes';
  group.appendChild(caption);

  return group;
}

export function renderPreviewElkRawView(
  options: RenderPreviewElkRawViewOptions,
): SVGGElement {
  const svgNs = options.svgNs ?? DEFAULT_SVG_NS;
  const group = options.ownerDocument.createElementNS(svgNs, 'g') as SVGGElement;
  group.id = 'dg-elk-raw-view';
  group.setAttribute('pointer-events', 'none');
  attachElkDebugPayload(group, options.snapshot);

  const originX = options.snapshot.originX || 0;
  const originY = options.snapshot.originY || 0;
  const headLen = options.headLen ?? 8;
  const headHalf = options.headHalf ?? 4;

  const caption = options.ownerDocument.createElementNS(svgNs, 'text');
  caption.setAttribute('x', '8');
  caption.setAttribute('y', '16');
  caption.setAttribute('font-family', 'sans-serif');
  caption.setAttribute('font-size', '11');
  caption.setAttribute('fill', '#555555');
  caption.textContent = 'ELK raw layout — gray nodes, black routes, ELK label boxes (toggle off for BF styling)';
  group.appendChild(caption);

  if (options.snapshot.debug) {
    const summary = options.ownerDocument.createElementNS(svgNs, 'text');
    summary.setAttribute('x', '8');
    summary.setAttribute('y', '30');
    summary.setAttribute('font-family', 'sans-serif');
    summary.setAttribute('font-size', '10');
    summary.setAttribute('fill', '#555555');
    const flattenedPreview = options.snapshot.debug.flattenedFrameIds.slice(0, 4).join(', ');
    summary.textContent = `Authored tree ${countAuthoredTreeNodes(options.snapshot.debug.authoredTree)} nodes; ELK input ${options.snapshot.debug.inputGraph.nodes.length} top-level nodes; flattened: ${flattenedPreview || 'none'}`;
    group.appendChild(summary);
  }

  walkPlacedNodesAbsolute(options.snapshot.nodes, (node) => {
    const x = node.x + originX;
    const y = node.y + originY;
    const isCompound = (node.children ?? []).length > 0;

    const rect = options.ownerDocument.createElementNS(svgNs, 'rect');
    rect.setAttribute('x', fmtSvgNumber(x));
    rect.setAttribute('y', fmtSvgNumber(y));
    rect.setAttribute('width', fmtSvgNumber(node.width));
    rect.setAttribute('height', fmtSvgNumber(node.height));
    rect.setAttribute('fill', isCompound ? '#f5f5f5' : '#ececec');
    rect.setAttribute('stroke', '#333333');
    rect.setAttribute('stroke-width', '1');
    group.appendChild(rect);

    const label = options.labelMap?.[node.id] || node.id;
    const lines = String(label).split('\n');
    const lineHeight = 13;
    const totalHeight = lines.length * lineHeight;
    let textY = y + (node.height - totalHeight) / 2 + 10;

    for (const lineText of lines) {
      const text = options.ownerDocument.createElementNS(svgNs, 'text');
      text.setAttribute('x', fmtSvgNumber(x + node.width / 2));
      text.setAttribute('y', fmtSvgNumber(textY));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-family', 'sans-serif');
      text.setAttribute('font-size', '11');
      text.setAttribute('fill', '#111111');
      text.textContent = lineText;
      group.appendChild(text);
      textY += lineHeight;
    }
  });

  for (const edge of options.snapshot.edges || []) {
    for (const section of edge.sections || []) {
      const points: Array<[number, number]> = [
        [section.startPoint.x + originX, section.startPoint.y + originY],
        ...(section.bendPoints || []).map((bendPoint) => [bendPoint.x + originX, bendPoint.y + originY] as [number, number]),
        [section.endPoint.x + originX, section.endPoint.y + originY],
      ];

      for (let index = 0; index < points.length - 1; index += 1) {
        const [x1, y1] = points[index]!;
        const [x2, y2] = points[index + 1]!;
        const line = options.ownerDocument.createElementNS(svgNs, 'line');
        line.setAttribute('x1', fmtSvgNumber(x1));
        line.setAttribute('y1', fmtSvgNumber(y1));
        line.setAttribute('x2', fmtSvgNumber(x2));
        line.setAttribute('y2', fmtSvgNumber(y2));
        line.setAttribute('stroke', '#000000');
        line.setAttribute('stroke-width', '1');
        group.appendChild(line);

        if (index === points.length - 2) {
          const arrowhead = resolveArrowheadGeometry({
            tip: [x2, y2],
            previous: [x1, y1],
            headLength: headLen,
            headHalfWidth: headHalf,
          });
          if (arrowhead) {
            const polygon = options.ownerDocument.createElementNS(svgNs, 'polygon');
            polygon.setAttribute(
              'points',
              formatArrowPolygonPoints([arrowhead.left, arrowhead.tip, arrowhead.right]),
            );
            polygon.setAttribute('fill', '#000000');
            group.appendChild(polygon);

            const endPort = options.ownerDocument.createElementNS(svgNs, 'circle');
            endPort.setAttribute('cx', fmtSvgNumber(x2));
            endPort.setAttribute('cy', fmtSvgNumber(y2));
            endPort.setAttribute('r', '2.5');
            endPort.setAttribute('fill', '#000000');
            group.appendChild(endPort);
          }
        }
      }

      const [startX, startY] = points[0]!;
      const startPort = options.ownerDocument.createElementNS(svgNs, 'circle');
      startPort.setAttribute('cx', fmtSvgNumber(startX));
      startPort.setAttribute('cy', fmtSvgNumber(startY));
      startPort.setAttribute('r', '2.5');
      startPort.setAttribute('fill', '#000000');
      group.appendChild(startPort);
    }

    for (const label of edge.labels || []) {
      const x = label.x + originX;
      const y = label.y + originY;

      const box = options.ownerDocument.createElementNS(svgNs, 'rect');
      box.setAttribute('x', fmtSvgNumber(x));
      box.setAttribute('y', fmtSvgNumber(y));
      box.setAttribute('width', fmtSvgNumber(label.width));
      box.setAttribute('height', fmtSvgNumber(label.height));
      box.setAttribute('fill', '#ffffff');
      box.setAttribute('stroke', '#666666');
      box.setAttribute('stroke-width', '1');
      group.appendChild(box);

      const text = options.ownerDocument.createElementNS(svgNs, 'text');
      text.setAttribute('x', fmtSvgNumber(x + label.width / 2));
      text.setAttribute('y', fmtSvgNumber(y + label.height / 2 + 4));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-family', 'sans-serif');
      text.setAttribute('font-size', '10');
      text.setAttribute('fill', '#111111');
      text.textContent = label.text;
      group.appendChild(text);
    }
  }

  return group;
}
