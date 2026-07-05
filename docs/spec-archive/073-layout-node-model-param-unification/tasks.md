# Tasks: Spec 073 Layout algorithm node model and parameter-pane unification

**Input**: `specs/073-layout-node-model-param-unification/spec.md`
**Plan**: `specs/073-layout-node-model-param-unification/plan.md`
**Branch**: `feat/073-layout-node-model-param-unification`

## Phase 1: Ground the substrate

- [x] T001 Read the spec 071 interpreter-node registry entry point and confirm
      how an algorithm registers as a node (do not fork it).
- [x] T002 Read the shared param pane owners
      `packages/layout-engine/src/preview-engine/layout-params-controller.ts`,
      `layout-params-controls.ts`, `sidebar-sections.ts`, and how ELK/Dagre feed
      them today.
- [x] T003 Read `force-param-registry.ts` and the standalone force lane
      (`apps/preview/src/preview-host/builtin-force-host.ts`,
      `force-document-actions.ts`, `persistence/force-spec.ts`) to map what must
      keep working.
- [x] T004 Read `preview-shell/preview-ui-context.ts` (`shellMode`,
      `isGridShell`, `isForceShell`, `PREVIEW_PANEL_REGISTRY`) and its guard test
      `packages/layout-engine/tests/preview-ui-context.test.ts`.

## Phase 2: Rename shell lane grid -> frame

- [x] T010 Rename the `grid` shell-lane vocabulary to `frame`
      (`shellMode`, `isGridShell` -> `isFrameShell`, related ids) with a
      compatibility alias at the boundary; make minimal, mechanical edits.
- [x] T011 Keep `grid` as a boundary alias so existing config/persisted values
      still resolve; add a test asserting both names resolve to the frame lane.
- [x] T012 Run the layout-engine + apps/preview suites; keep them green under the
      new name before proceeding.

## Phase 3: Panel registry -> contribution-based (closes 046 T073)

- [x] T020 Replace the central `PREVIEW_PANEL_REGISTRY` + `isXShell` gating with
      per-lane / per-algorithm panel contributions registered through the
      existing registration mechanism.
- [x] T021 Prove a newly registered shell lane contributes its panels without
      editing the central list or adding an `isXShell` predicate; extend
      `preview-ui-context.test.ts` to lock this.
- [x] T022 Update the spec 046 T073 note to record that this residual is closed
      here (no reopening of 046).

## Phase 4: Force through the shared param pane

- [x] T030 Route `force-param-registry.ts` into `layout-params-controller.ts`
      so force parameters render in the shared aside using the same contract as
      ELK/Dagre.
- [x] T031 Remove/'demote to wrapper' any bespoke force parameter UI that
      bypasses the shared param-pane contract.
- [x] T032 Confirm the standalone `force-spec` routes, load, save, and export
      still pass their existing contract tests unchanged (no doc-kind deletion).

## Phase 5: Lock the no-family decision

- [x] T040 Add a guard/test asserting no `algorithmFamily` field exists on the
      engine manifest/type surface; document that menu grouping, if any, is a
      cosmetic tag only.

## Phase 6: Tests and verification

- [x] T050 Add/extend a layout-engine unit test proving force params resolve
      through the shared controller.
- [x] T051 Add/extend the panel-registry test for registration-only lane panels.
- [x] T052 Add the no-`algorithmFamily` guard test.
- [x] T053 Run `npm --prefix packages/layout-engine test`.
- [x] T054 Run `npm --prefix apps/preview test`.
- [x] T055 Run `node scripts/check_no_new_python.mjs`.
- [x] T056 Run `node scripts/check-preview-shell-size-budgets.mjs`.
- [x] T057 Use no-screenshot browser DOM probes only if unit/contract tests miss
      an integration behavior; do not capture screenshots unless asked.

## Phase 6b: Adversarial review follow-up

- [x] T058 Fix the shared force param-pane write path so controller
      `setLayoutOverrides` / `requestLayoutRelayout` both route through the live
      force override owner instead of no-op callbacks.
- [x] T059 Extend the force runtime patch path so one update call can persist
      both simulation-scoped params and render-scoped params such as
      `curve_handle_ratio`.
- [x] T061 Add regressions covering the live force controller wiring and the
      mixed simulation/render force-param patch path.
- [x] T062 Rerun `npm --prefix packages/layout-engine run build:browser`,
      `npm --prefix packages/layout-engine test`, `npm --prefix apps/preview test`,
      `node scripts/check_no_new_python.mjs`, and
      `node scripts/check-preview-shell-size-budgets.mjs`.

## Phase 6c: Second-pass review follow-up

- [x] T063 Make the shared `layout-params-section` mode-neutral in
      `viewer-unified.html` so the real force viewer can surface the shared
      layout-params pane instead of letting `.dg-grid-only` CSS hide it.
- [x] T064 Remove the central `PANEL_ELEMENT_IDS` runtime map by resolving panel
      DOM bindings from each registry entry's typed `owner`, and add a
      regression that proves synthetic panel ids no longer need central runtime
      plumbing.
- [x] T065 **DEFERRED (explicit residual):** full host-template section
      provisioning is still not registration-only. `viewer-unified.html` still
      owns the actual section placeholders / DOM shells for real panels, so do
      not claim spec 073 fully closes that deeper template-registration seam
      during this review phase.

## Phase 6d: Third-pass review follow-up

- [x] T066 Move the preview host `sectionVisibilityPlaceholders` table into the
      typed preview panel registry so the builtin frame + force host viewers no
      longer duplicate the same section/placeholder mapping.
- [x] T067 Add a regression proving the typed preview panel registry remains the
      single source of truth for builtin template-section visibility
      placeholders.

## Phase 6e: Review reconciliation

- [x] T068 Reconcile the spec/inbox/catalog status after the third-pass review
      so spec 073 is not left falsely active once the actionable findings are
      fixed and only explicit follow-up deferrals remain.

## Decision gate / deferred

- [x] T060 **DEPRIORITISED (deferred debt-reduction):** converge force's bespoke
      pipeline (its own host, `/api/force-spec/` routes, and `persistForceSpecToYaml`
      persistence) onto the shared pipeline seams so force is a first-class engine
      over its own input schema rather than a parallel workflow. Keep the force
      **input format** (the `nodes:`+`links:` schema legitimately differs). This
      remains intentionally deferred out of phase 1: spec 073 closes without
      force-pipeline convergence, and any future convergence should land as a
      dedicated follow-up spec when force work resumes or the parallel pipeline
      blocks new product work.
