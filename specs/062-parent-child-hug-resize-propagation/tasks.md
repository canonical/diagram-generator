# Tasks: Spec 062 Parent/Child Hug Resize Propagation

**Input**: `specs/062-parent-child-hug-resize-propagation/spec.md`
**Branch**: `feat/062-parent-child-hug-resize-propagation`

## Phase 1: Repro And Owning Seams

- [x] T001 Read the current `test-alignment-grid` fixture and identify the
      authored parent/child sizing facts that reproduce the bug.
- [x] T002 Trace the parent-resize path through the typed preview resize owners
      and any remaining JS compatibility helper that still mirrors child
      relayout during drag.
- [x] T003 Add a focused failing regression that demonstrates the current
      `HUG` child does not shrink when the parent is resized smaller.
- [x] T004 Add the companion regression that documents the intended preserved
      behavior for a still-`FIXED` child.

## Phase 2: Propagation Contract

- [x] T010 Implement the owner change so `HUG` children recompute from the
      resized parent's new inner bounds instead of reusing stale effective size.
- [x] T011 Keep `FIXED` child semantics intact unless the author explicitly
      changes that child to `HUG`.
- [x] T012 Ensure changing a child from `FIXED` to `HUG` through the editor
      mutation path yields the same propagated behavior as authored `HUG`.
- [x] T013 Keep the implementation TypeScript-first; if the legacy preview model
      must be touched, reduce it to delegation/compatibility rather than new
      ownership.

## Phase 3: Save, Reload, And Browser Proof

- [x] T020 Add a repo-owned `persist -> reload` regression on
      `test-alignment-grid` proving the child sizing mode and propagated fit
      survive save/reload.
- [x] T021 Extend an existing browser regression or add a focused new one that
      sets the child to `HUG`, resizes the parent smaller, and proves the child
      shrinks and stays within the parent bounds.
- [x] T022 Record the proof in spec-local evidence without screenshots unless
      they are explicitly required later.

## Phase 4: Validation And Handoff

- [x] T030 Run targeted owning tests for changed resize/layout/persistence
      modules.
- [x] T031 Run `npm --prefix packages/layout-engine test`.
- [x] T032 Run `npm --prefix apps/preview test`.
- [x] T033 Run `node scripts/check_no_new_python.mjs`.
- [x] T034 Update `docs/specs.md`, `AGENT-INBOX.md`, and `AGENTS.md` only if the
      spec status or handoff state materially changes.
