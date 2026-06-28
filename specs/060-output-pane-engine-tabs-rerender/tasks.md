# Tasks: Spec 060 Output Pane Engine Tabs And Live Rerender

**Input**: `specs/060-output-pane-engine-tabs-rerender/spec.md`
**Branch**: `feat/060-output-pane-engine-tabs-rerender`

> 2026-06-28 reset: the previous task list was marked complete on mock/hash-only
> evidence while the headline bug (engine switch does nothing on authored-engine
> docs) remained. Tasks below are re-opened against the hardened closeout gate.
> See `docs/spec-reviews/branch-060.md`.

## Phase 0: Reproduce And Trace (kept — was correct)

- [x] **T000** Reproduce the multi-engine regression on a real fixture.
- [x] **T001** Add failing host/runtime regression coverage for placement.

## Phase 1: Host Placement And Chrome Contract

- [x] **T010** Move the engine workspace chrome into the output pane header.
- [x] **T011** Render compatible engines as baseline-foundry tabs.
- [x] **T012** Chrome cleanup (FR-008): remove stale `active-engine-label`
      text + stray `elk-radial` markup, remove tab `margin-bottom` (use the BF
      utility), remove the "Only engines compatible…" help paragraph, rename
      "Native v3 autolayout" → "Autolayout", and keep output-pane padding across
      autolayout↔ELK switches.
      **Verify**: focused chrome/template tests + visual check.

## Phase 2: Engine Intent Is The Render Source Of Truth (the real fix)

- [x] **T020** Make the rendered engine observable.
      **Do**: stamp `data-layout-engine` (resolved `engineManifest.layoutEngineKey`)
      on the root SVG in `renderFreshPreviewSvg` (`app-fresh-render.ts`).
      **Verify**: `npm --prefix packages/layout-engine test -- app-fresh-render.test.ts`
      asserts the attribute equals the resolved engine.

- [x] **T021** Commit the chosen engine into the frame-tree before render.
      **Do**: add a typed setter (e.g. `setFrameTreeLayoutEngine`) on the
      layout-bridge runtime; have the tab switch call it so
      `state.frameTreeJson.layoutEngine` reflects the active engine. Keep it
      browser-local (no YAML write) until Save. Introduce one
      `resolveActivePreviewLayoutEngine` consumed by both chrome and render so
      `__DG_CONFIG` and the render path cannot drift.
      **Verify**: real-`renderFreshPreviewSvg` test on `mongo-octavia-ha`
      (authored `elk-layered`): after switching to `v3`, root SVG
      `data-layout-engine === 'v3'`.

- [x] **T022** Route page-direction changes through the same engine-intent
      commit so layout re-runs and arrows reroute (FR-007).
      **Verify**: real-layout/runtime test on `tiered-network-architecture`
      horizontal→vertical keeps arrow attachments (no mocked rerender).

- [x] **T023** Resync engine-specific right-aside panels after rerender (FR-004).
      **Verify**: focused panel-visibility test against the live active engine.

## Phase 3: Save / Reopen On The Changed Surface

- [x] **T030** Add a spec-owned `persist → reload` regression on the moved
      output-header workspace path: switch engine via the header, save, reload the
      viewer context, assert the saved `layout_engine` is the active tab (FR-005).
      **Verify**: `npm --prefix apps/preview test`.

## Phase 4: Browser-Proven Verification (no mock, no hash)

- [x] **T040** Playwright self-check per `docs/spec-reviews/README.md` §4.
      **Do**: restart the server fresh; assert engine **identity** (not svgHash)
      via `#stage svg[data-layout-engine]` for: authored-ELK → v3
      (`mongo-octavia-ha`), v3 → elk-layered, and a sequence doc (no dead rail).
      Also verify an authored `juju-bootstrap-machines-process` engine switch.
      Full compatible-engine exposure/fidelity for Juju-class examples belongs to
      spec 057.
      **Verify**: commit script + JSON result under `evidence/` (replace the old
      hash-based evidence file).

## Phase 5: Full Validation

- [x] **T050** Run repo validation for the landed fix.
      **Verify**:
      `npm --prefix packages/layout-engine run build:browser`;
      `npm --prefix packages/layout-engine test`;
      `npm --prefix apps/preview test`;
      `node scripts/check-browser-bundle-fresh.mjs`;
      `node scripts/check_no_new_python.mjs`.

## Accessibility follow-up

- [x] **T060** Give the engine tab rail real tablist semantics (roving tabindex,
      keyboard nav) or converge on the existing nav-tab controller. Do not grow
      new JS behavior; keep it in the typed workspace chrome owner.
