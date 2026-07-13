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
  /**
   * Optional workspace-source resolver (spec 075). Given a possibly-qualified
   * `sourceId:slug` address, returns the source directory and the bare slug so
   * each endpoint operates on the correct folder. When omitted, endpoints keep
   * the historical single-directory behaviour.
   */
  readonly resolveFrameDir?: (slug: string) => { framesDir: string; slug: string } | null;
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
  const resolveDoc = (slug: string): { deps: FramePreviewDocumentDeps; slug: string } => {
    // Keep the old single-directory behavior for narrow legacy helpers that
    // do not provide a workspace resolver. Once a resolver is installed, null
    // means the address is not a document in any registered source.
    if (!options.resolveFrameDir) return { deps: options.framePreviewDocumentDeps, slug };
    const resolved = options.resolveFrameDir(slug);
    if (!resolved) throw new Error(`Unknown frame slug: ${slug}`);
    return { deps: { ...options.framePreviewDocumentDeps, framesDir: resolved.framesDir }, slug: resolved.slug };
  };
  const resolveRender = (slug: string): { deps: FramePreviewRenderDeps; slug: string } => {
    if (!options.resolveFrameDir) return { deps: options.framePreviewRenderDeps, slug };
    const resolved = options.resolveFrameDir(slug);
    if (!resolved) throw new Error(`Unknown frame slug: ${slug}`);
    return { deps: { ...options.framePreviewRenderDeps, framesDir: resolved.framesDir }, slug: resolved.slug };
  };
  return [
    {
      kind: FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.previewDocument,
      handler: (slug: string) => {
        const r = resolveDoc(slug);
        return previewDocumentForSlug(r.slug, r.deps);
      },
    },
    {
      kind: FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.frameTree,
      handler: (slug: string) => {
        const r = resolveDoc(slug);
        return frameTreeForSlug(r.slug, r.deps);
      },
    },
    {
      kind: FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.componentTree,
      handler: (slug: string) => {
        const r = resolveDoc(slug);
        return componentTreeForSlug(r.slug, r.deps);
      },
    },
    {
      kind: FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.gridInfo,
      handler: (slug: string) => {
        const r = resolveDoc(slug);
        return gridInfoForSlug(r.slug, r.deps);
      },
    },
    {
      kind: FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.svgExport,
      handler: (slug: string) => {
        const r = resolveRender(slug);
        return renderSvgForSlug(r.slug, r.deps);
      },
    },
    {
      kind: FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.drawioExport,
      handler: (slug: string) => {
        const r = resolveRender(slug);
        return renderDrawioForSlug(r.slug, r.deps);
      },
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
      handler: (slug: string, payload: unknown) => {
        const r = resolveDoc(slug);
        return saveFramePreviewDocument(r.slug, payload, {
          framePreviewDocumentDeps: r.deps,
          parseYaml: options.parseYaml,
          normalizeLayoutEngine: options.normalizeLayoutEngine,
        });
      },
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
