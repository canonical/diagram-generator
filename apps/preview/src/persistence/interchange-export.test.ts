import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  AUTOLAYOUT_PREVIEW_HOST_API_ROUTES,
} from "../preview-host/builtin-autolayout-host.js";
import {
  createFramePreviewHostDocumentEndpoints,
  FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS,
} from "../preview-host/document-apis.js";
import {
  renderD2ForSlug,
  importInterchangeForSlug,
  renderMermaidForSlug,
  type FramePreviewDocumentDeps,
  type FramePreviewRenderDeps,
} from "../preview-host/frame-documents.js";
import { resolvePreviewHostApiRoute } from "../preview-host/api-routes.js";

function makeYaml(sourceLabel: string): string {
  return `engine: v3
title: Export sample
root:
  id: page
  children:
  - id: source
    label: [${sourceLabel}]
  - id: target
    label: [Target]
arrows:
- source: source
  target: target
`;
}

function makeTempFramesDir() {
  const root = mkdtempSync(path.join(os.tmpdir(), "diagram-generator-interchange-"));
  mkdirSync(root, { recursive: true });
  return root;
}

test("preview interchange exports cache by format and authored YAML mtime", () => {
  const framesDir = makeTempFramesDir();
  try {
    const yamlPath = path.join(framesDir, "sample.yaml");
    writeFileSync(yamlPath, makeYaml("Source"), "utf8");
    const deps: FramePreviewDocumentDeps = { framesDir };

    const firstMermaid = renderMermaidForSlug("sample", deps);
    const firstD2 = renderD2ForSlug("sample", deps);
    assert.match(firstMermaid, /flowchart TB/);
    assert.match(firstMermaid, /source\[\"Source\"\]/);
    assert.match(firstD2, /source: Source/);

    const changedMtime = Date.now() + 5_000;
    writeFileSync(yamlPath, makeYaml("Changed source"), "utf8");
    utimesSync(yamlPath, changedMtime / 1000, changedMtime / 1000);

    const secondMermaid = renderMermaidForSlug("sample", deps);
    const secondD2 = renderD2ForSlug("sample", deps);
    assert.notEqual(secondMermaid, firstMermaid);
    assert.notEqual(secondD2, firstD2);
  } finally {
    rmSync(framesDir, { recursive: true, force: true });
  }
});

test("preview interchange endpoints expose exact Mermaid and D2 export routes", () => {
  const routeByKey = new Map(AUTOLAYOUT_PREVIEW_HOST_API_ROUTES.map((route) => [route.key, route]));
  const mermaidRoute = routeByKey.get("mermaid-export");
  const d2Route = routeByKey.get("d2-export");
  assert.ok(mermaidRoute);
  assert.ok(d2Route);

  const mermaidMatch = resolvePreviewHostApiRoute(
    "GET",
    "/api/export/mermaid",
    [mermaidRoute],
    (value) => value || null,
  );
  const pathWithSlugMatch = resolvePreviewHostApiRoute(
    "GET",
    "/api/export/mermaid/sample",
    [mermaidRoute],
    (value) => value || null,
  );
  assert.equal(mermaidMatch?.route.key, "mermaid-export");
  assert.equal(pathWithSlugMatch, null);

  const documentDeps: FramePreviewDocumentDeps = { framesDir: "frames" };
  const renderDeps = {
    ...documentDeps,
    iconLoader: undefined,
    textAdapterPromise: Promise.resolve(undefined),
  } as unknown as FramePreviewRenderDeps;
  const endpoints = createFramePreviewHostDocumentEndpoints({
    framePreviewDocumentDeps: documentDeps,
    framePreviewRenderDeps: renderDeps,
    parseYaml: () => ({}),
    normalizeLayoutEngine: (value) => value ?? "v3",
  });
  assert.ok(endpoints.some((endpoint) => endpoint.kind === FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.mermaidExport));
  assert.ok(endpoints.some((endpoint) => endpoint.kind === FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.d2Export));
});

test("preview import writes a new canonical YAML diagram and refuses overwrite", () => {
  const framesDir = makeTempFramesDir();
  try {
    const deps: FramePreviewDocumentDeps = { framesDir };
    const result = importInterchangeForSlug(
      "imported-sample",
      "mermaid",
      `flowchart TB\n  source["Source"]\n  target["Target"]\n  source --> target`,
      deps,
    );
    assert.equal(result.ok, true);
    assert.equal(result.slug, "imported-sample");
    const yaml = readFileSync(path.join(framesDir, "imported-sample.yaml"), "utf8");
    assert.match(yaml, /engine: v3/);
    assert.match(yaml, /id: source/);
    assert.throws(
      () => importInterchangeForSlug("imported-sample", "d2", "source: Source", deps),
      /already exists/,
    );
  } finally {
    rmSync(framesDir, { recursive: true, force: true });
  }
});
