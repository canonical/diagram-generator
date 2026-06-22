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
import {
  registerPreviewDocumentSvgRenderer,
  registerPreviewFrameDiagramRenderAdapter,
} from './render.js';

function layoutOptionsFromDiagram(diagram: FrameDiagram) {
  return {
    gridCols: diagram.gridCols,
    gridColGap: diagram.gridColGap,
    gridOuterMargin: diagram.gridOuterMargin,
    arrows: diagram.arrows,
  };
}

export const nativeFrameDiagramRenderAdapter: PreviewFrameDiagramRenderAdapter = async (options) => {
  resolveStyles(options.diagram.root);
  return layoutFrameTree(options.diagram.root, options.textAdapter, layoutOptionsFromDiagram(options.diagram));
};

export const elkFrameDiagramRenderAdapter: PreviewFrameDiagramRenderAdapter = async (options) => {
  return layoutElkFrameDiagram(options.diagram, options.textAdapter, {
    diagramType: options.diagram.diagramType as ElkLayoutOptions['diagramType'],
    elkOptionOverrides: options.elkOptionOverrides,
  });
};

export function installNativeFramePreviewRenderAdapter(): () => void {
  return registerPreviewFrameDiagramRenderAdapter('frame-native', nativeFrameDiagramRenderAdapter);
}

export function installElkFramePreviewRenderAdapter(): () => void {
  return registerPreviewFrameDiagramRenderAdapter('frame-elk', elkFrameDiagramRenderAdapter);
}

export const sequencePreviewDocumentSvgRenderer: PreviewDocumentSvgRenderer = async (document) => {
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

export function installSequencePreviewDocumentSvgRenderer(): () => void {
  return registerPreviewDocumentSvgRenderer('sequence', sequencePreviewDocumentSvgRenderer);
}
