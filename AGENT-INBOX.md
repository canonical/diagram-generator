# Agent inbox

Focused last-session → next-session handoff only. Keep this short.

- **Human notes:** [`INBOX.md`](INBOX.md) — author → agent.
- **Execution order & backlog:** [`TODO.md`](TODO.md) (read at session start).
- **Active-spec index:** [`docs/specs.md`](docs/specs.md).
- **Durable per-spec detail:** `specs/<id>-<slug>/`.

Do not park full session logs, spec inventories, or validation transcripts
here — those belong in the relevant `specs/<id>-<slug>/` package.

---

## Handoff — 2026-07-02

- **Branch / tree:** `feat/071-preview-render-node-graph`. Committed checkpoints:
  T021 `9b08d21`, T022 `69e68fc`, T016/T017 `be96d32`. Current working slice
  implements Phase 3 T030/T031/T032 and updates the spec/handoff docs.
- **Adversarial reviews done:** the earlier Opus review for Phases 1/2 remains in
  `specs/071-preview-render-node-graph/evidence/adversarial-review.md`. A new
  Codex Phase 3 review is in
  `specs/071-preview-render-node-graph/evidence/phase-3-adversarial-review.md`.
  Verdict: no reopen; residual notes are low-risk only (legacy helper export,
  no cook-cache eviction).
- **Validation completed on the current working slice:**
  `npm --prefix packages/layout-engine test` → 156 files / 949 tests green.
  `npm --prefix apps/preview test -- editor-live-repaint-regression` → full
  preview suite green from the preview app, including the Chromium switch/isolation
  regressions and the new return-to-layered `viewBox` determinism assertions.
- **Still open in spec 071:** T023 (let save delete an emptied non-active node
  bucket) and T024 (browser proof that non-active buckets survive save→reload),
  then Phase 4 T040+ closeout work.
- **Next:** commit the Phase 3 slice, then either clear T023/T024 or move to
  Phase 4 onboarding/inventory closeout.

---

## Adversarial review of `phase-3-adversarial-review.md` — 2026-07-02

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

### Findings against the review

- **M-1 (medium) — the "sole writer" invariant is unguarded, not just uncleaned.**
  The review frames P3-1 as a cosmetic export-cleanup candidate. It is more than
  that. Product `src` has exactly two functions that assign
  `__DG_previewRenderIntent`: the switch node (`preview-switch-node.ts:243`) and the
  still-exported legacy helper (`preview-render-intent.ts:155`). The helper remains
  in the public barrel (`preview-shell-state-barrel.ts:151`) and is still exercised
  by `app-fresh-render.test.ts:344`. So the switch node is the sole *current caller*,
  not the sole *possible* writer. Unlike Phase 1's T017 — which added an automated
  preview-shell scan that fails on any stray `stage.replaceChildren` — Phase 3 added
  **no** equivalent guard. The T030 "grep proves no direct commit" evidence is a
  one-time manual grep, so nothing fails if a future file writes render intent
  through the legacy helper or assigns `__DG_previewRenderIntent` directly. For a
  spec whose whole point is a single ownership seam scaling to 50/150/500 engines, a
  live parallel writer with no test guard is a latent regression vector. Recommend a
  small guard test (mirror of T017) that fails on any render-intent write outside
  `preview-switch-node.ts`, or delete/inline the legacy helper.

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

## Adversarial review of spec 071 closeout claim — 2026-07-02

Reviewer: Codex, branch `feat/071-preview-render-node-graph`, HEAD `48778cf`.
Scope: audit the current closeout-ready claim against the tree as it exists now,
including the Phase 4 onboarding proof and the SC-002 browser evidence.

**Verdict:** do not treat spec 071 as fully closed yet. I found one proof gap in
the closeout criteria and one low-risk evidence-drift issue. No product-path
code changes were made in this pass.

### Findings

- **R-1 (high) — SC-002 is not actually proven by the current browser evidence.**
  `apps/preview/src/persistence/editor-live-repaint-regression.test.ts:655-665`
  computes `classification` as either `"equivalent-geometry"` or
  `"distinct-geometry"` from a bounds comparison, then asserts only that the
  result is one of those two strings. That assertion is tautological, so the
  test does not verify the spec requirement:
  "either bounds change or the evidence records verified-equivalent geometry
  with matching `data-layout-engine`, active node id, and fitted canvas." The
  current probe does check `data-layout-engine` and active option-bucket sync,
  but it never captures an explicit `activeNodeId`, never asserts the
  equivalent-geometry branch, and never records a verified-equivalent result
  when bounds stay the same. As written, SC-002 can pass even if the
  equivalent-geometry path is unimplemented. Action: reopen the closeout proof
  long enough to replace this tautology with a real branch assertion. Either
  drive a known equivalent-geometry engine pair, or keep the current probe and
  assert:
  1. distinct geometry changes bounds, or
  2. equivalent geometry preserves bounds *and* matches selected engine,
     fitted `viewBox`, and an explicitly captured active node id.

- **R-2 (low) — the inventory evidence is stamped to a pre-closeout commit.**
  `specs/071-preview-render-node-graph/evidence/render-path-inventory.md`
  identifies itself as a post-migration snapshot at commit `9b5178d`, while the
  branch head is now `48778cf`. I did not find a contradictory owner path in the
  current tree, so this is documentation drift rather than a correctness issue.
  Still, if spec 071 stays open for the SC-002 proof gap, refresh the inventory
  header to the commit that actually carries the closeout verdict.

### Checked and held

- The Phase 4 onboarding proof is real enough for its stated target:
  `packages/layout-engine/tests/preview-node-onboarding.test.ts` registers
  `dummy-onboarding-grid`, switches it through
  `commitPreviewSwitchNodeLayoutEngine(...)`, renders through the shared render
  seam, and source-guards `preview-render-node.ts`,
  `preview-switch-node.ts`, `scripts/preview/editor.js`, and
  `scripts/preview/layout-bridge.js` against dummy-engine branching.
- The Phase 3 sole-writer guard is now materially stronger than the earlier
  handoff suggested: `packages/layout-engine/tests/preview-switch-node.test.ts`
  source-scans product TypeScript for `__DG_previewRenderIntent =` writes
  outside `preview-switch-node.ts`.
- I did not find a second direct stage-mount owner or a second direct
  render-intent writer in current product code.

### Next

- Fix the SC-002 browser proof gap before calling the package fully
  closeout-ready.
- After that, refresh the evidence headers/handoff state so the branch record
  matches the actual closeout commit.

