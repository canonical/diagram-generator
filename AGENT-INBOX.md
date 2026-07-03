# Agent inbox

Focused last-session → next-session handoff only. Keep this short.

- **Human notes:** [`INBOX.md`](INBOX.md) — author → agent.
- **Execution order & backlog:** [`TODO.md`](TODO.md) (read at session start).
- **Active-spec index:** [`docs/specs.md`](docs/specs.md).
- **Durable per-spec detail:** `specs/<id>-<slug>/`.

Do not park full session logs, spec inventories, or validation transcripts
here — those belong in the relevant `specs/<id>-<slug>/` package.

---

## Handoff — 2026-07-03

- **Branch / tree:** `feat/062-parent-child-hug-resize-propagation`.
- **Queue status:** `TODO.md` now reflects the remaining Opus order after spec
  071 closeout: 062, then 063, then 061, then 064. `docs/specs.md` now marks
  specs 071 and 062 **Closeout Ready**.
- **Current slice:** the 2026-07-03 adversarial-review follow-up and SC-005
  closeout rerun are complete. `layout.ts` now refreshes nested non-leaf `HUG`
  widths only when a frame was actually tightened and preserves the requested
  root width used for placement, which fixed the follow-on `test-box-styles`
  golden regression uncovered during the full rerun.
- **Validation in this slice:** `npm --prefix packages/layout-engine exec vitest
  run tests/layout.test.ts`, `npm --prefix packages/layout-engine test`,
  `npm --prefix apps/preview test`, and
  `node scripts/check_no_new_python.mjs` passed.
- **Review status:** no active spec 062 adversarial-review findings remain in
  this inbox; the remaining work queue starts at `spec 063` in `TODO.md`.

---

## Handoff — 2026-07-02

- **Branch / tree:** `feat/071-preview-render-node-graph`.
- **Review status:** the Phase 3 review remains non-reopening, and no active
  adversarial-review findings remain in this inbox. The closeout review gap on
  SC-002 is fixed in the browser regression, the stale legacy-writer finding
  was retired after verifying the helper/export path no longer exists in
  product code, and the determinism proof now includes a forced-recook
  regression alongside the live `viewBox` parity check. The only surviving note
  is P3-2 (unbounded cook cache), explicitly deferred as future engine-scaling
  work rather than a spec 071 reopen.
- **Current slice:** spec tasks now include T042/T043 for the closeout-review
  follow-up plus T033 for the Phase 3 review follow-up. The SC-002 probe
  explicitly captures active node id plus frame-tree `layoutEngine`, same-bounds
  switches must also preserve the fitted `viewBox` while syncing rendered
  engine, selected tab, and option bucket, and the switch-runtime regression now
  proves that restoring layered params performs a fresh third cook instead of
  reusing the cached layered render.
- **Validation in this slice:** rerun
  `npm --prefix packages/layout-engine test -- app-layout-bridge-runtime` and
  `npm --prefix apps/preview test -- editor-live-repaint-regression`.
- **Next:** if further review is requested, use the forced-recook regression,
  the strengthened SC-002 probe, and the branch-scoped render-path inventory as
  the closeout baseline.

---

## Historical adversarial review context — 2026-07-02

Reviewer: Opus meta-review, branch `feat/071-preview-render-node-graph`. Scope:
audit the Codex Phase 3 review's claims against the actual tree, not the tasks.

**Overall:** the Phase 3 review is basically sound. T030/T031/T032 hold and the
supporting tests are real, not mocks. But the review's headline "sole writer"
argument rests on a narrow grep and understates one structural gap. No hard
reopen, but two findings should be reclassified upward before Phase 4.

### Confirmed accurate

- **T031 cook reuse is real.** `app-layout-bridge-runtime.test.ts:805` asserts
  `cookedEngines` = `['elk-layered', 'dagre']` on a layered→dagre→layered path —
  the return does not re-cook. Claim holds.
- **T032 determinism test is real.** `editor-live-repaint-regression.test.ts`
  (~line 704) runs layered→radial→layered→dagre→layered with exact `fittedViewBox`
  equality on both returns to layered. The test exists and is structured as
  described.
- **P3-1 is factually correct.** `commitPreviewRenderIntentToWindow` does still
  exist (`preview-render-intent.ts:147`) and is no longer called from product
  `src/`.
- **`publishRenderIntentToWindow` is not a bypass.** The bridge-runtime helper
  (`app-layout-bridge-runtime.ts:1782`) that the render-path-inventory flagged as a
  "proto-switch" now delegates to `commitPreviewSwitchNode`. Good — the review was
  right not to treat it as a second writer, though it never explicitly cleared it.

### Historical findings against the review (resolved below)

- **M-2 (medium) — T032 proves cache stability, not cook determinism.** The
  return-to-layered `viewBox` equality is guaranteed by cook-cache reuse: the
  layered node stays clean across the radial/dagre detours, so the switch node hands
  back the *same cached cooked object*. The test therefore cannot distinguish a
  genuinely deterministic re-cook from an identical cached object, yet the spec
  T032 wording ("identical (source, selected node, params) yields byte-identical
  fitted viewBox regardless of prior interaction order") reads as a cook-determinism
  claim. The "regardless of interaction order" property is satisfied trivially by
  caching. A stronger proof would force a re-cook (mark layered dirty, or change then
  restore a param) and still assert the identical `viewBox`. As written, the proof is
  entangled with the very cache it is meant to be independent of. Not a reopen, but
  the review should not present it as a full determinism proof without this caveat.

- **L-1 (low) — review grep scope hid a live legacy-writer test.** The review's
  grep was scoped to `packages/layout-engine/src`, which is why it never surfaced
  that `app-fresh-render.test.ts` still imports and calls the legacy writer. Minor,
  but it means the old commit path still has behavioral coverage pinning it in place,
  which slightly raises the cost of the M-1 cleanup.

- **P3-2 agreement (low).** The unbounded cook cache note is fair and correctly
  scoped as a Phase 4 / 50+ engine concern.

### Verdict

Concur with "no hard reopen" for T030–T032. But the Phase 3 review under-rates its
own P3-1: reclassify from "cleanup candidate" to a **medium unguarded-invariant**
item, and add a T017-style guard test before Phase 4 onboarding lands (onboarding
is exactly when a new engine author might reach for the legacy helper). Also add a
one-line caveat to the T032 evidence that it is a cache-stability proof unless a
forced-recook assertion is added. Neither blocks the Phase 3 commit.

**Verification method:** static — grep + targeted source/test reads. I did not
re-execute the 949-test suite or the Chromium preview suite, so the review's
"green" counts are taken at face value; every structural claim I could check by
reading the tree held up.

---

## Resolved Phase 3 review follow-up — 2026-07-02

- **M-1 stale / resolved:** the legacy render-intent writer path the review
  called out is no longer present in product code. `preview-render-intent.ts`
  now only builds/applies intent payloads, `preview-shell-state-barrel.ts` no
  longer exports a commit helper, `app-fresh-render.test.ts` uses
  `commitPreviewSwitchNode(...)`, and
  `packages/layout-engine/tests/preview-switch-node.test.ts` keeps the
  source-scan guard on direct `__DG_previewRenderIntent =` writes outside
  `preview-switch-node.ts`.
- **M-2 resolved:** `packages/layout-engine/tests/app-layout-bridge-runtime.test.ts`
  now forces an active layered param change and restore, proves the restore
  performs a fresh third cook, and leaves the existing browser regression to
  assert the unchanged fitted `viewBox` after that forced recook.

---

## Resolved closeout review follow-up — 2026-07-02

- **R-1 resolved:** `editor-live-repaint-regression.test.ts` no longer asserts a
  tautological classification. The browser proof now passes only when the engine
  switch either changes bounds or proves equivalent geometry with matching
  rendered engine, explicit active node id, frame-tree `layoutEngine`, selected
  tab, option bucket, and fitted `viewBox`.
- **R-2 resolved:** `render-path-inventory.md` now uses a branch-scoped header
  instead of a stale commit stamp, and spec/handoff text was refreshed to match
  the strengthened SC-002 proof.

---

## Resolved spec 062 adversarial review follow-up — 2026-07-03

- **H-1 resolved:** `packages/layout-engine/src/layout.ts` now recomputes
  non-leaf `HUG` `measuredW` from constrained child measurements, so nested
  `HUG` container children no longer keep stale width under a smaller fixed
  parent.
- **M-1 resolved:** the closeout text/evidence no longer overclaims the
  leaf-only `small_box` path as the full contract, and repo-owned regressions
  now include a nested `HUG` container child round-trip in
  `packages/layout-engine/tests/layout.test.ts` and
  `apps/preview/src/persistence/frame-diagram.test.ts`.
- **Closeout rerun resolved:** the owning `apps/preview` persistence suite and
  the full SC-005 validation battery were rerun successfully in this worktree.
  That rerun also caught and fixed a top-level `HUG` width regression in
  `test-box-styles`, so spec 062 is back to `Closeout Ready`.

