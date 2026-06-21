import {
  ARROW_HEAD_HALF_WIDTH,
  ARROW_HEAD_LENGTH,
  BODY_LINE_STEP,
  INSET,
  resolvePreviewEngine,
} from "@diagram-generator/layout-engine";

import { installPreviewHostApiRoutes } from "./api-routes.js";
import type { BuiltinPreviewHostViewerRouteDeps } from "./builtin-host-deps.js";
import {
  createPreviewHostDocumentGetJsonRoute,
  createPreviewHostDocumentPostJsonRoute,
} from "./document-api-routes.js";
import {
  createForcePreviewHostDocumentEndpoints,
  FORCE_PREVIEW_HOST_DOCUMENT_ENDPOINTS,
} from "./document-apis.js";
import { forcePreviewDocumentExists } from "./force-documents.js";
import { FORCE_HOST_LANE } from "./lanes.js";
import type { PreviewHostModuleDescriptor } from "./modules.js";
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

export interface BuiltinForcePreviewHostModuleDeps
  extends BuiltinPreviewHostViewerRouteDeps {}

const FORCE_TEMPLATE_SECTIONS = [
  "force-nodes-tab",
  "force-nodes-pane",
  "force-solver",
  "force-simulation",
  "force-guidance",
] as const;

const FORCE_PREVIEW_VIEWER_DEFINITION: PreviewHostViewerPageDefinition = {
  mode: "force",
  inspectorEmptyText: "Click a node to select it.",
  alwaysVisibleTemplateSections: FORCE_TEMPLATE_SECTIONS,
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
    return `${slug} – force preview`;
  },
  buildCurrentPath(slug: string): string {
    return FORCE_HOST_LANE.buildViewerPath(slug);
  },
};

function missingForceExampleMessage(slug: string): string {
  return `Unknown force example: ${slug}`;
}

export function createForceSavePreviewHostApiRoute(): PreviewHostApiRouteDescriptor {
  return createPreviewHostDocumentPostJsonRoute({
    key: "force-save",
    routePrefixes: ["/api/force-save/"],
    documentEndpointKind: FORCE_PREVIEW_HOST_DOCUMENT_ENDPOINTS.saveDocument,
    routeKey: "force",
    missingMessage: missingForceExampleMessage,
  });
}

export function createForceSpecPreviewHostApiRoute(): PreviewHostApiRouteDescriptor {
  return createPreviewHostDocumentGetJsonRoute({
    key: "force-spec",
    routePrefixes: ["/api/force-spec/"],
    documentEndpointKind: FORCE_PREVIEW_HOST_DOCUMENT_ENDPOINTS.documentSpec,
    routeKey: "force",
    missingMessage: missingForceExampleMessage,
  });
}

export const FORCE_PREVIEW_HOST_API_ROUTES = [
  createForceSavePreviewHostApiRoute(),
  createForceSpecPreviewHostApiRoute(),
] as const;

export function installBuiltinForcePreviewHostApiRoutes(): () => void {
  return installPreviewHostApiRoutes(FORCE_PREVIEW_HOST_API_ROUTES);
}

export function createForcePreviewHostViewerRoute(
  deps: BuiltinForcePreviewHostModuleDeps,
): PreviewHostViewerRouteDescriptor {
  return {
    key: "force",
    lane: FORCE_HOST_LANE,
    routePrefixes: ["/force/view/"],
    listSlugs: () => deps.listForceExamples(),
    hasDocument: (slug: string) => forcePreviewDocumentExists(slug, deps.forcePreviewDocumentDeps),
    buildHtml: (slug: string) => {
      const engineManifest = resolvePreviewEngine({ shellMode: "force" });
      const configScript = buildPreviewWindowConfigScript("__DG_FORCE_CONFIG", {
        slug,
        inset: deps.inset ?? INSET,
        body_line_step: deps.bodyLineStep ?? BODY_LINE_STEP,
        head_len: deps.headLength ?? ARROW_HEAD_LENGTH,
        head_half: deps.headHalfWidth ?? ARROW_HEAD_HALF_WIDTH,
      });
      const modeScripts = buildPreviewModeScriptsHtml({
        previewAssetUrl: deps.previewAssetUrl,
        coreScripts: ["layout-engine.js", "save-client.js"],
        engineScripts: engineManifest?.scripts ?? [],
      });
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
    describeMissing: missingForceExampleMessage,
    documentEndpoints: createForcePreviewHostDocumentEndpoints({
      forcePreviewDocumentDeps: deps.forcePreviewDocumentDeps,
      parseYaml: deps.parseYaml,
    }),
  };
}

export function installBuiltinForcePreviewHostViewerRoutes(
  deps: BuiltinForcePreviewHostModuleDeps,
): () => void {
  return registerPreviewHostViewerRoute(createForcePreviewHostViewerRoute(deps));
}

export function installBuiltinForcePreviewHostModule(
  deps: BuiltinForcePreviewHostModuleDeps,
): () => void {
  const unregisterViewerRoute = installBuiltinForcePreviewHostViewerRoutes(deps);
  const unregisterApiRoutes = installBuiltinForcePreviewHostApiRoutes();
  return () => {
    unregisterApiRoutes();
    unregisterViewerRoute();
  };
}

export const BUILTIN_FORCE_PREVIEW_HOST_MODULE: PreviewHostModuleDescriptor = {
  key: "builtin-force",
  install: installBuiltinForcePreviewHostModule,
};
