import path from "node:path";

import {
  ARROW_HEAD_HALF_WIDTH,
  ARROW_HEAD_LENGTH,
  GRID_GUTTER,
  ICON_SIZE,
  INSET,
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

const AUTOLAYOUT_TEMPLATE_SECTIONS = [
  "grid-layers-tab",
  "grid-layers-pane",
  "grid-engine-switcher",
  "grid-controls",
  "grid-elk-layout",
  "grid-overrides",
  "grid-constraints",
  "grid-guide-badge",
] as const;

const AUTOLAYOUT_PREVIEW_VIEWER_DEFINITION: PreviewHostViewerPageDefinition = {
  mode: "grid",
  inspectorEmptyText: "Click a component to inspect it.",
  alwaysVisibleTemplateSections: AUTOLAYOUT_TEMPLATE_SECTIONS,
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
      placeholder: "%GRID_ELK_LAYOUT_HIDDEN%",
      section: "grid-elk-layout",
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
      const configScript = buildPreviewWindowConfigScript("__DG_CONFIG", {
        slug,
        engine: engineManifest?.id ?? "v3",
        shell_mode: "grid",
        layout_engine: activeLayoutEngine,
        compatible_engines: compatibleEngines,
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
          ...(engineManifest?.scripts ?? []),
          "editor.js",
          "engine-switcher.js",
        ],
      });
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
