import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadFrameYaml } from '../src/frame-yaml-loader.js';
import { layoutElkFrameDiagram } from '../src/elk-layout.js';
import { renderFrameDiagramToSvg } from '../src/svg-render.js';
import { MockTextAdapter } from '../src/text-measure.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FRAMES_DIR = join(__dirname, '../../..', 'scripts/diagrams/frames');

type FrameLike = {
  id: string;
  children: FrameLike[];
  resolvedFill?: string;
  resolvedStroke?: string;
  resolvedStrokeWidth?: number;
  resolvedTextFill?: string;
};

function walkFrames(frame: FrameLike, visit: (frame: FrameLike) => void): void {
  visit(frame);
  for (const child of frame.children) {
    walkFrames(child, visit);
  }
}

function parseRectGeometry(svg: string) {
  return [...svg.matchAll(/<rect\b([^>]+?)\/>/g)].map((match) => {
    const attrs = Object.fromEntries(
      [...match[1].matchAll(/([A-Za-z:_-]+)="([^"]*)"/g)].map((entry) => [entry[1], entry[2]]),
    );
    return {
      x: attrs.x ?? '',
      y: attrs.y ?? '',
      width: attrs.width ?? '',
      height: attrs.height ?? '',
    };
  });
}

function parsePaint(svg: string) {
  return [...svg.matchAll(/<rect\b([^>]+?)\/>/g)].map((match) => {
    const attrs = Object.fromEntries(
      [...match[1].matchAll(/([A-Za-z:_-]+)="([^"]*)"/g)].map((entry) => [entry[1], entry[2]]),
    );
    return {
      fill: attrs.fill ?? '',
      stroke: attrs.stroke ?? '',
      strokeWidth: attrs['stroke-width'] ?? '',
    };
  });
}

function parsePaths(svg: string) {
  return [...svg.matchAll(/<path\b([^>]+?)\/>/g)].map((match) => {
    const attrs = Object.fromEntries(
      [...match[1].matchAll(/([A-Za-z:_-]+)="([^"]*)"/g)].map((entry) => [entry[1], entry[2]]),
    );
    return attrs.d ?? '';
  });
}

function parseTspanGeometry(svg: string) {
  return [...svg.matchAll(/<tspan\b([^>]*)>([^<]*)<\/tspan>/g)].map((match) => {
    const attrs = Object.fromEntries(
      [...match[1].matchAll(/([A-Za-z:_-]+)="([^"]*)"/g)].map((entry) => [entry[1], entry[2]]),
    );
    return {
      x: attrs.x ?? '',
      y: attrs.y ?? '',
      text: match[2],
    };
  });
}

describe('ELK thin styling', () => {
  it('changes paint without changing rendered geometry', async () => {
    const diagram = loadFrameYaml(join(FRAMES_DIR, 'tls-certificate-provider-topology.yaml'));
    const adapter = new MockTextAdapter();
    const layout = await layoutElkFrameDiagram(diagram, adapter, {
      originX: 0,
      originY: 0,
    });

    const styledSvg = renderFrameDiagramToSvg(diagram, layout, adapter);
    const styledRects = parseRectGeometry(styledSvg);
    const styledPaths = parsePaths(styledSvg);
    const styledText = parseTspanGeometry(styledSvg);
    const styledPaint = parsePaint(styledSvg);

    walkFrames(diagram.root as unknown as FrameLike, (frame) => {
      frame.resolvedFill = 'transparent';
      frame.resolvedStroke = '#ff5a1f';
      frame.resolvedStrokeWidth = 1;
      frame.resolvedTextFill = '#0b7a75';
    });

    const restyledSvg = renderFrameDiagramToSvg(diagram, layout, adapter);

    expect(parseRectGeometry(restyledSvg)).toEqual(styledRects);
    expect(parsePaths(restyledSvg)).toEqual(styledPaths);
    expect(parseTspanGeometry(restyledSvg)).toEqual(styledText);
    expect(parsePaint(restyledSvg)).not.toEqual(styledPaint);
  });
});
