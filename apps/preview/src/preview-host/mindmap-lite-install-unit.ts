import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import {
  renderPreviewDocumentToSvg,
  type MindmapLitePreviewDocument,
  type PreviewEngineContext,
  type PreviewRenderableDocument,
} from "@diagram-generator/layout-engine";

import {
  registerFrameYamlDocumentKindHandler,
  type FrameYamlDocumentKindHandler,
  type FrameYamlDocumentSaveDeps,
} from "./frame-document-kinds.js";
import type {
  FramePreviewCanonicalState,
} from "./frame-documents.js";

const require = createRequire(import.meta.url);
const yaml = require("yaml") as {
  parse: (raw: string) => unknown;
  stringify: (value: unknown, options?: Record<string, unknown>) => string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeMindmapChildren(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array of strings`);
  }
  return value.map((entry) => {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      throw new Error(`${fieldName} must contain non-empty strings`);
    }
    return entry.trim();
  });
}

function parseMindmapLitePreviewDocument(
  slug: string,
  raw: string,
): MindmapLitePreviewDocument | null {
  if (!raw.includes("mindmap:")) {
    return null;
  }
  const parsed = yaml.parse(raw);
  if (!isRecord(parsed)) {
    throw new Error(`Mindmap-lite document '${slug}' must parse to a mapping`);
  }
  if (!isRecord(parsed.mindmap)) {
    throw new Error(`Mindmap-lite document '${slug}' requires a 'mindmap' mapping`);
  }
  const root = parsed.mindmap.root;
  if (typeof root !== "string" || root.trim().length === 0) {
    throw new Error(`Mindmap-lite document '${slug}' requires a non-empty mindmap.root`);
  }
  const children = "children" in parsed.mindmap
    ? normalizeMindmapChildren(parsed.mindmap.children, "mindmap.children")
    : [];
  const title = typeof parsed.title === "string" && parsed.title.trim().length > 0
    ? parsed.title.trim()
    : slug;
  const meta = isRecord(parsed.meta) ? parsed.meta : null;
  const authoredLayoutEngine =
    meta && typeof meta.layout_engine === "string" && meta.layout_engine.trim().length > 0
      ? meta.layout_engine.trim()
      : "mindmap-tree";
  return {
    kind: "mindmap-lite",
    slug,
    title,
    layoutEngine: authoredLayoutEngine,
    shellMode: "grid",
    mindmap: {
      root: root.trim(),
      children,
    },
  };
}

function buildMindmapLiteCanonicalState(
  slug: string,
  previewDocument: MindmapLitePreviewDocument,
): FramePreviewCanonicalState {
  return {
    slug,
    previewDocument,
    frameTree: null,
    componentTree: [
      { id: "root", label: previewDocument.mindmap.root },
      ...previewDocument.mindmap.children.map((label, index) => ({
        id: `child-${index + 1}`,
        label,
        parentId: "root",
      })),
    ],
    gridInfo: null,
  };
}

function requireMindmapLitePreviewDocument(
  slug: string,
  previewDocument: PreviewRenderableDocument | null,
): MindmapLitePreviewDocument {
  if (!previewDocument || previewDocument.kind !== "mindmap-lite") {
    throw new Error(`Unable to resolve a mindmap-lite preview document for '${slug}'`);
  }
  return previewDocument as MindmapLitePreviewDocument;
}

function setLayoutEngineMeta(
  document: Record<string, unknown>,
  layoutEngine: string | null,
): void {
  const meta = isRecord(document.meta) ? { ...document.meta } : {};
  if (layoutEngine === null || layoutEngine.length === 0) {
    delete meta.layout_engine;
  } else {
    meta.layout_engine = layoutEngine;
  }
  if (Object.keys(meta).length === 0) {
    delete document.meta;
    return;
  }
  document.meta = meta;
}

function persistMindmapLitePayloadToYaml(
  framePath: string,
  baselineText: string,
  payload: unknown,
  normalizeLayoutEngine: (layoutEngine: string | undefined) => string,
): string {
  if (!isRecord(payload)) {
    throw new Error("Mindmap-lite save payload must be an object");
  }
  const supportedKeys = new Set(["layout_engine", "mindmap"]);
  const unknownKeys = Object.keys(payload).filter((key) => !supportedKeys.has(key));
  if (unknownKeys.length > 0) {
    throw new Error(`Unsupported mindmap-lite save keys: ${unknownKeys.join(", ")}`);
  }
  const document = yaml.parse(baselineText);
  if (!isRecord(document) || !isRecord(document.mindmap)) {
    throw new Error(`${framePath}: expected an authored mindmap-lite YAML document`);
  }

  const mindmapPayload = "mindmap" in payload ? payload.mindmap : undefined;
  if (mindmapPayload !== undefined) {
    if (!isRecord(mindmapPayload)) {
      throw new Error("mindmap must be an object");
    }
    const supportedMindmapKeys = new Set(["root", "children"]);
    const unknownMindmapKeys = Object.keys(mindmapPayload).filter((key) => !supportedMindmapKeys.has(key));
    if (unknownMindmapKeys.length > 0) {
      throw new Error(`Unsupported mindmap-lite mindmap keys: ${unknownMindmapKeys.join(", ")}`);
    }
    const nextMindmap = { ...document.mindmap };
    if ("root" in mindmapPayload) {
      if (typeof mindmapPayload.root !== "string" || mindmapPayload.root.trim().length === 0) {
        throw new Error("mindmap.root must be a non-empty string");
      }
      nextMindmap.root = mindmapPayload.root.trim();
    }
    if ("children" in mindmapPayload) {
      nextMindmap.children = normalizeMindmapChildren(mindmapPayload.children, "mindmap.children");
    }
    document.mindmap = nextMindmap;
  }

  if ("layout_engine" in payload) {
    const requestedLayoutEngine = payload.layout_engine;
    if (requestedLayoutEngine === null || requestedLayoutEngine === "") {
      setLayoutEngineMeta(document, null);
    } else if (typeof requestedLayoutEngine === "string") {
      const normalized = normalizeLayoutEngine(requestedLayoutEngine);
      setLayoutEngineMeta(document, normalized || requestedLayoutEngine.trim());
    } else {
      throw new Error("layout_engine must be a string or null");
    }
  }

  return yaml.stringify(document, {
    aliasDuplicateObjects: false,
    lineWidth: 1000,
    sortMapEntries: false,
  });
}

function persistMindmapLiteDocumentForSlug(
  slug: string,
  payload: unknown,
  deps: FrameYamlDocumentSaveDeps,
): unknown {
  const framePath = path.join(deps.framePreviewDocumentDeps.framesDir, `${slug}.yaml`);
  const baseline = readFileSync(framePath, "utf8");
  const nextText = persistMindmapLitePayloadToYaml(
    framePath,
    baseline,
    payload,
    deps.normalizeLayoutEngine,
  );
  if (nextText !== baseline) {
    writeFileSync(framePath, nextText, "utf8");
  }
  const nextPreviewDocument = requireMindmapLitePreviewDocument(
    slug,
    parseMindmapLitePreviewDocument(slug, nextText),
  );
  return {
    ok: true,
    canonicalState: buildMindmapLiteCanonicalState(slug, nextPreviewDocument),
  };
}

export const MINDMAP_LITE_FRAME_YAML_HANDLER: FrameYamlDocumentKindHandler = {
  kind: "mindmap-lite",
  createPreviewDocument(slug, raw) {
    return parseMindmapLitePreviewDocument(slug, raw);
  },
  buildCanonicalState(slug, _deps, previewDocument) {
    return buildMindmapLiteCanonicalState(
      slug,
      requireMindmapLitePreviewDocument(slug, previewDocument),
    );
  },
  async renderSvg(slug, _deps, previewDocument) {
    const rendered = await renderPreviewDocumentToSvg(
      requireMindmapLitePreviewDocument(slug, previewDocument),
    );
    if (!rendered) {
      throw new Error("Mindmap-lite preview SVG renderer is unavailable");
    }
    return rendered.svgMarkup;
  },
  resolvePreviewEngineResolution(slug, _deps, previewDocument, normalizeLayoutEngine) {
    const compatibleContext: Omit<PreviewEngineContext, "layoutEngine"> = {
      shellMode: "grid",
      previewDocumentKind: "mindmap-lite",
    };
    const authoredLayoutEngine = normalizeLayoutEngine(
      requireMindmapLitePreviewDocument(slug, previewDocument).layoutEngine,
    );
    return {
      previewDocument,
      compatibleContext,
      previewContext: {
        layoutEngine: authoredLayoutEngine,
        ...compatibleContext,
      },
      authoredLayoutEngine,
    };
  },
  saveDocument(slug, payload, deps) {
    return persistMindmapLiteDocumentForSlug(slug, payload, deps);
  },
};

export function installMindmapLiteFrameYamlDocumentKind(): () => void {
  return registerFrameYamlDocumentKindHandler(MINDMAP_LITE_FRAME_YAML_HANDLER);
}
