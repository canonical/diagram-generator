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
import {
  getFrameYamlEngineLayoutNamespace,
  registerFrameYamlEngineLayoutNamespace,
} from "./frame-engine-layout-namespaces.js";
import {
  collectPreviewArrowComponentEntries,
  createPreviewArrowComponentId,
  layoutFrameTree,
  loadFrameYaml,
  MockTextAdapter,
  registerPreviewEngine,
  resolvePreviewEngine,
  Direction,
  type Frame,
  type PreviewEngineContext,
} from "@diagram-generator/layout-engine";

const REPO_ROOT = path.resolve(process.cwd(), "..", "..");
const FRAME_FIXTURE = path.join(REPO_ROOT, "scripts", "diagrams", "frames", "support-engineering-flow.yaml");
const COMPLEX_ROUTING_FIXTURE = path.join(REPO_ROOT, "scripts", "diagrams", "frames", "complex-routing-usecase.yaml");
const ALIGNMENT_GRID_FIXTURE = path.join(REPO_ROOT, "scripts", "diagrams", "frames", "test-alignment-grid.yaml");

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

function normalizeYamlNewlines(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

function assertYamlEqual(actual: string, expected: string): void {
  assert.strictEqual(normalizeYamlNewlines(actual), normalizeYamlNewlines(expected));
}

function findFrameById(frame: Frame, frameId: string): Frame | null {
  if (frame.id === frameId) {
    return frame;
  }
  for (const child of frame.children) {
    const match = findFrameById(child, frameId);
    if (match) {
      return match;
    }
  }
  return null;
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
    "    elk.layered.spacing.nodeNodeBetweenLayers: 144",
    "    elk.spacing.edgeNode: 56",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "  - id: leaf_a",
    "    label:",
    "    - A",
    "",
  ].join("\n");

  assertYamlEqual(output, expected);
  verifyElkLayoutPersisted(output, {
    "elk.layered.spacing.nodeNodeBetweenLayers": 144,
    "elk.spacing.edgeNode": 56,
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
    "elk.layered.spacing.nodeNodeBetweenLayers": 144,
    "elk.spacing.edgeNode": 56,
  });
});

test("persist engine_layout_overrides preserves numeric control values", () => {
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
        "elk.spacing.edgeNode": 56,
      },
    },
  });

  assert.match(output, /elk\.spacing\.edgeNode: 56/);
  verifyElkLayoutPersisted(output, {
    "elk.spacing.edgeNode": 56,
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

  assert.match(output, /meta:\r?\n  layout_engine: dagre\r?\n  dagre:\r?\n    dagre\.rankdir: LR\r?\n    dagre\.ranksep: 128/);
});

test("persist layout engine and root direction survive frame yaml reload", () => {
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
  const framePath = writeTempFrame("demo.yaml", baselineText);
  const output = persistFrameDiagramOverridePayloadToYaml(framePath, baselineText, {
    layout_engine: "dagre",
    overrides: {
      page: {
        direction: "HORIZONTAL",
      },
    },
  });
  fs.writeFileSync(framePath, output, "utf8");

  const reloaded = loadFrameYaml(framePath);

  assert.equal(reloaded.layoutEngine, "dagre");
  assert.equal(reloaded.root.direction, Direction.HORIZONTAL);
});

test("persist→reload round-trip: graph-engine namespaces survive frame yaml reload", () => {
  const dagreBaseline = [
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
  const dagrePath = writeTempFrame("dagre-roundtrip.yaml", dagreBaseline);
  const dagreOutput = persistFrameDiagramOverridePayloadToYaml(dagrePath, dagreBaseline, {
    overrides: {},
    engine_layout_overrides: {
      "meta.dagre": {
        "dagre.rankdir": "LR",
        "dagre.ranksep": "128",
      },
    },
  });
  fs.writeFileSync(dagrePath, dagreOutput, "utf8");

  const reloadedDagre = loadFrameYaml(dagrePath);
  assert.equal(reloadedDagre.layoutEngine, "dagre");
  assert.deepEqual(reloadedDagre.engineLayout?.["meta.dagre"], {
    "dagre.rankdir": "LR",
    "dagre.ranksep": "128",
  });

  const elkBaseline = [
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
  const elkPath = writeTempFrame("elk-roundtrip.yaml", elkBaseline);
  const elkOutput = persistFrameDiagramOverridePayloadToYaml(elkPath, elkBaseline, {
    overrides: {},
    engine_layout_overrides: {
      "meta.elk": {
        "elk.spacing.edgeNode": 56,
      },
    },
  });
  fs.writeFileSync(elkPath, elkOutput, "utf8");

  const reloadedElk = loadFrameYaml(elkPath);
  assert.equal(reloadedElk.layoutEngine, "elk-layered");
  assert.deepEqual(reloadedElk.engineLayout?.["meta.elk"], {
    "elk.spacing.edgeNode": "56",
  });
  assert.deepEqual(reloadedElk.elkLayout, {
    "elk.spacing.edgeNode": "56",
  });
});

test("persist→reload round-trip: interpreter node buckets survive under family-scoped node namespaces", () => {
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
  const framePath = writeTempFrame("node-buckets-roundtrip.yaml", baselineText);
  const output = persistFrameDiagramOverridePayloadToYaml(framePath, baselineText, {
    overrides: {},
    engine_layout_overrides: {
      "meta.dagre": {
        "dagre.rankdir": "LR",
      },
      "meta.dagre_nodes": {
        dagre: {
          "dagre.rankdir": "LR",
          "dagre.ranksep": "128",
        },
      },
      "meta.elk_nodes": {
        "elk-layered": {
          "elk.spacing.edgeNode": 56,
        },
        "elk-radial": {
          "elk.radial.radius": 160,
        },
      },
    },
  });
  fs.writeFileSync(framePath, output, "utf8");

  assert.match(output, /dagre_nodes:/);
  assert.match(output, /elk_nodes:/);

  const reloaded = loadFrameYaml(framePath);
  assert.deepEqual(reloaded.engineLayout?.["meta.dagre_nodes"], {
    dagre: {
      "dagre.rankdir": "LR",
      "dagre.ranksep": "128",
    },
  });
  assert.deepEqual(reloaded.engineLayout?.["meta.elk_nodes"], {
    "elk-layered": {
      "elk.spacing.edgeNode": "56",
    },
    "elk-radial": {
      "elk.radial.radius": "160",
    },
  });
});

test("persist engine_layout_overrides replaces node-family buckets so emptied non-active nodes disappear", () => {
  const baselineText = [
    "engine: v3",
    "title: Demo",
    "meta:",
    "  layout_engine: elk-layered",
    "  elk_nodes:",
    "    elk-layered:",
    "      elk.direction: RIGHT",
    "      elk.spacing.edgeNode: '56'",
    "    elk-radial:",
    "      elk.radial.radius: '160'",
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
      "meta.elk_nodes": {
        "elk-layered": {
          "elk.direction": "DOWN",
          "elk.spacing.edgeNode": "",
        },
      },
    },
  });

  const reloaded = loadFrameYaml(writeTempFrame("demo-node-clear-reloaded.yaml", output));
  assert.deepEqual(reloaded.engineLayout?.["meta.elk_nodes"], {
    "elk-layered": {
      "elk.direction": "DOWN",
    },
  });
  assert.doesNotMatch(output, /elk-radial:/);
  assert.doesNotMatch(output, /elk\.spacing\.edgeNode: '56'/);
});

test("persist→reload round-trip: committed state vector survives temp frame yaml save", () => {
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
  const framePath = writeTempFrame("committed-state-vector.yaml", baselineText);
  const savePayload: PersistOverridePayload = {
    layout_engine: "dagre",
    engine_layout_overrides: {
      "meta.dagre": {
        "dagre.rankdir": "LR",
        "dagre.ranksep": 128,
      },
    },
    overrides: {
      leaf_a: {
        min_width: 320,
        style: "parent",
      },
    },
  };
  assert.throws(
    () => persistFrameDiagramOverridePayloadToYaml(framePath, baselineText, {
      ...savePayload,
      engine_layout_overrides: {
        "meta.dagre": {
          ...savePayload.engine_layout_overrides?.["meta.dagre"],
          "dagre.unsupported": "reject-me",
        },
      },
    }),
    /unsupported dagre keys: dagre\.unsupported/,
  );
  const output = persistFrameDiagramOverridePayloadToYaml(framePath, baselineText, savePayload);
  fs.writeFileSync(framePath, output, "utf8");

  const reloaded = loadFrameYaml(framePath);
  const leafA = reloaded.root.children.find((child) => child.id === "leaf_a");

  assert.equal(reloaded.layoutEngine, "dagre");
  assert.deepEqual(reloaded.engineLayout?.["meta.dagre"], {
    "dagre.rankdir": "LR",
    "dagre.ranksep": "128",
  });
  assert.equal(leafA?.minWidth, 320);
  assert.equal(leafA?.level, 2);
  assert.equal(leafA?.fill, "#F3F3F3");
  assert.equal(leafA?.border, "SOLID");

  const reloadedText = fs.readFileSync(framePath, "utf8");
  assert.equal(persistFrameDiagramOverridePayloadToYaml(framePath, reloadedText, {}), reloadedText);
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

  assertYamlEqual(output, expected);
  verifyElkLayoutPersisted(output, {
    "elk.hierarchyHandling": "SEPARATE_CHILDREN",
    "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
    "elk.spacing.nodeNode": "48",
  });
});

test("persist engine layout verification clears empty values for specs that do not admit blank", () => {
  const baselineText = [
    "engine: v3",
    "title: Demo",
    "meta:",
    "  layout_engine: elk-layered",
    "  elk:",
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
    "elk.spacing.edgeNode": "",
  };
  const output = persistToYaml("demo.yaml", baselineText, {
    overrides: {},
    engine_layout_overrides: {
      "meta.elk": expected,
    },
  });

  assert.doesNotMatch(output, /elk\.spacing\.edgeNode/);
  verifyElkLayoutPersisted(output, expected);
});

test("persist elk.direction preserves the blank auto enum value", () => {
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

  const output = persistToYaml("demo.yaml", baselineText, {
    overrides: {},
    engine_layout_overrides: {
      "meta.elk": {
        "elk.direction": "",
        "elk.spacing.edgeNode": 56,
      },
    },
  });

  assert.match(output, /elk\.direction: ''/);
  assert.match(output, /elk\.spacing\.edgeNode: 56/);

  const reloaded = loadFrameYaml(writeTempFrame("demo-reload.yaml", output));
  assert.deepEqual(reloaded.engineLayout?.["meta.elk"], {
    "elk.direction": "",
    "elk.spacing.edgeNode": "56",
  });
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

test("persist engine_layout_overrides rejects foreign keys at the interpreter node boundary", () => {
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

  assert.throws(
    () => persistToYaml("demo.yaml", baselineText, {
      overrides: {},
      engine_layout_overrides: {
        "meta.elk_nodes": {
          "elk-layered": {
            "dagre.rankdir": "LR",
          },
        },
      },
    }),
    /unsupported ELK keys: dagre\.rankdir/,
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

test("frame-yaml engine namespaces resolve preview-engine registrations after module init", () => {
  const unregister = registerPreviewEngine({
    id: "unit-late-frame-yaml-namespace",
    label: "Late namespace",
    layoutEngineKey: "unit-late-frame-yaml-namespace",
    shellMode: "grid",
    renderFamily: "frame-native",
    hostView: { sidebarSections: ["graph-layout"] },
    capabilities: {
      layoutControls: true,
      localRelayout: true,
      serverRelayout: false,
      engineBackedSave: true,
      nodeInspector: false,
      gridEditing: false,
      referenceImage: false,
      simulationControls: false,
      rawDebugView: false,
    },
    controlSpecs: [
      {
        key: "late.spacing",
        label: "Late spacing",
        group: "Late",
        kind: "number",
        defaultValue: "24",
        persistNamespace: "meta.late",
      },
    ],
    scripts: [],
    compatibility: {
      documentKinds: ["frame-diagram"],
    },
  });

  try {
    const descriptor = getFrameYamlEngineLayoutNamespace("meta.late");
    assert.ok(descriptor);
    const document: Record<string, unknown> = {};
    descriptor.applyOverrides(document, {
      "late.spacing": 72,
    });
    assert.deepStrictEqual(document, {
      meta: {
        late: {
          "late.spacing": 72,
        },
      },
    });
  } finally {
    unregister();
  }
});

test("persist strips unsupported ELK keys already present in meta.elk", () => {
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

  assert.match(output, /elk\.spacing\.nodeNode: 48|elk\.spacing\.nodeNode: '48'/);
  assert.doesNotMatch(output, /elk\.portConstraints: FREE/);
  assert.doesNotMatch(output, /elk\.edgeRouting: SPLINES/);
  assert.doesNotMatch(output, /elk\.padding: '\[top=8,left=8,bottom=8,right=8\]'/);
  assert.doesNotMatch(output, /elk\.unknown: surprise/);
});

test("persist strips unsupported Dagre keys already present in meta.dagre", () => {
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

  assert.match(output, /dagre\.rankdir: LR/);
  assert.doesNotMatch(output, /dagre\.unknown: surprise/);
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

  assertYamlEqual(output, expected);
  const reloaded = loadFrameYaml(writeTempFrame("removed-ids-reloaded.yaml", output));
  assert.deepStrictEqual(reloaded.arrows, []);
  const panel = reloaded.root.children.find((child) => child.id === "panel");
  assert.ok(panel, "panel must survive save + reload");
  assert.deepStrictEqual(panel?.children.map((child) => child.id), ["leaf_b"]);
});

test("persist arrow waypoint overrides for complex-routing-usecase arrows", () => {
  const baselineText = fs.readFileSync(COMPLEX_ROUTING_FIXTURE, "utf8");
  const output = persistToYaml("complex-routing-usecase.yaml", baselineText, {
    overrides: {
      "arrow:edge:measure->review": {
        waypoints: [[480, 192], [640, 192]],
      },
    },
  });

  assert.match(
    output,
    /source: measure\r?\n  target: review\r?\n  waypoints:\r?\n  - - 480\r?\n    - 192\r?\n  - - 640\r?\n    - 192/,
  );

  const reloaded = loadFrameYaml(writeTempFrame("complex-routing-usecase-reloaded.yaml", output));
  const measureToReview = reloaded.arrows.find((arrow) => arrow.source === "measure" && arrow.target === "review");
  assert.deepStrictEqual(measureToReview?.waypoints, [[480, 192], [640, 192]]);
});

test("persist→reload clears authored arrow waypoints after reroute-bearing structural edits", () => {
  const baselineText = fs.readFileSync(COMPLEX_ROUTING_FIXTURE, "utf8");
  const output = persistToYaml("complex-routing-usecase.yaml", baselineText, {
    overrides: {
      page: {
        direction: "vertical",
      },
      "arrow:edge:measure->review": {
        waypoints: [],
      },
    },
  });

  assert.match(output, /root:\r?\n  id: page\r?\n  direction: vertical/);
  assert.doesNotMatch(output, /source: measure\r?\n  target: review[\s\S]*waypoints:/);

  const reloaded = loadFrameYaml(writeTempFrame("complex-routing-usecase-reroute-reloaded.yaml", output));
  assert.strictEqual(reloaded.root.direction, "VERTICAL");
  const measureToReview = reloaded.arrows.find((arrow) => arrow.source === "measure" && arrow.target === "review");
  assert.ok(measureToReview, "measure->review must survive save + reload");
  assert.strictEqual(measureToReview?.id ?? null, null);
  assert.strictEqual(measureToReview?.source, "measure");
  assert.strictEqual(measureToReview?.target, "review");
  assert.ok(!measureToReview?.waypoints?.length, "reroute-bearing save must clear authored waypoint geometry");
});

test("persist arrow waypoint overrides upgrades shorthand arrows to mappings", () => {
  const baselineText = [
    "engine: v3",
    "title: Demo",
    "arrows:",
    "  - leaf_a -> leaf_b",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "    - id: leaf_a",
    "      label: [A]",
    "    - id: leaf_b",
    "      label: [B]",
    "",
  ].join("\n");
  const output = persistToYaml("arrow-waypoints-shorthand.yaml", baselineText, {
    overrides: {
      "arrow:edge:leaf_a->leaf_b": {
        waypoints: [[24, 32]],
      },
    },
  });

  assert.match(
    output,
    /arrows:\r?\n- source: leaf_a\r?\n  target: leaf_b\r?\n  waypoints:\r?\n  - - 24\r?\n    - 32/,
  );

  const reloaded = loadFrameYaml(writeTempFrame("arrow-waypoints-shorthand-reloaded.yaml", output));
  assert.deepStrictEqual(reloaded.arrows[0]?.waypoints, [[24, 32]]);
});

test("persist arrow waypoint overrides disambiguates duplicate authored edges", () => {
  const baselineText = [
    "engine: v3",
    "title: Duplicate arrows",
    "arrows:",
    "  - source: leaf_a",
    "    target: leaf_b",
    "  - source: leaf_a",
    "    target: leaf_b",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "    - id: leaf_a",
    "      label: [A]",
    "    - id: leaf_b",
    "      label: [B]",
    "",
  ].join("\n");
  const [, secondArrow] = collectPreviewArrowComponentEntries([
    { source: "leaf_a", target: "leaf_b" },
    { source: "leaf_a", target: "leaf_b" },
  ]);

  const output = persistToYaml("duplicate-arrows.yaml", baselineText, {
    overrides: {
      [secondArrow!.componentId]: {
        waypoints: [[88, 40]],
      },
    },
  });

  const reloaded = loadFrameYaml(writeTempFrame("duplicate-arrows-reloaded.yaml", output));
  assert.deepStrictEqual(reloaded.arrows[0]?.waypoints ?? [], []);
  assert.deepStrictEqual(reloaded.arrows[1]?.waypoints, [[88, 40]]);
});

test("persist arrow waypoint overrides match preview edge ids against the authored arrow sequence", () => {
  const baselineText = [
    "engine: v3",
    "title: Mixed duplicate arrows",
    "arrows:",
    "  - id: named_edge",
    "    source: leaf_a",
    "    target: leaf_b",
    "  - source: leaf_a",
    "    target: leaf_b",
    "  - source: leaf_a",
    "    target: leaf_b",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "    - id: leaf_a",
    "      label: [A]",
    "    - id: leaf_b",
    "      label: [B]",
    "",
  ].join("\n");
  const [, , secondImplicitArrow] = collectPreviewArrowComponentEntries([
    { id: "named_edge", source: "leaf_a", target: "leaf_b" },
    { source: "leaf_a", target: "leaf_b" },
    { source: "leaf_a", target: "leaf_b" },
  ]);

  const output = persistToYaml("mixed-duplicate-arrows.yaml", baselineText, {
    overrides: {
      [secondImplicitArrow!.componentId]: {
        waypoints: [[112, 48]],
      },
    },
  });

  const reloaded = loadFrameYaml(writeTempFrame("mixed-duplicate-arrows-reloaded.yaml", output));
  assert.deepStrictEqual(reloaded.arrows[0]?.waypoints ?? [], []);
  assert.deepStrictEqual(reloaded.arrows[1]?.waypoints ?? [], []);
  assert.deepStrictEqual(reloaded.arrows[2]?.waypoints, [[112, 48]]);
});

test("persist arrow waypoint overrides preserve arrow:<id> branch attachments", () => {
  const baselineText = [
    "engine: v3",
    "title: Arrow branch refs",
    "arrows:",
    "  - id: stem",
    "    source: source.bottom",
    "    target: target.top",
    "  - source: arrow:stem",
    "    target: branch.left",
    "root:",
    "  id: page",
    "  children:",
    "    - id: source",
    "      label: [Source]",
    "    - id: target",
    "      label: [Target]",
    "    - id: branch",
    "      label: [Branch]",
    "",
  ].join("\n");
  const [, branchArrow] = collectPreviewArrowComponentEntries([
    { id: "stem", source: "source.bottom", target: "target.top" },
    { source: "arrow:stem", target: "branch.left" },
  ]);

  const output = persistToYaml("arrow-branch-refs.yaml", baselineText, {
    overrides: {
      [branchArrow!.componentId]: {
        waypoints: [[180, 80]],
      },
    },
  });

  assert.match(
    output,
    /- source: arrow:stem\r?\n  target: branch.left\r?\n  waypoints:\r?\n  - - 180\r?\n    - 80/,
  );

  const reloaded = loadFrameYaml(writeTempFrame("arrow-branch-refs-reloaded.yaml", output));
  assert.strictEqual(reloaded.arrows[1]?.source, "arrow:stem");
  assert.strictEqual(reloaded.arrows[1]?.target, "branch.left");
  assert.deepStrictEqual(reloaded.arrows[1]?.waypoints, [[180, 80]]);
});

test("persist→reload reroute-bearing edits preserve explicit arrow ids and arrow:<id> attachments", () => {
  const baselineText = [
    "engine: v3",
    "title: Arrow branch refs",
    "arrows:",
    "  - id: stem",
    "    source: source.bottom",
    "    target: target.top",
    "  - source: arrow:stem",
    "    target: branch.left",
    "    waypoints:",
    "      - [180, 80]",
    "root:",
    "  id: page",
    "  direction: horizontal",
    "  children:",
    "    - id: source",
    "      label: [Source]",
    "    - id: target",
    "      label: [Target]",
    "    - id: branch",
    "      label: [Branch]",
    "",
  ].join("\n");
  const [, branchArrow] = collectPreviewArrowComponentEntries([
    { id: "stem", source: "source.bottom", target: "target.top" },
    { source: "arrow:stem", target: "branch.left" },
  ]);

  const output = persistToYaml("arrow-branch-refs-reroute.yaml", baselineText, {
    overrides: {
      page: {
        direction: "vertical",
      },
      [branchArrow!.componentId]: {
        waypoints: [],
      },
    },
  });

  const reloaded = loadFrameYaml(writeTempFrame("arrow-branch-refs-reroute-reloaded.yaml", output));
  assert.strictEqual(reloaded.root.direction, "VERTICAL");
  assert.strictEqual(reloaded.arrows[0]?.id, "stem");
  assert.strictEqual(reloaded.arrows[1]?.source, "arrow:stem");
  assert.strictEqual(reloaded.arrows[1]?.target, "branch.left");
  assert.ok(!reloaded.arrows[1]?.waypoints?.length, "reroute-bearing save must preserve attachments without stale waypoints");
});

test("persist arrow waypoint overrides round-trip explicit arrow ids", () => {
  const baselineText = [
    "engine: v3",
    "title: Explicit arrow ids",
    "arrows:",
    "  - id: stem",
    "    source: source.bottom",
    "    target: target.top",
    "root:",
    "  id: page",
    "  children:",
    "    - id: source",
    "      label: [Source]",
    "    - id: target",
    "      label: [Target]",
    "",
  ].join("\n");
  const output = persistToYaml("explicit-arrow-id.yaml", baselineText, {
    overrides: {
      [createPreviewArrowComponentId({
        id: "stem",
        source: "source.bottom",
        target: "target.top",
      })]: {
        waypoints: [[132, 72]],
      },
    },
  });

  assert.match(
    output,
    /- id: stem\r?\n  source: source\.bottom\r?\n  target: target\.top\r?\n  waypoints:\r?\n  - - 132\r?\n    - 72/,
  );

  const reloaded = loadFrameYaml(writeTempFrame("explicit-arrow-id-reloaded.yaml", output));
  assert.strictEqual(reloaded.arrows[0]?.id, "stem");
  assert.deepStrictEqual(reloaded.arrows[0]?.waypoints, [[132, 72]]);
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

test("persist→reload round-trip: test-alignment-grid keeps HUG child sizing and reflow after parent shrink", () => {
  const baselineText = fs.readFileSync(ALIGNMENT_GRID_FIXTURE, "utf8");
  const persistent = persistToYaml("test-alignment-grid-hug.yaml", baselineText, {
    overrides: {
      container: {
        sizing_w: "FIXED",
        width: 160,
        sizing_h: "FIXED",
        height: 208,
      },
      small_box: {
        sizing_w: "HUG",
        sizing_h: "HUG",
      },
    },
  });

  const reloaded = loadFrameYaml(writeTempFrame("test-alignment-grid-hug-reloaded.yaml", persistent));
  const container = findFrameById(reloaded.root, "container");
  const child = findFrameById(reloaded.root, "small_box");

  assert.match(persistent, /id: small_box[\s\S]*sizing_w: hug[\s\S]*sizing_h: hug/);
  assert.equal(container?.sizingW, "FIXED");
  assert.equal(container?.width, 160);
  assert.equal(child?.sizingW, "HUG");
  assert.equal(child?.sizingH, "HUG");

  layoutFrameTree(reloaded.root, new MockTextAdapter());

  assert.ok(container, "container must survive save + reload");
  assert.ok(child, "small_box must survive save + reload");
  assert.ok(child._layout.placedW < 192, "reloaded HUG child should shrink below its authored fixed width");
  assert.ok(
    child._layout.placedW < container._layout.placedW,
    "reloaded HUG child should fit within the saved smaller parent width",
  );
});

test("persist→reload round-trip: nested HUG container child reflows within the saved smaller parent width", () => {
  const baselineText = [
    "engine: v3",
    "title: Nested hug resize",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "    - id: parent",
    "      direction: vertical",
    "      sizing_w: fixed",
    "      sizing_h: fixed",
    "      width: 240",
    "      height: 240",
    "      padding: 8",
    "      border: solid",
    "      children:",
    "        - id: child_container",
    "          direction: vertical",
    "          sizing_w: fixed",
    "          sizing_h: hug",
    "          width: 192",
    "          padding: 8",
    "          border: solid",
    "          children:",
    "            - id: inner_leaf",
    "              width: 192",
    "              height: 64",
    "              label: [Small box change alignment]",
    "",
  ].join("\n");
  const persistent = persistToYaml("nested-hug-container.yaml", baselineText, {
    overrides: {
      parent: {
        sizing_w: "FIXED",
        width: 160,
        sizing_h: "FIXED",
        height: 240,
      },
      child_container: {
        sizing_w: "HUG",
        sizing_h: "HUG",
      },
      inner_leaf: {
        sizing_w: "HUG",
        sizing_h: "HUG",
      },
    },
  });

  const reloaded = loadFrameYaml(writeTempFrame("nested-hug-container-reloaded.yaml", persistent));
  const parent = findFrameById(reloaded.root, "parent");
  const childContainer = findFrameById(reloaded.root, "child_container");
  const innerLeaf = findFrameById(reloaded.root, "inner_leaf");

  assert.match(persistent, /id: child_container[\s\S]*sizing_w: hug[\s\S]*sizing_h: hug/);
  assert.equal(parent?.width, 160);
  assert.equal(childContainer?.sizingW, "HUG");
  assert.equal(childContainer?.sizingH, "HUG");
  assert.equal(innerLeaf?.sizingW, "HUG");
  assert.equal(innerLeaf?.sizingH, "HUG");

  layoutFrameTree(reloaded.root, new MockTextAdapter());

  assert.ok(parent, "parent must survive save + reload");
  assert.ok(childContainer, "child_container must survive save + reload");
  assert.ok(innerLeaf, "inner_leaf must survive save + reload");
  assert.ok(childContainer._layout.placedW < 192, "reloaded HUG container child should shrink below its stale fixed width");
  assert.ok(
    childContainer._layout.placedX + childContainer._layout.placedW <= parent._layout.placedX + parent._layout.placedW,
    "reloaded HUG container child should stay within the saved smaller parent width",
  );
  assert.ok(
    innerLeaf._layout.placedX + innerLeaf._layout.placedW <= childContainer._layout.placedX + childContainer._layout.placedW,
    "reloaded nested leaf should stay within the reflowed HUG container child",
  );
});

test("persist→reload round-trip: absolute positions survive drag, nudge, and multi-select saves", () => {
  const baselineText = [
    "engine: v3",
    "title: Absolute positioning",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "    - id: dragged",
    "      label: [Dragged]",
    "    - id: nudged",
    "      label: [Nudged]",
    "    - id: multi_left",
    "      label: [Multi Left]",
    "    - id: multi_right",
    "      label: [Multi Right]",
    "",
  ].join("\n");

  const persistent = persistToYaml("absolute-position-roundtrip.yaml", baselineText, {
    overrides: {
      dragged: {
        position: "ABSOLUTE",
        x: 40,
        y: 56,
      },
      nudged: {
        position: "ABSOLUTE",
        x: 97,
        y: 31,
      },
      multi_left: {
        position: "ABSOLUTE",
        x: 176,
        y: 88,
      },
      multi_right: {
        position: "ABSOLUTE",
        x: 256,
        y: 88,
      },
    },
  });

  assert.match(persistent, /id: dragged[\s\S]*position: absolute[\s\S]*x: 40[\s\S]*y: 56/);
  assert.match(persistent, /id: nudged[\s\S]*position: absolute[\s\S]*x: 97[\s\S]*y: 31/);
  assert.match(persistent, /id: multi_left[\s\S]*position: absolute[\s\S]*x: 176[\s\S]*y: 88/);
  assert.match(persistent, /id: multi_right[\s\S]*position: absolute[\s\S]*x: 256[\s\S]*y: 88/);

  const reloaded = loadFrameYaml(writeTempFrame("absolute-position-reloaded.yaml", persistent));
  const rootChildren = Array.isArray(reloaded.root.children) ? reloaded.root.children : [];
  const byId = new Map(rootChildren.map((child) => [child.id, child]));

  assert.equal(byId.get("dragged")?.positionType, "ABSOLUTE");
  assert.equal(byId.get("dragged")?.x, 40);
  assert.equal(byId.get("dragged")?.y, 56);
  assert.equal(byId.get("nudged")?.positionType, "ABSOLUTE");
  assert.equal(byId.get("nudged")?.x, 97);
  assert.equal(byId.get("nudged")?.y, 31);
  assert.equal(byId.get("multi_left")?.positionType, "ABSOLUTE");
  assert.equal(byId.get("multi_left")?.x, 176);
  assert.equal(byId.get("multi_left")?.y, 88);
  assert.equal(byId.get("multi_right")?.positionType, "ABSOLUTE");
  assert.equal(byId.get("multi_right")?.x, 256);
  assert.equal(byId.get("multi_right")?.y, 88);
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

  assertYamlEqual(output, expected);
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

  assertYamlEqual(output, expected);
});

test("persist highlight style round-trips as a bordered black box", () => {
  const baselineText = [
    "engine: v3",
    "title: Highlight",
    "root:",
    "  id: page",
    "  direction: vertical",
    "  children:",
    "    - id: callout",
    "      label: [Important]",
    "",
  ].join("\n");

  const output = persistToYaml("highlight.yaml", baselineText, {
    overrides: { callout: { style: "highlight" } },
  });

  assert.match(output, /id: callout[\s\S]*fill: black[\s\S]*border: solid/);
  const reloaded = loadFrameYaml(writeTempFrame("highlight-reloaded.yaml", output));
  const callout = reloaded.root.children.find((child) => child.id === "callout");
  assert.ok(callout, "highlighted frame must survive save + reload");
  assert.strictEqual(callout?.fill, "#000000");
  assert.strictEqual(callout?.border, "SOLID");
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

  assertYamlEqual(output, expected);
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

  assertYamlEqual(output, expected);
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

  assertYamlEqual(output, expected);
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

  assertYamlEqual(output, expected);
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
