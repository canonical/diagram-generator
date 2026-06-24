# Tasks: Preview Editor Recovery

**Input**: Design documents from `/specs/050-preview-editor-recovery/`

**Branch**: `feat/050-preview-editor-recovery`

## How to use this file (read first)

This file is the execution script for the preview-editor recovery. It is written
for an implementing agent that should do the grunt work without re-deriving the
architecture. Follow these rules:

1. **Work top to bottom.** Phase 0 establishes a trustworthy test baseline.
   Do not start UI-recovery phases while the engine suite is red, or you cannot
   tell a fix from a regression.
2. **One task = one commit.** Each task lists *Owner files*, *Steps*, and
   *Verify*. Do not close a task until its Verify command passes.
3. **Fix in TypeScript owners only.** Never add behaviour to
   `scripts/preview/editor.js` or `scripts/preview/layout-bridge.js`. They are
   thin browser wrappers. If a fix seems to need new JS logic, the real owner is
   a `packages/layout-engine/src/preview-shell/*` or
   `packages/layout-engine/src/preview-engine/*` module. Route it there.
4. **Rebuild the browser bundle after changing any browser-visible export:**
   `npm --prefix packages/layout-engine run build:browser`. The live editor
   loads `dist/layout-engine.iife.js`, not the `.ts` source.
5. **Live probe = Chrome, canonical route `/view/v3:<slug>`.** Use disposable
   fixtures for any test that saves (see Phase 0 T0c). Never mutate a real
   committed frame YAML during a live save probe.
6. **Update [`recovery-matrix.md`](./recovery-matrix.md)** when a surface moves
   from Unverified to Pass/Fixed/Deferred. The matrix is the source of truth for
   what is recovered; this file is the work order.

### Verification commands (canonical)

```bash
# Engine + shell unit/contract suites
npm --prefix packages/layout-engine test
# Focused shell suites used throughout this spec
npm --prefix packages/layout-engine test -- browser-entry app-bootstrap app-grid-editor app-layout-bridge-runtime app-relayout app-selection-host app-text-edit
# Preview host + persistence suites
npm --prefix apps/preview test
# No new Python product logic
node scripts/check_no_new_python.mjs
# Rebuild browser bundle for live probes
npm --prefix packages/layout-engine run build:browser
```

---

## Phase 0 - Establish a trustworthy baseline (do this first)

The layout-engine suite currently fails **16 parity tests** in
`tests/parity.test.ts` (`test-deep-nesting`, `test-alignment-grid`; frames off by
100-128px). Evidence shows these failures are **pre-existing** (identical layout
source and fixtures on `main` and this branch), not caused by 046/047/050. But a
red engine suite makes "tests pass" meaningless as a recovery gate. Resolve it
before recovery work.

- [ ] T0a Reproduce and classify the parity failures.
  - **Owner files**: `packages/layout-engine/tests/parity.test.ts`,
    `packages/layout-engine/tests/fixtures/parity-fixtures.json`,
    `packages/layout-engine/tests/parity-fixture-builder.ts`,
    `packages/layout-engine/src/layout.ts`,
    `packages/layout-engine/src/frame-classes.ts`.
  - **Steps**:
    1. Run `npm --prefix packages/layout-engine test -- parity` and capture the
       full list of failing frame ids and expected-vs-actual deltas.
    2. For `test-deep-nesting` and `test-alignment-grid`, identify the layout
       code that produces the diverging `y`/`h` (heading inset, baseline grid,
       nesting-level class). The ~107px and ~128px deltas point at a
       heading-row / nesting-level placement change.
    3. Use `git log -p` on `layout.ts` and `frame-classes.ts` since the fixtures
       were last regenerated (`e45bd18`) to find the intended behaviour change.
  - **Verify**: a written classification in `recovery-matrix.md` under a new
    "Engine baseline" row: each failing fixture is either **(A) stale golden**
    (layout intentionally changed; fixture must be regenerated) or **(B) real
    layout regression** (golden is correct; layout must be fixed).
  - **Done when**: every one of the 16 failures is labelled A or B with a
    one-line reason and the responsible source line.

- [ ] T0b Resolve the parity baseline to green.
  - **If T0a says stale golden (A)**: regenerate the affected fixture
    expectations from the current engine and commit, with a commit body that
    names the intended behaviour change and the commit that introduced it. Do
    **not** blanket-regenerate; only regenerate fixtures classified A.
  - **If T0a says real regression (B)**: fix the layout source so the committed
    golden passes. Add a one-line regression note to the fixture or test.
  - **If a failure cannot be resolved this session**: quarantine it explicitly
    with `it.fails(...)` or `it.skip(...)` plus an inline `// TODO(050-T0b):`
    comment and a matrix row. Quarantine is a last resort and must be visible,
    never silent.
  - **Verify**: `npm --prefix packages/layout-engine test` reports 0 unexpected
    failures (quarantined cases are explicit).
  - **Done when**: the engine suite is green or every remaining red is an
    explicit, documented quarantine.

- [ ] T0c Stand up a disposable-fixture live-probe harness.
  - **Owner files**: `scripts/diagrams/frames/` (add a `preview-smoke`-class
    throwaway frame if missing), `apps/preview/src/preview-host/*`.
  - **Steps**: create or confirm a small throwaway frame slug used only for live
    save/reload probes so no committed diagram is mutated. Document the slug and
    the start command (`npm run preview`) at the top of `recovery-matrix.md`.
  - **Verify**: `npm run preview` serves the throwaway slug at
    `/view/v3:<slug>` and a save round-trips to a temp path, not a tracked YAML.
  - **Done when**: the matrix names the disposable slug and the save target.

---

## Phase 1 - Recovery Audit

- [x] T001 Build an editor recovery matrix from the spec and map each UI
      surface to its typed owner, current tests, and observed status.
- [x] T002 Run the current targeted preview/editor suites and record the first
      failing owner for each broken surface.
- [ ] T003 Add a focused bootstrap smoke contract proving the editor route binds
      every required runtime.
  - **Owner files**: `packages/layout-engine/src/preview-shell/app-bootstrap.ts`,
    `packages/layout-engine/src/preview-shell/app-editor-runtime-set.ts`,
    `packages/layout-engine/tests/app-bootstrap*.test.ts`.
  - **Steps**: assert that after bootstrap the runtime set exposes a non-null
    scene, selection, relayout, inspector (display + mutation + selection),
    keyboard, and save runtime, and that the stage SVG node exists. Drive it
    through the same install-unit entry the browser uses
    (`createPreviewGridEditorInstallUnitFromLegacyEditorHost`), not a hand-built
    fake, so the test fails if a real contract is unwired.
  - **Verify**: `npm --prefix packages/layout-engine test -- app-bootstrap`.
  - **Done when**: the smoke test fails if any required runtime is missing.
- [ ] T004 Mark any intentionally deferred surface in the matrix with a reason,
      owner, and follow-up spec pointer.

---

## Phase 2 - Bootstrap And Stage Interactions

> Confirmed live regression to fix in this phase: after an inspector- or
> interaction-triggered relayout replaces the stage SVG, `.dg-selected`
> selection chrome is lost (matrix: Single-selection inspector). The relayout
> refresh path must reapply selection chrome from model state.

- [ ] T010 Fix missing or miswired browser-entry exports consumed by thin
      preview wrappers.
  - **Owner files**: `packages/layout-engine/src/browser-entry-preview-shell.ts`,
    `packages/layout-engine/src/browser-entry*.ts`,
    `packages/layout-engine/src/preview-shell/preview-shell-*-barrel.ts`.
  - **Steps**: for every `window.__DG_get*Contract()` accessor referenced by
    `scripts/preview/*.js`, confirm a matching export exists and returns the
    expected shape. List any wrapper accessor that resolves to `undefined`.
  - **Verify**: `npm --prefix packages/layout-engine test -- browser-entry` plus
    a console-error-free load on `/view/v3:<smoke-slug>`.
- [ ] T011 Restore diagram picker/route load and stage binding behavior.
  - **Owner files**: `app-diagram-navigation.ts`, `app-load.ts`,
    `app-stage-binding-runtime.ts`.
  - **Steps**: verify canonical `/view/v3:<slug>` and alias `/v3/view/<slug>`
    both render the stage and select the canonical picker value; exercise
    next/previous stepping (matrix flags stepping as not yet live-verified).
  - **Verify**: `npm --prefix packages/layout-engine test -- app-diagram-navigation`
    plus a live next/previous probe.
- [ ] T012 Restore selection, hover, selection chrome, and tree/inspector
      synchronization — including chrome restore after relayout refresh.
  - **Owner files**: `app-selection-host.ts`, `app-selection-runtime.ts`,
    `app-selection-chrome-runtime.ts`, `app-selection-chrome.ts`,
    `app-relayout.ts`, `app-layout-bridge-runtime.ts`.
  - **Status (2026-06-24)**: the **live-resize** lane is partly done in
    `d6f2f16` (threads `reapplySelection` through `app-live-resize.ts`), but that
    commit **regressed 2 tests** in `tests/app-live-resize.test.ts`. The
    `.then(reapplySelection).finally(...)` chain adds a microtask so
    `state.running` is still `true` when the cancel/orchestration tests assert
    `false`. **Fix before continuing**: move the `reapplySelection?.()` call into
    the existing `.finally()` callback (no extra `.then()` tick), then re-run
    `npm --prefix packages/layout-engine test -- app-live-resize`. The
    **inspector-triggered** relayout path (the originally reported bug) is still
    not live-verified — `reapplySelection` is already wired through
    `app-editor-scene-facade.ts`/`app-inspector-selection-runtime`, so probe it
    before adding new wiring.
  - **Steps**:
    1. Reproduce: select a frame, change an inspector field that triggers
       relayout, confirm `.dg-selected` is gone on the refreshed SVG.
    2. In the relayout/stage-replace completion path, reapply selection chrome
       from the current selection model (the compat already exposes
       `reapplySelection`/`syncSelectionUi`; call the typed owner equivalent
       after the SVG is replaced, not from `editor.js`).
    3. Keep tree highlight and inspector target in sync with the restored
       selection.
  - **Verify**: a focused test that selects, relayouts, and asserts the selected
    id still carries chrome and the inspector still targets it; plus a live
    probe matching the matrix repro. The full `app-live-resize` suite must be
    green (no leftover `state.running` timing regression).
- [ ] T013 Restore drag, resize, live resize, keyboard nudge, delete, undo, and
      redo through typed interaction/runtime owners.
  - **Owner files**: `app-interaction-host.ts`, `app-drag-host.ts`,
    `app-resize-host.ts`, `app-resize-interaction-runtime.ts`,
    `app-live-resize.ts`, `app-keyboard-runtime.ts`, `interaction-*.ts`,
    `editor-undo-stack.ts`, `app-frame-delete.ts`.
  - **Steps**: live-probe each gesture against the smoke slug; after each,
    assert model state, SVG state, and dirty/undo state agree. Record per-gesture
    status in the matrix (these are all currently "Unverified in live editor").
  - **Verify**: focused contract tests for each gesture group + live probe.
- [ ] T014 Add focused behavior coverage for each restored interaction group.
  - **Done when**: each gesture in T013 has at least one durable test at its
    owning layer (not re-tested in three layers).

---

## Phase 3 - Inspector And Text Editing

- [ ] T020 Restore single-selection inspector text, style, sizing, layout, and
      autolayout controls.
  - **Owner files**: `inspector-single*.ts`, `app-inspector-host.ts`,
    `app-inspector-mutation-host.ts`, `app-inspector-mutation-runtime.ts`,
    `frame-prop-actions.ts`, `frame-style.ts`,
    `inspector-autolayout-panel.ts`.
  - **Steps**: for each control class (text, style, width/height + unit, sizing
    mode, layout gap, autolayout direction) change a value, confirm the stage
    patches or relayouts, and confirm the override summary increments.
  - **Verify**: single-selection inspector contract test + live probe.
- [ ] T021 Restore multi-selection align, distribute, sizing, and delete
      controls.
  - **Owner files**: `inspector-multi*.ts`, `selection-actions.ts`,
    `app-inspector-selection-runtime.ts`, `interaction-selection.ts`.
  - **Steps**: shift/meta-select 2-3 frames; exercise align, distribute, bulk
    sizing, and bulk delete; confirm every selected frame updates consistently
    and a single undo restores the prior state.
  - **Verify**: multi-selection contract test + live probe.
- [x] T022 Restore text-block edit commit/cancel behavior.
- [ ] T023 Prove inspector/text changes update model state, SVG state, dirty
      state, undo state, and save payloads.
  - **Verify**: an assertion-rich test that, for one representative inspector
    change and one text edit, checks all five outcomes (model, SVG, dirty, undo,
    persisted override payload).

---

## Phase 4 - Engine Controls And Relayout Recovery

- [ ] T030 Restore engine switcher wiring and compatible-engine UI state.
  - **Owner files**: `packages/layout-engine/src/preview-engine/registry.ts`,
    `preview-engine/elk-shell-controller.ts`,
    `app-bootstrap.ts` (engine panel init), `scripts/preview/engine-switcher.js`.
  - **Steps**: confirm only registry-compatible engines are offered for a given
    frame and that switching rerenders through the selected lane. Use a
    disposable fixture; do not mutate committed YAML (matrix notes switching was
    not re-tested to avoid mutation).
  - **Verify**: engine-switcher contract test + disposable-fixture live probe.
- [ ] T031 Restore ELK controls, raw/debug toggles, and relayout trigger
      behavior.
  - **Owner files**: `preview-engine/elk-controls.ts`,
    `preview-engine/elk-layout-controls.ts`, `preview-engine/elk-debug-view.ts`,
    `app-relayout-runtime.ts`.
- [ ] T032 Add failed relayout coverage proving the last good render is
      preserved with a clear status.
  - **Owner files**: `app-layout-bridge-runtime.ts`, `app-relayout.ts`.
  - **Steps**: force a relayout failure (inject a throwing engine adapter) and
    assert the previous stage SVG remains and a visible status/error is set.
  - **Verify**: a forced-failure runtime test (SC-003).
- [ ] T033 Ensure engine control saves share the same compatibility validation
      used by route load and relayout.
  - **Steps**: confirm there is a single compatibility decision function used by
    the switcher UI, the relayout path, and save validation — not three copies.

---

## Phase 5 - Save, Reload, Export

- [ ] T040 Restore save client dirty-state, save, and rejected-save feedback.
  - **Owner files**: `app-save-client.ts`,
    `apps/preview/src/preview-host/frame-document-actions.ts`,
    `apps/preview/src/persistence/*`.
- [ ] T041 Add a save/reload regression covering representative stage,
      inspector, text, and engine edits.
  - **Steps**: edit one of each kind against the disposable slug, save, reload
    the route, assert canonical state survives.
- [ ] T042 Confirm export SVG reflects saved semantic state after reload.
- [ ] T043 Confirm no partial state is persisted after failed relayout or
      rejected save.

---

## Phase 6 - Verification And Handoff

- [ ] T050 Run targeted layout-engine preview-shell tests for changed owners.
- [ ] T051 Run targeted apps/preview persistence and host contract tests.
- [ ] T052 Run `npm --prefix apps/preview test`.
- [ ] T053 Run `npm --prefix packages/layout-engine test` (full suite must be
      green or all reds explicitly quarantined per T0b).
- [ ] T054 Run `node scripts/check_no_new_python.mjs`.
- [ ] T055 Confirm `scripts/preview/editor.js` and
      `scripts/preview/layout-bridge.js` did not grow behaviour-heavy ownership
      (line counts should not materially increase).
- [ ] T056 Update `recovery-matrix.md` so no surface is left Untriaged, then
      update `docs/specs.md`, `AGENTS.md` handover, and this package status.
- [ ] T057 Repo hygiene: remove the stray `image.png` accidentally committed in
      `bff309d` (a 19KB binary at repo root, not product code) with `git rm
      image.png`, and confirm no other stray binaries or screenshots are tracked
      on this branch.
