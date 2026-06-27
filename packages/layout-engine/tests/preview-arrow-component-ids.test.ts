import { describe, expect, it } from 'vitest';
import {
  collectPreviewArrowComponentEntries,
  createPreviewArrowComponentId,
  isPreviewArrowComponentId,
  parsePreviewArrowComponentId,
  resolvePreviewArrowComponentId,
} from '../src/preview-arrow-component-ids.js';

describe('preview arrow component ids', () => {
  it('round-trips explicit ids through encoding-safe component ids', () => {
    const componentId = createPreviewArrowComponentId({
      id: 'release->train#2',
      source: 'leaf_a',
      target: 'leaf_b',
    });

    expect(isPreviewArrowComponentId(componentId)).toBe(true);
    expect(parsePreviewArrowComponentId(componentId)).toEqual({
      kind: 'explicit',
      componentId,
      id: 'release->train#2',
    });
  });

  it('round-trips fallback edge ids when source and target contain separators', () => {
    const componentId = createPreviewArrowComponentId(
      {
        source: 'group->alpha#1',
        target: 'beta#2->gamma',
      },
      1,
    );

    expect(isPreviewArrowComponentId(componentId)).toBe(true);
    expect(parsePreviewArrowComponentId(componentId)).toEqual({
      kind: 'edge',
      componentId,
      source: 'group->alpha#1',
      target: 'beta#2->gamma',
      occurrenceIndex: 1,
    });
  });

  it('resolves duplicate edge ids over the authored arrow sequence', () => {
    const arrows = [
      { id: 'named_edge', source: 'leaf_a', target: 'leaf_b' },
      { source: 'leaf_a', target: 'leaf_b' },
      { source: 'leaf_a', target: 'leaf_b' },
    ];
    const [, , secondImplicitArrow] = collectPreviewArrowComponentEntries(arrows);
    const parsedComponentId = parsePreviewArrowComponentId(secondImplicitArrow!.componentId);

    expect(parsedComponentId).toBeTruthy();
    const resolved = resolvePreviewArrowComponentId(parsedComponentId!, arrows, (arrow) => arrow);

    expect(resolved).toMatchObject({
      index: 2,
      occurrenceIndex: 1,
      arrow: arrows[2],
    });
  });

  it('skips raw entries that cannot participate in preview arrow identity matching', () => {
    const entries = [
      { source: 'leaf_a', target: 'leaf_b' },
      { note: 'not an arrow' },
      { source: 'leaf_a', target: 'leaf_b' },
    ];
    const [, secondArrow] = collectPreviewArrowComponentEntries([
      { source: 'leaf_a', target: 'leaf_b' },
      { source: 'leaf_a', target: 'leaf_b' },
    ]);
    const parsedComponentId = parsePreviewArrowComponentId(secondArrow!.componentId);

    expect(parsedComponentId).toBeTruthy();
    const resolved = resolvePreviewArrowComponentId(
      parsedComponentId!,
      entries,
      (entry) => (
        typeof entry === 'object'
        && entry !== null
        && typeof (entry as { source?: unknown }).source === 'string'
        && typeof (entry as { target?: unknown }).target === 'string'
          ? {
            source: String((entry as { source: string }).source),
            target: String((entry as { target: string }).target),
          }
          : null
      ),
    );

    expect(resolved).toMatchObject({
      index: 2,
      occurrenceIndex: 1,
      entry: entries[2],
    });
  });

  it('rejects non-arrow component ids', () => {
    expect(isPreviewArrowComponentId('leaf_a')).toBe(false);
    expect(parsePreviewArrowComponentId('leaf_a')).toBeNull();
  });
});
