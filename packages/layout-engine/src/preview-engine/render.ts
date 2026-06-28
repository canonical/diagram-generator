import type { ElkLayoutOutput } from '../elk-layout.js';
import type { FrameDiagram } from '../frame-model.js';
import type { LayoutOutput } from '../layout.js';
import type { SequenceDiagramSpec } from '../sequence-layout/model.js';
import type { TextMeasureAdapter } from '../text-measure.js';
import type {
  PreviewDocumentKind,
  PreviewEngineManifest,
  PreviewRenderFamily,
} from './types.js';

export type PreviewFrameLayoutResult = LayoutOutput | ElkLayoutOutput;
export type PreviewFrameDiagramRenderAdapter = (
  options: LayoutPreviewFrameDiagramForEngineOptions,
) => Promise<PreviewFrameLayoutResult>;

export function resolvePreviewRenderFamily(
  engine: Pick<PreviewEngineManifest, 'renderFamily'> | null | undefined,
  previewDocumentKind?: PreviewDocumentKind | null,
): PreviewRenderFamily | null {
  if (engine?.renderFamily) {
    return engine.renderFamily;
  }
  if (previewDocumentKind === 'frame-diagram') {
    return 'frame-native';
  }
  if (previewDocumentKind === 'sequence') {
    return 'sequence';
  }
  if (previewDocumentKind === 'force-spec') {
    return 'force';
  }
  return null;
}

export interface PreviewRenderableDocument {
  kind?: PreviewDocumentKind | null;
  layoutEngine?: string | null;
  title?: string | null;
  sequence?: SequenceDiagramSpec;
}

export interface PreviewDocumentSvgRenderResult {
  svgMarkup: string;
  width: number;
  height: number;
}

export type PreviewDocumentSvgRenderer = (
  document: PreviewRenderableDocument,
) => PreviewDocumentSvgRenderResult | Promise<PreviewDocumentSvgRenderResult>;

export interface LayoutPreviewFrameDiagramForEngineOptions {
  diagram: FrameDiagram;
  textAdapter: TextMeasureAdapter;
  engine?: Pick<PreviewEngineManifest, 'renderFamily'> | null;
  elkOptionOverrides?: Record<string, string>;
}

const FRAME_DIAGRAM_RENDER_ADAPTERS = new Map<PreviewRenderFamily, PreviewFrameDiagramRenderAdapter>();
const PREVIEW_DOCUMENT_SVG_RENDERERS = new Map<PreviewDocumentKind, PreviewDocumentSvgRenderer>();

export function registerPreviewFrameDiagramRenderAdapter(
  renderFamily: PreviewRenderFamily,
  adapter: PreviewFrameDiagramRenderAdapter,
  options?: { replace?: boolean },
): () => void {
  const previous = FRAME_DIAGRAM_RENDER_ADAPTERS.get(renderFamily);
  if (previous && options?.replace !== true) {
    throw new Error(`Preview frame-diagram render adapter '${renderFamily}' is already registered`);
  }
  FRAME_DIAGRAM_RENDER_ADAPTERS.set(renderFamily, adapter);
  return () => {
    const current = FRAME_DIAGRAM_RENDER_ADAPTERS.get(renderFamily);
    if (current !== adapter) {
      return;
    }
    if (previous) {
      FRAME_DIAGRAM_RENDER_ADAPTERS.set(renderFamily, previous);
      return;
    }
    FRAME_DIAGRAM_RENDER_ADAPTERS.delete(renderFamily);
  };
}

export function getPreviewFrameDiagramRenderAdapter(
  renderFamily: PreviewRenderFamily,
): PreviewFrameDiagramRenderAdapter | undefined {
  return FRAME_DIAGRAM_RENDER_ADAPTERS.get(renderFamily);
}

export function registerPreviewDocumentSvgRenderer(
  previewDocumentKind: PreviewDocumentKind,
  renderer: PreviewDocumentSvgRenderer,
  options?: { replace?: boolean },
): () => void {
  const previous = PREVIEW_DOCUMENT_SVG_RENDERERS.get(previewDocumentKind);
  if (previous && options?.replace !== true) {
    throw new Error(`Preview document SVG renderer '${previewDocumentKind}' is already registered`);
  }
  PREVIEW_DOCUMENT_SVG_RENDERERS.set(previewDocumentKind, renderer);
  return () => {
    const current = PREVIEW_DOCUMENT_SVG_RENDERERS.get(previewDocumentKind);
    if (current !== renderer) {
      return;
    }
    if (previous) {
      PREVIEW_DOCUMENT_SVG_RENDERERS.set(previewDocumentKind, previous);
      return;
    }
    PREVIEW_DOCUMENT_SVG_RENDERERS.delete(previewDocumentKind);
  };
}

export function getPreviewDocumentSvgRenderer(
  previewDocumentKind: PreviewDocumentKind,
): PreviewDocumentSvgRenderer | undefined {
  return PREVIEW_DOCUMENT_SVG_RENDERERS.get(previewDocumentKind);
}

export async function renderPreviewDocumentToSvg(
  document: PreviewRenderableDocument,
): Promise<PreviewDocumentSvgRenderResult | null> {
  const kind = document.kind;
  if (!kind) {
    return null;
  }
  const renderer = getPreviewDocumentSvgRenderer(kind);
  if (!renderer) {
    return null;
  }
  return renderer(document);
}

export async function layoutPreviewFrameDiagramForEngine(
  options: LayoutPreviewFrameDiagramForEngineOptions,
): Promise<PreviewFrameLayoutResult> {
  const renderFamily = resolvePreviewRenderFamily(options.engine, 'frame-diagram');
  if (renderFamily == null) {
    throw new Error('Preview render family is unavailable for frame-diagram layout');
  }
  const adapter = getPreviewFrameDiagramRenderAdapter(renderFamily);
  if (!adapter) {
    throw new Error(`No frame-diagram render adapter is registered for preview render family '${renderFamily}'`);
  }
  return adapter(options);
}
