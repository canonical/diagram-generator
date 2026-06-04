import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createFsIconLoader,
  extractSvgInnerMarkup,
  preloadIconMarkup,
  safeIconFileName,
  tintIconInnerMarkup,
  collectIconNames,
} from '../src/icon-embed.js';
import { Frame, FrameDiagram } from '../src/frame-model.js';
import { layoutFrameTree } from '../src/layout.js';
import { MockTextAdapter } from '../src/text-measure.js';
import { renderFrameDiagramToSvg } from '../src/svg-render.js';

const repoRoot = join(import.meta.dirname, '../../..');
const iconsDir = join(repoRoot, 'assets/icons');

describe('icon-embed', () => {
  it('safeIconFileName rejects traversal', () => {
    expect(safeIconFileName('Cloud.svg')).toBe('Cloud.svg');
    expect(safeIconFileName('../secrets.svg')).toBeNull();
    expect(safeIconFileName('icons/Cloud.svg')).toBe('Cloud.svg');
  });

  it('extractSvgInnerMarkup strips wrapper', () => {
    const raw = readFileSync(join(iconsDir, 'Cloud.svg'), 'utf-8');
    const inner = extractSvgInnerMarkup(raw);
    expect(inner).toContain('<path');
    expect(inner).not.toMatch(/^<svg/i);
  });

  it('tintIconInnerMarkup recolors black fills', () => {
    const inner = '<path fill="black" d="M0 0"/>';
    expect(tintIconInnerMarkup(inner, '#FFFFFF')).toContain('fill="#FFFFFF"');
  });

  it('createFsIconLoader reads Cloud.svg', () => {
    const load = createFsIconLoader(iconsDir);
    const inner = load('Cloud.svg');
    expect(inner).toBeTruthy();
    expect(load('missing-icon.svg')).toBeNull();
  });

  it('collectIconNames walks frame tree', () => {
    const root = new Frame({ id: 'r', icon: 'Cloud.svg' });
    root.children.push(new Frame({ id: 'c', icon: 'CPU.svg' }));
    expect([...collectIconNames(root)].sort()).toEqual(['CPU.svg', 'Cloud.svg']);
  });

  it('preloadIconMarkup builds map', () => {
    const load = createFsIconLoader(iconsDir);
    const map = preloadIconMarkup(load, ['Cloud.svg', 'nope.svg']);
    expect(map.get('Cloud.svg')).toBeTruthy();
    expect(map.has('nope.svg')).toBe(false);
  });

  it('renderFrameDiagramToSvg embeds real icon markup', () => {
    const root = new Frame({
      id: 'box',
      icon: 'Cloud.svg',
      label: [{ content: 'Title', size: '16px', weight: '400', fill: '#000' }],
    });
    root._layout.placedX = 0;
    root._layout.placedY = 0;
    root._layout.placedW = 192;
    root._layout.placedH = 64;
    const diagram = new FrameDiagram({ root });
    const adapter = new MockTextAdapter();
    const result = layoutFrameTree(root, adapter);
    const load = createFsIconLoader(iconsDir);
    const iconMarkupByName = preloadIconMarkup(load, collectIconNames(root));
    const svg = renderFrameDiagramToSvg(diagram, result, adapter, { iconMarkupByName });
    expect(svg).toContain('class="dg-icon"');
    expect(svg).toContain('<path');
    expect(svg).not.toContain('opacity="0.15"');
  });
});
