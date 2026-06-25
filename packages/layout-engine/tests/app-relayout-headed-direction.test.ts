import { describe, expect, it } from 'vitest';
import { Direction, Frame, FrameDiagram, createLine } from '../src/frame-model.js';
import { applyPreviewOverridesToFrameTree } from '../src/preview-shell/app-relayout.js';

/**
 * Regression: a direction override on a headed container must be routed to the
 * synthetic body, keeping the outer frame VERTICAL (heading stacked above the
 * body). Heading synthesis runs at parse time, so the live relayout tree is
 * already post-synthesis ([__heading, __body]). Applying the override directly
 * to the outer frame would lay the heading beside the body live, then "revert
 * to vertical" after save+reload because heading synthesis re-forces the outer
 * frame to VERTICAL. Routing the override to the body keeps live consistent
 * with the persisted/reloaded result.
 */
describe('preview relayout - headed container direction override', () => {
  function buildHeadedDiagram(bodyDirection: Direction) {
    const leaf = new Frame({ id: 'define', label: [createLine('Define')] });
    const headingChild = new Frame({ id: 'planning__heading', role: 'heading' });
    const bodyChild = new Frame({
      id: 'planning__body',
      direction: bodyDirection,
      children: [leaf],
    });
    const planning = new Frame({
      id: 'planning',
      heading: createLine('Planning'),
      direction: Direction.VERTICAL,
      children: [headingChild, bodyChild],
    });
    const root = new Frame({ id: 'page', children: [planning] });
    return { diagram: new FrameDiagram({ root }), planning, bodyChild };
  }

  it('routes a HORIZONTAL override to the synthetic body and keeps the outer frame vertical', () => {
    const { diagram, planning, bodyChild } = buildHeadedDiagram(Direction.VERTICAL);

    applyPreviewOverridesToFrameTree(diagram, {
      planning: { direction: 'HORIZONTAL' },
    });

    expect(bodyChild.direction).toBe(Direction.HORIZONTAL);
    // Outer frame stays vertical so the heading remains stacked above the body,
    // matching what heading synthesis produces on reload.
    expect(planning.direction).toBe(Direction.VERTICAL);
  });

  it('routes a VERTICAL override to the synthetic body and keeps the outer frame vertical', () => {
    const { diagram, planning, bodyChild } = buildHeadedDiagram(Direction.HORIZONTAL);

    applyPreviewOverridesToFrameTree(diagram, {
      planning: { direction: 'VERTICAL' },
    });

    expect(bodyChild.direction).toBe(Direction.VERTICAL);
    expect(planning.direction).toBe(Direction.VERTICAL);
  });

  it('applies a direction override directly to a non-headed container', () => {
    const leaf = new Frame({ id: 'a', label: [createLine('A')] });
    const panel = new Frame({
      id: 'panel',
      direction: Direction.VERTICAL,
      children: [leaf],
    });
    const root = new Frame({ id: 'page', children: [panel] });
    const diagram = new FrameDiagram({ root });

    applyPreviewOverridesToFrameTree(diagram, {
      panel: { direction: 'HORIZONTAL' },
    });

    expect(panel.direction).toBe(Direction.HORIZONTAL);
  });
});
