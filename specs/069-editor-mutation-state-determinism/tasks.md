# Tasks: Spec 069 Editor Mutation State Determinism

**Input**: `specs/069-editor-mutation-state-determinism/spec.md`  
**Branch**: `feat/069-editor-mutation-state-determinism`

> Do not execute these tasks on `feat/068-internal-dual-path-deletion`.
> This package is drafted now so the next branch can implement it cleanly.

## Phase 0: Baseline And State Vector

- [ ] **T000** Create `evidence/editor-mutation-state-probe.ts`.
      **Do**: capture pre/post state vectors for real browser gestures on the
      fixture matrix in SC-001. Include active tab, render intent,
      `frameTreeJson.layoutEngine`, layout-operator active bucket, rendered
      `svg[data-layout-engine]`, node bounds, selection id/type, inspector
      target, focused control, control applicability reason, dirty flag,
      undo/redo state, visible controls, save payload, and reload parse.
      **Verify**: a baseline JSON records current indeterminate cases without
      using mocked rerender, SVG hash-only checks, or direct `page.evaluate`
      mutation calls. The probe must use sanitized temporary fixtures or
      record/enforce source fixture hashes before running.

- [ ] **T001** Add a focused owner map for current mutation paths.
      **Do**: inventory engine tab, engine option, grid/alignment, inspector,
      resize/drag, waypoint, text edit, clear, undo/redo, save, and reload paths.
      **Verify**: each path names its current state writers and render/relayout
      trigger, and is classified as migrate, inert/read-only, or deferred to a
      named follow-up spec id.

## Phase 1: Transaction Contract

- [ ] **T010** Define `EditorMutationTransaction` and result types in a typed
      preview-shell owner.
      **Do**: include capability gate, render intent delta, persistence delta,
      relayout policy, dirty policy, undo policy, reason codes, and diagnostics.
      **Verify**: unit tests for valid, no-op, inert, rejected, and relayout
      transaction results.

- [ ] **T011** Add a state-vector diagnostic helper.
      **Do**: compare active tab, `PreviewRenderIntent`, frame-tree engine,
      active option bucket, rendered `data-layout-engine`, selection id/type,
      inspector target, focused control, control applicability reason,
      dirty/undo state, and visible controls after a transaction.
      **Verify**: test that deliberate drift produces a structured violation.

## Phase 2: Engine And Option Mutations

- [ ] **T020** Route engine tab clicks through the transaction owner.
      **Do**: commit active engine, frame-tree engine, render intent, active
      option bucket, visible controls, and rerender as one transaction.
      **Verify**: real runtime test plus browser probe: `data-layout-engine`,
      active tab, option bucket, and geometry/equivalence record agree.

- [ ] **T021** Route engine option edits through active manifest buckets only.
      **Do**: reject or ignore option keys not visible/applicable for the active
      engine. Switching engines must not carry inactive keys into layout input.
      **Verify**: ELK layered -> radial -> layered sequence proves buckets do
      not leak.

- [ ] **T022** Make irrelevant autolayout/grid/alignment controls inert for
      engine-backed diagrams.
      **Do**: hidden controls must also be programmatically inert if stale DOM
      dispatches an event.
      **Verify**: no dirty flag, no undo entry, no save payload delta, no
      relayout failure.

## Phase 3: Inspector, Geometry, Undo, Save

- [ ] **T030** Route appearance-only inspector edits through no-relayout
      transactions.
      **Do**: box variant/style changes must not relayout when measured geometry
      is unchanged.
      **Verify**: `support-engineering-flow` bounds byte-identical before/after.

- [ ] **T031** Route geometry-changing edits through explicit relayout policies.
      **Do**: resize/drag/direction/waypoint/text edits must declare whether
      they need local relayout, engine relayout, fresh render, or no relayout.
      **Verify**: tests assert policy choice and final state vector.

- [ ] **T032** Make undo/redo restore complete state vectors.
      **Do**: undo/redo must restore engine intent, option bucket, frame
      overrides, rendered engine, visible controls, dirty state, and geometry.
      **Verify**: browser probe covers undo/redo after engine option + variant
      edits.

- [ ] **T033** Add `persist -> reload` regression for committed state vector.
      **Do**: save active engine + supported option bucket + frame overrides,
      reload, and assert reloaded state vector matches the saved clean state.
      Use a temp copy or hash-guarded fixture; never write evidence back to
      authored `scripts/diagrams/frames/*.yaml`.
      **Verify**: repo-owned apps/preview persistence test.

## Phase 4: Fixture And Test Isolation

- [ ] **T039** Add fixture hygiene helpers for browser probes and persistence
      regressions.
      **Do**: provide temp-copy or source-hash guard utilities so evidence can
      prove it did not mutate authored frame YAML.
      **Verify**: helper tests fail on unexpected source fixture dirt and pass
      when using a sanitized temp fixture.

- [ ] **T040** Add a test helper for engine-specific fixture normalization.
      **Do**: direct layout tests can load authored frame YAML while explicitly
      selecting target engine and clearing unrelated option metadata.
      **Verify**: convert at least one existing direct layout test to the helper.

- [ ] **T041** Audit direct layout tests for mutable authored fixture reads.
      **Do**: normalize or replace tests that assume a specific engine while
      loading mutable source-of-truth frames.
      **Verify**: grep/list evidence in this spec package.

## Phase 5: Evidence And Validation

- [ ] **T050** Commit passing browser evidence.
      **Do**: `evidence/editor-mutation-state-result.json` reports `ok: true`
      and classifies any no-visible-change engine switches as equivalent
      geometry or defects.
      **Verify**: fresh browser bundle/server, real gestures only.

- [ ] **T051** Run full validation.
      **Verify**:
      `npm --prefix packages/layout-engine run build:browser`;
      `npm --prefix packages/layout-engine test`;
      `npm --prefix apps/preview test`;
      `node scripts/check-browser-bundle-fresh.mjs`;
      `node scripts/check_no_new_python.mjs`.
