import { describe, expect, it } from 'vitest';
import {
  createPreviewOverrideExportText,
  flattenPreviewTreeEntries,
  formatPreviewOverrideSummary,
  previewTreeHasFrameId,
  resolvePreviewConstraintStatus,
  resolvePreviewConstraintViolationDetails,
  resolvePreviewDocumentActionState,
  syncPreviewConstraintStatus,
  syncPreviewDocumentActionControls,
  syncPreviewPanelVisibility,
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

  it('normalizes constraint diagnostics into inspectable details', () => {
    expect(resolvePreviewConstraintViolationDetails([
      {
        constraintId: 'grid-align',
        componentId: 'page',
        message: 'width=333 is not on 8px grid',
        severity: 'warning',
      },
      {
        rule: 'no-orange-fill',
        frameId: 'child',
        message: 'Orange fill',
        severity: 'error',
      },
      { message: '' },
    ], ['page'])).toEqual([
      {
        constraintId: 'grid-align',
        componentId: 'page',
        message: 'width=333 is not on 8px grid',
        severity: 'warning',
        selected: true,
        hint: 'Snap position and size to the 8px baseline.',
      },
      {
        constraintId: 'no-orange-fill',
        componentId: 'child',
        message: 'Orange fill',
        severity: 'error',
        selected: false,
        hint: 'Use the arrow color only for connectors.',
      },
    ]);
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

  it('syncs panel visibility to hidden, aria-hidden, and nested focus state', () => {
    const sectionAttrs = new Map<string, string>();
    const controlAttrs = new Map<string, string>();
    const control = {
      disabled: false,
      hasAttribute(name: string) {
        return controlAttrs.has(name);
      },
      getAttribute(name: string) {
        return controlAttrs.get(name) ?? null;
      },
      setAttribute(name: string, value: string) {
        controlAttrs.set(name, value);
      },
      removeAttribute(name: string) {
        controlAttrs.delete(name);
      },
    };
    const section = {
      hidden: false,
      inert: false,
      style: { display: '' },
      setAttribute(name: string, value: string) {
        sectionAttrs.set(name, value);
      },
      removeAttribute(name: string) {
        sectionAttrs.delete(name);
      },
      querySelectorAll() {
        return [control];
      },
    };
    const document = {
      getElementById(id: string) {
        return id === 'layout-params-section' ? section : null;
      },
    } as unknown as Document;

    syncPreviewPanelVisibility({
      document,
      visibility: [{
        id: 'elk-layout',
        owner: '',
        visible: false,
        disabled: false,
        reason: '',
      }],
    });
    expect(section.hidden).toBe(true);
    expect(section.inert).toBe(true);
    expect(section.style.display).toBe('none');
    expect(sectionAttrs.get('aria-hidden')).toBe('true');
    expect(control.disabled).toBe(true);
    expect(controlAttrs.get('tabindex')).toBe('-1');

    syncPreviewPanelVisibility({
      document,
      visibility: [{
        id: 'elk-layout',
        owner: '',
        visible: true,
        disabled: false,
        reason: '',
      }],
    });
    expect(section.hidden).toBe(false);
    expect(section.inert).toBe(false);
    expect(section.style.display).toBe('');
    expect(sectionAttrs.has('aria-hidden')).toBe(false);
    expect(control.disabled).toBe(false);
    expect(controlAttrs.has('tabindex')).toBe(false);
  });

  it('syncs constraint diagnostics with section hidden and focus state', () => {
    class FakeElement {
      id = '';
      hidden = false;
      inert = false;
      disabled = false;
      textContent = '';
      className = '';
      style: Record<string, string> = {};
      outerHTML = '';
      removed = false;
      attrs = new Map<string, string>();
      controls: FakeElement[] = [];
      details: FakeElement | null = null;
      closestTarget: FakeElement | null = null;
      ownerDocument = {
        createElement: () => new FakeElement(),
      };

      hasAttribute(name: string) {
        return this.attrs.has(name);
      }

      getAttribute(name: string) {
        return this.attrs.get(name) ?? null;
      }

      setAttribute(name: string, value: string) {
        this.attrs.set(name, value);
      }

      removeAttribute(name: string) {
        this.attrs.delete(name);
      }

      querySelector(selector: string) {
        return selector === '#constraint-details' ? this.details : null;
      }

      querySelectorAll() {
        return this.controls;
      }

      closest() {
        return this.closestTarget;
      }

      appendChild(child: FakeElement) {
        this.details = child;
        return child;
      }

      remove() {
        this.removed = true;
      }
    }

    const originalHTMLElement = (globalThis as { HTMLElement?: unknown }).HTMLElement;
    (globalThis as { HTMLElement?: unknown }).HTMLElement = FakeElement;

    try {
      const status = new FakeElement();
      const section = new FakeElement();
      const control = new FakeElement();
      status.closestTarget = section;
      section.hidden = true;
      section.inert = true;
      section.attrs.set('aria-hidden', 'true');
      section.controls = [control];
      control.disabled = true;
      control.attrs.set('tabindex', '-1');
      control.attrs.set('data-dg-prev-tabindex', '');
      control.attrs.set('data-dg-panel-disabled', '1');

      syncPreviewConstraintStatus(
        status as unknown as HTMLElement,
        { total: 1, errors: 0, warnings: 1 },
        {
          selectedIds: ['page'],
          violations: [{
            constraintId: 'grid-align',
            componentId: 'page',
            message: 'width is not on grid',
            severity: 'warning',
          }],
        },
      );

      expect(section.hidden).toBe(false);
      expect(section.inert).toBe(false);
      expect(section.attrs.has('aria-hidden')).toBe(false);
      expect(control.disabled).toBe(false);
      expect(control.attrs.has('tabindex')).toBe(false);
      expect(section.details?.outerHTML).toContain('data-dg-component-id="page"');
      expect(section.details?.outerHTML).toContain('selected');

      syncPreviewConstraintStatus(status as unknown as HTMLElement, { total: 0, errors: 0, warnings: 0 });

      expect(section.hidden).toBe(true);
      expect(section.inert).toBe(true);
      expect(section.attrs.get('aria-hidden')).toBe('true');
      expect(section.details?.removed).toBe(true);
    } finally {
      if (originalHTMLElement) {
        (globalThis as { HTMLElement?: unknown }).HTMLElement = originalHTMLElement;
      } else {
        delete (globalThis as { HTMLElement?: unknown }).HTMLElement;
      }
    }
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
