# Review: specs 054 / 055 / 056 (merged to `main`)

These three are merged and archived-pending. The author still sees their target
bugs. This file separates **what genuinely landed** from **what was claimed but
not user-true**, so you don't waste a branch reopening solved work.

## 054 — Preview persistence model TypeScript migration → **genuinely done**

054 is the one spec in this cluster that is actually closed correctly. The
payload owner (`preview-override-model.ts::createPreviewOverridePayload`) is the
single canonical producer, `app-save-payload.ts` is a guard layer, contract keys
are single-sourced, and there is real `persist → reload` coverage
(`frame-diagram.test.ts`, `app-save-client.test.ts`). The opus review confirms
this independently. **Do not reopen 054.**

One residual to carry (already noted by the opus pass, not blocking): the
authored-engine flip fixtures (`mongo-octavia-ha` → `elk-layered`,
`support-engineering-flow` → `elk-force`) have **no render-fidelity regression**.
That gap is exactly what makes INBOX #4 reproduce, and it is owned by **057**, not
by reopening 054.

## 055 — Preview engine workspace navigation → **state landed, render contract did not**

What landed: a typed workspace state model (`preview-engine-workspace.ts`),
compatible-engine filtering, prev/next + tab rail, per-engine session state, and
hidden inactive chrome. The state machine is sound and well-tested.

What did **not** land, and is the reason the inbox bug persists: switching engines
in the workspace updates `__DG_CONFIG`/workspace state but **never updates the
frame-tree `layoutEngine` that the render path reads** (see README §1). 055's
tests assert state transitions and panel visibility — none assert that the
rendered diagram uses the selected engine. So 055 is "done" for what it scoped
(navigation state) but the user-visible promise ("switch engine, see new layout")
was never in 055's success criteria. That promise is now owned by **060**.

Re-verify after 060 lands: 055's reopen/save semantics (FR-005/FR-006) still hold
once the render path is fixed — specifically that reopening restores the persisted
engine, not the last unsaved tab.

## 056 — Arrow reroute structural mutations → **partial; direction-flip still broken**

What landed: typed reroute invalidation for route-bearing **frame overrides** in
the local relayout and fresh-render lanes, with `app-fresh-render.test.ts`
coverage that clears stale `waypoints`/`layoutPath`. That is real and good.

What is still broken (INBOX #17, line 82): autolayout **horizontal→vertical**
breaks arrow placement on `tiered-network-architecture`. 056's trigger set keys
off frame-override entries (`RELAYOUT_FRAME_KEYS` etc.). A top-level page
**direction** change is a layout/engine input, not a per-frame override entry, so
it does not flow through 056's invalidation path the same way — and on an
authored-engine document the render path doesn't even re-run with the new
direction (same root cause as README §1). 056's `app-layout-bridge-runtime`
direction-change test passes because it seeds `state.frameTreeJson` directly and
calls the relayout helper — it bypasses the live switch/tab path that the user
actually drives.

Residual owner: **060** (thread direction + engine intent into the frame-tree
before render) with a reroute assertion added to the browser proof. Do not reopen
056's branch; add the direction-flip regression on 060.

## Bottom line for the merged trio

- 054: closed, leave it.
- 055: navigation state closed; render-fidelity promise reassigned to 060.
- 056: frame-override reroute closed; direction-flip reroute reassigned to 060.

When 060 and 057 close with the README §3 gate, re-run the INBOX URLs and confirm
the 055/056 promises hold end-to-end. Only then archive 054–056.
