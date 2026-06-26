# Tasks: Spec 053 Preview Editor Post-Refactor Correctness

**Input**: `specs/053-preview-editor-post-refactor-correctness/spec.md`
**Branch**: `feat/053-preview-editor-post-refactor-correctness`

## Phase 0: Reproduce and Bound

- [ ] **T000** Confirm branch and working tree scope.
      **Do**: verify the branch and list pre-existing dirty files.
      **Verify**: `git branch --show-current`; `git status --short`
      **Accept**: branch is `feat/053-preview-editor-post-refactor-correctness`
      and dirty files are either this spec, inbox triage, screenshot evidence, or
      known reproduction fixtures.

- [ ] **T001** Capture failing alignment behavior.
      **Do**: use `scripts/diagrams/frames/test-alignment-grid.yaml` to reproduce
      left and bottom alignment changes through the inspector action path.
      **Files**: `packages/layout-engine/src/preview-shell/*inspector*`,
      `apps/preview/src/persistence/editor-frame-align.test.ts`.
      **Verify**: add or update one focused failing test before fixing.
      **Accept**: the test fails because the action path does not reliably
      rerender and persist effective parent alignment.

- [ ] **T002** Capture failing v3 direction/stage resize behavior.
      **Do**: reproduce horizontal/vertical switching on a v3 frame and assert
      stage/canvas bounds update with the relaid-out page.
      **Files**: `packages/layout-engine/src/preview-shell/app-relayout.ts`,
      `app-frame-svg.ts`, `app-stage-svg.ts`.
      **Verify**: add or update one focused failing test before fixing.
      **Accept**: the test fails on stale bounds after direction change.

- [ ] **T003** Capture failing engine UI behavior.
      **Do**: reproduce the engine symptoms from the inbox: empty v3 field,
      incompatible engines listed, and wrong controls for non-layered engines.
      **Files**: `apps/preview/src/persistence/preview-host-contract.test.ts`,
      `preview-engine-controller-contract.test.ts`, `engine-switcher.test.ts`.
      **Verify**: add or update focused failing tests.
      **Accept**: tests fail against current behavior and name the stale owner.

## Phase 1: Alignment and Stage Reliability

- [ ] **T010** Fix single-frame alignment mutation.
      **Do**: make `single-align` update effective `align`, apply the override,
      refresh inspector active state, and request relayout through typed owners.
      **Files**: `app-inspector-mutation-host.ts`,
      `app-inspector-mutation-runtime.ts`, `frame-prop-actions.ts`,
      `app-relayout.ts`.
      **Verify**: `npm --prefix packages/layout-engine test -- app-inspector-mutation-runtime.test.ts frame-prop-actions.test.ts app-relayout.test.ts`
      **Accept**: left/bottom parent alignment changes are visible without reload.

- [ ] **T011** Preserve alignment through save/reload.
      **Do**: ensure saved frame YAML stores canonical align values and reloads
      into the same inspector and layout state.
      **Files**: `apps/preview/src/persistence/frame-diagram.ts`,
      `packages/layout-engine/src/preview-shell/frame-override-manifest.ts`.
      **Verify**: `npm --prefix apps/preview test`
      **Accept**: focused tests cover write, reload, and relayout for the
      alignment fixture.

- [ ] **T012** Separate parent alignment from multi-selection align.
      **Do**: confirm the nine-point widget and multi-selection align buttons use
      distinct typed actions and do not overwrite each other's state.
      **Files**: `inspector-single-panel.ts`, `inspector-multi-panel.ts`,
      `app-inspector-selection-runtime.ts`.
      **Verify**: `npm --prefix packages/layout-engine test -- inspector-single-panel.test.ts inspector-multi-panel.test.ts app-inspector-selection-runtime.test.ts`
      **Accept**: tests cover both action families.

- [ ] **T013** Resize stage/canvas after v3 direction changes.
      **Do**: route direction changes through the same relayout result and stage
      sizing path used by fresh page loads.
      **Files**: `app-relayout.ts`, `app-frame-svg.ts`, `app-stage-svg.ts`,
      `app-shell-resize.ts`.
      **Verify**: `npm --prefix packages/layout-engine test -- app-relayout.test.ts app-frame-svg.test.ts app-stage-svg.test.ts app-shell-resize.test.ts`
      **Accept**: horizontal/vertical switching updates page bounds and visible
      canvas without reload.

## Phase 2: Engine State and Compatibility

- [ ] **T020** Make implicit v3 explicit in preview config.
      **Do**: ensure frame documents with no authored `meta.layout_engine`
      resolve to active `v3` in server context and `window.__DG_CONFIG`.
      **Files**: `apps/preview/src/preview-host/frame-documents.ts`,
      `builtin-autolayout-host.ts`.
      **Verify**: `npm --prefix apps/preview test`
      **Accept**: `test-deep-nesting` renders v3 in the engine field.

- [ ] **T021** Filter compatible engines by registry result.
      **Do**: ensure compatible engine lists are produced only from
      `evaluatePreviewEngineCompatibility()` for the current document kind and
      frame summary.
      **Files**: `packages/layout-engine/src/preview-engine/registry.ts`,
      `apps/preview/src/preview-host/frame-documents.ts`,
      `frame-document-actions.ts`.
      **Verify**: `npm --prefix apps/preview test`
      **Accept**: incompatible ELK/Dagre engines are not shown for the inbox
      fixture, and save rejects them with a clear reason.

- [ ] **T022** Render active engine controls, not layered defaults.
      **Do**: make ELK and graph-layout control renderers read the active
      manifest's `controlSpecs` and section ownership every time the engine
      changes.
      **Files**: `elk-layout-controls.ts`, `elk-shell-controller.ts`,
      `scripts/preview/graph-layout-controls.js`,
      `scripts/preview/graph-layout-controller.js`.
      **Verify**: `npm --prefix apps/preview test`; `npm --prefix packages/layout-engine test -- preview-engine-elk-runtime.test.ts preview-ui-context.test.ts`
      **Accept**: each ELK-family engine exposes its own controls; Dagre exposes
      only graph-layout controls.

- [ ] **T023** Keep control persistence namespace-safe.
      **Do**: verify control saves write only keys allowed by the active
      manifest-derived namespace set.
      **Files**: `apps/preview/src/persistence/frame-engine-layout-namespaces.ts`,
      `apps/preview/src/persistence/frame-diagram.test.ts`.
      **Verify**: `npm --prefix apps/preview test`
      **Accept**: `meta.elk` and `meta.dagre` saves pass; unsupported keys fail
      before YAML write.

## Phase 3: Browser Proof and Closeout

- [ ] **T030** Rebuild browser bundle.
      **Do**: rebuild after any browser-facing export or runtime change.
      **Verify**: `npm --prefix packages/layout-engine run build:browser`;
      `node scripts/check-browser-bundle-fresh.mjs`
      **Accept**: both commands pass.

- [ ] **T031** Live no-screenshot DOM probe.
      **Do**: probe the inbox URLs plus one non-layered engine selection.
      **Verify**: text/DOM assertions only.
      **Accept**: v3 field is populated, incompatible engines are absent, active
      engine controls are visible, inactive sections are hidden/inert, alignment
      updates rerender, and v3 direction changes resize the stage.

- [ ] **T032** Full validation.
      **Verify**:
      `npm --prefix packages/layout-engine test`;
      `npm --prefix apps/preview test`;
      `npm --prefix packages/layout-engine run build:browser`;
      `node scripts/check-browser-bundle-fresh.mjs`;
      `node scripts/check_no_new_python.mjs`
      **Accept**: all pass before closing the spec.
