import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { layoutFrameTree } from '../src/layout.js';
import { loadFrameYaml } from '../src/frame-yaml-loader.js';
import { Frame, FrameDiagram, createLine } from '../src/frame-model.js';
import { resolveStyles } from '../src/resolve-styles.js';
import { layoutFrameDiagramForExport } from '../src/frame-diagram-export-layout.js';
import { exportFrameDiagramToDrawio } from '../src/drawio-render.js';
import { themedIconDataUri } from '../src/drawio/icon-uri.js';
import { richTextFromPlainLines } from '../src/drawio/rich-text.js';
import { edgeStyle, labelStyle, rectStyle } from '../src/drawio/style-presets.js';
import { drawioPageBackground } from '../src/drawio/theme.js';
import { emitFrameDiagramDisplayList } from '../src/render-adapter/display-list.js';
import { MockTextAdapter } from '../src/text-measure.js';
import {
  AI_INFRA_DRAWIO_SLUGS,
  DRAWIO_GOLDEN_DIR,
  exportSlugToDrawio,
  findLabelVerticesByText,
  normalizeDrawio,
} from './drawio-golden-harness.js';
import { FRAMES_DIR, getHarfBuzzAdapter } from './svg-golden-harness.js';

function countMatches(xml: string, pattern: RegExp): number {
  return (xml.match(pattern) ?? []).length;
}

function findFrameDisplayListGeometry(
  items: readonly import('../src/render-ir.js').DisplayListItem[],
  frameId: string,
): {
  box: { x: number; y: number; width: number; height: number };
  textBlocks: import('../src/render-ir.js').TextBlockItem[];
} | null {
  for (const item of items) {
    if (item.kind !== 'group') continue;
    if (item.id === frameId) {
      const box = item.children.find(
        (child): child is import('../src/render-ir.js').RectItem =>
          child.kind === 'rect' && child.className !== 'dg-icon',
      );
      if (!box) return null;
      return {
        box,
        textBlocks: item.children.filter(
          (child): child is import('../src/render-ir.js').TextBlockItem => child.kind === 'text-block',
        ),
      };
    }
    const nested = findFrameDisplayListGeometry(item.children, frameId);
    if (nested) return nested;
  }
  return null;
}

describe('exportFrameDiagramToDrawio', () => {
  it('uses explicit draw.io light and dark theme colors for style fields', () => {
    expect(drawioPageBackground()).toBe('light-dark(#FFFFFF,#1E1E1E)');
    expect(rectStyle('#FFFFFF', { stroke: '#000000' })).toContain(
      'fillColor=light-dark(#FFFFFF,#1E1E1E);',
    );
    expect(rectStyle('#FFFFFF', { stroke: '#000000' })).toContain(
      'strokeColor=light-dark(#000000,#F2F2F2);',
    );
    expect(labelStyle()).toContain('fontColor=light-dark(#000000,#F2F2F2);');
    expect(edgeStyle('#E95420')).toContain('strokeColor=light-dark(#E95420,#FF7A45);');
  });

  it('themes draw.io rich text and inline SVG icon colors', () => {
    expect(richTextFromPlainLines([{ content: 'muted', fill: '#666666' }])).toContain(
      'color:light-dark(#666666,#C9C9C9)',
    );

    const uri = themedIconDataUri(
      '<path fill="#000000" d="M0 0h1v1z"/><circle stroke="#666666" fill="none"/>',
      16,
    );
    const decoded = decodeURIComponent(uri);
    expect(decoded).toContain('fill="light-dark(#000000,#F2F2F2)"');
    expect(decoded).toContain('stroke="light-dark(#666666,#C9C9C9)"');
    expect(decoded).toContain('fill="none"');
  });

  it('pins draw.io adaptive color mode so authored light-dark pairs own the theme', async () => {
    const exported = await exportSlugToDrawio('ai-infra-telecom-services-stack');
    expect(exported.xml).toContain('background="light-dark(#FFFFFF,#1E1E1E)"');
    expect(exported.xml).toContain('adaptiveColors="none"');
    expect(exported.xml).toContain('fillColor=light-dark(#F3F3F3,#303030)');
    expect(exported.xml).toContain('fontColor=light-dark(#000000,#F2F2F2)');
    expect(exported.xml).toContain('strokeColor=light-dark(#E95420,#FF7A45)');
    expect(exported.xml).not.toContain('background="light-dark(#ffffff, #ffffff)"');
  });

  it.each(AI_INFRA_DRAWIO_SLUGS)('exports %s without error', async (slug) => {
    const exported = await exportSlugToDrawio(slug);
    expect(exported.xml).toContain('<mxfile host="app.diagrams.net"');
    expect(exported.xml).toContain('<mxGraphModel');
    expect(exported.cellCount).toBeGreaterThan(10);
    expect(countMatches(exported.xml, /vertex="1"/g)).toBeGreaterThan(5);
  });

  it('includes labeled physical-row edges for ai-infra-telecom-services-stack', async () => {
    const exported = await exportSlugToDrawio('ai-infra-telecom-services-stack');
    expect(exported.edgeCount).toBeGreaterThanOrEqual(3);
    expect(exported.xml).toContain('Ethernet fabric');
    expect(exported.xml).toContain('InfiniBand fabric');
    expect(exported.xml).toContain('Fiber transport');
    expect(countMatches(exported.xml, /edge="1"/g)).toBeGreaterThanOrEqual(3);
    expect(exported.frameCellIds.dpus_smartnics).toBeTruthy();
    expect(exported.frameCellIds.whitebox_switches).toBeTruthy();
  });

  it('registers connectable frame cells for ai-infra-production-contract', async () => {
    const exported = await exportSlugToDrawio('ai-infra-production-contract');
    expect(Object.keys(exported.frameCellIds).length).toBeGreaterThan(8);
    expect(exported.xml).toContain('shape=image');
    expect(exported.edgeCount).toBeGreaterThan(10);
  });

  it('exports value-map nodes for ai-infra-telco-value-map', async () => {
    const exported = await exportSlugToDrawio('ai-infra-telco-value-map');
    expect(exported.cellCount).toBeGreaterThan(15);
    expect(exported.xml).toContain('Ubuntu Sans');
  });

  it('derives in-box label offsets from display-list geometry', async () => {
    const adapter = await getHarfBuzzAdapter();
    const diagram = loadFrameYaml(join(FRAMES_DIR, 'ai-infra-telecom-services-stack.yaml'));
    const result = await layoutFrameDiagramForExport(diagram, adapter);
    const displayList = emitFrameDiagramDisplayList(diagram, result, adapter, {
      previewElkLabels: true,
    });
    const geometry = findFrameDisplayListGeometry(displayList.items, 'network_assurance');
    expect(geometry).not.toBeNull();
    expect(geometry!.textBlocks.length).toBeGreaterThan(0);

    const exported = exportFrameDiagramToDrawio(diagram, result, adapter, {
      diagramId: 'ai-infra-telecom-services-stack',
      diagramName: diagram.title,
    });
    const labelGeometries = findLabelVerticesByText(exported.xml, ['Network', 'assurance']);
    expect(labelGeometries.length).toBeGreaterThan(0);

    const firstSpan = geometry!.textBlocks[0]!.spans[0]!;
    const expectedX = firstSpan.x;
    const expectedY = firstSpan.y - firstSpan.fontSize * 0.94;
    expect(Number(labelGeometries[0]!.x)).toBeCloseTo(expectedX, 0);
    expect(Number(labelGeometries[0]!.y)).toBeCloseTo(expectedY, 0);
    expect(labelGeometries[0]!.parent).toBe('1');
  });

  it('stacks multiple text blocks at distinct Y positions', async () => {
    const adapter = new MockTextAdapter();
    const diagram = new FrameDiagram({
      title: 'Multi-block proof',
      root: new Frame({
        id: 'page',
        children: [
          new Frame({
            id: 'headed_leaf',
            heading: createLine('Title'),
            label: [createLine('Body')],
          }),
        ],
      }),
    });
    resolveStyles(diagram.root);
    const result = layoutFrameTree(diagram.root, adapter, { arrows: diagram.arrows });
    const displayList = emitFrameDiagramDisplayList(diagram, result, adapter, {
      previewElkLabels: true,
    });
    const geometry = findFrameDisplayListGeometry(displayList.items, 'headed_leaf');
    expect(geometry?.textBlocks.length).toBe(2);

    const exported = exportFrameDiagramToDrawio(diagram, result, adapter, {
      diagramId: 'multi-block-proof',
      diagramName: diagram.title,
    });
    const titleGeometries = findLabelVerticesByText(exported.xml, ['Title']);
    const bodyGeometries = findLabelVerticesByText(exported.xml, ['Body']);
    expect(titleGeometries.length).toBe(1);
    expect(bodyGeometries.length).toBe(1);
    expect(titleGeometries[0]!.parent).toBe('1');
    expect(bodyGeometries[0]!.parent).toBe('1');
    expect(Number(titleGeometries[0]!.y)).not.toBe(Number(bodyGeometries[0]!.y));
  });

  it('rejects unsupported layout engines explicitly', async () => {
    const adapter = await getHarfBuzzAdapter();
    const diagram = loadFrameYaml(join(FRAMES_DIR, 'ai-infra-telco-value-map.yaml'));
    diagram.layoutEngine = 'mindmap-tree';
    await expect(layoutFrameDiagramForExport(diagram, adapter)).rejects.toThrow(
      /does not support layout_engine "mindmap-tree"/,
    );
  });

  it('falls back to v3 layout when layout_engine is omitted', async () => {
    const adapter = new MockTextAdapter();
    const diagram = loadFrameYaml(join(FRAMES_DIR, 'support-engineering-flow.yaml'));
    delete diagram.layoutEngine;
    const result = layoutFrameTree(diagram.root, adapter, {
      gridCols: diagram.gridCols,
      gridColGap: diagram.gridColGap,
      gridRowGap: diagram.gridRowGap,
      gridOuterMargin: diagram.gridOuterMargin,
      arrows: diagram.arrows,
    });
    const exported = exportFrameDiagramToDrawio(diagram, result, adapter, {
      diagramId: 'support-engineering-flow',
      diagramName: diagram.title,
    });
    expect(exported.cellCount).toBeGreaterThan(5);
  });

  for (const slug of AI_INFRA_DRAWIO_SLUGS) {
    it(`matches golden draw.io for ${slug}`, async () => {
      const exported = await exportSlugToDrawio(slug);
      const xml = normalizeDrawio(exported.xml);
      const goldenPath = join(DRAWIO_GOLDEN_DIR, `${slug}.drawio`);

      if (process.env.UPDATE_DRAWIO_GOLDEN === '1') {
        mkdirSync(DRAWIO_GOLDEN_DIR, { recursive: true });
        writeFileSync(goldenPath, xml, 'utf8');
        expect(true).toBe(true);
        return;
      }

      expect(existsSync(goldenPath), `missing golden file: ${goldenPath}`).toBe(true);
      const expected = normalizeDrawio(readFileSync(goldenPath, 'utf8'));
      expect(xml).toBe(expected);
    });
  }
});
