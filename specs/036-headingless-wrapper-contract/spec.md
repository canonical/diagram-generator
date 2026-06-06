# Feature Specification: Headingless wrapper contract

**Feature Branch**: `feat/036-headingless-wrapper-contract`

**Spec Package**: `036-headingless-wrapper-contract`

**Created**: 2026-06-06

**Status**: Draft

**Depends on**: spec 020 (style authority direction), spec 025 (preview-engine contract), spec 026 (preview shell decomposition)

**Input**: User report that non-headed autolayout wrappers are acquiring visible parent styling and padding in the preview/editor flow, making groups behave unlike plain layout wrappers. The immediate question is whether to add a new `pass-through` variant or instead restore the contract that invisible wrappers behave like SVG groups: structural only, no box chrome.

## Problem Statement

The core layout model already encodes a clean rule:

- headingless containers are layout wrappers
- layout wrappers should be invisible
- invisible wrappers should not carry default panel padding

That contract is currently being undermined by preview-side style projection and persistence behavior. A headingless wrapper can be pushed into a visible `parent` / `section` style path, which then persists grey fill, border semantics, and `8px` panel padding even though the authored structure is still just a wrapper.

Adding a new `pass-through` variant would hide that drift behind another escape hatch. The better first move is to restore the wrapper contract so invisible grouping does not need a special variant to opt back out of accidental chrome.

## Mission

Restore one stable rule: a container without heading behaves like a structural wrapper by default, analogous to an SVG `<g>` group. It participates in layout and grouping, but not in box chrome, panel padding, border, or background, unless the authored document explicitly asks for visible container treatment through a bounded supported contract.

## User Scenarios & Testing

### User Story 1 - Headingless wrappers stay invisible (Priority: P1)

As an author, I want a container with no heading to remain a structural wrapper, so grouping content does not accidentally introduce panel padding, fill, or border.

**Independent test**: author or save a headingless container, reload it, and confirm the rendered output has no wrapper chrome and no default `8px` panel padding.

### User Story 2 - The inspector reflects the real authored state (Priority: P1)

As an author, I want the style picker to describe the actual saved/base state instead of a vague `original` label or a misleading panel-style implication.

**Independent test**: selecting a headingless wrapper shows an `as defined` label that reflects its real base state, and the control path does not imply that invisible grouping is a normal `parent` panel.

### User Story 3 - Visible non-headed containers are explicit, not accidental (Priority: P2)

As a maintainer, I want any visible non-headed container treatment to come from an explicit supported contract, not from wrapper drift through style overrides.

**Independent test**: if a non-headed container is supposed to be visible, that path is documented and deliberate; otherwise save/reload restores invisible wrapper behavior.

## Requirements

### Functional Requirements

- **FR-001**: A headingless container MUST default to invisible layout-wrapper semantics, including zero default wrapper padding, unless the authored document explicitly opts into a supported visible-container contract.
- **FR-002**: Preview/editor style controls MUST NOT silently persist `parent` / `section` panel semantics onto headingless wrappers as the default path for grouping.
- **FR-003**: Save/reload MUST preserve invisible-wrapper behavior through YAML persistence, TS parsing, preview document compilation, layout, and SVG render.
- **FR-004**: The style picker MUST describe the base/authored state with `as defined` wording and MUST NOT rely on a vague `original` reset label.
- **FR-005**: If the repo still needs a visible non-headed container after the wrapper contract is restored, that need MUST be handled by a deliberate follow-up design decision rather than by keeping accidental wrapper chrome.
- **FR-006**: The first implementation slice MUST prefer restoring wrapper semantics over adding a new `pass-through` or `wrapper` variant.

### Non-Functional Requirements

- **NFR-001**: The wrapper rule should be explainable in one sentence: "a container without heading behaves like a structural group, not a panel."
- **NFR-002**: The fix should stay inside the existing TS-first style/persistence architecture; do not add a second style-authority layer.
- **NFR-003**: The preview shell should stay consistent across single-select and multi-select style controls.

## Non-Goals

- Redesigning the whole style taxonomy.
- Changing headed panel or section behavior.
- Building the compatible-engine switcher UI.
- Adding a new `pass-through` variant in this first slice unless the restored wrapper contract proves insufficient.

## Success Criteria

1. A headingless container no longer acquires visible panel padding/chrome by accident through save/reload.
2. The preview shell no longer uses `original` wording for the wrapper/style reset label.
3. The wrapper rule is documented clearly enough that future style work does not reintroduce panel-like defaults for invisible groups.
4. If a residual legitimate use case remains for visible non-headed containers, it is isolated as a deliberate follow-up rather than left as ambiguous drift.
