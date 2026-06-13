# Tasks: Text-block inline editing for preview

**Input**: Design documents from `/specs/041-text-block-inline-editing/`

**Prerequisites**: `spec.md`, `plan.md`

## Phase 1: Render contract

- [x] T001 Add stable text-block role/index metadata to frame-owned text render output
- [x] T002 Keep browser relayout text elements aligned with the same metadata contract
- [x] T003 Add focused contract coverage for text-block role identity

## Phase 2: Preview interaction

- [x] T010 Detect text-block double-click targets before component-level text editing
- [x] T011 Open inline editing for only the clicked text block
- [x] T012 Keep non-clicked text blocks visible while editing

## Phase 3: Commit semantics

- [x] T020 Update heading edits to write only `text.heading`
- [x] T021 Update body edits to write only `text.label`
- [x] T022 Preserve existing text overrides for non-clicked fields on commit

## Phase 4: Visual safety and validation

- [x] T030 Make inline editor surfaces legible on dark and light fills
- [x] T031 Run focused engine tests and browser-bundle build
- [x] T032 Run full engine + preview validation and Python-path ratchet

## Phase 5: Adversarial review

- [x] T040 Review architecture drift: block identity ownership, preview-shell coupling, YAML authority
- [x] T041 Review implementation risks: shallow merge traps, contrast failures, selection-depth regressions

