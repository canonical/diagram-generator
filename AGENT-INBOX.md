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
  071 closeout: 062, then 063, then 061, then 064. `docs/specs.md` marks spec
  071 **Closeout Ready** and spec 062 **Active**.
- **Current slice:** spec 062 was drafted as its own package under
  `specs/062-parent-child-hug-resize-propagation/` from the existing Opus
  triage notes. It explicitly owns the `test-alignment-grid` parent/child hug
  resize contract and keeps that work separate from residual 048/065/063 scope.
- **Overnight run:** SpecKit is running on spec 062 only with `-MaxSpecs 1`.
  Logs:
  `tmp/overnight-spec-062-20260703-002159.log` and
  `tmp/overnight-spec-062-20260703-002159.err.log`.
- **Next:** let the 062 overnight run finish, then use the adversarial-review
  prompt below against everything landed since the last recorded review pass.

---

## Adversarial review prompt — post-071 closeout + spec 062 overnight

Use this **after** the current 062 overnight run finishes.

```text
Adversarial review request.

Scope: review everything landed since the last recorded adversarial review
baseline for this repo, with special attention to the post-071 closeout
hardening and the spec 062 overnight run.

Repository: diagram-generator
Primary branches/areas:
- feat/071-preview-render-node-graph late closeout follow-ups
- feat/062-parent-child-hug-resize-propagation overnight implementation

Commit range to audit:
- Start from: e4b90c4 (docs(071): record closeout adversarial review)
- Review every later commit now reachable from HEAD, including:
  - 9cd8560
  - 4798d30
  - 8d63b85
  - a71c246
  - 83c398d
  - all additional commits cherry-picked by the active 062 overnight run

Required sources:
- TODO.md
- docs/specs.md
- AGENTS.md handoff
- AGENT-INBOX.md
- specs/071-preview-render-node-graph/
- specs/062-parent-child-hug-resize-propagation/
- tmp/overnight-spec-062-20260703-002159.log
- tmp/overnight-spec-062-20260703-002159.err.log

Review goals:
1. Verify spec 071 really remains closeout-ready after the late hardening/docs
   follow-ups, and call out any false confidence, stale evidence, or reopened
   behavioral risk.
2. Verify spec 062's package, tasks, and any landed implementation actually
   match the Opus-ordered contract from docs/spec-reviews/inbox-triage.md row 13
   and were not silently broadened or narrowed.
3. Prioritize correctness bugs, behavioral regressions, missing save->reload
   proof, browser-proof gaps, or tests that only prove wiring instead of the
   user-visible contract.
4. Call out any queue/catalog drift: TODO order, docs/specs status, AGENTS
   handoff, and AGENT-INBOX state must agree.
5. Treat legacy-JS ownership growth, fake no-op test proofs, and stale review
   conclusions as findings even if tests are green.

Output format:
- Findings first, ordered by severity, with file/line references.
- Then open questions / assumptions.
- Then a short change summary only if needed.

Important:
- Do not spend time re-reviewing pre-e4b90c4 spec 071 work unless a later
  commit appears to regress it.
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

## Adversarial review — 2026-07-03 (spec 062)

Reviewer: Codex adversarial pass, branch `feat/062-parent-child-hug-resize-propagation`.
Scope: commits `83c398d..c2eef32`, with targeted runtime verification against the
landed `layout.ts` resize propagation change.

### Findings

- **H-1 (high) — spec 062 still fails for `HUG` children that are containers, not leaves.**
  `resolveChildWidths(...)` now clamps vertical non-fixed child widths to the
  resized parent cross-axis width (`packages/layout-engine/src/layout.ts:647`),
  but `propagateWidthAndRemeasure(...)` only updates `_layout.measuredW` on leaf
  frames (`packages/layout-engine/src/layout.ts:656-679`). Non-leaf `HUG`
  children only receive `_layout.resolvedW` (`packages/layout-engine/src/layout.ts:682`)
  and keep their stale wider `measuredW`, which `place(...)` later reuses for
  `HUG` width placement (`packages/layout-engine/src/layout.ts:806`,
  `packages/layout-engine/src/layout.ts:998`). Repro on the current branch with a
  minimal nested tree:
  fixed-width vertical parent (`width: 160`) -> `HUG` container child ->
  `HUG` leaf with stale authored `width: 192`. Result after `layoutFrameTree(...)`:
  parent placed width `160`, inner leaf placed width `120`, but the `HUG`
  container child still places at `208`, overflowing the resized parent. This
  violates FR-002's generic "child set to `HUG`" contract and means spec 062 is
  not actually closeout-ready yet.

- **M-1 (medium) — the closeout evidence overclaims coverage and is why H-1 slipped through.**
  The added regressions only exercise the leaf `small_box` case:
  `packages/layout-engine/tests/layout.test.ts:791-849`,
  `packages/layout-engine/tests/app-fresh-render.test.ts:326-361`,
  `apps/preview/src/persistence/frame-diagram.test.ts:1258-1288`, and
  `apps/preview/src/persistence/editor-hug-resize-regression.test.ts:156-189`.
  Despite that, the current closeout text states that "`HUG` children shrink"
  and that `test-alignment-grid` now proves the "full contract"
  (`specs/062-parent-child-hug-resize-propagation/evidence/validation-summary.md:21-33`,
  `docs/specs.md` spec 062 row, `specs/062-parent-child-hug-resize-propagation/spec.md:4`).
  The implementation and tests prove a narrowed leaf-child contract, not the
  spec's broader parent/child `HUG` propagation claim. At minimum, spec 062
  needs one repo-owned regression where the resized `HUG` child is itself a
  container before it can return to `Closeout Ready`.

### Open questions / assumptions

- I assumed FR-002 / SC-001 are intentionally generic and apply to any child
  frame, not just leaf boxes. If 062 was meant to be leaf-only, the spec and
  status docs need to narrow that wording explicitly before claiming closeout.
- I did not execute the full package/app test suites again in this review pass.
  The new high-severity finding was validated with targeted source reads plus a
  local `tsx` runtime repro against the checked-out branch.

