import { describe, expect, it } from 'vitest';
import {
  createPreviewOverrideExportText,
  flattenPreviewTreeEntries,
  formatPreviewOverrideSummary,
  previewTreeHasFrameId,
  resolvePreviewConstraintStatus,
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
    });
    expect(resolvePreviewConstraintStatus({ total: 2, errors: 0, warnings: 2 })).toEqual({
      className: 'build-status',
      text: '2 warning(s)',
      backgroundColor: '#3a3a1a',
      color: '#cc6',
    });
    expect(resolvePreviewConstraintStatus({ total: 3, errors: 1, warnings: 2 })).toEqual({
      className: 'build-status build-err',
      text: '1 error(s), 2 warning(s)',
      backgroundColor: '',
      color: '',
    });
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
