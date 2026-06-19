import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  evaluatePreviewEngineCompatibility,
  getPreviewEngineByLayoutKey,
  summarizeFrameDiagramCompatibility,
  type PreviewEngineContext,
} from "@diagram-generator/layout-engine";
import {
  persistFrameDiagramOverridePayloadToYaml,
  verifyElkLayoutPersisted,
  type PersistOverridePayload,
} from "../persistence/index.js";
import {
  canonicalSavedState as canonicalFrameSavedState,
  determineFrameYamlKind,
  loadFrameDiagram,
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
      const documentKind = determineFrameYamlKind(baseline, deps.parseYaml);
      const engine = getPreviewEngineByLayoutKey(
        deps.normalizeLayoutEngine(requested),
      );
      if (!engine) {
        throw new Error(`Unknown layout_engine: '${requested}'`);
      }

      const frameDiagramSummary =
        documentKind === "frame-diagram"
          ? summarizeFrameDiagramCompatibility(loadFrameDiagram(slug, deps.framePreviewDocumentDeps))
          : undefined;
      const contextValue: PreviewEngineContext = {
        layoutEngine: requested.trim(),
        shellMode: "grid",
        previewDocumentKind: documentKind,
        frameDiagramSummary,
      };
      const compatibility = evaluatePreviewEngineCompatibility(engine, contextValue);
      if (!compatibility.compatible) {
        throw new Error(
          `Cannot use engine '${requested}' with ${documentKind}: ${compatibility.reason ?? "incompatible"}`,
        );
      }
    }
  }

  const baseline = readFileSync(framePath, "utf8");
  const nextText = persistFrameDiagramOverridePayloadToYaml(
    framePath,
    baseline,
    payload as PersistOverridePayload,
  );

  if (nextText !== baseline) {
    writeFileSync(framePath, nextText, "utf8");
  }

  const payloadRecord =
    payload && typeof payload === "object" && payload !== null
      ? payload as Record<string, unknown>
      : null;
  const namespacedEngineOverrides =
    payloadRecord && "engine_layout_overrides" in payloadRecord && typeof payloadRecord.engine_layout_overrides === "object"
    && payloadRecord.engine_layout_overrides !== null
    && !Array.isArray(payloadRecord.engine_layout_overrides)
      ? payloadRecord.engine_layout_overrides as Record<string, unknown>
      : null;
  const elkOverrides = (
    namespacedEngineOverrides
    && typeof namespacedEngineOverrides["meta.elk"] === "object"
    && namespacedEngineOverrides["meta.elk"] !== null
    && !Array.isArray(namespacedEngineOverrides["meta.elk"])
      ? namespacedEngineOverrides["meta.elk"]
      : (payloadRecord && "elk_layout_overrides" in payloadRecord
          ? payloadRecord.elk_layout_overrides
          : null)
  );
  if (elkOverrides && typeof elkOverrides === "object" && !Array.isArray(elkOverrides)) {
    verifyElkLayoutPersisted(nextText, elkOverrides as Record<string, unknown>);
  }

  return {
    ok: true,
    canonicalState: canonicalFrameSavedState(slug, deps.framePreviewDocumentDeps),
  };
}
