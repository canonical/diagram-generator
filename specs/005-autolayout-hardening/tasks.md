# Tasks: Autolayout hardening and contract cleanup

**Input**: Design documents from `/specs/005-autolayout-hardening/`

**Prerequisites**: spec.md, plan.md

## Phase 1: Setup and baseline

- [ ] T001 Capture baseline test run for focused layout suite
- [ ] T002 Inventory all semantic mutations currently performed during layout
- [ ] T003 Inventory all style-resolution branches in loader and renderer

## Phase 2: Semantic mutation removal (WS1)

- [ ] T010 Introduce isolated derived-layout state structure
- [ ] T011 Refactor col_span resolution to avoid mutating semantic width fields
- [ ] T012 Refactor FILL/HUG coercion bookkeeping to derived state only
- [ ] T013 Add idempotency regression test (run layout twice, compare semantic tree)
- [ ] T014 Add mutation-guard test for representative nested fixture

## Phase 3: Style ownership unification (WS2)

- [ ] T020 Define/confirm single style resolver entrypoint
- [ ] T021 Remove renderer-side default style branching that duplicates resolver
- [ ] T022 Add tests asserting renderer consumes resolved style values verbatim
- [ ] T023 Add regression fixture for explicit style overrides vs defaults

## Phase 4: Heading/body contract hardening (WS3)

- [ ] T030 Write propagation contract table in code comments/tests (wrap/fill_weight/justify/gap)
- [ ] T031 Align loader synthesis logic with contract table
- [ ] T032 Add tests for heading/body synthesis across vertical and horizontal parents
- [ ] T033 Add negative tests for unsupported/ambiguous propagation paths

## Phase 5: Padding parity (WS4)

- [ ] T040 Align measurement code to per-side padding fields
- [ ] T041 Remove obsolete measurement/render compensation logic where safe
- [ ] T042 Add tests for icon/no-icon and explicit zero padding cases
- [ ] T043 Add test comparing measured wrap width assumptions to rendered positions

## Phase 6: Validation and closeout (WS5)

- [ ] T050 Run focused test suite and capture results
- [ ] T051 Render frame corpus and verify no unplanned regressions
- [ ] T052 Browser-check high-risk diagrams: request-to-hardware-stack, aws-hld, example-stacked-blocks
- [ ] T053 Update TODO links/status for autolayout section after implementation lands

## Parallelization Notes

- WS2 and WS3 can proceed in parallel after WS1 interfaces are stable.
- Validation tasks are sequential and final.
