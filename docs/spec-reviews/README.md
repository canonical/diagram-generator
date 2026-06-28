> **AUTHORITY OVERRIDE 2026-06-28** — see
> [`CLINE-VERDICT-2026-06-28.md`](./CLINE-VERDICT-2026-06-28.md). This README's
> RE-REVIEW declaring spec 060 "genuinely fixed" is **partly wrong**: 060's
> committed Playwright evidence (`engine-tabs-identity-check.mjs`) proves the
> direction-flip case with `runtime.performEngineRelayout(..., { skipModelUpdate: true })`
> via `page.evaluate` and arrow-count-only — the exact anti-pattern §3/§4 ban.
> 060's engine **identity** fix stands; its direction-flip + real-gesture
> relayout claims are void. The single fix is now owned by spec 065
> (`PreviewRenderIntent`) with `verification-protocol.md` as the closing gate.
> Where this README conflicts with the verdict, the verdict wins.

# Spec reviews 054–060 — adversarial pass + inbox reconciliation

**Date:** 2026-06-28 (re-reviewed same day after GPT's 060 fix)
**Reviewer stance:** adversarial. Assume each "Closeout Ready" / checked task is
false until a real browser proves the *user-visible* behavior, not a mocked seam.
**Trigger:** the author reports the same regressions over and over while the
implementing agent keeps marking specs 054–060 done. This package finds the
shared root cause, reconciles every `INBOX.md` note against the specs, and
rewrites the specs so the work cannot be closed on green-but-meaningless tests.

> ## RE-REVIEW UPDATE (2026-06-28, second pass)
>
> GPT said 060 is done. I re-read the actual code with maximum skepticism. This
> time **the core root cause is genuinely fixed** — see `branch-060.md` for the
> verified chain. The engine-switch path now commits the chosen engine into
> `frameTreeJson.layoutEngine` before render, `renderFreshPreviewSvg` stamps a
> truthful `data-layout-engine` from the *resolved* manifest, there is a real
> (non-mock) `app-fresh-render` contract test on the authored-ELK→v3 case, and a
> Playwright check that asserts engine **identity** (not svgHash). I ran the
> gates myself: layout-engine **853 passed**, apps/preview **145 passed**,
> no-new-python **ok**.
>
> **Follow-up status before merge:** the authored Juju YAML drift was reverted on
> 060, the tree-compatibility work (`isArrowGraphTree`, `requiresTree`) was split
> out for spec 057, and the 060 evidence was narrowed so it proves engine intent
> without depending on the 057 exposure gate. Net: 060's headline contract is real
> and provable; the remaining fidelity/exposure work continues in 057.

Read this file first, then the per-branch review that matches the branch you are
on. Each per-branch file is self-contained so the implementing agent can work
**one spec on one branch at a time** and still see the whole picture.

| File | Branch(es) | What it covers |
|------|-----------|----------------|
| [`branch-054-055-056-merged.md`](./branch-054-055-056-merged.md) | merged to `main` | Why the three "merged" specs did not actually fix the inbox bugs |
| [`branch-057.md`](./branch-057.md) | `feat/057-graph-engine-fidelity-and-example-fit` | ELK fill / dropped compound children / example-fit |
| [`branch-058.md`](./branch-058.md) | `feat/058-layer-tree-inspector-selection-ergonomics` | layer-tree keyboard nav + `unknown` variant |
| [`branch-059.md`](./branch-059.md) | `feat/059-cross-document-style-source-of-truth` | one shared box-rhythm/style source; sequence parity |
| [`branch-060.md`](./branch-060.md) | `feat/060-output-pane-engine-tabs-rerender` | **the core engine-switch-does-nothing defect** |
| [`inbox-triage.md`](./inbox-triage.md) | n/a | Every `INBOX.md` note mapped to a spec (incl. new specs needed) |


---

## 1. The one finding that explains the loop

**Switching the engine tab never changes the engine the renderer uses.**

Verified path:

1. `preview-engine-workspace-chrome.ts::switchTo()` updates workspace state and,
   via `setRuntimeWorkspaceState()`, writes only `__DG_CONFIG.active_engine_id` /
   `__DG_CONFIG.layout_engine` (chrome file lines ~70–88, 244–268).
2. It then calls `__DG_rerenderPreviewEngineWorkspaceStage()` →
   `getCompatFacade().rerenderStageFromModel()`
   (`app-grid-editor-install-unit.ts:1154`).
3. That resolves to `rerenderPreviewStageFromModelHost` →
   `rerenderPreviewStageHost` → `renderFreshSvg` →
   **`renderFreshPreviewSvg`** (`app-fresh-render.ts:310`).
4. `renderFreshPreviewSvg` picks the engine from
   **`diagram.layoutEngine`** (lines 343–348), i.e. from
   `state.frameTreeJson.layoutEngine` — **not** from `__DG_CONFIG`.

Nothing in the switch path ever updates `state.frameTreeJson.layoutEngine`
(there is no `setFrameTreeLayoutEngine` / `setPreviewLayoutEngine` anywhere —
confirmed by search). So:

- On a document with an authored `meta.layout_engine` (juju-bootstrap,
  mongo-octavia-ha, support-engineering-flow), the frame-tree JSON always carries
  the authored engine. Clicking a tab cannot change the rendered layout.
- "Switch to v3 still shows ELK" (INBOX line 31) and "clicking any of these leads
  to no change" (INBOX lines 14–23) are the **same single bug**, not eight.

### Why the tests are green anyway (the real process failure)

- `preview-engine-workspace-chrome.test.ts` and
  `app-grid-editor-install-unit.test.ts` **mock** `rerenderStageFromModel` /
  `getSceneFacade().rerenderStageFromModel` to push the literal string
  `'rerender'`. They assert the callback is *wired*, never that the chosen engine
  actually drove the layout.
- The spec 060 Playwright "proof" asserts `svgChanged` / a changed `svgHash`. On
  `support-engineering-flow` the authored engine is `elk-force`; switching to
  `Dagre` may change SVG bytes for unrelated reasons (route jitter, measurement)
  without the chosen engine being honored, and the fixture used does *not* isolate
  "is the output now a Dagre layout?". A hash diff is **not** proof of fidelity.

**Net:** the agent has validated the *seam* (a function got called) instead of
the *contract* (the rendered diagram now uses the engine I picked). Every spec in
this cluster repeats that mistake. The rewritten specs below make contract-level
browser proof mandatory and forbid mock-only closeout.

---

## 2. The defect cluster (why slicing into 6 specs backfired)

Specs 055, 056, 057, 059, and 060 are all facets of **one** architectural gap:
*the active engine / layout intent is not the single source of truth that the
render, reroute, and style paths all read from.*

- 055 added workspace **state** but left the **render** reading a different source.
- 060 moved the **chrome** and added a rerender **callback** but still did not
  thread engine identity into `frameTreeJson` before render.
- 056 fixed reroute invalidation for *frame overrides* but the direction-flip
  (horizontal→vertical, INBOX line 82) is still reported broken because direction
  is an engine/layout input, not a frame-override entry.
- 057 tightened *exposure* (which tabs show) but not *fidelity* (does the shown
  engine produce a correct layout) for the reported fixtures.
- 059 (style source of truth) has **no commits at all** despite "In Progress".

The fix is to treat the active layout engine + page direction as one typed
"render intent" that the switch path commits into the frame-tree before
`renderFreshPreviewSvg` runs, and to prove fidelity per engine in the browser.

---

## 3. Global closeout gate (applies to every spec in this package)

A spec in this cluster may **not** be marked Closeout Ready unless ALL hold:

1. **No mock-only proof for user-visible behavior.** Any test that mocks
   `rerenderStageFromModel`, `renderFreshSvg`, or `renderFreshPreviewSvg` may
   prove wiring only. The behavior claim needs a test that runs the *real*
   `renderFreshPreviewSvg` (as `app-fresh-render.test.ts` already does) OR a
   scripted browser assertion.
2. **Engine fidelity is asserted, not hashed.** "The SVG changed" is banned as
   proof. Assert an engine-distinguishing signal: a `data-layout-engine`
   attribute on the rendered root, or a layout invariant only the chosen engine
   produces (e.g. orthogonal edge routing for `elk-layered`, radial node
   placement for `elk-radial`).
3. **Authored-engine fixtures are in the matrix.** The proof set MUST include at
   least one fixture with an authored `meta.layout_engine`
   (`mongo-octavia-ha`, `support-engineering-flow`) — not only blank-engine
   fixtures, because the bug only reproduces when an authored engine exists.
4. **Playwright self-check is recorded** (see §4) under the spec's `evidence/`.
5. **`persist → reload` regression** for any save-path change (existing repo gate).

---

## 4. Mandatory Playwright self-check protocol

Run this before claiming any spec in this cluster is done, and paste the script +
JSON result into the spec's `evidence/` folder.

```bash
# Rebuild the browser bundle and start the server FRESH. A stale cached bootstrap
# is exactly why 060 only "worked after a restart".
npm --prefix packages/layout-engine run build:browser
npm run preview   # serves http://127.0.0.1:8100
```

For the engine-switch fidelity check, drive a real browser against an
**authored-engine** fixture and assert the *engine actually changed*, not a hash:

```js
// pseudo-Playwright — adapt to the repo's harness
await page.goto('http://127.0.0.1:8100/view/v3:mongo-octavia-ha');
const before = await page.getAttribute('#stage svg', 'data-layout-engine');
await page.click('#engine-switcher-tabs [data-engine-id="v3"]');
await page.waitForFunction(() =>
  document.querySelector('#stage svg')?.getAttribute('data-layout-engine') === 'v3');
const after = await page.getAttribute('#stage svg', 'data-layout-engine');
// REQUIRED: after === 'v3' && after !== before
```

If `#stage svg` does not expose the engine it rendered with, **that is the first
task**: have `renderFreshPreviewSvg` stamp `data-layout-engine` on the rendered
root so the contract is observable. Do not proceed on a hash diff.

Re-verify the concrete inbox URLs by hand in the same session:

- `/view/v3:juju-bootstrap-machines-process` — selected authored-engine tab switches visibly relayout
- `/view/v3:mongo-octavia-ha` — v3 tab shows native layout (AZ1–3 beside the VM
  boxes), not ELK
- `/view/v3:tiered-network-architecture` — autolayout horizontal→vertical keeps
  arrow attachments
- `/view/v3:service-handshake-sequence` — one font size, correct box rhythm

---

## 5. How to use this package

- Work **one branch at a time**, in this order: **060 first** (it owns the root
  cause that unblocks 055/056/057), then 057, then 058, then 059.
- On each branch, open only that branch's review + the rewritten `spec.md` /
  `tasks.md` for that id. Do not reopen the merged 054–056 packages unless the
  per-branch file tells you to.
- The merged-specs review explains what to *re-verify*; the residual fixes land
  on 060/057, not by reopening merged branches.
