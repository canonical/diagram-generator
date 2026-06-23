import { type FrameDiagram } from './frame-model.js';
import type { LayoutOutput } from './layout.js';
import {
  emitFrameDiagramDisplayList,
} from './render-adapter/display-list.js';
import { renderDisplayListToSvg } from './render-adapter/svg.js';
import {
  type TextMeasureAdapter,
} from './text-measure.js';

export interface SvgRenderOptions {
  /** Inner SVG markup per icon file name (from assets/icons). */
  iconMarkupByName?: Map<string, string>;
}

export function renderFrameDiagramToSvg(
  diagram: FrameDiagram,
  result: LayoutOutput,
  adapter: TextMeasureAdapter,
  options?: SvgRenderOptions,
): string {
  return renderDisplayListToSvg(emitFrameDiagramDisplayList(
    diagram,
    result,
    adapter,
    {
      iconMarkupByName: options?.iconMarkupByName,
    },
  ));
}
