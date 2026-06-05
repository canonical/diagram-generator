/**
 * Convert frame `heading:` into synthetic __heading / __body children.
 *
 * ## Propagation contract (spec 005 WS3)
 *
 * Authored headed containers expose **one** author-facing `gap` on the parent:
 * spacing between the title row and the content stack. Do not add separate
 * header/body gap controls.
 *
 * | Field        | Authored parent | __heading | __body |
 * |--------------|-----------------|-----------|--------|
 * | gap          | title gap       | —         | `stack_gap` legacy or INSET default (content stack only) |
 * | align        | —               | —         | yes    |
 * | direction    | may become VERTICAL when parent was HORIZONTAL | — | preserves horizontal body when parent was horizontal |
 * | wrap         | parent only     | no        | **no** (not inherited) |
 * | justify      | parent only (heading vs body) | no | **no** (packed default) |
 * | fill_weight  | parent only     | no        | **no** (default 1) |
 *
 * `stack_gap` in YAML is legacy plumbing for the inner content stack; prefer
 * the single parent `gap` for title spacing.
 */

import {
  Frame,
  Direction,
  Sizing,
  Border,
  Fill,
  type Line,
} from './frame-model.js';
import { ICON_SIZE, INSET } from './tokens.js';

export function findSyntheticBody(frame: Frame): Frame | undefined {
  return frame.children.find(
    c => c.id === '__body' || (c.id?.endsWith('__body') ?? false),
  );
}

export function applyHeadingAsChild(
  frame: Frame,
  heading: Line,
  options?: { icon?: string; iconFill?: string; stackGap?: number },
): void {
  if (!frame.isContainer) return;

  const headingFill = frame.fill === Fill.BLACK ? Fill.BLACK : Fill.WHITE;
  let headingIconFill = options?.iconFill;
  if (frame.fill === Fill.BLACK && !headingIconFill) {
    headingIconFill = '#FFFFFF';
  }

  const headingChild = new Frame({
    id: frame.id ? `${frame.id}__heading` : '__heading',
    role: 'heading',
    sizingW: Sizing.FILL,
    sizingH: Sizing.HUG,
    minHeight: ICON_SIZE,
    border: Border.NONE,
    fill: headingFill,
    padding: 0,
    label: [heading],
    icon: options?.icon,
    iconFill: headingIconFill,
  });

  const bodyDirection =
    frame.direction === Direction.HORIZONTAL
      ? Direction.HORIZONTAL
      : Direction.VERTICAL;

  const body = new Frame({
    id: frame.id ? `${frame.id}__body` : '__body',
    direction: bodyDirection,
    gap: options?.stackGap ?? INSET,
    align: frame.align,
    sizingW: Sizing.FILL,
    sizingH: Sizing.HUG,
    border: Border.NONE,
    padding: 0,
    children: [...frame.children],
  });

  if (frame.direction === Direction.HORIZONTAL) {
    frame.children = [headingChild, body];
    frame.direction = Direction.VERTICAL;
  } else {
    frame.children = [headingChild, body];
  }
  frame.icon = undefined;
}
