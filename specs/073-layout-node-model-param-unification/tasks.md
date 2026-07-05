# Tasks: Spec 073 Layout algorithm node model and parameter-pane unification

**Input**: `specs/073-layout-node-model-param-unification/spec.md`
**Plan**: `specs/073-layout-node-model-param-unification/plan.md`
**Branch**: `feat/073-layout-node-model-param-unification`

## Phase 1: Ground the substrate

- [ ] T001 Read the spec 071 interpreter-node registry entry point and confirm
      how an algorithm registers as a node (do not fork it).
- [ ] T002 Read the shared param pane owners
      `packages/layout-engine/src/preview-engine/layout-params-controller.ts`,
      `layout-params-controls.ts`, `sidebar-sections.ts`, and how ELK/Dagre feed
      them today.
- [ ] T003 Read `force-param-registry.ts` and the standalone force lane
      (`apps/preview/src/preview-host/builtin-force-host.ts`,
      `force-document-actions.ts`, `persistence/force-spec.ts`) to map what must
      keep working.
- [ ] T004 Read `preview-shell/preview-ui-context.ts` (`shellMode`,
      `isGridShell`, `isForceShell`, `PREVIEW_PANEL_REGISTRY`) and its guard test
      `packages/layout-engine/tests/preview-ui-context.test.ts`.

## Phase 2: Rename shell lane grid -> frame

- [ ] T010 Rename the `grid` shell-lane vocabulary to `frame`
      (`shellMode`, `isGridShell` -> `isFrameShell`, related ids) with a
      compatibility alias at the boundary; make minimal, mechanical edits.
- [ ] T011 Keep `grid` as a boundary alias so existing config/persisted values
      still resolve; add a test asserting both names resolve to the frame lane.
- [ ] T012 Run the layout-engine + apps/preview suites; keep them green under the
      new name before proceeding.

## Phase 3: Panel registry -> contribution-based (closes 046 T073)

- [ ] T020 Replace the central `PREVIEW_PANEL_REGISTRY` + `isXShell` gating with
      per-lane / per-algorithm panel contributions registered through the
      existing registration mechanism.
- [ ] T021 Prove a newly registered shell lane contributes its panels without
      editing the central list or adding an `isXShell` predicate; extend
      `preview-ui-context.test.ts` to lock this.
- [ ] T022 Update the spec 046 T073 note to record that this residual is closed
      here (no reopening of 046).

## Phase 4: Force through the shared param pane

- [ ] T030 Route `force-param-registry.ts` into `layout-params-controller.ts`
      so force parameters render in the shared aside using the same contract as
      ELK/Dagre.
- [ ] T031 Remove/'demote to wrapper' any bespoke force parameter UI that
      bypasses the shared param-pane contract.
- [ ] T032 Confirm the standalone `force-spec` routes, load, save, and export
      still pass their existing contract tests unchanged (no doc-kind deletion).

## Phase 5: Lock the no-family decision

- [ ] T040 Add a guard/test asserting no `algorithmFamily` field exists on the
      engine manifest/type surface; document that menu grouping, if any, is a
      cosmetic tag only.

## Phase 6: Tests and verification

- [ ] T050 Add/extend a layout-engine unit test proving force params resolve
      through the shared controller.
- [ ] T051 Add/extend the panel-registry test for registration-only lane panels.
- [ ] T052 Add the no-`algorithmFamily` guard test.
- [ ] T053 Run `npm --prefix packages/layout-engine test`.
- [ ] T054 Run `npm --prefix apps/preview test`.
- [ ] T055 Run `node scripts/check_no_new_python.mjs`.
- [ ] T056 Run `node scripts/check-preview-shell-size-budgets.mjs`.
- [ ] T057 Use no-screenshot browser DOM probes only if unit/contract tests miss
      an integration behavior; do not capture screenshots unless asked.

## Decision gate / deferred

- [ ] T060 **DEPRIORITISED (deferred debt-reduction):** converge force's bespoke
      pipeline (its own host, `/api/force-spec/` routes, and `persistForceSpecToYaml`
      persistence) onto the shared pipeline seams so force is a first-class engine
      over its own input schema rather than a parallel workflow. Keep the force
      **input format** (the `nodes:`+`links:` schema legitimately differs). Do
      this only when we next build on force or when the parallel pipeline blocks
      new work; file as a follow-up spec, do not bundle into phase 1.
