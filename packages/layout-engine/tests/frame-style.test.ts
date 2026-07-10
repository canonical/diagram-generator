import { describe, expect, it } from 'vitest';
import {
  applyVisiblePreviewStyleOverride,
  formatPreviewDefinedStyleLabel,
  hasPreviewVisibleStylePicker,
  inferPreviewStyleFromFields,
  isPreviewStructuralWrapper,
  isPreviewStyleableComponentType,
  previewStyleChangeRequiresRelayout,
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

  it('uses the semantic level as the variant authority before raw fill or border defaults', () => {
    expect(inferPreviewStyleFromFields(3, 'WHITE', 'NONE')).toBe('section');
    expect(inferPreviewStyleFromFields('3', 'WHITE', 'NONE')).toBe('section');
    expect(inferPreviewStyleFromFields(2, 'WHITE', 'NONE')).toBe('parent');
    expect(inferPreviewStyleFromFields(1, 'WHITE', 'NONE')).toBe('annotation');

    expect(resolveSingleSelectionPreviewStyleState({
      componentType: 'panel',
      node: {
        level: 3,
        fill: 'WHITE',
        border: 'NONE',
        data: {},
      },
      overrideStyle: '',
      renderedFill: 'transparent',
      renderedStroke: '#000000',
    })).toEqual({
      mode: 'picker',
      currentStyle: 'section',
      originalStyleName: 'section',
    });

    expect(resolveSingleSelectionPreviewStyleState({
      componentType: 'panel',
      node: {
        level: 2,
        fill: 'WHITE',
        border: 'NONE',
        data: {},
      },
      overrideStyle: '',
      renderedFill: '#F3F3F3',
      renderedStroke: '#F3F3F3',
    })).toEqual({
      mode: 'picker',
      currentStyle: 'parent',
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

  it('hides multi-selection style state when any actionable item lacks style support', () => {
    expect(resolveMultiSelectionPreviewStyleState([
      {
        componentType: 'box',
        node: {
          level: 1,
          fill: 'WHITE',
          border: 'SOLID',
          data: {},
        },
      },
      {
        componentType: 'arrow',
        node: {
          data: {},
        },
      },
    ])).toBeNull();

    expect(resolveMultiSelectionPreviewStyleState([
      {
        componentType: 'box',
        node: {
          level: 1,
          fill: 'WHITE',
          border: 'SOLID',
          data: {},
        },
      },
      {
        componentType: 'box',
        node: {
          children: [{}],
          data: {
            fill: 'WHITE',
            border: 'NONE',
          },
        },
      },
    ])).toBeNull();
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

  it('styles highlight as a bordered black leaf so it keeps box height (design parity)', () => {
    // The runtime frame-class contract and docs require highlight to remain a
    // bordered black leaf so it reserves the 64px box minimum. Annotation is
    // the only intentionally borderless style.
    const overrides: Record<string, Record<string, unknown> | undefined> = {};
    expect(applyVisiblePreviewStyleOverride({
      overrides,
      cid: 'box',
      node: { data: {} },
      styleName: 'highlight',
    })).toBe(true);
    expect(overrides.box).toEqual({
      fill: 'BLACK',
      border: 'SOLID',
      style: 'highlight',
    });

    const annotationOverrides: Record<string, Record<string, unknown> | undefined> = {};
    expect(applyVisiblePreviewStyleOverride({
      overrides: annotationOverrides,
      cid: 'note',
      node: { data: {} },
      styleName: 'annotation',
    })).toBe(true);
    expect(annotationOverrides.note).toEqual({
      fill: 'WHITE',
      border: 'NONE',
      style: 'annotation',
    });

    // Round-trip: a bordered black box still infers as highlight (detected by
    // black fill, not by borderlessness), so the picker stays stable on reload.
    expect(inferPreviewStyleFromFields(1, '#000000', '#000000')).toBe('highlight');
  });

  it('treats bordered tier and modifier changes as appearance-only but keeps annotation relayout-triggering', () => {
    const sectionNode = {
      level: 3,
      fill: 'WHITE',
      border: 'SOLID',
      data: {},
    };
    const defaultNode = {
      level: 1,
      fill: 'WHITE',
      border: 'SOLID',
      data: {},
    };

    expect(previewStyleChangeRequiresRelayout({
      node: sectionNode,
      styleName: 'default',
    })).toBe(false);
    expect(previewStyleChangeRequiresRelayout({
      node: defaultNode,
      styleName: 'parent',
    })).toBe(false);
    expect(previewStyleChangeRequiresRelayout({
      node: defaultNode,
      styleName: 'highlight',
    })).toBe(false);
    expect(previewStyleChangeRequiresRelayout({
      node: defaultNode,
      styleName: 'annotation',
    })).toBe(true);
  });

  it('formats defined-style labels from box-style presets', () => {
    const boxStyles = {
      default: { label: 'Child' },
      parent: { label: 'Parent' },
    };

    expect(resolvePreviewBoxStyleLabel(boxStyles, 'parent')).toBe('Parent');
    expect(resolvePreviewBoxStyleLabel(boxStyles, 'missing')).toBe('Unknown variant');
    expect(formatPreviewDefinedStyleLabel({
      boxStyles,
      styleName: 'parent',
    })).toBe('Parent');
    expect(formatPreviewDefinedStyleLabel({
      boxStyles,
      styleName: 'default',
      mixed: true,
    })).toBe('Mixed variants');
  });

  it('renders box-style option html from typed style presets', () => {
    const boxStyles = {
      default: { label: 'Child' },
      highlight: { label: 'Highlight' },
    };

    expect(renderPreviewBoxStyleOptions({
      boxStyles,
      selectedValue: 'highlight',
      originalLabel: 'Child',
    })).toBe(
      '<option value="">Authored variant (Child)</option>'
      + '<option value="default">Child</option>'
      + '<option value="highlight" selected>Highlight</option>',
    );
    expect(renderPreviewBoxStyleOptions({
      boxStyles,
      selectedValue: '',
    })).toContain('Authored variant');
  });
});
