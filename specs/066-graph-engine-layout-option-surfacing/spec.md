# Spec 066: Graph Engine Layout Option Surfacing

**Feature Branch**: `feat/066-graph-engine-layout-option-surfacing`  
**Status**: Closeout Ready  
**Created**: 2026-06-29  
**Research inventory**: [`official-option-inventory.md`](./official-option-inventory.md)

> **Ownership update (2026-06-29):** the parameter-pane architecture work
> proposed in spec 067 is folded into this spec on the current branch. 066 now
> owns both the option inventory/surfacing audit and the operator-scoped
> override lifecycle needed to make those controls correct at scale.

## Problem

The preview aside currently treats graph-engine controls as a partial,
hand-curated convenience surface instead of an audited contract. That causes
three different classes of failure:

1. Some engines surface too little. Dagre has documented graph-level spacing
   and ranking controls, but the repo only wires a subset and the aside has
   historically shown nothing or too little on engine switch.
2. Some engines surface the wrong things. `elk-stress` currently exposes
   `elk.spacing.nodeNode` and `elk.randomSeed`, even though the official stress
   algorithm page does not list those as supported options.
3. Some surfaced controls are semantically misleading. The reported radial
   `Node gap` control changes whitespace around the drawing more than perceived
   sibling separation, while edge-to-node clearance remains too small for arrow
   visibility.

The fix is not "show every string key we can find." The repo needs an audited,
typed option inventory that distinguishes:

- documented graph-scoped options we should expose in the root aside
- documented node- or edge-scoped options that need a different editor surface
- advanced options whose dependencies are not authored by this preview
- implementation-owned options such as `elk.padding` and `elk.portConstraints`
  that the ELK bridge currently consumes internally

## Goals

- Audit the official Dagre and ELK documentation for the built-in graph engines
  used in preview: Dagre, ELK Force, ELK Stress, ELK Mr. Tree, and ELK Radial.
- Record a repo-owned option inventory that marks each candidate as
  `Expose`, `Investigate`, or `Do not expose`, with a reason.
- Surface every approved graph-scoped option in the preview aside through typed
  registries, not ad hoc DOM branching.
- Remove controls that are undocumented for the active algorithm, node-scoped,
  edge-scoped, implementation-owned, or behaviorally misleading.
- Require live behavior proof for every surfaced control whose effect is not
  obvious from the docs alone.
- Keep surfaced controls operator-scoped end-to-end: pane state, relayout,
  save, reload, and undo must all see the same active engine bucket.
- Converge graph-engine parameter hosting onto one manifest-driven layout pane
  path. Engine-specific section ids, controller names, and legacy aliases may
  survive only as thin compatibility shims at a single boundary, not as active
  typed ownership inside the preview shell.

## Non-goals

- No per-node or per-edge authoring UI for graph engines in this spec.
- No reopening of spec 046 by widening `scripts/preview/editor.js`,
  `layout-bridge.js`, or other behavior-heavy `scripts/preview/*.js` owners.
- No blanket exposure of every ELK option across all algorithms. This spec is
  about the built-in preview graph engines and the root-level aside surface.
- No forced exposure of options whose documented dependencies are not authored
  in preview today, such as radial position-driven advanced sort/translation
  controls.
- No "acceptable interim" split architecture where Dagre and ELK families keep
  separate first-class layout-pane hosts long-term. A temporary shim is only
  acceptable if the typed owners already converge on one canonical path.

## Scope Summary

- **In scope**: Dagre graph-level controls; ELK graph-level controls for Force,
  Stress, Mr. Tree, Radial, and Rectpacking; persistence and reload of those
  overrides; dependency-aware UI gating.
- **Reference only**: ELK Layered remains the precedent for a richer control
  surface, but this spec does not reopen the layered inventory except where a
  shared registry contract must be normalized.
- **Deferred**: future graph engines beyond the current built-ins can adopt the
  same inventory contract after this spec lands.

## Functional Requirements

- **FR-001**: Create a repo-owned audited inventory at
  `specs/066-graph-engine-layout-option-surfacing/official-option-inventory.md`
  covering Dagre, ELK Force, ELK Stress, ELK Mr. Tree, and ELK Radial.
- **FR-002**: Every option in that inventory must be classified as `Expose`,
  `Investigate`, or `Do not expose`, with a concrete reason such as
  `graph-scoped`, `node-scoped`, `edge-scoped`, `requires-position`,
  `requires-topdown`, `implementation-owned`, or `doc/runtime mismatch`.
- **FR-003**: Dagre must surface every approved graph-scoped option through the
  typed preview-engine registry and through actual Dagre layout plumbing. UI-only
  exposure is not sufficient.
- **FR-004**: ELK Force, Stress, Mr. Tree, and Radial must each expose only the
  approved graph-scoped options for that algorithm. Shared generic keys such as
  `elk.spacing.edgeNode` may only be exposed after the inventory and live proof
  confirm that the active algorithm honors them in this repo's bridge.
- **FR-005**: Options that are conditional in the official docs must be
  conditionally surfaced in the UI. Examples include:
  `elk.force.repulsion` for `ForceModelStrategy.EADES`,
  `elk.force.temperature` for `FRUCHTERMAN_REINGOLD`,
  `elk.radial.rotation.targetAngle` when `elk.radial.rotate` is true, and
  `elk.radial.compactionStepSize` when compaction is enabled.
- **FR-006**: The repo must remove or rename any control whose live behavior
  does not match the label shown to the user. The reported radial `Node gap`
  mismatch is a mandatory proof point.
- **FR-007**: Implementation-owned ELK bridge keys such as `elk.padding` and
  `elk.portConstraints` must remain hidden from the author-facing root aside
  unless the bridge contract is intentionally changed and re-specified.
- **FR-008**: Node-scoped and edge-scoped options must not be surfaced in the
  root aside just because the upstream engine supports them. They may only be
  exposed in a future spec that introduces the correct selection/editor model.
- **FR-009**: The preview shell must keep graph-engine controls contextual after
  engine switching, reload, and save/reload persistence. A control set for one
  engine must not bleed into another.
- **FR-010**: Because this spec affects the preview override/save path, it
  cannot move to `Closeout Ready` without at least one repo-owned
  `persist -> reload` regression covering graph-engine override persistence.
- **FR-011**: Conditional control visibility must be state-owning, not
  cosmetic. When a `visibleWhen` dependency hides a control, the hidden key
  must be pruned from session overrides, relayout inputs, and persisted engine
  layout payloads.
- **FR-012**: Frame-YAML engine-layout reload must hydrate session overrides
  from the active engine manifest and persist namespace, not from legacy
  `elkLayout` assumptions alone. Dagre and ELK-family engines must both seed
  from `engineLayout[meta.<engine>]` when present.
- **FR-013**: Shared namespaces such as `meta.elk` must not allow impossible
  cross-engine key mixes to save silently. The save path must reject a namespaced
  key set that cannot belong to any single supported engine manifest.
- **FR-014**: Registry metadata must not surface invalid enums. Layered
  node-placement options must stay aligned with the documented node-placement
  strategies rather than values from other ELK option families.
- **FR-015**: The preview shell must own layout-engine session state per active
  operator, not as one flat shared override bag reused across Dagre and ELK
  families.
- **FR-016**: Pane collection, fresh render, relayout bridge resolution, save
  payload assembly, and snapshot restore must share one effective-override
  resolver instead of duplicating merge/prune logic.
- **FR-017**: Undo/save-reload must preserve the per-operator override model so
  switching between incompatible engines does not leak stale settings back into
  the active engine after restore.
- **FR-018**: Graph-engine parameter hosting must converge on one manifest-driven
  sidebar section and runtime contract for graph layout parameters. Dagre and
  ELK-family engines may differ by manifest metadata, but not by separate
  first-class typed pane owners.
- **FR-019**: Legacy names such as `elkLayout`, `elk_layout_overrides`,
  `ElkLayoutControls`, and `ElkPreviewController` may exist only at a single
  normalization or browser-compat boundary. They must not remain parallel
  internal state lanes, save payload owners, or engine-specific typed host
  contracts.

## Success Criteria

- **SC-001**: The inventory doc lists the official graph-scoped Dagre options
  and the official or option-reference-backed ELK options for Force, Stress,
  Mr. Tree, and Radial, with exposure decisions and reasons.
- **SC-002**: Dagre no longer tops out at four hard-coded controls if the
  inventory approves more graph-level options.
- **SC-003**: `elk-stress` no longer surfaces controls that are undocumented for
  that algorithm without an explicit inventory exception backed by live proof.
- **SC-004**: The radial and tree-family engines expose a real edge-clearance
  control if the docs and runtime prove one exists; otherwise the misleading
  control is removed or relabeled.
- **SC-005**: Focused tests prove the registry keys for each engine equal the
  approved inventory, and focused runtime tests prove conditional controls gate
  correctly.
- **SC-006**: At least one repo-owned `persist -> reload` regression proves
  graph-engine override persistence survives save and page reload.
- **SC-007**: `npm --prefix packages/layout-engine test`,
  `npm --prefix apps/preview test`, and
  `node scripts/check_no_new_python.mjs` pass when implementation lands.
- **SC-008**: Switching a dependency-gated option branch, such as ELK force
  model, removes hidden branch-specific keys from the session model and from the
  next persisted payload.
- **SC-009**: A Dagre diagram with persisted `engineLayout.meta.dagre` values
  reloads those values into the live session model without waiting for a user
  edit.
- **SC-010**: A `meta.elk` payload that mixes keys from incompatible ELK engine
  manifests fails validation instead of reaching layered reload with a broader
  union contract.
- **SC-011**: Switching from one incompatible engine to another does not reuse
  the previous engine's session bucket as the new engine's live aside state.
- **SC-012**: Editor snapshots carry the per-operator layout state and restore
  it without collapsing back to one flat `layoutOverrides` bag.
- **SC-013**: The active graph-engine aside host uses one canonical section /
  runtime path for layout parameters; engine registration changes manifest
  metadata, not host-shell branching between Dagre and ELK lanes.
- **SC-014**: Repo search shows no internal typed ownership of deprecated
  `elkLayoutOverrides`-style session state, and any remaining ELK-named aliases
  are confined to one explicit compatibility boundary.

## Risks

- The ELK algorithm overview pages and the per-option reference pages are not
  perfectly consistent. The inventory must explicitly record when a candidate is
  admitted by an option page but still requires live proof before exposure.
- Some upstream options are documented but not product-appropriate. Surfacing an
  advanced control with no visible effect is worse than hiding it.
- Dagre root-level controls and Dagre edge-level controls are easy to mix up.
  This spec must keep that boundary explicit.

## Adversarial Review Follow-ups

- Accept and implement:
  hidden `visibleWhen` controls currently behave like a display-only concern,
  not a state-pruning concern.
- Accept and implement:
  Dagre reload hydration is still legacy-ELK-biased and needs active-engine
  namespace seeding.
- Accept and implement:
  layered node-placement metadata currently includes a layering-only enum value
  and should be corrected.
- Accept with refinement:
  the `meta.elk` problem is not the shared namespace by itself; the real defect
  is allowing a namespaced key set that cannot belong to any single supported
  ELK engine manifest. The fix is manifest-aware validation and active-engine
  reload filtering, not namespace explosion by default.
- Accept and tighten:
  a Houdini-style pane is not achieved if the host shell still branches between
  `elk-layout` and `graph-layout` as separate long-term owners. Closeout must
  require one canonical graph-layout parameter section, with any legacy names
  reduced to wrappers only.
- Accept and tighten:
  "compatibility" is not a license for duplicate internals. Legacy aliases are
  allowed only at one ingress/shim boundary and must not produce a second
  implementation path the next change has to update.
- Defer unless later proof warrants it:
  unit labels and single-choice enum presentation are real UX debts, but they
  are lower-tier polish compared with override lifecycle and save/reload
  correctness.

## Closing Note

This spec exists because "the library supports it" and "the user should see it
in the root aside" are different decisions. The inventory is the contract that
prevents future graph engines from repeating the current Dagre / non-layered
ELK drift.
