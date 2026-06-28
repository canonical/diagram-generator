import { describe, expect, it } from 'vitest';

import { Frame, createLine } from '../src/frame-model.js';
import { resolveFrameRenderPlan } from '../src/frame-render-plan.js';
import { lineTopToBaseline } from '../src/text-render-geometry.js';
import { MockTextAdapter } from '../src/text-measure.js';
import { defaultHeadingBottomGap } from '../src/heading-synthesis.js';
import {
  layoutSequenceDiagram,
  normalizeSequenceDiagram,
  renderSequenceDiagramToSvg,
  SHARED_BOX_RHYTHM,
} from '../src/index.js';

function firstMatch(value: string, pattern: RegExp): RegExpMatchArray {
  const match = value.match(pattern);
  expect(match).toBeTruthy();
  return match!;
}

function numericAttr(markup: string, attr: string): number {
  const match = firstMatch(markup, new RegExp(`(?:^|\\s)${attr}="([^"]+)"`));
  return Number(match[1]);
}

describe('cross-document shared box rhythm', () => {
  it('uses the same body font and text inset for frame and sequence boxes', () => {
    const frame = new Frame({
      id: 'frame-box',
      label: [createLine('Shared box')],
    });
    frame._layout.placedX = 48;
    frame._layout.placedY = 48;
    frame._layout.placedW = 176;
    frame._layout.placedH = SHARED_BOX_RHYTHM.minBoxHeight;

    const framePlan = resolveFrameRenderPlan(frame, new MockTextAdapter());
    const frameLine = framePlan.textBlocks[0]?.lines[0];
    expect(frameLine).toBeTruthy();

    const normalized = normalizeSequenceDiagram({
      participants: [{ id: 'participant', label: 'Shared box' }],
      messages: [],
    });
    const layout = layoutSequenceDiagram(normalized.spec);
    const participant = layout.participants[0]!;
    const svg = renderSequenceDiagramToSvg(normalized.spec, layout);
    const sequenceText = firstMatch(svg, /<text[^>]*data-sequence-participant-id|<text[^>]*>/)[0];

    expect(frame.paddingTop).toBe(SHARED_BOX_RHYTHM.textInset);
    expect(frame.paddingLeft).toBe(SHARED_BOX_RHYTHM.textInset);
    expect(frameLine!.size).toBe(String(SHARED_BOX_RHYTHM.bodyFontSize));
    expect(frameLine!.x - frame._layout.placedX).toBe(SHARED_BOX_RHYTHM.textInset);
    expect(frameLine!.y).toBe(lineTopToBaseline(
      frame._layout.placedY + SHARED_BOX_RHYTHM.textInset,
      SHARED_BOX_RHYTHM.bodyFontSize,
    ));

    expect(participant.height).toBe(SHARED_BOX_RHYTHM.minBoxHeight);
    expect(numericAttr(sequenceText, 'font-size')).toBe(SHARED_BOX_RHYTHM.bodyFontSize);
    expect(numericAttr(sequenceText, 'x') - participant.x).toBe(SHARED_BOX_RHYTHM.textInset);
    expect(numericAttr(sequenceText, 'y')).toBeCloseTo(
      lineTopToBaseline(participant.y + SHARED_BOX_RHYTHM.textInset, SHARED_BOX_RHYTHM.bodyFontSize),
      2,
    );
  });

  it('keeps sequence participant, message, group, and note text at the shared body size', () => {
    const normalized = normalizeSequenceDiagram({
      participants: [
        { id: 'client', label: 'Client' },
        { id: 'api', label: 'API' },
      ],
      messages: [
        { id: 'm-request', from: 'client', to: 'api', label: 'Request' },
      ],
      notes: [
        { id: 'note-api', target: 'api', placement: 'right-of', label: 'Shared note' },
      ],
      groups: [
        {
          id: 'group-main',
          label: 'Shared group',
          startMessageId: 'm-request',
          endMessageId: 'm-request',
        },
      ],
    });
    const layout = layoutSequenceDiagram(normalized.spec);
    const svg = renderSequenceDiagramToSvg(normalized.spec, layout);
    const fontSizes = Array.from(svg.matchAll(/font-size="([^"]+)"/g), match => Number(match[1]));

    expect(fontSizes.length).toBeGreaterThan(0);
    expect(new Set(fontSizes)).toEqual(new Set([SHARED_BOX_RHYTHM.bodyFontSize]));
  });

  it('owns headed-frame bottom spacing in the shared rhythm contract', () => {
    expect(defaultHeadingBottomGap()).toBe(SHARED_BOX_RHYTHM.headingBottomGap);
    expect(SHARED_BOX_RHYTHM.headingBottomGap).toBe(8);
  });
});
