import path from "node:path";

import {
  ARROW_HEAD_HALF_WIDTH,
  ARROW_HEAD_LENGTH,
  createPreviewEngineWorkspaceState,
  FRAME_PREVIEW_SHELL_MODE,
  getPreviewEngineByLayoutKey,
  GRID_GUTTER,
  ICON_SIZE,
  INSET,
  resolvePreviewTemplateSectionVisibilityPlaceholders,
  resolvePreviewVisibleTemplateSections,
  shouldShowPreviewEngineSwitcher,
} from "@diagram-generator/layout-engine";

import { installPreviewHostApiRoutes } from "./api-routes.js";
import {
  BUILTIN_AUTOLAYOUT_PREVIEW_HOST_MODULE_KEY,
  requirePreviewHostModuleContext,
  type BuiltinAutolayoutPreviewHostModuleDeps,
} from "./builtin-host-deps.js";
import {
  createPreviewHostDocumentGetBytesRoute,
  createPreviewHostDocumentGetJsonRoute,
  createPreviewHostDocumentPostJsonRoute,
} from "./document-api-routes.js";
import {
  createFramePreviewHostDocumentEndpoints,
  FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS,
} from "./document-apis.js";
import {
  frameDiagramExists,
  importInterchangeForSlug,
  InterchangeImportBlockedError,
  resolveFramePreviewViewerContext,
} from "./frame-documents.js";
import { AUTOLAYOUT_HOST_LANE } from "./lanes.js";
import type { PreviewHostModuleDescriptor, PreviewHostModuleInstallDeps } from "./modules.js";
import {
  buildRegisteredPreviewBrowseSections,
  registerPreviewHostViewerRoute,
} from "./registry.js";
import type {
  PreviewHostApiRouteDescriptor,
  PreviewHostApiRouteHandlerContext,
  PreviewHostBrowseSection,
  PreviewHostViewerPageDefinition,
  PreviewHostViewerRouteDescriptor,
} from "./types.js";
import {
  buildPreviewModeScriptsHtml,
  buildPreviewViewerHtml,
  buildPreviewWindowConfigScript,
} from "./viewers.js";

const BUILTIN_PREVIEW_SECTION_VISIBILITY_PLACEHOLDERS =
  resolvePreviewTemplateSectionVisibilityPlaceholders();

const AUTOLAYOUT_PREVIEW_VIEWER_DEFINITION: PreviewHostViewerPageDefinition = {
  mode: "grid",
  inspectorEmptyText: "Click a component to inspect it.",
  sectionVisibilityPlaceholders: BUILTIN_PREVIEW_SECTION_VISIBILITY_PLACEHOLDERS,
  buildTitle(slug: string): string {
    return `${slug} – diagram preview`;
  },
  buildCurrentPath(slug: string): string {
    return AUTOLAYOUT_HOST_LANE.buildViewerPath(slug);
  },
};

function missingAutolayoutDiagramMessage(slug: string): string {
  return `Unknown diagram: ${slug}`;
}

function resolveSvgExportSlug(pathname: string): string | null {
  const rawName = pathname.startsWith("/svg/")
    ? pathname.slice("/svg/".length)
    : pathname.slice("/v3/svg/".length);
  let decodedName: string;
  try {
    decodedName = decodeURIComponent(rawName);
  } catch {
    return null;
  }
  if (decodedName.includes("/") || decodedName.includes("\\")) return null;
  const safeName = path.posix.basename(decodedName);
  return safeName
    .replace(/-onbrand-v3-grid\.svg$/i, "")
    .replace(/-onbrand-v3\.svg$/i, "");
}

function resolveDrawioExportSlug(pathname: string): string | null {
  const rawName = pathname.startsWith("/drawio/")
    ? pathname.slice("/drawio/".length)
    : pathname.slice("/v3/drawio/".length);
  let decodedName: string;
  try {
    decodedName = decodeURIComponent(rawName);
  } catch {
    return null;
  }
  if (decodedName.includes("/") || decodedName.includes("\\")) return null;
  const safeName = path.posix.basename(decodedName);
  return safeName.replace(/\.drawio$/i, "");
}

function resolveInterchangeExportSlug(
  _match: unknown,
  context: PreviewHostApiRouteHandlerContext,
): string | null {
  const rawSlug = new URL(context.req.url ?? "", "http://127.0.0.1").searchParams.get("slug") ?? "";
  return /^[A-Za-z0-9._:-]+$/.test(rawSlug) ? rawSlug : null;
}

function readInterchangeImportSource(payload: unknown): string {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Import payload must be an object");
  }
  const source = (payload as Record<string, unknown>).source;
  if (typeof source !== "string" || source.trim().length === 0) {
    throw new Error("Import source is required");
  }
  return source;
}

function readWorkspaceRevision(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const revision = (payload as Record<string, unknown>).workspaceRevision;
  return typeof revision === "string" ? revision : null;
}

function createPreviewInterchangeImportHostApiRoute(
  format: "mermaid" | "d2",
  deps: BuiltinAutolayoutPreviewHostModuleDeps,
): PreviewHostApiRouteDescriptor {
  return {
    key: `${format}-import`,
    method: "POST",
    routePrefixes: [`/api/import/${format}`],
    matchMode: "exact",
    async handle(_match, context) {
      const rawSlug = new URL(context.req.url ?? "", "http://127.0.0.1").searchParams.get("slug") ?? "";
      if (!/^[A-Za-z0-9._:-]+$/.test(rawSlug)) {
        context.sendText(400, "Invalid import slug");
        return;
      }
      try {
        const payload = await context.readJsonBody(context.req);
        const resolved = deps.resolveFrameDir?.(rawSlug);
        if (deps.resolveFrameDir && !resolved) {
          context.sendText(404, `Unknown diagram: ${rawSlug}`);
          return;
        }
        if (resolved && !resolved.writable) {
          context.sendText(403, `Workspace source '${resolved.sourceId}' is read-only`);
          return;
        }
        const expectedRevision = readWorkspaceRevision(payload);
        if (
          expectedRevision !== null
          && resolved?.revision !== null
          && expectedRevision !== resolved?.revision
        ) {
          context.sendJson(409, {
            error: "This diagram changed on disk after it was opened.",
            workspaceRevision: resolved?.revision ?? null,
          });
          return;
        }
        const result = importInterchangeForSlug(
          resolved?.slug ?? rawSlug,
          format,
          readInterchangeImportSource(payload),
          resolved
            ? { ...deps.framePreviewDocumentDeps, framesDir: resolved.framesDir }
            : deps.framePreviewDocumentDeps,
        );
        const workspaceRevision = deps.resolveFrameDir?.(rawSlug)?.revision ?? null;
        context.sendJson(201, { ...result, workspaceRevision });
      } catch (error) {
        if (error instanceof InterchangeImportBlockedError) {
          context.sendJson(422, {
            error: error.message,
            summary: error.summary,
            warnings: error.warnings,
          });
          return;
        }
        context.sendText(400, error instanceof Error ? error.message : String(error));
      }
    },
  };
}

function collectWorkspaceEngineScripts(
  compatibleEngineIds: readonly string[],
  activeEngineId: string | null,
): string[] {
  const orderedEngineIds = [
    ...(activeEngineId ? [activeEngineId] : []),
    ...compatibleEngineIds,
  ];
  const seenEngineIds = new Set<string>();
  const seenScripts = new Set<string>();
  const scripts: string[] = [];

  for (const engineId of orderedEngineIds) {
    const key = String(engineId ?? "").trim();
    if (!key || seenEngineIds.has(key)) {
      continue;
    }
    seenEngineIds.add(key);
    const engine = getPreviewEngineByLayoutKey(key);
    if (!engine) {
      continue;
    }
    for (const script of engine.scripts ?? []) {
      const name = String(script ?? "").trim();
      if (!name || seenScripts.has(name)) {
        continue;
      }
      seenScripts.add(name);
      scripts.push(name);
    }
  }

  return scripts;
}

export function createFrameOverridesPreviewHostApiRoute(): PreviewHostApiRouteDescriptor {
  return createPreviewHostDocumentPostJsonRoute({
    key: "frame-overrides",
    routePrefixes: ["/api/overrides/"],
    documentEndpointKind: FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.saveDocument,
    routeKey: "autolayout",
    missingMessage: (slug: string) => `Unknown frame slug: ${slug}`,
  });
}

export function createPreviewDocumentPreviewHostApiRoute(): PreviewHostApiRouteDescriptor {
  return createPreviewHostDocumentGetJsonRoute({
    key: "preview-document",
    routePrefixes: ["/api/preview-document/"],
    documentEndpointKind: FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.previewDocument,
    routeKey: "autolayout",
    missingMessage: missingAutolayoutDiagramMessage,
  });
}

export function createFrameTreePreviewHostApiRoute(): PreviewHostApiRouteDescriptor {
  return createPreviewHostDocumentGetJsonRoute({
    key: "frame-tree",
    routePrefixes: ["/api/frame-tree/"],
    documentEndpointKind: FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.frameTree,
    routeKey: "autolayout",
    missingMessage: missingAutolayoutDiagramMessage,
  });
}

export function createComponentTreePreviewHostApiRoute(): PreviewHostApiRouteDescriptor {
  return createPreviewHostDocumentGetJsonRoute({
    key: "component-tree",
    routePrefixes: ["/api/tree/"],
    documentEndpointKind: FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.componentTree,
    routeKey: "autolayout",
    missingMessage: missingAutolayoutDiagramMessage,
  });
}

export function createGridInfoPreviewHostApiRoute(): PreviewHostApiRouteDescriptor {
  return createPreviewHostDocumentGetJsonRoute({
    key: "grid-info",
    routePrefixes: ["/api/grid/"],
    documentEndpointKind: FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.gridInfo,
    routeKey: "autolayout",
    missingMessage: missingAutolayoutDiagramMessage,
  });
}

export function createPreviewSvgHostApiRoute(): PreviewHostApiRouteDescriptor {
  return createPreviewHostDocumentGetBytesRoute({
    key: "svg-export",
    routePrefixes: ["/svg/", "/v3/svg/"],
    documentEndpointKind: FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.svgExport,
    routeKey: "autolayout",
    missingMessage: missingAutolayoutDiagramMessage,
    contentType: "image/svg+xml",
    resolveSlug: (match) => resolveSvgExportSlug(match.pathname),
    transformResult: (value) => Buffer.from(String(value), "utf8"),
  });
}

export function createPreviewDrawioHostApiRoute(): PreviewHostApiRouteDescriptor {
  return createPreviewHostDocumentGetBytesRoute({
    key: "drawio-export",
    routePrefixes: ["/drawio/", "/v3/drawio/"],
    documentEndpointKind: FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.drawioExport,
    routeKey: "autolayout",
    missingMessage: missingAutolayoutDiagramMessage,
    contentType: "application/xml; charset=utf-8",
    resolveSlug: (match) => resolveDrawioExportSlug(match.pathname),
    transformResult: (value) => Buffer.from(String(value), "utf8"),
  });
}

export function createPreviewMermaidHostApiRoute(): PreviewHostApiRouteDescriptor {
  return createPreviewHostDocumentGetBytesRoute({
    key: "mermaid-export",
    routePrefixes: ["/api/export/mermaid"],
    matchMode: "exact",
    documentEndpointKind: FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.mermaidExport,
    routeKey: "autolayout",
    missingMessage: missingAutolayoutDiagramMessage,
    resolveSlug: resolveInterchangeExportSlug,
    contentType: "text/plain; charset=utf-8",
    transformResult: (value) => Buffer.from(String(value), "utf8"),
  });
}

export function createPreviewD2HostApiRoute(): PreviewHostApiRouteDescriptor {
  return createPreviewHostDocumentGetBytesRoute({
    key: "d2-export",
    routePrefixes: ["/api/export/d2"],
    matchMode: "exact",
    documentEndpointKind: FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.d2Export,
    routeKey: "autolayout",
    missingMessage: missingAutolayoutDiagramMessage,
    resolveSlug: resolveInterchangeExportSlug,
    contentType: "text/plain; charset=utf-8",
    transformResult: (value) => Buffer.from(String(value), "utf8"),
  });
}

export const AUTOLAYOUT_PREVIEW_HOST_API_ROUTES = [
  createFrameOverridesPreviewHostApiRoute(),
  createPreviewDocumentPreviewHostApiRoute(),
  createFrameTreePreviewHostApiRoute(),
  createComponentTreePreviewHostApiRoute(),
  createGridInfoPreviewHostApiRoute(),
  createPreviewSvgHostApiRoute(),
  createPreviewDrawioHostApiRoute(),
  createPreviewMermaidHostApiRoute(),
  createPreviewD2HostApiRoute(),
] as const;

export function installBuiltinAutolayoutPreviewHostApiRoutes(
  deps?: BuiltinAutolayoutPreviewHostModuleDeps,
): () => void {
  const routes = deps
    ? [
        ...AUTOLAYOUT_PREVIEW_HOST_API_ROUTES,
        createPreviewInterchangeImportHostApiRoute("mermaid", deps),
        createPreviewInterchangeImportHostApiRoute("d2", deps),
      ]
    : AUTOLAYOUT_PREVIEW_HOST_API_ROUTES;
  return installPreviewHostApiRoutes(routes);
}

export function createAutolayoutPreviewHostViewerRoute(
  deps: BuiltinAutolayoutPreviewHostModuleDeps,
): PreviewHostViewerRouteDescriptor {
  const resolveDocContext = (
    slug: string,
  ): {
    deps: typeof deps.framePreviewDocumentDeps;
    slug: string;
    sourceId: string;
    writable: boolean;
    revision: string | null;
  } | null => {
    if (!deps.resolveFrameDir) {
      return {
        deps: deps.framePreviewDocumentDeps,
        slug,
        sourceId: "default",
        writable: true,
        revision: null,
      };
    }
    const resolved = deps.resolveFrameDir(slug);
    if (!resolved) return null;
    return {
      deps: { ...deps.framePreviewDocumentDeps, framesDir: resolved.framesDir },
      slug: resolved.slug,
      sourceId: resolved.sourceId,
      writable: resolved.writable,
      revision: resolved.revision,
    };
  };
  return {
    key: "autolayout",
    lane: AUTOLAYOUT_HOST_LANE,
    routePrefixes: ["/view/"],
    listSlugs: () => deps.listAutolayoutDiagrams(),
    listBrowseSections: deps.listAutolayoutBrowseSections
      ? (): readonly PreviewHostBrowseSection[] => deps.listAutolayoutBrowseSections?.() ?? []
      : undefined,
    hasDocument: (slug: string) => {
      const docCtx = resolveDocContext(slug);
      return docCtx !== null && frameDiagramExists(docCtx.slug, docCtx.deps);
    },
    buildHtml: (slug: string) => {
      const docCtx = resolveDocContext(slug);
      if (!docCtx) throw new Error(`Unknown diagram: ${slug}`);
      const {
        authoredLayoutEngine,
        documentKind,
        engineManifest,
        activeLayoutEngine,
        compatibleEngines,
        hasReference,
      } = resolveFramePreviewViewerContext(
        docCtx.slug,
        docCtx.deps,
        {
          normalizeLayoutEngine: deps.normalizeLayoutEngine,
          findReferenceImage: deps.findReferenceImage,
        },
      );
      const engineWorkspace = createPreviewEngineWorkspaceState({
        activeEngine: engineManifest ?? null,
        compatibleEngineIds: engineManifest?.layoutEngineKey && !compatibleEngines.includes(engineManifest.layoutEngineKey)
          ? [...compatibleEngines, engineManifest.layoutEngineKey]
          : compatibleEngines,
        getEngineById: (engineId) => getPreviewEngineByLayoutKey(engineId) ?? null,
        persistedEngineId: authoredLayoutEngine,
      });
      const previewUiContext = {
        shellMode: FRAME_PREVIEW_SHELL_MODE,
        documentKind,
        engineWorkspace,
        activeEngine: engineWorkspace.activeEngine ?? engineManifest ?? null,
        compatibleEngines: engineWorkspace.compatibleEngineIds,
        persistedLayoutEngine: engineWorkspace.persistedEngineId,
        documentState: { hasReference },
      };
      const visibleTemplateSections = resolvePreviewVisibleTemplateSections(previewUiContext);
      const showEngineSwitcher = shouldShowPreviewEngineSwitcher(previewUiContext);
      const showEngineWorkspaceChrome = showEngineSwitcher || Boolean(engineWorkspace.activeEngineId);
      const configScript = buildPreviewWindowConfigScript("__DG_CONFIG", {
        slug,
        engine: engineWorkspace.activeEngine?.id ?? (engineManifest?.id ?? (activeLayoutEngine || "v3")),
        shell_mode: FRAME_PREVIEW_SHELL_MODE,
        document_kind: documentKind,
        layout_engine: activeLayoutEngine,
        active_engine_id: engineWorkspace.activeEngineId,
        persisted_layout_engine: engineWorkspace.persistedEngineId,
        compatible_engines: engineWorkspace.compatibleEngineIds,
        show_engine_switcher: showEngineSwitcher,
        grid: false,
        inset: deps.inset ?? INSET,
        head_len: deps.headLength ?? ARROW_HEAD_LENGTH,
        head_half: deps.headHalfWidth ?? ARROW_HEAD_HALF_WIDTH,
        icon_size: deps.iconSize ?? ICON_SIZE,
        col_gap: deps.gridGutter ?? GRID_GUTTER,
        has_reference: hasReference,
        workspace_source_id: docCtx.sourceId,
        workspace_writable: docCtx.writable,
        workspace_revision: docCtx.revision,
      });
      const modeScripts = buildPreviewModeScriptsHtml({
        previewAssetUrl: deps.previewAssetUrl,
        coreScripts: [
          "layout-engine.js",
          "save-client.js",
          "layout-bridge.js",
          "component-model.js",
          "constraints.js",
        ],
        engineScripts: [
          ...collectWorkspaceEngineScripts(
            engineWorkspace.compatibleEngineIds,
            engineWorkspace.activeEngineId,
          ),
          "editor.js",
          ...(showEngineWorkspaceChrome ? ["engine-switcher.js"] : []),
        ],
      });
      return buildPreviewViewerHtml({
        slug,
        definition: AUTOLAYOUT_PREVIEW_VIEWER_DEFINITION,
        configScript,
        modeScriptsHtml: modeScripts,
        visibleSidebarSections: visibleTemplateSections,
        templateHtml: deps.templateHtml,
        browseSections: buildRegisteredPreviewBrowseSections(),
        baselineStylesHtml: deps.baselineStylesHtml,
      });
    },
    describeMissing: missingAutolayoutDiagramMessage,
    documentEndpoints: createFramePreviewHostDocumentEndpoints({
      framePreviewDocumentDeps: deps.framePreviewDocumentDeps,
      framePreviewRenderDeps: deps.framePreviewRenderDeps,
      parseYaml: deps.parseYaml,
      normalizeLayoutEngine: deps.normalizeLayoutEngine,
      resolveFrameDir: deps.resolveFrameDir,
    }),
  };
}

export function installBuiltinAutolayoutPreviewHostViewerRoutes(
  deps: BuiltinAutolayoutPreviewHostModuleDeps,
): () => void {
  return registerPreviewHostViewerRoute(createAutolayoutPreviewHostViewerRoute(deps));
}

export function installBuiltinAutolayoutPreviewHostModule(
  deps: PreviewHostModuleInstallDeps,
): () => void {
  const moduleDeps = requirePreviewHostModuleContext<BuiltinAutolayoutPreviewHostModuleDeps>(
    deps,
    BUILTIN_AUTOLAYOUT_PREVIEW_HOST_MODULE_KEY,
  );
  const unregisterViewerRoute = installBuiltinAutolayoutPreviewHostViewerRoutes(moduleDeps);
  const unregisterApiRoutes = installBuiltinAutolayoutPreviewHostApiRoutes(moduleDeps);
  return () => {
    unregisterApiRoutes();
    unregisterViewerRoute();
  };
}

export const BUILTIN_AUTOLAYOUT_PREVIEW_HOST_MODULE: PreviewHostModuleDescriptor = {
  key: BUILTIN_AUTOLAYOUT_PREVIEW_HOST_MODULE_KEY,
  install: installBuiltinAutolayoutPreviewHostModule,
};
