import { effectiveResolvedStrokeWidth } from './frame-classes.js';
import type { Frame } from './frame-model.js';
import {
  frameOwnedTextBlockGap,
  frameOwnedTextBlockRole,
  frameOwnedTextBlocks,
} from './resolved-spec-typography.js';
import { leafIconColumnWidth } from './spatial.js';
import {
  BODY_LINE_STEP,
  BODY_SIZE,
  ICON_SIZE,
  sizeToPx,
} from './tokens.js';
import { type LineSpec, type TextMeasureAdapter, wrapTextLines } from './text-measure.js';

const ASCENT_RATIO = 0.94;

export interface FrameRenderBoxPlan {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  dashed: boolean;
  disablePointerEvents: boolean;
}

export interface FrameRenderSeparatorPlan {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface FrameRenderIconPlan {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
}

export interface FrameRenderTextLinePlan {
  x: number;
  y: number;
  size: string;
  weight: string;
  fill: string;
  spec: LineSpec;
}

export interface FrameRenderTextBlockPlan {
  role: string;
  blockIndex: number;
  lines: FrameRenderTextLinePlan[];
}

export interface FrameRenderPlan {
  componentId?: string;
  box: FrameRenderBoxPlan;
  separator: FrameRenderSeparatorPlan | null;
  textBlocks: FrameRenderTextBlockPlan[];
  icon: FrameRenderIconPlan | null;
}

export function lineTopToBaseline(top: number, size: string | number): number {
  return top + sizeToPx(size) * ASCENT_RATIO;
}

export function resolveFrameRenderPlan(
  frame: Frame,
  adapter: TextMeasureAdapter,
): FrameRenderPlan {
  const fill = frame.resolvedFill ?? 'transparent';
  const stroke = frame.resolvedStroke ?? 'none';
  const iconColumn = leafIconColumnWidth(frame);
  const textMaxWidth = frame._layout.placedW - frame.paddingLeft - frame.paddingRight - iconColumn;
  let textBlocks = frameOwnedTextBlocks(frame);
  if (textBlocks.length > 0 && textMaxWidth > 0) {
    textBlocks = textBlocks
      .map((block) => wrapTextLines(block, textMaxWidth, adapter))
      .filter((block) => block.length > 0);
  }

  const strokeWidth = effectiveResolvedStrokeWidth(frame);
  let top = frame._layout.placedY + frame.paddingTop;
  const x = frame._layout.placedX + frame.paddingLeft;
  const blockPlans: FrameRenderTextBlockPlan[] = [];

  for (const [blockIndex, block] of textBlocks.entries()) {
    const lines: FrameRenderTextLinePlan[] = [];
    for (const spec of block) {
      const size = String(spec.size ?? BODY_SIZE);
      const lineStep = sizeToPx(spec.lineStep ?? BODY_LINE_STEP);
      lines.push({
        x,
        y: lineTopToBaseline(top, size),
        size,
        weight: String(spec.weight ?? '400'),
        fill: spec.fill ?? '#000000',
        spec,
      });
      top += lineStep;
    }

    blockPlans.push({
      role: frameOwnedTextBlockRole(frame, blockIndex),
      blockIndex,
      lines,
    });
    top += frameOwnedTextBlockGap(frame, blockIndex, textBlocks.length);
  }

  return {
    componentId: frame.id && !frame.id.startsWith('__') ? frame.id : undefined,
    box: {
      x: frame._layout.placedX,
      y: frame._layout.placedY,
      width: frame._layout.placedW,
      height: frame._layout.placedH,
      fill,
      stroke,
      strokeWidth,
      dashed: frame.border === 'DASHED',
      disablePointerEvents: fill === 'transparent' && stroke === 'none' && blockPlans.length === 0,
    },
    separator: frame.role === 'separator'
      ? {
        x1: frame._layout.placedX,
        y1: frame._layout.placedY,
        x2: frame._layout.placedX + frame._layout.placedW,
        y2: frame._layout.placedY,
      }
      : null,
    textBlocks: blockPlans,
    icon: frame.icon
      ? {
        x: frame._layout.placedX + frame._layout.placedW - frame.paddingRight - ICON_SIZE,
        y: frame._layout.placedY + frame.paddingTop,
        width: ICON_SIZE,
        height: ICON_SIZE,
        fill: frame.resolvedIconFill ?? '#000000',
      }
      : null,
  };
}
