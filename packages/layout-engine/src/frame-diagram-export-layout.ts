import type { FrameDiagram } from './frame-model.js';
import type { ElkLayoutOutput } from './elk-layout.js';
import type { LayoutOutput } from './layout.js';
import './preview-engine/install-builtins.js';
import { resolvePreviewEngine } from './preview-engine/registry.js';
import { layoutPreviewFrameDiagramForEngine } from './preview-engine/render.js';
import { FRAME_PREVIEW_SHELL_MODE } from './preview-engine/shell-mode.js';
import type { TextMeasureAdapter } from './text-measure.js';

export async function layoutFrameDiagramForExport(
  diagram: FrameDiagram,
  adapter: TextMeasureAdapter,
): Promise<LayoutOutput | ElkLayoutOutput> {
  const layoutEngine = diagram.layoutEngine ?? 'v3';
  const engine = resolvePreviewEngine({
    layoutEngine,
    shellMode: FRAME_PREVIEW_SHELL_MODE,
  });
  if (!engine) {
    throw new Error(
      `draw.io export does not support layout_engine "${layoutEngine}"`,
    );
  }
  return layoutPreviewFrameDiagramForEngine({
    diagram,
    textAdapter: adapter,
    engine,
    elkOptionOverrides: diagram.elkLayout,
  });
}
