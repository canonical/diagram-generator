# Agent inbox

Focused last-session → next-session handoff only. Keep this short.

- **Human notes:** [`INBOX.md`](INBOX.md) — author → agent.
- **Execution order & backlog:** [`TODO.md`](TODO.md) (read at session start).
- **Active-spec index:** [`docs/specs.md`](docs/specs.md).
- **Durable per-spec detail:** `specs/<id>-<slug>/`.

Do not park full session logs, spec inventories, or validation transcripts
here — those belong in the relevant `specs/<id>-<slug>/` package.

---

## Handoff — 2026-07-01

- **Branch / tree:** `feat/071-preview-render-node-graph`. Dirty-tree work from
  the pre-071 state was preserved on `wip/pre-071-reconcile`; this branch is the
  clean continuation base for spec 071.
- **Phase 1 status:** render-node consolidation is now live on this branch.
  Load, save→reload, engine-tab rerender, and bridge relayout all mount through
  the typed render node, `patchPreviewSvgFromLayout` no longer resets `0 0 w h`
  before fitting, the spec 069 mutation state vector now carries
  `activeNodeId` + `fittedViewBox`, and the repo-owned browser regression for
  SC-001 is green across `example-deployment-pipeline`,
  `mongo-octavia-ha`, and `support-engineering-flow`.
- **Evidence:** `specs/071-preview-render-node-graph/evidence/render-path-inventory.md`
  and `specs/071-preview-render-node-graph/evidence/canvas-parity-baseline.json`.
- **Current ask:** run an adversarial review of Phase 1 before starting spec 071
  Phase 2.

## Prompt — Opus Adversarial Review

Review `feat/071-preview-render-node-graph` adversarially as if the claim
"spec 071 Phase 1 is complete" is false until proven otherwise.

Focus files:

- `packages/layout-engine/src/preview-shell/preview-render-node.ts`
- `packages/layout-engine/src/preview-shell/app-load.ts`
- `packages/layout-engine/src/preview-shell/app-scene-host.ts`
- `packages/layout-engine/src/preview-shell/app-grid-editor-runtime.ts`
- `packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts`
- `packages/layout-engine/src/preview-shell/app-frame-svg.ts`
- `packages/layout-engine/src/preview-shell/editor-mutation-transaction.ts`
- `packages/layout-engine/src/preview-shell/preview-engine-workspace-chrome.ts`
- `apps/preview/src/persistence/editor-live-repaint-regression.test.ts`
- `specs/071-preview-render-node-graph/tasks.md`
- `specs/071-preview-render-node-graph/evidence/render-path-inventory.md`
- `specs/071-preview-render-node-graph/evidence/canvas-parity-baseline.json`

Questions to answer:

1. Is there still any live stage-mount or fitted-canvas path for load,
   save→reload, engine-tab switch, local patch relayout, or bridge relayout
   that bypasses the typed render node or depends on an unowned legacy browser
   hook?
2. Are the new mutation-state diagnostics materially real, or do
   `activeNodeId` / `fittedViewBox` / `canvas-divergence` only prove tautologies
   in tests without protecting the actual runtime?
3. Does the SC-001 browser regression genuinely prove parity across the five
   triggers, or is any part of it accidentally choosing only trivial/equivalent
   paths, reusing stale DOM, or missing a user-visible failure mode?
4. Is any remaining direct `commitPreviewRenderIntentToWindow` or
   `replaceChildren` ownership still a Phase 1 blocker rather than a later-phase
   concern?
5. Is there any reason Phase 1 should be reopened before moving to interpreter
   node state isolation in Phase 2?

Required stance:

- Findings first, ordered by severity.
- Attack the real browser/runtime path, not just the unit seams.
- Assume the branch can still hide a second unfitted mount path until you can
  rule it out concretely.

## Handoff — 2026-07-02

- **Spec 071 / T021 landed:** commit `9b08d21` (`Complete spec 071 task T021`)
  removes source-side ownership of `layoutOperatorOverrides` and
  `__DG_activeLayoutOperatorKey`, updates the focused layout-engine suites, and
  keeps the real browser SC-003 regression green via snapshot-derived active
  bucket reads.
- **Spec 071 / T022 landed (uncommitted at handoff time):** per-node
  persistence now uses family-scoped node namespaces such as
  `meta.elk_nodes` / `meta.dagre_nodes` while keeping the active family bucket
  flat under `meta.<family>` for compatibility. Reload hydrates every
  interpreter bucket into the node registry, engine-tab reinstalls preserve
  unsaved node buckets instead of wiping them back to YAML, save payload
  collection merges `_nodes` namespaces instead of replacing them, and
  blank-valid enum values such as `elk.direction: ''` survive save→reload.
- **High-signal evidence:** `apps/preview/src/persistence/editor-live-repaint-regression.test.ts`
  is green again for SC-001 + SC-003, including the prior failing
  `mongo-octavia-ha` save→reload parity case under `elk-layered`.

## Prompt — Opus Adversarial Review (Phase 2 Save/Reload + Isolation)

Review `feat/071-preview-render-node-graph` adversarially as if the claim
"spec 071 T022 is complete" is false until proven otherwise.

Focus files:

- `packages/layout-engine/src/preview-shell/layout-operator-overrides.ts`
- `packages/layout-engine/src/preview-shell/preview-override-model.ts`
- `packages/layout-engine/src/preview-shell/app-grid-editor-runtime.ts`
- `packages/layout-engine/src/preview-shell/app-grid-editor-install-unit.ts`
- `packages/layout-engine/src/preview-engine/layout-params-controller.ts`
- `packages/layout-engine/src/preview-shell/frame-yaml-engine-layout-contract.ts`
- `apps/preview/src/persistence/frame-engine-layout-namespaces.ts`
- `apps/preview/src/persistence/frame-diagram.ts`
- `apps/preview/src/persistence/frame-diagram.test.ts`
- `apps/preview/src/persistence/editor-live-repaint-regression.test.ts`
- `specs/071-preview-render-node-graph/tasks.md`

Questions to answer:

1. Does any live save, reload, engine-tab reinstall, or workspace rerender path
   still drop unsaved interpreter buckets back to the flat family namespace or
   wipe them back to YAML state?
2. Is `meta.<family>_nodes` genuinely round-trippable across save → canonical
   reload → browser restore for both same-family engines (`elk-layered`,
   `elk-radial`) and cross-family engines (`dagre`)?
3. Are foreign-key and foreign-node rejections enforced at the correct node
   boundary, or can malformed payloads still leak through shared family
   sanitizers?
4. Do blank-valid persisted values only survive where the manifest explicitly
   permits them, or did the fix accidentally make empty-string clears stop
   working for numeric / non-blank enum controls?
5. Is any remaining direct `engine_layout_overrides` replacement or
   `layoutOperatorOverrides` compatibility alias still masking an ownership gap
   that Phase 3 should solve before adding the switch node?

Required stance:

- Findings first, ordered by severity.
- Attack the real save/reload/browser path, not just unit seams.
- Assume shared-family namespaces like `meta.elk` still hide one more state-loss
  bug until you can rule it out concretely.

