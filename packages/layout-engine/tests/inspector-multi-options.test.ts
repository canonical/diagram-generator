import { describe, expect, it } from 'vitest';
import {
  resolveMultiSelectionInspectorState,
} from '../src/preview-shell/inspector-multi-options.js';

describe('inspector multi option helpers', () => {
  it('resolves view model and mixed alignment/container/sizing state', () => {
    const result = resolveMultiSelectionInspectorState({
      selectedCount: 3,
      info: {
        items: [
          { id: 'a', parentId: 'root', x: 0, y: 0, width: 80, height: 40 },
          { id: 'b', parentId: 'root', x: 120, y: 0, width: 80, height: 40 },
          { id: 'c', parentId: 'root', x: 240, y: 0, width: 80, height: 40 },
        ],
        hasUnsupported: false,
        sameParent: true,
        parentId: 'root',
      },
      parentLayout: {
        layout: 'horizontal',
        layoutColGap: 24,
      },
      fallbackGap: 40,
      snapStep: 8,
      items: [
        {
          id: 'a',
          node: {
            layout: 'horizontal',
            children: [{}],
            align: 'TOP_LEFT',
            sizing_w: 'FIXED',
            sizing_h: 'HUG',
          },
          override: {
            direction: 'HORIZONTAL',
            wrap: true,
            sizing_w: 'FIXED',
            align: 'TOP_LEFT',
          },
          widthCoerced: false,
          heightCoerced: false,
        },
        {
          id: 'b',
          node: {
            layout: 'horizontal',
            children: [{}],
            align: 'CENTER',
            sizing_w: 'FIXED',
            sizing_h: 'FILL',
          },
          override: {
            direction: 'VERTICAL',
            sizing_h: 'FILL',
          },
          widthCoerced: true,
          heightCoerced: false,
        },
        {
          id: 'c',
          node: {
            align: 'CENTER',
            sizing_w: 'HUG',
            sizing_h: 'FILL',
          },
          override: {},
          widthCoerced: false,
          heightCoerced: false,
        },
      ],
    });

    expect(result.viewModel.inferredGap).toBe(24);
    expect(result.viewModel.showStackSpacingHint).toBe(true);
    expect(result.alignState).toEqual({
      align: '',
      mixed: true,
    });
    expect(result.containerState).toBeNull();
    expect(result.sizingState).toEqual({
      sizingW: '',
      sizingH: '',
      wMixed: true,
      hMixed: true,
      wCoerced: false,
      hCoerced: false,
    });
  });
});
