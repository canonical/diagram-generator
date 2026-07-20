import { BASELINE_UNIT } from '../tokens.js';
import { DRAWIO_ADAPTIVE_COLORS, drawioPageBackground } from './theme.js';

function fmt(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export interface MxVertexOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  style: string;
  value?: string;
  parent?: string;
  connectable?: boolean;
}

export interface MxEdgeOptions {
  style: string;
  source?: string;
  target?: string;
  sourcePoint?: [number, number];
  targetPoint?: [number, number];
  waypoints?: Array<[number, number]>;
  value?: string;
  parent?: string;
}

export class MxGraphBuilder {
  private nextId = 2;
  private readonly cells: string[] = [];

  constructor(
    private readonly name: string,
    private readonly diagramId: string,
    private readonly pageWidth: number,
    private readonly pageHeight: number,
  ) {}

  private newId(): string {
    const id = String(this.nextId);
    this.nextId += 1;
    return id;
  }

  addVertex(options: MxVertexOptions): string {
    const id = this.newId();
    const parent = options.parent ?? '1';
    const attrs = [
      `id="${id}"`,
      `parent="${parent}"`,
      `style="${escapeXmlAttr(options.style)}"`,
      `value="${escapeXmlAttr(options.value ?? '')}"`,
      'vertex="1"',
    ];
    if (options.connectable === false) {
      attrs.push('connectable="0"');
    }
    const geometry = [
      '<mxGeometry',
      ` x="${fmt(options.x)}"`,
      ` y="${fmt(options.y)}"`,
      ` width="${fmt(options.width)}"`,
      ` height="${fmt(options.height)}"`,
      ' as="geometry"',
      '/>',
    ].join('');
    this.cells.push(`<mxCell ${attrs.join(' ')}>${geometry}</mxCell>`);
    return id;
  }

  addEdge(options: MxEdgeOptions): string {
    const id = this.newId();
    const parent = options.parent ?? '1';
    const attrs = [
      `id="${id}"`,
      `parent="${parent}"`,
      `style="${escapeXmlAttr(options.style)}"`,
      `value="${escapeXmlAttr(options.value ?? '')}"`,
      'edge="1"',
    ];
    if (options.source) attrs.push(`source="${options.source}"`);
    if (options.target) attrs.push(`target="${options.target}"`);

    const geometryParts = ['<mxGeometry relative="1" as="geometry">'];
    if (options.sourcePoint) {
      geometryParts.push(
        `<mxPoint x="${fmt(options.sourcePoint[0])}" y="${fmt(options.sourcePoint[1])}" as="sourcePoint"/>`,
      );
    }
    if (options.targetPoint) {
      geometryParts.push(
        `<mxPoint x="${fmt(options.targetPoint[0])}" y="${fmt(options.targetPoint[1])}" as="targetPoint"/>`,
      );
    }
    if (options.waypoints && options.waypoints.length > 0) {
      geometryParts.push('<Array as="points">');
      for (const [x, y] of options.waypoints) {
        geometryParts.push(`<mxPoint x="${fmt(x)}" y="${fmt(y)}"/>`);
      }
      geometryParts.push('</Array>');
    }
    geometryParts.push('</mxGeometry>');
    this.cells.push(`<mxCell ${attrs.join(' ')}>${geometryParts.join('')}</mxCell>`);
    return id;
  }

  get cellCount(): number {
    return this.cells.length + 2;
  }

  toXml(): string {
    const modelAttrs = [
      'grid="1"',
      `gridSize="${BASELINE_UNIT}"`,
      'guides="1"',
      'tooltips="1"',
      'connect="1"',
      'arrows="1"',
      'fold="1"',
      'page="1"',
      'pageScale="1"',
      `pageWidth="${this.pageWidth}"`,
      `pageHeight="${this.pageHeight}"`,
      `background="${drawioPageBackground()}"`,
      `adaptiveColors="${DRAWIO_ADAPTIVE_COLORS}"`,
      'math="0"',
      'shadow="0"',
    ].join(' ');
    return [
      '<mxfile host="app.diagrams.net" agent="diagram-generator" version="29.3.7">',
      `<diagram name="${escapeXmlAttr(this.name)}" id="${escapeXmlAttr(this.diagramId)}">`,
      `<mxGraphModel ${modelAttrs}>`,
      '<root>',
      '<mxCell id="0"/>',
      '<mxCell id="1" parent="0"/>',
      ...this.cells,
      '</root>',
      '</mxGraphModel>',
      '</diagram>',
      '</mxfile>',
    ].join('');
  }
}
