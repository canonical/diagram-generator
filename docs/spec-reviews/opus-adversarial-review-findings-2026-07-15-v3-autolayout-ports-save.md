# Opus adversarial review findings — v3 autolayout, ports, save/reload (2026-07-15)

Reviewer: Opus (skeptical external maintainer). Investigation only — no product
code, bundle, fixture, or YAML edits were made.

Paired request:
[`opus-adversarial-review-request-2026-07-15-v3-autolayout-ports-save.md`](opus-adversarial-review-request-2026-07-15-v3-autolayout-ports-save.md).

## Scope and honesty boundary

This pass is a **static/source trace** of the areas named in the request. I did
**not** exercise the live v3 preview (save → reload, drag-resize below/above
bounds, parallel-arrow reroute) end-to-end in a browser this session, so any
finding that depends on runtime behavior is marked **Needs live confirmation**
rather than asserted as fact. Per the request's closing rule, `No findings`
would only be justified after those live paths were run; that bar is **not** met
here, so this document reports source-level findings plus the exact reproduction
each one still needs.

## Findings

### F1 — FILL/HUG parser defaults match the contract (severity: none / confirmed)
- Owner: `packages/layout-engine/src/frame-record-parser.ts`.
- Evidence: non-root frames default `sizingW = fill`, `sizingH = hug`; root
  defaults to `hug/hug`. Authored `width` without `sizing_w` (and `height`
  without `sizing_h`) is coerced to `FIXED`. This matches the request's stated
  contract (non-root width FILL, height HUG).
- Disposition: no change. Documented here so a later regression is detectable.

### F2 — min/max relayout clear path is correct; suspect the input/persist edges (severity: medium)
- Owner (confirmed-good): `packages/layout-engine/src/preview-shell/app-relayout.ts`
  — `CONSTRAINT_KEY_MAP` loop treats `value == null || value === ''` as a clear
  (`target[frameKey] = undefined`). So the **relayout runtime distinguishes
  blank from numeric zero correctly.**
- Suspected owners (unverified this pass):
  1. Inspector input → override dispatch:
     `packages/layout-engine/src/preview-shell/app-inspector-mutation-runtime.ts`
     and the size-mutation host it delegates to. Confirm that clearing the
     Min/Max field emits an override with `min_width: null`/`''` (a clear
     signal) rather than omitting the key or coercing blank → `0`/`NaN`.
  2. YAML persistence: the `PERSIST_FRAME_KEYS` path in
     `packages/layout-engine/src/preview-shell/frame-*` / `frame-diagram.ts`.
     Confirm a cleared bound is written as removed (not re-emitted as `0`), so
     Save → reload returns to the inherited/unset state.
- Reproduction still needed: in live preview, select a bounded frame, clear
  Min W (and separately set it to `0`), watch the emitted override payload, then
  Save and reload. The user report ("cannot remove a min/max, especially `0`")
  most plausibly originates at edge (1) or (2), not in `app-relayout.ts`.
- Disposition: **do not** paper over with authored `sizing_*: fixed` or a
  fixture width patch (explicitly rejected by the request). Fix at whichever of
  (1)/(2) fails the payload trace and add a `clear → persist → reload` regression.

### F3 — `createScene is not a function`: alias exists in TS; risk is a stale bundle (severity: medium, Needs live confirmation)
- Owners: `packages/layout-engine/src/browser-entry-preview-shell.ts` (public
  contract) → `app-grid-runtime.ts` → `grid-overlay-scene.ts`.
- Evidence: the browser entry exports **both** the descriptive
  `createPreviewGridOverlayScene` and the concise alias `createGridOverlayScene`
  under `scene`. `createPreviewGridRuntimeHost` receives `createGridOverlayScene`
  and forwards it as `createScene` to `createPreviewGridOverlayScene`. The wiring
  is present and internally consistent in **source**.
- Therefore the reported `TypeError: options.createScene is not a function` at
  reload is most likely a **stale `dist/layout-engine.iife.js`** (preview loads
  the built IIFE, not TS) or a host that reads the alias before it is frozen —
  not a missing TS export.
- Reproduction still needed: rebuild the browser bundle
  (`npm --prefix packages/layout-engine run build:browser`), then run a real
  dirty Save → reload and confirm the active engine, layout overrides, and canvas
  dimensions survive. If the error persists post-rebuild, the defect is in the
  host call order, not the alias.
- Disposition: treat the bundle-freshness check
  (`scripts/check-browser-bundle-fresh.mjs`) as the guard; a unit-level alias
  test alone is **misleading green** for this class of bug (per request §5).

### F4 — Parallel arrows / ports: verify it is a model, not an anonymous heuristic (severity: high for scope, Needs deeper trace)
- Owners: `packages/layout-engine/src/arrow-routing.ts` (native parallel-edge
  attachment) and `packages/layout-engine/src/elk-layout.ts` (ELK port work).
- Concern (from the request, not yet disproven this pass): if parallel-edge
  attachment is computed as anonymous offsets at route time rather than as
  persisted, named box ports with side/order/position identity, then reciprocal
  arrows, same-direction multi-edges, explicit endpoint sides, authored
  waypoints, resize, and non-horizontal pairs will each need bespoke handling and
  will not survive Save → reload as stable attachments.
- Reproduction still needed: author two reciprocal edges + a same-direction
  multi-edge between one pair, add an explicit endpoint side and a waypoint,
  resize an endpoint, then Save → reload and diff attachment points.
- Disposition: if there is no explicit port identity, do **not** accept
  per-diagram spacing/styling exceptions. Define the smallest follow-up spec:
  port identity + side/order/position constraints + persistence keys + engine
  adapter (ELK port mapping) + render + interaction/editing.

### F5 — Containment invariant vs. fixture patch (severity: medium, Needs trace)
- Owner: `packages/layout-engine/src/layout.ts` (`place` / clamp path) and
  heading/body synthesis (`heading-synthesis.ts`).
- Concern: after heading/body synthesis a fixed/bounded parent could still place
  a child outside its usable content rectangle. `place` clamps the frame's own
  size to min/max but I did not confirm a child origin/extent is re-clamped into
  the parent content rect after synthesis.
- Reproduction still needed: a fixed-width headed panel whose synthesized body +
  heading exceed the content rect; confirm no child overflows.
- Disposition: state the invariant ("no child extends beyond parent usable
  content rect") and add a repo-owned regression rather than a per-fixture
  dimension patch.

## Architecture / scope notes (request §5)
- No evidence in this pass of new behavior-heavy `scripts/preview/*.js` growth;
  the browser contract is centralized in the typed `browser-entry-preview-shell.ts`
  barrel, consistent with the spec-046 ratchet.
- Watch item: F3 shows the preview depends on a freshly built IIFE. Any "green"
  claim on save/reload must run against a rebuilt bundle, not TS unit tests.

## Recommended next actions (ordered)
1. Rebuild the browser bundle and run a live dirty Save → reload (F3).
2. Trace the Min/Max clear payload through inspector dispatch and persistence,
   add a `clear → persist → reload` regression (F2).
3. Decide port model vs. heuristic and scope the follow-up spec (F4).
4. Add containment regression if the overflow reproduces (F5).
