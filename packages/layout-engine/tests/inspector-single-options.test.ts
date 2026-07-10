import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { compileDiagramYaml } from '../src/diagram-author/compile.js';
import { type AuthorFrameNode } from '../src/diagram-author/types.js';
import { type Frame } from '../src/frame-model.js';
import { loadFrameYaml } from '../src/frame-yaml-loader.js';
import { layoutFrameTree } from '../src/layout.js';
import { resolveFrameRenderPlan } from '../src/frame-render-plan.js';
import { MockTextAdapter } from '../src/text-measure.js';
import { resolveSingleSelectionInspectorPanelRenderOptions } from '../src/preview-shell/inspector-single-options.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FRAMES_DIR = join(__dirname, '../../..', 'diagrams/1.input');

function findAuthorFrame(
  node: AuthorFrameNode | null | undefined,
  id: string,
): AuthorFrameNode | null {
  if (!node) return null;
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = findAuthorFrame(child, id);
    if (found) return found;
  }
  return null;
}

function findFrame(frame: Frame, id: string): Frame | null {
  if (frame.id === id) return frame;
  for (const child of frame.children) {
    const found = findFrame(child, id);
    if (found) return found;
  }
  return null;
}

describe('single-selection inspector option helpers', () => {
  it('builds panel render options from node, style, and callback-owned HTML', () => {
    const options = resolveSingleSelectionInspectorPanelRenderOptions({
      cid: 'frame-1',
      node: {
        align: 'CENTER',
        data: {
          level: 2,
          fill: 'GREY',
          border: 'SOLID',
        },
      },
      override: {
        style: '',
      },
      ownDelta: { dx: 8, dy: 0, dw: 0, dh: 0 },
      effectiveDelta: { dx: 16, dy: 0 },
      componentType: 'panel',
      renderedStyle: {
        fill: '#000000',
        stroke: 'none',
      },
      violations: [{ message: 'warn', severity: 'warning' }],
      renderAutolayoutPanel: () => '<div>auto</div>',
      renderStyleOptions: (currentStyle, originalStyleName) => `${currentStyle}|${originalStyleName}`,
    });

    expect(options.viewModel.currentAlign).toBe('CENTER');
    expect(options.alignTargetCid).toBe('frame-1');
    expect(options.viewModel.hasMoveOverride).toBe(true);
    expect(options.viewModel.hasParentOverride).toBe(true);
    expect(options.autolayoutPanelHtml).toBe('<div>auto</div>');
    expect(options.styleMode).toBe('picker');
    expect(options.styleOptionsHtml).toBe('highlight|parent');
    expect(options.violations).toEqual([{ message: 'warn', severity: 'warning' }]);
  });

  it('surfaces autolayout render failures and keeps structural wrappers out of the picker path', () => {
    const options = resolveSingleSelectionInspectorPanelRenderOptions({
      cid: 'frame-2',
      node: {
        children: [{}],
        data: {
          fill: 'WHITE',
          border: 'NONE',
        },
      },
      ownDelta: { dx: 0, dy: 0, dw: 0, dh: 0 },
      effectiveDelta: { dx: 0, dy: 0 },
      componentType: 'panel',
      renderAutolayoutPanel() {
        throw new Error('boom');
      },
      formatControlErrorMessage(message) {
        return `safe:${message}`;
      },
      renderStyleOptions() {
        return 'unexpected';
      },
    });

    expect(options.controlsErrorMessage).toBe('safe:boom');
    expect(options.autolayoutPanelHtml).toBe('');
    expect(options.styleMode).toBe('structural');
    expect(options.styleOptionsHtml).toBe('');
  });

  it('targets parent alignment for autolayout leaf children while keeping style edits on the selected node', () => {
    const options = resolveSingleSelectionInspectorPanelRenderOptions({
      cid: 'child',
      node: {
        id: 'child',
        align: 'TOP_LEFT',
        data: { id: 'child' },
      },
      parentNode: {
        id: 'parent',
        align: 'BOTTOM_RIGHT',
        layout: 'vertical',
        data: { id: 'parent' },
      },
      parentOverride: {
        align: 'CENTER_LEFT',
      },
      ownDelta: { dx: 0, dy: 0, dw: 0, dh: 0 },
      effectiveDelta: { dx: 0, dy: 0 },
      componentType: 'panel',
      parentLayout: 'vertical',
      renderedStyle: {
        fill: '#F3F3F3',
        stroke: '#111111',
      },
      renderStyleOptions: (currentStyle) => currentStyle,
    });

    expect(options.viewModel.isAutolayoutChild).toBe(true);
    expect(options.viewModel.isAutolayoutContainer).toBe(false);
    expect(options.viewModel.currentAlign).toBe('CENTER_LEFT');
    expect(options.alignTargetCid).toBe('parent');
    expect(options.styleOptionsHtml).toBe('parent');
  });

  it('resolves a default child variant from rendered box styling when the node has no authored style fields', () => {
    const options = resolveSingleSelectionInspectorPanelRenderOptions({
      cid: 'child',
      node: {
        id: 'child',
        data: { id: 'child' },
      },
      ownDelta: { dx: 0, dy: 0, dw: 0, dh: 0 },
      effectiveDelta: { dx: 0, dy: 0 },
      componentType: 'box',
      renderedStyle: {
        fill: '#ffffff',
        stroke: '#111111',
      },
      renderStyleOptions: (currentStyle) => currentStyle,
    });

    expect(options.styleMode).toBe('picker');
    expect(options.styleOptionsHtml).toBe('default');
  });

  it('resolves concrete variants for unstyled child boxes in the test-deep-nesting fixture', () => {
    const fixturePath = join(FRAMES_DIR, 'test-deep-nesting.yaml');
    const raw = readFileSync(fixturePath, 'utf8');
    const compiled = compileDiagramYaml(raw, { sourcePath: fixturePath });
    expect(compiled.errors).toEqual([]);

    const diagram = loadFrameYaml(fixturePath);
    const adapter = new MockTextAdapter();
    layoutFrameTree(diagram.root, adapter, { arrows: diagram.arrows });

    const cases: Array<[string, string]> = [
      ['vm_2', 'default'],
      ['vm_3', 'default'],
      ['disk_1', 'default'],
      ['disk_2', 'default'],
    ];

    for (const [id, expectedStyle] of cases) {
      const authorFrame = findAuthorFrame(compiled.ast.root, id);
      expect(authorFrame, `${id} should exist in authored fixture`).toBeTruthy();
      expect(authorFrame?.variant, `${id} must not author a variant`).toBeUndefined();
      expect(authorFrame?.level, `${id} must not author a level`).toBeUndefined();
      expect(authorFrame?.fill, `${id} must not author a fill`).toBeUndefined();
      expect(authorFrame?.border, `${id} must not author a border`).toBeUndefined();

      const frame = findFrame(diagram.root, id);
      expect(frame, `${id} should exist in loaded fixture`).toBeTruthy();
      const plan = resolveFrameRenderPlan(frame!, adapter);
      const options = resolveSingleSelectionInspectorPanelRenderOptions({
        cid: id,
        node: frame!,
        ownDelta: { dx: 0, dy: 0, dw: 0, dh: 0 },
        effectiveDelta: { dx: 0, dy: 0 },
        componentType: 'Box',
        renderedStyle: {
          fill: plan.box.fill,
          stroke: plan.box.stroke,
        },
        renderStyleOptions: (currentStyle) => currentStyle,
      });

      expect(options.styleMode, id).toBe('picker');
      expect(options.styleOptionsHtml, id).toBe(expectedStyle);
      expect(options.styleLabel, id).not.toBe('Unknown variant');
    }
  });
});
