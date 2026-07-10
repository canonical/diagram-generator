import { FRAME_CLASS_DEFS } from './frame-classes.js';
import { createLine } from './frame-model.js';
import { annotationTextToSpec } from './resolved-spec-typography.js';
import { lineTopToBaseline } from './text-render-geometry.js';
import type { LineSpec, TextMeasureAdapter } from './text-measure.js';
import { lineSpecToMeasureRequest } from './text-measure.js';
import { BODY_LINE_STEP, BODY_SIZE, INSET, roundUpToGrid, sizeToPx } from './tokens.js';

export const EDGE_LABEL_FRAME_CLASS = 'annotation';
export const EDGE_LABEL_PADDING = Object.freeze({
  top: INSET,
  right: 0,
  bottom: INSET,
  left: 0,
});

const EDGE_LABEL_CLASS = FRAME_CLASS_DEFS[EDGE_LABEL_FRAME_CLASS];

export const EDGE_LABEL_FILL = EDGE_LABEL_CLASS.fill;
export const EDGE_LABEL_STROKE = EDGE_LABEL_CLASS.stroke;
export const EDGE_LABEL_TEXT_FILL = EDGE_LABEL_CLASS.textFill ?? '#666666';

export interface EdgeLabelGeometry {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EdgeLabelRenderLine {
  x: number;
  y: number;
  size: string;
  weight: string;
  fill: string;
  spec: LineSpec;
}

function normalizeEdgeLabelLines(lines: readonly string[]): string[] {
  return lines.map((line) => String(line));
}

export function edgeLabelTextSpecs(lines: readonly string[]): LineSpec[] {
  return normalizeEdgeLabelLines(lines)
    .map((line) => annotationTextToSpec(createLine(line)));
}

export function edgeLabelTextSpecsFromText(text: string): LineSpec[] {
  return edgeLabelTextSpecs(String(text).split('\n'));
}

export function measureAnnotationEdgeLabelBox(
  lines: readonly string[],
  adapter: TextMeasureAdapter,
): { width: number; height: number } {
  const specs = edgeLabelTextSpecs(lines);
  const width = specs.reduce((max, spec) => Math.max(
    max,
    adapter.measureTextWidth(lineSpecToMeasureRequest(spec)),
  ), 0);
  const height = specs.reduce((sum, spec) => (
    sum + sizeToPx(spec.lineStep ?? BODY_LINE_STEP)
  ), 0);
  return {
    width: roundUpToGrid(width + EDGE_LABEL_PADDING.left + EDGE_LABEL_PADDING.right),
    height: roundUpToGrid(height + EDGE_LABEL_PADDING.top + EDGE_LABEL_PADDING.bottom),
  };
}

export function edgeLabelRenderLines(label: EdgeLabelGeometry): EdgeLabelRenderLine[] {
  let top = label.y + EDGE_LABEL_PADDING.top;
  return edgeLabelTextSpecsFromText(label.text).map((spec) => {
    const size = String(spec.size ?? BODY_SIZE);
    const lineStep = sizeToPx(spec.lineStep ?? BODY_LINE_STEP);
    const line = {
      x: label.x + EDGE_LABEL_PADDING.left,
      y: lineTopToBaseline(top, size),
      size,
      weight: String(spec.weight ?? EDGE_LABEL_CLASS.leafLeadText?.weight ?? '400'),
      fill: spec.fill ?? EDGE_LABEL_TEXT_FILL,
      spec,
    };
    top += lineStep;
    return line;
  });
}
