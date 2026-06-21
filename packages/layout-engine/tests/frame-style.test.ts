import { describe, expect, it } from 'vitest';
import {
  applyVisiblePreviewStyleOverride,
  formatPreviewDefinedStyleLabel,
  hasPreviewVisibleStylePicker,
  inferPreviewStyleFromFields,
  isPreviewStructuralWrapper,
  isPreviewStyleableComponentType,
  renderPreviewBoxStyleOptions,
  resolvePreviewBoxStyleLabel,
  resolveMultiSelectionPreviewStyleState,
  resolveSingleSelectionPreviewStyleState,
} from '../src/preview-shell/frame-style.js';

describe('preview-shell frame style helpers', () => {
  it('detects implicit structural wrappers and hides their visible style picker', () => {
    const wrapper = {
      children: [{}],
      data: {
        fill: 'WHITE',
        border: 'NONE',
      },
    };

    expect(isPreviewStructuralWrapper(wrapper)).toBe(true);
    expect(hasPreviewVisibleStylePicker(wrapper)).toBe(false);
    expect(inferPreviewStyleFromFields(1, '#ffffff', 'transparent')).toBe('annotation');
  });

  it('resolves single-selection style state from override, rendered style, and authored base style', () => {
    const state = resolveSingleSelectionPreviewStyleState({
      componentType: 'panel',
      node: {
        level: 2,
        fill: 'GREY',
        border: 'SOLID',
        data: {},
      },
      overrideStyle: '',
      renderedFill: '#000000',
      renderedStroke: 'none',
    });

    expect(state).toEqual({
      mode: 'picker',
      currentStyle: 'highlight',
      originalStyleName: 'parent',
    });
  });

  it('resolves multi-selection style state and original-style mixing for visible styleable items', () => {
    const result = resolveMultiSelectionPreviewStyleState([
      {
        componentType: 'box',
        node: {
          level: 1,
          fill: 'WHITE',
          border: 'SOLID',
          data: {},
        },
        overrideStyle: '',
        renderedFill: '#ffffff',
        renderedStroke: '#111111',
      },
      {
        componentType: 'panel',
        node: {
          level: 2,
          fill: 'GREY',
          border: 'SOLID',
          data: {},
        },
        overrideStyle: 'highlight',
        renderedFill: '#f3f3f3',
        renderedStroke: '#111111',
      },
      {
        componentType: 'arrow',
        node: {
          data: {},
        },
      },
    ]);

    expect(result).toEqual({
      style: '__mixed__',
      mixed: true,
      count: 2,
      originalStyleName: 'default',
      originalStyleMixed: true,
    });
    expect(isPreviewStyleableComponentType('terminal')).toBe(true);
    expect(isPreviewStyleableComponentType('arrow')).toBe(false);
  });

  it('applies visible style overrides while rejecting non-empty styles on structural wrappers', () => {
    const overrides: Record<string, Record<string, unknown> | undefined> = {};

    expect(applyVisiblePreviewStyleOverride({
      overrides,
      cid: 'box',
      node: {
        data: {},
      },
      styleName: 'parent',
    })).toBe(true);
    expect(overrides.box).toEqual({
      level: 2,
      fill: 'GREY',
      border: 'SOLID',
      style: 'parent',
    });

    expect(applyVisiblePreviewStyleOverride({
      overrides,
      cid: 'wrapper',
      node: {
        children: [{}],
        data: {
          fill: 'WHITE',
          border: 'NONE',
        },
      },
      styleName: 'highlight',
    })).toBe(false);
    expect(overrides.wrapper).toBeUndefined();

    expect(applyVisiblePreviewStyleOverride({
      overrides,
      cid: 'wrapper',
      node: {
        children: [{}],
        data: {
          fill: 'WHITE',
          border: 'NONE',
        },
      },
      styleName: '',
    })).toBe(true);
    expect(overrides.wrapper).toEqual({});
  });

  it('formats defined-style labels from box-style presets', () => {
    const boxStyles = {
      default: { label: 'Child' },
      parent: { label: 'Parent' },
    };

    expect(resolvePreviewBoxStyleLabel(boxStyles, 'parent')).toBe('Parent');
    expect(resolvePreviewBoxStyleLabel(boxStyles, 'missing')).toBe('As defined');
    expect(formatPreviewDefinedStyleLabel({
      boxStyles,
      styleName: 'parent',
    })).toBe('— as defined (Parent) —');
    expect(formatPreviewDefinedStyleLabel({
      boxStyles,
      styleName: 'default',
      mixed: true,
    })).toBe('— as defined (mixed) —');
  });

  it('renders box-style option html from typed style presets', () => {
    const boxStyles = {
      default: { label: 'Child' },
      highlight: { label: 'Highlight' },
    };

    expect(renderPreviewBoxStyleOptions({
      boxStyles,
      selectedValue: 'highlight',
      originalLabel: '— as defined (Child) —',
    })).toBe(
      '<option value="">— as defined (Child) —</option>'
      + '<option value="default">Child</option>'
      + '<option value="highlight" selected>Highlight</option>',
    );
  });
});
