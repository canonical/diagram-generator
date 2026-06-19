import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  buildComponentTree,
  buildGridInfo,
  collectIconNames,
  compileDiagramYaml,
  layoutPreviewFrameDiagramForEngine,
  loadFrameYaml,
  preloadIconMarkup,
  renderFrameDiagramToSvg,
  renderPreviewDocumentToSvg,
  resolvePreviewEngine,
  serializeFrameDiagram,
  summarizeFrameDiagramCompatibility,
  type PreviewDocumentKind,
  type PreviewRenderableDocument,
  type TextMeasureAdapter,
} from "@diagram-generator/layout-engine";

export interface FramePreviewDocumentDeps {
  readonly framesDir: string;
}

export interface FramePreviewRenderDeps extends FramePreviewDocumentDeps {
  readonly iconLoader: Parameters<typeof preloadIconMarkup>[0];
  readonly textAdapterPromise: Promise<TextMeasureAdapter>;
}

export type ParseYaml = (raw: string) => unknown;

export function loadFrameDiagram(slug: string, deps: FramePreviewDocumentDeps) {
  return loadFrameYaml(path.join(deps.framesDir, `${slug}.yaml`));
}

export function frameDiagramExists(slug: string, deps: FramePreviewDocumentDeps): boolean {
  return existsSync(path.join(deps.framesDir, `${slug}.yaml`));
}

function sequencePreviewDocumentForSlug(slug: string, raw: string): PreviewRenderableDocument | null {
  const compiled = compileDiagramYaml(raw);
  if (!compiled.ast.sequence) {
    return null;
  }
  return {
    kind: "sequence",
    slug,
    title:
      typeof compiled.ast.metadata.title === "string" && compiled.ast.metadata.title.trim().length > 0
        ? compiled.ast.metadata.title
        : slug,
    layoutEngine: "sequence",
    shellMode: "grid",
    sequence: compiled.ast.sequence,
  } as PreviewRenderableDocument;
}

export function previewDocumentForSlug(slug: string, deps: FramePreviewDocumentDeps) {
  const raw = readFrameYamlText(slug, deps);
  const sequencePreviewDocument = sequencePreviewDocumentForSlug(slug, raw);
  if (sequencePreviewDocument) {
    return sequencePreviewDocument;
  }
  const diagram = loadFrameDiagram(slug, deps);
  return {
    kind: "frame-diagram",
    slug,
    title: diagram.title,
    layoutEngine: diagram.layoutEngine ?? null,
    shellMode: "grid",
    frameTree: serializeFrameDiagram(diagram),
  };
}

export function frameTreeForSlug(slug: string, deps: FramePreviewDocumentDeps) {
  if (previewDocumentForSlug(slug, deps).kind === "sequence") {
    return null;
  }
  return serializeFrameDiagram(loadFrameDiagram(slug, deps));
}

export function componentTreeForSlug(slug: string, deps: FramePreviewDocumentDeps) {
  if (previewDocumentForSlug(slug, deps).kind === "sequence") {
    return [];
  }
  return buildComponentTree(loadFrameDiagram(slug, deps).root);
}

export function gridInfoForSlug(slug: string, deps: FramePreviewDocumentDeps) {
  if (previewDocumentForSlug(slug, deps).kind === "sequence") {
    return null;
  }
  const diagram = loadFrameDiagram(slug, deps);
  return buildGridInfo(diagram, diagram.root);
}

export function canonicalSavedState(slug: string, deps: FramePreviewDocumentDeps) {
  const previewDocument = previewDocumentForSlug(slug, deps);
  if (previewDocument.kind === "sequence") {
    return {
      slug,
      previewDocument,
      frameTree: null,
      componentTree: [],
      gridInfo: null,
    };
  }
  const diagram = loadFrameDiagram(slug, deps);
  const framePreviewDocument = {
    kind: "frame-diagram",
    slug,
    title: diagram.title,
    layoutEngine: diagram.layoutEngine ?? null,
    shellMode: "grid",
    frameTree: serializeFrameDiagram(diagram),
  };
  return {
    slug,
    previewDocument: framePreviewDocument,
    frameTree: framePreviewDocument.frameTree,
    componentTree: buildComponentTree(diagram.root),
    gridInfo: buildGridInfo(diagram, diagram.root),
  };
}

export async function buildFrameDiagramState(slug: string, deps: FramePreviewRenderDeps) {
  const diagram = loadFrameDiagram(slug, deps);
  const adapter = await deps.textAdapterPromise;
  const engineManifest = resolvePreviewEngine({
    layoutEngine: diagram.layoutEngine ?? null,
    shellMode: "grid",
    previewDocumentKind: "frame-diagram",
    frameDiagramSummary: summarizeFrameDiagramCompatibility(diagram),
  });
  const layout = await layoutPreviewFrameDiagramForEngine({
    diagram,
    textAdapter: adapter,
    engine: engineManifest,
  });
  return { diagram, layout };
}

export async function renderSvgForSlug(slug: string, deps: FramePreviewRenderDeps): Promise<string> {
  const previewDocument = previewDocumentForSlug(slug, deps);
  if (previewDocument.kind === "sequence") {
    const rendered = await renderPreviewDocumentToSvg(previewDocument);
    if (!rendered) {
      throw new Error(`No preview document SVG renderer is registered for kind '${previewDocument.kind}'`);
    }
    return rendered.svgMarkup;
  }
  const { diagram, layout } = await buildFrameDiagramState(slug, deps);
  const iconMarkupByName = preloadIconMarkup(deps.iconLoader, collectIconNames(diagram.root));
  const adapter = await deps.textAdapterPromise;
  return renderFrameDiagramToSvg(diagram, layout, adapter, { iconMarkupByName });
}

/**
 * Determine the preview document kind from a frame YAML file.
 * - If the YAML has a `sequence:` key, it's a sequence document
 * - Otherwise, it's a frame-diagram document
 */
export function determineFrameYamlKind(yamlContent: string, parseYaml: ParseYaml): PreviewDocumentKind {
  try {
    const parsed = parseYaml(yamlContent);
    if (parsed && typeof parsed === "object" && "sequence" in parsed) {
      return "sequence";
    }
  } catch {
    // Fall back to frame-diagram if parsing fails
  }
  return "frame-diagram";
}

export function readFrameYamlText(slug: string, deps: FramePreviewDocumentDeps): string {
  return readFileSync(path.join(deps.framesDir, `${slug}.yaml`), "utf8");
}
