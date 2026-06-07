# Feature Specification: Preview browser test API (shim removal)

**Feature Branch**: `feat/027-preview-browser-test-api`

**Spec Package**: `027-preview-browser-test-api`

**Created**: 2026-06-06

**Status**: Complete

**Depends on**: spec 026 (complete) — save client, editor state store, and shell shrink must be landed first.

**Input**: Spec 026 moved save and undo/redo into `PreviewSaveClient` and `EditorState`, but adversarial review restored five `window.*` shims (`saveOverrides`, `performUndo`, `performRedo`, `canUndo`, `canRedo`) so Playwright coverage and ad hoc DevTools debugging kept working. Those shims are intentional debt, not the long-term browser contract.

## Problem Statement

The preview shell now has a clear module boundary:

- **Production UI** calls `PreviewSaveClient` and `EditorState` directly (buttons, keyboard shortcuts).
- **Tests and console debugging** still call legacy globals via `page.evaluate("() => saveOverrides()")` and similar strings.

That split means:

- Every new Playwright test can accidentally re-cement globals instead of the module surface.
- `editor.js` carries a permanent compatibility block that contradicts the spec 026 goal of a thin coordinator.
- There is no documented, stable **test-only** API — only undocumented globals.

## Mission

Replace the legacy globals with an explicit, documented preview test API, migrate existing Playwright callers, then remove the shims from `editor.js`.

## User Scenarios & Testing

### User Story 1 — Playwright saves without legacy globals (Priority: P1)

As a maintainer running browser regression tests, I want save/undo helpers exposed through a named test API so tests do not depend on undeclared `window` functions.

**Independent test**: `scripts/test_preview_support_engineering_flow.py` passes using `window.__DG_TEST_*` (or equivalent documented hooks) and with no references to bare `saveOverrides` / `performUndo` globals.

### User Story 2 — Shim removal with regression guard (Priority: P1)

As a maintainer, I want the shim block removed from `editor.js` only after tests migrate, with static checks proving the globals cannot return silently.

**Independent test**: `editor.js` contains no `window.saveOverrides` / `window.performUndo` assignments; a pytest boundary test fails if they reappear.

### User Story 3 — DevTools debugging path documented (Priority: P2)

As a maintainer debugging in the browser console, I want a documented entrypoint for save/undo operations that does not require memorizing removed globals.

**Independent test**: `quickstart.md` documents the supported console commands; optional thin `window.__DG_preview` facade may remain if explicitly documented as debug-only.

## Requirements

### Functional Requirements

- **FR-001**: Define a documented preview test API surface (see `contracts/preview-test-api.md`).
- **FR-002**: Migrate all in-repo Playwright callers off legacy globals (`saveOverrides`, `performUndo`, `performRedo`, `canUndo`, `canRedo`).
- **FR-003**: Remove the shim assignments from `scripts/preview/editor.js` once FR-002 is complete.
- **FR-004**: Add regression tests that fail if legacy globals are reintroduced in `editor.js`.
- **FR-005**: Production UI behavior MUST remain unchanged (buttons and keyboard shortcuts still work without globals).

### Non-Functional Requirements

- **NFR-001**: The test API MUST delegate to `PreviewSaveClient` / `EditorState` — no duplicated save or undo logic.
- **NFR-002**: Prefer explicit `__DG_TEST_*` or `__DG_preview` names over resurrecting undocumented top-level globals.
- **NFR-003**: Scope is in-repo tests and documented debug hooks only; no change to stakeholder-facing preview UX.

## Timing and scheduling

| When | What |
| --- | --- |
| **Now (blocked on nothing)** | Spec 026 is complete; work can start any time. |
| **Recommended window** | After the current spec 026 closeout commits are stable on `main`, as a small hygiene slice **before** adding substantial new Playwright coverage. |
| **May run in parallel with** | Spec 022 (authoring AST) — no dependency either direction. |
| **Should complete before** | Further `editor.js` global cleanup or spec 024 ELK interactive work that adds Playwright scenarios. |
| **Not urgent** | Shims are thin delegates; production preview is unaffected while this waits. |

**Estimate**: one focused session (audit + test API + Playwright migration + shim removal + boundary tests).

## Non-Goals

- Rewriting all of `editor.js` or migrating inspector/interaction code.
- Changing save persistence semantics or undo stack behavior.
- Exposing the test API as a supported public integration surface for external consumers.

## Success Criteria

1. Zero `page.evaluate` calls in the repo use bare `saveOverrides` / `performUndo` / `performRedo` / `canUndo` / `canRedo`.
2. `editor.js` no longer assigns those five legacy globals.
3. Documented test API and validation commands exist in this spec package.
4. Existing Playwright regression suite stays green.
