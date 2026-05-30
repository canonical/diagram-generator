# Tasks: Arrow routing redesign with explicit ports and obstacle model

**Input**: Design documents from `/specs/006-arrow-routing-redesign/`

**Prerequisites**: spec.md, plan.md

## Phase 1: Baseline and fixture prep

- [ ] T001 Capture baseline behavior on known routing-problem diagrams
- [ ] T002 Add/refresh routing fixtures for nested, parallel, and obstacle-heavy cases
- [ ] T003 Document current side-inference and obstacle rules as baseline notes

## Phase 2: Port model + nested selector syntax (TODO phase 1)

- [ ] T010 Extend endpoint model to support side-qualified references
- [ ] T011 Implement nested selector parsing with `/` path support
- [ ] T012 Add parser tests for valid selectors
- [ ] T013 Add parser tests for invalid selectors and error clarity

## Phase 3: Multi-factor side inference (TODO phase 2)

- [ ] T020 Define weighted side-scoring model and deterministic tie-break
- [ ] T021 Implement side scorer in routing path
- [ ] T022 Add tests for previous unstable side-selection cases

## Phase 4: Per-arrow obstacles with hierarchy rules (TODO phase 3)

- [ ] T030 Implement per-arrow obstacle computation
- [ ] T031 Add ancestor/descendant exclusion logic for nested routing
- [ ] T032 Add tests for nested arrows and shared-ancestor corridors

## Phase 5: Channel/wedge and bend penalties (TODO phase 4)

- [ ] T040 Introduce channel midpoint preferences
- [ ] T041 Generalize wedge handling beyond current special-case behavior
- [ ] T042 Apply direction-aware bend penalties
- [ ] T043 Add route-shape regression tests

## Phase 6: Layout-owned geometry emission (TODO phase 5)

- [ ] T050 Precompute final arrow geometry in layout pass
- [ ] T051 Remove remaining renderer route-decision branches
- [ ] T052 Add contract tests ensuring renderer serializes only provided geometry

## Phase 7: Stretch - crossing minimization (TODO phase 6)

- [ ] T060 Prototype crossing-cost heuristic
- [ ] T061 Evaluate on representative diagrams and decide keep/drop

## Phase 8: Validation and closeout

- [ ] T070 Run focused test suite and new routing fixtures
- [ ] T071 Browser-check representative diagrams for route quality
- [ ] T072 Update TODO arrow-routing section status and phase completion notes

## Parallelization Notes

- Parser work (T010-T013) can proceed in parallel with baseline fixture curation after T001.
- Geometry ownership cleanup (T050-T052) depends on phases 2-5 completion.
