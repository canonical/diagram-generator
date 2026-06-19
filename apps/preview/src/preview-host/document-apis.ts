import type { PreviewHostDocumentApi } from "./types.js";
import {
  componentTreeForSlug,
  frameTreeForSlug,
  gridInfoForSlug,
  previewDocumentForSlug,
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

export function createFramePreviewHostDocumentApi(
  options: CreateFramePreviewHostDocumentApiOptions,
): PreviewHostDocumentApi {
  return {
    loadPreviewDocument: (slug: string) => previewDocumentForSlug(slug, options.framePreviewDocumentDeps),
    loadFrameTree: (slug: string) => frameTreeForSlug(slug, options.framePreviewDocumentDeps),
    loadComponentTree: (slug: string) => componentTreeForSlug(slug, options.framePreviewDocumentDeps),
    loadGridInfo: (slug: string) => gridInfoForSlug(slug, options.framePreviewDocumentDeps),
    renderSvg: (slug: string) => renderSvgForSlug(slug, options.framePreviewRenderDeps),
    saveDocument: (slug: string, payload: unknown) =>
      saveFramePreviewDocument(slug, payload, {
        framePreviewDocumentDeps: options.framePreviewDocumentDeps,
        parseYaml: options.parseYaml,
        normalizeLayoutEngine: options.normalizeLayoutEngine,
      }),
  };
}

export function createForcePreviewHostDocumentApi(
  options: CreateForcePreviewHostDocumentApiOptions,
): PreviewHostDocumentApi {
  return {
    loadAuthoredSpec: (slug: string) =>
      loadForcePreviewDocumentSpec(slug, {
        forcePreviewDocumentDeps: options.forcePreviewDocumentDeps,
        parseYaml: options.parseYaml,
      }),
    saveDocument: (slug: string, payload: unknown) =>
      saveForcePreviewDocument(slug, payload, {
        forcePreviewDocumentDeps: options.forcePreviewDocumentDeps,
        parseYaml: options.parseYaml,
      }),
  };
}
