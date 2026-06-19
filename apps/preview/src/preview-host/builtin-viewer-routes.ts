import { existsSync } from "node:fs";
import path from "node:path";

import {
  listCompatiblePreviewEngines,
  resolvePreviewEngine,
  ARROW_HEAD_HALF_WIDTH,
  ARROW_HEAD_LENGTH,
  BODY_LINE_STEP,
  GRID_GUTTER,
  ICON_SIZE,
  INSET,
  summarizeFrameDiagramCompatibility,
  type PreviewEngineContext,
  type PreviewEngineManifest,
} from "@diagram-generator/layout-engine";
import {
  frameDiagramExists,
  loadFrameDiagram,
  previewDocumentForSlug,
  frameTreeForSlug,
  componentTreeForSlug,
  gridInfoForSlug,
  renderSvgForSlug,
  type FramePreviewDocumentDeps,
  type FramePreviewRenderDeps,
} from "./frame-documents.js";
import { saveFramePreviewDocument } from "./frame-document-actions.js";
import { AUTOLAYOUT_HOST_LANE, FORCE_HOST_LANE } from "./lanes.js";
import {
  buildRegisteredPreviewBrowseSections,
  registerPreviewHostViewerRoute,
} from "./registry.js";
import type {
  PreviewHostViewerPageDefinition,
  PreviewHostViewerRouteDescriptor,
  PreviewHostViewerScriptResolver,
} from "./types.js";
import { buildPreviewViewerHtml } from "./viewers.js";
import type { ForcePreviewDocumentDeps } from "./force-documents.js";
import {
  loadForcePreviewDocumentSpec,
  saveForcePreviewDocument,
} from "./force-document-actions.js";

export interface BuiltinPreviewHostViewerRouteDeps
  extends PreviewHostViewerScriptResolver {
  readonly framePreviewDocumentDeps: FramePreviewDocumentDeps;
  readonly framePreviewRenderDeps: FramePreviewRenderDeps;
  readonly forcePreviewDocumentDeps: ForcePreviewDocumentDeps;
  readonly parseYaml: (raw: string) => unknown;
  readonly templateHtml: string;
  readonly baselineStylesHtml: string;
  readonly listAutolayoutDiagrams: () => string[];
  readonly listForceExamples: () => string[];
  readonly findReferenceImage: (slug: string) => string | null;
  readonly normalizeLayoutEngine: (layoutEngine: string | undefined) => string;
  readonly inset?: number;
  readonly bodyLineStep?: number;
  readonly headLength?: number;
  readonly headHalfWidth?: number;
  readonly iconSize?: number;
  readonly gridGutter?: number;
}

const AUTOLAYOUT_PREVIEW_VIEWER_DEFINITION: PreviewHostViewerPageDefinition = {
  mode: "grid",
  inspectorEmptyText: "Click a component to inspect it.",
  sectionVisibilityPlaceholders: [
    {
      placeholder: "%ELK_SECTION_HIDDEN%",
      section: "elk-layout",
    },
  ],
  buildTitle(slug: string): string {
    return `${slug} – diagram preview`;
  },
  buildCurrentPath(slug: string): string {
    return AUTOLAYOUT_HOST_LANE.buildViewerPath(slug);
  },
};

const FORCE_PREVIEW_VIEWER_DEFINITION: PreviewHostViewerPageDefinition = {
  mode: "force",
  inspectorEmptyText: "Click a node to select it.",
  buildTitle(slug: string): string {
    return `${slug} – force preview`;
  },
  buildCurrentPath(slug: string): string {
    return FORCE_HOST_LANE.buildViewerPath(slug);
  },
};

function previewEngineScriptTags(
  entry: PreviewEngineManifest | undefined,
  deps: PreviewHostViewerScriptResolver,
): string {
  const scripts = Array.isArray(entry?.scripts) ? entry.scripts : [];
  return scripts.map((script: string) => `<script src="${deps.previewAssetUrl(script)}"></script>`).join("\n");
}

export function createAutolayoutPreviewHostViewerRoute(
  deps: BuiltinPreviewHostViewerRouteDeps,
): PreviewHostViewerRouteDescriptor {
  return {
    key: "autolayout",
    lane: AUTOLAYOUT_HOST_LANE,
    routePrefixes: ["/v3/view/", "/view/"],
    listSlugs: () => deps.listAutolayoutDiagrams(),
    hasDocument: (slug: string) => frameDiagramExists(slug, deps.framePreviewDocumentDeps),
    buildHtml: (slug: string) => {
      const previewDocument = previewDocumentForSlug(slug, deps.framePreviewDocumentDeps);
      const documentKind = previewDocument.kind === "sequence" ? "sequence" : "frame-diagram";
      const diagram = documentKind === "frame-diagram"
        ? loadFrameDiagram(slug, deps.framePreviewDocumentDeps)
        : null;
      const frameDiagramSummary = diagram ? summarizeFrameDiagramCompatibility(diagram) : undefined;
      const authoredLayoutEngine = documentKind === "sequence"
        ? "sequence"
        : deps.normalizeLayoutEngine(diagram?.layoutEngine);
      const compatibleContext: Omit<PreviewEngineContext, "layoutEngine"> = {
        shellMode: "grid",
        previewDocumentKind: documentKind,
        frameDiagramSummary,
      };
      const previewContext: PreviewEngineContext = {
        layoutEngine: authoredLayoutEngine,
        ...compatibleContext,
      };
      const engineManifest = resolvePreviewEngine(previewContext);
      const activeLayoutEngine = engineManifest?.layoutEngineKey ?? authoredLayoutEngine;
      const compatibleEngines = listCompatiblePreviewEngines(compatibleContext)
        .map((entry) => entry.layoutEngineKey)
        .filter((key): key is string => typeof key === "string" && key.length > 0);
      const configScript = [
        "window.__DG_CONFIG = {",
        `"slug":"${slug}",`,
        `"engine":"${engineManifest?.id ?? "v3"}",`,
        '"shell_mode":"grid",',
        `"layout_engine":"${activeLayoutEngine}",`,
        `"compatible_engines":${JSON.stringify(compatibleEngines)},`,
        '"grid":false,',
        `"inset":${deps.inset ?? INSET},`,
        `"head_len":${deps.headLength ?? ARROW_HEAD_LENGTH},`,
        `"head_half":${deps.headHalfWidth ?? ARROW_HEAD_HALF_WIDTH},`,
        `"icon_size":${deps.iconSize ?? ICON_SIZE},`,
        `"col_gap":${deps.gridGutter ?? GRID_GUTTER},`,
        `"has_reference":${String(documentKind === "frame-diagram" && deps.findReferenceImage(slug) !== null).toLowerCase()}`,
        "};",
      ].join("");
      const engineScripts = previewEngineScriptTags(engineManifest, deps);
      const modeScripts =
        `<script src="${deps.previewAssetUrl("layout-engine.js")}"></script>\n` +
        (engineScripts ? `${engineScripts}\n` : "") +
        `<script src="${deps.previewAssetUrl("layout-bridge.js")}"></script>\n` +
        `<script src="${deps.previewAssetUrl("component-model.js")}"></script>\n` +
        `<script src="${deps.previewAssetUrl("constraints.js")}"></script>\n` +
        `<script src="${deps.previewAssetUrl("editor.js")}"></script>\n` +
        `<script src="${deps.previewAssetUrl("engine-switcher.js")}"></script>`;
      return buildPreviewViewerHtml({
        slug,
        definition: AUTOLAYOUT_PREVIEW_VIEWER_DEFINITION,
        configScript,
        modeScriptsHtml: modeScripts,
        visibleSidebarSections: engineManifest?.hostView?.sidebarSections ?? [],
        templateHtml: deps.templateHtml,
        browseSections: buildRegisteredPreviewBrowseSections(),
        baselineStylesHtml: deps.baselineStylesHtml,
      });
    },
    describeMissing: (slug: string) => `Unknown diagram: ${slug}`,
    documentApi: {
      loadPreviewDocument: (slug: string) => previewDocumentForSlug(slug, deps.framePreviewDocumentDeps),
      loadFrameTree: (slug: string) => frameTreeForSlug(slug, deps.framePreviewDocumentDeps),
      loadComponentTree: (slug: string) => componentTreeForSlug(slug, deps.framePreviewDocumentDeps),
      loadGridInfo: (slug: string) => gridInfoForSlug(slug, deps.framePreviewDocumentDeps),
      renderSvg: (slug: string) => renderSvgForSlug(slug, deps.framePreviewRenderDeps),
      saveDocument: (slug: string, payload: unknown) =>
        saveFramePreviewDocument(slug, payload, {
          framePreviewDocumentDeps: deps.framePreviewDocumentDeps,
          parseYaml: deps.parseYaml,
          normalizeLayoutEngine: deps.normalizeLayoutEngine,
        }),
    },
  };
}

export function createForcePreviewHostViewerRoute(
  deps: BuiltinPreviewHostViewerRouteDeps,
): PreviewHostViewerRouteDescriptor {
  return {
    key: "force",
    lane: FORCE_HOST_LANE,
    routePrefixes: ["/force/view/"],
    listSlugs: () => deps.listForceExamples(),
    hasDocument: (slug: string) =>
      existsSync(path.join(deps.forcePreviewDocumentDeps.forceDefinitionsDir, `${slug}.yaml`)),
    buildHtml: (slug: string) => {
      const engineManifest = resolvePreviewEngine({ shellMode: "force" });
      const configScript = [
        "window.__DG_FORCE_CONFIG = {",
        `"slug":"${slug}",`,
        `"inset":${deps.inset ?? INSET},`,
        `"body_line_step":${deps.bodyLineStep ?? BODY_LINE_STEP},`,
        `"head_len":${deps.headLength ?? ARROW_HEAD_LENGTH},`,
        `"head_half":${deps.headHalfWidth ?? ARROW_HEAD_HALF_WIDTH}`,
        "};",
      ].join("");
      const engineScripts = previewEngineScriptTags(engineManifest, deps);
      const modeScripts =
        `<script src="${deps.previewAssetUrl("layout-engine.js")}"></script>\n${engineScripts}`;
      return buildPreviewViewerHtml({
        slug,
        definition: FORCE_PREVIEW_VIEWER_DEFINITION,
        configScript,
        modeScriptsHtml: modeScripts,
        visibleSidebarSections: engineManifest?.hostView?.sidebarSections ?? [],
        templateHtml: deps.templateHtml,
        browseSections: buildRegisteredPreviewBrowseSections(),
        baselineStylesHtml: deps.baselineStylesHtml,
      });
    },
    describeMissing: (slug: string) => `Unknown force example: ${slug}`,
    documentApi: {
      loadAuthoredSpec: (slug: string) =>
        loadForcePreviewDocumentSpec(slug, {
          forcePreviewDocumentDeps: deps.forcePreviewDocumentDeps,
          parseYaml: deps.parseYaml,
        }),
      saveDocument: (slug: string, payload: unknown) =>
        saveForcePreviewDocument(slug, payload, {
          forcePreviewDocumentDeps: deps.forcePreviewDocumentDeps,
          parseYaml: deps.parseYaml,
        }),
    },
  };
}

export function installBuiltinPreviewHostViewerRoutes(
  deps: BuiltinPreviewHostViewerRouteDeps,
): () => void {
  const unregisterForce = registerPreviewHostViewerRoute(
    createForcePreviewHostViewerRoute(deps),
  );
  const unregisterAutolayout = registerPreviewHostViewerRoute(
    createAutolayoutPreviewHostViewerRoute(deps),
  );
  return () => {
    unregisterAutolayout();
    unregisterForce();
  };
}
