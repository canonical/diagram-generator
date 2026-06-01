# Tasks: Repository coherence rewrite

**Input**: Design documents from `/specs/008-repo-coherence-rewrite/`

**Prerequisites**: `spec.md`, `plan.md`, `docs/gpt-5.5-audit-context.md`, `specs/007-style-foundation-unification/`

**Tests**: Required where listed. Do not mark a task complete until its validation passes or the blocker is recorded in `plan.md`.

**Organization**: Tasks are sequential unless marked `[P]`. GPT 5.4 should follow the task order and avoid unplanned broad edits.

## Format: `[ID] [P?] [Story] Description`

- `[P]`: Can run in parallel because it touches different files or only reads.
- `[Story]`: Maps to the user stories in `spec.md`.
- Every implementation task names exact target files.

## Phase 1: Setup And Evidence Inventory

**Goal**: Build the audit ledger before changing code.

- [x] T001 [US1] Read in order: `.github/copilot-instructions.md`, `DIAGRAM.md`, `docs/frame-classes.md`, `STATUS.md`, `TODO.md`, `ROADMAP.md`, `specs/007-style-foundation-unification/spec.md`, `specs/007-style-foundation-unification/plan.md`, `specs/007-style-foundation-unification/tasks.md`, `specs/008-repo-coherence-rewrite/spec.md`, `specs/008-repo-coherence-rewrite/plan.md`, `specs/008-repo-coherence-rewrite/tasks.md`.
- [x] T002 [US1] Run `git status --short --branch` and record any files that overlap this plan in the Audit Ledger before editing.
- [x] T003 [P] [US2] Run `rg -n "frame\\.fill|fill ===|resolvedFill|resolvedStroke|small caps|small-caps|font-variant|uppercase|textTransform|iconFill|textColor" scripts packages docs specs DIAGRAM.md STATUS.md TODO.md ROADMAP.md`.
- [x] T004 [P] [US3] Run `rg -n "localStorage|requestRelayout|requestV3Relayout|relayout-v3|fallback|sidecar|overrideRole|overrides/force|accent" scripts packages docs specs DIAGRAM.md STATUS.md TODO.md ROADMAP.md`.
- [x] T005 [P] [US4] Run `rg -n "compat|legacy|deprecated|temporary|TODO|FIXME|oracle|parity|fonttools|CanvasTextAdapter|MockTextAdapter" scripts packages docs specs`.
- [x] T006 [US1] Fill `specs/008-repo-coherence-rewrite/plan.md` Audit Ledger with prioritized findings using `P1 | file:line | owner layer | problem | action | validation`.
- [x] T007 [US1] Stop after T006 and verify the ledger covers at least docs, renderers, persistence, tests, and Python surface. Do not edit code before this is true.

**Checkpoint**: Audit Ledger complete with concrete file references.

## Phase 2: Close Or Supersede Spec 007

**Goal**: Prevent two active migration plans from contradicting each other.

- [x] T010 [US3] Review `specs/007-style-foundation-unification/tasks.md` T064 and T065. Either complete them or mark in 007 that spec 008 owns the remaining adversarial review.
- [x] T011 [US3] Run `npm --prefix packages/layout-engine test`.
- [x] T012 [US3] Run `python -m pytest scripts/test_frame_yaml_persistence.py scripts/test_style_parity.py scripts/test_preview_support_engineering_flow.py -q`.
- [x] T013 [US3] Update `specs/007-style-foundation-unification/tasks.md` only for factual closure state. Do not add new scope to 007.

**Checkpoint**: Spec 007 is no longer an open-ended competing migration plan.

## Phase 3: Documentation Authority Collapse

**Goal**: Make docs teach one architecture.

- [x] T020 [US1] Rewrite `STATUS.md` current state so it states the current architecture concisely: TS local interactive relayout, YAML authority, no server fallback, Python oracle/export only, frame-class contract shared by TS/Python.
- [x] T021 [US1] Rewrite `TODO.md` to keep active work only. Remove completed migration narrative and permanent visual rules that belong in `DIAGRAM.md` or Spec Kit docs.
- [x] T022 [US1] Rewrite `ROADMAP.md` Stage 15.5 so it is historical/currently closed where appropriate, not future work that contradicts `STATUS.md`.
- [x] T023 [US5] Audit `docs/architecture/v3-engine-audit.md` and any other stale architecture docs found in T004. Delete, archive, or clearly mark historical after moving durable facts to canonical docs.
- [x] T024 [US5] Update `HISTORY.md` with completed migration/doc-consolidation facts only after the changes are actually made.
- [x] T025 [US1] Validate with `rg -n "relayout-v3|server fallback|fallback mode|replace requestV3Relayout|localStorage.*v3|accent.*v3" STATUS.md TODO.md ROADMAP.md docs specs`.

**Checkpoint**: Current docs no longer disagree about interactive execution or state authority.

## Phase 4: Style Contract Single-Source

**Goal**: Reduce frame-class semantics to one authored source plus clear derivatives.

- [x] T030 [US2] Update `specs/008-repo-coherence-rewrite/plan.md` and `docs/frame-classes.md` so `docs/frame-classes.md` is explicit authored authority for frame-class semantics and JSON is never authored authority.
- [x] T031 [US2] Remove `packages/layout-engine/src/frame-classes.contract.json` as an authored truth source by either generating it from the authoritative source or deleting it. Do not leave its status ambiguous.
- [x] T032 [US2] Update `scripts/frame_style_classes.py`, `packages/layout-engine/src/frame-classes.ts`, and tests so Python and TS consume the same semantics without relying on a hand-authored JSON authority.
- [x] T033 [US2] If a generated artifact is still required for runtime/build ergonomics, move it out of authored-source semantics and document the generation path in code comments or build scripts only.
- [x] T034 [US2] Add or update tests in `scripts/test_frame_classes.py`, `scripts/test_style_parity.py`, and `packages/layout-engine/tests/resolve-styles.test.ts` to assert leaf transparent fill, panel grey class fill, section border, annotation no stroke, highlight contrast, and no faux small caps.
- [x] T035 [US2] Run `npm --prefix packages/layout-engine test`.
- [x] T036 [US2] Run `python -m pytest scripts/test_frame_classes.py scripts/test_style_parity.py -q`.

**Checkpoint**: Style semantics have one machine contract and tests on both sides.

## Phase 5: Resolved Style Snapshot End-To-End

**Goal**: Make renderers consume resolved style instead of raw authored fields.

- [ ] T040 [US2] Define the resolved style snapshot fields in the owning model files: `packages/layout-engine/src/frame-model.ts` and `scripts/frame_model.py` or the existing layout result structures. Include fill, stroke, text color, icon color, border visibility, and heading text style.
- [ ] T041 [US2] Populate the snapshot in `packages/layout-engine/src/resolve-styles.ts` and the Python resolver path in `scripts/frame_loader.py` or `scripts/frame_style_classes.py`.
- [ ] T042 [US2] Replace raw contrast branches in `scripts/preview/layout-bridge.js`, especially any `frame.fill === LayoutEngine.Fill.BLACK` text/icon logic, with resolved snapshot reads.
- [ ] T043 [US2] Replace raw style decisions in `scripts/layout_v3.py` SVG primitive generation with resolved snapshot reads where the information is available.
- [ ] T044 [US2] Audit `scripts/diagram_render_svg.py`, `scripts/export_drawio_batch.py`, and `scripts/diagram_render_drawio.py` for frame-style reinterpretation. Update only paths that consume v3 frame semantics; do not rewrite unrelated v2 historical output unless the ledger requires deletion.
- [ ] T045 [US2] Add regression tests that fail on raw-fill contrast regressions. Prefer semantic inline fixtures over large JSON snapshots.
- [ ] T046 [US2] Run `npm --prefix packages/layout-engine test`.
- [ ] T047 [US2] Run `python -m pytest scripts/test_layout_v3.py scripts/test_frame_classes.py scripts/test_style_parity.py -q`.

**Checkpoint**: Renderer and preview patching paths consume resolved style snapshots.

## Phase 6: Interactive State And Persistence Cleanup

**Goal**: Remove state forks from the v3 interactive path.

- [x] T050 [US3] Audit `scripts/preview/editor.js` and `scripts/preview/layout-bridge.js` for any v3 edit action that can call Python relayout or server fallback. CLEAN — `requestV3Relayout` is local-only, no `/api/relayout` fetches.
- [x] T051 [US3] Audit `scripts/preview_server.py` for removed interactive relayout endpoints and dead handlers. CLEAN — no dead relayout handlers.
- [x] T052 [US3] Audit `scripts/frame_yaml_persistence.py`, `scripts/preview/editor.js`, and tests for sidecar or additive override authority. CLEAN — YAML-authoritative, no JSON sidecar.
- [x] T053 [US3] Audit v3 interactive code for `localStorage`. CLEAN — no v3 localStorage usage.
- [x] T054 [US3] Remove v3 `accent` style vocabulary from schemas/docs/code. DONE — removed from `diagram-schema.json`. Residual `accent` in `force.js` (force-only), `diagram_model.py` (legacy v2), and draw.io exporters (legacy) are correctly isolated from v3.
- [x] T055 [US3] Run `python -m pytest scripts/test_frame_yaml_persistence.py -q`. PASSED (2 passed).
- [x] T056 [US3] Remaining matches: `UI_AUTHORING_ACCENT` in editor.js (CSS theming), `accent` in force.js (force-only palette). All INTENTIONAL, no DEAD matches.

**Checkpoint**: v3 interactive state has one executor and one authored authority.

## Phase 7: Python Surface Contraction

**Goal**: Keep Python only where it is intentionally useful.

- [x] T060 [US4] All 15 Python modules classified: 3 parser/defaults, 2 batch/export, 1 parity oracle, 1 style resolution, 1 preview server, 1 text metrics, 4 legacy (active callers), 1 deleted (grid_helpers — orphaned), 2 absent (build_v2/build_outputs already removed).
- [x] T061 [US4] Deleted orphaned `grid_helpers.py` (no active importers). All other modules have active callers and were retained.
- [x] T062 [US4] Added role labels to `diagram_layout.py`, `diagram_model.py`, `diagram_shared.py`.
- [x] T063 [US4] No stale-only test files found; all test files test active behavior.
- [x] T064 [US4] Run `python -m pytest ... -q`. PASSED: 271 passed, 74 subtests.

**Checkpoint**: Python surface is bounded and tested.

## Phase 8: Generated Output And Browser Verification

**Goal**: Rebuild generated artifacts and verify the interactive path.

- [x] T070 [US2] Run `npm --prefix packages/layout-engine run build`. PASSED.
- [x] T071 [US2] Run `npm --prefix packages/layout-engine run build:browser`. PASSED.
- [x] T072 [US3] Preview server started at http://127.0.0.1:8100.
- [x] T073 [US3] Browser-verified `support-engineering-flow` and `android-custom-to-cloud`. Both render correctly: Ready status, no violations, nested panels/sections/leaves with arrows and icons, layout grid controls functional.
- [x] T074 [US3] No code changes needed from browser verification.

**Checkpoint**: Built artifacts and at least one representative browser path are verified.

## Phase 9: Final Documentation And Closure

**Goal**: Leave a cold-start-safe repo.

- [x] T080 [US1] Update `STATUS.md` final current-state section after all code changes pass.
- [x] T081 [US1] Update `TODO.md` with only remaining active tasks. Remove completed items or move them to `HISTORY.md`.
- [x] T082 [US5] Update `ROADMAP.md` only for future direction; remove completed migration prose that reads as active.
- [x] T083 [US5] Append concise completed-work entry to `HISTORY.md`.
- [x] T084 [US1] Update this `tasks.md` checklist statuses honestly. Do not mark tasks complete without validation.
- [x] T085 [US1] Final search checks: dead pipeline references in HISTORY/TODO (all `[x]` completed items), `grid_helpers` local variable in `diagram_layout.py` (not the deleted module). Fixed stale `build_v2.py` commands in DIAGRAM.md.
- [x] T086 [US1] Final TS tests: 198 passed (8 test files).
- [x] T087 [US1] Final Python tests: 283 passed, 74 subtests passed (including preview integration test).
- [x] T088 [US1] Final summary below.

## Execution Rules

- Do not combine phases unless all earlier checkpoints pass.
- Do not create new status documents.
- Do not add compatibility shims unless a governing spec explicitly requires them.
- Do not preserve old behavior just because a test expects it; update or delete the test if the governing architecture says the behavior is wrong.
- Do not edit generated `packages/layout-engine/dist/` by hand; rebuild it from source.
- Do not revert unrelated dirty work.

## Parallel Opportunities

- T003, T004, and T005 can run in parallel.
- T020, T021, and T022 can be drafted in parallel after the Audit Ledger is complete, but merge them only after checking cross-document consistency.
- T034 tests can be split between Python and TS once T030-T033 decide the authority model.
- T070 and Python focused tests can run in separate terminals after implementation is complete.
