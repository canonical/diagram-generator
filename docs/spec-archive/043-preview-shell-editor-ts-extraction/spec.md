# Feature Specification: Preview shell editor TypeScript extraction

**Feature Branch**: `feat/043-preview-shell-editor-ts-extraction`

**Created**: 2026-06-14

**Status**: Complete

**Depends on**: spec 025 (complete), spec 026 (archived complete), spec 027 (complete), spec 029 (complete), spec 035 (archived complete)

**Input**: `scripts/preview/editor.js` still sits at roughly 6k lines and remains the default place where shared preview behavior accumulates. Spec 026 extracted save client, editor state, and engine controller slices, but its own boundary document still leaves inspector rendering, selection/drag/resize interaction, grid control DOM, and `loadSVG()` coordination inside `editor.js`. That is enough to keep the shell operational, but not enough to support repeated cold-start sessions, a lean standalone repo, or the planned addition of many more engine lanes without repeated regressions.

## Problem Statement

The repo already proved the direction:

- save/reload orchestration should not live inline in `editor.js`
- engine-specific behavior should not be wired as ad hoc branches in the shell core
- non-trivial preview logic should be TypeScript-owned where possible

But the highest-churn preview behaviors still live in one large legacy JS file:

- inspector rendering and edit dispatch
- selection state and interaction depth logic
- drag/resize/nudge flows
- grid control UI state
- shell bootstrapping and relayout coordination

This creates three concrete failures:

1. every new preview feature or engine follow-up still requires reading and patching a monolith
2. cross-session handoff is weak because ownership is implicit in one file rather than explicit in typed modules
3. flaky regressions remain likely because interaction and inspector changes share one mutable surface with broad incidental coupling

Spec 026 was therefore necessary but not sufficient. This spec completes the remaining extraction work with cold-start-friendly slices instead of a big-bang rewrite, and makes the shared preview shell a maintainable host for 20+ future layout engines.

## Mission

Turn `editor.js` from the main behavioral surface into a thin shell coordinator over typed modules, while preserving the live preview UX, keeping YAML + TypeScript as the only product-path authorities, and making the standalone repo leaner and more stable to extend.

## Execution amendment (2026-06-15)

During execution, the preview shell's legacy Input / Output / Both compatibility chrome was explicitly retired. The preview shell is now intentionally output-only. Restoring multi-pane compatibility UI is not part of spec 043 and would require a separate product-led spec.

## Architectural Review Bar

This repo will be reviewed by external software architects, not just used for local maintenance. The closeout bar for this spec is therefore higher than "tests pass" or "the file got smaller."

The remaining work should optimize for:

- obvious ownership boundaries at a glance
- no new inline UI assembly blocks growing inside `editor.js`
- residual JS that reads as browser-host glue rather than hidden business logic
- shell concerns that are legible enough for a cold reviewer to map to typed owners without rediscovering the project

## Alignment with spec 038

Spec 038 already locked the long-term architecture:

- `diagram-generator` remains a standalone sibling repo in the near term
- `packages/layout-engine/` is the long-term relocation candidate
- the eventual move into design-foundry should be relocation, not redesign

This spec is therefore **standalone-first**. It improves maintainability and extensibility inside this repo now, while preserving the seams added by spec 038 (`operator-autolayout/facade`, `render-ir`, `text-adapter/shape-compatible`, `public-api-contract`) so later relocation remains straightforward.

## Implementation Boundary

This feature is **preview-shell TypeScript extraction with incremental legacy-JS shrink**.

- `scripts/preview/editor.js` may remain as a temporary bootstrap and DOM-host file during migration.
- New non-trivial preview logic must land in TypeScript-owned modules under `packages/layout-engine/src/preview-shell/` when it is browser-consumed shared logic.
- Existing browser shell files may continue to host minimal DOM queries, event hookup, and compatibility glue only where needed during transition.
- Browser-facing TS modules should be surfaced through `packages/layout-engine/src/browser-entry.ts` and the browser bundle rather than by growing new legacy JS helper files.
- `layout-bridge.js` remains the runtime bridge unless a specific slice needs a narrow boundary move.
- No new Python product-path logic is allowed.
- No new direct dependency on design-foundry is introduced by this spec.
- This spec does not require a one-session or one-PR rewrite.

## User Scenarios & Testing

### User Story 1 - Change inspector behavior without reopening the monolith (Priority: P1)

As a maintainer, I want inspector rendering and edit dispatch to live behind explicit module boundaries so I can change one inspector feature without re-reading most of `editor.js`.

**Independent Test**: A targeted inspector behavior change can be implemented in a dedicated module with no unrelated selection/drag logic edits.

**Acceptance Scenarios**:

1. **Given** a new inspector field or existing field bugfix, **When** the maintainer implements it, **Then** the primary change lands in a dedicated inspector module rather than as another large `editor.js` patch.
2. **Given** multi-select and single-select inspector behavior, **When** values are resolved, **Then** the view-model logic is owned by TypeScript rather than ad hoc DOM string building inside the shell core.

---

### User Story 2 - Change interaction behavior without risking unrelated inspector/save paths (Priority: P1)

As a maintainer, I want selection, drag, resize, and keyboard interaction to live in explicit controllers or state machines so interaction fixes do not keep destabilizing unrelated shell concerns.

**Independent Test**: A drag/resize or selection-depth change is implemented in a dedicated interaction slice and leaves save, engine, and inspector modules untouched.

**Acceptance Scenarios**:

1. **Given** a pointer interaction bug, **When** the fix lands, **Then** it changes a dedicated interaction controller or TS state machine instead of widening `editor.js`.
2. **Given** selection state changes, **When** relayout or DOM patching occurs, **Then** the interaction module rehydrates from explicit state rather than hidden globals spread through the shell.

---

### User Story 3 - Cold-start sessions can continue the migration in bounded slices (Priority: P1)

As a maintainer working across cold-start sessions, I need the editor decomposition to be split into independent slices with explicit ownership and validation so work can resume safely after context resets.

**Independent Test**: A new session can pick one outstanding extraction slice from the spec package, follow the boundary notes, and run the listed targeted tests without rediscovering the architecture from scratch.

**Acceptance Scenarios**:

1. **Given** a fresh session, **When** the maintainer opens this package, **Then** they can identify the next extraction slice, the files it may touch, and the validation required.
2. **Given** one slice is completed, **When** the session ends, **Then** the remaining slices still have stable boundaries and do not require reopening archived specs as the primary guide.

---

### User Story 4 - New engine work no longer uses `editor.js` as the default integration layer (Priority: P1)

As a maintainer integrating ELK, force, sequence, or future engines, I want shared preview shell behavior to stay engine-agnostic so engine work routes through manifests, controllers, and TS contracts instead of fresh `editor.js` branches.

**Independent Test**: Adding or refining an engine-owned panel, debug toggle, or relayout path does not require new engine-specific business logic inside `editor.js`.

**Acceptance Scenarios**:

1. **Given** a new engine-owned panel or debug aid, **When** it is added, **Then** the behavior lands in engine-owned modules or typed contracts.
2. **Given** the shared shell coordinator, **When** engine-specific scripts load, **Then** it only hosts bootstrap wiring and shared shell concerns.

### User Story 5 - The shell can absorb many more engines without becoming a new monolith (Priority: P1)

As a maintainer, I want the shared preview shell to scale to many engine lanes without centralizing their behavior in one coordinator file.

**Independent Test**: A new engine lane can register its shell-facing behavior through typed contracts and engine-owned modules without reopening `editor.js` as the main integration point.

**Acceptance Scenarios**:

1. **Given** a new engine lane is introduced, **When** shell-facing controls or debug panels are added, **Then** the shared shell consumes them through typed boundaries rather than bespoke `editor.js` branches.
2. **Given** multiple engine lanes evolve in parallel, **When** one lane changes its UI hooks, **Then** other lanes do not need incidental edits in the shared shell core.

## Extraction Scope

The remaining `editor.js` surface should be decomposed into these durable ownership slices:

1. inspector view-model resolution
2. inspector DOM rendering / field wiring
3. selection and interaction state
4. pointer drag/resize/nudge controllers
5. keyboard shortcut dispatch that is not pure DOM glue
6. grid control view-model and update dispatch
7. preview-shell application coordinator / bootstrap state

These slices may land in multiple sessions and multiple PRs. The spec intentionally does not require them to collapse into one new file or one architectural style.

## Requirements

### Functional Requirements

- **FR-001**: `editor.js` MUST stop being the default home for new non-trivial preview behavior.
- **FR-002**: New non-trivial preview logic introduced while this spec is active MUST be implemented in TypeScript-owned modules unless it is truly trivial DOM glue.
- **FR-003**: Inspector behavior MUST be split into explicit ownership layers: at minimum a view-model/data layer and a rendering/wiring layer.
- **FR-004**: Selection, drag, resize, and keyboard interaction behavior MUST move toward explicit controllers or state machines instead of remaining as one interleaved blob in `editor.js`.
- **FR-005**: Grid-control state resolution and update dispatch MUST no longer depend on large ad hoc inline shell logic.
- **FR-006**: `loadSVG()` or its successor bootstrap path MUST remain a coordinator only; layout, persistence, and engine-specific behavior must stay delegated to their owning modules.
- **FR-007**: Engine-specific preview behavior MUST NOT add new business-logic branches to `editor.js` outside thin bootstrap wiring.
- **FR-008**: The active boundary documentation for the preview shell MUST be refreshed as slices land so cold-start sessions do not rely on archived spec 026 as the primary truth.
- **FR-009**: Each extraction slice MUST define targeted validation sufficient to prove behavior did not drift before the next slice starts.
- **FR-010**: Shared browser-consumed TS extraction modules MUST live under `packages/layout-engine/src/preview-shell/` and integrate through `packages/layout-engine/src/browser-entry.ts` when they need browser-bundle exposure.
- **FR-011**: The preview-shell boundary note for this archived work lives at `docs/spec-archive/043-preview-shell-editor-ts-extraction/boundaries.md` and remains linked from `docs/agent-index.md`.
- **FR-012**: This migration MUST preserve the spec 038 relocation seams and MUST NOT introduce new direct dependencies on design-foundry.
- **FR-013**: Shared shell integration for future engines MUST prefer typed registries, manifests, or controller contracts over per-engine branching in `editor.js`.

### Non-Functional Requirements

- **NFR-001**: This migration MUST remain incremental; no big-bang rewrite is required or encouraged.
- **NFR-002**: Each slice SHOULD be completable and reviewable in one focused session or one narrow PR.
- **NFR-003**: The migration SHOULD optimize for cold-start continuation: explicit slice boundaries, explicit validation, and minimal hidden coupling.
- **NFR-004**: The end state SHOULD leave `editor.js` as a thin shell coordinator/bootstrap file rather than the main behavioral surface.
- **NFR-005**: TypeScript extraction SHOULD prioritize logic-heavy and regression-prone areas before cosmetic or purely mechanical JS-to-TS translation.
- **NFR-006**: The resulting shell architecture SHOULD make adding many more engines materially cheaper by shrinking shared-shell branching and hidden global state.
- **NFR-007**: The residual `editor.js` surface SHOULD remain review-legible: browser-host glue, compatibility shims, and temporary DOM adapters only, with obvious typed owners for tree/sidebar UI, status panels, inspector state, interaction planning, and bootstrap coordination.

## Success Criteria

- **SC-001**: Future preview features stop defaulting to `editor.js` for new non-trivial logic.
- **SC-002**: Inspector logic, interaction logic, and grid/shell coordination each have an explicit owner outside the monolithic shell.
- **SC-003**: A fresh session can resume the migration from this package without using archived spec 026 as the main execution guide.
- **SC-004**: `editor.js` becomes materially smaller and more coordinator-like, even if some DOM glue remains in JS temporarily.
- **SC-005**: Focused tests or boundary checks exist for each landed extraction slice.
- **SC-006**: New or revised engine lanes stop defaulting to `editor.js` for shared-shell integration work.
- **SC-007**: Extracted browser-facing TS modules build and ship through the layout-engine browser bundle without ad hoc legacy helper growth.
- **SC-008**: A reviewer can inspect the active boundary note and the remaining `editor.js` file and identify the typed owner for each major shell concern without reopening archived specs or tracing unrelated engine code.

## Out of Scope

- rewriting the entire preview shell in one session
- replacing the preview shell with a framework rewrite
- broad `layout-bridge.js` redesign unless a specific slice requires a narrow ownership move
- changing authored YAML semantics
- cross-repo design-foundry migration work
- unrelated ELK/force feature work except where needed to preserve architectural boundaries

## Migration Principles

1. **Extract behavior, not just lines**: moving helpers without changing ownership does not count as progress.
2. **TS first where logic matters**: state shaping, interaction state, dispatch rules, and inspector resolution belong in TS before DOM polish does.
3. **Keep shell JS shallow**: browser JS may host DOM lookup and event hookup temporarily, but it should not remain the authority for business logic.
4. **Prefer narrow slices**: a small completed slice with tests is better than a sweeping partial rewrite.
5. **Update the active map as you go**: this spec package becomes the current guide for remaining work; do not force later sessions back into archived spec 026 unless historical details are needed.
6. **Preserve the 038 seams**: do not solve shell maintainability by collapsing or bypassing the operator-autolayout facade, render-ir, text adapter, or public API guardrails added for the long-term relocation path.
