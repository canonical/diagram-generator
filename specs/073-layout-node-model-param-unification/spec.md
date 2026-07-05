# Spec 073: Layout algorithm node model and parameter-pane unification

**Feature Branch**: `feat/073-layout-node-model-param-unification`
**Status**: Closeout Ready - adversarial review follow-up fixed 2026-07-05
**Created**: 2026-07-05
**Context**: chat decision 2026-07-05 (dedup-before-port; drop "family"; Houdini
SOP model; unify force into the shared param pane). Builds on spec 071
interpreter-node substrate. Subsumes the spec 046 T073 `PREVIEW_PANEL_REGISTRY`
residual. Sibling decision spec: 074 (which backends win).

## Problem

The current engine model conflates five orthogonal concepts into two overloaded
buckets (`grid` / `force`), and it has no clean first-class model for "a layout
algorithm and its parameters".

1. **Overloaded shell lanes.** `grid` is a catch-all frame-diagram editor shell;
   `force` is a standalone lane with its own routes/save flow. `elk-force` lives
   under `grid` because it is a frame-diagram engine — proof that `grid`/`force`
   are host/editor lanes, not algorithm groupings.
2. **No algorithm node model.** Engines are ~12 flat manifests. There is a
   `renderFamily` (visual) and a `layoutEngineKey` (backend), but no first-class
   "this is a layout algorithm with a typed parameter interface" node. Spec 071
   introduced interpreter nodes; this spec makes the layout algorithm the
   first-class node type those interpreter nodes represent.
3. **Force is a UX outlier.** ELK/Dagre/autolayout parameters were unified into
   the right-hand contextual aside (specs 048/051/066/067) — select an engine,
   see its parameters, like selecting a Houdini SOP shows its params. Force does
   not follow that workflow; it is a separate bespoke lane. The user wants force
   parameters to surface through the same shared param pane.
4. **Central panel list.** `PREVIEW_PANEL_REGISTRY` in
   `preview-shell/preview-ui-context.ts` is a hard-coded list gated by
   `isGridShell`/`isForceShell`. Adding a new lane/algorithm still edits this
   central list (the spec 046 T073 residual).

### Decision encoded by this spec: no "family" construct

The project has decided to **dedup to one implementation per algorithm** (see
074). If there is only ever one implementation of Sugiyama/layered, one force,
one tree, then a "family" (a grouping of multiple backends of the same
algorithm) would always have exactly one member and is therefore useless. So
this spec deliberately does **not** introduce an `algorithmFamily` field.
Instead it adopts the Houdini node model directly:

- A **layout algorithm** is a first-class **node type** (like a SOP) with a
  typed parameter interface. This is the interpreter node from spec 071.
- The Houdini "context" analog (SOP/DOP/COP) maps to **pipeline stage /
  document kind**, not to algorithm groupings.
- Grouping for the create/select menu, if wanted, is a lightweight **tag /
  category** (cosmetic, for menu organization) — never an architectural
  contract with shared behavior.

## Goals

- Establish the **layout algorithm node** as the first-class unit: one typed
  node type per algorithm, exposing a typed parameter interface, registered
  through the existing decentralized registry + spec 071 interpreter nodes.
- **No `algorithmFamily` field.** Optional menu tags only, cosmetic.
- **Unify parameter surfacing.** Every layout algorithm — ELK layered, ELK
  radial/tree/stress, autolayout (v3), and **force** — renders its parameters
  through one shared param-pane contract (`layout-params-controller.ts` /
  `sidebar-sections.ts`), the "select node → see its params" workflow.
- **Rename the shell lane `grid` → `frame`** (with a compatibility alias), and
  decouple the editor shell lane from the layout algorithm.
- **Make shell-lane/panel registration data-driven**, so adding a lane or
  algorithm contributes panels through registration instead of editing the
  central `PREVIEW_PANEL_REGISTRY` list. This closes the spec 046 T073 residual.

## Non-goals

- **Not choosing which backends survive.** Which implementation wins per
  algorithm (e.g. Dagre vs ELK layered, which force) is spec 074. This spec is
  the node/param/UX model, backend-agnostic.
- **Not deleting the `force-spec` input format.** `force-spec` is a genuinely
  distinct authoring model (`nodes:` + `links:` graph), and its input format
  stays. Unifying force *parameter surfacing* does not require changing the
  input schema. Converging the bespoke force *pipeline* (host/routes/
  persistence) onto shared seams is a deprioritised deferred item, not phase 1.
- No new layout algorithms.
- No new behavior-heavy `scripts/preview/*.js`; no widening `editor.js` /
  `layout-bridge.js`.

## Force nuance (must be respected)

`force-spec` documents are authored as an explicit node/link graph with their
own YAML shape, routes (`/api/force-spec/`), persistence
(`persistForceSpecToYaml`), and definitions dir — distinct from the frame tree.
The **input schema legitimately differs** (a graph is not a frame tree), the
same way a Sankey and a Sugiyama need different input. That difference is fine
and stays. Force should be **one of the engines / a diagram type, not a whole
workflow of its own.**

The technical debt is that force currently grew as a **bespoke parallel
pipeline** — its own host, routes, persistence stack, and UI — bolted onto the
editor, instead of reusing the shared pipeline seams. So:

- **In scope (phase 1):** force layout parameters surface through the same
  shared param-pane pattern as ELK/Dagre, so the force workflow matches
  "select the layout node → edit its params in the aside". `force-param-registry.ts`
  already exists and must feed the shared param controller rather than a bespoke
  force UI. This is the cheap, high-value unification.
- **Deprioritised (deferred, not decided now):** converging force's bespoke
  host / routes / persistence onto the shared pipeline seams so force is a
  first-class engine over its own input schema rather than a parallel workflow.
  This is real debt-reduction but is **not** required for phase 1; do it when we
  next build on force or when the parallel pipeline blocks new work. Keep the
  force **input format** — it is legitimately different; only the duplicated
  pipeline is the target.

## Functional requirements

- **FR-001**: A layout algorithm MUST be representable as one first-class node
  type with a typed parameter interface, registered through the decentralized
  registry and the spec 071 interpreter-node substrate. No central per-algorithm
  switch.
- **FR-002**: There MUST NOT be an `algorithmFamily` field or any construct that
  groups multiple backends of one algorithm; menu grouping, if present, MUST be
  a cosmetic tag with no behavioral contract.
- **FR-003**: All layout algorithms (autolayout/v3, ELK variants, force) MUST
  render their parameters through one shared param-pane contract
  (`layout-params-controller.ts` + `sidebar-sections.ts`). No algorithm may
  keep a bespoke parameter UI outside that contract.
- **FR-004**: Force parameters MUST surface through the shared param pane using
  `force-param-registry.ts` as the parameter source, matching the ELK/Dagre
  "select layout → edit params" workflow.
- **FR-005**: The editor shell lane currently named `grid` MUST be renamed to
  `frame` (e.g. `shellMode` / `isGridShell`), keeping `grid` only as a
  compatibility alias at the boundary. The shell lane MUST NOT be conflated with
  the layout algorithm.
- **FR-006**: Panel/lane registration MUST be data-driven: a new shell lane or
  algorithm contributes its panels through registration, not by editing the
  central `PREVIEW_PANEL_REGISTRY` list or adding `isXShell` predicates. This
  MUST close the spec 046 T073 residual and stay covered by the existing
  panel-registry test.
- **FR-007**: The `force-spec` document kind, routes, and persistence MUST keep
  working; unifying force parameter surfacing MUST NOT delete the doc kind
  unless the decision-gated fold is explicitly approved.
- **FR-008**: Work MUST stay TypeScript-first in the preview-shell / preview-
  engine owners and MUST NOT widen `editor.js` or `layout-bridge.js`.

## User stories

### US1: Every layout algorithm shows its params the same way

As an editor user, when I select any layout (autolayout, ELK layered, ELK
radial, force), I see that layout's parameters in the same right-hand aside, the
same way selecting a Houdini SOP shows its parameters.

**Acceptance**: force parameters render through the shared param pane; there is
no bespoke force parameter UI; the ELK/Dagre panes are unchanged.

### US2: Adding a lane/algorithm does not edit a central list

As a developer, I add a new shell lane or algorithm and contribute its panels
through registration, without editing `PREVIEW_PANEL_REGISTRY` or adding an
`isXShell` predicate.

**Acceptance**: a registration-only test proves a new lane's panels appear
without central-list edits; the 046 T073 residual is closed.

### US3: The model has no dead "family" abstraction

As a maintainer, I can confirm there is no `algorithmFamily` construct; layout
algorithms are node types, and any menu grouping is a cosmetic tag.

**Acceptance**: a guard/test asserts no algorithm-family field exists in the
manifest/type surface.

## Success criteria

- **SC-001**: A repo-owned test proves force parameters resolve and render
  through the shared param-pane contract (same controller as ELK/Dagre), sourced
  from `force-param-registry.ts`.
- **SC-002**: A repo-owned test proves a newly registered shell lane contributes
  panels without editing `PREVIEW_PANEL_REGISTRY` or adding `isXShell` gates
  (closes 046 T073).
- **SC-003**: The `grid` → `frame` lane rename lands with a compatibility alias
  and no behavior change; existing grid/frame tests pass under the new name.
- **SC-004**: A guard asserts no `algorithmFamily` field exists on the engine
  manifest/type surface.
- **SC-005**: `force-spec` document routes, load, save, and export still pass
  their existing contract tests unchanged.
- **SC-006**: `npm --prefix packages/layout-engine test`,
  `npm --prefix apps/preview test`, `node scripts/check_no_new_python.mjs`, and
  `node scripts/check-preview-shell-size-budgets.mjs` pass.

## Risks

- Renaming `grid` touches many call sites; keep a compat alias and do it as a
  mechanical rename with tests green at each step.
- Force param unification must not regress the standalone force document
  routes/persistence; FR-007 and SC-005 guard this.
- Making the panel registry data-driven is the 046 T073 decomposition; keep it
  scoped to registration mechanics, not a panel redesign.
- Resist re-introducing a "family" abstraction for menu grouping; a cosmetic tag
  is enough (FR-002).

## Status notes

- 2026-07-05: Implemented the `grid` -> `frame` shell rename with a boundary
  alias so persisted/runtime `grid` values still normalize to the frame lane.
- 2026-07-05: Replaced the central panel-gating list with registered lane
  contributions, closing the archived spec 046 T073 residual without reopening
  the old JS shell branching seam.
- 2026-07-05: Routed force through the shared layout-params pane contract while
  keeping the `force-spec` document kind, host routes, save path, and export
  coverage intact.
- 2026-07-05: Adversarial review follow-up fixed the two remaining force
  regressions: the shared param-pane controller now writes through the live
  force override owner, and `updateForceSimulationParams(...)` now applies
  render-scoped keys such as `curve_handle_ratio` alongside simulation params.
- 2026-07-05: Added repo-owned regressions for both the live force controller
  wiring (`apps/preview` contract test) and the mixed simulation/render force
  runtime patch path (`packages/layout-engine` unit test).
- 2026-07-05: Left force host/route/persistence convergence intentionally
  deferred. Spec 073 closes after the phase-1 param-pane unification; any move
  of `builtin-force-host`, `/api/force-spec/`, or `persistForceSpecToYaml` onto
  shared pipeline seams belongs in a dedicated follow-up spec rather than this
  package.
- 2026-07-05: Validation passed via `npm --prefix packages/layout-engine test`,
  `npm --prefix apps/preview test`, `node scripts/check_no_new_python.mjs`, and
  `node scripts/check-preview-shell-size-budgets.mjs`. The required
  `npm --prefix packages/layout-engine run build:browser` step also passed after
  the preview-engine export changes. Final rerun after the review follow-up was
  green at `packages/layout-engine` 981/981, `apps/preview` 161/161,
  `check_no_new_python` ok, and preview-shell size budgets ok.
