import { describe, expect, it } from 'vitest';
import { resolveSingleSelectionInspectorPanelRenderOptions } from '../src/preview-shell/inspector-single-options.js';

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
});
