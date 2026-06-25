import { describe, expect, it } from 'vitest';
import { renderMultiSelectionInspectorPanel } from '../src/preview-shell/inspector-multi-panel.js';

describe('multi-selection inspector panel renderer', () => {
  it('renders distribution controls and stack hint for normal multi-selection', () => {
    const html = renderMultiSelectionInspectorPanel({
      selectedCount: 3,
      multiActionGap: 24,
      showStackSpacingHint: true,
      showAlignOnlyHint: false,
      hasUnsupported: false,
    });

    expect(html).toContain('data-dg-panel-group="selection" data-dg-panel-id="multi-selection"');
    expect(html).toContain('data-dg-panel-group="arrangement" data-dg-panel-id="multi-arrangement"');
    expect(html).toContain('3 components');
    expect(html).toContain('Stack spacing');
    expect(html).toContain('id="multi-action-gap"');
    expect(html).toContain('data-dg-input-action="multi-gap"');
    expect(html).toContain('data-dg-click-action="distribute-selection"');
    expect(html).toContain('data-dg-axis="x"');
    expect(html).toContain('data-dg-mode="bottom"');
    expect(html).not.toContain('onclick=');
    expect(html).not.toContain('oninput=');
  });

  it('renders mixed align/container/sizing states and read-only variant state', () => {
    const html = renderMultiSelectionInspectorPanel({
      selectedCount: 2,
      multiActionGap: 16,
      showStackSpacingHint: false,
      showAlignOnlyHint: true,
      hasUnsupported: true,
      alignState: {
        align: '',
        mixed: true,
      },
      containerState: {
        containerCount: 2,
        direction: '',
        dirMixed: true,
        wrap: true,
      },
      sizingState: {
        sizingW: 'FIXED',
        sizingH: 'FIXED',
        wMixed: false,
        hMixed: false,
        wCoerced: true,
        hCoerced: false,
      },
      styleState: {
        count: 2,
        mixed: true,
        style: '__mixed__',
      },
      widthUnit: 'cols',
      heightUnit: 'rows',
      showWidthColsOption: true,
      styleOptionsHtml: '<option value="panel">Panel</option>',
    });

    expect(html).toContain('data-dg-panel-group="layout" data-dg-panel-id="multi-layout"');
    expect(html).toContain('data-dg-panel-group="sizing" data-dg-panel-id="multi-sizing"');
    expect(html).toContain('data-dg-panel-group="appearance" data-dg-panel-id="multi-appearance"');
    expect(html).toContain('Distribute is limited to sibling components');
    expect(html).toContain('Arrow selections are ignored by these actions.');
    expect(html).toContain('<option value="" selected>Mixed</option>');
    expect(html).toContain('Auto-layout (2 containers)');
    expect(html).toContain('Fixed (auto)');
    expect(html).toContain('<option value="cols" selected>cols</option>');
    expect(html).toContain('<option value="rows" selected>rows</option>');
    expect(html).toContain('Variant (2 boxes)');
    expect(html).toContain('Mixed variants');
    expect(html).not.toContain('data-dg-change-action="multi-style"');
    expect(html).not.toContain('<option value="panel">Panel</option>');
  });

  it('renders horizontal wrap and fixed-height placeholder controls', () => {
    const html = renderMultiSelectionInspectorPanel({
      selectedCount: 4,
      multiActionGap: 8,
      showStackSpacingHint: false,
      showAlignOnlyHint: false,
      hasUnsupported: false,
      containerState: {
        containerCount: 1,
        direction: 'HORIZONTAL',
        dirMixed: false,
        wrap: true,
      },
      sizingState: {
        sizingW: 'HUG',
        sizingH: 'FIXED',
        wMixed: false,
        hMixed: false,
        wCoerced: false,
        hCoerced: true,
      },
      widthUnit: 'px',
      heightUnit: 'px',
      showWidthColsOption: false,
    });

    expect(html).toContain('data-dg-panel-group="layout" data-dg-panel-id="multi-layout"');
    expect(html).toContain('data-dg-panel-group="sizing" data-dg-panel-id="multi-sizing"');
    expect(html).toContain('data-dg-change-action="multi-prop"');
    expect(html).toContain('data-dg-prop="wrap"');
    expect(html).toContain('type="checkbox" checked');
    expect(html).toContain('placeholder="px"');
    expect(html).toContain('data-dg-change-action="multi-size"');
    expect(html).toContain('data-dg-dimension="height"');
    expect(html).toContain('dg-coerced');
  });
});
