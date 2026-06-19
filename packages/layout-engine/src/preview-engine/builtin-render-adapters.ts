import {
  layoutElkFrameDiagram,
  type ElkLayoutOptions,
} from '../elk-layout.js';
import type { FrameDiagram } from '../frame-model.js';
import { layoutFrameTree } from '../layout.js';
import { resolveStyles } from '../resolve-styles.js';
import { layoutSequenceDiagram } from '../sequence-layout/layout.js';
import { renderSequenceDiagramToSvg } from '../sequence-layout/render-svg.js';
import type {
  PreviewDocumentSvgRenderer,
  PreviewFrameDiagramRenderAdapter,
} from './render.js';
import type { PreviewRenderFamily } from './types.js';

function layoutOptionsFromDiagram(diagram: FrameDiagram) {
  return {
    gridCols: diagram.gridCols,
    gridColGap: diagram.gridColGap,
    gridOuterMargin: diagram.gridOuterMargin,
    arrows: diagram.arrows,
  };
}

const nativeFrameDiagramRenderAdapter: PreviewFrameDiagramRenderAdapter = async (options) => {
  resolveStyles(options.diagram.root);
  return layoutFrameTree(options.diagram.root, options.textAdapter, layoutOptionsFromDiagram(options.diagram));
};

const elkFrameDiagramRenderAdapter: PreviewFrameDiagramRenderAdapter = async (options) => {
  return layoutElkFrameDiagram(options.diagram, options.textAdapter, {
    diagramType: options.diagram.diagramType as ElkLayoutOptions['diagramType'],
    elkOptionOverrides: options.elkOptionOverrides,
  });
};

export const BUILTIN_PREVIEW_FRAME_DIAGRAM_RENDER_ADAPTERS: readonly Readonly<{
  renderFamily: PreviewRenderFamily;
  adapter: PreviewFrameDiagramRenderAdapter;
}>[] = [
  { renderFamily: 'frame-native', adapter: nativeFrameDiagramRenderAdapter },
  { renderFamily: 'frame-elk', adapter: elkFrameDiagramRenderAdapter },
] as const;

const sequencePreviewDocumentSvgRenderer: PreviewDocumentSvgRenderer = async (document) => {
  if (!document.sequence) {
    throw new Error('Sequence preview document renderer requires a sequence payload');
  }
  const layout = layoutSequenceDiagram(document.sequence);
  return {
    svgMarkup: renderSequenceDiagramToSvg(document.sequence, layout, {
      title: document.title || 'Sequence diagram',
    }),
    width: layout.width,
    height: layout.height,
  };
};

export const BUILTIN_PREVIEW_DOCUMENT_SVG_RENDERERS: readonly Readonly<{
  previewDocumentKind: string;
  renderer: PreviewDocumentSvgRenderer;
}>[] = [
  { previewDocumentKind: 'sequence', renderer: sequencePreviewDocumentSvgRenderer },
] as const;
