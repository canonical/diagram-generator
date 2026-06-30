import { describe, expect, it } from 'vitest';
import {
  canonicalizePreviewDiagramPath,
  extractPreviewDiagramOptionEntries,
  initPreviewDiagramNavigation,
  normalizePreviewDiagramPath,
  resolveSteppedPreviewDiagramUrl,
  syncPreviewBrowseLinksToPath,
  syncPreviewDiagramPickerToPath,
} from '../src/preview-shell/app-diagram-navigation.js';

function createPicker(values: string[]) {
  const options = values.map((value) => ({
    value,
    selected: false,
  }));
  return {
    options,
    selectedIndex: 0,
    value: '',
    listeners: {} as Record<string, (event: { preventDefault?: () => void; defaultPrevented?: boolean }) => void>,
    addEventListener: function (name: string, listener: (event: { preventDefault?: () => void; defaultPrevented?: boolean }) => void) {
      this.listeners[name] = listener;
    },
    dispatch(name: string, event = {}) {
      this.listeners[name]?.(event);
    },
  } as unknown as HTMLSelectElement;
}

function createButton() {
  const listeners: Array<() => void> = [];
  return {
    listeners,
    addEventListener: (_name: string, listener: () => void) => {
      listeners.push(listener);
    },
    click() {
      listeners.forEach((listener) => listener());
    },
  };
}

describe('preview diagram navigation helpers', () => {
  it('normalizes absolute and relative diagram urls to paths', () => {
    expect(normalizePreviewDiagramPath('/view/alpha', 'http://127.0.0.1:8100')).toBe('/view/alpha');
    expect(normalizePreviewDiagramPath('http://127.0.0.1:8100/force/view/beta', 'http://127.0.0.1:8100')).toBe('/force/view/beta');
    expect(normalizePreviewDiagramPath('http://127.0.0.1:8100/view/v3:alpha', 'http://127.0.0.1:8100')).toBe('/view/v3:alpha');
    expect(canonicalizePreviewDiagramPath('/view/v3:alpha')).toBe('/view/v3:alpha');
  });

  it('extracts unique picker options and falls back to slug labels', () => {
    expect(extractPreviewDiagramOptionEntries([
      { href: '/view/alpha', label: 'Alpha' },
      { href: '/view/alpha', label: 'Ignored duplicate' },
      { href: '/force/view/beta', label: '' },
    ])).toEqual([
      { value: '/view/alpha', label: 'Alpha' },
      { value: '/force/view/beta', label: 'beta' },
    ]);
  });

  it('syncs picker state to the current path and resolves stepped navigation targets', () => {
    const picker = createPicker(['/view/alpha', '/view/beta', '/view/gamma']);
    expect(syncPreviewDiagramPickerToPath(picker, '/view/beta')).toBe(true);
    expect(picker.selectedIndex).toBe(1);
    expect((picker.options[1] as { selected: boolean }).selected).toBe(true);
    expect(resolveSteppedPreviewDiagramUrl(picker, 1)).toBe('/view/gamma');
    expect(resolveSteppedPreviewDiagramUrl(picker, -2)).toBe('');
  });

  it('matches canonical picker values when opened through the canonical v3 route', () => {
    const picker = createPicker(['/view/v3:alpha', '/view/v3:beta']);

    expect(syncPreviewDiagramPickerToPath(picker, '/view/v3:beta')).toBe(true);

    expect(picker.selectedIndex).toBe(1);
    expect(picker.value).toBe('/view/v3:beta');
    expect((picker.options[1] as { selected: boolean }).selected).toBe(true);
  });

  it('toggles browse-link active state and aria-current', () => {
    const states: Record<string, boolean> = {};
    const first = {
      getAttribute(name: string) {
        return name === 'href' ? '/view/alpha' : null;
      },
      classList: {
        toggle(name: string, active: boolean) {
          states[`alpha:${name}`] = active;
        },
      },
      setAttribute(name: string, value: string) {
        states[`alpha:${name}`] = value === 'page';
      },
      removeAttribute(name: string) {
        states[`alpha:${name}`] = false;
      },
    };
    const second = {
      getAttribute(name: string) {
        return name === 'href' ? '/view/beta' : null;
      },
      classList: {
        toggle(name: string, active: boolean) {
          states[`beta:${name}`] = active;
        },
      },
      setAttribute(name: string, value: string) {
        states[`beta:${name}`] = value === 'page';
      },
      removeAttribute(name: string) {
        states[`beta:${name}`] = false;
      },
    };

    syncPreviewBrowseLinksToPath([first, second] as unknown as Element[], '/view/beta');

    expect(states).toEqual({
      'alpha:is-active': false,
      'alpha:aria-current': false,
      'beta:is-active': true,
      'beta:aria-current': true,
    });
  });

  it('toggles canonical browse links when opened through the canonical v3 route', () => {
    const states: Record<string, boolean> = {};
    const link = {
      getAttribute(name: string) {
        return name === 'href' ? '/view/v3:beta' : null;
      },
      classList: {
        toggle(name: string, active: boolean) {
          states[name] = active;
        },
      },
      setAttribute(name: string, value: string) {
        states[name] = value === 'page';
      },
      removeAttribute(name: string) {
        states[name] = false;
      },
    };

    syncPreviewBrowseLinksToPath([link] as unknown as Element[], '/view/v3:beta');

    expect(states).toEqual({
      'is-active': true,
      'aria-current': true,
    });
  });

  it('initializes navigation and wires next/prev stepping', () => {
    const picker = createPicker(['/view/alpha', '/view/beta', '/view/gamma']);
    const prev = createButton();
    const next = createButton();
    const attempts: string[] = [];
    const syncCalls: string[] = [];

    initPreviewDiagramNavigation({
      picker,
      prevButton: prev as unknown as Element,
      nextButton: next as unknown as Element,
      browseLinks: [],
      getCurrentPath: () => '/view/beta',
      syncBrowseNav: () => syncCalls.push('sync'),
      fetchIndexHtml: async () => null,
      attemptNavigation: (nextUrl, syncUi) => {
        attempts.push(nextUrl || '');
        syncUi();
        return true;
      },
      requestAnimationFrameFn: (callback) => callback(),
    } as any);

    expect(picker.selectedIndex).toBe(1);

    picker.value = '/view/gamma';
    picker.dispatch('change');

    next.click();
    prev.click();

    expect(attempts).toEqual(['/view/gamma', '/view/gamma', '/view/alpha']);
    expect(syncCalls).toEqual(['sync', 'sync', 'sync', 'sync', 'sync', 'sync']);
  });
});
