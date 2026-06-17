import { describe, expect, it } from 'vitest';
import {
  extractPreviewDiagramOptionEntries,
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
  } as unknown as HTMLSelectElement;
}

describe('preview diagram navigation helpers', () => {
  it('normalizes absolute and relative diagram urls to paths', () => {
    expect(normalizePreviewDiagramPath('/view/alpha', 'http://127.0.0.1:8100')).toBe('/view/alpha');
    expect(normalizePreviewDiagramPath('http://127.0.0.1:8100/force/view/beta', 'http://127.0.0.1:8100')).toBe('/force/view/beta');
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
});
