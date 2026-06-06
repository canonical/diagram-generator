# Tasks: Sequence layout

**Input**: Design documents from `/specs/030-sequence-layout/`

**Prerequisites**: spec.md, plan.md

**Depends on**: specs 022, 025, and 026 complete

## Phase 1 - Authored model and boundaries

- [x] T001 Define the bounded authored model for participants, ordered messages, notes, and grouped spans
- [x] T002 Decide the persistence / AST path without introducing Mermaid as a second authority
- [x] T003 Record the supported `sequenceDiagram` subset and explicit non-goals

## Phase 2 - Core TypeScript layout kernel

- [x] T010 Add TypeScript sequence layout primitives for participant columns and message rows
- [x] T011 Implement branded participant headers, lifelines, and left-aligned message / note text rules
- [x] T012 Add focused unit tests for placement order, spacing, and stable geometry

## Phase 3 - Rendering and preview-engine integration

- [x] T020 Add manifest-owned preview-engine registration for the new sequence lane
- [x] T021 Render participant headers, lifelines, arrows, and notes through the repo-owned SVG path
- [x] T022 Verify no new engine-specific orchestration is added to `editor.js`

## Phase 4 - Compatibility layer and closeout

- [x] T030 Define Mermaid adapter hooks as import/export follow-up work, not runtime rendering
- [x] T031 Update `TODO.md`, `STATUS.md`, and `docs/specs.md` for the new active spec package
- [x] T032 Mark this spec Complete only after the bounded TS-owned lane is validated