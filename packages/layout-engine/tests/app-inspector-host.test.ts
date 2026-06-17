import { describe, expect, it } from 'vitest';
import {
  createPreviewMissingInspectorMarkup,
  normalizePreviewInspectorWidthUnit,
  renderPreviewEmptyInspectorHost,
  renderPreviewMultiSelectionInspectorHost,
  renderPreviewMultiSelectionInspectorRuntimeHost,
  renderPreviewSelectionInspectorHost,
  renderPreviewSingleSelectionInspector,
  renderPreviewSingleSelectionInspectorRuntimeHost,
  renderPreviewSingleSelectionInspectorHost,
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

    expect(html).toContain('data-dg-click-action="single-align"');
    expect(html).toContain('Sizing');
    expect(html).toContain('data-dg-change-action="single-style"');
    expect(html).toContain('highlight|parent');
  });

  it('renders host markup into the provided inspector container', () => {
    const inspector = { innerHTML: '' };
    expect(renderPreviewEmptyInspectorHost(inspector)).toBe(true);
    expect(inspector.innerHTML).toContain('Click a component');

    expect(renderPreviewSingleSelectionInspectorHost({
      inspector,
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
      override: { style: '' },
      ownDelta: { dx: 0, dy: 0, dw: 0, dh: 0 },
      effectiveDelta: { dx: 0, dy: 0 },
      componentType: 'panel',
      renderedStyle: {
        fill: '#000000',
        stroke: 'none',
      },
      renderStyleOptions: () => '<option>styled</option>',
    })).toBe(true);
    expect(inspector.innerHTML).toContain('data-dg-change-action="single-style"');
  });

  it('renders the multi-selection host panel and returns the inferred gap', () => {
    const inspector = { innerHTML: '' };
    const result = renderPreviewMultiSelectionInspectorHost({
      inspector,
      selectedCount: 2,
      info: {
        items: [
          { id: 'alpha', parentId: 'root', x: 0, y: 0, width: 80, height: 40 },
          { id: 'beta', parentId: 'root', x: 120, y: 0, width: 80, height: 40 },
        ],
        hasUnsupported: false,
        sameParent: true,
        parentId: 'root',
      },
      parentLayout: null,
      fallbackGap: 24,
      snapStep: 8,
      items: [
        { id: 'alpha', node: { layout: null, data: { width: 80, height: 40 } }, override: {} },
        { id: 'beta', node: { layout: null, data: { width: 80, height: 40 } }, override: {} },
      ],
      styleState: {
        count: 2,
        mixed: false,
        style: 'highlight',
      },
      widthUnit: 'px',
      heightUnit: 'px',
      showWidthColsOption: false,
      styleOptionsHtml: '<option>highlight</option>',
    });

    expect(result).toEqual({
      kind: 'rendered',
      inferredGap: 40,
    });
    expect(inspector.innerHTML).toContain('Selection');
    expect(inspector.innerHTML).toContain('highlight');
  });

  it('routes selection inspector rendering to empty, single, or multi owners', () => {
    const actions: unknown[] = [];

    renderPreviewSelectionInspectorHost({
      resolvePrimaryId() {
        return null;
      },
      selectedCount: 0,
      renderEmptyInspector() {
        actions.push('empty');
      },
      renderSingleSelectionInspector(cid) {
        actions.push({ single: cid });
      },
      renderMultiSelectionInspector() {
        actions.push('multi');
      },
    });
    renderPreviewSelectionInspectorHost({
      preferredId: 'alpha',
      resolvePrimaryId(preferredId) {
        return preferredId || null;
      },
      selectedCount: 1,
      renderEmptyInspector() {
        actions.push('empty');
      },
      renderSingleSelectionInspector(cid) {
        actions.push({ single: cid });
      },
      renderMultiSelectionInspector() {
        actions.push('multi');
      },
    });
    renderPreviewSelectionInspectorHost({
      preferredId: 'alpha',
      resolvePrimaryId(preferredId) {
        return preferredId || null;
      },
      selectedCount: 2,
      renderEmptyInspector() {
        actions.push('empty');
      },
      renderSingleSelectionInspector(cid) {
        actions.push({ single: cid });
      },
      renderMultiSelectionInspector() {
        actions.push('multi');
      },
    });

    expect(actions).toEqual([
      'empty',
      { single: 'alpha' },
      'multi',
    ]);
  });

  it('builds multi-selection runtime state through the inspector host wrapper', () => {
    const inspector = { innerHTML: '' };
    const result = renderPreviewMultiSelectionInspectorRuntimeHost({
      inspector,
      selectedCount: 2,
      info: {
        items: [
          { id: 'alpha', parentId: 'root', x: 0, y: 0, width: 80, height: 40 },
          { id: 'beta', parentId: 'root', x: 120, y: 0, width: 80, height: 40 },
        ],
        hasUnsupported: false,
        sameParent: true,
        parentId: 'root',
      },
      getNode(id) {
        if (id === 'root') {
          return {
            layout: 'row',
            layoutGap: 24,
            layoutRowGap: 24,
            layoutColGap: 24,
          };
        }
        return null;
      },
      fallbackGap: 24,
      snapStep: 8,
      resolveMultiStyleState() {
        return {
          count: 2,
          mixed: false,
          style: 'highlight',
          originalStyleName: 'parent',
          originalStyleMixed: false,
        };
      },
      items: [
        { id: 'alpha', node: { layout: null, data: { width: 80, height: 40 } }, override: {} },
        { id: 'beta', node: { layout: null, data: { width: 80, height: 40 } }, override: {} },
      ],
      widthUnit: 'px',
      heightUnit: 'px',
      showWidthColsOption: false,
      renderStyleOptions(styleState) {
        return `<option>${styleState.style}|${styleState.originalStyleName}</option>`;
      },
    });

    expect(result).toEqual({
      kind: 'rendered',
      inferredGap: 40,
    });
    expect(inspector.innerHTML).toContain('highlight|parent');
  });

  it('builds single-selection runtime state through the inspector host wrapper', () => {
    const inspector = { innerHTML: '' };
    expect(renderPreviewSingleSelectionInspectorRuntimeHost({
      inspector,
      cid: 'frame-1',
      getNode() {
        return {
          align: 'CENTER',
          layout: null,
          data: {
            level: 2,
            fill: 'GREY',
            border: 'SOLID',
            width: 120,
            height: 80,
          },
        };
      },
      getArrowNode() {
        return null;
      },
      getOverride() {
        return { style: '' };
      },
      getOwnDelta() {
        return { dx: 0, dy: 0, dw: 0, dh: 0 };
      },
      getEffectiveDelta() {
        return { dx: 0, dy: 0 };
      },
      getComponentType() {
        return 'panel';
      },
      getParentLayout() {
        return null;
      },
      getRenderedStyle() {
        return {
          fill: '#000000',
          stroke: 'none',
        };
      },
      getViolations() {
        return [];
      },
      renderStyleOptions() {
        return '<option>styled</option>';
      },
    })).toBe(true);
    expect(inspector.innerHTML).toContain('data-dg-change-action="single-style"');
  });
});
