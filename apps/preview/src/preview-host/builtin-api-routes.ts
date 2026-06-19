import { existsSync, writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  evaluatePreviewEngineCompatibility,
  getPreviewEngineByLayoutKey,
  summarizeFrameDiagramCompatibility,
  type PreviewEngineContext,
} from "@diagram-generator/layout-engine";
import { persistForceSpecToYaml } from "../persistence/index.js";
import {
  persistFrameDiagramOverridePayloadToYaml,
  verifyElkLayoutPersisted,
  type PersistOverridePayload,
} from "../persistence/index.js";
import {
  canonicalForceSavedState,
  readForceSpec,
  type ForcePreviewDocumentDeps,
  type ParseYaml,
} from "./force-documents.js";
import {
  componentTreeForSlug,
  canonicalSavedState as canonicalFrameSavedState,
  determineFrameYamlKind,
  frameDiagramExists,
  frameTreeForSlug,
  gridInfoForSlug,
  loadFrameDiagram,
  previewDocumentForSlug,
  renderSvgForSlug,
  type FramePreviewDocumentDeps,
  type FramePreviewRenderDeps,
} from "./frame-documents.js";
import {
  registerPreviewHostApiRoute,
} from "./api-routes.js";
import type { PreviewHostApiRouteDescriptor } from "./types.js";

export interface BuiltinPreviewHostApiRouteDeps {
  readonly framePreviewDocumentDeps: FramePreviewDocumentDeps;
  readonly forcePreviewDocumentDeps: ForcePreviewDocumentDeps;
  readonly framePreviewRenderDeps: FramePreviewRenderDeps;
  readonly parseYaml: ParseYaml;
  readonly normalizeLayoutEngine: (layoutEngine: string | undefined) => string;
}

function handleFrameDiagramApiRequest(
  match: { slug: string | null },
  deps: BuiltinPreviewHostApiRouteDeps,
  sendText: (statusCode: number, text: string) => void,
): string | null {
  const slug = match.slug;
  if (!slug) {
    sendText(400, "Invalid slug");
    return null;
  }
  if (!frameDiagramExists(slug, deps.framePreviewDocumentDeps)) {
    sendText(404, `Unknown diagram: ${slug}`);
    return null;
  }
  return slug;
}

export function createForceSavePreviewHostApiRoute(
  deps: BuiltinPreviewHostApiRouteDeps,
): PreviewHostApiRouteDescriptor {
  return {
    key: "force-save",
    method: "POST",
    routePrefixes: ["/api/force-save/"],
    async handle(match, context) {
      const { sendJson, sendText, readJsonBody, req } = context;
      const slug = match.slug;
      if (!slug) {
        sendText(400, "Invalid slug");
        return;
      }
      const framePath = path.join(deps.forcePreviewDocumentDeps.forceDefinitionsDir, `${slug}.yaml`);
      if (!existsSync(framePath)) {
        sendText(404, `Unknown force example: ${slug}`);
        return;
      }
      let payload: unknown;
      try {
        payload = await readJsonBody(req);
      } catch (error) {
        sendText(400, error instanceof Error ? error.message : String(error));
        return;
      }
      try {
        const nextText = persistForceSpecToYaml(payload);
        writeFileSync(framePath, nextText, "utf8");
        sendJson(200, {
          ok: true,
          canonicalState: canonicalForceSavedState(
            slug,
            deps.forcePreviewDocumentDeps,
            deps.parseYaml,
          ),
        });
      } catch (error) {
        sendText(400, error instanceof Error ? error.message : String(error));
      }
    },
  };
}

export function createFrameOverridesPreviewHostApiRoute(
  deps: BuiltinPreviewHostApiRouteDeps,
): PreviewHostApiRouteDescriptor {
  return {
    key: "frame-overrides",
    method: "POST",
    routePrefixes: ["/api/overrides/"],
    async handle(match, context) {
      const { sendJson, sendText, readJsonBody, req } = context;
      const slug = match.slug;
      if (!slug) {
        sendText(400, "Invalid slug");
        return;
      }
      const framePath = path.join(deps.framePreviewDocumentDeps.framesDir, `${slug}.yaml`);
      if (!existsSync(framePath)) {
        sendText(404, `Unknown frame slug: ${slug}`);
        return;
      }
      let payload: unknown;
      try {
        payload = await readJsonBody(req);
      } catch (error) {
        sendText(400, error instanceof Error ? error.message : String(error));
        return;
      }

      if (payload && typeof payload === "object" && !Array.isArray(payload) && "layout_engine" in payload) {
        const requested = (payload as Record<string, unknown>).layout_engine;
        if (requested !== null && requested !== undefined && requested !== "") {
          if (typeof requested !== "string") {
            sendText(400, "Invalid layout_engine: must be a string");
            return;
          }

          let baseline: string;
          try {
            baseline = readFileSync(framePath, "utf8");
          } catch {
            sendText(400, "Could not read frame file");
            return;
          }
          const documentKind = determineFrameYamlKind(baseline, deps.parseYaml);
          const engine = getPreviewEngineByLayoutKey(
            deps.normalizeLayoutEngine(requested),
          );
          if (!engine) {
            sendText(400, `Unknown layout_engine: '${requested}'`);
            return;
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
            sendText(
              400,
              `Cannot use engine '${requested}' with ${documentKind}: ${compatibility.reason ?? "incompatible"}`,
            );
            return;
          }
        }
      }

      try {
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
        sendJson(200, {
          ok: true,
          canonicalState: canonicalFrameSavedState(slug, deps.framePreviewDocumentDeps),
        });
      } catch (error) {
        sendText(400, error instanceof Error ? error.message : String(error));
      }
    },
  };
}

export function createForceSpecPreviewHostApiRoute(
  deps: BuiltinPreviewHostApiRouteDeps,
): PreviewHostApiRouteDescriptor {
  return {
    key: "force-spec",
    method: "GET",
    routePrefixes: ["/api/force-spec/"],
    handle(match, context) {
      const { sendJson, sendText } = context;
      const slug = match.slug;
      if (!slug) {
        sendText(400, "Invalid slug");
        return;
      }
      const spec = readForceSpec(slug, deps.forcePreviewDocumentDeps, deps.parseYaml);
      if (!spec) {
        sendText(404, `Unknown force example: ${slug}`);
        return;
      }
      sendJson(200, spec);
    },
  };
}

export function createPreviewDocumentPreviewHostApiRoute(
  deps: BuiltinPreviewHostApiRouteDeps,
): PreviewHostApiRouteDescriptor {
  return {
    key: "preview-document",
    method: "GET",
    routePrefixes: ["/api/preview-document/"],
    handle(match, context) {
      const slug = handleFrameDiagramApiRequest(match, deps, context.sendText);
      if (!slug) {
        return;
      }
      context.sendJson(200, previewDocumentForSlug(slug, deps.framePreviewDocumentDeps));
    },
  };
}

export function createFrameTreePreviewHostApiRoute(
  deps: BuiltinPreviewHostApiRouteDeps,
): PreviewHostApiRouteDescriptor {
  return {
    key: "frame-tree",
    method: "GET",
    routePrefixes: ["/api/frame-tree/"],
    handle(match, context) {
      const slug = handleFrameDiagramApiRequest(match, deps, context.sendText);
      if (!slug) {
        return;
      }
      context.sendJson(200, frameTreeForSlug(slug, deps.framePreviewDocumentDeps));
    },
  };
}

export function createComponentTreePreviewHostApiRoute(
  deps: BuiltinPreviewHostApiRouteDeps,
): PreviewHostApiRouteDescriptor {
  return {
    key: "component-tree",
    method: "GET",
    routePrefixes: ["/api/tree/"],
    handle(match, context) {
      const slug = handleFrameDiagramApiRequest(match, deps, context.sendText);
      if (!slug) {
        return;
      }
      context.sendJson(200, componentTreeForSlug(slug, deps.framePreviewDocumentDeps));
    },
  };
}

export function createGridInfoPreviewHostApiRoute(
  deps: BuiltinPreviewHostApiRouteDeps,
): PreviewHostApiRouteDescriptor {
  return {
    key: "grid-info",
    method: "GET",
    routePrefixes: ["/api/grid/"],
    handle(match, context) {
      const slug = handleFrameDiagramApiRequest(match, deps, context.sendText);
      if (!slug) {
        return;
      }
      context.sendJson(200, gridInfoForSlug(slug, deps.framePreviewDocumentDeps));
    },
  };
}

export function createPreviewSvgHostApiRoute(
  deps: BuiltinPreviewHostApiRouteDeps,
): PreviewHostApiRouteDescriptor {
  return {
    key: "svg-export",
    method: "GET",
    routePrefixes: ["/svg/", "/v3/svg/"],
    async handle(match, context) {
      const rawName = match.pathname.startsWith("/svg/")
        ? match.pathname.slice("/svg/".length)
        : match.pathname.slice("/v3/svg/".length);
      const safeName = path.posix.basename(rawName);
      const normalized =
        safeName.replace(/-onbrand-v3-grid\.svg$/i, "").replace(/-onbrand-v3\.svg$/i, "");
      const slug = handleFrameDiagramApiRequest(
        { slug: normalized || null },
        deps,
        context.sendText,
      );
      if (!slug) {
        return;
      }
      const svg = await renderSvgForSlug(slug, deps.framePreviewRenderDeps);
      context.sendBytes(200, "image/svg+xml", Buffer.from(svg, "utf8"));
    },
  };
}

export function installBuiltinPreviewHostApiRoutes(
  deps: BuiltinPreviewHostApiRouteDeps,
): () => void {
  const unregisterFrameOverrides = registerPreviewHostApiRoute(
    createFrameOverridesPreviewHostApiRoute(deps),
  );
  const unregisterPreviewDocument = registerPreviewHostApiRoute(
    createPreviewDocumentPreviewHostApiRoute(deps),
  );
  const unregisterFrameTree = registerPreviewHostApiRoute(
    createFrameTreePreviewHostApiRoute(deps),
  );
  const unregisterComponentTree = registerPreviewHostApiRoute(
    createComponentTreePreviewHostApiRoute(deps),
  );
  const unregisterGridInfo = registerPreviewHostApiRoute(
    createGridInfoPreviewHostApiRoute(deps),
  );
  const unregisterSvgExport = registerPreviewHostApiRoute(
    createPreviewSvgHostApiRoute(deps),
  );
  const unregisterForceSave = registerPreviewHostApiRoute(
    createForceSavePreviewHostApiRoute(deps),
  );
  const unregisterForceSpec = registerPreviewHostApiRoute(
    createForceSpecPreviewHostApiRoute(deps),
  );
  return () => {
    unregisterForceSpec();
    unregisterForceSave();
    unregisterSvgExport();
    unregisterGridInfo();
    unregisterComponentTree();
    unregisterFrameTree();
    unregisterPreviewDocument();
    unregisterFrameOverrides();
  };
}
