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

## Adversarial review — post-spec-062 closeout (2026-07-03)

Reviewer: Opus, branch `feat/062-parent-child-hug-resize-propagation`. Scope:
every commit reachable from HEAD since baseline `ae5521c`, namely `a2d7923`,
`b27a481`, `efde5b1`, `d4f7015`, `d5e7f44`. Method: `git diff` of the fix
commits, source/test reads of `layout.ts` and the added regressions, doc
cross-check, and a **fresh local re-run** of the full SC-005 battery (not a
paper claim).

**Verdict: no reopen. Spec 062 is genuinely Closeout Ready.** The nested
non-leaf `HUG` fix is real, proven at the geometry level (not wiring), and the
golden SVG suite passing is strong evidence it is not overfit. Findings below
are all low severity: doc-alignment drift and coverage-shape notes, none of
which block closeout.

### Validation re-run (independent, this session)

Green is real, not asserted:

- `npm --prefix packages/layout-engine exec vitest run tests/layout.test.ts` —
  76/76 pass.
- `npm --prefix packages/layout-engine test` — 157 files, **958/958** pass.
- `npm --prefix apps/preview test` — **159/159** pass.
- `node scripts/check_no_new_python.mjs` — ok, no new product-path Python.

The `test-box-styles` golden that the rerun-fix protects is inside the passing
layout-engine suite, so the "not overfit" claim in concern #3 is backed by a
live golden pass, not just by the targeted tests.

### Findings (severity order)

- **F1 (low, doc drift) — `TODO.md` still lists spec 062 as the next spec to
  tackle.** [TODO.md](TODO.md) "Next spec to tackle" enumerates `1. Spec 062`
  first, but 062 is now Closeout Ready and this inbox's prior handoff says "the
  remaining work queue starts at `spec 063`." A reader following `TODO.md`
  literally would re-open finished work. `docs/specs.md`, `AGENTS.md`, and the
  spec package all correctly say Closeout Ready; only `TODO.md`'s ordered list
  is stale. Fix: drop 062 from the numbered queue (or mark it done) so 063 is
  item #1.

- **F2 (low, coverage shape) — the nested-container fix has no browser proof;
  only the pre-baseline leaf `small_box` path does.** SC-003's real-browser
  proof (`apps/preview/src/persistence/editor-hug-resize-regression.test.ts`)
  and the fixture fresh-render proof (`app-fresh-render.test.ts`) both landed in
  the pre-baseline commit `a94bab0`. The actual subject of this review — the
  nested non-leaf `HUG` container recompute in `a2d7923`/`b27a481` — is proven
  only by a layout unit test and a persist→reload test. Both assert real
  geometry (`placedW < 192`, child within parent bounds, leaf within container),
  so this is behavior coverage, not wiring coverage, and is acceptable. Note it
  only so a future engine-onboarding change knows the nested path is unit +
  persist guarded, not browser guarded.

- **F3 (low, spec text vs implementation) — "root/top-level" preservation is
  really only a root branch plus the `>=` guard.** The validation summary and
  spec status say constrained remeasurement "was collapsing unconstrained
  root/top-level `HUG` widths." The code only adds an explicit `isRoot` branch
  in `propagateWidthAndRemeasure`
  ([layout.ts](packages/layout-engine/src/layout.ts#L697-L714)); a *top-level*
  (non-root) `HUG` child is preserved incidentally because its `resolvedW`
  equals its `previousMeasuredW`, so the `resolvedW >= previousMeasuredW` guard
  returns before recompute. Behaviorally correct and suite-proven, but the prose
  overstates a dedicated top-level path that does not exist. Cosmetic.

- **F4 (low, axis asymmetry) — the fix and its tests are width-only.** FR-002
  and US1 mention "width/height," but the new recompute and every new assertion
  target width (`placedW`). This is defensible: width propagates top-down (the
  genuinely hard axis), while `HUG` height is summed bottom-up by
  `propagateHeightChanges` + `measure`, so a shrinking parent's `HUG` container
  height reflows naturally. No height regression is likely, but there is no
  explicit test pinning nested `HUG` height reflow. Leave as a known coverage
  edge, not a bug.

### Non-findings verified (did not hold up as problems)

- **Fix location vs spec "Likely Owners":** the change lives entirely in
  `layout.ts`, not the predicted resize-interaction files. This is a strength,
  not drift — fixing the shared measure/remeasure contract makes live-resize,
  persist, and fresh-render agree by construction. The spec status notes call
  this out honestly.
- **Legacy-JS ownership growth:** none. The diff touches `layout.ts` (TS),
  tests, and docs only. `editor-base.js` stays a thin handle renderer. No
  spec-046 regression.
- **Overfit risk:** the `test-box-styles` golden regression was found *by* the
  full rerun and fixed in `b27a481`; the whole 958-test suite (including golden
  parity) is green, which is exactly the guard that would catch an overfit
  width hack.
- **Overnight-log "green":** taken as diagnostic only. The err log shows a
  Windows worktree-cleanup error (`failed to delete ... Function not
  implemented`) that is filesystem noise, not a test failure. Real closeout
  rests on the manual reinstall rerun plus my independent rerun above, not on
  the agent-loop log.

### Open questions / assumptions

- I did not exercise a live Chromium drag for the nested-container case (F2);
  the leaf browser proof plus nested unit + persist proofs are treated as
  sufficient for closeout.
- Assumed `resolvedW < previousMeasuredW` is the only tightening path that can
  strand a stale `HUG` container width during pass 1.5. The passing golden and
  coercion-lifecycle suites support this, but it was not exhaustively proven for
  min-width-constrained children (where `contentBasedW` could exceed
  `resolvedW`); that is a theoretical internal-field edge, not an observed
  placement bug.

### Recommended action

Only F1 warrants an edit before moving on: prune spec 062 from the `TODO.md`
numbered queue so 063 is the literal next item. F2–F4 are notes for the next
engine-breadth author, not closeout blockers.

---

## Adversarial review prompt — next pass after spec 062

Use this for the next adversarial review after additional work lands on top of
`feat/062-parent-child-hug-resize-propagation` or when the next queue item is
ready for audit.

```text
Adversarial review request.

Scope: review everything landed after the completed spec 062 closeout review.
Treat the current 2026-07-03 Opus review in AGENT-INBOX.md as the baseline, and
focus on whether later work regresses the now-Closeout-Ready 062 behavior or
misstates the next queue item.

Repository: diagram-generator
Current branch at review time: <fill in actual branch>

Baseline review to trust:
- AGENT-INBOX.md section "Adversarial review — post-spec-062 closeout (2026-07-03)"
- Commit-level baseline for spec 062 closeout state: d4f7015
  (`docs(062): clear stale review queue state`)

Audit:
1. Review every commit reachable from HEAD after `d4f7015`.
2. If the branch is no longer `feat/062-parent-child-hug-resize-propagation`,
   still check whether any later change regresses spec 062's hug-resize
   contract, queue alignment, or closeout claims.

Required sources:
- TODO.md
- docs/specs.md
- AGENTS.md
- AGENT-INBOX.md
- specs/062-parent-child-hug-resize-propagation/
- any new spec package that is now next in the queue
- any new overnight logs or evidence files produced since the 2026-07-03 review

Review goals:
1. Verify no later change reopens spec 062's parent/child hug resize bug,
   especially the nested non-leaf `HUG` width path.
2. Prioritize correctness bugs, missing browser proof, missing persist->reload
   proof, queue/catalog drift, stale closeout text, or tests that only prove
   wiring instead of user-visible behavior.
3. Check that TODO.md remains in Opus's exact order and does not keep completed
   specs at the top of the queue.
4. Treat legacy-JS ownership growth, fake green validation, and evidence drift
   as findings even if the suite is green.

Output format:
- Findings first, ordered by severity, with file/line references.
- Then open questions / assumptions.
- Then a short change summary only if needed.

Important:
- Do not re-review pre-`d4f7015` history unless a later commit appears to
  regress it.
- Assume tests can be wrong. If the visible contract is not truly proven, mark
  that as a finding.
```

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

