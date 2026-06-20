import type { FramePreviewDocumentDeps, FramePreviewRenderDeps } from "./frame-documents.js";
import type { ForcePreviewDocumentDeps } from "./force-documents.js";
import type { PreviewHostViewerScriptResolver } from "./types.js";

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

export interface BuiltinPreviewHostServerRouteDeps {
  readonly appRoot: string;
  readonly repoRoot: string;
  readonly framesDir: string;
  readonly specHome: string;
  readonly currentGitBranch: () => string | null;
  readonly buildIndexHtml: (port: number) => string;
  readonly layoutEngineFontPath: string;
  readonly baselineOsCssPath: string;
  readonly baselineFontDir: string;
  readonly iconsDir: string;
  readonly resolvePreviewAssetPath: (filename: string) => string | null;
  readonly ensureLayoutEngineBrowserAssets: () => Promise<void>;
  readonly findReferenceImage: (slug: string) => string | null;
  readonly readReloadState: () => {
    generation: number;
    error: string | null;
  };
  readonly addSseClient: (res: import("node:http").ServerResponse) => void;
  readonly removeSseClient: (res: import("node:http").ServerResponse) => void;
}
