import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  evaluatePreviewEngineCompatibility,
  FRAME_PREVIEW_SHELL_MODE,
  getPreviewEngineByLayoutKey,
  type PreviewEngineContext,
} from "@diagram-generator/layout-engine";
import {
  resolveFramePreviewEngineResolutionFromYamlText,
  saveFrameYamlDocumentForSlug,
  type FramePreviewDocumentDeps,
  type ParseYaml,
} from "./frame-documents.js";

export interface FramePreviewDocumentActionDeps {
  readonly framePreviewDocumentDeps: FramePreviewDocumentDeps;
  readonly parseYaml: ParseYaml;
  readonly normalizeLayoutEngine: (layoutEngine: string | undefined) => string;
}

function framePathForSlug(slug: string, deps: FramePreviewDocumentActionDeps): string {
  return path.join(deps.framePreviewDocumentDeps.framesDir, `${slug}.yaml`);
}

export function saveFramePreviewDocument(
  slug: string,
  payload: unknown,
  deps: FramePreviewDocumentActionDeps,
): unknown {
  const framePath = framePathForSlug(slug, deps);
  if (!existsSync(framePath)) {
    throw new Error(`Unknown frame slug: ${slug}`);
  }

  if (payload && typeof payload === "object" && !Array.isArray(payload) && "layout_engine" in payload) {
    const requested = (payload as Record<string, unknown>).layout_engine;
    if (requested !== null && requested !== undefined && requested !== "") {
      if (typeof requested !== "string") {
        throw new Error("Invalid layout_engine: must be a string");
      }

      const baseline = readFileSync(framePath, "utf8");
      const normalizedRequested = deps.normalizeLayoutEngine(requested);
      const resolution = resolveFramePreviewEngineResolutionFromYamlText(
        slug,
        baseline,
        deps.framePreviewDocumentDeps,
        deps.normalizeLayoutEngine,
      );
      const documentKind = resolution.previewDocument.kind ?? resolution.compatibleContext.previewDocumentKind ?? "frame-diagram";
      const engine = getPreviewEngineByLayoutKey(
        normalizedRequested,
      );
      if (!engine) {
        throw new Error(`Unknown layout_engine: '${requested}'`);
      }

      const contextValue: PreviewEngineContext = {
        layoutEngine: normalizedRequested,
        shellMode: FRAME_PREVIEW_SHELL_MODE,
        previewDocumentKind: documentKind,
        frameDiagramSummary: resolution.compatibleContext.frameDiagramSummary,
      };
      const compatibility = evaluatePreviewEngineCompatibility(engine, contextValue);
      if (!compatibility.compatible) {
        throw new Error(
          `Cannot use engine '${requested}' with ${documentKind}: ${compatibility.reason ?? "incompatible"}`,
        );
      }
    }
  }

  return saveFrameYamlDocumentForSlug(slug, payload, deps);
}
