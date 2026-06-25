import { describe, expect, it } from 'vitest';
import {
  createPreviewOverrideExportText,
  flattenPreviewTreeEntries,
  formatPreviewOverrideSummary,
  previewTreeHasFrameId,
  resolvePreviewConstraintStatus,
  resolvePreviewDocumentActionState,
  syncPreviewDocumentActionControls,
} from '../src/preview-shell/app-shell-panels.js';

describe('preview shell panel helpers', () => {
  it('flattens tree entries with depth, selection, and override state', () => {
    expect(flattenPreviewTreeEntries([
      {
        id: 'root',
        children: [
          { id: 'alpha' },
          { id: 'beta', children: [{ id: 'beta-child' }] },
        ],
      },
    ], { beta: { dx: 8 } }, ['alpha'])).toEqual([
      { id: 'root', depth: 0, isOverridden: false, isSelected: false },
      { id: 'alpha', depth: 1, isOverridden: false, isSelected: true },
      { id: 'beta', depth: 1, isOverridden: true, isSelected: false },
      { id: 'beta-child', depth: 2, isOverridden: false, isSelected: false },
    ]);
  });

  it('formats override summaries and export text', () => {
    expect(formatPreviewOverrideSummary(0)).toBe('No overrides.');
    expect(formatPreviewOverrideSummary(1)).toBe('1 override');
    expect(formatPreviewOverrideSummary(2)).toBe('2 overrides');
    expect(createPreviewOverrideExportText('demo', {
      alpha: { dx: 8, dy: -8 },
      beta: { dw: 16, dh: 24, waypoints: [{}, {}] },
      gamma: {},
    })).toBe([
      '# Overrides for demo',
      '',
      '# alpha: move x+8 y+-8',
      '# beta: resize w+16 h+24, waypoints: 2',
    ].join('\n'));
    expect(createPreviewOverrideExportText('demo', { gamma: {} })).toBeNull();
  });

  it('resolves constraint-status view state for clean, warning, and error summaries', () => {
    expect(resolvePreviewConstraintStatus({ total: 0, errors: 0, warnings: 0 })).toEqual({
      className: 'build-status build-ok',
      text: 'No violations',
      backgroundColor: '',
      color: '',
      hidden: true,
    });
    expect(resolvePreviewConstraintStatus({ total: 2, errors: 0, warnings: 2 })).toEqual({
      className: 'build-status',
      text: '2 warning(s)',
      backgroundColor: '#3a3a1a',
      color: '#cc6',
      hidden: false,
    });
    expect(resolvePreviewConstraintStatus({ total: 3, errors: 1, warnings: 2 })).toEqual({
      className: 'build-status build-err',
      text: '1 error(s), 2 warning(s)',
      backgroundColor: '',
      color: '',
      hidden: false,
    });
  });

  it('resolves document action visibility from all clearable override state', () => {
    expect(resolvePreviewDocumentActionState({
      frameOverrideCount: 0,
      gridOverrides: {},
      layoutOverrides: {},
      removedIds: [],
      diagnosticsMode: false,
    })).toMatchObject({
      hasClearableState: false,
      showCopyOverrides: false,
      disableClearAll: true,
      disableCopyOverrides: true,
    });

    expect(resolvePreviewDocumentActionState({
      frameOverrideCount: 0,
      gridOverrides: { cols: 8 },
      layoutOverrides: {},
      removedIds: new Set<string>(),
      diagnosticsMode: false,
    })).toMatchObject({
      hasGridOverrides: true,
      hasClearableState: true,
      showCopyOverrides: false,
      disableClearAll: false,
      disableCopyOverrides: true,
    });

    expect(resolvePreviewDocumentActionState({
      frameOverrideCount: 1,
      removedIds: new Set(['alpha']),
    })).toMatchObject({
      hasFrameOverrides: true,
      hasRemovedFrames: true,
      hasClearableState: true,
      showCopyOverrides: true,
      disableClearAll: false,
      disableCopyOverrides: false,
    });
  });

  it('hides copy overrides from focus order until frame overrides or diagnostics exist', () => {
    const attrs = new Map<string, string>();
    const exportButton = {
      disabled: false,
      hidden: false,
      setAttribute(name: string, value: string) {
        attrs.set(name, value);
      },
      removeAttribute(name: string) {
        attrs.delete(name);
      },
    };
    const clearAllButton = {
      disabled: false,
    };
    const document = {
      getElementById(id: string) {
        if (id === 'btn-export') return exportButton;
        if (id === 'btn-clear-all') return clearAllButton;
        return null;
      },
    } as unknown as Document;

    syncPreviewDocumentActionControls({
      document,
      source: {
        frameOverrideCount: 0,
        gridOverrides: {},
        layoutOverrides: {},
        removedIds: [],
      },
    });
    expect(clearAllButton.disabled).toBe(true);
    expect(exportButton.disabled).toBe(true);
    expect(exportButton.hidden).toBe(true);
    expect(attrs.get('tabindex')).toBe('-1');
    expect(attrs.get('aria-hidden')).toBe('true');

    syncPreviewDocumentActionControls({
      document,
      source: {
        frameOverrideCount: 2,
        gridOverrides: {},
        layoutOverrides: {},
        removedIds: [],
      },
    });
    expect(clearAllButton.disabled).toBe(false);
    expect(exportButton.disabled).toBe(false);
    expect(exportButton.hidden).toBe(false);
    expect(attrs.has('tabindex')).toBe(false);
    expect(attrs.has('aria-hidden')).toBe(false);
  });

  it('detects frame ids from rendered tree-item datasets', () => {
    const container = {
      querySelectorAll() {
        return [
          { dataset: { nodeId: 'alpha' } },
          { dataset: { nodeId: 'beta' } },
        ];
      },
    } as unknown as ParentNode;

    expect(previewTreeHasFrameId(container, 'beta')).toBe(true);
    expect(previewTreeHasFrameId(container, 'gamma')).toBe(false);
  });
});
