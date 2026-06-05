# Tasks: Autolayout hardening and contract cleanup

**Input**: Design documents from `/specs/005-autolayout-hardening/`

**Prerequisites**: spec.md, plan.md

**Engine rule**: All changes target TypeScript `packages/layout-engine/src/layout.ts` first. Python `scripts/layout_v3.py` receives equivalent changes only for parity verification. Do not start in Python.

## Phase 1: Setup and baseline

- [x] T001 Capture baseline test run for focused layout suite
- [x] T002 Inventory all semantic mutations currently performed during layout
- [x] T003 Inventory all style-resolution branches in loader and renderer

## Phase 2: Semantic mutation removal (WS1)

- [x] T010 Introduce isolated derived-layout state structure
- [x] T011 Refactor col_span resolution to avoid mutating semantic width fields
- [x] T012 Refactor FILL/HUG coercion bookkeeping to derived state only
- [x] T013 Add idempotency regression test (run layout twice, compare semantic tree)
- [x] T014 Add mutation-guard test for representative nested fixture

Note: The original Phase 1 + WS1 setup rows were left unchecked during delivery, but the implemented WS1 code and the final WS5 closeout prove the baseline/inventory/derived-state work landed. They are now marked complete to match the shipped feature state recorded in `HISTORY.md`.

## Phase 3: Style ownership unification (WS2)

- [x] T020 Define/confirm single style resolver entrypoint
- [x] T021 Remove renderer-side default style branching that duplicates resolver
- [x] T022 Add tests asserting renderer consumes resolved style values verbatim
- [x] T023 Add regression fixture for explicit style overrides vs defaults

Note: WS2 closed under spec 008 Phase 5 resolved-style snapshot work. Keep future deltas there unless spec 005 is explicitly reopened.

## Phase 4: Heading/body contract hardening (WS3)

- [x] T030 Write propagation contract table in code comments/tests (wrap/fill_weight/justify/gap)
- [x] T031 Align loader synthesis logic with contract table (TS + Python `frame_loader.py`)
- [x] T032 Add tests for heading/body synthesis across vertical and horizontal parents
- [x] T033 Add negative tests for unsupported/ambiguous propagation paths

## Phase 5: Padding parity (WS4)

- [x] T040 Align measurement code to per-side padding fields
- [x] T041 Remove obsolete measurement/render compensation logic where safe
- [x] T042 Add tests for icon/no-icon and explicit zero padding cases
- [x] T043 Add test comparing measured wrap width assumptions to rendered positions

## Phase 6: Validation and closeout (WS5)

- [x] T050 Run focused test suite and capture results
- [x] T051 Render frame corpus and verify no unplanned regressions
- [x] T052 Browser-check high-risk diagrams: request-to-hardware-stack, test-deep-nesting, support-engineering-flow
- [x] T053 Update TODO links/status for autolayout section after implementation lands

Validation capture:

- `npm --prefix packages/layout-engine test` → 246 passed.
- Retained 11-slug corpus export sweep via `export-frame-svg.mjs` → all passed.
- Browser spot-checks: all three high-risk diagrams rendered with zero errors. `support-engineering-flow` had no violations; `test-deep-nesting` surfaced 10 warnings; `request-to-hardware-stack` surfaced 34 `grid-align` warnings, consistent with its intentional `col_gap: 16` exception.

## Parallelization Notes

- WS2 and WS3 can proceed in parallel after WS1 interfaces are stable.
- Validation tasks are sequential and final.
