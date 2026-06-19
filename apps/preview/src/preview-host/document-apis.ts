import type { PreviewHostDocumentActionMap } from "./types.js";
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

export const FRAME_PREVIEW_HOST_DOCUMENT_ACTIONS = {
  loadPreviewDocument: "load-preview-document",
  loadFrameTree: "load-frame-tree",
  loadComponentTree: "load-component-tree",
  loadGridInfo: "load-grid-info",
  renderSvg: "render-svg",
  saveDocument: "save-document",
} as const;

export const FORCE_PREVIEW_HOST_DOCUMENT_ACTIONS = {
  loadAuthoredSpec: "load-authored-spec",
  saveDocument: "save-document",
} as const;

export function createFramePreviewHostDocumentActions(
  options: CreateFramePreviewHostDocumentApiOptions,
): PreviewHostDocumentActionMap {
  return {
    [FRAME_PREVIEW_HOST_DOCUMENT_ACTIONS.loadPreviewDocument]: (slug: string) =>
      previewDocumentForSlug(slug, options.framePreviewDocumentDeps),
    [FRAME_PREVIEW_HOST_DOCUMENT_ACTIONS.loadFrameTree]: (slug: string) =>
      frameTreeForSlug(slug, options.framePreviewDocumentDeps),
    [FRAME_PREVIEW_HOST_DOCUMENT_ACTIONS.loadComponentTree]: (slug: string) =>
      componentTreeForSlug(slug, options.framePreviewDocumentDeps),
    [FRAME_PREVIEW_HOST_DOCUMENT_ACTIONS.loadGridInfo]: (slug: string) =>
      gridInfoForSlug(slug, options.framePreviewDocumentDeps),
    [FRAME_PREVIEW_HOST_DOCUMENT_ACTIONS.renderSvg]: (slug: string) =>
      renderSvgForSlug(slug, options.framePreviewRenderDeps),
    [FRAME_PREVIEW_HOST_DOCUMENT_ACTIONS.saveDocument]: (slug: string, payload: unknown) =>
      saveFramePreviewDocument(slug, payload, {
        framePreviewDocumentDeps: options.framePreviewDocumentDeps,
        parseYaml: options.parseYaml,
        normalizeLayoutEngine: options.normalizeLayoutEngine,
      }),
  };
}

export function createForcePreviewHostDocumentActions(
  options: CreateForcePreviewHostDocumentApiOptions,
): PreviewHostDocumentActionMap {
  return {
    [FORCE_PREVIEW_HOST_DOCUMENT_ACTIONS.loadAuthoredSpec]: (slug: string) =>
      loadForcePreviewDocumentSpec(slug, {
        forcePreviewDocumentDeps: options.forcePreviewDocumentDeps,
        parseYaml: options.parseYaml,
      }),
    [FORCE_PREVIEW_HOST_DOCUMENT_ACTIONS.saveDocument]: (slug: string, payload: unknown) =>
      saveForcePreviewDocument(slug, payload, {
        forcePreviewDocumentDeps: options.forcePreviewDocumentDeps,
        parseYaml: options.parseYaml,
      }),
  };
}
