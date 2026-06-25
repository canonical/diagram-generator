# Feature Specification: Preview Editor Recovery

**Feature Branch**: `feat/050-preview-editor-recovery`

**Created**: 2026-06-23

**Status**: Draft

**Priority**: Highest active preview-editor repair work

**Input**: Recover the preview editor after the spec 046 decomposition. Every
editor UI surface must load, respond, relayout, save, and report errors through
typed owners without widening legacy `editor.js`.

## Problem Statement

Spec 046 reduced the old browser editor shell to a thin adapter, but the
post-refactor editor is not behaving as a complete product surface. The user
reports that almost every preview-editor UI flow is broken after the move from
`scripts/preview/editor.js` into TypeScript owners.

This is now the top priority. The architecture closeout is only valuable if
the editor still works: loading diagrams, selecting objects, editing inspector
fields, dragging/resizing, editing text, switching engines, saving, undoing,
and recovering from relayout failures must all be verified as product
workflows.

## Scope

This spec covers:

- preview editor bootstrap and script/runtime contract wiring
- diagram picker and route load behavior
- stage render, selection, hover, keyboard, drag, resize, and live relayout
- single-selection and multi-selection inspector controls
- text editing, delete, undo/redo, and state restore
- engine switcher, engine-specific controls, and relayout status
- save/export/client persistence flows for frame diagrams
- a focused regression matrix proving the main UI controls still work

This spec does not cover:

- reopening spec 046 by widening `scripts/preview/editor.js`
- adding new layout engines
- broad visual redesign of the editor chrome
- screenshot-based visual QA unless explicitly requested
- unrelated YAML fixture reformatting

## User Scenarios & Testing

### User Story 1 - Editor opens and binds all required runtimes (Priority: P1)

As a diagram author, when I open an existing frame diagram in the preview
editor, I expect the editor to load without runtime contract failures and to
show a usable stage, tree, inspector, and toolbar.

**Why this priority**: If bootstrap is broken, every downstream UI control is
unreliable.

**Independent Test**: A focused editor bootstrap test loads the preview editor
with the built browser contracts and asserts required runtimes, stage SVG,
tree model, inspector shell, and save client are present.

**Acceptance Scenarios**:

1. **Given** a valid frame diagram, **When** the preview editor route loads,
   **Then** the stage renders a complete SVG and no required runtime contract is
   missing.
2. **Given** a valid frame diagram, **When** bootstrap finishes, **Then** the
   tree, inspector, selection runtime, relayout runtime, and save runtime are
   all ready for user interaction.

### User Story 2 - Core stage interactions work (Priority: P1)

As a diagram author, I need to select, drag, resize, nudge, delete, and undo
objects directly in the stage without the editor entering a broken state.

**Why this priority**: These are the core editing gestures. They prove that the
typed interaction owners replaced the legacy editor shell correctly.

**Independent Test**: A UI contract matrix exercises pointer selection, drag,
resize, keyboard nudge, delete, undo, and redo against a small frame diagram
and checks model state, SVG state, and save dirty state.

**Acceptance Scenarios**:

1. **Given** a rendered diagram, **When** the author selects a frame, **Then**
   stage selection chrome and inspector state target the same frame.
2. **Given** a selected frame, **When** the author drags, resizes, nudges, or
   deletes it, **Then** the visible stage, in-memory model, and undo stack stay
   consistent.

### User Story 3 - Inspector controls edit and relayout correctly (Priority: P1)

As a diagram author, I expect inspector controls for labels, style, sizing,
layout, alignment, and multi-selection actions to update the diagram
immediately and save cleanly.

**Why this priority**: The inspector is the main constrained editing surface.
Broken controls make the editor unusable even if the stage renders.

**Independent Test**: Single-selection and multi-selection inspector contract
tests exercise representative controls and verify relayout, SVG patching,
state updates, and persisted override payloads.

**Acceptance Scenarios**:

1. **Given** a selected frame, **When** the author changes text, style, width,
   height, sizing, or layout gap, **Then** the stage rerenders or patches
   correctly and save payloads contain the expected semantic change.
2. **Given** multiple selected frames, **When** the author aligns, distributes,
   or changes sizing, **Then** every affected frame receives a consistent
   update and undo can restore the prior state.

### User Story 4 - Engine controls and relayout failures are recoverable (Priority: P1)

As a diagram author, when I switch engines or use engine-backed controls, I
expect only compatible engines to be offered and failed relayouts to preserve
the last good render with a clear status.

**Why this priority**: Engine controls are now typed and modular, but a broken
engine lane can collapse the editor if failures are not contained.

**Independent Test**: Engine-switcher and relayout tests verify compatible
engine offers, successful engine relayout, failed engine relayout recovery,
and save validation.

**Acceptance Scenarios**:

1. **Given** a diagram with compatible engine metadata, **When** the author
   switches engines, **Then** the editor updates controls and rerenders through
   the selected lane.
2. **Given** an engine relayout failure, **When** the failure occurs, **Then**
   the previous stage remains visible and a clear error/status is shown.

### User Story 5 - Save, reload, and export stay coherent (Priority: P1)

As a diagram author, I expect saves from any editor control to survive reload
and to export the same semantic diagram state.

**Why this priority**: A UI control is not fixed unless its persisted outcome
is correct.

**Independent Test**: A save/reload test edits representative stage,
inspector, text, and engine settings, reloads the route, and verifies canonical
state and export stay coherent.

**Acceptance Scenarios**:

1. **Given** a dirty editor state, **When** the author saves and reloads,
   **Then** the route resolves the saved state without losing edits.
2. **Given** a saved diagram, **When** the author exports SVG, **Then** the
   export reflects the saved semantic diagram rather than stale browser state.

## Editor UI Recovery Matrix

The implementation must audit and cover these surfaces:

- bootstrap/runtime contract resolution
- diagram picker, previous/next navigation, and route reload
- stage render, selection, hover, and selection chrome
- drag, resize, live resize, keyboard nudge, delete, undo, redo
- single-selection inspector text, style, sizing, layout, and autolayout fields
- multi-selection align, distribute, sizing, and delete actions
- text-block editing and commit/cancel behavior
- arrow and waypoint edit controls that remain enabled
- engine switcher, ELK controls, debug/raw view toggles, and relayout status
- grid controls, layer/tree panel, reference image toggle, and guide badge
- save client, dirty state, reload from disk, and export SVG

## Edge Cases

- Editor route loads before the browser bundle is rebuilt.
- A runtime contract is missing from the namespaced TypeScript export surface.
- Text adapter initialization fails or is not authoritative.
- A relayout request fails after the stage already has a good render.
- The user edits while an engine relayout is pending.
- Undo/redo crosses stage, inspector, text edit, and engine-control changes.
- A save request is rejected by server validation.

## Requirements

### Functional Requirements

- **FR-001**: The preview editor MUST load existing frame diagrams without
  required runtime contract failures.
- **FR-002**: Every UI surface listed in the recovery matrix MUST have either
  passing behavior coverage or a documented, explicitly deferred gap.
- **FR-003**: Stage selection, drag, resize, keyboard, delete, undo, and redo
  MUST keep SVG state, model state, and dirty/save state consistent.
- **FR-004**: Single-selection inspector controls MUST update the diagram,
  relayout or patch the stage as needed, and persist semantic changes.
- **FR-005**: Multi-selection inspector actions MUST update all selected frames
  consistently and remain undoable.
- **FR-006**: Text editing MUST commit and cancel without corrupting frame
  labels, headings, or saved YAML.
- **FR-007**: Engine switcher controls MUST share one compatibility decision
  with save validation and relayout execution.
- **FR-008**: Failed engine or local relayout MUST preserve the last good stage
  render and expose a clear error/status.
- **FR-009**: Save, reload, and export MUST agree on the semantic diagram state
  after representative editor interactions.
- **FR-010**: Fixes MUST live in TypeScript preview-shell, layout-engine, or
  preview-host owners; legacy browser JS may only remain thin delegation glue.

### Key Entities

- **Editor Runtime Contract**: The browser-visible typed API surface consumed
  by thin preview JS wrappers.
- **Editor UI Surface**: A stage, inspector, navigation, engine, save, or panel
  control that an author can use to change or inspect the diagram.
- **Editor Recovery Matrix**: The finite checklist of UI surfaces that must be
  audited, tested, fixed, or explicitly deferred.
- **Last Good Editor State**: The most recent visible, internally consistent
  stage/model/save state that can be retained after a failed relayout.

## Success Criteria

### Measurable Outcomes

- **SC-001**: The editor recovery matrix has no untriaged items.
- **SC-002**: Representative tests for bootstrap, stage interaction,
  inspector, engine controls, save/reload, and export pass.
- **SC-003**: A forced relayout failure preserves the last good stage in a
  focused runtime test.
- **SC-004**: `scripts/preview/editor.js` and `scripts/preview/layout-bridge.js`
  do not gain behavior-heavy ownership.
- **SC-005**: The implementation can run the targeted preview editor test plan
  without requiring screenshots by default.

## Assumptions

- The 046 decomposition direction remains correct; this spec fixes product
  regressions without moving behavior back into the legacy JS shell.
- The first implementation pass should prioritize frame-diagram editor flows.
  Force-specific editor behavior should be fixed only where shared chrome or
  shared runtime contracts are involved.
- The new-diagram route hardening spec remains separate; this spec may depend
  on its compatibility and safe-relayout contracts where the same failure mode
  appears in the editor.

## Primary Entry Point For Agents

Start with [`tasks.md`](./tasks.md), then use
[`preview-editor-recovery-flow.md`](./preview-editor-recovery-flow.md) for the
cross-layer map. The first implementation task is a focused audit that turns
the recovery matrix into passing tests or explicit deferred gaps.
