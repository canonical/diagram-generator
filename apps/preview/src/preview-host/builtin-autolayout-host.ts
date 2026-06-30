import path from "node:path";

import {
  ARROW_HEAD_HALF_WIDTH,
  ARROW_HEAD_LENGTH,
  createPreviewEngineWorkspaceState,
  getPreviewEngineByLayoutKey,
  GRID_GUTTER,
  ICON_SIZE,
  INSET,
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
  PreviewHostViewerPageDefinition,
  PreviewHostViewerRouteDescriptor,
} from "./types.js";
import {
  buildPreviewModeScriptsHtml,
  buildPreviewViewerHtml,
  buildPreviewWindowConfigScript,
} from "./viewers.js";

const AUTOLAYOUT_PREVIEW_VIEWER_DEFINITION: PreviewHostViewerPageDefinition = {
  mode: "grid",
  inspectorEmptyText: "Click a component to inspect it.",
  sectionVisibilityPlaceholders: [
    {
      placeholder: "%GRID_LAYERS_TAB_HIDDEN%",
      section: "grid-layers-tab",
    },
    {
      placeholder: "%GRID_LAYERS_PANE_HIDDEN%",
      section: "grid-layers-pane",
    },
    {
      placeholder: "%GRID_ENGINE_SWITCHER_HIDDEN%",
      section: "grid-engine-switcher",
    },
    {
      placeholder: "%GRID_CONTROLS_HIDDEN%",
      section: "grid-controls",
    },
    {
      placeholder: "%GRID_OVERRIDES_HIDDEN%",
      section: "grid-overrides",
    },
    {
      placeholder: "%GRID_CONSTRAINTS_HIDDEN%",
      section: "grid-constraints",
    },
    {
      placeholder: "%GRID_GUIDE_BADGE_HIDDEN%",
      section: "grid-guide-badge",
    },
    {
      placeholder: "%FORCE_NODES_TAB_HIDDEN%",
      section: "force-nodes-tab",
    },
    {
      placeholder: "%FORCE_NODES_PANE_HIDDEN%",
      section: "force-nodes-pane",
    },
    {
      placeholder: "%FORCE_SOLVER_HIDDEN%",
      section: "force-solver",
    },
    {
      placeholder: "%FORCE_SIMULATION_HIDDEN%",
      section: "force-simulation",
    },
    {
      placeholder: "%FORCE_GUIDANCE_HIDDEN%",
      section: "force-guidance",
    },
    {
      placeholder: "%LAYOUT_PARAMS_SECTION_HIDDEN%",
      section: "layout-params",
    },
  ],
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
  const safeName = path.posix.basename(rawName);
  return safeName
    .replace(/-onbrand-v3-grid\.svg$/i, "")
    .replace(/-onbrand-v3\.svg$/i, "");
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

export const AUTOLAYOUT_PREVIEW_HOST_API_ROUTES = [
  createFrameOverridesPreviewHostApiRoute(),
  createPreviewDocumentPreviewHostApiRoute(),
  createFrameTreePreviewHostApiRoute(),
  createComponentTreePreviewHostApiRoute(),
  createGridInfoPreviewHostApiRoute(),
  createPreviewSvgHostApiRoute(),
] as const;

export function installBuiltinAutolayoutPreviewHostApiRoutes(): () => void {
  return installPreviewHostApiRoutes(AUTOLAYOUT_PREVIEW_HOST_API_ROUTES);
}

export function createAutolayoutPreviewHostViewerRoute(
  deps: BuiltinAutolayoutPreviewHostModuleDeps,
): PreviewHostViewerRouteDescriptor {
  return {
    key: "autolayout",
    lane: AUTOLAYOUT_HOST_LANE,
    routePrefixes: ["/v3/view/", "/view/"],
    listSlugs: () => deps.listAutolayoutDiagrams(),
    hasDocument: (slug: string) => frameDiagramExists(slug, deps.framePreviewDocumentDeps),
    buildHtml: (slug: string) => {
      const {
        authoredLayoutEngine,
        documentKind,
        engineManifest,
        activeLayoutEngine,
        compatibleEngines,
        hasReference,
      } = resolveFramePreviewViewerContext(
        slug,
        deps.framePreviewDocumentDeps,
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
        shellMode: "grid" as const,
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
        shell_mode: "grid",
        document_kind: documentKind,
        layout_engine: activeLayoutEngine,
        active_engine_id: engineWorkspace.activeEngineId,
        active_engine_label: engineWorkspace.activeEngine?.label ?? null,
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
  const unregisterApiRoutes = installBuiltinAutolayoutPreviewHostApiRoutes();
  return () => {
    unregisterApiRoutes();
    unregisterViewerRoute();
  };
}

export const BUILTIN_AUTOLAYOUT_PREVIEW_HOST_MODULE: PreviewHostModuleDescriptor = {
  key: BUILTIN_AUTOLAYOUT_PREVIEW_HOST_MODULE_KEY,
  install: installBuiltinAutolayoutPreviewHostModule,
};
