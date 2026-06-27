import {
  layoutGraphFrameDiagram,
  type ElkLayoutOptions,
} from '../elk-layout.js';
import {
  layoutElkAlgorithm,
  layoutForce,
  type ElkPreviewAlgorithm,
} from '@diagram-generator/graph-layout-elk';
import { layoutDagre } from '@diagram-generator/graph-layout-dagre';
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
  return layoutGraphFrameDiagram(options.diagram, options.textAdapter, {
    diagramType: options.diagram.diagramType as ElkLayoutOptions['diagramType'],
    elkOptionOverrides: options.elkOptionOverrides,
  });
};

export const elkForceFrameDiagramRenderAdapter: PreviewFrameDiagramRenderAdapter = async (options) => {
  return layoutGraphFrameDiagram(options.diagram, options.textAdapter, {
    diagramType: options.diagram.diagramType as ElkLayoutOptions['diagramType'],
    elkOptionOverrides: options.elkOptionOverrides,
    graphLayout: ({ input, direction, optionOverrides }) => layoutForce(
      {
        ...input,
        direction,
        spacingProfile: 'normal',
      },
      { optionOverrides },
    ),
  });
};

function createElkAlgorithmFrameDiagramRenderAdapter(
  algorithm: ElkPreviewAlgorithm,
  engineId: string,
): PreviewFrameDiagramRenderAdapter {
  return async (options) => layoutGraphFrameDiagram(options.diagram, options.textAdapter, {
    diagramType: options.diagram.diagramType as ElkLayoutOptions['diagramType'],
    elkOptionOverrides: options.elkOptionOverrides,
    graphLayout: ({ input, direction, optionOverrides }) => layoutElkAlgorithm(
      {
        ...input,
        direction,
        spacingProfile: 'normal',
      },
      { algorithm, engineId, optionOverrides },
    ),
  });
}

export const elkStressFrameDiagramRenderAdapter = createElkAlgorithmFrameDiagramRenderAdapter(
  'stress',
  'elk-stress',
);

export const elkMrTreeFrameDiagramRenderAdapter = createElkAlgorithmFrameDiagramRenderAdapter(
  'mrtree',
  'elk-mrtree',
);

export const elkRadialFrameDiagramRenderAdapter = createElkAlgorithmFrameDiagramRenderAdapter(
  'radial',
  'elk-radial',
);

export const elkRectpackingFrameDiagramRenderAdapter = createElkAlgorithmFrameDiagramRenderAdapter(
  'rectpacking',
  'elk-rectpacking',
);

export const dagreFrameDiagramRenderAdapter: PreviewFrameDiagramRenderAdapter = async (options) => {
  const dagreOptionOverrides = {
    ...(options.diagram.engineLayout?.['meta.dagre'] ?? {}),
    ...(options.elkOptionOverrides ?? {}),
  };
  return layoutGraphFrameDiagram(options.diagram, options.textAdapter, {
    diagramType: options.diagram.diagramType as ElkLayoutOptions['diagramType'],
    graphOptionOverrides: dagreOptionOverrides,
    graphLayout: async ({ input, direction, optionOverrides }) => layoutDagre(
      {
        ...input,
        direction,
        spacingProfile: 'normal',
      },
      { optionOverrides },
    ),
  });
};

export function installNativeFramePreviewRenderAdapter(): () => void {
  return registerPreviewFrameDiagramRenderAdapter('frame-native', nativeFrameDiagramRenderAdapter);
}

export function installElkFramePreviewRenderAdapter(): () => void {
  return registerPreviewFrameDiagramRenderAdapter('frame-elk', elkFrameDiagramRenderAdapter);
}

export function installElkForceFramePreviewRenderAdapter(): () => void {
  return registerPreviewFrameDiagramRenderAdapter('frame-elk-force', elkForceFrameDiagramRenderAdapter);
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
