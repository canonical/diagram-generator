# Adversarial review — spec 071 Phase 3

Reviewer: Codex implementation pass, 2026-07-02, branch `feat/071-preview-render-node-graph`

Scope: T030 switch-node ownership, T031 dirty/cook model, T032 determinism proof.

## Verdict

No reopen. Phase 3 holds against its written criteria.

## What was checked

- Render-intent writer ownership:
  `packages/layout-engine/tests/preview-switch-node.test.ts`
  now source-scans product TypeScript and fails on any
  `__DG_previewRenderIntent =` write outside
  `packages/layout-engine/src/preview-shell/preview-switch-node.ts`.
- Switch-node unit coverage:
  `packages/layout-engine/tests/preview-switch-node.test.ts`
  proves frame-tree/layout-engine commit ownership and per-node cook-cache reuse.
- Bridge/runtime integration:
  `packages/layout-engine/tests/app-layout-bridge-runtime.test.ts`
  proves a return to a previously selected engine reuses cached cooked output
  instead of forcing a third cook.
- Workspace/runtime integration:
  `packages/layout-engine/tests/preview-engine-workspace-chrome.test.ts`,
  `app-grid-editor-install-unit.test.ts`, and `app-grid-editor-runtime.test.ts`
  stay green with the switch-node owner in place.
- Full layout-engine validation:
  `npm --prefix packages/layout-engine test` → 156 files, 949 tests, green.
- Live preview / browser proof:
  `npm --prefix apps/preview test -- editor-live-repaint-regression`
  runs the full preview test suite from the preview app and stays green,
  including Chromium coverage for:
  - engine-tab repaint
  - engine/bucket sync
  - Phase 1 canvas parity
  - layered → radial → layered → dagre → layered isolation, now with exact
    `viewBox` equality checks on the return-to-layered path
  - layered param change → restore forced-recook, with the same fitted
    `viewBox` after the restore

## Findings

### P3-2 (low) — cook cache currently has no eviction policy

`preview-switch-node.ts` keeps cooked output per node until that node is marked
dirty. This is correct for the current engine counts and Phase 3 goals, but it is
an unbounded in-memory cache. Not a reopen trigger; note it before Phase 4/50+
engine scaling work if memory pressure becomes observable.

## Conclusion

- T030: satisfied
- T031: satisfied
- T032: satisfied

Remaining open work in spec 071 is Phase 2 follow-up T023/T024 and Phase 4
onboarding/inventory/closeout work.
