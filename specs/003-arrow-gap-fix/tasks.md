# Tasks: Arrow–arrowhead gap fix

**Input**: Design documents from `/specs/003-arrow-gap-fix/`

**Prerequisites**: plan.md (required), spec.md (required)

**Organization**: Single user story (bug fix) – all tasks are sequential within one phase after a minimal setup.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Understand the root cause and confirm the fix location

- [x] T001 Read root-cause analysis in specs/003-arrow-gap-fix/plan.md
- [x] T002 Confirm the gap originates in `scripts/preview/layout-bridge.js` `routeArrows()`, not in the Python engine

**Checkpoint**: Root cause identified – collinear waypoints cause segment/line-count mismatch in `patchArrowsSvg()`

---

## Phase 2: User Story 1 – Arrow shaft meets arrowhead seamlessly (Priority: P1) 🎯 MVP

**Goal**: Eliminate the visible gap between arrow shafts and arrowheads in all rendered diagrams

**Independent Test**: Render request-to-hardware-stack at 200% zoom. Verify zero gap between every arrow shaft and its arrowhead.

### Implementation for User Story 1

- [x] T003 [US1] Add `_simplifyPath()` function to `scripts/preview/layout-bridge.js` – collapses collinear waypoints so segment count matches SVG `<line>` count
- [x] T004 [US1] Call `_simplifyPath()` in `routeArrows()` after building the full path, before returning in `scripts/preview/layout-bridge.js`

### Verification for User Story 1

- [x] T005 [US1] Verify zero gap on vertical arrows (request-to-hardware-stack: 5 arrows)
- [x] T006 [P] [US1] Verify zero gap on horizontal arrows (example-deployment-pipeline: 5 arrows)
- [x] T007 [P] [US1] Verify zero gap on multi-segment arrows (complex-routing-usecase: 3-seg + 5-seg)
- [x] T008 [P] [US1] Verify zero gap on lifecycle arrows (maas-machine-lifecycle: 5 arrows)

**Checkpoint**: All arrow types render with zero gap – user story complete

---

## Phase 3: Polish & cross-cutting concerns

**Purpose**: Regression check and commit

- [x] T009 Run full v3 test suite (235 tests + 51 subtests) – `python -m pytest test_frame_loader.py test_autolayout.py test_layout_v3.py test_parity.py -q`
- [x] T010 Commit fix on `feat/003-arrow-gap-fix`

---

## Coverage notes

- **FR-002 (ARROW_CLEARANCE obstacle avoidance)**: The fix only changes waypoint simplification in the client-side bridge – it does not touch the Python A* router or `ARROW_CLEARANCE`. T009 (full test suite) includes 6 arrow-routing unit tests that verify obstacle clearance. Covered.
- **SC-002 (box-edge clearance maintained)**: The 4 verification diagrams (T005–T008) all show arrows routed with correct clearance from box edges. The fix collapses collinear points – it cannot change the start/end positions or obstacle inflation. Covered.
- **Edge case – short arrows**: The test suite includes adjacent-box configurations. The `_simplifyPath` function preserves start and end points regardless of path length, so short arrows are unaffected. Covered implicitly.
- **Edge case – obstacle routing**: T007 (complex-routing-usecase) tests multi-segment arrows that route around obstacles. The 5-segment arrow confirms obstacle avoidance + zero gap. Covered.
- **Constitution principle IV (render all diagrams)**: The test suite renders all frame YAMLs via parametric fixtures. Additionally, all 22 arrow-bearing diagrams were confirmed working during implementation via the preview server.

---

## Dependencies & execution order

### Phase dependencies

- **Setup (Phase 1)**: No dependencies – read-only analysis
- **User Story 1 (Phase 2)**: Depends on Setup (root cause confirmed)
- **Polish (Phase 3)**: Depends on User Story 1 completion

### Within User Story 1

- T003 before T004 (function must exist before it can be called)
- T004 before T005–T008 (fix must be applied before verification)
- T005–T008 are independent and can run in parallel [P]

### Parallel opportunities

```
# After T004 lands, all verification tasks can run in parallel:
T005: Verify vertical arrows (request-to-hardware-stack)
T006: Verify horizontal arrows (example-deployment-pipeline)
T007: Verify multi-segment arrows (complex-routing-usecase)
T008: Verify lifecycle arrows (maas-machine-lifecycle)
```

---

## Implementation strategy

### MVP (User Story 1 only – this is a single-story bug fix)

1. Complete Phase 1: Setup (root cause analysis)
2. Complete Phase 2: User Story 1 (implement `_simplifyPath()` + verify)
3. Complete Phase 3: Polish (regression test + commit)

All phases are sequential. The fix is a 2-task implementation (T003–T004) with 4 parallel verification tasks (T005–T008).

---

## Verification summary

| Diagram | Arrows | Segments | Gap before | Gap after |
|---------|--------|----------|------------|-----------|
| request-to-hardware-stack | 5 | 1 each | 1.2px | 0.0px |
| maas-machine-lifecycle | 5 | 1 each | 1.2px | 0.0px |
| example-deployment-pipeline | 5 | 1 each | 1.2px | 0.0px |
| complex-routing-usecase | 2 | 3 + 5 | 1.2px | 0.0px |

---

## Notes

- This is a bug fix (classification: **Bug**) – existing contract is violated, fix at the owning layer
- Fix location: `scripts/preview/layout-bridge.js` (client-side layout bridge)
- The Python engine (`diagram_render_svg.py`) was already correct – no server-side changes needed
- `_simplifyPath()` mirrors the existing Python `_simplify_path()` for consistency
