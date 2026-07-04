import { describe, expect, it, vi } from 'vitest';
import {
  applyPreviewWaypointOverridesHost,
  refreshPreviewGridInfoFromLayoutHost,
  refreshPreviewSceneHost,
  rerenderPreviewStageFromModelHost,
  rerenderPreviewStageHost,
  renderPreviewGridOverlayHost,
  runPreviewConstraintValidationHost,
  updatePreviewOverrideSummaryHost,
} from '../src/preview-shell/app-scene-host.js';

describe('preview scene host helpers', () => {
  it('renders the grid overlay through the shared scene host', () => {
    const appendedChildren: unknown[] = [];
    const svg = {
      viewBox: {
        baseVal: {
          width: 640,
          height: 480,
        },
      },
      getAttribute() {
        return null;
      },
      querySelector() {
        return null;
      },
      appendChild(child: unknown) {
        appendedChildren.push(child);
      },
    };
    const created: Array<Record<string, unknown>> = [];
    const document = {
      querySelector(selector: string) {
        return selector === '#stage svg' ? svg : null;
      },
      createElementNS(_namespace: string, tagName: string) {
        const node = {
          tagName,
          style: {},
          attrs: {} as Record<string, string>,
          children: [] as unknown[],
          setAttribute(name: string, value: string) {
            this.attrs[name] = value;
          },
          appendChild(child: unknown) {
            this.children.push(child);
          },
        };
        created.push(node);
        return node;
      },
      getElementById() {
        return null;
      },
    };

    expect(renderPreviewGridOverlayHost({
      document,
      guideMode: 'grid',
      gridInfo: { cols: 8 },
      baselineStep: 24,
      createScene() {
        return {
          shapes: [
            { kind: 'rect', x: '0', y: '0', width: '10', height: '10', fill: '#eee' },
            { kind: 'line', x1: '0', y1: '0', x2: '10', y2: '10', stroke: '#000', strokeWidth: '1' },
          ],
        };
      },
    })).toBe(true);
    expect(appendedChildren).toHaveLength(1);
    expect(created.map((entry) => entry.tagName)).toEqual(['g', 'rect', 'line']);
  });

  it('refreshes grid info and reapplies waypoint overrides through the shared scene host', () => {
    const setDiagramGrid = vi.fn();
    const populateGridControls = vi.fn();
    let nextGridInfo: Record<string, unknown> | null = null;
    const refreshResult = refreshPreviewGridInfoFromLayoutHost({
      document: {
        querySelector(selector: string) {
          if (selector === '#stage svg') {
            return {
              viewBox: {
                baseVal: {
                  width: 320,
                  height: 240,
                },
              },
              getAttribute() {
                return null;
              },
            };
          }
          if (selector === '[data-component-id="page"]') {
            return {
              querySelector() {
                return {
                  getAttribute(name: string) {
                    return name === 'width' ? '400' : '300';
                  },
                };
              },
            };
          }
          return null;
        },
      },
      baselineStep: 24,
      gridOverrides: { cols: 6 },
      fallbackGridInfo: { cols: 4 },
      baseGridInfo: { cols: 4 },
      resolveGridInfo(options) {
        return {
          cols: options.gridOverrides.cols,
          width: options.canvasWidth,
          height: options.canvasHeight,
        };
      },
      setGridInfo(value) {
        nextGridInfo = value;
      },
      setDiagramGrid,
      populateGridControls,
    });

    expect(refreshResult).toEqual({
      cols: 6,
      width: 400,
      height: 300,
    });
    expect(nextGridInfo).toEqual(refreshResult);
    expect(setDiagramGrid).toHaveBeenCalledWith(refreshResult);
    expect(populateGridControls).toHaveBeenCalledTimes(1);

    const arrowNode = { waypoints: null as unknown };
    expect(applyPreviewWaypointOverridesHost({
      overrides: {
        arrow_1: {
          waypoints: [[10, 20]],
        },
      },
      getArrowNode() {
        return arrowNode;
      },
      rebuildArrowSvg: vi.fn(),
    })).toBe(1);
    expect(arrowNode.waypoints).toEqual([[10, 20]]);
  });

  it('updates summary and constraint state and preserves refresh ordering', () => {
    const summaryEl = { textContent: '' };
    const constraintEl = { textContent: '' };
    const orderedCalls: string[] = [];

    expect(updatePreviewOverrideSummaryHost({
      document: {
        getElementById(id: string) {
          return id === 'override-summary' ? summaryEl : null;
        },
      },
      overrideCount: 3,
      formatSummary(count) {
        return `${count} overrides`;
      },
    })).toBe(true);
    expect(summaryEl.textContent).toBe('3 overrides');

    expect(runPreviewConstraintValidationHost({
      document: {
        querySelector() {
          return { tagName: 'svg' };
        },
        getElementById(id: string) {
          return id === 'constraint-status' ? constraintEl : null;
        },
      },
      model: { id: 'root' },
      validateConstraints() {
        return ['violation'];
      },
      summarizeViolations(violations) {
        return {
          errors: violations.length,
          text: 'constraint summary',
        };
      },
      setLastViolations() {
        orderedCalls.push('setLastViolations');
      },
      syncSaveButton() {
        orderedCalls.push('syncSaveButton');
      },
      syncConstraintStatus() {
        orderedCalls.push('syncConstraintStatus');
      },
    })).toEqual(['violation']);

    refreshPreviewSceneHost({
      applyWaypointOverrides: () => orderedCalls.push('applyWaypointOverrides'),
      buildTreeUi: () => orderedCalls.push('buildTreeUi'),
      bindInteraction: () => orderedCalls.push('bindInteraction'),
      applyAllOverrides: () => orderedCalls.push('applyAllOverrides'),
      renderGridOverlay: () => orderedCalls.push('renderGridOverlay'),
      reapplySelection: () => orderedCalls.push('reapplySelection'),
      refreshGridInfo: () => orderedCalls.push('refreshGridInfo'),
      renderSelectionInspector: () => orderedCalls.push('renderSelectionInspector'),
      updateOverrideSummary: () => orderedCalls.push('updateOverrideSummary'),
      refreshTreeColors: () => orderedCalls.push('refreshTreeColors'),
      runConstraints: () => orderedCalls.push('runConstraints'),
      populateGridControls: () => orderedCalls.push('populateGridControls'),
    });

    expect(orderedCalls).toEqual([
      'setLastViolations',
      'syncSaveButton',
      'syncConstraintStatus',
      'applyWaypointOverrides',
      'buildTreeUi',
      'bindInteraction',
      'applyAllOverrides',
      'renderGridOverlay',
      'reapplySelection',
      'refreshGridInfo',
      'renderSelectionInspector',
      'updateOverrideSummary',
      'refreshTreeColors',
      'runConstraints',
      'populateGridControls',
    ]);
  });

  it('rerenders the stage through the shared scene host', async () => {
    const orderedCalls: string[] = [];

    await expect(rerenderPreviewStageHost({
      stage: {
        replaceChildren(child: unknown) {
          orderedCalls.push(`replace:${String((child as { tagName?: string }).tagName ?? 'svg')}`);
        },
      },
      model: {
        gridOverrides: { cols: 8 },
      },
      overrides: {
        alpha: { dx: 8 },
      },
      renderFreshSvg: vi.fn(async () => ({
        svg: { tagName: 'svg' },
        width: 640,
        height: 480,
      })),
      fitRenderedSvgToContent: (_svg, options) => {
        orderedCalls.push(`fit:${options.minWidth}x${options.minHeight}`);
      },
      refreshScene: () => {
        orderedCalls.push('refreshScene');
      },
    })).resolves.toBe(true);

    expect(orderedCalls).toEqual([
      'replace:svg',
      'fit:640x480',
      'refreshScene',
    ]);
  });

  it('rerenders the stage from document/model runtime wiring through the shared scene host', async () => {
    const orderedCalls: string[] = [];

    await expect(rerenderPreviewStageFromModelHost({
      document: {
        getElementById(id: string) {
          if (id !== 'stage') {
            return null;
          }
          return {
            replaceChildren() {
              orderedCalls.push('replaceChildren');
            },
          };
        },
      },
      model: {
        gridOverrides: { cols: 10 },
      },
      overrides: {
        alpha: { dx: 8 },
      },
      renderFreshSvg: vi.fn(async () => {
        orderedCalls.push('renderFreshSvg');
        return {
          svg: { tagName: 'svg' },
          width: 320,
          height: 200,
        };
      }),
      fitRenderedSvgToContent: (_svg, options) => {
        orderedCalls.push(`fit:${options.minWidth}x${options.minHeight}`);
      },
      refreshScene: {
        buildTreeUi: () => orderedCalls.push('buildTreeUi'),
        bindInteraction: () => orderedCalls.push('bindInteraction'),
      },
    })).resolves.toBe(true);

    expect(orderedCalls).toEqual([
      'renderFreshSvg',
      'replaceChildren',
      'fit:320x200',
      'buildTreeUi',
      'bindInteraction',
    ]);
  });
});
