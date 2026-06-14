import { describe, expect, it } from 'vitest';
import {
  createNudgeOverrideEntries,
  isNudgeKey,
} from '../src/preview-shell/interaction-keyboard.js';

describe('interaction keyboard helpers', () => {
  it('identifies supported nudge keys', () => {
    expect(isNudgeKey('ArrowUp')).toBe(true);
    expect(isNudgeKey('ArrowRight')).toBe(true);
    expect(isNudgeKey('Enter')).toBe(false);
  });

  it('creates nudged override entries while preserving size deltas', () => {
    expect(createNudgeOverrideEntries({
      items: [
        { id: 'a', dx: 8, dy: -8, dw: 10, dh: 12 },
        { id: 'b', dx: 0, dy: 0, dw: -4, dh: 6 },
      ],
      key: 'ArrowLeft',
      step: 24,
    })).toEqual([
      { id: 'a', dx: -16, dy: -8, dw: 10, dh: 12 },
      { id: 'b', dx: -24, dy: 0, dw: -4, dh: 6 },
    ]);
  });
});
