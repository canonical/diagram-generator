import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  persistFrameDiagramOverridePayloadToYaml,
  verifyElkLayoutPersisted,
  type PersistOverridePayload,
} from "./frame-diagram.js";
import { registerFrameYamlEngineLayoutNamespace } from "./frame-engine-layout-namespaces.js";
import {
  loadFrameYaml,
  resolvePreviewEngine,
  type PreviewEngineContext,
} from "@diagram-generator/layout-engine";

const REPO_ROOT = path.resolve(process.cwd(), "..", "..");
const FRAME_FIXTURE = path.join(REPO_ROOT, "scripts", "diagrams", "frames", "support-engineering-flow.yaml");

function writeTempFrame(name: string, content: string): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dg-frame-yaml-"));
  const framePath = path.join(tempDir, name);
  fs.writeFileSync(framePath, content, "utf8");
  return framePath;
}

function persistToYaml(name: string, baselineText: string, payload: PersistOverridePayload): string {
  const framePath = writeTempFrame(name, baselineText);
  return persistFrameDiagramOverridePayloadToYaml(framePath, baselineText, payload);
}

test("persist override payload writes canonical yaml fields", () => {
  const baselineText = fs.readFileSync(FRAME_FIXTURE, "utf8");
  const output = persistToYaml("support-engineering-flow.yaml", baselineText, {
    overrides: {
      step_fix: {
        style: "parent",
        text: {
          heading: "The updated fix",
          label: ["", "Canonical YAML save path."],
        },
      },
    },
  });

  assert.match(output, /heading: The updated fix/);
  assert.match(output, /label:\r?\n\s*- ''\r?\n\s*- Canonical YAML save path\./);
  assert.doesNotMatch(output, /style:/);
  assert.doesNotMatch(output, /overrideRole/);
  assert.doesNotMatch(output, /grid_overrides:/);
});

test("persist elk layout overrides writes meta.elk", () => {
  const baselineText = [
    "engine: v3",
    "title: Demo",
    "meta:",
    "  layout_engine: elk-layered",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "    - id: leaf_a",
    "      label: [A]",
    "",
  ].join("\n");
  const output = persistToYaml("demo.yaml", baselineText, {
    overrides: {},
    elk_layout_overrides: {
      "elk.layered.spacing.nodeNodeBetweenLayers": "144",
      "elk.spacing.edgeNode": "56",
    },
  });
  const expected = [
    "engine: v3",
    "title: Demo",
    "meta:",
    "  layout_engine: elk-layered",
    "  elk:",
    "    elk.layered.spacing.nodeNodeBetweenLayers: '144'",
    "    elk.spacing.edgeNode: '56'",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "  - id: leaf_a",
    "    label:",
    "    - A",
    "",
  ].join("\n");

  assert.strictEqual(output, expected);
  verifyElkLayoutPersisted(output, {
    "elk.layered.spacing.nodeNodeBetweenLayers": "144",
    "elk.spacing.edgeNode": "56",
  });
});

test("persist engine_layout_overrides routes meta.elk through the namespaced save contract", () => {
  const baselineText = [
    "engine: v3",
    "title: Demo",
    "meta:",
    "  layout_engine: elk-layered",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "    - id: leaf_a",
    "      label: [A]",
    "",
  ].join("\n");
  const output = persistToYaml("demo.yaml", baselineText, {
    overrides: {},
    engine_layout_overrides: {
      "meta.elk": {
        "elk.layered.spacing.nodeNodeBetweenLayers": "144",
        "elk.spacing.edgeNode": "56",
      },
    },
  });

  verifyElkLayoutPersisted(output, {
    "elk.layered.spacing.nodeNodeBetweenLayers": "144",
    "elk.spacing.edgeNode": "56",
  });
});

test("persist engine_layout_overrides routes meta.dagre through the namespaced save contract", () => {
  const baselineText = [
    "engine: v3",
    "title: Demo",
    "meta:",
    "  layout_engine: dagre",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "    - id: leaf_a",
    "      label: [A]",
    "",
  ].join("\n");
  const output = persistToYaml("demo.yaml", baselineText, {
    overrides: {},
    engine_layout_overrides: {
      "meta.dagre": {
        "dagre.rankdir": "LR",
        "dagre.ranksep": "128",
      },
    },
  });

  assert.match(output, /meta:\r?\n  layout_engine: dagre\r?\n  dagre:\r?\n    dagre\.rankdir: LR\r?\n    dagre\.ranksep: '128'/);
});

test("persist elk layout overrides replaces meta.elk entries canonically", () => {
  const baselineText = [
    "engine: v3",
    "title: Demo",
    "meta:",
    "  layout_engine: elk-layered",
    "  elk:",
    "    elk.spacing.nodeNode: \"48\"",
    "    elk.layered.nodePlacement.strategy: NETWORK_SIMPLEX",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "    - id: leaf_a",
    "      label: [A]",
    "",
  ].join("\n");
  const output = persistToYaml("demo.yaml", baselineText, {
    overrides: {},
    elk_layout_overrides: {
      "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
      "elk.hierarchyHandling": "SEPARATE_CHILDREN",
    },
  });
  const expected = [
    "engine: v3",
    "title: Demo",
    "meta:",
    "  layout_engine: elk-layered",
    "  elk:",
    "    elk.spacing.nodeNode: '48'",
    "    elk.layered.nodePlacement.strategy: BRANDES_KOEPF",
    "    elk.hierarchyHandling: SEPARATE_CHILDREN",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "  - id: leaf_a",
    "    label:",
    "    - A",
    "",
  ].join("\n");

  assert.strictEqual(output, expected);
  verifyElkLayoutPersisted(output, {
    "elk.hierarchyHandling": "SEPARATE_CHILDREN",
    "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
    "elk.spacing.nodeNode": "48",
  });
});

test("persist elk layout verification treats empty values as cleared overrides", () => {
  const baselineText = [
    "engine: v3",
    "title: Demo",
    "meta:",
    "  layout_engine: elk-layered",
    "  elk:",
    "    elk.direction: RIGHT",
    "    elk.spacing.edgeNode: \"40\"",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "    - id: leaf_a",
    "      label: [A]",
    "",
  ].join("\n");
  const expected = {
    "elk.direction": "",
    "elk.spacing.edgeNode": "56",
  };
  const output = persistToYaml("demo.yaml", baselineText, {
    overrides: {},
    engine_layout_overrides: {
      "meta.elk": expected,
    },
  });

  assert.doesNotMatch(output, /elk\.direction/);
  assert.match(output, /elk\.spacing\.edgeNode: '56'/);
  verifyElkLayoutPersisted(output, expected);
});

test("persist elk layout overrides rejects unsupported implementation-owned ELK keys", () => {
  const baselineText = [
    "engine: v3",
    "title: Demo",
    "meta:",
    "  layout_engine: elk-layered",
    "  elk:",
    "    elk.spacing.nodeNode: \"48\"",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "    - id: leaf_a",
    "      label: [A]",
    "",
  ].join("\n");

  assert.throws(
    () => persistToYaml("demo.yaml", baselineText, {
      overrides: {},
      elk_layout_overrides: {
        "elk.spacing.edgeNode": "56",
        "elk.edgeRouting": "SPLINES",
        "elk.padding": "[top=8,left=8,bottom=8,right=8]",
      },
    }),
    /elk_layout_overrides contains unsupported ELK keys: elk\.edgeRouting, elk\.padding/,
  );
});

test("persist engine_layout_overrides rejects unsupported namespaces for frame yaml", () => {
  const baselineText = [
    "engine: v3",
    "title: Demo",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "    - id: leaf_a",
    "      label: [A]",
    "",
  ].join("\n");

  assert.throws(
    () => persistToYaml("demo.yaml", baselineText, {
      overrides: {},
      engine_layout_overrides: {
        simulation: {
          alpha: "0.8",
        },
      },
    }),
    /engine_layout_overrides contains unsupported namespaces for frame YAML: simulation/,
  );
});

test("persist engine_layout_overrides accepts registered frame-yaml namespaces", () => {
  const unregister = registerFrameYamlEngineLayoutNamespace({
    namespace: "meta.custom",
    applyOverrides(document, overrides) {
      const meta = typeof document.meta === "object" && document.meta !== null ? document.meta as Record<string, unknown> : {};
      document.meta = meta;
      meta.custom = { ...overrides };
    },
  });

  try {
    const baselineText = [
      "engine: v3",
      "title: Demo",
      "root:",
      "  id: page",
      "  direction: vertical",
      "  children:",
      "    - id: leaf_a",
      "      label: [A]",
      "",
    ].join("\n");

    const output = persistToYaml("demo.yaml", baselineText, {
      overrides: {},
      engine_layout_overrides: {
        "meta.custom": {
          strategy: "stacked",
        },
      },
    });

    assert.match(output, /meta:\r?\n  custom:\r?\n    strategy: stacked/);
  } finally {
    unregister();
  }
});

test("persist preserves legacy unsupported ELK keys already present in meta.elk", () => {
  const baselineText = [
    "engine: v3",
    "title: Demo",
    "meta:",
    "  layout_engine: elk-layered",
    "  elk:",
    "    elk.portConstraints: FREE",
    "    elk.edgeRouting: SPLINES",
    "    elk.padding: \"[top=8,left=8,bottom=8,right=8]\"",
    "    elk.unknown: surprise",
    "    elk.spacing.nodeNode: \"48\"",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "    - id: leaf_a",
    "      label: [A]",
    "",
  ].join("\n");
  const output = persistToYaml("demo.yaml", baselineText, {
    overrides: {
      leaf_a: {
        text: {
          label: ["Updated"],
        },
      },
    },
  });

  assert.match(output, /elk\.portConstraints: FREE/);
  assert.match(output, /elk\.edgeRouting: SPLINES/);
  assert.match(output, /elk\.padding: '\[top=8,left=8,bottom=8,right=8\]'/);
  assert.match(output, /elk\.unknown: surprise/);
});

test("persist preserves legacy unsupported Dagre keys already present in meta.dagre", () => {
  const baselineText = [
    "engine: v3",
    "title: Demo",
    "meta:",
    "  layout_engine: dagre",
    "  dagre:",
    "    dagre.rankdir: LR",
    "    dagre.unknown: surprise",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "    - id: leaf_a",
    "      label: [A]",
    "",
  ].join("\n");
  const output = persistToYaml("demo.yaml", baselineText, {
    overrides: {
      leaf_a: {
        text: {
          label: ["Updated"],
        },
      },
    },
  });

  assert.match(output, /dagre\.unknown: surprise/);
});

test("persist removed ids prunes frames and arrows", () => {
  const baselineText = [
    "engine: v3",
    "title: Demo",
    "arrows:",
    "  - source: leaf_a",
    "    target: leaf_b",
    "root:",
    "  id: page",
    "  direction: horizontal",
    "  children:",
    "    - id: panel",
    "      direction: vertical",
    "      children:",
    "        - id: leaf_a",
    "          label: [A]",
    "        - id: leaf_b",
    "          label: [B]",
    "",
  ].join("\n");
  const output = persistToYaml("demo.yaml", baselineText, {
    overrides: {},
    removed_ids: ["leaf_a"],
  });
  const expected = [
    "engine: v3",
    "title: Demo",
    "arrows: []",
    "root:",
    "  id: page",
    "  direction: horizontal",
    "  children:",
    "  - id: panel",
    "    direction: vertical",
    "    children:",
    "    - id: leaf_b",
    "      label:",
    "      - B",
    "",
  ].join("\n");

  assert.strictEqual(output, expected);
});

test("empty payload is a no-op without rewriting yaml", () => {
  const baselineText = fs.readFileSync(FRAME_FIXTURE, "utf8");
  const output = persistToYaml("support-engineering-flow.yaml", baselineText, {
    overrides: {},
    grid_overrides: {},
  });

  assert.strictEqual(output, baselineText);
});

test("persist gap_delta null clears authored gap_delta from yaml", () => {
  const baselineText = [
    "engine: v3",
    "title: Gap delta clear",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  gap_delta: 16",
    "  children:",
    "    - id: leaf",
    "      label: [Leaf]",
    "",
  ].join("\n");

  const persistent = persistToYaml("page-gap-delta-clear.yaml", baselineText, {
    overrides: {
      page: {
        gap_delta: null,
      },
    },
  });

  assert.doesNotMatch(persistent, /gap_delta:/);
});

test("persist fixed sizing overrides canonically for multiple frames", () => {
  const baselineText = fs.readFileSync(FRAME_FIXTURE, "utf8");
  const persistent = persistToYaml("support-engineering-flow.yaml", baselineText, {
    overrides: {
      step_problem: {
        sizing_w: "FIXED",
        sizing_h: "FIXED",
        width: 480,
        height: 160,
      },
      step_result: {
        sizing_w: "FIXED",
        sizing_h: "FIXED",
        width: 480,
        height: 160,
      },
    },
  });

  const reloaded = loadFrameYaml(writeTempFrame("support-engineering-flow-fixed.yaml", persistent));
  const rootChildren = Array.isArray(reloaded.root.children) ? reloaded.root.children : [];
  const byId = new Map(rootChildren.map((child) => [child.id, child]));
  const problem = byId.get("step_problem");
  const result = byId.get("step_result");

  assert.match(persistent, /id: step_problem[\s\S]*sizing_w: fixed[\s\S]*sizing_h: fixed[\s\S]*width: 480[\s\S]*height: 160/);
  assert.match(persistent, /id: step_result[\s\S]*sizing_w: fixed[\s\S]*sizing_h: fixed[\s\S]*width: 480[\s\S]*height: 160/);
  assert.equal(problem?.sizingW, "FIXED");
  assert.equal(problem?.sizingH, "FIXED");
  assert.equal(problem?.width, 480);
  assert.equal(problem?.height, 160);
  assert.equal(result?.sizingW, "FIXED");
  assert.equal(result?.sizingH, "FIXED");
  assert.equal(result?.width, 480);
  assert.equal(result?.height, 160);
});

test("persist→reload round-trip: page gap_delta survives write without emitting absolute gap", () => {
  const baselineText = [
    "engine: v3",
    "title: Gap delta page",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "    - id: leaf",
    "      label: [Leaf]",
    "",
  ].join("\n");

  const persistent = persistToYaml("page-gap-delta-roundtrip.yaml", baselineText, {
    overrides: {
      page: {
        gap_delta: 16,
      },
    },
  });

  assert.match(persistent, /gap_delta: 16/);
  assert.doesNotMatch(persistent, /\n\s+gap: /);

  const reloadedPath = writeTempFrame("page-gap-delta-reloaded.yaml", persistent);
  const reloaded = loadFrameYaml(reloadedPath);

  assert.strictEqual(reloaded.root.id, "page");
  assert.strictEqual(reloaded.root.gapDelta, 16, "page gap_delta must survive save + reload");
});

test("persist→reload round-trip: gap_delta survives write without emitting absolute gap", () => {
  const baselineText = [
    "engine: v3",
    "title: Gap delta",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "    - id: flow",
    "      direction: vertical",
    "      children:",
    "        - id: phase",
    "          label: [Phase]",
    "        - id: purpose",
    "          label: [Purpose]",
    "",
  ].join("\n");

  const persistent = persistToYaml("gap-delta-roundtrip.yaml", baselineText, {
    overrides: {
      flow: {
        gap_delta: 16,
      },
    },
  });

  assert.match(persistent, /gap_delta: 16/);
  assert.doesNotMatch(persistent, /\n\s+gap: 24/);

  const reloadedPath = writeTempFrame("gap-delta-reloaded.yaml", persistent);
  const reloaded = loadFrameYaml(reloadedPath);
  const flow = reloaded.root.children.find((child) => child.id === "flow");

  assert.ok(flow, "flow frame must survive save + reload");
  assert.strictEqual(flow?.gap, 24, "gap_delta should add to the derived 8px leaf-stack gap");
});

test("persist style does not promote implicit headingless wrapper", () => {
  const baselineText = [
    "engine: v3",
    "title: Wrapper",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "    - id: wrapper",
    "      direction: horizontal",
    "      children:",
    "        - id: leaf_a",
    "          label: [A]",
    "        - id: leaf_b",
    "          label: [B]",
    "",
  ].join("\n");
  const output = persistToYaml("wrapper.yaml", baselineText, {
    overrides: { wrapper: { style: "parent" } },
  });
  const expected = [
    "engine: v3",
    "title: Wrapper",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "  - id: wrapper",
    "    direction: horizontal",
    "    children:",
    "    - id: leaf_a",
    "      label:",
    "      - A",
    "    - id: leaf_b",
    "      label:",
    "      - B",
    "",
  ].join("\n");

  assert.strictEqual(output, expected);
});

test("persist style preserves explicit visible headingless group", () => {
  const baselineText = [
    "engine: v3",
    "title: Group",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "    - id: group",
    "      level: 2",
    "      direction: horizontal",
    "      children:",
    "        - id: leaf_a",
    "          label: [A]",
    "        - id: leaf_b",
    "          label: [B]",
    "",
  ].join("\n");
  const output = persistToYaml("group.yaml", baselineText, {
    overrides: { group: { style: "section" } },
  });
  const expected = [
    "engine: v3",
    "title: Group",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "  - id: group",
    "    level: 3",
    "    direction: horizontal",
    "    children:",
    "    - id: leaf_a",
    "      label:",
    "      - A",
    "    - id: leaf_b",
    "      label:",
    "      - B",
    "    fill: white",
    "    border: solid",
    "",
  ].join("\n");

  assert.strictEqual(output, expected);
});

test("persist layout_engine writes meta.layout_engine (spec 035)", () => {
  const baselineText = [
    "engine: v3",
    "title: Demo",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "    - id: leaf_a",
    "      label: [A]",
    "",
  ].join("\n");
  const output = persistToYaml("demo.yaml", baselineText, {
    layout_engine: "elk-layered",
  });
  // When meta is added to a document that didn't have it, YAML serializer
  // appends it at the end. The key order doesn't affect parsing.
  const expected = [
    "engine: v3",
    "title: Demo",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "  - id: leaf_a",
    "    label:",
    "    - A",
    "meta:",
    "  layout_engine: elk-layered",
    "",
  ].join("\n");

  assert.strictEqual(output, expected);
});

test("persist layout_engine updates existing meta.layout_engine (spec 035)", () => {
  const baselineText = [
    "engine: v3",
    "title: Demo",
    "meta:",
    "  layout_engine: vertical-stack",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "    - id: leaf_a",
    "      label: [A]",
    "",
  ].join("\n");
  const output = persistToYaml("demo.yaml", baselineText, {
    layout_engine: "elk-layered",
  });
  const expected = [
    "engine: v3",
    "title: Demo",
    "meta:",
    "  layout_engine: elk-layered",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "  - id: leaf_a",
    "    label:",
    "    - A",
    "",
  ].join("\n");

  assert.strictEqual(output, expected);
});

test("persist layout_engine null clears meta.layout_engine (spec 035)", () => {
  const baselineText = [
    "engine: v3",
    "title: Demo",
    "meta:",
    "  layout_engine: elk-layered",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "    - id: leaf_a",
    "      label: [A]",
    "",
  ].join("\n");
  const output = persistToYaml("demo.yaml", baselineText, {
    layout_engine: null,
  });
  const expected = [
    "engine: v3",
    "title: Demo",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "  - id: leaf_a",
    "    label:",
    "    - A",
    "",
  ].join("\n");

  assert.strictEqual(output, expected);
});

test("persist layout_engine preserves other meta fields (spec 035)", () => {
  const baselineText = [
    "engine: v3",
    "title: Demo",
    "meta:",
    "  elk:",
    "    elk.direction: DOWN",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "    - id: leaf_a",
    "      label: [A]",
    "",
  ].join("\n");
  const output = persistToYaml("demo.yaml", baselineText, {
    layout_engine: "elk-layered",
  });
  const expected = [
    "engine: v3",
    "title: Demo",
    "meta:",
    "  elk:",
    "    elk.direction: DOWN",
    "  layout_engine: elk-layered",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "  - id: leaf_a",
    "    label:",
    "    - A",
    "",
  ].join("\n");

  assert.strictEqual(output, expected);
});

test("persist→reload round-trip: layout_engine survives write and resolves via registry (spec 035, T020)", () => {
  const baselineText = fs.readFileSync(FRAME_FIXTURE, "utf8");

  // Step 1: Persist an engine choice onto a real frame YAML.
  const persistent = persistToYaml("roundtrip.yaml", baselineText, {
    layout_engine: "elk-layered",
  });
  assert.match(persistent, /layout_engine: elk-layered/);

  // Step 2: Write the persisted YAML to disk and reload it through the actual
  // loader the preview server uses — no string inspection.
  const reloadedPath = writeTempFrame("roundtrip-reloaded.yaml", persistent);
  const reloaded = loadFrameYaml(reloadedPath);

  // Step 3: The reloaded diagram must carry the persisted engine key.
  assert.strictEqual(
    reloaded.layoutEngine,
    "elk-layered",
    "layout_engine must survive write + re-parse via loadFrameYaml",
  );

  // Step 4: Resolve the engine through the registry, exactly as the server does.
  const context: PreviewEngineContext = {
    layoutEngine: reloaded.layoutEngine,
    shellMode: "grid",
    previewDocumentKind: "frame-diagram",
  };
  const resolved = resolvePreviewEngine(context);
  assert.ok(resolved, "registry must resolve a preview engine for the persisted key");
  assert.strictEqual(
    resolved?.layoutEngineKey,
    "elk-layered",
    "resolved engine must match the persisted layout_engine key",
  );
});
