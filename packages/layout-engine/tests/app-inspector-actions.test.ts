import { describe, expect, it, vi } from 'vitest';

import {
  bindPreviewInspectorActions,
  dispatchPreviewInspectorClickAction,
  dispatchPreviewInspectorInputAction,
  readPreviewInspectorActionValue,
  resolvePreviewInspectorActionElement,
} from '../src/preview-shell/app-inspector-actions.js';

function createBindingOptions() {
  return {
    warnUnknownAction: vi.fn(),
    setFrameAlign: vi.fn(),
    clearOverride: vi.fn(),
    alignSelection: vi.fn(),
    distributeSelection: vi.fn(),
    setMultiFrameAlign: vi.fn(),
    applyStyleOverride: vi.fn(),
    setFrameProp: vi.fn(),
    setFrameSize: vi.fn(),
    setWidthUnit: vi.fn(),
    setHeightUnit: vi.fn(),
    applyMultiStyleOverride: vi.fn(),
    setMultiFrameProp: vi.fn(),
    setMultiFrameSize: vi.fn(),
    setMultiActionGap: vi.fn(),
  };
}

describe('preview inspector action host helpers', () => {
  it('resolves delegated action elements structurally without DOM instance checks', () => {
    const actionEl = { dataset: { dgClickAction: 'single-align' } };
    const resolved = resolvePreviewInspectorActionElement({
      target: {
        closest(selector: string) {
          return selector === '[data-dg-click-action]' ? actionEl : null;
        },
      },
    }, 'data-dg-click-action');

    expect(resolved).toBe(actionEl);
  });

  it('reads typed control values from dataset metadata', () => {
    expect(readPreviewInspectorActionValue({ value: '12', dataset: { dgValueType: 'int' } })).toBe(12);
    expect(readPreviewInspectorActionValue({ value: '2.5', dataset: { dgValueType: 'float' } })).toBe(2.5);
    expect(readPreviewInspectorActionValue({ checked: true, dataset: { dgValueType: 'checked' } })).toBe(true);
  });

  it('dispatches click and input actions through the bound callbacks', () => {
    const options = createBindingOptions();

    dispatchPreviewInspectorClickAction(
      { dataset: { dgClickAction: 'single-align', dgCid: 'alpha', dgAlign: 'CENTER' } },
      options,
    );
    dispatchPreviewInspectorInputAction(
      { dataset: { dgInputAction: 'multi-gap' }, value: '24' },
      options,
    );

    expect(options.setFrameAlign).toHaveBeenCalledWith('alpha', 'CENTER');
    expect(options.setMultiActionGap).toHaveBeenCalledWith('24');
  });

  it('binds inspector listeners exactly once and handles enter-commit blur', () => {
    const listeners = new Map<string, (event: Record<string, unknown>) => void>();
    let blurCalled = false;
    const options = createBindingOptions();

    const firstBound = bindPreviewInspectorActions({
      ...options,
      inspector: {
        addEventListener(type, listener) {
          listeners.set(type, listener as (event: Record<string, unknown>) => void);
        },
      },
      alreadyBound: false,
    });

    const secondBound = bindPreviewInspectorActions({
      ...options,
      inspector: {
        addEventListener() {
          throw new Error('should not bind twice');
        },
      },
      alreadyBound: true,
    });

    expect(firstBound).toBe(true);
    expect(secondBound).toBe(true);
    expect(listeners.size).toBe(4);

    listeners.get('keydown')?.({
      key: 'Enter',
      preventDefault() {},
      stopPropagation() {},
      target: {
        closest() {
          return {
            getAttribute(name: string) {
              return name === 'data-dg-enter-commit' ? '1' : null;
            },
            blur() {
              blurCalled = true;
            },
          };
        },
      },
    });

    expect(blurCalled).toBe(true);
  });
});
