import { createLine } from './frame-model.js';
import {
  BODY_LINE_STEP,
  BODY_SIZE,
  GRID_GUTTER,
  ICON_SIZE,
  INSET,
  sizeToPx,
} from './tokens.js';
import { wrapTextLines } from './text-measure.js';
import { layoutFrameTree } from './layout.js';
import { resolveStyles } from './resolve-styles.js';
import { layoutElkFrameDiagram } from './elk-layout.js';
import { effectiveResolvedStrokeWidth } from './frame-classes.js';
import {
  annotationTextToSpec,
  frameOwnedTextBlocks,
  frameOwnedTextBlockRole,
  frameOwnedTextBlockGap,
} from './resolved-spec-typography.js';
import { layoutSequenceDiagram } from './sequence-layout/layout.js';
import { renderSequenceDiagramToSvg } from './sequence-layout/render-svg.js';
import { routeArrows } from './arrow-routing.js';
import { deserializeFrameWire, deserializeFrameDiagramWire } from './frame-serialize.js';

export const core = Object.freeze({
  BODY_LINE_STEP,
  BODY_SIZE,
  GRID_GUTTER,
  ICON_SIZE,
  INSET,
  annotationTextToSpec,
  createLine,
  deserializeFrameDiagramWire,
  deserializeFrameWire,
  effectiveResolvedStrokeWidth,
  frameOwnedTextBlockGap,
  frameOwnedTextBlockRole,
  frameOwnedTextBlocks,
  layoutElkFrameDiagram,
  layoutFrameTree,
  layoutSequenceDiagram,
  renderSequenceDiagramToSvg,
  resolveStyles,
  routeArrows,
  sizeToPx,
  wrapTextLines,
});
