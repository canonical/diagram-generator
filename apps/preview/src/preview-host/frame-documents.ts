import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  buildComponentTree,
  buildGridInfo,
  collectIconNames,
  layoutFrameTree,
  loadFrameYaml,
  preloadIconMarkup,
  renderFrameDiagramToSvg,
  serializeFrameDiagram,
  type PreviewDocumentKind,
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

export function previewDocumentForSlug(slug: string, deps: FramePreviewDocumentDeps) {
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
  return serializeFrameDiagram(loadFrameDiagram(slug, deps));
}

export function canonicalSavedState(slug: string, deps: FramePreviewDocumentDeps) {
  const diagram = loadFrameDiagram(slug, deps);
  const previewDocument = {
    kind: "frame-diagram",
    slug,
    title: diagram.title,
    layoutEngine: diagram.layoutEngine ?? null,
    shellMode: "grid",
    frameTree: serializeFrameDiagram(diagram),
  };
  return {
    slug,
    previewDocument,
    frameTree: previewDocument.frameTree,
    componentTree: buildComponentTree(diagram.root),
    gridInfo: buildGridInfo(diagram, diagram.root),
  };
}

export async function buildFrameDiagramState(slug: string, deps: FramePreviewRenderDeps) {
  const diagram = loadFrameDiagram(slug, deps);
  const adapter = await deps.textAdapterPromise;
  const layout = layoutFrameTree(diagram.root, adapter, {
    gridCols: diagram.gridCols,
    gridColGap: diagram.gridColGap,
    gridOuterMargin: diagram.gridOuterMargin,
    arrows: diagram.arrows,
  });
  return { diagram, layout };
}

export async function renderSvgForSlug(slug: string, deps: FramePreviewRenderDeps): Promise<string> {
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
