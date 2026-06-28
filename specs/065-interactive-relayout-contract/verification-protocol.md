# Spec 065 verification protocol — the law for closing post-load fidelity work

This file is the **single closing gate** for specs 065, 060, 057, 048, and 051,
and the re-pass gate for 058/059. It is intentionally strict. The author has
reported the same regressions for days while specs were closed on green-but-
meaningless proofs. This protocol exists to make that impossible.

> If you are tempted to argue a proof "is close enough", it is not. Re-read
> §0. The default answer is: drive the real gesture.

## §0. Non-negotiable rules

A task or spec may NOT be checked `[x]` / marked Closeout Ready unless ALL hold.

1. **Real user gesture only.** Every behavior proof must drive the actual DOM
   control through Playwright:
   - engine switch → `page.click('#engine-switcher-tabs [data-engine-id="<id>"]')`
   - direction → `page.selectOption(<inspector direction select>, 'VERTICAL')`
   - resize → real pointer drag (`page.mouse.down/move/up`) on a resize handle
   - box-type → `page.selectOption`/`click` on the variant control
   - ELK option → `page.selectOption`/`fill` on the actual ELK control input
   **Banned as proof:** `page.evaluate(() => runtime.performEngineRelayout(...))`,
   any call passing `skipModelUpdate: true`, any mock of
   `rerenderStageFromModel` / `renderFreshSvg` / `renderFreshPreviewSvg`,
   `svgHash`/byte-diff equality, "arrow count unchanged" as the *only* arrow
   assertion.

2. **Engine identity is read off the rendered DOM**, via
   `#stage svg[data-layout-engine]`, and asserted `=== selectedEngine`.

3. **Geometry is asserted, not counted.** See §2 for exact invariants per
   gesture. Counting nodes/arrows or checking "no NaN" is necessary but never
   sufficient.

4. **Authored-engine fixtures are in the matrix.** At least
   `mongo-octavia-ha` (authored `elk-layered`) and
   `support-engineering-flow` (authored `elk-force`) must appear, because the
   bug only reproduces when an authored `meta.layout_engine` exists.

5. **One source of truth.** The change must route through the single
   `PreviewRenderIntent` (spec 065). A reviewer who finds a second render/
   relayout lane reading a different engine/direction source must reject the
   closeout. No patch-on-patch.

6. **Fresh bundle + fresh server.** Every evidence run starts with:
   ```bash
   npm --prefix packages/layout-engine run build:browser
   npm run preview   # restart; never reuse a stale bootstrap
   ```
   A stale cached bootstrap is exactly why 060 "only worked after a restart".

7. **Evidence is committed and runnable.** Each spec keeps under `evidence/`:
   the `.mjs` Playwright script (no screenshots), its JSON result with
   `ok: true`, and the exact commands run with their pass lines.

## §1. The canonical Playwright harness

Each reopened spec adds (or extends) `evidence/post-load-mutations.mjs`. It must
import `playwright` (already a dependency), launch chromium headless, and export
a single JSON result. Use this skeleton; do not weaken the assertions.

```js
import { chromium } from 'playwright';
const base = process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:8100';

async function engineOf(page) {
  return page.locator('#stage svg').getAttribute('data-layout-engine');
}
// placed node boxes
async function nodeBounds(page) {
  return page.locator('#stage svg [data-frame-id]').evaluateAll(els => els.map(e => {
    const b = e.getBoundingClientRect();
    return { id: e.getAttribute('data-frame-id'), x: b.x, y: b.y, w: b.width, h: b.height };
  }));
}
// arrow endpoints in viewport coords
async function arrowEndpoints(page) {
  return page.locator('#dg-arrow-layer [data-component-id] path').evaluateAll(els => els.map(e => {
    const len = e.getTotalLength();
    const a = e.getPointAtLength(0), b = e.getPointAtLength(len);
    return { id: e.closest('[data-component-id]').getAttribute('data-component-id'),
             ax: a.x, ay: a.y, bx: b.x, by: b.y };
  }));
}
```

Adapt selector names to the real DOM if they differ, but do NOT swap real
gestures for runtime calls to satisfy the harness.

## §2. Per-gesture invariants (what "fixed" means, concretely)

### Engine tab switch (060, 057)
- After `click` on tab `X`: `await engineOf(page) === X`.
- `nodeBounds` before vs after must **differ** for at least one node, AND match
  an engine-appropriate signal:
  - `v3` → grid/row alignment of siblings;
  - `elk-layered` → orthogonal edge segments (`path` has only H/V segments);
  - `elk-radial` → non-collinear node placement around a center.
- On `mongo-octavia-ha`, switching to `v3` must place the AZ1–3 / IP children
  **beside** their VM parents: each AZ child's `x` overlaps its sibling VM band
  (same row), not stacked below it (INBOX #4).

### Page-direction flip (060, 056 residual)
- Open `tiered-network-architecture`, read `nodeBounds` + `arrowEndpoints`.
- `selectOption` the direction control HORIZONTAL→VERTICAL via the inspector.
- After: the dominant spread axis of `nodeBounds` must flip (was wider in x, now
  taller in y, or vice-versa).
- Every arrow endpoint must still lie on the perimeter of some node box
  (endpoint within 2px of a `nodeBounds` rectangle edge). Endpoints left at old
  coordinates = FAIL. This is the assertion the fake 060 proof skipped.

### ELK live resize (048)
- Open an `elk-layered` doc, drag a resize handle (real pointer drag).
- The status region must NOT show "relayout failed"
  (`#build-status` / relayout status text must not match `/failed/i`).
- `nodeBounds` for the resized node must change to the dragged size (±2px).

### Box-type / variant change (057, 051)
- Open `support-engineering-flow`, select a node, change its box type.
- `nodeBounds` for every node must be **byte-identical** before/after
  (appearance-only; no relayout). Any bounds delta = FAIL (INBOX #12).
- `await engineOf(page)` unchanged.

### Inspector / ELK option contextual surfacing (051)
- For a `v3` doc: `#elk-layout-section`, `#elk-raw-view-toggle`,
  `#elk-debug-overlay-toggle`, and grid cols/rows/gutters/margins inputs must be
  **absent or `hidden` AND non-focusable** (Tab order skips them). "Disabled" is
  a FAIL; the author asked for hidden.
- For an `elk-layered` doc: the ELK section is visible; only options relevant to
  the active algorithm are present. Switch the algorithm to one with a smaller
  param set (e.g. `elk-radial` → spacing only) and assert the irrelevant
  `elk-layered`-only inputs are gone, not greyed.
- `#elk-debug-overlay-toggle` must be **removed from the DOM entirely** (author:
  delete it and its code). Its absence is asserted on every engine.

## §3. Sign-off block (paste into each spec's evidence/RESULT.md)

```
Spec: <id>
Bundle rebuilt: <sha or timestamp>
Server restarted fresh: yes
Gestures proven (real click/select/drag, no skipModelUpdate):
  - <gesture> on <url>: PASS — <invariant asserted>
Engine identity read from data-layout-engine: yes
Geometry asserted (bounds/endpoints), not hashed/counted: yes
Single PreviewRenderIntent path (no new parallel lane): confirmed
Validation:
  npm --prefix packages/layout-engine test  -> <N passed>
  npm --prefix apps/preview test            -> <N passed>
  node scripts/check-browser-bundle-fresh.mjs -> ok
  node scripts/check_no_new_python.mjs        -> ok
```

If any line cannot be truthfully completed, the spec stays open.
