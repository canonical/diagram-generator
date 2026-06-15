import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyPreviewReferenceImageState,
  applyPreviewSplitDirectionState,
  applyPreviewViewModeState,
  normalizePreviewSplitDirection,
  normalizePreviewViewMode,
} from '../src/preview-shell/app-view-modes.js';

class FakeElement {
  attributes: Record<string, string> = {};
  dataset: Record<string, string> = {};
  hidden = false;
  innerHTML = '';
  style: Record<string, string> = {};
  tabIndex = -1;
  title = '';

  constructor(viewMode?: string) {
    if (viewMode) {
      this.dataset.viewMode = viewMode;
    }
  }

  addEventListener() {}

  closest() {
    return null;
  }

  getAttribute(name: string) {
    return this.attributes[name] ?? null;
  }

  removeAttribute(name: string) {
    delete this.attributes[name];
    if (name === 'src') {
      this.attributes.src = '';
    }
  }

  setAttribute(name: string, value: string) {
    this.attributes[name] = value;
  }
}

class FakeImageElement extends FakeElement {
  alt = '';
  src = '';
  wrap: FakeElement | null = null;

  override closest(selector?: string) {
    return selector === '.dg-reference-img-wrap' ? this.wrap : null;
  }

  override removeAttribute(name: string) {
    if (name === 'src') {
      this.src = '';
      return;
    }
    super.removeAttribute(name);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('preview view-mode helpers', () => {
  it('normalizes view modes and split directions', () => {
    expect(normalizePreviewViewMode('input')).toBe('input');
    expect(normalizePreviewViewMode('bad')).toBe('output');
    expect(normalizePreviewSplitDirection('horizontal')).toBe('horizontal');
    expect(normalizePreviewSplitDirection('bad')).toBe('vertical');
  });

  it('applies tab selection state for the active preview mode', () => {
    vi.stubGlobal('HTMLElement', FakeElement);

    const stageShell = new FakeElement() as unknown as HTMLElement;
    const first = new FakeElement('input');
    const second = new FakeElement('both');

    expect(applyPreviewViewModeState(
      stageShell,
      [first as unknown as Element, second as unknown as Element],
      'both',
    )).toBe('both');
    expect(stageShell.dataset.viewMode).toBe('both');
    expect(first.attributes['aria-selected']).toBe('false');
    expect(second.attributes['aria-selected']).toBe('true');
    expect(first.tabIndex).toBe(-1);
    expect(second.tabIndex).toBe(0);
  });

  it('applies split-direction labels and updates reference placeholders', () => {
    vi.stubGlobal('HTMLElement', FakeElement);
    vi.stubGlobal('HTMLImageElement', FakeImageElement);

    const stageShell = new FakeElement() as unknown as HTMLElement;
    const splitToggle = new FakeElement() as unknown as HTMLElement;
    const image = new FakeImageElement() as unknown as HTMLImageElement;
    (image as unknown as FakeImageElement).wrap = new FakeElement();

    expect(applyPreviewSplitDirectionState(stageShell, splitToggle, 'horizontal')).toBe('horizontal');
    expect(stageShell.dataset.splitDirection).toBe('horizontal');
    expect(splitToggle.attributes['aria-label']).toBe('Switch to vertical split');
    expect(splitToggle.title).toBe('Switch to vertical split');

    applyPreviewReferenceImageState(image, 'sample-diagram', false);
    expect((image as unknown as FakeImageElement).alt).toBe('No reference sketch available');
    expect((image as unknown as FakeImageElement).src).toBe('');
    expect((image as unknown as FakeImageElement).wrap?.innerHTML).toContain('No reference sketch');
  });
});
