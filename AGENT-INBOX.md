# Agent inbox

Machine-generated handoffs and diagnostics go here.

Durable follow-up belongs in `specs/<id>-<slug>/`,
[`AGENTS.md`](AGENTS.md#handover), or [`docs/specs.md`](docs/specs.md).
`TODO.md` is only a pointer to open spec packages.

---

## 2026-06-26 - Spec 053 arrow-waypoint save regression fixed and live-verified

Active branch: `feat/053-preview-editor-post-refactor-correctness`.

Completed in this session:

- `apps/preview/src/persistence/frame-diagram.ts` now resolves override ids
  against arrows as well as frames and persists arrow `waypoints` back into
  frame YAML.
- Arrow save coverage was added in
  `apps/preview/src/persistence/frame-diagram.test.ts`, including the real
  `complex-routing-usecase.yaml` fixture and shorthand-authored arrows.
- The earlier "same error" report was caused by a stale preview server process
  still holding `127.0.0.1:8101`; the old process had start time
  `2026-06-22 12:36:01`, and it was replaced by a fresh server started at
  `2026-06-26 19:52:27`.
- After that restart, a live direct save to
  `POST /api/overrides/complex-routing-usecase` with
  `measure->review` waypoint overrides returned `ok: true`, and the preview save
  flow on `http://127.0.0.1:8101/view/v3:complex-routing-usecase` works again.

Validation completed on this branch:

- `npm --prefix apps/preview test -- src/persistence/frame-diagram.test.ts`
- `npm --prefix apps/preview run build`
- Live POST probe against
  `http://127.0.0.1:8101/api/overrides/complex-routing-usecase`

Current local state to preserve:

- `scripts/diagrams/frames/complex-routing-usecase.yaml` now contains the
  user-saved `measure -> review` waypoints.
- Unrelated local edits remain untouched and were not triaged here:
  `INBOX.md`, `scripts/diagrams/frames/example-deployment-pipeline.yaml`, and
  untracked `image.png`.

Recommended next step:

- Prefer a new chat for the next task. This session has a long debugging trail,
  and the actionable state is now captured here.
- If work continues before a commit/cleanup pass, confirm whether
  `example-deployment-pipeline.yaml` is an intentional user/product change.

---

## 2026-06-26 - Re-review of the 053 save fixes + widened repo audit

Reviewer pass over the spec 053 save rework and a broader project audit. Full
detail in
`specs/053-preview-editor-post-refactor-correctness/evidence/review-two-pass-2026-06-26.md`.

### Re-review verdict: the save rework is sound

The new typed owners resolve the original findings without introducing a
client/server id mismatch:

- `app-save-payload.ts` normalizes the payload before POST, converts transient
  `dx/dy/dw/dh` to canonical `x/y/width/height` (+`position`/`sizing_*`), drops
  synthetic `__body`/`__heading` ids, and returns explicit errors instead of a
  server 500. This closes the highest-risk item (frame drag/resize save).
- `preview-arrow-component-ids.ts` is now the single id authority. Crucially the
  server (`frame-diagram.ts::findArrowData`) resolves ids with the **same**
  `collectPreviewArrowComponentEntries` the client/render path uses, plus a
  legacy `source->target` fallback. Parallel/duplicate edges now disambiguate by
  occurrence index. No producer/validator drift.
- Waypoints persist via `coerceFloat`+`Math.round` (no more integer-only throw).
- Engine control values keep their declared type (`coercePersistedControlValue`
  + `Object.is` compare) instead of round-tripping as strings.
- Reload-after-save failure is separated from persist failure and restores
  `removedIds`.
- Arrow keys are now first-class in `frame-override-manifest.ts`
  (`PERSIST/RELAYOUT/UNDO_RELAYOUT_ARROW_KEYS`).

Residual nit (non-blocking): `findArrowData` recomputes occurrence ids over the
*filtered* persistable-arrow list; if a malformed arrow is dropped, occurrence
indexing can diverge from the client's full-list numbering. Edge case only; add
a fixture with one malformed arrow if you want certainty.

### Widened audit — what will keep biting agents

1. **Root cause is unresolved: the save payload is still born in untyped JS.**
   `scripts/preview/component-model.js::toOverridePayload()` (658-line legacy JS)
   still assembles overrides as transient deltas. The new TS normalizer is a
   *net* over a JS source of truth. Every future override-bearing feature is
   save-unsafe by default until it is round-tripped. This is the structural
   reason 053-class bugs keep surfacing in QA. → spec `054` drafted below.

2. **`docs/agent-index.md` trap-file table is stale and actively misleading.**
   It lists `editor-base.js` (591 lines) and friends as "thin, safe to read
   whole", and does **not** list `component-model.js` (658 lines, owns the
   persistence model) as a trap file at all. An agent following the index will
   treat the single most bug-dense persistence file as unremarkable. Update the
   table: mark `component-model.js` as behavior-heavy/persistence-critical, and
   re-measure `force.js` (1,436, not ~1,600).

3. **"Closeout Ready" is being used aspirationally.** 046, 047, 048, 052, and
   053 all sit at "Closeout Ready" in `docs/specs.md` while QA is still finding
   save-breaking regressions in that exact surface. The closeout gate does not
   include a persistence round-trip check, so it cannot catch this bug class.
   Recommend: no spec touching the override/save path may reach "Closeout Ready"
   without a drag/resize/arrow/remove save→reload round-trip test in CI.

4. **Token/agent-friction.** `git ls-files` confirms `dist/` is not committed
   (good), but the 4.5 MB `layout-engine.iife.js` build artifact still lives in
   the tree and silently inflates any unscoped `rg`/recursive search (it cost me
   a slow scan this session). Reinforce in `agent-index.md` search-hygiene that
   `dist/**` must be excluded from greps, or add it to a search-ignore the CLI
   tools honor.

5. **Untracked `image.png` at repo root** plus dirty
   `example-deployment-pipeline.yaml` — confirm/clean before any closeout commit
   (already flagged by the prior session; still open).

### Recommended next steps

- Land spec `054` (below) to move the override model + payload assembly into TS,
  retiring `toOverridePayload` from JS — this removes the bug class rather than
  netting it.
- Refresh `docs/agent-index.md` trap-file table (item 2).
- Add the save round-trip gate to the closeout checklist (item 3).

---

## 2026-06-26 - Preview arrow-routing identity split fixed for v3 branch routing

Follow-up after re-checking `INBOX.md` for the report:

> this example gets very broken now - v3 version has ben saved as horizontal at
> the top page layer, changing that to vertical breaks the arrow attachment

Architectural finding:

- The reported example pointed at arrow routing generally, but the deeper defect
  was not example-specific YAML. `packages/layout-engine/src/preview-shell/
  app-arrow-render.ts::routePreviewArrows()` was overwriting authored `Arrow.id`
  with the preview component id before calling `routeArrows()`.
- Core routing resolves `arrow:<id>` / `@id` attachments against the authored
  arrow id. That meant preview routing could silently drop branch arrows or log
  `unresolved ... arrow attachment` warnings even though authored YAML was valid.
- The fix was to split identities cleanly:
  - authored routing id stays in `arrow.id` for attachment resolution
  - preview selection/save id travels separately as `componentId`
  - `arrow-routing.ts` now prefers `componentId` only for rendered component ids,
    not for authored attachment lookup

Files changed for this follow-up:

- `packages/layout-engine/src/arrow-routing.ts`
- `packages/layout-engine/src/preview-shell/app-arrow-render.ts`
- `packages/layout-engine/tests/app-arrow-render.test.ts`
- `apps/preview/src/persistence/frame-diagram.test.ts`

Validation completed:

- `npm --prefix packages/layout-engine test -- app-arrow-render.test.ts arrow-render.test.ts`
- direct `routePreviewArrows(...)` probe for `arrow:stem -> branch.left` now
  returns two routed arrows, correct branch endpoints, and no warnings
- `npm --prefix packages/layout-engine run build:browser`
- `node scripts/check-browser-bundle-fresh.mjs`

Caveat:

- A broader `apps/preview` test sweep is currently noisy because local working
  tree fixture edits changed `scripts/diagrams/frames/example-platform-architecture.yaml`
  from `elk-layered` to `v3`; this breaks the existing
  `preview-host-contract.test.ts` expectation for that fixture. That mismatch is
  local fixture state, not a result of the routing-identity fix.
