# Agent inbox

Machine-generated handoffs and diagnostics go here.

Durable follow-up belongs in `TODO.md`, [`AGENTS.md`](AGENTS.md#handover), or [`docs/specs.md`](docs/specs.md).

---

## Latest adversarial review (Composer 2.5, 2026-06-17)

Status: this is now the only retained inbox review. Older resolved or durable items were moved to the owning specs/docs and removed from this file.

### Already addressed after the review

- Preview consumer regressions called out in the review are fixed; `npm --prefix apps/preview test` should stay green before merge.
- Branch-per-spec workflow is now documented in `README.md`, `AGENTS.md`, and `docs/specs.md`.
- `scripts/preview/editor.js` is down to about **2,178** lines and the stage-rerender/delete plus bootstrap-tail ordering/document bindings now route through typed owners.
- Spec 043 is archived under `docs/spec-archive/043-preview-shell-editor-ts-extraction/`; it is no longer the active spec target.

### Moved to owning specs

- **Spec 044** now owns the remaining review hardening around transitional root aliases, the oversized browser-contract VM harness, and the remaining `layout-bridge.js` sink risk.
- **Spec 045** remains the owner for further `apps/preview/src/server.ts` shrink and lane-onboarding host topology.
- **Spec 046** remains the owner for the unfinished `editor.js` endgame: remaining drag/resize/waypoint completion glue, keyboard/document-event callback assembly, and residual state-copy wrappers.
- **Spec 047** remains gated; render-IR convergence is parked there rather than treated as active 046 work.

### Merge gate from this review

Before merging any branch carrying the 044/045/046 follow-up work:

1. Keep unrelated assets and user-local inputs out of the commit.
2. Rebuild the browser bundle after browser-entry/export changes.
3. Run at least:
   - `npm --prefix packages/layout-engine test`
   - `npm --prefix apps/preview test`
   - `node scripts/check_no_new_python.mjs`
4. Do not continue remaining spec 046 work on a misnamed legacy branch after this merge; create or switch to `feat/046-editor-host-endgame`.
