import type { ServerResponse } from "node:http";

import type { FramePreviewDocumentDeps, FramePreviewRenderDeps } from "./frame-documents.js";
import type { ForcePreviewDocumentDeps } from "./force-documents.js";
import type { PreviewHostBrowseSection, PreviewHostViewerScriptResolver } from "./types.js";
import type { DiagramWorkspaceSource } from "./workspace/diagram-workspace-source.js";

export const BUILTIN_PREVIEW_HOST_SERVER_MODULE_KEY = "builtin-server-routes";
export const BUILTIN_FORCE_PREVIEW_HOST_MODULE_KEY = "builtin-force";
export const BUILTIN_AUTOLAYOUT_PREVIEW_HOST_MODULE_KEY = "builtin-autolayout";

export interface PreviewHostSharedViewerDeps
  extends PreviewHostViewerScriptResolver {
  readonly parseYaml: (raw: string) => unknown;
  readonly templateHtml: string;
  readonly baselineStylesHtml: string;
  readonly inset?: number;
  readonly bodyLineStep?: number;
  readonly headLength?: number;
  readonly headHalfWidth?: number;
  readonly iconSize?: number;
  readonly gridGutter?: number;
}

export interface PreviewHostSharedServerDeps {
  readonly appRoot: string;
  readonly repoRoot: string;
  readonly specHome: string;
  readonly currentGitBranch: () => string | null;
  readonly buildIndexHtml: (port: number) => string;
  readonly layoutEngineFontPath: string;
  readonly baselineOsCssPath: string;
  readonly baselineFontDir: string;
  readonly iconsDir: string;
  readonly resolvePreviewAssetPath: (filename: string) => string | null;
  readonly ensureLayoutEngineBrowserAssets: () => Promise<void>;
  readonly readReloadState: () => {
    generation: number;
    error: string | null;
  };
  readonly addSseClient: (res: ServerResponse) => void;
  readonly removeSseClient: (res: ServerResponse) => void;
}

export interface PreviewHostModuleContextReader {
  resolvePreviewHostModuleContext<TContext>(moduleKey: string): TContext;
}

export interface BuiltinPreviewHostServerRouteDeps
  extends PreviewHostSharedServerDeps {
  readonly framesDir: string;
  readonly findReferenceImage: (slug: string) => string | null;
  readonly registerWorkspaceSource?: (source: DiagramWorkspaceSource) => void;
}

export interface BuiltinAutolayoutPreviewHostModuleDeps
  extends PreviewHostSharedViewerDeps {
  readonly framePreviewDocumentDeps: FramePreviewDocumentDeps;
  readonly framePreviewRenderDeps: FramePreviewRenderDeps;
  readonly listAutolayoutDiagrams: () => string[];
  readonly listAutolayoutBrowseSections?: () => readonly PreviewHostBrowseSection[];
  readonly findReferenceImage: (slug: string) => string | null;
  readonly normalizeLayoutEngine: (layoutEngine: string | undefined) => string;
  /**
   * Optional workspace-source resolver (spec 075): maps a possibly-qualified
   * `sourceId:slug` address to the backing source directory + bare slug. When
   * omitted, the host keeps the historical single-directory behaviour.
   */
  readonly resolveFrameDir?: (slug: string) => {
    framesDir: string;
    slug: string;
    sourceId: string;
    writable: boolean;
  } | null;
}

export interface BuiltinForcePreviewHostModuleDeps
  extends PreviewHostSharedViewerDeps {
  readonly forcePreviewDocumentDeps: ForcePreviewDocumentDeps;
  readonly listForceExamples: () => string[];
}

/**
 * @deprecated Transitional test helper only. Production installs should route
 * through per-module preview-host installers and `installBuiltinPreviewHost()`.
 */
export interface BuiltinPreviewHostViewerRouteDeps
  extends BuiltinAutolayoutPreviewHostModuleDeps,
    BuiltinForcePreviewHostModuleDeps {}

export function requirePreviewHostModuleContext<TContext>(
  deps: PreviewHostModuleContextReader,
  moduleKey: string,
): TContext {
  return deps.resolvePreviewHostModuleContext<TContext>(moduleKey);
}
