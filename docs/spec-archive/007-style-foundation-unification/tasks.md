# Tasks: Style foundation unification and migration completion

**Input**: Design documents from `/specs/007-style-foundation-unification/`

**Prerequisites**: spec.md, plan.md

## Phase 1: Baseline and failure reproduction

- [x] T001 Capture baseline repro for style dropdown no-op in v3 preview
- [x] T002 Record local-ready vs fallback behavior matrix for style, alignment, sizing edits (local-ready unavailable in this run; caveat recorded in baseline report)
- [x] T003 Inventory all remaining style-derivation branches in preview local renderer

## Phase 2: Style contract definition (WS1)

- [x] T010 Define canonical style semantic mapping (option -> semantic fields)
- [x] T011 Codify legacy alias compatibility (`accent` -> `parent`) and persistence behavior
- [x] T012 Add tests for mapping correctness across all style options (covered by `scripts/test_preview_support_engineering_flow.py`)

## Phase 3: Local renderer cleanup (WS2)

- [x] T020 Remove heuristic style branches in local v3 frame rendering path — ported `resolve_styles()` to TS (`resolve-styles.ts`), `_frameBoxRenderState()` now uses `resolvedFill`/`resolvedStroke`
- [x] T021 Ensure local renderer consumes contract-aligned style state — `resolveStyles()` called after layout in `performLocalRelayout()`
- [x] T022 Add regression tests asserting local renderer does not override resolved semantics — 15 tests in `resolve-styles.test.ts`

## Phase 4: Readiness + fallback hardening (WS3)

- [x] T030 Centralize readiness predicate and use it for all v3-managed gating
- [x] T031 Ensure relayout fallbacks execute for unready/local failure states
- [x] T032 Add browser regression test for style changes in fallback mode
- [x] T033 Add mode-transition test (ready -> fallback -> ready) with edit continuity checks
- [x] T034 Audit and remove all localStorage usage from the v3 interactive editing path

## Phase 5: Migration closure to one interactive path (WS4)

Migration closure gate checklist (2026-05-31):

- [x] v3 interactive relayout uses `performLocalRelayout()` only; no `ENGINE === "v3"` path round-trips through `requestRelayout()`
- [x] unready / local-failure states surface a visible `local-error` status instead of silently no-oping
- [x] focused TS + Playwright regressions pass after the single-path cutover
- [x] repo-state docs and spec artifacts are updated in the same change-set as the cutover

- [x] T040 Define migration closure gate checklist (parity, regressions, docs sync)
- [x] T041 Remove or hard-disable interactive server fallback path after closure gates pass
- [x] T042 Remove stale dual-path comments and contradictory behavior notes in preview code
- [x] T043 Update repo state docs (`STATUS.md`, `TODO.md`) to declare single interactive execution path
- [x] T044 Run adversarial review checkpoint #1 (post-WS2/WS3) for dual-path and shadow-state regressions

## Phase 6: Override schema consistency (WS5)

- [x] T050 Verify persistence updates canonical YAML fields in place (no additive override-entry schema)
- [x] T051 Add backward-compat load tests for legacy style payloads
- [x] T052 Add save/load roundtrip tests for style overrides in YAML across local execution and batch/export parity paths
- [x] T053 Add guard test that saved YAML contains no `overrideRole` or equivalent additive metadata keys

## Phase 7: Parity and validation (WS6)

- [x] T060 Add local-vs-server style parity fixture tests (`packages/layout-engine/tests/style-parity.test.ts`, `scripts/test_style_parity.py`, shared semantic fixtures in `packages/layout-engine/tests/fixtures/style-parity-fixtures.json`)
- [x] T061 Run focused Python layout suite and fix any regressions
- [x] T062 Run preview regression tests and browser-check representative diagrams
- [x] T063 Confirm final single-path interactive behavior in browser (no fallback dependency)
- [x] T064 Run adversarial review checkpoint #2 (post-WS4) on migration closure changes — superseded by the Phase 1 Audit Ledger and Phase 2 closure work in `specs/008-repo-coherence-rewrite/`
- [x] T065 Run adversarial review checkpoint #3 (final) before marking feature complete — superseded by the repo-wide coherence audit in `specs/008-repo-coherence-rewrite/`, which now owns final adversarial review before broad closure

## Parallelization Notes

- Phase 2 and Phase 4 can proceed in parallel after T001-T003 baseline is captured.
- Phase 5 closure tasks are blocking and must complete before final validation.
- Phase 6 depends on stable mapping from Phase 2.
- Phase 7 is final and sequential.
