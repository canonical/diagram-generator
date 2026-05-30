# Feature Specification: Style foundation unification and preview parity hardening

**Feature Branch**: `feat/007-style-foundation-unification`

**Created**: 2026-05-30

**Status**: Draft

**Input**: Complete the unfinished historical Python -> TypeScript migration for interactive layout, remove split style interpretation, and converge on one execution path so editor behavior is deterministic and maintainable.

## Problem Statement

The repo's historical intent (Roadmap Stage 15.5) was to move interactive layout execution from Python server round-trips to a TypeScript client engine. That migration started but never reached a clean end-state, leaving mixed ownership and contradictory behavior.

Current v3 path issues:

- style semantics are owned by `resolve_styles()` in Python, but preview local rendering still derives style from raw `fill/border` heuristics
- preview edit behavior depends on local relayout readiness, but readiness and fallback were not treated as a formal contract
- style controls can become semantically correct but visually inert when relayout mode and render ownership diverge
- local and server relayout paths are not guaranteed to produce the same style interpretation for the same overrides
- docs and code disagree on whether server fallback is removed vs active, which causes decision churn

The goal is to finish the migration with one way of doing things for interactive editing.

## Architectural Decision (Normative)

For interactive editing in v3:

1. TypeScript local layout is the primary and final execution path.
2. Python layout remains the batch/export oracle and parity reference, not an interactive executor.
3. Server fallback is temporary risk control only during migration completion and must be removed once parity gates pass.
4. Style semantics must be defined once and consumed consistently by all render paths.

If implementation or docs conflict with this section, this section wins.

## End-State Invariants (Normative)

The feature is only complete when all invariants below hold:

1. **One interactive executor:** TypeScript local layout only.
2. **One model source:** YAML frame definitions as canonical model input.
3. **One override authority:** edits replace existing values in the original frame YAML in place. No additive override entry structures are introduced (including `overrideRole`-style metadata fields), and no sidecar override YAML/JSON authority exists.
4. **No shadow state forks:** localStorage is not used by the v3 interactive editing path.
5. **One render contract:** renderers consume the same layout/style decisions; no path-specific reinterpretation branches.
6. **One migration truth:** `spec.md` + `plan.md` + `tasks.md` for 007 define closure gates; conflicting ad-hoc notes are invalid.

## User Scenarios & Testing

### User Story 1 - Inspector style controls always affect output (Priority: P1)

As a diagram editor user, I need every style dropdown selection to immediately and visibly affect the selected component, regardless of local vs server relayout mode.

**Why this priority**: Broken style controls destroy trust in the editor and mask deeper engine drift.

**Independent Test**: In a browser test, switch style across all options (`default`, `parent`, `section`, `annotation`, `highlight`) with local relayout ready and not-ready modes, and assert SVG fill/stroke changes plus override summary updates.

**Acceptance Scenarios**:

1. **Given** local relayout is ready, **When** style is changed, **Then** output updates in-place and persists in overrides.
2. **Given** local relayout is not ready, **When** style is changed, **Then** server fallback applies and output still updates consistently.

---

### User Story 2 - Style semantics have a single source of truth (Priority: P1)

As an engine maintainer, I need one layer to define style semantics and all renderers to consume those semantics directly, so we stop re-deriving style in multiple places.

**Why this priority**: Duplicate style logic reintroduces regressions after every refactor.

**Independent Test**: Contract tests that compare Python render output and preview-local render output for the same serialized frame+overrides and verify style-equivalent fill/stroke behavior.

**Acceptance Scenarios**:

1. **Given** resolved style state for level/variant combinations, **When** rendering via any v3 path, **Then** fill/stroke are equivalent.
2. **Given** explicit style overrides in editor, **When** relayout executes, **Then** resulting style is derived through the shared contract, not path-specific heuristics.

---

### User Story 3 - Migration converges to one interactive execution path (Priority: P1)

As a maintainer, I need migration completion gates that end in one interactive path, so we stop accumulating dual-path complexity and contradictory fixes.

**Why this priority**: Historical partial migration is the root source of current confusion and regressions.

**Independent Test**: Run parity and regression suites to certify local TS path as primary; then remove interactive server fallback code and verify no user-facing capability regressions.

**Acceptance Scenarios**:

1. **Given** migration in progress, **When** local readiness fails, **Then** fallback is allowed only as temporary guardrail and fully observable.
2. **Given** parity gates pass, **When** migration closes, **Then** interactive server fallback is removed and local TS path is the only interactive executor.

---

### User Story 4 - Override schema is semantically aligned (Priority: P2)

As a system integrator, I need editor override fields to represent semantic intent (e.g., level/variant) where applicable, so persisted state is portable and stable across implementations.

**Why this priority**: Schema drift forces renderer-specific translation logic.

**Independent Test**: Roundtrip overrides through save/load and compare semantic equivalence before and after relayout in both local and server paths.

**Acceptance Scenarios**:

1. **Given** style override from inspector, **When** saved and reloaded, **Then** semantic meaning is preserved.
2. **Given** old override payloads, **When** loaded, **Then** compatibility mapping is deterministic and migration-safe.

## Edge Cases

- local relayout bridge partially initialized (tree loaded but text adapter unavailable)
- rapid successive style changes during mode fallback
- mixed multi-selection edits across nodes with different existing style states
- legacy `accent` style alias in saved overrides
- stale overrides after branch switches or diagram reloads

## Requirements

### Functional Requirements

- **FR-001**: Style controls in v3 inspector MUST always produce visible output changes when selection is styleable.
- **FR-002**: During migration, v3 relayout MUST support deterministic server fallback when local bridge is unavailable or fails.
- **FR-003**: Local and server relayout paths MUST apply one shared style contract for level/variant/override semantics.
- **FR-004**: Readiness gating for locally managed rendering MUST depend on explicit local-bridge readiness, not engine mode alone.
- **FR-005**: Save/load MUST preserve style intent while performing in-place replacement of existing YAML values (no additive override-entry schema).
- **FR-006**: After migration gates pass, interactive server fallback MUST be removed; TypeScript local relayout becomes the only interactive executor.
- **FR-007**: localStorage MUST NOT be used for any v3 interactive editing state, including overrides, layout state, style state, or UI preference persistence.
- **FR-008**: Renderer implementations MUST NOT fork semantic style interpretation by execution path.
- **FR-009**: Every major implementation block in this feature MUST pass an adversarial review before the next block starts.
- **FR-010**: Interactive edits MUST NOT introduce `overrideRole` (or equivalent additive metadata keys) into frame YAML; canonical fields are replaced directly.

### Non-Functional Requirements

- **NFR-001**: No inspector action may silently no-op without user-visible error or fallback.
- **NFR-002**: Style parity tests must pass for representative corpus fixtures across migration mode and final single-path mode.
- **NFR-003**: Changes must avoid reintroducing duplicate style-derivation branches.
- **NFR-004**: State-management changes must preserve a single authoritative source with no hidden client/server divergence.

## Success Criteria

- **SC-001**: Style dropdown actions affect SVG output in both local-ready and fallback modes across all style options.
- **SC-002**: A style-parity test suite confirms local/server visual equivalence for level and variant scenarios.
- **SC-003**: No unresolved TODO comments or heuristic style branches remain in preview local renderer for v3 frame boxes.
- **SC-004**: Regression test reproducing the “dropdown changes but no visual effect” failure passes permanently.
- **SC-005**: Interactive server fallback code paths are removed or gated behind an explicit migration-complete flag that defaults off.
- **SC-006**: `STATUS.md`, `TODO.md`, and Stage 15.5 notes are aligned with the final single-path behavior.
- **SC-007**: No interactive behavior differences remain between "cold reload" and "post-edit" sessions caused by local shadow state.
- **SC-008**: Adversarial review reports for each major block confirm no new dual-path or dual-state regressions.
- **SC-009**: Post-edit YAML diffs show direct value replacement on canonical fields, with no additive override-entry objects or `overrideRole` keys.

## Out of Scope

- redesigning visual language tokens in `DIAGRAM.md`
- arrow routing redesign (tracked separately in 006)
- broad editor UX redesign unrelated to style ownership and relayout consistency

## Dependencies

- `specs/005-autolayout-hardening/`
- `specs/007-style-foundation-unification/style-contract.md`
- `scripts/frame_loader.py` (`resolve_styles` ownership)
- `scripts/layout_v3.py` render contract
- `scripts/preview/layout-bridge.js` and `scripts/preview/editor.js` relayout and inspector behavior
