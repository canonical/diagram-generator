# Codex adversarial audit — Spec 061

**Branch:** `feat/061-preview-grid-regression` against `main`
**Verdict:** Merge ready

## Remediated review findings

- The ELK save→reload check is strict again. Blank numeric defaults are now
  removed by `writeLayoutOperatorOverrideBucketForManifest`, while blank enum
  values remain persisted; this fixes the real state asymmetry instead of
  normalizing it away in the browser test.
- The runtime grid capability boundary fails closed when its host callback is
  absent. A runtime regression switches its real capability closure from V3 to
  non-grid and proves the stale dispatch is inert without reading state,
  marking dirty, or requesting relayout.
- A Chromium regression now proves V3 guide-overlay mounting, V3 grid tab
  stops and 9-dot alignment buttons, then their removal on a live V3 → ELK
  switch.
- Spec closeout text and task status now match the shipped behavior; T032 is
  correctly marked N/A because the decision is to retire non-grid affordances.

## Additional audit

I traced the active-engine state from render intent through the install-unit
callback, inspector, grid runtime, and dispatch boundary. I found and fixed
the fail-open missing-callback default across every grid-capability consumer:
the grid runtime plus the inspector's single-display, multi-display, mutation,
and multi-selection paths all now fail closed. Their focused regressions omit
the callback and prove controls/mutations remain blocked. No additional branch
defects remain: the typed predicate is the shared authority, numeric `0`
persists, empty enums persist, generated browser artifacts are fresh, and the
legacy preview-shell ratchet is untouched.

## Validation

- `npm --prefix packages/layout-engine test` — 168 files / 1,032 tests passed.
- `npm --prefix apps/preview test` — 170 tests passed, including real Chromium flows.
- `node scripts/check_no_new_python.mjs` — passed.
- `node scripts/check-browser-bundle-fresh.mjs` — passed.
- `git diff --check main` — passed.
