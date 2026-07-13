import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  annotationTextToSpec,
  createLine,
  createFsIconLoader,
  createHarfBuzzTextAdapter,
  estimateLineWidth,
  frameOwnedTextBlocks,
  type LineSpec,
} from "@diagram-generator/layout-engine";

import { buildFrameDiagramState, renderSvgForSlug } from "../preview-host/frame-documents.js";

const REPO_ROOT = path.resolve(process.cwd(), "..", "..");
const FRAMES_DIR = path.join(REPO_ROOT, "diagrams", "1.input");
const ICONS_DIR = path.join(REPO_ROOT, "assets", "icons");
const FONT_PATH = path.join(REPO_ROOT, "assets", "UbuntuSans[wdth,wght].ttf");

const REMOVED_TLS_AUTHORED_FRAME_IDS = [
  "services_row",
  "load_balancer_endpoint_row",
  "octavia_certificates",
  "amphora_issuing_ca",
  "amphora_controller_cert",
  "public_certificates",
  "internal_certificates",
  "rgw_certificates",
] as const;

const ROW_ENDPOINT_IDS = [
  "traefik_public",
  "traefik_internal",
  "traefik_rgw",
] as const;

const RAW_PRODUCT_PARITY_FRAME_IDS = [
  "tls_provider",
  "vault_charm",
  "manual_tls_certificates",
  "openstack_services",
  "octavia_k8s",
  "load_balancers",
  ...ROW_ENDPOINT_IDS,
] as const;

const TLS_EDGE_LABEL_LINES = {
  "edge-0": ["tls-certificates-pki"],
  "edge-1": ["certificates", "interface: tls-certificates"],
  "edge-2": ["amphora-issuing-ca", "interface: tls-certificates"],
  "edge-3": ["amphora-controller-cert", "interface: tls-certificates"],
  "edge-4": ["certificates", "interface: tls-certificates"],
  "edge-5": ["certificates", "interface: tls-certificates"],
  "edge-6": ["certificates", "interface: tls-certificates"],
} as const;
const TLS_SEMANTIC_EDGE_IDS = Object.keys(TLS_EDGE_LABEL_LINES) as Array<keyof typeof TLS_EDGE_LABEL_LINES>;

const AUTHORED_TLS_LABEL_EDGE_TOPOLOGY = [
  ["vault_charm", "manual_tls_certificates"],
  ["manual_tls_certificates", "octavia_k8s"],
  ["manual_tls_certificates", "octavia_k8s"],
  ["manual_tls_certificates", "octavia_k8s"],
  ["manual_tls_certificates", "traefik_public"],
  ["manual_tls_certificates", "traefik_internal"],
  ["manual_tls_certificates", "traefik_rgw"],
] as const;

type FrameLike = {
  id: string;
  children: FrameLike[];
  label: Array<{ content: string; lineStep?: number; size?: string | null }>;
  isLeaf?: boolean;
  level?: number;
  resolvedFill?: string;
  resolvedTextFill?: string;
  resolvedHeadingWeight?: string;
  _layout: {
    placedX: number;
    placedY: number;
    placedW: number;
    placedH: number;
  };
};

type SvgRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
};

type SvgTspan = {
  x: number;
  y: number;
  text: string;
  fontWeight: string;
};

type SvgLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type RawElkNodeLike = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  children?: RawElkNodeLike[];
};

let harfBuzzAdapterPromise: ReturnType<typeof createHarfBuzzTextAdapter> | null = null;

function getHarfBuzzAdapter() {
  if (!harfBuzzAdapterPromise) {
    const fontBuffer = readFileSync(FONT_PATH);
    const fontData = fontBuffer.buffer.slice(
      fontBuffer.byteOffset,
      fontBuffer.byteOffset + fontBuffer.byteLength,
    );
    harfBuzzAdapterPromise = createHarfBuzzTextAdapter({ fontData });
  }
  return harfBuzzAdapterPromise;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findFrameById(frame: FrameLike, id: string): FrameLike | null {
  if (frame.id === id) {
    return frame;
  }
  for (const child of frame.children) {
    const match = findFrameById(child, id);
    if (match) {
      return match;
    }
  }
  return null;
}

function extractComponentMarkup(svg: string, id: string): string {
  const match = svg.match(new RegExp(`<g[^>]*data-component-id="${escapeRegExp(id)}"[^>]*>[\\s\\S]*?<\\/g>`));
  assert.ok(match, `expected SVG group for ${id}`);
  return match[0];
}

function extractRect(markup: string, id: string): SvgRect {
  const match = markup.match(/<rect\b([^>]+?)\/>/);
  assert.ok(match, `expected rect for ${id}`);
  const attrs = Object.fromEntries(
    [...match[1].matchAll(/([A-Za-z:_-]+)="([^"]*)"/g)].map((entry) => [entry[1], entry[2]]),
  );
  return {
    x: Number(attrs.x),
    y: Number(attrs.y),
    width: Number(attrs.width),
    height: Number(attrs.height),
    fill: attrs.fill ?? "",
    stroke: attrs.stroke ?? "",
  };
}

function extractTspans(markup: string): SvgTspan[] {
  return [...markup.matchAll(/<tspan\b([^>]*)>([^<]*)<\/tspan>/g)].map((match) => {
    const attrs = Object.fromEntries(
      [...match[1].matchAll(/([A-Za-z:_-]+)="([^"]*)"/g)].map((entry) => [entry[1], entry[2]]),
    );
    return {
      x: Number(attrs.x),
      y: Number(attrs.y),
      text: match[2],
      fontWeight: attrs["font-weight"] ?? "",
    };
  });
}

function extractLines(markup: string): SvgLine[] {
  return [...markup.matchAll(/<line\b([^>]+?)\/>/g)].map((match) => {
    const attrs = Object.fromEntries(
      [...match[1].matchAll(/([A-Za-z:_-]+)="([^"]*)"/g)].map((entry) => [entry[1], entry[2]]),
    );
    return {
      x1: Number(attrs.x1),
      y1: Number(attrs.y1),
      x2: Number(attrs.x2),
      y2: Number(attrs.y2),
    };
  });
}

function rangeOverlap(a1: number, a2: number, b1: number, b2: number): number {
  return Math.min(Math.max(a1, a2), Math.max(b1, b2)) - Math.max(Math.min(a1, a2), Math.min(b1, b2));
}

function lineCrossesRectInterior(line: SvgLine, rect: SvgRect): boolean {
  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;

  if (line.x1 === line.x2) {
    return line.x1 > left && line.x1 < right && rangeOverlap(line.y1, line.y2, top, bottom) > 0;
  }
  if (line.y1 === line.y2) {
    return line.y1 > top && line.y1 < bottom && rangeOverlap(line.x1, line.x2, left, right) > 0;
  }
  return false;
}

function geometryOnly(rect: SvgRect): { x: number; y: number; width: number; height: number } {
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  };
}

function frameGeometry(frame: FrameLike): { x: number; y: number; width: number; height: number } {
  return {
    x: frame._layout.placedX,
    y: frame._layout.placedY,
    width: frame._layout.placedW,
    height: frame._layout.placedH,
  };
}

function collectRawElkNodeGeometry(
  nodes: RawElkNodeLike[],
  originX: number,
  originY: number,
  out = new Map<string, { x: number; y: number; width: number; height: number }>(),
): Map<string, { x: number; y: number; width: number; height: number }> {
  for (const node of nodes) {
    out.set(node.id, {
      x: node.x + originX,
      y: node.y + originY,
      width: node.width,
      height: node.height,
    });
    collectRawElkNodeGeometry(node.children ?? [], originX, originY, out);
  }
  return out;
}

function edgeSignature(edge: { source: string; target: string }): string {
  return `${edge.source}->${edge.target}`;
}

function expectedLineSpecs(frame: FrameLike): LineSpec[] {
  if ((frame.resolvedTextFill ?? "").toUpperCase() === "#666666") {
    return frame.label.map((line) => annotationTextToSpec(line));
  }
  const blocks = frameOwnedTextBlocks(frame);
  assert.equal(blocks.length, 1, `${frame.id} should render exactly one label block`);
  return [...blocks[0]];
}

function expectedArrowLabelSpecs(id: keyof typeof TLS_EDGE_LABEL_LINES): LineSpec[] {
  return TLS_EDGE_LABEL_LINES[id].map((text) => annotationTextToSpec(createLine(text)));
}

test("TLS SVG export keeps the top-band TLS provider, labeled wires, and endpoint order on the live product path", async () => {
  const textAdapter = await getHarfBuzzAdapter();
  const renderDeps = {
    framesDir: FRAMES_DIR,
    iconLoader: createFsIconLoader(ICONS_DIR),
    textAdapterPromise: Promise.resolve(textAdapter),
  };
  const svg = await renderSvgForSlug("tls-certificate-provider-topology", renderDeps);
  const { diagram, layout } = await buildFrameDiagramState("tls-certificate-provider-topology", renderDeps);
  const root = diagram.root as unknown as FrameLike;
  const flattenedIds = new Set(layout.elkSnapshot?.debug?.flattenedFrameIds ?? []);
  const semanticArrows = diagram.arrows;
  const actualEdges = new Set(semanticArrows.map(edgeSignature));
  const expectedEdges = new Set(AUTHORED_TLS_LABEL_EDGE_TOPOLOGY.map(([source, target]) => `${source}->${target}`));

  assert.equal(
    semanticArrows.length,
    AUTHORED_TLS_LABEL_EDGE_TOPOLOGY.length,
    "TLS source should keep the 7-edge labeled-wire topology from the rendered reference",
  );
  assert.deepEqual(
    actualEdges,
    expectedEdges,
    "TLS source should connect manual TLS certificates directly to the real consumers",
  );
  assert.deepEqual(
    semanticArrows.map((arrow) => arrow.id),
    TLS_SEMANTIC_EDGE_IDS,
    "TLS source should not carry transparent helper arrows",
  );
  assert.deepEqual(
    layout.elkSnapshot?.debug?.inputGraph?.nodes?.map((node) => node.id),
    ["tls_provider", "openstack_services", "load_balancers"],
    "TLS ELK input should expose the three real top-level compounds without carrier wrappers",
  );

  const rawElkNodeGeometry = collectRawElkNodeGeometry(
    (layout.elkSnapshot?.nodes ?? []) as RawElkNodeLike[],
    layout.elkSnapshot?.originX ?? 0,
    layout.elkSnapshot?.originY ?? 0,
  );
  for (const id of RAW_PRODUCT_PARITY_FRAME_IDS) {
    const frame = findFrameById(root, id);
    assert.ok(frame, `${id} should remain an authored visible frame`);
    const rawGeometry = rawElkNodeGeometry.get(id);
    assert.ok(rawGeometry, `${id} should be present in the raw ELK node tree`);
    assert.deepEqual(
      frameGeometry(frame),
      rawGeometry,
      `${id} frame geometry should be read back from raw ELK without post-ELK resizing`,
    );
    assert.deepEqual(
      geometryOnly(extractRect(extractComponentMarkup(svg, id), id)),
      rawGeometry,
      `${id} product SVG geometry should match raw ELK geometry`,
    );
  }

  for (const id of REMOVED_TLS_AUTHORED_FRAME_IDS) {
    assert.equal(findFrameById(root, id), null, `${id} should no longer be an authored frame`);
    assert.ok(!flattenedIds.has(id), `${id} should not linger in the ELK flattened debug surface`);
  }

  for (const id of TLS_SEMANTIC_EDGE_IDS) {
    const arrow = semanticArrows.find((entry) => entry.id === id);
    const rawEdge = layout.elkSnapshot?.edges.find((edge) => edge.id === id);
    const markup = extractComponentMarkup(svg, id);
    const labelRect = extractRect(markup, id);
    const tspans = extractTspans(markup);
    const specs = expectedArrowLabelSpecs(id);
    const elkLabel = arrow?.elkLabels?.[0];

    assert.ok(rawEdge, `${id} should have a raw ELK edge`);
    assert.ok((rawEdge?.sections.length ?? 0) > 0, `${id} should have raw ELK routed sections`);
    assert.ok(elkLabel, `${id} should read back ELK label geometry`);
    assert.equal(labelRect.x, elkLabel?.x, `${id} label rect should use the ELK label x`);
    assert.equal(labelRect.y, elkLabel?.y, `${id} label rect should use the ELK label y`);
    assert.equal(labelRect.width, elkLabel?.width, `${id} label rect should use the ELK label width`);
    assert.equal(labelRect.height, elkLabel?.height, `${id} label rect should use the ELK label height`);
    assert.equal(labelRect.fill, "transparent", `${id} label rect should use annotation fill`);
    assert.equal(labelRect.stroke, "none", `${id} label rect should use annotation stroke`);
    assert.ok(
      !markup.includes('text-anchor="middle"') && !markup.includes('dominant-baseline="middle"'),
      `${id} label text should not use centered bespoke SVG alignment`,
    );
    assert.deepEqual(
      [rawEdge?.labels?.[0]?.x, rawEdge?.labels?.[0]?.y],
      [elkLabel?.x, elkLabel?.y],
      `${id} product label geometry should match raw ELK label geometry`,
    );
    assert.deepEqual(
      extractLines(markup).filter((line) => lineCrossesRectInterior(line, labelRect)),
      [],
      `${id} rendered edge segments should not cross the ELK-owned label box`,
    );

    assert.deepEqual(
      tspans.map((entry) => entry.text),
      specs.map((entry) => entry.content),
      `${id} should render its authored arrow label lines`,
    );
    assert.ok(
      tspans.every((entry) => entry.x === labelRect.x),
      `${id} label text should be annotation-aligned to the ELK label box`,
    );

    for (let index = 0; index < specs.length; index += 1) {
      const tspan = tspans[index];
      const spec = specs[index];
      assert.ok(tspan, `${id} missing rendered label line ${index}`);
      const measuredWidth = estimateLineWidth(spec, textAdapter);
      assert.ok(
        Number.isFinite(measuredWidth) && measuredWidth > 0,
        `${id} line '${spec.content}' should have a measurable rendered width`,
      );
    }
  }

  const endpointRects = ROW_ENDPOINT_IDS.map((id) => extractRect(extractComponentMarkup(svg, id), id));
  const endpointYValues = endpointRects.map((rect) => rect.y);
  const rowHeightDrift = Math.max(...endpointYValues) - Math.min(...endpointYValues);
  assert.ok(rowHeightDrift <= 1, "load balancer endpoints should share one horizontal row");

  const octavia = findFrameById(root, "octavia_k8s");
  const tlsProvider = findFrameById(root, "tls_provider");
  const vaultCharm = findFrameById(root, "vault_charm");
  const manualTlsCertificates = findFrameById(root, "manual_tls_certificates");
  const openstackServices = findFrameById(root, "openstack_services");
  const loadBalancers = findFrameById(root, "load_balancers");
  assert.ok(octavia, "expected visible OpenStack service frame");
  assert.ok(tlsProvider && vaultCharm && manualTlsCertificates, "expected TLS provider wrapper and content frames");
  assert.ok(openstackServices && loadBalancers, "expected sibling service compounds");
  assert.equal(tlsProvider.level, 3, "TLS provider role should be synthesized as a section by the configured frame_roles profile");
  assert.equal(openstackServices.level, 2, "OpenStack Services role should be synthesized as a parent by the configured frame_roles profile");
  assert.equal(loadBalancers.level, 2, "LoadBalancers role should be synthesized as a parent by the configured frame_roles profile");
  assert.equal(tlsProvider.resolvedFill, "transparent", "TLS provider synthesized section should render transparent");
  assert.equal(openstackServices.resolvedFill, "#F3F3F3", "OpenStack Services synthesized parent should render grey");
  assert.equal(loadBalancers.resolvedFill, "#F3F3F3", "LoadBalancers synthesized parent should render grey");
  assert.equal(
    findFrameById(root, "tls_provider__heading")?.resolvedHeadingWeight,
    "700",
    "TLS provider section heading should consume the section frame-class heading weight",
  );
  assert.equal(
    findFrameById(root, "openstack_services__heading")?.resolvedHeadingWeight,
    "700",
    "OpenStack Services parent heading should consume the parent frame-class heading weight",
  );
  assert.equal(
    findFrameById(root, "load_balancers__heading")?.resolvedHeadingWeight,
    "700",
    "LoadBalancers parent heading should consume the parent frame-class heading weight",
  );
  for (const id of ["tls_provider", "openstack_services", "load_balancers"] as const) {
    assert.equal(
      extractTspans(extractComponentMarkup(svg, `${id}__heading`))[0]?.fontWeight,
      "700",
      `${id} heading should render with the role-derived bold heading style`,
    );
  }

  assert.ok(
    openstackServices._layout.placedY > tlsProvider._layout.placedY + tlsProvider._layout.placedH,
    "OpenStack Services should sit below the TLS provider band",
  );
  assert.ok(
    Math.abs(openstackServices._layout.placedY - loadBalancers._layout.placedY) <= 48,
    "OpenStack Services and LoadBalancers should share the same lower row",
  );
  assert.equal(
    openstackServices._layout.placedH,
    loadBalancers._layout.placedH,
    "same-layer compound height profile should make lower-row compounds equal height in the frame model",
  );
  assert.equal(
    rawElkNodeGeometry.get("openstack_services")?.height,
    rawElkNodeGeometry.get("load_balancers")?.height,
    "same-layer compound height profile should make lower-row compounds equal height in raw ELK",
  );

  const providerCenter = tlsProvider._layout.placedX + tlsProvider._layout.placedW / 2;
  const providerContentLeft = Math.min(vaultCharm._layout.placedX, manualTlsCertificates._layout.placedX);
  const providerContentRight = Math.max(
    vaultCharm._layout.placedX + vaultCharm._layout.placedW,
    manualTlsCertificates._layout.placedX + manualTlsCertificates._layout.placedW,
  );
  const providerContentCenter = (providerContentLeft + providerContentRight) / 2;
  assert.ok(
    Math.abs(providerCenter - providerContentCenter) <= 4,
    "provider content should stay horizontally centered within tls_provider",
  );
  assert.ok(
    openstackServices._layout.placedX < loadBalancers._layout.placedX,
    "OpenStack Services should stay to the left of LoadBalancers",
  );

  for (const id of ROW_ENDPOINT_IDS) {
    const frame = findFrameById(root, id);
    assert.ok(frame, `expected authored frame for ${id}`);
    const markup = extractComponentMarkup(svg, id);
    const rect = extractRect(markup, id);
    const tspans = extractTspans(markup);
    const specs = expectedLineSpecs(frame);

    assert.deepEqual(
      tspans.map((entry) => entry.text),
      specs.map((entry) => entry.content),
      `${id} should render both endpoint label lines`,
    );

    for (let index = 0; index < specs.length; index += 1) {
      const tspan = tspans[index];
      const spec = specs[index];
      assert.ok(tspan, `${id} missing rendered line ${index}`);
      const availableWidth = (rect.x + rect.width) - tspan.x;
      const measuredWidth = estimateLineWidth(spec, textAdapter);
      assert.ok(
        measuredWidth <= availableWidth + 0.5,
        `${id} line '${spec.content}' should fit within its rendered box`,
      );
    }
  }

  const octaviaLabelYs = (["edge-1", "edge-2", "edge-3"] as const).map((id) => {
    const tspans = extractTspans(extractComponentMarkup(svg, id));
    return Math.max(...tspans.map((entry) => entry.y));
  });
  assert.ok(
    Math.max(...octaviaLabelYs) < octavia._layout.placedY,
    "the three OpenStack TLS labels should remain above octavia_k8s",
  );

  for (const [edgeId, endpointId] of [
    ["edge-4", "traefik_public"],
    ["edge-5", "traefik_internal"],
    ["edge-6", "traefik_rgw"],
  ] as const) {
    const endpoint = findFrameById(root, endpointId);
    assert.ok(endpoint, `expected endpoint frame for ${endpointId}`);
    const tspans = extractTspans(extractComponentMarkup(svg, edgeId));
    assert.ok(
      Math.max(...tspans.map((entry) => entry.y)) < endpoint._layout.placedY,
      `${edgeId} label should remain above ${endpointId}`,
    );
  }
});
