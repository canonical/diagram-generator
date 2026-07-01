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

- [ ] **T001** Capture a pre-refactor canvas-parity baseline.
      **Do**: for `example-deployment-pipeline`, `mongo-octavia-ha`,
      `support-engineering-flow`, record the fitted `viewBox` after load,
      save→reload, tab switch, param edit, and container resize.
      **Verify**: baseline documents the current divergence (tab switch unpadded
      vs others padded).
      **Evidence**: `evidence/canvas-parity-baseline.json`.

      Branch note: the Phase 1 render-node splice was already in progress before
      this branch-local baseline capture. The evidence file now records the
      post-unification parity baseline that SC-001 enforces on this branch; the
      earlier tab-switch divergence is no longer directly reproducible here.

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

## Phase 2 — Interpreter node state isolation

- [x] **T020** Add `preview-interpreter-node.ts` + a node registry wrapping
      existing `registerPreviewEngine` manifests; each node owns a typed param
      container keyed by node id.
      **Verify**: unit test that node A's params are unreadable from node B.
      **Evidence**: `packages/layout-engine/tests/preview-interpreter-node.test.ts`.

- [ ] **T021** Move param ownership off global state
      (`layoutOperatorOverrides`, `__DG_activeLayoutOperatorKey`) onto the node
      container; make the globals derived read-through, then remove them.
      **Verify**: ELK layered→radial→layered and layered→dagre→layered prove no
      param leak; each layout request carries only the active node's params.
      **Evidence**: `layout-operator-overrides` + `preview-engine-elk-runtime`
      tests; browser SC-003 sequence.
      Note: manifest-aware override reads/writes now route through the node
      registry and keep legacy aliases derived; full global removal and browser
      SC-003 remain open.

- [ ] **T022** Per-node persistence: save/reload each node's params under its own
      namespace; reject foreign keys at the node boundary (not global filtering).
      **Verify**: `persist → reload` round-trips each node bucket; a foreign key
      in a node payload is rejected before write.
      **Evidence**: `apps/preview/src/persistence/frame-diagram.test.ts`
      additions (temp fixture, hash-guarded).

## Phase 3 — Switch node + deterministic cook

- [ ] **T030** Add `preview-switch-node.ts` as the sole writer of render intent;
      replace all `commitPreviewRenderIntentToWindow` call sites with switch-node
      calls; the switch also commits `frameTreeJson.layoutEngine`.
      **Verify**: grep proves no direct `commitPreviewRenderIntentToWindow`
      outside the switch node; render node reads engine only from the switch.
      **Evidence**: `preview-switch-node.test.ts`; call-site grep in the spec.

- [ ] **T031** Add the dirty/cook model; save/render cooks only the selected
      branch then mounts via the render node.
      **Verify**: switching nodes recooks the selected node only; unselected
      nodes keep cached output.
      **Evidence**: cook-model unit tests.

- [ ] **T032** Determinism proof.
      **Verify**: identical (source, selected node, params) yields byte-identical
      fitted stage viewBox regardless of prior interaction order (extends T015).
      **Evidence**: real-gesture browser probe under `evidence/`.

## Phase 4 — Registration-only onboarding + closeout

- [ ] **T040** No-central-branching proof: register a dummy interpreter node and
      show it renders + switches with zero edits to `preview-render-node.ts`,
      `preview-switch-node.ts`, `editor.js`, or `layout-bridge.js`.
      **Evidence**: `packages/layout-engine/tests/preview-node-onboarding.test.ts`.

- [ ] **T041** Close the FR-010 inventory: every legacy stage-mount / fit /
      render-intent site is migrated, proven read-only, or deferred with a named
      spec id.
      **Evidence**: updated `evidence/render-path-inventory.md`.

- [ ] **T050** Full validation.
      **Verify**:
      `npm --prefix packages/layout-engine run build:browser`;
      `npm --prefix packages/layout-engine test`;
      `npm --prefix apps/preview test`;
      `node scripts/check-browser-bundle-fresh.mjs`;
      `node scripts/check-preview-shell-size-budgets.mjs`;
      `node scripts/check_no_new_python.mjs`.
      **Evidence**: command transcript summary in this package.

## Done-when (closeout)

All Closeout Gate items in `spec.md` hold: one render node, one switch node,
per-node params, SC-001 canvas parity across five triggers, SC-005 onboarding
proof, real-gesture SC-002 evidence, and a clean migration inventory.
