import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildComponentTree,
  buildGridInfo,
  collectIconNames,
  compileDiagramYaml,
  layoutPreviewFrameDiagramForEngine,
  listCompatiblePreviewEngines,
  loadFrameYaml,
  preloadIconMarkup,
  renderFrameDiagramToSvg,
  renderPreviewDocumentToSvg,
  resolvePreviewEngine,
  serializeFrameDiagram,
  summarizeFrameDiagramCompatibility,
  type PreviewEngineManifest,
  type PreviewEngineContext,
  type PreviewDocumentKind,
  type PreviewRenderableDocument,
  type TextMeasureAdapter,
} from "@diagram-generator/layout-engine";
import {
  listFrameYamlDocumentKindHandlers,
  registerFrameYamlDocumentKindHandler,
  resolveFrameYamlDocumentKindHandler,
  type FrameYamlDocumentSaveDeps,
  type FrameYamlDocumentKindHandler,
} from "./frame-document-kinds.js";
import {
  persistFrameDiagramOverridePayloadToYaml,
  verifyElkLayoutPersisted,
  type PersistOverridePayload,
} from "../persistence/index.js";

export interface FramePreviewDocumentDeps {
  readonly framesDir: string;
}

export interface FramePreviewRenderDeps extends FramePreviewDocumentDeps {
  readonly iconLoader: Parameters<typeof preloadIconMarkup>[0];
  readonly textAdapterPromise: Promise<TextMeasureAdapter>;
}

export type ParseYaml = (raw: string) => unknown;

export interface FramePreviewCanonicalState {
  slug: string;
  previewDocument: PreviewRenderableDocument;
  frameTree: unknown;
  componentTree: unknown;
  gridInfo: unknown;
}

export interface FramePreviewEngineResolution {
  previewDocument: PreviewRenderableDocument;
  compatibleContext: Omit<PreviewEngineContext, "layoutEngine">;
  previewContext: PreviewEngineContext;
  authoredLayoutEngine: string;
}

export interface ResolveFramePreviewViewerContextOptions {
  normalizeLayoutEngine: (layoutEngine: string | undefined) => string;
  findReferenceImage: (slug: string) => string | null;
}

export interface FramePreviewViewerContext extends FramePreviewEngineResolution {
  documentKind: PreviewDocumentKind;
  engineManifest: PreviewEngineManifest | undefined;
  activeLayoutEngine: string;
  compatibleEngines: string[];
  hasReference: boolean;
}

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

function frameDiagramPreviewDocumentForSlug(
  slug: string,
  deps: FramePreviewDocumentDeps,
): PreviewRenderableDocument {
  const diagram = loadFrameDiagram(slug, deps);
  return {
    kind: "frame-diagram",
    slug,
    title: diagram.title,
    layoutEngine: diagram.layoutEngine ?? null,
    shellMode: "grid",
    frameTree: serializeFrameDiagram(diagram),
  } as PreviewRenderableDocument;
}

export const SEQUENCE_FRAME_YAML_HANDLER: FrameYamlDocumentKindHandler = {
  kind: "sequence",
  createPreviewDocument(slug, raw) {
    return sequencePreviewDocumentForSlug(slug, raw);
  },
  buildCanonicalState(slug, _deps, previewDocument) {
    return {
      slug,
      previewDocument,
      frameTree: null,
      componentTree: [],
      gridInfo: null,
    };
  },
  async renderSvg(_slug, _deps, previewDocument) {
    const rendered = await renderPreviewDocumentToSvg(previewDocument);
    if (!rendered) {
      throw new Error(`No preview document SVG renderer is registered for kind '${previewDocument.kind}'`);
    }
    return rendered.svgMarkup;
  },
  saveDocument(slug, payload, deps) {
    return persistFrameYamlDocumentForSlug(slug, payload, deps);
  },
};

export const FRAME_DIAGRAM_YAML_HANDLER: FrameYamlDocumentKindHandler = {
  kind: "frame-diagram",
  createPreviewDocument(slug, _raw, deps) {
    return frameDiagramPreviewDocumentForSlug(slug, deps);
  },
  buildCanonicalState(slug, deps, previewDocument) {
    const diagram = loadFrameDiagram(slug, deps);
    return {
      slug,
      previewDocument,
      frameTree: serializeFrameDiagram(diagram),
      componentTree: buildComponentTree(diagram.root),
      gridInfo: buildGridInfo(diagram, diagram.root),
    };
  },
  async renderSvg(slug, deps) {
    const { diagram, layout } = await buildFrameDiagramState(slug, deps);
    const iconMarkupByName = preloadIconMarkup(deps.iconLoader, collectIconNames(diagram.root));
    const adapter = await deps.textAdapterPromise;
    return renderFrameDiagramToSvg(diagram, layout, adapter, { iconMarkupByName });
  },
  saveDocument(slug, payload, deps) {
    return persistFrameYamlDocumentForSlug(slug, payload, deps);
  },
};

let builtinFrameYamlDocumentKindHandlersInstalled = false;

function ensureBuiltinFrameYamlDocumentKindHandlersInstalled(): void {
  if (builtinFrameYamlDocumentKindHandlersInstalled) {
    return;
  }
  builtinFrameYamlDocumentKindHandlersInstalled = true;
  registerFrameYamlDocumentKindHandler(SEQUENCE_FRAME_YAML_HANDLER);
  registerFrameYamlDocumentKindHandler(FRAME_DIAGRAM_YAML_HANDLER);
}

export function previewDocumentForSlug(slug: string, deps: FramePreviewDocumentDeps) {
  ensureBuiltinFrameYamlDocumentKindHandlersInstalled();
  const raw = readFrameYamlText(slug, deps);
  for (const handler of listFrameYamlDocumentKindHandlers()) {
    const previewDocument = handler.createPreviewDocument(slug, raw, deps);
    if (previewDocument) {
      return previewDocument;
    }
  }
  throw new Error(`Unable to resolve a preview document handler for '${slug}'`);
}

export function frameTreeForSlug(slug: string, deps: FramePreviewDocumentDeps) {
  return canonicalSavedState(slug, deps).frameTree;
}

export function componentTreeForSlug(slug: string, deps: FramePreviewDocumentDeps) {
  return canonicalSavedState(slug, deps).componentTree;
}

export function gridInfoForSlug(slug: string, deps: FramePreviewDocumentDeps) {
  return canonicalSavedState(slug, deps).gridInfo;
}

export function canonicalSavedState(slug: string, deps: FramePreviewDocumentDeps): FramePreviewCanonicalState {
  const previewDocument = previewDocumentForSlug(slug, deps);
  const handler = resolveFrameYamlDocumentKindHandler(previewDocument.kind);
  if (!handler) {
    throw new Error(`Unsupported frame preview document kind '${String(previewDocument.kind)}'`);
  }
  return handler.buildCanonicalState(
    slug,
    deps,
    previewDocument,
  );
}

function verifyPersistedEngineLayoutNamespaces(
  nextText: string,
  payload: unknown,
): void {
  const payloadRecord =
    payload && typeof payload === "object" && payload !== null
      ? payload as Record<string, unknown>
      : null;
  const namespacedEngineOverrides =
    payloadRecord && "engine_layout_overrides" in payloadRecord && typeof payloadRecord.engine_layout_overrides === "object"
    && payloadRecord.engine_layout_overrides !== null
    && !Array.isArray(payloadRecord.engine_layout_overrides)
      ? payloadRecord.engine_layout_overrides as Record<string, unknown>
      : null;
  const elkOverrides = (
    namespacedEngineOverrides
      && typeof namespacedEngineOverrides["meta.elk"] === "object"
      && namespacedEngineOverrides["meta.elk"] !== null
      && !Array.isArray(namespacedEngineOverrides["meta.elk"])
      ? namespacedEngineOverrides["meta.elk"]
      : (payloadRecord && "elk_layout_overrides" in payloadRecord
          ? payloadRecord.elk_layout_overrides
          : null)
  );
  if (elkOverrides && typeof elkOverrides === "object" && !Array.isArray(elkOverrides)) {
    verifyElkLayoutPersisted(nextText, elkOverrides as Record<string, unknown>);
  }
}

function persistFrameYamlDocumentForSlug(
  slug: string,
  payload: unknown,
  deps: FrameYamlDocumentSaveDeps,
): unknown {
  const framePath = path.join(deps.framePreviewDocumentDeps.framesDir, `${slug}.yaml`);
  if (!existsSync(framePath)) {
    throw new Error(`Unknown frame slug: ${slug}`);
  }
  const baseline = readFileSync(framePath, "utf8");
  const nextText = persistFrameDiagramOverridePayloadToYaml(
    framePath,
    baseline,
    payload as PersistOverridePayload,
  );
  if (nextText !== baseline) {
    writeFileSync(framePath, nextText, "utf8");
  }
  verifyPersistedEngineLayoutNamespaces(nextText, payload);
  return {
    ok: true,
    canonicalState: canonicalSavedState(slug, deps.framePreviewDocumentDeps),
  };
}

export function saveFrameYamlDocumentForSlug(
  slug: string,
  payload: unknown,
  deps: FrameYamlDocumentSaveDeps,
): unknown {
  const previewDocument = previewDocumentForSlug(slug, deps.framePreviewDocumentDeps);
  const handler = resolveFrameYamlDocumentKindHandler(previewDocument.kind);
  if (!handler?.saveDocument) {
    throw new Error(`Unsupported frame preview save kind '${String(previewDocument.kind)}'`);
  }
  return handler.saveDocument(slug, payload, deps, previewDocument);
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
  const handler = resolveFrameYamlDocumentKindHandler(previewDocument.kind);
  if (!handler) {
    throw new Error(`Unsupported frame preview document kind '${String(previewDocument.kind)}'`);
  }
  return handler.renderSvg(slug, deps, previewDocument);
}

export function resolveFramePreviewEngineResolution(
  slug: string,
  deps: FramePreviewDocumentDeps,
  normalizeLayoutEngine: (layoutEngine: string | undefined) => string,
): FramePreviewEngineResolution {
  const previewDocument = previewDocumentForSlug(slug, deps);
  if (previewDocument.kind === "sequence") {
    const compatibleContext: Omit<PreviewEngineContext, "layoutEngine"> = {
      shellMode: "grid",
      previewDocumentKind: "sequence",
    };
    return {
      previewDocument,
      compatibleContext,
      previewContext: {
        layoutEngine: "sequence",
        ...compatibleContext,
      },
      authoredLayoutEngine: "sequence",
    };
  }

  const diagram = loadFrameDiagram(slug, deps);
  const compatibleContext: Omit<PreviewEngineContext, "layoutEngine"> = {
    shellMode: "grid",
    previewDocumentKind: "frame-diagram",
    frameDiagramSummary: summarizeFrameDiagramCompatibility(diagram),
  };
  const authoredLayoutEngine = normalizeLayoutEngine(diagram.layoutEngine);
  return {
    previewDocument,
    compatibleContext,
    previewContext: {
      layoutEngine: authoredLayoutEngine,
      ...compatibleContext,
    },
    authoredLayoutEngine,
  };
}

export function resolveFramePreviewViewerContext(
  slug: string,
  deps: FramePreviewDocumentDeps,
  options: ResolveFramePreviewViewerContextOptions,
): FramePreviewViewerContext {
  const resolution = resolveFramePreviewEngineResolution(
    slug,
    deps,
    options.normalizeLayoutEngine,
  );
  const documentKind = resolution.compatibleContext.previewDocumentKind ?? resolution.previewDocument.kind ?? "frame-diagram";
  const engineManifest = resolvePreviewEngine(resolution.previewContext);
  const activeLayoutEngine = engineManifest?.layoutEngineKey ?? resolution.authoredLayoutEngine;
  const compatibleEngines = listCompatiblePreviewEngines(resolution.compatibleContext)
    .map((entry) => entry.layoutEngineKey)
    .filter((key): key is string => typeof key === "string" && key.length > 0);
  return {
    ...resolution,
    documentKind,
    engineManifest,
    activeLayoutEngine,
    compatibleEngines,
    hasReference: documentKind === "frame-diagram" && options.findReferenceImage(slug) !== null,
  };
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
