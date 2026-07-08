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
const FRAMES_DIR = path.join(REPO_ROOT, "scripts", "diagrams", "frames");
const ICONS_DIR = path.join(REPO_ROOT, "assets", "icons");
const FONT_PATH = path.join(REPO_ROOT, "assets", "UbuntuSans[wdth,wght].ttf");

const ANNOTATION_IDS = [
  "octavia_certificates",
  "amphora_issuing_ca",
  "amphora_controller_cert",
  "public_certificates",
  "internal_certificates",
  "rgw_certificates",
] as const;

const ANNOTATION_EXPECTED_LINES: Record<(typeof ANNOTATION_IDS)[number], [string, string]> = {
  octavia_certificates: ["certificates", "interface: tls-certificates"],
  amphora_issuing_ca: ["amphora-issuing-ca", "interface: tls-certificates"],
  amphora_controller_cert: ["amphora-controller-cert", "interface: tls-certificates"],
  public_certificates: ["certificates", "interface: tls-certificates"],
  internal_certificates: ["certificates", "interface: tls-certificates"],
  rgw_certificates: ["certificates", "interface: tls-certificates"],
};

const ROW_ENDPOINT_IDS = [
  "traefik_public",
  "traefik_internal",
  "traefik_rgw",
] as const;

const TLS_CERT_PARENT_IDS: Record<(typeof ANNOTATION_IDS)[number], "openstack_services" | "load_balancers"> = {
  octavia_certificates: "openstack_services",
  amphora_issuing_ca: "openstack_services",
  amphora_controller_cert: "openstack_services",
  public_certificates: "load_balancers",
  internal_certificates: "load_balancers",
  rgw_certificates: "load_balancers",
};

type FrameLike = {
  id: string;
  children: FrameLike[];
  label: Array<{ content: string; lineStep?: number; size?: string | null }>;
  isLeaf?: boolean;
  resolvedTextFill?: string;
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
    };
  });
}

function expectedLineSpecs(frame: FrameLike): LineSpec[] {
  if ((frame.resolvedTextFill ?? "").toUpperCase() === "#666666") {
    return frame.label.map((line) => annotationTextToSpec(line));
  }
  const blocks = frameOwnedTextBlocks(frame);
  assert.equal(blocks.length, 1, `${frame.id} should render exactly one label block`);
  return [...blocks[0]];
}

function expectedAnnotationSpecs(id: (typeof ANNOTATION_IDS)[number]): LineSpec[] {
  return ANNOTATION_EXPECTED_LINES[id].map((text) => annotationTextToSpec(createLine(text)));
}

test("TLS SVG export keeps annotation text, chrome, rows, and text fit on the live product path", async () => {
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

  for (const id of ANNOTATION_IDS) {
    const frame = findFrameById(root, id);
    assert.ok(frame, `expected authored frame for ${id}`);
    assert.ok(!flattenedIds.has(id), `${id} should remain a real ELK graph node, not a flattened annotation`);
    const markup = extractComponentMarkup(svg, id);
    const rect = extractRect(markup, id);
    const tspans = extractTspans(markup);
    const specs = expectedAnnotationSpecs(id);
    const parent = findFrameById(root, TLS_CERT_PARENT_IDS[id]);
    assert.ok(parent, `expected parent compound for ${id}`);

    assert.deepEqual(
      tspans.map((entry) => entry.text),
      specs.map((entry) => entry.content),
      `${id} should render every authored label line`,
    );
    assert.equal(rect.fill, "#F3F3F3", `${id} should keep its grey annotation fill`);
    assert.equal(rect.stroke, "none", `${id} should keep its borderless annotation chrome`);

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

    assert.ok(
      frame._layout.placedX >= parent._layout.placedX - 0.5 &&
      frame._layout.placedY >= parent._layout.placedY - 0.5 &&
      frame._layout.placedX + frame._layout.placedW <= parent._layout.placedX + parent._layout.placedW + 0.5 &&
      frame._layout.placedY + frame._layout.placedH <= parent._layout.placedY + parent._layout.placedH + 0.5,
      `${id} should remain inside ${parent.id}`,
    );
  }

  const endpointRects = ROW_ENDPOINT_IDS.map((id) => extractRect(extractComponentMarkup(svg, id), id));
  const endpointYValues = endpointRects.map((rect) => rect.y);
  const rowHeightDrift = Math.max(...endpointYValues) - Math.min(...endpointYValues);
  assert.ok(rowHeightDrift <= 1, "load balancer endpoints should share one horizontal row");

  const openstackRelationRow = findFrameById(root, "openstack_relation_row");
  const octavia = findFrameById(root, "octavia_k8s");
  const loadBalancerRelationRow = findFrameById(root, "load_balancer_relation_row");
  const tlsProvider = findFrameById(root, "tls_provider");
  const vaultCharm = findFrameById(root, "vault_charm");
  const manualTlsCertificates = findFrameById(root, "manual_tls_certificates");
  const openstackServices = findFrameById(root, "openstack_services");
  const loadBalancers = findFrameById(root, "load_balancers");
  assert.ok(openstackRelationRow && octavia, "expected OpenStack row and service frames");
  assert.ok(loadBalancerRelationRow, "expected load balancer cert row");
  assert.ok(tlsProvider && vaultCharm && manualTlsCertificates, "expected TLS provider wrapper and content frames");
  assert.ok(openstackServices && loadBalancers, "expected sibling service compounds");

  assert.ok(
    openstackRelationRow._layout.placedY < octavia._layout.placedY,
    "openstack relation row should stay above octavia_k8s",
  );
  assert.ok(
    loadBalancerRelationRow._layout.placedY < Math.min(...endpointYValues),
    "load balancer cert row should stay above the endpoint row",
  );

  const providerCenter = tlsProvider._layout.placedX + tlsProvider._layout.placedW / 2;
  const providerContentLeft = Math.min(vaultCharm._layout.placedX, manualTlsCertificates._layout.placedX);
  const providerContentRight = Math.max(
    vaultCharm._layout.placedX + vaultCharm._layout.placedW,
    manualTlsCertificates._layout.placedX + manualTlsCertificates._layout.placedW,
  );
  const providerContentCenter = (providerContentLeft + providerContentRight) / 2;
  assert.ok(
    Math.abs(providerCenter - providerContentCenter) <= 1,
    "provider content should stay horizontally centered within tls_provider",
  );
  assert.ok(
    Math.abs(openstackServices._layout.placedW - loadBalancers._layout.placedW) <= 32,
    "OpenStack and LoadBalancers parent widths should stay balanced",
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
});
