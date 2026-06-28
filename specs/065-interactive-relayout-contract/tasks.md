# Tasks: Spec 065 Interactive Relayout Contract

**Input**: `specs/065-interactive-relayout-contract/spec.md`
**Branch**: `feat/065-interactive-relayout-contract`
**Closing gate**: `verification-protocol.md` — every task's `Verify` must satisfy it.

> Rules for this file (read before touching a checkbox):
> - Do not check `[x]` until the `Verify` artifact exists, is committed under
>   `evidence/`, and passes by **real Playwright gesture** (no mocks, no
>   `skipModelUpdate`, no svgHash, no `page.evaluate(performEngineRelayout)`).
> - If blocked, write it under `## Blockers` below. Do not reinterpret scope.

## Phase 0: Reproduce on the real UI (no fix yet)

- [ ] **T000** Write `evidence/post-load-mutations.mjs` from the protocol §1
      skeleton and run it against the current build to **capture the failures**:
      engine tab no-op, direction-flip stranded arrows, ELK resize failure,
      box-type relayout. Commit the failing JSON as `baseline-fail.json`.
      **Verify**: JSON shows the documented failures (this proves the harness
      detects the real bug before any fix).

## Phase 1: PreviewRenderIntent (the single source)

- [x] **T010** Define `PreviewRenderIntent` and a typed committer in a new
      preview-shell owner (e.g. `preview-render-intent.ts`). Fields per FR-001.
      **Verify**: unit test that a committed intent is the value the render
      entry point reads back; no `__DG_CONFIG` read in the resolve path.

- [x] **T011** Route `renderFreshPreviewSvg` and all relayout lanes
      (`performLocalRelayout`, `performEngineRelayout`, bridge patch) to resolve
      engine + direction from the intent / frame-tree only. Remove any
      `__DG_CONFIG`-as-render-source reads.
      **Verify**: real-`renderFreshPreviewSvg` test on `mongo-octavia-ha`
      authored `elk-layered`: after committing intent `v3`, root SVG
      `data-layout-engine === 'v3'`. Grep proof: no relayout lane reads
      `__DG_CONFIG.active_engine_id` / `.layout_engine` for engine identity.

- [x] **T012** Make panel/chrome visibility sync (`syncPanelVisibility` /
      grid-editor install) use the same resolver as render (FR-007).
      **Verify**: focused test that panel engine and rendered engine cannot
      diverge from one source.

## Phase 2: Gestures commit intent, render reads it

- [x] **T020** Engine tab switch commits intent then rerenders (already partly
      done in 060 — fold it onto the intent committer, do not keep a parallel
      setter path).
      **Verify**: protocol §2 "Engine tab switch" via real `page.click` on
      `mongo-octavia-ha` + `juju-bootstrap-machines-process` (SC-001).

- [x] **T021** Page-direction change is an intent field; the inspector direction
      `<select>` commits it and triggers recompute + arrow reroute (FR-004).
      **Verify**: protocol §2 "Page-direction flip" via real
      `page.selectOption` on `tiered-network-architecture`: spread axis flips,
      every arrow endpoint on a node perimeter (SC-002).

- [x] **T022** ELK live resize uses an engine-backed relayout that resolves and
      never emits "relayout failed" for a valid resize (FR-005). Fix the null
      path and `formatPreviewRelayoutStatusMessage` for the elk-failure case.
      **Verify**: protocol §2 "ELK live resize" via real pointer drag on an
      `elk-layered` doc (SC-003).

- [x] **T023** Box-type / variant change is appearance-only: it must not commit
      a geometry-changing intent and must not trigger relayout (FR-006).
      **Verify**: protocol §2 "Box-type change" on `support-engineering-flow`:
      node bounds byte-identical, engine unchanged (SC-004).

## Phase 3: Save / reopen on the intent surface

- [x] **T030** `persist → reload` regression: commit a new engine + direction via
      real gestures, Save, reload the viewer context, assert the saved
      `meta.layout_engine` + direction match the committed intent.
      **Verify**: `npm --prefix apps/preview test` (spec-owned round-trip).

## Phase 4: Browser-proven verification (the gate)

- [x] **T040** Finalize `evidence/post-load-mutations.mjs` to assert all SC-001..
      SC-005 invariants and commit a passing `post-load-mutations-result.json`
      (`ok: true`) after a **fresh** `build:browser` + server restart.
      **Verify**: protocol §0 + §2 all green; `RESULT.md` sign-off (§3) committed.

## Phase 5: Full validation

- [ ] **T050** Run and record:
      `npm --prefix packages/layout-engine run build:browser`;
      `npm --prefix packages/layout-engine test`;
      `npm --prefix apps/preview test`;
      `node scripts/check-browser-bundle-fresh.mjs`;
      `node scripts/check_no_new_python.mjs`.

## Blockers

- T000 baseline failure JSON was not captured before implementation began in
  this session. The final harness now proves the fixed behavior, but there is
  no truthful `baseline-fail.json` artifact to check T000.
