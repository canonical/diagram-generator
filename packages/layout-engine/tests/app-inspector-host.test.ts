import { describe, expect, it } from 'vitest';
import {
  createPreviewMissingInspectorMarkup,
  normalizePreviewInspectorWidthUnit,
  renderPreviewSingleSelectionInspector,
} from '../src/preview-shell/app-inspector-host.js';

describe('preview inspector host helpers', () => {
  it('falls back to px width units when grid columns are unavailable', () => {
    expect(normalizePreviewInspectorWidthUnit('cols', null)).toBe('px');
    expect(normalizePreviewInspectorWidthUnit('cols', { col_widths: [] })).toBe('px');
    expect(normalizePreviewInspectorWidthUnit('cols', { col_widths: [120] })).toBe('cols');
    expect(normalizePreviewInspectorWidthUnit('px', { col_widths: [120] })).toBe('px');
  });

  it('renders a missing-component fallback when neither node nor arrow data exist', () => {
    expect(createPreviewMissingInspectorMarkup('ghost')).toContain('ghost');
    expect(createPreviewMissingInspectorMarkup(`ghost"><img src=x onerror=alert(1)>`))
      .not.toContain('<img');
    expect(renderPreviewSingleSelectionInspector({
      cid: 'ghost',
      ownDelta: { dx: 0, dy: 0, dw: 0, dh: 0 },
      effectiveDelta: { dx: 0, dy: 0 },
    })).toContain('not found');
  });

  it('renders a single-selection panel with autolayout and style controls', () => {
    const html = renderPreviewSingleSelectionInspector({
      cid: 'frame-1',
      node: {
        align: 'CENTER',
        layout: null,
        data: {
          level: 2,
          fill: 'GREY',
          border: 'SOLID',
          width: 120,
          height: 80,
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
      widthUnit: 'px',
      heightUnit: 'px',
      baselineStep: 8,
      renderStyleOptions: (currentStyle, originalStyleName) =>
        `<option>${currentStyle}|${originalStyleName}</option>`,
    });

    expect(html).toContain('setFrameAlign(&quot;frame-1&quot;,&quot;CENTER&quot;)');
    expect(html).toContain('Sizing');
    expect(html).toContain('applyStyleOverride(&quot;frame-1&quot;');
    expect(html).toContain('highlight|parent');
  });
});
