# Tasks: Spec 060 Output Pane Engine Tabs And Live Rerender

**Input**: `specs/060-output-pane-engine-tabs-rerender/spec.md`  
**Branch**: `feat/060-output-pane-engine-tabs-rerender`

## Phase 0: Reproduce And Trace

- [x] **T000** Reproduce the current multi-engine regression on a real fixture.
      **Do**: verify wrong placement, non-BF tab rendering, and stale graph
      behavior on at least one multi-engine frame example.
      **Verify**: capture the exact host/runtime owner path before changes.

- [x] **T001** Add failing host/runtime regression coverage for the current
      incorrect placement and missing rerender behavior.
      **Verify**: focused failing tests prove the bug before the implementation.

## Phase 1: Host Placement And Chrome Contract

- [x] **T010** Move the engine workspace chrome into the output pane header.
      **Verify**: preview host / template tests.

- [x] **T011** Replace the current button-cluster chrome with baseline-foundry
      tab semantics for compatible engines.
      **Verify**: focused workspace chrome tests.

## Phase 2: Live Rerender Semantics

- [x] **T020** Wire tab changes into a typed live rerender path for the graph,
      not just panel visibility sync.
      **Verify**: focused runtime tests prove the active graph rerenders.

- [x] **T021** Preserve save/reopen semantics through the typed workspace/save
      path.
      **Verify**: focused save/reopen tests.

## Phase 3: Browser-Proven Verification

- [x] **T030** Validate the fix against a real browser session using Playwright.
      **Do**: assert that switching tabs changes the live rendered output on at
      least one multi-engine fixture and does not regress single-engine/sequence
      behavior.
      **Verify**: scripted browser pass recorded in the spec evidence or notes.

## Phase 4: Full Validation

- [x] **T040** Run repo validation for the landed fix.
      **Verify**:
      `npm --prefix packages/layout-engine test`;
      `npm --prefix apps/preview test`;
      `node scripts/check-browser-bundle-fresh.mjs`;
      `node scripts/check_no_new_python.mjs`
