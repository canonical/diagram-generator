import {
  ARROW_HEAD_HALF_WIDTH,
  ARROW_HEAD_LENGTH,
  BODY_LINE_STEP,
  FORCE_PREVIEW_SHELL_MODE,
  INSET,
  resolvePreviewTemplateSectionVisibilityPlaceholders,
  resolvePreviewVisibleTemplateSections,
  resolvePreviewEngine,
} from "@diagram-generator/layout-engine";

import { installPreviewHostApiRoutes } from "./api-routes.js";
import {
  BUILTIN_FORCE_PREVIEW_HOST_MODULE_KEY,
  requirePreviewHostModuleContext,
  type BuiltinForcePreviewHostModuleDeps,
} from "./builtin-host-deps.js";
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

const BUILTIN_PREVIEW_SECTION_VISIBILITY_PLACEHOLDERS =
  resolvePreviewTemplateSectionVisibilityPlaceholders();

const FORCE_PREVIEW_VIEWER_DEFINITION: PreviewHostViewerPageDefinition = {
  mode: "force",
  inspectorEmptyText: "Click a node to select it.",
  sectionVisibilityPlaceholders: BUILTIN_PREVIEW_SECTION_VISIBILITY_PLACEHOLDERS,
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
      const visibleTemplateSections = resolvePreviewVisibleTemplateSections({
        shellMode: "force",
        documentKind: "force-spec",
        activeEngine: engineManifest ?? null,
      });
      const configPayload = {
        slug,
        engine: engineManifest?.id ?? "force",
        shell_mode: FORCE_PREVIEW_SHELL_MODE,
        document_kind: "force-spec",
        layout_engine: engineManifest?.layoutEngineKey ?? engineManifest?.id ?? "force",
        inset: deps.inset ?? INSET,
        body_line_step: deps.bodyLineStep ?? BODY_LINE_STEP,
        head_len: deps.headLength ?? ARROW_HEAD_LENGTH,
        head_half: deps.headHalfWidth ?? ARROW_HEAD_HALF_WIDTH,
      };
      const configScript = [
        buildPreviewWindowConfigScript("__DG_CONFIG", configPayload),
        buildPreviewWindowConfigScript("__DG_FORCE_CONFIG", configPayload),
      ].join("\n");
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
        visibleSidebarSections: visibleTemplateSections,
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
  deps: PreviewHostModuleInstallDeps,
): () => void {
  const moduleDeps = requirePreviewHostModuleContext<BuiltinForcePreviewHostModuleDeps>(
    deps,
    BUILTIN_FORCE_PREVIEW_HOST_MODULE_KEY,
  );
  const unregisterViewerRoute = installBuiltinForcePreviewHostViewerRoutes(moduleDeps);
  const unregisterApiRoutes = installBuiltinForcePreviewHostApiRoutes();
  return () => {
    unregisterApiRoutes();
    unregisterViewerRoute();
  };
}

export const BUILTIN_FORCE_PREVIEW_HOST_MODULE: PreviewHostModuleDescriptor = {
  key: BUILTIN_FORCE_PREVIEW_HOST_MODULE_KEY,
  install: installBuiltinForcePreviewHostModule,
};
