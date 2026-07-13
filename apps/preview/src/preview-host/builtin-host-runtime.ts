import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import {
  isFramePreviewShellMode,
  canonicalPreviewLayoutEngineKey,
  serializePreviewEngineManifest,
  type PreviewEngineManifest,
} from "@diagram-generator/layout-engine";

import type {
  BuiltinAutolayoutPreviewHostModuleDeps,
  BuiltinForcePreviewHostModuleDeps,
  BuiltinPreviewHostServerRouteDeps,
  PreviewHostSharedServerDeps,
  PreviewHostSharedViewerDeps,
} from "./builtin-host-deps.js";
import { buildIndexPageHtml } from "./pages.js";
import { buildRegisteredPreviewBrowseSections } from "./registry.js";
import { createServerRootSource } from "./workspace/server-root-source.js";
import { WorkspaceRegistry } from "./workspace/workspace-registry.js";
import type { DiagramWorkspaceSource } from "./workspace/diagram-workspace-source.js";
import type { FramePreviewDocumentDeps, FramePreviewRenderDeps } from "./frame-documents.js";
import type { ForcePreviewDocumentDeps } from "./force-documents.js";
import type { PreviewHostModuleInstallDeps } from "./modules.js";
import {
  BUILTIN_AUTOLAYOUT_PREVIEW_HOST_MODULE_KEY as AUTOLAYOUT_MODULE_KEY,
  BUILTIN_FORCE_PREVIEW_HOST_MODULE_KEY as FORCE_MODULE_KEY,
  BUILTIN_PREVIEW_HOST_SERVER_MODULE_KEY as SERVER_MODULE_KEY,
} from "./builtin-host-deps.js";

const REFERENCE_MAP: Record<string, string> = {
  "memory-wall": "redo-this-image-onbrand.png",
  "attention-qkv": "image 3.png",
  "logic-data-vram": "image 4.png",
  "request-to-hardware-stack": "image 6.png",
  "inference-snaps": "image 7.png",
  "example-arrow-label-separator": "example-arrow-label-separator-rough.svg",
  "force-stakeholders": "force/IMG_3229.jpg",
  "tiered-network-architecture": "maas/tiered-network-architecture.png",
};

export interface CreateBuiltinPreviewHostInstallDepsOptions
  extends PreviewHostSharedViewerDeps,
    Omit<PreviewHostSharedServerDeps, "buildIndexHtml"> {
  readonly framePreviewDocumentDeps: FramePreviewDocumentDeps;
  readonly framePreviewRenderDeps: FramePreviewRenderDeps;
  readonly forcePreviewDocumentDeps: ForcePreviewDocumentDeps;
  readonly framesDir: string;
  readonly corpusRefDir: string;
  readonly inputDirs: readonly string[];
  /**
   * Ordered workspace sources (spec 075). When provided, diagram listing and
   * per-request folder resolution route through these instead of the single
   * default frames directory. The first source is the default (bare-slug)
   * source; additional sources emit qualified `sourceId:slug` entries.
   */
  readonly workspaceSources?: readonly DiagramWorkspaceSource[];
}

function isSafeSlug(slug: string): boolean {
  return /^[A-Za-z0-9._:-]+$/.test(slug);
}

function listYamlSlugs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".yaml"))
    .map((entry) => path.basename(entry.name, ".yaml"))
    .filter((slug) => isSafeSlug(slug))
    .sort((a, b) => a.localeCompare(b));
}

function normalizeLayoutEngine(layoutEngine: string | undefined): string {
  const key = canonicalPreviewLayoutEngineKey(layoutEngine) ?? "";
  if (!key) return "";
  const hostableGridLayoutKeys = new Set(
    serializePreviewEngineManifest()
      .filter(
        (entry: PreviewEngineManifest): entry is PreviewEngineManifest & { layoutEngineKey: string } =>
          isFramePreviewShellMode(entry.shellMode) && typeof entry.layoutEngineKey === "string",
      )
      .map((entry) => entry.layoutEngineKey),
  );
  return hostableGridLayoutKeys.size === 0 || hostableGridLayoutKeys.has(key) ? key : "";
}

function findReferenceImage(
  slug: string,
  options: {
    readonly corpusRefDir: string;
    readonly inputDirs: readonly string[];
    readonly forceDefinitionsDir: string;
    readonly parseYaml: (raw: string) => unknown;
  },
): string | null {
  const corpus = path.join(options.corpusRefDir, `${slug}-source.png`);
  if (existsSync(corpus)) return corpus;

  const mapped = REFERENCE_MAP[slug];
  if (mapped) {
    for (const inputDir of options.inputDirs) {
      const candidate = path.join(inputDir, mapped);
      if (existsSync(candidate)) return candidate;
    }
  }

  const forceSpecPath = path.join(options.forceDefinitionsDir, `${slug}.yaml`);
  if (existsSync(forceSpecPath)) {
    try {
      const parsed = options.parseYaml(readFileSync(forceSpecPath, "utf8"));
      const filename =
        parsed && typeof parsed === "object" && "reference_image" in parsed
          ? Reflect.get(parsed as Record<string, unknown>, "reference_image")
          : null;
      if (typeof filename === "string") {
        for (const inputDir of options.inputDirs) {
          const candidate = path.join(inputDir, filename);
          if (existsSync(candidate)) return candidate;
        }
      }
    } catch {
      return null;
    }
  }

  return null;
}

function buildIndexHtml(
  specHome: string,
  baselineStylesHtml: string,
  port: number,
): string {
  return buildIndexPageHtml({
    port,
    specHome,
    browseSections: buildRegisteredPreviewBrowseSections(),
    baselineStylesHtml,
  });
}

export function createBuiltinPreviewHostInstallDeps(
  options: CreateBuiltinPreviewHostInstallDepsOptions,
): PreviewHostModuleInstallDeps {
  const sharedViewerDeps: PreviewHostSharedViewerDeps = {
    parseYaml: options.parseYaml,
    templateHtml: options.templateHtml,
    baselineStylesHtml: options.baselineStylesHtml,
    previewAssetUrl: options.previewAssetUrl,
    inset: options.inset,
    bodyLineStep: options.bodyLineStep,
    headLength: options.headLength,
    headHalfWidth: options.headHalfWidth,
    iconSize: options.iconSize,
    gridGutter: options.gridGutter,
  };

  const referenceImageResolver = (slug: string): string | null =>
    findReferenceImage(slug, {
      corpusRefDir: options.corpusRefDir,
      inputDirs: options.inputDirs,
      forceDefinitionsDir: options.forcePreviewDocumentDeps.forceDefinitionsDir,
      parseYaml: options.parseYaml,
    });

  // Route diagram listing and per-request folder resolution through the typed
  // workspace-source abstraction (spec 075). When no sources are configured,
  // register a single default `server-root` over the historical frames
  // directory so behaviour is unchanged.
  const workspaceRegistry = new WorkspaceRegistry(
    options.workspaceSources && options.workspaceSources.length > 0
      ? [...options.workspaceSources]
      : [
          createServerRootSource({
            id: "default",
            label: "Diagrams",
            dir: options.framePreviewDocumentDeps.framesDir,
          }),
        ],
  );

  // The default (first) source keeps bare slugs for backward-compatible deep
  // links; additional sources are addressed with qualified `sourceId:slug`.
  const listWorkspaceDiagramSlugs = (): string[] =>
    workspaceRegistry
      .list()
      .flatMap((source, index) =>
        source.list().map((entry) => (index === 0 ? entry.slug : entry.qualifiedId)),
      );

  const resolveFrameDir = (slug: string): { framesDir: string; slug: string } | null => {
    const resolved = workspaceRegistry.resolveFrameDir(slug);
    return resolved ? { framesDir: resolved.framesDir, slug: resolved.slug } : null;
  };

  const moduleContexts = new Map<string, unknown>([
    [
      AUTOLAYOUT_MODULE_KEY,
      {
        ...sharedViewerDeps,
        framePreviewDocumentDeps: options.framePreviewDocumentDeps,
        framePreviewRenderDeps: options.framePreviewRenderDeps,
        listAutolayoutDiagrams(): string[] {
          return listWorkspaceDiagramSlugs();
        },
        findReferenceImage: referenceImageResolver,
        normalizeLayoutEngine,
        resolveFrameDir,
      } satisfies BuiltinAutolayoutPreviewHostModuleDeps,
    ],
    [
      FORCE_MODULE_KEY,
      {
        ...sharedViewerDeps,
        forcePreviewDocumentDeps: options.forcePreviewDocumentDeps,
        listForceExamples(): string[] {
          return listYamlSlugs(options.forcePreviewDocumentDeps.forceDefinitionsDir);
        },
      } satisfies BuiltinForcePreviewHostModuleDeps,
    ],
    [
      SERVER_MODULE_KEY,
      {
        appRoot: options.appRoot,
        repoRoot: options.repoRoot,
        framesDir: options.framesDir,
        specHome: options.specHome,
        currentGitBranch: options.currentGitBranch,
        buildIndexHtml: (port: number) => buildIndexHtml(options.specHome, options.baselineStylesHtml, port),
        layoutEngineFontPath: options.layoutEngineFontPath,
        baselineOsCssPath: options.baselineOsCssPath,
        baselineFontDir: options.baselineFontDir,
        iconsDir: options.iconsDir,
        resolvePreviewAssetPath: options.resolvePreviewAssetPath,
        ensureLayoutEngineBrowserAssets: options.ensureLayoutEngineBrowserAssets,
        findReferenceImage: referenceImageResolver,
        readReloadState: options.readReloadState,
        addSseClient: options.addSseClient,
        removeSseClient: options.removeSseClient,
      } satisfies BuiltinPreviewHostServerRouteDeps,
    ],
  ]);

  return {
    ...sharedViewerDeps,
    appRoot: options.appRoot,
    repoRoot: options.repoRoot,
    specHome: options.specHome,
    currentGitBranch: options.currentGitBranch,
    buildIndexHtml: (port: number) => buildIndexHtml(options.specHome, options.baselineStylesHtml, port),
    layoutEngineFontPath: options.layoutEngineFontPath,
    baselineOsCssPath: options.baselineOsCssPath,
    baselineFontDir: options.baselineFontDir,
    iconsDir: options.iconsDir,
    resolvePreviewAssetPath: options.resolvePreviewAssetPath,
    ensureLayoutEngineBrowserAssets: options.ensureLayoutEngineBrowserAssets,
    readReloadState: options.readReloadState,
    addSseClient: options.addSseClient,
    removeSseClient: options.removeSseClient,
    resolvePreviewHostModuleContext<TContext>(moduleKey: string): TContext {
      if (!moduleContexts.has(moduleKey)) {
        throw new Error(`Preview host module '${moduleKey}' does not have registered install context`);
      }
      return moduleContexts.get(moduleKey) as TContext;
    },
  };
}
