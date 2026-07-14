import type { PreviewHostDocumentEndpointDescriptor } from "./types.js";
import {
  componentTreeForSlug,
  frameTreeForSlug,
  gridInfoForSlug,
  previewDocumentForSlug,
  renderD2ForSlug,
  renderDrawioForSlug,
  renderMermaidForSlug,
  renderSvgForSlug,
  type FramePreviewDocumentDeps,
  type FramePreviewRenderDeps,
} from "./frame-documents.js";
import { saveFramePreviewDocument } from "./frame-document-actions.js";
import type { ForcePreviewDocumentDeps } from "./force-documents.js";
import { loadForcePreviewDocumentSpec, saveForcePreviewDocument } from "./force-document-actions.js";

export interface CreateFramePreviewHostDocumentApiOptions {
  readonly framePreviewDocumentDeps: FramePreviewDocumentDeps;
  readonly framePreviewRenderDeps: FramePreviewRenderDeps;
  readonly parseYaml: (raw: string) => unknown;
  readonly normalizeLayoutEngine: (layoutEngine: string | undefined) => string;
}

export interface CreateForcePreviewHostDocumentApiOptions {
  readonly forcePreviewDocumentDeps: ForcePreviewDocumentDeps;
  readonly parseYaml: (raw: string) => unknown;
}

export const FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS = {
  previewDocument: "preview-document",
  frameTree: "frame-tree",
  componentTree: "component-tree",
  gridInfo: "grid-info",
  svgExport: "svg-export",
  drawioExport: "drawio-export",
  mermaidExport: "mermaid-export",
  d2Export: "d2-export",
  saveDocument: "save-document",
} as const;

export const FORCE_PREVIEW_HOST_DOCUMENT_ENDPOINTS = {
  documentSpec: "document-spec",
  saveDocument: "save-document",
} as const;

export function createFramePreviewHostDocumentEndpoints(
  options: CreateFramePreviewHostDocumentApiOptions,
): readonly PreviewHostDocumentEndpointDescriptor[] {
  return [
    {
      kind: FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.previewDocument,
      handler: (slug: string) => previewDocumentForSlug(slug, options.framePreviewDocumentDeps),
    },
    {
      kind: FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.frameTree,
      handler: (slug: string) => frameTreeForSlug(slug, options.framePreviewDocumentDeps),
    },
    {
      kind: FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.componentTree,
      handler: (slug: string) => componentTreeForSlug(slug, options.framePreviewDocumentDeps),
    },
    {
      kind: FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.gridInfo,
      handler: (slug: string) => gridInfoForSlug(slug, options.framePreviewDocumentDeps),
    },
    {
      kind: FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.svgExport,
      handler: (slug: string) => renderSvgForSlug(slug, options.framePreviewRenderDeps),
    },
    {
      kind: FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.drawioExport,
      handler: (slug: string) => renderDrawioForSlug(slug, options.framePreviewRenderDeps),
    },
    {
      kind: FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.mermaidExport,
      handler: (slug: string) => renderMermaidForSlug(slug, options.framePreviewDocumentDeps),
    },
    {
      kind: FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.d2Export,
      handler: (slug: string) => renderD2ForSlug(slug, options.framePreviewDocumentDeps),
    },
    {
      kind: FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.saveDocument,
      handler: (slug: string, payload: unknown) =>
        saveFramePreviewDocument(slug, payload, {
          framePreviewDocumentDeps: options.framePreviewDocumentDeps,
          parseYaml: options.parseYaml,
          normalizeLayoutEngine: options.normalizeLayoutEngine,
        }),
    },
  ] as const;
}

export function createForcePreviewHostDocumentEndpoints(
  options: CreateForcePreviewHostDocumentApiOptions,
): readonly PreviewHostDocumentEndpointDescriptor[] {
  return [
    {
      kind: FORCE_PREVIEW_HOST_DOCUMENT_ENDPOINTS.documentSpec,
      handler: (slug: string) =>
        loadForcePreviewDocumentSpec(slug, {
          forcePreviewDocumentDeps: options.forcePreviewDocumentDeps,
          parseYaml: options.parseYaml,
        }),
    },
    {
      kind: FORCE_PREVIEW_HOST_DOCUMENT_ENDPOINTS.saveDocument,
      handler: (slug: string, payload: unknown) =>
        saveForcePreviewDocument(slug, payload, {
          forcePreviewDocumentDeps: options.forcePreviewDocumentDeps,
          parseYaml: options.parseYaml,
        }),
    },
  ] as const;
}
