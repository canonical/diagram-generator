import { describe, expect, it } from 'vitest';
import { renderSingleSelectionInspectorPanel } from '../src/preview-shell/inspector-single-panel.js';

describe('single-selection inspector panel renderer', () => {
  it('renders controls, overrides, picker, violations, and move/resize note', () => {
    const html = renderSingleSelectionInspectorPanel({
      cid: 'box-1',
      viewModel: {
        currentAlign: 'CENTER',
        hasMoveOverride: true,
        hasSizeOverride: true,
        hasWaypointOverride: false,
        hasAnyOverride: true,
        hasParentOverride: true,
        waypointCount: 0,
        isArrowComponent: false,
        isAutolayoutChild: false,
        showStackSpacingHint: false,
        noteKind: 'move-resize',
      },
      ownDelta: { dx: 16, dy: -8, dw: 24, dh: 0 },
      effectiveDelta: { dx: 32, dy: 0 },
      autolayoutPanelHtml: '<div class="auto-panel">Sizing</div>',
      styleMode: 'picker',
      styleOptionsHtml: '<option value="panel" selected>Panel</option>',
      violations: [
        { message: 'Width exceeded', severity: 'error' },
        { message: 'Gap coerced', severity: 'warning' },
      ],
    });

    expect(html).toContain('data-dg-panel-group="layout" data-dg-panel-id="single-layout"');
    expect(html).toContain('data-dg-panel-group="position" data-dg-panel-id="single-position"');
    expect(html).toContain('data-dg-panel-group="appearance" data-dg-panel-id="single-appearance"');
    expect(html).toContain('data-dg-panel-group="diagnostics" data-dg-panel-id="single-diagnostics"');
    expect(html).toContain('data-dg-click-action="single-align"');
    expect(html).toContain('data-dg-cid="box-1"');
    expect(html).toContain('data-dg-align="CENTER"');
    expect(html).toContain('<span class="value">Center</span>');
    expect(html).toContain('<div class="auto-panel">Sizing</div>');
    expect(html).toContain('dx=16  dy=-8');
    expect(html).toContain('dw=24  dh=0');
    expect(html).toContain('dx=32  dy=0');
    expect(html).toContain('data-dg-click-action="clear-override"');
    expect(html).toContain('data-dg-change-action="single-style"');
    expect(html).toContain('Width exceeded');
    expect(html).toContain('Gap coerced');
    expect(html).toContain('Drag to move');
    expect(html).not.toContain('onclick=');
    expect(html).not.toContain('onchange=');
  });

  it('renders structural wrapper hint, waypoint override, and stack note', () => {
    const html = renderSingleSelectionInspectorPanel({
      cid: 'arrow-1',
      viewModel: {
        currentAlign: 'TOP_LEFT',
        hasMoveOverride: false,
        hasSizeOverride: false,
        hasWaypointOverride: true,
        hasAnyOverride: true,
        hasParentOverride: false,
        waypointCount: 3,
        isArrowComponent: true,
        isAutolayoutChild: true,
        showStackSpacingHint: true,
        noteKind: 'reorder-child',
      },
      ownDelta: { dx: 0, dy: 0, dw: 0, dh: 0 },
      effectiveDelta: { dx: 0, dy: 0 },
      styleMode: 'structural',
      violations: [],
    });

    expect(html).toContain('Waypoints');
    expect(html).toContain('3 (overridden)');
    expect(html).toContain('Structural wrapper');
    expect(html).toContain('Stack spacing');
    expect(html).toContain('Drag to reorder');
  });

  it('renders the controls error fallback instead of control markup', () => {
    const html = renderSingleSelectionInspectorPanel({
      cid: 'box-2',
      viewModel: {
        currentAlign: 'TOP_RIGHT',
        hasMoveOverride: false,
        hasSizeOverride: false,
        hasWaypointOverride: false,
        hasAnyOverride: false,
        hasParentOverride: false,
        waypointCount: 0,
        isArrowComponent: false,
        isAutolayoutChild: false,
        showStackSpacingHint: false,
        noteKind: 'move-resize',
      },
      ownDelta: { dx: 0, dy: 0, dw: 0, dh: 0 },
      effectiveDelta: { dx: 0, dy: 0 },
      controlsErrorMessage: 'boom',
      autolayoutPanelHtml: '<div>ignored</div>',
      styleMode: 'none',
    });

    expect(html).toContain('Inspector controls failed: boom');
    expect(html).toContain('data-dg-panel-id="single-controls-error"');
    expect(html).not.toContain('ignored');
    expect(html).not.toContain('data-dg-click-action="single-align"');
  });

  it('escapes dynamic ids and messages before injecting them into markup', () => {
    const html = renderSingleSelectionInspectorPanel({
      cid: `box'"<&`,
      viewModel: {
        currentAlign: 'CENTER',
        hasMoveOverride: false,
        hasSizeOverride: false,
        hasWaypointOverride: false,
        hasAnyOverride: true,
        hasParentOverride: false,
        waypointCount: 0,
        isArrowComponent: false,
        isAutolayoutChild: false,
        showStackSpacingHint: false,
        noteKind: 'move-resize',
      },
      ownDelta: { dx: 0, dy: 0, dw: 0, dh: 0 },
      effectiveDelta: { dx: 0, dy: 0 },
      controlsErrorMessage: `boom <bad>`,
      violations: [{ message: `warn "quoted"` }],
      styleMode: 'none',
    });

    expect(html).toContain('boom &lt;bad&gt;');
    expect(html).toContain('warn &quot;quoted&quot;');
    expect(html).toContain('data-dg-cid="box&#39;&quot;&lt;&amp;"');
  });
});
