import type { FrameDiagram } from './frame-model.js';
import type { LayoutOutput } from './layout.js';
import type { ElkLayoutOutput } from './elk-layout.js';
import { emitFrameDiagramDisplayList } from './render-adapter/display-list.js';
import {
  renderDisplayListToDrawio,
  type DrawioRenderOptions,
  type DrawioRenderResult,
} from './render-adapter/drawio.js';
import type { TextMeasureAdapter } from './text-measure.js';

export type { DrawioRenderOptions as DrawioExportOptions, DrawioRenderResult as DrawioExportResult };

export function exportFrameDiagramToDrawio(
  diagram: FrameDiagram,
  result: LayoutOutput | ElkLayoutOutput,
  adapter: TextMeasureAdapter,
  options?: DrawioRenderOptions & { iconMarkupByName?: Map<string, string> },
): DrawioRenderResult {
  const displayList = emitFrameDiagramDisplayList(diagram, result, adapter, {
    iconMarkupByName: options?.iconMarkupByName,
    previewElkLabels: true,
  });
  return renderDisplayListToDrawio(displayList, {
    diagram,
    diagramName: options?.diagramName ?? diagram.title,
    diagramId: options?.diagramId,
  });
}
