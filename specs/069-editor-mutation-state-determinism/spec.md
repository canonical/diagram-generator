# Spec 069: Editor Mutation State Determinism

**Feature Branch**: `feat/069-editor-mutation-state-determinism`  
**Status**: Draft — do not implement on `feat/068-internal-dual-path-deletion`  
**Created**: 2026-07-01  
**Owner Map**: [`editor-mutation-state-flow.md`](./editor-mutation-state-flow.md)

## Problem

The preview editor can enter states where the UI, runtime model, rendered SVG,
engine option buckets, dirty/undo state, and persisted YAML disagree about what
the diagram is. The symptoms are visible as "indeterminate state":

- clicking an engine tab can appear to do nothing, even if some internal engine
  identity changed
- controls from one engine can leave option state behind when switching to
  another engine
- controls that should be irrelevant for the active engine can still dirty the
  document or trigger relayout failures
- authored frame YAML used for manual preview exploration can contaminate tests
  that assume a different engine family
- save/reload can be green in a narrow test while the live editor has multiple
  competing truths for active engine, overrides, and geometry

This is bigger than a single bad control. It is a missing transaction contract.
Every editor mutation should have one authoritative state transition, one
render intent, one relayout decision, and one persistence result. If a mutation
is not valid for the active engine/document kind, it must be inert: no dirty
state, no undo entry, no stale option bucket, no relayout.

## Definitions

- **Editor mutation**: a user-visible action that may change preview state:
  engine tab click, engine option edit, autolayout control edit, inspector
  field edit, grid/alignment control, resize/drag/waypoint/text edit, selection,
  clear, undo/redo, save, reload.
- **State vector**: the complete observable state after a mutation:
  active tab, `PreviewRenderIntent`, `frameTreeJson`, layout-operator override
  buckets, dirty flag, undo stack, rendered `svg[data-layout-engine]`, node
  bounds, selection id/type, inspector target, focused control, control
  applicability reason, visible controls, save payload, and reloaded YAML parse.
- **Deterministic mutation**: the same pre-state + action produces one state
  vector, with all fields agreeing.
- **Indeterminate state**: any post-mutation state where two authoritative
  surfaces disagree, or where an invalid/no-op mutation changes dirty/undo,
  render, relayout, save payload, or option buckets.

## Goals

- Define one typed mutation transaction contract for preview editor changes.
- Make all mutating controls declare applicability by active engine, document
  kind, selection, and capability before they can write state.
- Ensure engine switches atomically change active intent, visible controls,
  option bucket, render input, and save semantics.
- Prove invalid or inapplicable controls are inert, not merely hidden or
  disabled late in the flow.
- Add real-gesture state-vector evidence that distinguishes:
  true rerender bugs, legitimate equivalent geometry, and UI-only no-ops.
- Prevent manual authoring experiments in frame YAML from breaking unrelated
  engine-family regression tests.

## Non-goals

- This spec does not redesign every individual control panel. It defines the
  state contract they must obey.
- This spec does not decide graph-engine visual fidelity. If an engine produces
  bad geometry while state is deterministic, that belongs to spec 057 or a
  follow-up fidelity spec.
- This spec does not reopen spec 046 by moving behavior into
  `scripts/preview/*.js`.
- This spec does not make all engine switches visually dramatic. Equivalent
  geometry is allowed, but it must be proven and recorded as equivalent rather
  than confused with stale render state.

## Functional Requirements

- **FR-001**: Add a typed `EditorMutationTransaction` owner in
  `packages/layout-engine/src/preview-shell/`. Every mutating control enters
  through this owner or an owner-specific adapter that produces the same
  transaction shape.
- **FR-002**: Each transaction must declare:
  mutation kind, source control, active engine id, active document kind,
  capability gate, intended render intent delta, intended persistence delta,
  relayout policy (`none`, `local`, `engine`, `fresh-render`), dirty policy, and
  undo policy.
- **FR-003**: Capability gates run before state writes. If a mutation is not
  applicable, the result is an explicit inert transaction with reason code and
  no dirty/undo/render/save changes.
- **FR-004**: Engine tab switch is atomic. After a tab click, active tab,
  `PreviewRenderIntent`, `frameTreeJson.layoutEngine`, visible panel controls,
  layout-operator active bucket, and rendered `data-layout-engine` must agree.
- **FR-005**: Engine-specific option edits write only to the active engine's
  manifest-backed bucket. Switching engines must not carry inactive option keys
  into the next engine's layout request.
- **FR-006**: Autolayout/grid/alignment controls that are irrelevant for the
  active engine must be hidden and inert. If invoked programmatically or through
  stale DOM, they must return a rejected/inert transaction, not dirty state or a
  relayout error.
- **FR-007**: Appearance-only edits such as box variant changes must not trigger
  geometry relayout unless a measured geometry input actually changed.
- **FR-008**: Save payload assembly must be derived from the committed state
  vector. `persist -> reload` must reconstruct the same active engine,
  supported option bucket, frame overrides, and dirty-clean state.
- **FR-009**: Direct layout tests that consume mutable authored frame fixtures
  must normalize engine metadata or use dedicated fixtures. Test state must not
  depend on manual preview exploration leftovers.
- **FR-010**: Runtime diagnostics must make state drift visible in development:
  if active tab, render intent, rendered SVG engine, and frame-tree engine do
  not match after a mutation, the editor records a structured violation.
- **FR-011**: Browser probes and persistence regressions must not write back to
  authored `scripts/diagrams/frames/*.yaml` fixtures. They must use sanitized
  temporary copies or record/enforce source fixture hashes before running.
- **FR-012**: The implementation must produce a bypass inventory of every
  mutating editor path. Each path must be migrated to the transaction owner,
  proven inert/read-only, or explicitly deferred to a named follow-up spec
  before closeout.

## Success Criteria

- **SC-001**: A state-vector probe exercises real gestures on at least:
  `example-deployment-pipeline`, `juju-bootstrap-machines-process`,
  `mongo-octavia-ha`, `tiered-network-architecture`, and
  `support-engineering-flow`.
- **SC-002**: The probe captures before/after state vectors for engine tab
  switch, ELK option edit, irrelevant autolayout/grid control attempt,
  selection-driven inspector/control binding, appearance-only box variant edit,
  save, reload, undo, and redo.
- **SC-003**: For engine switches, either node bounds change or the evidence
  explicitly records equivalent geometry while proving `data-layout-engine`,
  active option bucket, and render intent changed consistently.
- **SC-004**: Inapplicable controls produce no dirty flag, no undo entry, no
  save payload delta, and no relayout status error.
- **SC-005**: `persist -> reload` round trips the committed active engine and
  supported option bucket, while stripping/rejecting unsupported foreign keys.
- **SC-006**: Browser probes and persistence regressions prove they run against
  sanitized temporary fixtures or fail fast when source fixture hashes do not
  match the expected baseline.
- **SC-007**: The bypass inventory has no unclassified mutating path: every
  path is migrated, proven inert/read-only, or deferred with a named spec id.
- **SC-008**: The full validation suite passes:
  `npm --prefix packages/layout-engine run build:browser`,
  `npm --prefix packages/layout-engine test`,
  `npm --prefix apps/preview test`,
  `node scripts/check-browser-bundle-fresh.mjs`, and
  `node scripts/check_no_new_python.mjs`.

## Closeout Gate

Do not mark this spec Closeout Ready unless all of the following are true:

1. The mutation transaction owner exists and every mutating path in the bypass
   inventory is migrated, proven inert/read-only, or deferred to a named spec.
2. Real browser evidence proves state vectors, not just callback wiring or SVG
   hashes.
3. At least one repo-owned `persist -> reload` regression proves saved state is
   deterministic.
4. No inapplicable control can dirty the document, create undo entries, or
   trigger relayout failure.
5. Browser probes and persistence tests use sanitized temporary fixtures or
   enforce source fixture hashes; no evidence path writes back to authored
   frame YAML.
6. Engine-tab no-visible-change cases are classified as either verified
   equivalent geometry or real bugs with follow-up tasks.
7. The branch is `feat/069-editor-mutation-state-determinism`; do not implement
   this spec on the 068 branch.

## Initial Risks

- Existing tests may assert callbacks rather than final state. They should be
  replaced or supplemented, not trusted as closeout proof.
- Some controls may currently be hidden in UI but still callable through stale
  DOM/event handlers.
- Engine option namespaces share `meta.elk`, so active-manifest filtering must
  be proven for every ELK-family engine, not just layered.
- Dirty frame YAML in the working tree can make state-vector evidence look like
  a product regression. Evidence scripts must record the source fixture hash or
  explicitly use sanitized fixtures.
