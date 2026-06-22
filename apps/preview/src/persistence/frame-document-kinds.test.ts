import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  registerPreviewEngine,
  type PreviewRenderableDocument,
} from "@diagram-generator/layout-engine";

import { saveFramePreviewDocument } from "../preview-host/frame-document-actions.js";
import { registerFrameYamlDocumentKindHandler } from "../preview-host/frame-document-kinds.js";
import {
  resolveFramePreviewViewerContext,
  type FramePreviewCanonicalState,
} from "../preview-host/frame-documents.js";

test("frame YAML handlers own viewer resolution and layout-engine save compatibility", () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "dg-frame-document-kind-"));
  const framesDir = path.join(tempDir, "frames");
  const slug = "custom-mindmap";
  mkdirSync(framesDir, { recursive: true });
  writeFileSync(
    path.join(framesDir, `${slug}.yaml`),
    [
      "schema: author-v1",
      "title: Custom mindmap",
      "mindmap:",
      "  root: Alpha",
      "",
    ].join("\n"),
    "utf8",
  );

  const normalizeLayoutEngine = (layoutEngine: string | undefined) => layoutEngine?.trim() ?? "";
  const saveCalls: Array<{ slug: string; payload: unknown; kind: string | null | undefined }> = [];
  const unregisterEngine = registerPreviewEngine({
    id: "mindmap-tree",
    label: "Mindmap Tree",
    layoutEngineKey: "mindmap-tree",
    shellMode: "grid",
    capabilities: {
      layoutControls: false,
      localRelayout: false,
      serverRelayout: false,
      engineBackedSave: false,
      nodeInspector: false,
      gridEditing: false,
      referenceImage: false,
      simulationControls: false,
      rawDebugView: false,
    },
    controlSpecs: [],
    scripts: [],
    compatibility: {
      documentKinds: ["mindmap"],
    },
  });
  const unregisterHandler = registerFrameYamlDocumentKindHandler({
    kind: "mindmap",
    createPreviewDocument(_slug, raw) {
      if (!raw.includes("mindmap:")) {
        return null;
      }
      return {
        kind: "mindmap",
        title: "Custom mindmap",
      } as PreviewRenderableDocument;
    },
    buildCanonicalState(currentSlug, _deps, previewDocument): FramePreviewCanonicalState {
      return {
        slug: currentSlug,
        previewDocument,
        frameTree: null,
        componentTree: [{ id: "root", label: "Alpha" }],
        gridInfo: null,
      };
    },
    async renderSvg() {
      return '<svg data-kind="mindmap"></svg>';
    },
    resolvePreviewEngineResolution(_slug, _deps, previewDocument, normalizePreviewLayoutEngine) {
      const compatibleContext = {
        shellMode: "grid" as const,
        previewDocumentKind: "mindmap" as const,
      };
      const authoredLayoutEngine = normalizePreviewLayoutEngine("mindmap-tree");
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
    saveDocument(currentSlug, payload, _deps, previewDocument) {
      saveCalls.push({
        slug: currentSlug,
        payload,
        kind: previewDocument.kind,
      });
      return {
        ok: true,
        savedKind: previewDocument.kind,
      };
    },
  });

  try {
    const viewerContext = resolveFramePreviewViewerContext(
      slug,
      { framesDir },
      {
        normalizeLayoutEngine,
        findReferenceImage: () => null,
      },
    );
    assert.equal(viewerContext.documentKind, "mindmap");
    assert.equal(viewerContext.authoredLayoutEngine, "mindmap-tree");
    assert.equal(viewerContext.activeLayoutEngine, "mindmap-tree");
    assert.deepEqual(viewerContext.compatibleEngines, ["mindmap-tree"]);

    const saveResult = saveFramePreviewDocument(
      slug,
      {
        layout_engine: "mindmap-tree",
        title: "Updated mindmap",
      },
      {
        framePreviewDocumentDeps: { framesDir },
        parseYaml: () => ({}),
        normalizeLayoutEngine,
      },
    );
    assert.deepEqual(saveCalls, [
      {
        slug,
        payload: {
          layout_engine: "mindmap-tree",
          title: "Updated mindmap",
        },
        kind: "mindmap",
      },
    ]);
    assert.deepEqual(saveResult, {
      ok: true,
      savedKind: "mindmap",
    });
  } finally {
    unregisterHandler();
    unregisterEngine();
    rmSync(tempDir, { recursive: true, force: true });
  }
});
