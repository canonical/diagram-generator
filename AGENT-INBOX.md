# Agent inbox

Machine-generated handoffs and diagnostics go here.

Durable follow-up belongs in `specs/<id>-<slug>/`,
[`AGENTS.md`](AGENTS.md#handover), or [`docs/specs.md`](docs/specs.md).
`TODO.md` is only a pointer to open spec packages.

---
## 2026-06-27 - Post-merge adversarial review of `8baea34..bee91b9` (spec 054 + 055-059 drafts)

Reviewer pass over the explicit pre-merge..main range, not a single-commit diff.
Range commits: `6d5cca4` (authored engine fixture choices), `c10ffa1` (merge
feat/054), `bee91b9` (draft specs 055-059). 054-specific evidence appended to
`specs/054-preview-persistence-model-typescript/evidence/opus-post-merge-review-2026-06-27.md`.

### Gate results (all green)

- `npm --prefix packages/layout-engine test` -> 143 files / 833 tests pass.
- `npm --prefix apps/preview test` -> 143 tests pass, 0 fail.
- `npm --prefix packages/layout-engine run build:browser` -> built, manifest emitted.
- `node scripts/check-browser-bundle-fresh.mjs` -> bundle fresh (3/3 artifacts).
- `node scripts/check_no_new_python.mjs` -> spec 038 ratchet ok (9 files scanned).
- Working tree clean except untracked `image.png` (ignored per request).

### Verdict

No correctness or architecture blockers found in the range. The 054 save-path
migration is sound: `createPreviewOverridePayload` (preview-override-model.ts) is
now the single payload producer, `app-save-payload.ts` is reduced to a
guard/normalizer, `app-save-client.ts` calls the typed producer directly instead
of `model.toOverridePayload()`, and the JS `component-model.js` method is a thin
delegating shim with a contract test proving delegation. Arrow vs frame identity
is routed through the shared `isPreviewArrowComponentId` owner in both producer
and guard, and engine-layout namespaces flow through the shared
`frame-yaml-engine-layout-contract.ts`. The authored engine flips re-parse and
resolve through the registry (`preview-host-contract.test.ts` updated, full
apps/preview suite green).

### Findings (severity-ordered)

**S3 (resolved) - Historical routing caveat needed trimming.**
The older 2026-06-26 routing-identity note read like an open
`example-platform-architecture` / `preview-host-contract.test.ts` breakage even
though the merge updated the fixture expectation map to
`["example-platform-architecture", "v3"]` and the full apps/preview suite now
passes. Resolved by annotating that note below as historical-only context so
future agents do not chase a non-bug.

**S3 (deferred to spec 057) - Authored engine flips have no render-fidelity gate.**
`mongo-octavia-ha` and `preview-smoke` (`v3 -> elk-layered`) and
`support-engineering-flow` (`elk-rectpacking -> elk-force`) are committed as
authored choices. They re-parse/resolve correctly (registry + load tests cover
identity), but there is no committed visual/structural regression asserting these
engines actually lay these specific compound/container fixtures out acceptably.
This is a known-tracked risk: draft spec 057 explicitly calls out
`support-engineering-flow` engine fit and ELK-family fidelity / compound-child
dropping. No spec 056 action required; keep this deferred to spec 057.

**S4 (residual) - Producer/guard duplication risk.**
`preview-override-model.ts` and `app-save-payload.ts` independently define
near-identical helpers (`syntheticComponentId`, arrow detection, `isRecord`,
`PERSISTABLE_ARROW_KEYS`). They serve different roles (producer vs validator), so
this is intentional defense-in-depth, but the synthetic-id and arrow-key
definitions could drift independently. Low priority: consider a shared internal
helper if these are edited again.

**S4 (residual) - `toOverridePayload` now throws without bootstrap.**
The JS shim throws if `previewShell.bootstrap.createPreviewOverridePayload` is
absent. The live save path no longer calls it (save client uses the typed
producer directly), and the bootstrap contract exports the factory
(`browser-entry-preview-shell.ts`), so this is only reachable by a legacy caller
invoking `toOverridePayload()` before bootstrap install. Covered by
`component-model-contract.test.ts`. No action needed; noted for completeness.

### Specs 055-059 indexing review

The five drafts are coherently grouped and indexed:
- `docs/specs.md` Active table has one row per spec with accurate summaries.
- `TODO.md` adds a pointer (item 6) directing selection through `docs/specs.md`.
- `AGENTS.md` handover lists 055-059 and requires matching feature branches.
- Cross-references are sane (055 depends on 057 for compatibility rules; both
  cite the same `support-engineering-flow` / `service-handshake-sequence` inbox
  symptoms without overlapping ownership). Non-goals correctly forbid reopening
  spec 046 or adding fixture-specific allowlists.

No duplicate-id or orphaned-package issues. The drafts are spec-only (no code),
consistent with the "implement only from matching feature branch" rule.

### Residual risks / test gaps

- No render-fidelity regression for the four authored engine flips (see S3);
  tracked by draft 057.
- 055-059 are Draft with no implementation; their Success Criteria tests do not
  yet exist (expected for drafts).
- `image.png` remains untracked at repo root (pre-existing, ignored here).

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

## 2026-06-26 - Historical note: preview arrow-routing identity split fixed for v3 branch routing

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

Follow-up:

- Resolved on 2026-06-27. The authored `example-platform-architecture` engine
  change and `preview-host-contract.test.ts` expectation map now agree on `v3`,
  and the full `apps/preview` suite passes on current `main`. This note is
  historical context only; there is no active
  `example-platform-architecture`/`preview-host-contract.test.ts` mismatch.

---

## 2026-06-27 - Adversarial review of `feat/056-arrow-reroute-structural-mutations`

Reviewer pass over spec 056 implementation commits `3018f05` + `bb2eb3c`.

### Verdict

No P0/P1 product-correctness regressions surfaced in the reroute invalidation
work itself. The live relayout path, save payload synthesis, and persist/reload
coverage all behave as intended once the local package/browser artifacts are
built. I did find one real validation/workflow issue plus two lower-severity
closeout gaps that should be recorded before this branch is treated as fully
closed.

### Resolved follow-up

| Severity | Area | Finding | Resolution |
|----------|------|---------|------------|
| P2 | Validation workflow | `npm --prefix apps/preview test` was not self-contained on a clean checkout because the suite asserted browser-bundle freshness before the bundle was built. | Resolved by making `apps/preview` pretest build the layout-engine browser bundle before the Node test run (`apps/preview/package.json`). |
| P3 | Review coverage | The fresh-render lane changed in spec 056 had no focused regression proving reroute invalidation on the real `renderFreshPreviewSvg(...)` path. | Resolved with focused `app-fresh-render` coverage that seeds stale authored arrow geometry and asserts route-bearing overrides clear `waypoints` and `layoutPath` before reroute (`packages/layout-engine/tests/app-fresh-render.test.ts`). |
| P3 | Spec bookkeeping | `docs/specs.md` still listed spec 056 as **In Progress** while the branch-local spec package and `AGENTS.md` already said **Closeout Ready**. | Resolved by aligning `docs/specs.md` to **Closeout Ready** and recording the review follow-up tasks under the spec package (`specs/056-arrow-reroute-structural-mutations/tasks.md`). |

### Remaining notes

- No active spec 056 findings remain in this review pass.

### What I verified

- `rg -n diagram_render_svg scripts packages apps` -> **pass** (no importable runtime refs)
- `npm --prefix packages/layout-engine test -- svg-golden` -> **pass** (6 tests)
- `npm --prefix packages/layout-engine test -- arrow-render` -> **pass** (22 tests)
- `npm --prefix packages/layout-engine test -- preview-override-model.test.ts app-layout-bridge-runtime.test.ts app-live-resize.test.ts app-relayout-runtime.test.ts app-editor-relayout-facade.test.ts` -> **pass** (31 tests)
- `npm --prefix packages/layout-engine test` -> **pass** (143 files / 838 tests)
- `node scripts/check_no_new_python.mjs` -> **pass**
- `npm --prefix apps/preview test` -> **initial fail** on missing browser artifacts; **pass after** `npm --prefix packages/layout-engine run build:browser`
- `node scripts/check-browser-bundle-fresh.mjs` -> **initial fail** before browser build; **pass after** browser build
