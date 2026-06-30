# Search Evidence: Spec 068 Internal Dual-Path Deletion

**Branch**: `feat/068-internal-dual-path-deletion`  
**Date**: 2026-06-30

## Banned Alias Search

Command:

```bash
rg -n "_getPreviewGridEditorCompat|requestV3|getV3|_finishV3|_scheduleV3|_cancelV3|_persistResizeToV3|refreshV3Grid|CompatFacade|legacyArrowComponentId|__DG_getPreviewElkEngineContract|getPreviewElkEngineContract|applyElkLayoutOverrides|isElkLayeredDiagram|performElkRelayout|ElkPreviewController|ElkLayoutControls|createPreviewElkLayoutControlsRuntime|ensurePreviewElkPreviewController|ensurePreviewEngineShellCompatController" packages/layout-engine/src packages/layout-engine/tests apps/preview/src scripts/preview -g '!packages/layout-engine/dist/**'
```

Result: exit code `1`; zero active source/test hits.

Command:

```bash
rg -n "elk-layout-controls|elk-shell-controller" packages/layout-engine/src packages/layout-engine/tests apps/preview/src scripts/preview -g '!packages/layout-engine/dist/**'
```

Result: exit code `1`; zero active source/test hits.

Command:

```bash
rg -n "previewEngines\?\.elk\?\.ELK_LAYERED_PARAM_SPECS|layoutEngineRoot\?\.ELK_LAYERED_PARAM_SPECS|previewEngines\?\.elk\?\.elkParamGroups|layoutEngineRoot\?\.elkParamGroups|ELK_LAYERED_PARAM_SPECS\?:|elkParamGroups\?:" packages/layout-engine/src/preview-engine/layout-params-controls.ts packages/layout-engine/src packages/layout-engine/tests apps/preview/src scripts/preview -g '!packages/layout-engine/dist/**'
```

Result: exit code `1`; zero active source/test hits. This proves the generic
layout-params pane no longer falls back to old ELK-root param access when the
active engine manifest is unavailable.

## Explicit Non-Banned ELK Names

These names remain valid because they identify real ELK product/debug surfaces,
not generic graph-layout controller/control aliases:

- `createPreviewElkViewModeRuntime*`
- `renderPreviewElkRawView`
- `verifyElkLayoutPersisted`
- ELK layout types, fixtures, and algorithm registries

## Validation

Passing:

```bash
npm --prefix packages/layout-engine run build:browser
npm --prefix packages/layout-engine exec tsc -- --noEmit -p packages/layout-engine/tsconfig.json
npm --prefix apps/preview exec tsc -- --noEmit -p apps/preview/tsconfig.json
npm --prefix packages/layout-engine test -- app-load app-live-resize app-relayout app-relayout-runtime app-layout-bridge-runtime browser-entry-contract
npm --prefix apps/preview test
node scripts/check-browser-bundle-fresh.mjs
node scripts/check_no_new_python.mjs
```

Final post-review validation also passed:

```bash
npm --prefix packages/layout-engine run build:browser
npm --prefix packages/layout-engine exec tsc -- --noEmit -p packages/layout-engine/tsconfig.json
npm --prefix apps/preview exec tsc -- --noEmit -p apps/preview/tsconfig.json
npm --prefix packages/layout-engine test
npm --prefix apps/preview test
node scripts/check-browser-bundle-fresh.mjs
node scripts/check_no_new_python.mjs
```

Results:

```text
packages/layout-engine: Test Files 151 passed (151), Tests 904 passed (904)
apps/preview: tests 146, pass 146
layout-engine browser bundle fresh (3 artifacts checked against 3 source root).
spec 038 ratchet: ok (9 Python files scanned, no new product-path files).
```

Full package validation initially failed before test isolation:

```bash
npm --prefix packages/layout-engine test
```

Failure:

```text
tests/elk-layout.test.ts > honors horizontal root direction overrides in the ELK lane and reroutes arrows side-to-side
Error: unsupported ELK layered override keys: elk.radial.centerOnRoot, elk.radial.compactionStepSize, elk.radial.compactor, elk.radial.optimizationCriteria, elk.radial.radius, elk.radial.rotate, elk.radial.sorter, elk.radial.wedgeCriteria
Test Files 1 failed | 150 passed (151)
Tests 1 failed | 903 passed (904)
```

Root cause: unrelated dirty user change in
`scripts/diagrams/frames/example-deployment-pipeline.yaml`. The working tree
version changed `meta.layout_engine` to `elk-radial` and added radial ELK keys;
`HEAD` does not contain those radial keys.

Resolution: the layered regression in `tests/elk-layout.test.ts` now makes the
target engine explicit and clears inherited ELK option metadata before invoking
the direct layered layout API. The user-authored YAML remains untouched.

Re-run:

```bash
npm --prefix packages/layout-engine test
```

Result:

```text
Test Files 151 passed (151)
Tests 904 passed (904)
```

## Workflow-Kit Dry Run

Command:

```bash
pwsh -NoLogo -NoProfile -File ..\agent-workflow-kit\agent-loop.ps1 -Workflow SpecKit -RepoRoot . -DryRun
```

Initial result: one queued package, `specs/068-internal-dual-path-deletion`,
with one unchecked task: `T041`. After the test-isolation fix and successful
validation, `T041` is complete.
