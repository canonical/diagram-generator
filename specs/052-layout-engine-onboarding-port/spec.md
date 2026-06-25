# Spec 052: Layout Engine Onboarding Factory and Multi-Engine Port

**Feature Branch**: `feat/052-layout-engine-onboarding-port`
**Status**: Draft
**Created**: 2026-06-25
**Owner doc**: this file + `tasks.md` + `engine-onboarding-checklist.md` in this folder

---

## 0. How to use this spec (read first)

This spec is written to be followed **literally** by an implementing agent. Rules:

- Do the phases **in order**. Do not start Phase N+1 until Phase N's
  "Definition of Done" passes.
- Every task in `tasks.md` has an explicit file path, an explicit acceptance
  check, and the exact command to verify it. Run the command. Paste the result
  into the task's verification note. Do not mark a task `[x]` without a real
  passing command.
- When this spec says "mirror existing pattern X", open file X, copy its shape,
  and change only the engine-specific values. Do not invent a new pattern.
- If reality contradicts this spec (a signature differs, a file moved), **stop**,
  write the contradiction in `tasks.md` under the task, and ask before guessing.
- **Never** mark a UI/preview task done from unit tests alone. Preview ships a
  **built browser bundle**, not TypeScript source. See Phase 0.

### Hard guardrails (from `AGENTS.md`, do not violate)

- Product path is Node + TypeScript. **No new Python product logic.**
- **Do not** add behavior to `scripts/preview/editor.js` or
  `scripts/preview/layout-bridge.js` beyond tiny delegation glue. New engine
  logic goes in `packages/layout-engine/src/` and `packages/graph-layout-*`.
- **Do not** add a central `if (engineId === 'x')` branch anywhere. All engine
  differences must flow through the manifest/registry/factory.
- `scripts/diagrams/frames/*.yaml` is authored source of truth. Read before
  editing; minimal diffs; do not reformat unrelated frame YAML.
- After changing any browser-facing export, rebuild the bundle (Phase 0 §0.3).

---

## 1. Problem

The repo wants to host **many** layout engines — ultimately "all of mermaid's
and elkjs's diagram layout algorithms" — but onboarding a new engine today is a
bespoke, multi-file hand-wiring exercise, and only **one** ELK algorithm is
actually exposed.

Concrete current state (verified 2026-06-25):

- `packages/layout-engine/src/preview-engine/builtins.ts` registers exactly four
  preview engines: `v3`, `elk-layered`, `force`, `sequence`.
- `packages/graph-layout-elk/` implements **two** ELK algorithms
  (`elk-layered.ts`, `elk-force.ts`) but only `elk-layered` is surfaced:
  - `engine-capabilities.ts` exports only `ELK_LAYERED_GRAPH_LAYOUT_ENGINE`
    (no force descriptor).
  - `elk-force` has **no** preview manifest and **no** install unit.
- Adding one engine currently means editing ~5 files by hand
  (`graph-layout-elk` descriptor + param specs, a render adapter in
  `builtin-render-adapters.ts`, a manifest + install unit in `builtins.ts`,
  registration in `builtin-install-units.ts`) with no shared factory and no
  per-engine test scaffold.
- `mindmap-lite.ts` proves a **foreign-shaped** engine can register via
  `registerPreviewEngine` + `registerPreviewDocumentSvgRenderer` without central
  branching — but it is a skeletal SVG drawer, not a real graph layout engine,
  so it does not prove the **graph-layout** onboarding path.

This is the spec-046 closeout question made concrete: *can we add layout engine
N+1 cheaply and safely?* Today: not cheaply, and not for the full elkjs family.

## 2. Goal

Make layout-engine onboarding a **declarative, factory-driven, tested** path so
that adding a graph layout algorithm is one small file + one registration line +
one generated contract test, with **no** central branching and **no** legacy
shell edits. Prove it by:

1. Porting the **complete elkjs algorithm family** the bundled `elkjs` build
   supports (layered, force, stress, mrtree, radial, rectpacking, and any others
   the installed `elkjs` exposes — confirm the list in Phase 3).
2. Adding **dagre** as the first non-ELK graph engine (dagre is mermaid's core
   flowchart layout algorithm), proving the factory is not ELK-specific.

## 3. Non-goals

- **Not** building a mermaid text parser or mermaid diagram-type renderers. That
  is interchange/authoring work owned by spec 028. This spec ports **layout
  algorithms** and their engine onboarding, not mermaid syntax import.
- **Not** redesigning the right-aside UI. Spec 051 owns that. This spec only
  relies on spec 051's manifest-driven gating and adds engines that flow through
  it.
- **Not** changing the frame YAML schema's authoring surface beyond adding new
  permitted `meta.layout_engine` values.
- **Not** touching `scripts/preview/force.js` internals (force-shell migration
  is separate).

## 4. Definitions

- **Graph layout engine**: a function that maps the engine-agnostic
  `GraphLayoutInput` (`packages/graph-layout-core/src/graph-ir.ts`) to a
  `GraphLayoutResult`, plus a `GraphLayoutEngineDescriptor` declaring its
  capabilities. Lives in a `packages/graph-layout-*` package.
- **Preview engine**: a `PreviewEngineManifest`
  (`packages/layout-engine/src/preview-engine/types.ts`) + a render adapter,
  installed via a `PreviewEngineInstallUnit`. This is what the preview shell and
  server consume.
- **Onboarding factory**: the new helper this spec introduces that turns a graph
  layout engine + a small descriptor into a fully wired preview engine
  (manifest + control specs + render-adapter registration + install unit).

## 5. Reference files (open these before coding)

| Concept | File |
|---|---|
| Engine-agnostic IR + capability types | `packages/graph-layout-core/src/graph-ir.ts` |
| ELK graph engine descriptor (pattern) | `packages/graph-layout-elk/src/engine-capabilities.ts` |
| ELK layered algorithm + options | `packages/graph-layout-elk/src/elk-layered.ts`, `layered-options.ts`, `elk-param-registry.ts` |
| ELK force algorithm + options | `packages/graph-layout-elk/src/elk-force.ts`, `force-options.ts` |
| Preview manifest + capability contract | `packages/layout-engine/src/preview-engine/types.ts` |
| Manifest + install-unit pattern | `packages/layout-engine/src/preview-engine/builtins.ts` |
| Render-adapter registration | `packages/layout-engine/src/preview-engine/builtin-render-adapters.ts`, `render.ts` |
| Install-unit registry | `packages/layout-engine/src/preview-engine/install-units.ts`, `builtin-install-units.ts`, `install-builtins.ts` |
| Engine registry + compatibility | `packages/layout-engine/src/preview-engine/registry.ts` |
| Param-spec → preview-control adapter | `packages/layout-engine/src/preview-engine/elk-controls.ts` |
| Foreign-engine proof (registration only) | `packages/layout-engine/src/preview-engine/mindmap-lite.ts` |
| Manifest-driven UI gating (spec 051) | `packages/layout-engine/src/preview-shell/preview-ui-context.ts` |
| Server section gating | `apps/preview/src/preview-host/builtin-autolayout-host.ts` |
| ELK frame layout entry | `packages/layout-engine/src/elk-layout.ts` (`layoutElkFrameDiagram`) |

## 6. Architecture to build

### 6.1 Graph engine descriptor completeness

Every algorithm in `packages/graph-layout-*` must export a
`GraphLayoutEngineDescriptor` (id + `GraphLayoutCapabilities`). Today only
`ELK_LAYERED_GRAPH_LAYOUT_ENGINE` exists. Each new algorithm must declare honest
capabilities (directions, sizing, ports, edgeLabels, constraints, compounds) so
downstream code can branch on **capabilities**, never on engine id.

### 6.2 The onboarding factory (core deliverable)

New file: `packages/layout-engine/src/preview-engine/define-graph-layout-engine.ts`

It must export a single factory, e.g.:

```ts
export interface GraphLayoutPreviewEngineDefinition {
  /** Manifest identity (e.g. 'elk-force'). */
  id: string;
  label: string;
  /** meta.layout_engine value (usually === id). */
  layoutEngineKey: string;
  /** Shared render lane key (e.g. 'frame-elk-force'); used by render adapter. */
  renderFamily: string;
  /** Graph engine capability descriptor from a graph-layout-* package. */
  graphEngine: GraphLayoutEngineDescriptor;
  /** Engine-specific tunable params, already in PreviewControlSpec shape. */
  controlSpecs: PreviewControlSpec[];
  /** Sidebar sections this engine exposes (e.g. ['elk-layout']). */
  sidebarSections?: PreviewViewerSidebarSection[];
  /** Capability flags for preview chrome gating (defaults provided). */
  capabilities?: Partial<PreviewEngineCapabilities>;
  /** Frame-diagram compatibility rules (min arrows, etc). */
  compatibility?: Partial<PreviewEngineCompatibility>;
  /** The frame render adapter for this engine's renderFamily. */
  renderAdapter: PreviewFrameDiagramRenderAdapter;
  /** Browser script files this engine lane needs (default []). */
  scripts?: string[];
}

export function defineGraphLayoutPreviewEngine(
  def: GraphLayoutPreviewEngineDefinition,
): { manifest: PreviewEngineManifest; installUnit: PreviewEngineInstallUnit };
```

Behavior:

- Builds a `PreviewEngineManifest` with sensible capability **defaults** (a
  graph layout engine is server-relayout + engine-backed-save + node-inspector +
  layout-controls + reference-image; no grid editing; no simulation) that can be
  overridden by `def.capabilities`.
- Derives `compatibility.documentKinds` to include `'frame-diagram'` by default,
  merging `def.compatibility`.
- The `installUnit.install` registers the engine
  (`registerPreviewEngine(manifest)`) **and** the render adapter
  (`registerPreviewFrameDiagramRenderAdapter(def.renderFamily, def.renderAdapter)`),
  returning a single combined teardown (mirror
  `composePreviewEngineInstallUnit` in `builtins.ts`).
- Pure: no side effects at import time. Registration happens only when
  `installUnit.install()` is called from `builtin-install-units.ts`.

### 6.3 Generic param → control adapter

Generalize `elk-controls.ts`'s `elkParamToPreviewControl` into a reusable mapper
the factory can use for any engine's param specs, with a per-engine
`persistNamespace` (e.g. `meta.elk`, `meta.dagre`) instead of the hardcoded
`'meta.elk'`. Keep `elkLayeredPreviewControlSpecs()` working (refactor it to call
the generalized mapper).

### 6.4 Render lane per algorithm

ELK frame layout currently flows through `layoutElkFrameDiagram`
(`elk-layout.ts`) and a single `frame-elk` render family. To host multiple ELK
algorithms on the frame document kind, `layoutElkFrameDiagram` must accept an
**algorithm selector** (e.g. `elkAlgorithm: 'layered' | 'force' | 'stress' | …`)
sourced from the manifest's `layoutEngineKey`, OR each algorithm gets its own
`renderFamily` + adapter that calls the matching algorithm function. **Phase 3
Task T300 is an investigation task** to choose between these; do not guess.

### 6.5 Per-engine contract test generator

New test helper: `packages/layout-engine/tests/helpers/graph-layout-engine-contract.ts`
exporting `runGraphLayoutPreviewEngineContract(definition)` that asserts:

1. The manifest is registered and discoverable by `getPreviewEngine(id)` and
   `getPreviewEngineByLayoutKey(layoutEngineKey)`.
2. `evaluatePreviewEngineCompatibility` returns compatible for its declared
   document kinds and incompatible (with a reason) for others.
3. The render adapter produces a non-empty layout result for a minimal
   2-node/1-edge `GraphLayoutInput` fixture.
4. Declared capabilities match the graph engine descriptor (no lying manifest).
5. Control specs all have unique keys and a `persistNamespace`.

Every ported engine adds **one** test file that calls this helper. This is the
"engine N+1 is cheap" proof.

## 7. Functional requirements

- **FR-001**: A new `defineGraphLayoutPreviewEngine(...)` factory exists and is
  the only sanctioned way to register a graph-layout-backed preview engine.
- **FR-002**: `elk-layered` is refactored to be produced by the factory with
  **zero behavior change** (all existing tests still pass, byte-stable layout on
  the parity fixtures).
- **FR-003**: Every ELK algorithm the installed `elkjs` build supports is ported
  as a preview engine via the factory, each with: a graph engine descriptor in
  `graph-layout-elk`, param specs, a render adapter, a manifest, an install unit
  registration, and a contract test.
- **FR-004**: `dagre` is added as a new `packages/graph-layout-dagre` package
  with a `GraphLayoutEngineDescriptor` and a `GraphLayoutInput → GraphLayoutResult`
  adapter, then onboarded via the factory as preview engine `dagre`.
- **FR-005**: No central engine-id branching is introduced. Verified by a grep
  guard test (Phase 5) that fails if `=== 'elk-` / `=== 'dagre'` style branches
  appear outside the engine's own definition file.
- **FR-006**: Each new engine is selectable via `meta.layout_engine` in frame
  YAML and appears in the engine switcher when multiple engines are compatible,
  using only spec 051's manifest-driven gating (no new gating code).
- **FR-007**: The preview **browser bundle** is rebuilt and a no-screenshot live
  DOM probe confirms each new engine loads, shows only its own controls, and
  hides others (reuses spec 051 gating).
- **FR-008**: Each engine declares honest capabilities; the contract test fails
  if the manifest claims a capability the graph descriptor does not support.
- **FR-009**: All new params persist under an engine-scoped namespace
  (`meta.<engine>`); none collide with `meta.elk` unless they are ELK.
- **FR-010**: `docs/agent-index.md` and `engine-onboarding-checklist.md` document
  the exact onboarding steps so the next engine needs no spec re-read.

## 8. Success criteria

- **SC-001**: `npm --prefix packages/graph-layout-elk test` passes, including a
  descriptor + algorithm test for every ported ELK algorithm.
- **SC-002**: `npm --prefix packages/graph-layout-dagre test` passes.
- **SC-003**: `npm --prefix packages/layout-engine test` passes, including the
  per-engine contract tests and the no-central-branching guard test.
- **SC-004**: `npm --prefix apps/preview test` passes, including host-contract
  tests proving each engine's section visibility matrix.
- **SC-005**: `node scripts/check_no_new_python.mjs` passes.
- **SC-006**: `npm --prefix packages/layout-engine run build:browser` succeeds and
  a live DOM probe (Playwright, no screenshots) confirms FR-007 for at least
  `elk-layered`, one newly ported ELK algorithm, and `dagre`.
- **SC-007**: Adding the **last** engine in the family required editing only:
  (a) its own definition file, (b) one registration line in
  `builtin-install-units.ts` (or a list it reads), and (c) one contract test
  file. Demonstrated in the PR description with the diff stat.

## 9. Risks and mitigations

- **Stale browser bundle masks UI regressions.** Mitigation: Phase 0 adds a
  bundle-freshness check and every UI claim is backed by a live DOM probe.
- **`elkjs` algorithm availability varies by build.** Mitigation: Phase 3 T300
  enumerates the actually-available algorithms from the installed package before
  porting; do not port an algorithm the bundled `elkjs` cannot run.
- **dagre output coordinate model differs from ELK.** Mitigation: the dagre
  adapter must normalize into `GraphLayoutResult` using the same
  `result-normalizer`/grid-rounding conventions as ELK; cover with a fixture
  test.
- **Capability dishonesty causes silent UI bugs.** Mitigation: FR-008 contract
  test cross-checks manifest vs descriptor.

## 10. Out-of-scope follow-ups (record, do not build here)

- Mermaid text parser / diagram-type renderers → spec 028.
- Force-shell migration off `scripts/preview/force.js`.
- A user-facing "algorithm gallery" picker beyond the existing engine switcher.
