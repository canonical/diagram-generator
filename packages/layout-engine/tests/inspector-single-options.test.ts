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
});
