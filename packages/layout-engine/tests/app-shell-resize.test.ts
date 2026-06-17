import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clampPreviewShellWidth,
  clearPreviewShellWidth,
  previewShellWidthToRem,
  readPreviewShellWidth,
  resolvePreviewShellCssLengthPx,
  writePreviewShellWidth,
} from '../src/preview-shell/app-shell-resize.js';

type FakeProbe = {
  style: Record<string, string>;
  getBoundingClientRect: () => { width: number };
  remove: () => void;
};

function createFakeApplication() {
  const fontSizeByInlineSize = new Map<string, number>([
    ['2rem', 32],
    ['12rem', 192],
    ['18rem', 288],
  ]);

  const documentElement: { ownerDocument?: unknown } = {};
  const ownerDocument = {
    documentElement,
    createElement() {
      const probe: FakeProbe = {
        style: {},
        getBoundingClientRect: () => ({
          width: fontSizeByInlineSize.get(probe.style.inlineSize || '') ?? 0,
        }),
        remove: () => {},
      };
      return probe;
    },
  };
  documentElement.ownerDocument = ownerDocument;

  return {
    ownerDocument,
    appendChild<T>(value: T): T {
      return value;
    },
  } as unknown as HTMLElement;
}

afterEach(() => {
  vi.unstubAllGlobals();
  clearPreviewShellWidth('preview-shell-test');
});

describe('preview shell resize helpers', () => {
  it('clamps preview shell widths within min/max bounds', () => {
    expect(clampPreviewShellWidth(5, 10, 30)).toBe(10);
    expect(clampPreviewShellWidth(20, 10, 30)).toBe(20);
    expect(clampPreviewShellWidth(40, 10, 30)).toBe(30);
  });

  it('converts stored widths to rem using the root font size', () => {
    const application = createFakeApplication();
    vi.stubGlobal('window', {
      getComputedStyle: () => ({ fontSize: '20px' }),
    });

    expect(previewShellWidthToRem(application, 50)).toBe('2.5rem');
  });

  it('reads, writes, and clears volatile preview shell widths', () => {
    const application = createFakeApplication();
    vi.stubGlobal('window', {
      getComputedStyle: () => ({ fontSize: '16px' }),
    });

    expect(resolvePreviewShellCssLengthPx(application, '12rem', 100)).toBe(192);

    writePreviewShellWidth(application, 'preview-shell-test', 32);
    expect(readPreviewShellWidth(application, 'preview-shell-test')).toBe(32);

    clearPreviewShellWidth('preview-shell-test');
    expect(readPreviewShellWidth(application, 'preview-shell-test')).toBeNull();
  });
});
