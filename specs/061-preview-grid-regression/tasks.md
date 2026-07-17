# Tasks: Spec 061 Preview grid regression investigation

**Input**: `specs/061-preview-grid-regression/spec.md`
**Plan**: `specs/061-preview-grid-regression/plan.md`
**Branch**: `feat/061-preview-grid-regression`

## Phase 1: Locate the grid owners and the capability source

- [x] T001 Read the grid math and overlay owners:
      `packages/layout-engine/src/preview-shell/grid-resolution.ts`,
      `grid-overlay-scene.ts`, `grid-controls.ts`.
- [x] T002 Read the grid DOM/state bridge and control enumeration in
      `packages/layout-engine/src/preview-shell/app-grid-host.ts` and the
      install/runtime wiring (`app-grid-editor-install-unit.ts`,
      `app-grid-editor-runtime.ts`, `app-grid-editor-browser-state.ts`,
      `app-grid-runtime.ts`).
- [x] T003 Identify the engine/document capability descriptor the preview-shell
      already uses to decide compatible chrome (used by specs 051/055), so the
      grid gate reuses it rather than inventing a parallel one. Record the exact
      owner in `findings.md`.

## Phase 2: Containment — hide grid affordances on non-grid engines

- [x] T010 Add one typed predicate (`previewContextSupportsGridEditing`)
      that answers whether the active document/engine has a grid model. Place it
      in a typed preview-shell owner, not in `editor.js` or `layout-bridge.js`.
- [x] T011 Route grid-control and 9-dot alignment-control visibility through the
      predicate so non-grid engines **hide** the affordances (removed from
      DOM/tab order), not merely disable them.
- [x] T012 Ensure the grid interaction/relayout path cannot be entered for a
      non-grid engine once affordances are hidden, so the "Local relayout
      failed ... 9 dot alignment grid" ELK error is unreachable.
- [x] T013 Confirm grid-capable engines keep visible, working grid controls. If
      no engine currently renders a correct overlay, do not fake it — record it
      for the finding.

## Phase 3: Investigation — root cause and decision

- [x] T020 Trace the overlay mount path: find the render owner that draws the
      `PreviewGridOverlayScene` into the stage SVG and confirm whether it still
      runs for a grid-capable document.
- [x] T021 Confirm whether `resolvePreviewGridInfo` receives correct canvas
      dimensions and returns a non-empty scene for a grid-capable document.
- [x] T022 Confirm whether grid control runtime updates reach a relayout the
      render path honours, or whether the wiring is severed.
- [x] T023 Reproduce the ELK grid error and capture the exact control id and
      relayout call that throws.
- [x] T024 Write `specs/061-preview-grid-regression/findings.md`: classify the
      regression per FR-006 (not mounted / wrong geometry / controls dead /
      dropped) with file+symbol references, and record the restore-or-retire
      decision per FR-007 including the named follow-up owner/contract if
      restore is chosen.

## Phase 4: Tests and verification

- [x] T030 Add a layout-engine unit test for the capability predicate:
      grid-capable → shown, non-grid → hidden.
- [x] T031 Add an apps/preview contract/DOM test proving grid affordances are
      absent on a non-grid engine (DOM + tab order) and present on a grid-capable
      one, and that no grid relayout is dispatched for the non-grid case.
      `editor-live-repaint-regression.test.ts` now exercises V3 → ELK in
      Chromium; the runtime test covers the joined stale-callback dispatch.
- [x] T032 N/A — the finding retires non-grid affordances rather than choosing
      an in-scope restore, so no overlay-restore test is required. The V3
      live regression in T031 covers the retained overlay path.
      If (and only if) the finding chooses an in-scope restore, add a
      focused overlay-mount test proving the grid overlay renders for a
      grid-capable document.
- [x] T033 Run `npm --prefix packages/layout-engine test`.
- [x] T034 Run `npm --prefix apps/preview test`.
- [x] T035 Run `node scripts/check_no_new_python.mjs`.
- [x] T036 Use no-screenshot browser DOM probes only if unit/contract tests miss
      an integration behavior; do not capture screenshots unless asked.

## Closeout gate

- Containment (Phase 2) shipped: grid affordances hidden on non-grid engines,
  ELK grid error unreachable.
- `findings.md` committed with root-cause classification and restore-or-retire
  decision. Containment alone does NOT close this spec.
- Full validation green (T033–T035).

## Deferred follow-up

- Actual grid restoration on the typed render path, if the finding chooses
  restore and it is larger than an in-scope fix — file as a named follow-up spec.
- Contextual surfacing of per-engine layout options (the broader "surface the
  options each engine actually supports" INBOX theme) is not owned here.
