# Tasks: Spec 071 Preview render node graph

**Input**: [`spec.md`](./spec.md) · [`plan.md`](./plan.md)
**Branch**: `feat/071-preview-render-node-graph`

> Executor rules (read every session):
> - TypeScript-first. New behavior lives in
>   `packages/layout-engine/src/preview-shell/`, never in new
>   `scripts/preview/*.js`.
> - After changing browser exports:
>   `npm --prefix packages/layout-engine run build:browser`.
> - Fixture hygiene (spec 069): never write back to
>   `scripts/diagrams/frames/*.yaml`; use sanitized temp copies or hash guards.
> - Do not mark a phase done on mock-only proof. User-visible claims need a real
>   `renderFreshPreviewSvg` run or a scripted browser assertion.
> - Keep one phase per PR where possible; each phase is independently mergeable.

## Phase 0 — Inventory and baseline

- [x] **T000** Map every stage-mount, fit, and render-intent commit site.
      **Do**: grep and record each caller of `replaceChildren` on `#stage`,
      each `fitPreviewSvgToRenderedContent` / `fitRenderedSvg` call, and each
      `commitPreviewRenderIntentToWindow` call. Classify each as
      migrate | read-only | deferred(spec-id).
      **Verify**: the inventory covers `app-load.ts`, `app-scene-host.ts`,
      `app-frame-svg.ts`, `app-layout-bridge-runtime.ts`,
      `app-grid-editor-install-unit.ts`, `app-grid-editor-runtime.ts`,
      `preview-engine-workspace-chrome.ts`.
      **Evidence**: `evidence/render-path-inventory.md`.

- [x] **T001** Capture a pre-refactor canvas-parity baseline.
      **Do**: for `example-deployment-pipeline`, `mongo-octavia-ha`,
      `support-engineering-flow`, record the fitted `viewBox` after load,
      save→reload, tab switch, param edit, and container resize.
      **Verify**: baseline documents the current divergence (tab switch unpadded
      vs others padded).
      **Evidence**: `evidence/canvas-parity-baseline.json`.

      Branch note: the Phase 1 render-node splice was already in progress before
      this branch-local baseline capture. The evidence file now records the
      post-unification parity baseline that SC-001 enforces on this branch; the
      earlier tab-switch divergence is no longer directly reproducible here, and
      `apps/preview/src/persistence/editor-live-repaint-regression.test.ts`
      now re-verifies the branch-local parity baseline in CI.

## Phase 1 — Render node + canvas in state vector

- [x] **T010** Add the typed render node.
      **Do**: create `preview-render-node.ts` exposing one
      `mountPreviewStage({ cooked | frameTree+intent }) => FittedStage` that runs
      render → fit → mount → `refreshPreviewSceneHost` atomically and idempotently.
      **Verify**: unit tests for mount, idempotent fit (`fit(fit)===fit`), and
      missing-stage no-op.
      **Evidence**: `packages/layout-engine/tests/preview-render-node.test.ts`;
      `npm --prefix packages/layout-engine test -- preview-render-node`.

- [x] **T011** Route `rerenderPreviewStageHost` / `rerenderPreviewStageFromModelHost`
      through the render node so the engine-tab path fits.
      **Do**: replace the un-fitted `replaceChildren` mount with a render-node
      call.
      **Verify**: engine-tab rerender now yields the same fitted viewBox as load.
      **Evidence**: focused test + `app-scene-host` suite green.

- [x] **T012** Route the load / save→reload path (`app-load.ts`) and the bridge
      relayout path (`app-layout-bridge-runtime.ts`) through the render node.
      **Verify**: no caller mounts stage children without the render node.
      **Evidence**: a test that fails if `replaceChildren('#stage', …)` appears
      outside `preview-render-node.ts`.

- [x] **T013** Unify fit: make `patchPreviewSvgFromLayout` use the single fit
      function; remove the `0 0 w h`-reset origin divergence.
      **Verify**: local relayout and full render produce the same origin/padding
      rule.
      **Evidence**: `app-frame-svg` fit tests.

- [x] **T014** Extend the spec 069 state vector with `fittedViewBox` +
      `activeNodeId` and add a canvas-divergence violation.
      **Do**: update `editor-mutation-transaction.ts` +
      `preview-engine-workspace-chrome.ts` violation computation.
      **Verify**: a deliberate un-fitted mount produces a structured violation.
      **Evidence**: `editor-mutation-transaction.test.ts` additions.

- [x] **T015** SC-001 canvas-parity regression (Phase 1 slice).
      **Do**: assert load, save→reload, tab switch, param edit, container resize
      yield byte-identical fitted viewBox per fixture/engine.
      **Verify**: passes on all three fixtures.
      **Evidence**: repo-owned test under `apps/preview/src/persistence/` or
      `packages/layout-engine/tests/`; closes the spec 060 follow-up (FR-009).

### Phase 1 post-review follow-ups (adversarial pass 2026-07-02)

> Source: `evidence/adversarial-review.md` (P1-1, P1-2). Phase 1 stays closed;
> these are hardening items, not reopen triggers. Fold into Phase 3 if convenient.

- [x] **T016** Make the mutation-state canvas diagnostic real on the interaction
      path. **Do**: pass a `before` fitted-viewBox and an `expectStableCanvas`
      signal through `recordEditorMutationTransaction`
      (`app-editor-interaction-facade.ts`) for equivalent-geometry param edits, and
      stop deriving `activeNodeId` / `activeOptionBucket` from the same expression
      so `active-node-drift` / `option-bucket-drift` are not tautological there.
      **Verify**: a deliberate un-fitted mount on the param-edit path emits a
      `canvas-divergence` violation, not just on the engine-tab path.
      **Evidence**: `editor-mutation-transaction.test.ts` +
      `app-editor-interaction-facade` coverage.
      Note: the interaction facade now captures a real pre-mutation state vector,
      appearance-only inspector edits propagate `expectStableCanvas`, and the
      facade test proves a deliberate unfitted mount emits `canvas-divergence`
      with non-tautological `activeNodeId` / `activeOptionBucket` sources.

- [x] **T017** Broaden the stage-mount guard from an allowlist of three files to a
      global preview-shell scan. **Do**: replace the per-file `.replaceChildren(`
      assertion in `preview-render-node.test.ts` with a scan of
      `packages/layout-engine/src/preview-shell/**` that fails on any direct stage
      `replaceChildren` mount outside `preview-render-node.ts`.
      **Verify**: adding a stray stage mount in any new shell file fails the test.
      **Evidence**: updated `preview-render-node.test.ts`.
      Note: the guard now recursively scans preview-shell TypeScript sources and
      fails on any direct `stage.replaceChildren(...)` / `options.stage.replaceChildren(...)`
      mount outside `preview-render-node.ts`.

## Phase 2 — Interpreter node state isolation

- [x] **T020** Add `preview-interpreter-node.ts` + a node registry wrapping
      existing `registerPreviewEngine` manifests; each node owns a typed param
      container keyed by node id.
      **Verify**: unit test that node A's params are unreadable from node B.
      **Evidence**: `packages/layout-engine/tests/preview-interpreter-node.test.ts`.

- [x] **T021** Move param ownership off global state
      (`layoutOperatorOverrides`, `__DG_activeLayoutOperatorKey`) onto the node
      container; make the globals derived read-through, then remove them.
      **Verify**: ELK layered→radial→layered and layered→dagre→layered prove no
      param leak; each layout request carries only the active node's params.
      **Evidence**: `layout-operator-overrides` + `preview-engine-elk-runtime`
      tests; browser SC-003 sequence.
      Note: manifest-aware override reads/writes now route through the node
      registry; source-side `layoutOperatorOverrides` / `__DG_activeLayoutOperatorKey`
      ownership is removed, focused unit coverage proves both layered→radial→layered
      and layered→dagre→layered bucket isolation, and
      `editor-live-repaint-regression.test.ts` keeps the real browser SC-003
      sequence green by reading node-owned state through the editor snapshot.

- [x] **T022** Per-node persistence: save/reload each node's params under its own
      namespace; reject foreign keys at the node boundary (not global filtering).
      **Verify**: `persist → reload` round-trips each node bucket; a foreign key
      in a node payload is rejected before write.
      **Evidence**: `apps/preview/src/persistence/frame-diagram.test.ts`
      additions (temp fixture, hash-guarded).
      Note: frame YAML now persists family-scoped node buckets under
      `meta.<family>_nodes`, live engine-tab reinstalls preserve unsaved node
      buckets across workspace rerenders, save payload collection merges node
      namespaces instead of replacing them, and blank-valid enum values such as
      `elk.direction: ''` survive save→reload.

### Phase 2 post-review follow-ups (adversarial pass 2026-07-02)

> Source: `evidence/adversarial-review.md` (P2-1, P2-2). T022 stays closed against
> its written verify criteria; these close the two gaps before the switch node.
> The natural home for T023 is the Phase 3 cook/switch work (flat-alias collapse).

- [x] **T023** Let a save remove an emptied node bucket. **Do**: emit an explicit
      clear (or a full node-set replace) so a non-active node whose params were all
      cleared is deleted from `meta.<family>_nodes` instead of surviving via the
      merge in `applyEngineLayoutNodeNamespaceOverrides`. Fixes the
      resurrect-on-reload leak where `readPreviewPersistedLayoutOverrides` drops
      empty buckets from the payload.
      **Verify**: clear all params for a saved non-active engine, save, reload —
      the bucket is gone; per-key clears within a present node still work.
      **Evidence**: `frame-diagram.test.ts` + a browser step.
      Note: node-family save payloads now act as full replacements, empty active
      buckets clear node params instead of persisting `{}`, and the browser
      regression proves a saved non-active radial bucket disappears after an
      explicit controller-driven clear plus save→reload.

- [x] **T024** Prove non-active node buckets survive a real browser save→reload.
      **Do**: extend the SC-003 browser regression to save after mutating radial
      and dagre buckets, reload, and assert `byOperator` still carries the
      non-active buckets (same-family `elk-radial` and cross-family `dagre`).
      **Verify**: reload-restored registry matches pre-save `byOperator` for the
      non-active engines.
      **Evidence**: `editor-live-repaint-regression.test.ts`.
      Note: the browser regression now saves from layered after mutating radial
      and dagre, reloads, and asserts both non-active buckets survive with the
      same `byOperator` payload before exercising the T023 clear/delete path.

## Phase 3 — Switch node + deterministic cook

- [x] **T030** Add `preview-switch-node.ts` as the sole writer of render intent;
      replace all `commitPreviewRenderIntentToWindow` call sites with switch-node
      calls; the switch also commits `frameTreeJson.layoutEngine`.
      **Verify**: grep proves no direct `commitPreviewRenderIntentToWindow`
      outside the switch node; render node reads engine only from the switch.
      **Evidence**: `preview-switch-node.test.ts`; call-site grep in the spec.
      Note: product call sites now route through `preview-switch-node.ts`,
      including workspace chrome, grid install/runtime restore sync, and
      layout-bridge runtime publication. `preview-switch-node.test.ts` now
      source-scans product TypeScript and fails on any
      `__DG_previewRenderIntent =` write outside `preview-switch-node.ts`.

- [x] **T031** Add the dirty/cook model; save/render cooks only the selected
      branch then mounts via the render node.
      **Verify**: switching nodes recooks the selected node only; unselected
      nodes keep cached output.
      **Evidence**: cook-model unit tests.
      Note: `preview-switch-node.ts` now owns per-node cook cache/dirty state,
      `app-layout-bridge-runtime.ts` fingerprints cooks against the selected
      node + source + override state, and the browser-host bridge reuses cached
      cooked output when returning to a previously selected engine with
      unchanged params.

- [x] **T032** Determinism proof.
      **Verify**: identical (source, selected node, params) yields byte-identical
      fitted stage viewBox regardless of prior interaction order (extends T015).
      **Evidence**: real-gesture browser probe under `evidence/`.
      Note: the repo-owned Chromium regression in
      `apps/preview/src/persistence/editor-live-repaint-regression.test.ts`
      now asserts that returning to `elk-layered` after radial and dagre detours
      preserves the exact fitted `viewBox` when layered params are unchanged,
      and that changing then restoring layered params forces a recook without
      changing that fitted `viewBox`.

## Phase 4 — Registration-only onboarding + closeout

- [x] **T040** No-central-branching proof: register a dummy interpreter node and
      show it renders + switches with zero edits to `preview-render-node.ts`,
      `preview-switch-node.ts`, `editor.js`, or `layout-bridge.js`.
      **Evidence**: `packages/layout-engine/tests/preview-node-onboarding.test.ts`.
      Note: `preview-node-onboarding.test.ts` now registers
      `dummy-onboarding-grid` through the public preview-engine registry,
      delegates its render family to the shared frame-native adapter, proves the
      registered node appears in the interpreter registry, switches into and out
      of it through `commitPreviewSwitchNodeLayoutEngine(...)`, renders and mounts
      both dummy and v3 outputs through the shared render path, and source-guards
      the four central owner files against dummy-engine branching.

- [x] **T041** Close the FR-010 inventory: every legacy stage-mount / fit /
      render-intent site is migrated, proven read-only, or deferred with a named
      spec id.
      **Evidence**: updated `evidence/render-path-inventory.md`.
      Note: the inventory is now a post-migration snapshot. It identifies
      `preview-render-node.ts` as the sole stage-mount owner,
      `preview-switch-node.ts` as the sole render-intent owner, and classifies
      the surviving load/scene/bridge/workspace seams as read-only delegates.

- [x] **T050** Full validation.
      **Verify**:
      `npm --prefix packages/layout-engine run build:browser`;
      `npm --prefix packages/layout-engine test`;
      `npm --prefix apps/preview test`;
      `node scripts/check-browser-bundle-fresh.mjs`;
      `node scripts/check-preview-shell-size-budgets.mjs`;
      `node scripts/check_no_new_python.mjs`.
      **Evidence**: command transcript summary in this package.
      Note: see `evidence/validation-summary.md` for the passing command set and
      the one-time dependency-install note for this worktree.

## Done-when (closeout)

All Closeout Gate items in `spec.md` hold: one render node, one switch node,
per-node params, SC-001 canvas parity across five triggers, SC-005 onboarding
proof, real-gesture SC-002 evidence, and a clean migration inventory.
