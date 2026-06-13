# Tasks: heading + body layout region

**Input**: Design documents from `specs/002-heading-body-layout/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/heading-body-synthesis.md ✅, quickstart.md ✅

**Tests**: Included – spec.md defines acceptance scenarios and the constitution (Principle IV) requires running all diagrams after changes.

**Organization**: Tasks grouped by user story. US1 and US2 are both P1 but US2 depends on US1 (body zone starts where heading zone ends). US3 is P2 and can run after US1/US2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1, US2, US3 (maps to spec.md user stories)
- Exact file paths included

---

## Phase 1: Setup

**Purpose**: Branch creation and baseline verification

- [x] T001 Check out feature branch `feat/002-heading-body-layout` from the branch where feat/001-box-style-contract is merged
- [x] T002 Run full regression baseline: `cd scripts && python -m pytest test_frame_loader.py test_autolayout.py test_layout_v3.py test_parity.py -q` – all 31 diagrams must pass before any changes
- [x] T003 Record current heading rendering for the 8 affected diagrams (visual baseline via preview server at `http://127.0.0.1:8100/view/v3:<slug>`)

**Checkpoint**: Clean branch, green test suite, visual baseline captured.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: Core contract fix in `frame_loader.py` that all user stories depend on

**⚠️ CRITICAL**: US1, US2, US3 all depend on the `__body` synthesis fix landing first.

### Tests for foundational phase

- [x] T004 [P] Add test in `scripts/test_frame_loader.py`: verify `__body` inherits `wrap` from parent – given parent `wrap: true`, assert `__body.wrap is True`
- [x] T005 [P] Add test in `scripts/test_frame_loader.py`: verify `__body` inherits `fill_weight` from parent – given parent `fill_weight: 2`, assert `__body.fill_weight == 2`
- [x] T006 [P] Add test in `scripts/test_frame_loader.py`: verify `__body` inherits `justify` in vertical parent branch – given vertical parent with `justify: SPACE_BETWEEN`, assert `__body.justify == Justify.SPACE_BETWEEN`
- [x] T007 Run T004–T006 tests and confirm they FAIL (fields not yet copied)

### Implementation

- [x] T008 Fix `_parse_frame()` in `scripts/frame_loader.py`: add `wrap=frame.wrap` to `__body` Frame constructor in both horizontal and vertical branches
- [x] T009 Fix `_parse_frame()` in `scripts/frame_loader.py`: add `fill_weight=frame.fill_weight` to `__body` Frame constructor in both horizontal and vertical branches
- [x] T010 Fix `_parse_frame()` in `scripts/frame_loader.py`: add `justify=frame.justify` to `__body` Frame constructor in the vertical branch (already present in horizontal branch)
- [x] T011 Run T004–T006 tests and confirm they PASS
- [x] T012 Run full regression: `cd scripts && python -m pytest test_frame_loader.py test_autolayout.py test_layout_v3.py test_parity.py -q` – all 31 diagrams must still pass

**Checkpoint**: `__body` synthesis contract is correct. All 3 missing fields (`wrap`, `fill_weight`, `justify`) now copied. No regressions.

---

## Phase 3: User Story 1 – Heading always top-left with icon top-right (Priority: P1) 🎯 MVP

**Goal**: Containers with `heading:` and optional `icon:` render heading text at top-left and icon at top-right, inside padding.

**Independent test**: Create a container with `heading: "Test"`, `icon: Cloud.svg`, and two leaf children. Verify heading is at top-left, icon at top-right.

### Tests for User Story 1

- [x] T013 [P] [US1] Add test in `scripts/test_layout_v3.py`: heading placed at parent's (padding_left, padding_top) – `test_heading_at_top_left_with_icon_top_right`
- [x] T014 [P] [US1] Merged with T013 – icon position verified via min_height >= ICON_SIZE constraint
- [x] T015 [P] [US1] Add test heading without icon spans full width – `test_heading_no_icon_spans_full_width`
- [x] T016 [US1] Existing engine already handles heading position correctly – tests pass without changes

### Implementation for User Story 1

- [x] T017 [US1] Verified `__heading` uses `sizing_w=Sizing.FILL` and `min_height=ICON_SIZE` – already correct
- [x] T018 [US1] Verified renderer uses `prim.padding_left/padding_top` for text and `prim.padding_right` for icon – already correct
- [x] T019 [US1] Tests pass
- [x] T020 [US1] Browser-verified android-security-comparison – headings top-left ✓
- [x] T021 [US1] Browser-verified request-to-hardware-stack – all panel headings top-left with icons top-right ✓

**Checkpoint**: Heading position is correct in all headed containers. SC-002 satisfied.

---

## Phase 4: User Story 2 – Body zone starts below heading (Priority: P1)

**Goal**: Children of a headed container are laid out in a body region that starts below the heading zone. No heading/child overlap.

**Independent test**: Render `request-to-hardware-stack`. Verify no child box overlaps a panel heading.

### Tests for User Story 2

- [x] T022 [P] [US2] Add test body zone below heading – `test_body_zone_starts_below_heading`
- [x] T023 [P] [US2] Icon height covered by min_height=ICON_SIZE in heading child – tested via T013
- [x] T024 [US2] Existing engine already handles body zone correctly – tests pass without changes

### Implementation for User Story 2

- [x] T025 [US2] Verified `__heading` has `min_height=ICON_SIZE` and `_clamp_to_constraints()` respects it – already correct
- [x] T026 [US2] Verified body zone placement – `__body._placed_y >= heading_bottom + gap` – already correct
- [x] T027 [US2] Tests pass
- [x] T028 [US2] Full regression: 97 passed, 51 subtests passed
- [x] T029 [US2] Browser-verified request-to-hardware-stack – no heading/child overlap ✓
- [x] T030 [US2] Browser-verified android-container-vs-vm – all headings with children below ✓

**Checkpoint**: Body zone correctly positioned below heading zone. SC-001 and SC-003 satisfied.

---

## Phase 5: User Story 3 – Synthetic __body copies all layout fields (Priority: P2)

**Goal**: Verify the foundational fix (Phase 2) works end-to-end with actual diagrams that use `wrap`, `fill_weight`, or non-default `justify`.

**Independent test**: Create a container with `wrap: true`, `sizing_w: fill`, `fill_weight: 2`, and `heading:`. Verify `__body` inherits all three fields and children lay out correctly.

### Tests for User Story 3

- [x] T031 [P] [US3] Covered by `test_body_inherits_wrap_from_parent` in test_frame_loader.py – field now copied
- [x] T032 [P] [US3] Covered by `test_body_inherits_fill_weight_from_parent` in test_frame_loader.py – field now copied
- [x] T033 [US3] Tests pass after Phase 2 fix

### Implementation for User Story 3

- [x] T034 [US3] No additional fix needed – Phase 2 fix resolved all field inheritance
- [x] T035 [US3] Full regression: 97 passed, 51 subtests passed

**Checkpoint**: Field inheritance is verified end-to-end. All layout-affecting fields flow through synthesis correctly.

---

## Phase 6: Edge cases

**Purpose**: Handle boundary conditions from spec.md edge-case list

- [x] T036 [P] Add test heading with zero children – `test_heading_with_zero_children` ✓
- [x] T037 [P] Add test no heading children at top – `test_no_heading_children_start_at_top` ✓
- [x] T038 [P] Add test heading with horizontal body – `test_heading_with_horizontal_body` ✓
- [x] T039 All 6 edge-case/position tests pass
- [x] T040 No fixes needed – existing logic handles all edge cases

**Checkpoint**: All edge cases verified.

---

## Phase 7: Polish and full regression

**Purpose**: Final verification across all 31 diagrams and the 8 directly affected ones

- [x] T041 Full test suite: 97 passed, 51 subtests passed, 0 failures
- [x] T042 [P] Browser-verified key heading diagrams:
  - `android-security-comparison` ✓
  - `request-to-hardware-stack` ✓
  - `android-container-vs-vm` ✓
- [x] T043 [P] All 31 diagrams render via engine with no regressions (parity test suite)
- [x] T044 Quickstart validation complete
- [x] T045 Update `HISTORY.md` with completed feature summary
- [x] T046 Update `STATUS.md` if heading/body layout is no longer a known issue

**Checkpoint**: Feature complete, all regressions checked, docs updated.

---

## Dependencies and execution order

### Phase dependencies

```
Phase 1 (Setup) ──► Phase 2 (Foundational: __body fix)
                         │
                         ├──► Phase 3 (US1: heading position) ──► Phase 4 (US2: body zone)
                         │
                         └──► Phase 5 (US3: field inheritance e2e)
                                    │
Phase 6 (Edge cases) ◄─────────────┘
         │
         ▼
Phase 7 (Polish & full regression)
```

### Key constraints

- **Phase 2 blocks everything**: The `__body` field-copy fix is the prerequisite for all user stories
- **US1 before US2**: US2 (body zone below heading) validates placement that depends on US1 (heading position) being correct
- **US3 can parallel US1/US2**: US3 verifies the Phase 2 fix end-to-end and is independent of heading/body position work
- **Edge cases after US1+US2+US3**: edge-case tests exercise the full synthesis and layout pipeline

### Within each user story

1. Write tests → confirm they FAIL
2. Implement fix at the owning layer
3. Confirm tests PASS
4. Run full regression
5. Browser-verify affected diagrams

### Parallel opportunities

- T004, T005, T006 (foundational tests) – different test functions, same file
- T013, T014, T015 (US1 tests) – different test functions, same file
- T022, T023 (US2 tests) – different test functions, same file
- T031, T032 (US3 tests) – different test functions, same file
- T036, T037, T038 (edge-case tests) – different test functions, same file
- T042, T043 (final visual + render verification) – independent checks

---

## Parallel example: User Story 1

```
                T013 ──┐
                T014 ──┤ (parallel: different test functions)
                T015 ──┘
                   │
                  T016 (run tests, confirm FAIL)
                   │
              ┌── T017 (verify __heading)
              └── T018 (verify renderer – read-only)
                   │
                  T019 (run tests, confirm PASS)
                   │
              ┌── T020 (browser-verify android-security-comparison)
              └── T021 (browser-verify request-to-hardware-stack)
```

---

## Implementation strategy

**MVP scope**: Phase 1 + Phase 2 + Phase 3 (US1). This gives you the most visible fix (headings top-left) with the foundational field-copy bug resolved. The remaining phases build on top.

**Incremental delivery**:
1. Phase 2 alone is a safe, testable unit – 3 field copies, 3 new tests, full regression
2. Phase 3 (US1) adds heading position verification – mostly confirming existing behaviour
3. Phase 4 (US2) adds body zone placement verification – the key overlap fix
4. Phase 5 (US3) adds end-to-end field inheritance proof
5. Phase 6–7 are polish and final verification
