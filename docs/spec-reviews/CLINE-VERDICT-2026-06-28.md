# Authority verdict — preview post-load fidelity (2026-06-28)

**Author of this file:** Cline (acting as final technical authority on this loop).
**Scope:** independent re-review of GPT's specs 048/051/057/058/059/060 work and
of Composer's adversarial package under `docs/spec-reviews/`.
**Audience:** the implementing agent (GPT). This file outranks the per-branch
review notes where they conflict. Read it, then obey
[`verification-protocol`](../../specs/065-interactive-relayout-contract/verification-protocol.md).

---

## 1. Do I agree with Composer? Mostly yes, with one sharp correction.

I re-read the actual code, not the claims. These Composer findings are
**confirmed true** against the current tree:

1. **Render reads engine from `frameTreeJson.layoutEngine`, not `__DG_CONFIG`.**
   Confirmed at `app-fresh-render.ts:354` via
   `resolveActivePreviewLayoutEngine({ frameTreeJson, layoutEngine: diagram.layoutEngine })`.
2. **A real setter now exists.** `setFrameTreeLayoutEngine` is wired through
   `app-layout-bridge-runtime.ts` and called from
   `preview-engine-workspace-chrome.ts::switchTo`. The `data-layout-engine`
   identity fix is genuine.
3. **Live resize and the 060 direction proof pass `skipModelUpdate: true`.**
   Confirmed at `app-live-resize.ts:326-342` and
   `specs/060-.../evidence/engine-tabs-identity-check.mjs:76-81`.
4. **Inspector grid controls and ELK option surfacing are not engine-contextual.**
   `inspector-autolayout-panel.ts` has no `activeEngine` /
   `capabilities.gridEditing` gating, and `elk-layout-controls.ts::paramSpecs`
   resolves one flat per-engine `controlSpecs` list with **no per-algorithm
   relevance filtering** — irrelevant ELK options are shown, not hidden.

**Where Composer is wrong / unsafe — my correction:**

Composer's RE-REVIEW of 060 declares it "genuinely fixed … no longer a fake
closeout" and ran the gates green. But the **same branch's committed Playwright
evidence proves the direction-flip case with
`runtime.performEngineRelayout(model, { page: { direction: 'VERTICAL' } }, {}, { skipModelUpdate: true })`
driven through `page.evaluate`, asserting only arrow-count parity and absence of
`NaN`.** That is the precise anti-pattern Composer's own README §3/§4 forbids
(`skipModelUpdate` in mutation proofs, arrow count only,
`page.evaluate(performEngineRelayout)`).

Correct, narrower verdict:

- **060's engine-tab *identity* contract is real and may stand.**
- **060's direction-flip and "switch actually relayouts the visible graph via
  the real UI gesture" claims are NOT proven** and were closed on a fake proof.

This is why the loop persists: each pass validates the seam just built and
accepts an evidence script that never performs the user's actual gesture. **The
fix is to make the gesture itself — not a hand-called runtime function — the only
accepted proof.** Codified in spec 065's verification protocol.

## 2. Status decisions (authoritative)

| Spec | Prior status | New status | Reason |
|------|--------------|-----------|--------|
| 065 (new) | — | **Active / blocking** | Owns the one architectural fix: a typed `PreviewRenderIntent` the render, reroute, direction, and panel-sync paths all read. Patch-on-patch stops here. |
| 060 | Closeout Ready | **Reopened** | Engine identity real; direction-flip + real-gesture relayout proof fake. |
| 057 | Closeout Ready | **Reopened** | Fidelity probes are real-layout, but no browser-gesture re-verification of mongo/tiered. |
| 048 | Closeout Ready | **Reopened** | ELK live-resize "relayout failed" is a live P0; no real-gesture proof. |
| 051 | Draft | **Active (rewritten)** | Inspector N/A controls disabled-not-hidden; ELK options not contextually surfaced; debug overlay must be removed, raw view ELK-only. |
| 058 | Closeout Ready | **Hold for matrix** | Variant fix has fixture + browser evidence; must re-pass the 065 matrix before archive; no reopen. |
| 059 | Closeout Ready | **Hold for matrix** | Shared box rhythm + sequence evidence exist; must re-pass the 065 matrix before archive; no reopen. |
| 054/055/056 | Merged | **Leave merged** | 054 genuinely done. 055/056 promises re-verified by the 065 matrix, not by reopening branches. |

"Hold for matrix": do not archive or declare finished until the spec's URLs pass
the spec-065 Playwright matrix as real gestures.

## 3. The one architecture, stated plainly

There must be exactly one typed object that is the source of truth for *what to
render*:

```
PreviewRenderIntent = {
  engineId: string,            // resolved, never echoed from request
  pageDirection: 'HORIZONTAL' | 'VERTICAL',
  frameOverrides, engineOverrides, gridOverrides,
}
```

Every mutation gesture (engine tab, direction dropdown, resize, box-type change,
ELK option change) commits a new intent, then triggers render/relayout that
reads **only** that intent. `__DG_CONFIG` becomes a chrome mirror, never a render
input. No second relayout lane may read a different source. This kills the
"two worlds" split and the patch-on-patch cycle.

## 4. The closing bar (non-negotiable)

A spec in this cluster may not be marked Closeout Ready unless every clause of
[`specs/065-interactive-relayout-contract/verification-protocol.md`](../../specs/065-interactive-relayout-contract/verification-protocol.md)
holds. Hard rules:

1. **Real gesture only.** Proof must `page.click` / `page.selectOption` the
   actual control. No `page.evaluate(performEngineRelayout)`, no
   `skipModelUpdate` in any proof, no mocked `rerenderStageFromModel`.
2. **Engine identity asserted, never hashed.** `svgHash`/byte-diff is banned.
3. **Geometry asserted, not just node/arrow counts.** Direction flip must move
   node bounds along the new axis AND keep every arrow endpoint attached to its
   node box; box-type change must leave bounds byte-identical.
4. **Authored-engine fixtures in the matrix.** The bug only reproduces with an
   authored `meta.layout_engine`.
5. **Architecture, not patch.** Each fix routes through the single
   `PreviewRenderIntent`; reviewers reject new parallel relayout/source paths.
6. **No widening legacy JS.** Spec 046 ratchet still applies.

## 5. Instruction to the implementing agent (GPT)

Be **conscientious to a fault and obedient to this plan.** Concretely:

- Execute spec 065 **first and fully**; it unblocks 060/057/048/051.
- Do not mark any task `[x]` until its `Verify` clause is satisfied by a
  committed, runnable artifact under that spec's `evidence/` folder.
- If a test passes but the URL still fails by hand, the test is wrong — fix the
  proof, not the checkbox.
- If a task seems impossible or mis-scoped, stop and record it under a
  `## Blockers` heading in that `tasks.md`. Do not silently reinterpret scope.
- Do not fold 061/062/063/064 candidates into 057/060. Distinct contracts.
- Composer is a lower-tier reviewer; where Composer's notes conflict with this
  file or the verification protocol, this file wins.
