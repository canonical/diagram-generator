---

description: "Task list for diagram typography token cleanup"
---

# Tasks: Diagram Typography Token Cleanup

**Input**: Design documents from `/specs/039-diagram-typography-token-cleanup/`

**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: Tests are included to verify dead constant removal and frontmatter correctness.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Documentation**: `DIAGRAM.md` at repository root
- **Python scripts**: `scripts/` at repository root
- **TypeScript**: `packages/layout-engine/src/`

---

## Phase 1: Setup (Verification Baseline)

**Purpose**: Establish baseline before making changes

- [ ] T001 Run TS baseline validation: `npm --prefix packages/layout-engine test`
- [ ] T002 [P] Run TypeScript compilation check: `cd packages/layout-engine && npx tsc --noEmit`
- [ ] T003 [P] Grep for dead constants to confirm they exist before removal: `grep -r "TITLE_SIZE\|HEADING_SIZE\|TITLE_LINE_STEP\|HEADING_LINE_STEP\|DIAGRAM_TIER_BODY" scripts/ packages/`

**Checkpoint**: Baseline established. TS validation passes. Dead constants confirmed present.

---

## Phase 2: User Story 1 - Clean Typography Token Contract (Priority: P1) 🎯 MVP

**Goal**: DIAGRAM.md frontmatter contains exactly 2 typography tokens that match the code.

**Independent Test**: Count typography tokens in DIAGRAM.md frontmatter — should be exactly 2.

### Implementation for User Story 1

- [ ] T004 [US1] Edit `DIAGRAM.md` frontmatter `typography:` section. Remove all tokens except `diagram-body` and `diagram-heading-1`.
- [ ] T005 [US1] Update `diagram-body` token to: `fontFamily: Ubuntu Sans`, `fontSize: 18px`, `fontWeight: 400`, `lineHeight: 24px`. Add `notes:` field explaining it's the default for all body text.
- [ ] T006 [US1] Update `diagram-heading-1` token to: `fontFamily: Ubuntu Sans`, `fontSize: 18px`, `fontWeight: 700`, `lineHeight: 24px`. Add `notes:` field explaining it's for section/panel headings.
- [ ] T007 [US1] Verify frontmatter YAML is valid: `python -c "import yaml; yaml.safe_load(open('DIAGRAM.md').read().split('---')[1])"`

**Checkpoint**: DIAGRAM.md typography section contains exactly 2 tokens. YAML is valid.

---

## Phase 3: User Story 2 - Remove Dead Python Constants (Priority: P2)

**Goal**: `scripts/diagram_shared.py` contains only constants that are actually imported and used.

**Independent Test**: Grep for removed constants returns zero hits. All tests pass.

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T008 [P] [US2] Create test in `scripts/test_dead_constants.py` that asserts `TITLE_SIZE`, `HEADING_SIZE`, `TITLE_LINE_STEP`, `HEADING_LINE_STEP`, `DIAGRAM_TIER_BODY_SIZE`, `DIAGRAM_TIER_BODY_LINE_STEP` are NOT importable from `diagram_shared`.

### Implementation for User Story 2

- [ ] T009 [US2] Edit `scripts/diagram_shared.py`. Remove line: `HEADING_SIZE = "18"` (around line 91).
- [ ] T010 [US2] Remove line: `TITLE_SIZE = "24"` (around line 92).
- [ ] T011 [US2] Remove line: `HEADING_LINE_STEP = 24` (around line 98).
- [ ] T012 [US2] Remove line: `TITLE_LINE_STEP = 32` (around line 99).
- [ ] T013 [US2] Remove line: `DIAGRAM_TIER_BODY_SIZE = BODY_SIZE` (around line 95).
- [ ] T014 [US2] Remove line: `DIAGRAM_TIER_BODY_LINE_STEP = BODY_LINE_STEP` (around line 100).
- [ ] T015 [US2] Run grep to verify removal: `grep -r "TITLE_SIZE\|HEADING_SIZE\|TITLE_LINE_STEP\|HEADING_LINE_STEP\|DIAGRAM_TIER_BODY" scripts/ packages/` — should return zero results.
- [ ] T016 [US2] Run repo ratchet + TS validation: `node scripts/check_no_new_python.mjs` and `npm --prefix packages/layout-engine test`

**Checkpoint**: Dead constants removed. Zero grep hits. TS validation and no-new-Python ratchet pass.

---

## Phase 4: User Story 3 - Clean Spacing and Grid Tokens (Priority: P2)

**Goal**: DIAGRAM.md spacing and grid sections contain only tokens with corresponding code constants.

**Independent Test**: Count spacing tokens (should be 6) and grid tokens (should be 5).

### Implementation for User Story 3

- [ ] T017 [P] [US3] Edit `DIAGRAM.md` frontmatter `spacing:` section. Remove: `unit`, `rhythm-step`, `panel-padding`, `icon-inset`, `heading-line-step`, `title-line-step`, `default-box-growth-step`.
- [ ] T018 [P] [US3] Edit `DIAGRAM.md` frontmatter `grid:` section. Remove: `column-counts`, `span-rule`, `application-gutter`, `application-outer-margin`.
- [ ] T019 [US3] Verify spacing section has exactly 6 tokens: `baseline-unit`, `inset`, `compact-gap`, `grid-gutter`, `outer-margin`, `body-line-step`.
- [ ] T020 [US3] Verify grid section has exactly 5 tokens: `baseline-unit`, `default-box-width`, `default-box-min-height`, `icon-size`, `frame-stroke-width`.

**Checkpoint**: Spacing and grid sections cleaned. Token counts match spec.

---

## Phase 5: User Story 4 - Retire v2-only Prose and Reorganize Components (Priority: P3)

**Goal**: DIAGRAM.md prose does not contain v2-specific guidance. Unused components are marked reserved.

**Independent Test**: Search for v2 terms returns zero hits. Component section has "Reserved" subsection.

### Implementation for User Story 4

- [ ] T021 [P] [US4] Edit `DIAGRAM.md` prose. Remove or replace "Sizing constraints" section (lines ~336-348) that describes `canvas_width`, `canvas_height`, `uniform_rows`, `col_width`.
- [ ] T022 [P] [US4] Remove "Row equalization for mixed-type rows" section (lines ~821-823).
- [ ] T023 [P] [US4] Remove "Panel children type ordering" section (lines ~825-827).
- [ ] T024 [US4] In "Components" section, create new subsection "### Reserved components (not in active use)" and move `terminal-bar`, `matrix-widget`, `jagged-panel`, `icon-cluster` specs there with a note that they have no YAML instances in the corpus.
- [ ] T025 [US4] Verify v2 terms removed: `grep -i "canvas_width\|canvas_height\|uniform_rows\|Panel children type ordering" DIAGRAM.md` — should return zero results.

**Checkpoint**: v2 prose removed. Components reorganized.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and documentation

- [ ] T026 [P] Run no-new-Python ratchet: `node scripts/check_no_new_python.mjs`
- [ ] T027 [P] Run TypeScript compilation one final time: `cd packages/layout-engine && npx tsc --noEmit`
- [ ] T028 [P] Verify no SVG output changes by generating a test diagram and comparing before/after (optional, low priority)
- [ ] T029 Update `STATUS.md` or `TODO.md` to note that spec 039 is complete (if project convention requires it)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **User Story 1 (Phase 2)**: Can start after Setup - BLOCKS nothing but is highest priority
- **User Story 2 (Phase 3)**: Can start after Setup - independent of US1
- **User Story 3 (Phase 4)**: Can start after Setup - independent of US1 and US2
- **User Story 4 (Phase 5)**: Can start after Setup - independent of US1, US2, US3
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start immediately after Phase 1 - No dependencies on other stories
- **User Story 2 (P2)**: Can start immediately after Phase 1 - May run in parallel with US1
- **User Story 3 (P2)**: Can start immediately after Phase 1 - May run in parallel with US1 and US2
- **User Story 4 (P3)**: Can start immediately after Phase 1 - May run in parallel with all others

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Implementation before verification
- Story complete before moving to next priority (unless parallelizing)

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- US1, US2, US3, US4 can all run in parallel (different files, no dependencies)
- All Polish tasks marked [P] can run in parallel

---

## Parallel Example: All User Stories

```bash
# All user stories can run in parallel after Phase 1:
Task: "Edit DIAGRAM.md frontmatter typography section"
Task: "Edit scripts/diagram_shared.py to remove dead constants"
Task: "Edit DIAGRAM.md frontmatter spacing and grid sections"
Task: "Edit DIAGRAM.md prose to remove v2 guidance"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: User Story 1 (typography tokens)
3. **STOP and VALIDATE**: Count tokens in frontmatter — should be exactly 2
4. Commit if ready

### Incremental Delivery

1. Complete Setup → Baseline established
2. Add User Story 1 → Validate typography tokens → Commit (MVP!)
3. Add User Story 2 → Validate dead constants removed → Commit
4. Add User Story 3 → Validate spacing/grid tokens → Commit
5. Add User Story 4 → Validate prose cleanup → Commit
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup together
2. Once Setup is done:
   - Developer A: User Story 1 (DIAGRAM.md typography)
   - Developer B: User Story 2 (Python constants)
   - Developer C: User Story 3 (DIAGRAM.md spacing/grid)
   - Developer D: User Story 4 (DIAGRAM.md prose)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files or different sections, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (for US2)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- **Critical**: The `LINE_HEIGHTS_BY_SIZE` table in `diagram_shared.py` must NOT be removed — it's a general utility used by `default_line_step()` for arbitrary font sizes.
- **Critical**: The `make_diagram_line()` function is out of scope for this spec — it's a separate cleanup concern.
