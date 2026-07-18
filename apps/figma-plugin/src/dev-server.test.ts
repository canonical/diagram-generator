import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  applyHeadingAsChild,
  Border,
  Direction,
  Fill,
  Frame,
  layoutFrameTree,
  MockTextAdapter,
  resolveStyles,
  Sizing,
  createLine,
} from "../../../packages/layout-engine/dist/index.js";
import {
  createFrameDiagramPayload,
  createFrameDiagramPayloadFromYaml,
  resolveAuthoredLayoutFrame,
  serializeDiagramNode,
} from "./dev-server.js";

function setPlacedSize(frame: Frame, width: number, height: number) {
  frame._layout.placedW = width;
  frame._layout.placedH = height;
}

function collectFillUnderHugViolations(node: any): string[] {
  const violations: string[] = [];

  const visit = (current: any) => {
    if (current.children.length > 0) {
      if (current.sizingW === "HUG" && current.bodySizingW === "FILL") {
        violations.push(`${current.id}/body:sizingW`);
      }
      if (current.sizingH === "HUG" && current.bodySizingH === "FILL") {
        violations.push(`${current.id}/body:sizingH`);
      }

      for (const child of current.children) {
        if (current.bodySizingW === "HUG" && child.sizingW === "FILL") {
          violations.push(`${current.id}->${child.id}:sizingW`);
        }
        if (current.bodySizingH === "HUG" && child.sizingH === "FILL") {
          violations.push(`${current.id}->${child.id}:sizingH`);
        }
      }
    }

    for (const child of current.children) {
      visit(child);
    }
  };

  visit(node);
  return violations;
}

function findPayloadNode(node: any, id: string): any | null {
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const match = findPayloadNode(child, id);
    if (match) return match;
  }
  return null;
}

test("serializeDiagramNode preserves authored absolute positioning metadata", () => {
  const child = new Frame({
    id: "absolute_leaf",
    label: [createLine("Absolute leaf")],
    border: Border.SOLID,
    width: 192,
    height: 64,
    sizingW: Sizing.FIXED,
    sizingH: Sizing.FIXED,
    positionType: "ABSOLUTE",
    x: 32,
    y: 56,
  });
  const root = new Frame({
    id: "page",
    direction: Direction.VERTICAL,
    children: [child],
  });

  setPlacedSize(child, 192, 64);
  setPlacedSize(root, 640, 480);

  const payload = serializeDiagramNode(root);
  const serializedChild = payload.children[0];

  assert.equal(serializedChild.positionType, "ABSOLUTE");
  assert.equal(serializedChild.x, 32);
  assert.equal(serializedChild.y, 56);
});

test("serializeDiagramNode emits layout-engine coerced effective sizing", () => {
  const fillChild = new Frame({
    id: "fill_child",
    label: [createLine("Fill child")],
    sizingW: Sizing.FILL,
    sizingH: Sizing.HUG,
  });
  const hugRow = new Frame({
    id: "hug_row",
    direction: Direction.HORIZONTAL,
    sizingW: Sizing.HUG,
    sizingH: Sizing.HUG,
    children: [fillChild],
  });
  const root = new Frame({
    id: "page",
    direction: Direction.VERTICAL,
    sizingW: Sizing.FIXED,
    sizingH: Sizing.FIXED,
    width: 480,
    height: 240,
    children: [hugRow],
  });

  resolveStyles(root);
  const layout = layoutFrameTree(root, new MockTextAdapter());

  assert.equal(hugRow.sizingW, Sizing.HUG);
  assert.equal(layout.coerced.get("hug_row")?.sizingW, "FIXED");

  const payload = serializeDiagramNode(root, undefined, { coerced: layout.coerced });
  const rowPayload = payload.children[0];

  assert.equal(rowPayload.sizingW, "FIXED");
  assert.equal(rowPayload.width, Math.round(hugRow._layout.placedW));
});

test("serializeDiagramNode downgrades Figma-illegal cross-axis fill under hug", () => {
  const fillChild = new Frame({
    id: "cross_fill_child",
    label: [createLine("Cross fill child")],
    sizingW: Sizing.FILL,
    sizingH: Sizing.HUG,
  });
  const hugColumn = new Frame({
    id: "hug_column",
    direction: Direction.VERTICAL,
    sizingW: Sizing.HUG,
    sizingH: Sizing.HUG,
    children: [fillChild],
  });
  const root = new Frame({
    id: "page",
    direction: Direction.VERTICAL,
    sizingW: Sizing.FIXED,
    sizingH: Sizing.FIXED,
    width: 480,
    height: 240,
    children: [hugColumn],
  });

  resolveStyles(root);
  const layout = layoutFrameTree(root, new MockTextAdapter());

  assert.equal(layout.coerced.has("hug_column"), false);

  const payload = serializeDiagramNode(root, undefined, { coerced: layout.coerced });
  const columnPayload = payload.children[0];
  const childPayload = columnPayload.children[0];

  assert.equal(columnPayload.sizingW, "HUG");
  assert.equal(childPayload.sizingW, "FIXED");
  assert.equal(childPayload.width, Math.round(fillChild._layout.placedW));
});

test("resolveAuthoredLayoutFrame uses synthetic body children and body sizing", () => {
  const leaf = new Frame({
    id: "panel_leaf",
    label: [createLine("Leaf")],
    width: 192,
    height: 64,
    sizingW: Sizing.FILL,
    sizingH: Sizing.HUG,
  });
  const heading = new Frame({
    id: "panel__heading",
    role: "heading",
    label: [createLine("Panel heading")],
  });
  const body = new Frame({
    id: "panel__body",
    direction: Direction.HORIZONTAL,
    gap: 16,
    sizingW: Sizing.FILL,
    sizingH: Sizing.HUG,
    children: [leaf],
  });
  const panel = new Frame({
    id: "panel",
    direction: Direction.VERTICAL,
    gap: 24,
    sizingW: Sizing.FIXED,
    sizingH: Sizing.HUG,
    children: [heading, body],
  });

  const authored = resolveAuthoredLayoutFrame(panel);

  assert.equal(authored.layoutChildren.length, 1);
  assert.equal(authored.layoutChildren[0]?.id, "panel_leaf");
  assert.equal(authored.layoutGap, 16);
  assert.equal(authored.layoutDirection, Direction.HORIZONTAL);
  assert.equal(authored.bodySizingW, Sizing.FILL);
  assert.equal(authored.bodySizingH, Sizing.HUG);
});

test("resolveAuthoredLayoutFrame follows layout-engine heading synthesis helpers", () => {
  const child = new Frame({
    id: "service_leaf",
    label: [createLine("Service leaf")],
    width: 192,
    height: 64,
  });
  const container = new Frame({
    id: "service_panel",
    direction: Direction.HORIZONTAL,
    gap: 24,
    sizingW: Sizing.FILL,
    sizingH: Sizing.HUG,
    children: [child],
  });

  applyHeadingAsChild(container, createLine("Service panel"));

  const authored = resolveAuthoredLayoutFrame(container);

  assert.equal(authored.layoutChildren.length, 1);
  assert.equal(authored.layoutChildren[0]?.id, "service_leaf");
  assert.equal(authored.layoutDirection, Direction.HORIZONTAL);
  assert.equal(authored.layoutGap, 8);
  assert.equal(authored.layoutHeaderGap, 24);
  assert.equal(authored.bodySizingW, Sizing.FILL);
  assert.equal(authored.bodySizingH, Sizing.HUG);
});

test("serializeDiagramNode derives semantic kinds from frame structure, not fill literals", () => {
  const panel = new Frame({
    id: "custom-panel",
    level: 2,
    fill: Fill.WHITE,
    border: Border.SOLID,
    label: [createLine("Panel")],
  });
  const section = new Frame({
    id: "custom-section",
    level: 3,
    fill: Fill.GREY,
    border: Border.SOLID,
    label: [createLine("Section")],
  });
  const annotation = new Frame({
    id: "note",
    border: Border.NONE,
    label: [createLine("Note")],
  });
  const structuralLeaf = new Frame({
    id: "structural-child",
    label: [createLine("Structural child")],
  });
  const headinglessLevelTwoGroup = new Frame({
    id: "headingless-level-two-group",
    level: 2,
    direction: Direction.HORIZONTAL,
    children: [structuralLeaf],
  });
  const root = new Frame({
    id: "page",
    direction: Direction.VERTICAL,
    children: [panel, section, annotation, headinglessLevelTwoGroup],
  });

  setPlacedSize(panel, 192, 64);
  setPlacedSize(section, 384, 160);
  setPlacedSize(annotation, 192, 24);
  setPlacedSize(structuralLeaf, 192, 64);
  setPlacedSize(headinglessLevelTwoGroup, 192, 64);
  setPlacedSize(root, 800, 600);

  const payload = serializeDiagramNode(root);

  assert.deepEqual(
    payload.children.map((child: any) => child.kind),
    ["panel", "section", "annotation", "container"],
  );
});

test("serializeDiagramNode keeps headed containers nested in panels structural", () => {
  const nested = new Frame({
    id: "nested-headed-container",
    level: 1,
    heading: createLine("Nested heading"),
    children: [new Frame({ id: "nested-leaf", label: [createLine("Nested leaf")] })],
  });
  const outer = new Frame({
    id: "outer-panel",
    level: 2,
    heading: createLine("Outer panel"),
    children: [nested],
  });
  const root = new Frame({ id: "page", children: [outer] });

  setPlacedSize(nested.children[0]!, 192, 64);
  setPlacedSize(nested, 240, 120);
  setPlacedSize(outer, 320, 240);
  setPlacedSize(root, 640, 480);

  const payload = serializeDiagramNode(root);
  const nestedPayload = payload.children[0]?.children[0];

  assert.equal(payload.children[0]?.kind, "panel");
  assert.equal(nestedPayload?.kind, "container");
});

test("telecom frame-diagram payload contains no Figma-illegal fill under hug", async () => {
  const payload = await createFrameDiagramPayload("ai-infra-telecom-services-stack");
  const violations = collectFillUnderHugViolations(payload.root);

  assert.deepEqual(violations, []);
});

test("telecom payload keeps headingless groups structural and panel heights content-driven", async () => {
  const payload = await createFrameDiagramPayload("ai-infra-telecom-services-stack");

  for (const id of ["compute_nodes", "network_fabric", "edge_transport"]) {
    const node = findPayloadNode(payload.root, id);
    assert.ok(node, `missing ${id}`);
    assert.equal(node.kind, "container", `${id} must not create an empty Parent component`);
    assert.deepEqual(node.padding, { top: 0, right: 0, bottom: 0, left: 0 }, `${id} padding`);
    assert.equal(node.fill, "transparent", `${id} fill`);
    assert.equal(node.stroke, "none", `${id} stroke`);
    assert.equal(node.strokeWidth, 0, `${id} stroke width`);
  }

  for (const id of [
    "ai_workflows",
    "data_streaming",
    "training_inference",
    "scheduling",
    "storage_retrieval",
    "far_edge",
  ]) {
    const node = findPayloadNode(payload.root, id);
    assert.ok(node, `missing ${id}`);
    assert.equal(node.kind, "panel", `${id} must retain semantic Parent component chrome`);
    assert.equal(node.sizingH, "HUG", `${id} panel height`);
    assert.equal(node.bodySizingH, "HUG", `${id} slot-body height`);
  }
});

test("value-map payload maps authored roles and preserves named heading icons", async () => {
  const payload = await createFrameDiagramPayload("ai-infra-telco-value-map");

  const expectedInlineIcons = {
    operational_ai: "Operations.svg",
    customer_ai: "Customer support.svg",
    network_ai: "WWAN.svg",
    ai_services_revenue: "Bar chart with check.svg",
  };
  for (const [id, iconName] of Object.entries(expectedInlineIcons)) {
    const node = findPayloadNode(payload.root, id);
    assert.ok(node, `missing ${id}`);
    assert.equal(node.kind, "leaf", `${id} must retain its authored level-1 role`);
    assert.equal(node.fill, "transparent", `${id} must retain transparent child fill`);
    assert.equal(node.stroke, "#000000", `${id} must retain its child border`);
    assert.equal(node.icon?.name, iconName, `${id} must preserve its named child icon`);
  }

  const foundation = findPayloadNode(payload.root, "production_foundation");
  assert.ok(foundation, "missing production_foundation");
  assert.equal(foundation.kind, "panel");
  assert.equal(foundation.headerMinHeight, 48, "production_foundation heading height");
  assert.equal(foundation.headerIcon?.name, "Security.svg", "production_foundation heading icon");

  const outcomes = findPayloadNode(payload.root, "business_outcomes");
  assert.ok(outcomes, "missing business_outcomes");
  assert.equal(outcomes.kind, "panel");
  assert.equal(outcomes.headerIcon, null, "business_outcomes has no authored heading icon");

  for (const id of ["value_top_row"]) {
    const node = findPayloadNode(payload.root, id);
    assert.ok(node, `missing ${id}`);
    assert.equal(node.kind, "container", `${id} must remain a raw structural wrapper`);
    assert.equal(node.sizingH, "HUG", `${id} wrapper height`);
    assert.equal(node.bodySizingH, "HUG", `${id} wrapper body height`);
  }

  assert.deepEqual(collectFillUnderHugViolations(payload.root), []);
});

test("createFrameDiagramPayloadFromYaml supports arbitrary selected frame YAML", async () => {
  const telecomYaml = await readFile(
    new URL("../../../diagrams/1.input/ai-infra-telecom-services-stack.yaml", import.meta.url),
    "utf8",
  );
  const smokeYaml = await readFile(
    new URL("../../../diagrams/1.input/preview-smoke.yaml", import.meta.url),
    "utf8",
  );

  const telecomPayload = createFrameDiagramPayloadFromYaml(telecomYaml, "ai-infra-telecom-services-stack.yaml");
  const smokePayload = createFrameDiagramPayloadFromYaml(smokeYaml, "preview-smoke.yaml");

  assert.equal(telecomPayload.slug, "ai-infra-telecom-services-stack");
  assert.equal(telecomPayload.source.name, "ai-infra-telecom-services-stack.yaml");
  assert.ok(telecomPayload.root.children.length > 0);
  assert.deepEqual(collectFillUnderHugViolations(telecomPayload.root), []);

  assert.equal(smokePayload.slug, "preview-smoke");
  assert.equal(smokePayload.source.name, "preview-smoke.yaml");
  assert.ok(smokePayload.root.children.length > 0);
});

test("createFrameDiagramPayloadFromYaml rejects empty selected YAML", () => {
  assert.throws(
    () => createFrameDiagramPayloadFromYaml("", "empty.yaml"),
    /Selected YAML file is empty/,
  );
});
