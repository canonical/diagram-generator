import type {
  PreviewDocumentKind,
  PreviewRenderableDocument,
} from "@diagram-generator/layout-engine";

import type {
  FramePreviewCanonicalState,
  FramePreviewDocumentDeps,
  FramePreviewRenderDeps,
} from "./frame-documents.js";

export interface FrameYamlDocumentKindHandler {
  readonly kind: PreviewDocumentKind;
  createPreviewDocument: (
    slug: string,
    raw: string,
    deps: FramePreviewDocumentDeps,
  ) => PreviewRenderableDocument | null;
  buildCanonicalState: (
    slug: string,
    deps: FramePreviewDocumentDeps,
    previewDocument: PreviewRenderableDocument,
  ) => FramePreviewCanonicalState;
  renderSvg: (
    slug: string,
    deps: FramePreviewRenderDeps,
    previewDocument: PreviewRenderableDocument,
  ) => Promise<string>;
  saveDocument?: (
    slug: string,
    payload: unknown,
    deps: FrameYamlDocumentSaveDeps,
    previewDocument: PreviewRenderableDocument,
  ) => unknown;
}

export interface FrameYamlDocumentSaveDeps {
  readonly framePreviewDocumentDeps: FramePreviewDocumentDeps;
  readonly parseYaml: (raw: string) => unknown;
  readonly normalizeLayoutEngine: (layoutEngine: string | undefined) => string;
}

const frameYamlDocumentKindHandlers: FrameYamlDocumentKindHandler[] = [];

export function registerFrameYamlDocumentKindHandler(
  handler: FrameYamlDocumentKindHandler,
): () => void {
  if (frameYamlDocumentKindHandlers.some((entry) => entry.kind === handler.kind)) {
    throw new Error(`Frame YAML preview document kind '${handler.kind}' is already registered`);
  }
  frameYamlDocumentKindHandlers.push(handler);
  return () => {
    const index = frameYamlDocumentKindHandlers.findIndex((entry) => entry.kind === handler.kind);
    if (index >= 0) {
      frameYamlDocumentKindHandlers.splice(index, 1);
    }
  };
}

export function listFrameYamlDocumentKindHandlers(): FrameYamlDocumentKindHandler[] {
  return frameYamlDocumentKindHandlers.map((entry) => entry);
}

export function resolveFrameYamlDocumentKindHandler(
  kind: PreviewDocumentKind | null | undefined,
): FrameYamlDocumentKindHandler | null {
  return listFrameYamlDocumentKindHandlers().find((entry) => entry.kind === kind) ?? null;
}
