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

