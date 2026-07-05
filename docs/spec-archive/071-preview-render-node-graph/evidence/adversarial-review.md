# Adversarial review — spec 071 Phase 1 and Phase 2

Reviewer: Opus adversarial pass, 2026-07-02, branch `feat/071-preview-render-node-graph`
(HEAD `69e68fc`). Stance: treat each "phase complete" claim as false until proven.

Validation run this session:

- `npm --prefix packages/layout-engine test` — 155 files, 944 tests, green.
- `npm --prefix apps/preview test` — 155 tests, green.
- `apps/preview/src/persistence/editor-live-repaint-regression.test.ts` run in
  isolation from the correct cwd — 4/4 chromium tests execute and pass, including
  SC-001 parity (test 3) and SC-003 bucket isolation (test 4). Confirmed the
  Playwright tests are not silently skipped.

---

## Phase 1 — render node + canvas parity

**Verdict:** sound. The render-node consolidation is real and browser-proven.
Two hardening gaps are worth closing but neither blocks Phase 2, and neither is a
correctness break.

### Confirmed working

- All three stage-mount sites route through `mountPreviewRenderNode`: load /
  save→reload (`app-load.ts` line 315), engine-tab rerender
  (`app-scene-host.ts` `rerenderPreviewStageHost` → `mountPreviewRenderNode`),
  and bridge relayout (`app-layout-bridge-runtime.ts` line 2030). No direct
  `stage.replaceChildren` mount survives outside the render node in product code.
- Local patch relayout (`patchPreviewSvgFromLayout`) no longer resets the viewBox
  to `0 0 w h`; it fits through the shared `fitPreviewSvgToRenderedContent`. The
  origin-divergent fit path from the T000 inventory is gone.
- `app-editor-scene-facade.ts` was checked as a suspected fourth mounter: it
  routes through `rerenderPreviewStageFromModelHost`, not a direct stage mount.
- SC-001 parity is enforced by a genuine browser test across load, save→reload,
  engine-tab switch, param edit, and container resize on three fixtures.

### Findings

**P1-1 (medium) — mutation-state diagnostics are inert on the interaction path.**
`canvas-divergence` only fires on the engine-tab commit path
(`preview-engine-workspace-chrome.ts` line 479) and only when the geometry
signature is unchanged (`expectStableCanvas` = previous === next signature) — i.e.
visually equivalent engine switches. On the interaction / param-edit path
(`app-editor-interaction-facade.ts` `recordEditorMutationTransaction`) no `before`
state and no `expectStableCanvas` are passed, so `canvas-divergence` can never fire
there. On that same path `activeNodeId` and `activeOptionBucket` are the identical
expression (`__DG_previewRenderIntent?.engineId ?? __DG_CONFIG.active_engine_id`),
both compared against a `renderIntentEngineId` also derived from
`__DG_previewRenderIntent.engineId` — so `active-node-drift` and
`option-bucket-drift` are effectively tautological on the interaction path. The
real cross-trigger parity guarantee rests on the SC-001 browser test, not on these
diagnostics. The diagnostics are materially real on the engine-tab path (they read
independent DOM viewBoxes and compare workspace state against committed intent),
just not on the interaction path.

**P1-2 (low-medium) — the anti-regression guard is an allowlist of three files.**
`preview-render-node.test.ts` asserts only that `app-load.ts`, `app-scene-host.ts`,
and `app-layout-bridge-runtime.ts` contain no `.replaceChildren(`. A new
preview-shell file (or an existing one such as `app-grid-editor-runtime.ts`) could
introduce a direct stage mount without tripping the guard. No such bypass exists
today, but the guard does not defend against future drift the way a global
preview-shell scan would.

**P1-3 (not a blocker) — 11 render-intent commit sites remain.** Documented in
`render-path-inventory.md` and explicitly deferred to Phase 3 T030 (switch node).
Confirmed this is a plan decision, not an oversight; it is not a Phase 1 reopen
trigger.

---

## Phase 2 — interpreter node state isolation and per-node persistence (T020–T022)

**Verdict:** T022's stated acceptance bar holds (round-trip persistence and
foreign-key rejection proven, all suites green). "T022 is complete" is not
bulletproof: one real correctness gap and one evidence gap should be logged before
Phase 3 adds the switch node. Neither is a hard failure against T022's written
verify criteria.

### Findings

**P2-1 (medium) — merge-only node persistence can resurrect cleared node buckets.**
The save payload omits any interpreter node whose pruned bucket is empty
(`preview-override-model.ts` `readPreviewPersistedLayoutOverrides`, line ~252:
`if (Object.keys(bucket).length === 0) continue;`), and the write path merges the
payload into the existing `meta.<family>_nodes` map rather than replacing it
(`frame-engine-layout-namespaces.ts` `applyEngineLayoutNodeNamespaceOverrides`).
Consequence: if a non-active node (e.g. `elk-radial`) had saved params and the user
clears them all, that node is dropped from the payload, so the stale YAML bucket
survives sanitization and rehydrates into the registry on reload — the user sees
params they thought they cleared. Per-key clears within a still-present node work
correctly (that node is replaced wholesale). Only whole-node emptying leaks. Not
covered by any test. This is the direct blind spot of the "merge instead of
replace" design the T022 handoff advertises.

**P2-2 (medium) — no browser proof that non-active node buckets survive a real
save→reload.** The SC-003 browser test proves in-session isolation across
layered → radial → layered → dagre → layered but never saves or reloads. The
parity test does save→reload but only asserts the fitted viewBox, not `byOperator`.
The only proof that `meta.elk_nodes` / `meta.dagre_nodes` round-trips is the unit
test in `frame-diagram.test.ts`, which exercises the YAML persist/parse boundary,
not the browser hydration path (`readFrameYamlEngineLayoutNodeBuckets` →
`replaceLayoutOperatorNodeBucketsForNamespace`). The runtime restore of multiple
node buckets after a real reload is unit-covered only.

**P2-3 (low) — dual persisted source of truth (compatibility alias).** The active
family is written both flat under `meta.<family>` and under
`meta.<family>_nodes[activeNode]`, and `layoutOperatorOverrides` / `layoutOverrides`
remain as derived aliases synced via `syncLegacyLayoutOperatorAliases`. Every reload
path (install-unit, `resetOverrideState`) was traced: the node bucket always wins
over the flat bucket, and the canonical renderer reads the flat `meta.elk` which
always equals the active bucket at save time — so this is redundant, not harmful.
But it is two persisted representations that can drift, and it is exactly the alias
Phase 3 should collapse when the switch node takes ownership of render intent.

**P2-4 (low) — asymmetric foreign-node handling.** A foreign node in the payload
throws; a foreign node in existing YAML is silently pruned by
`sanitizeSupportedFrameYamlEngineLayoutNodeBuckets`. Defensible, but the boundary
behaves differently depending on origin.

### Answers to the Phase 2 review questions

1. No wholesale wipe on any live path; engine-tab reinstall preserves session
   state over YAML. The one leak is P2-1 (emptied node bucket reverts to stale
   YAML).
2. Round-trippable at the YAML unit boundary for same-family and cross-family;
   unproven through the real browser save→reload path (P2-2).
3. Foreign keys and foreign nodes are both rejected per-node at the write boundary,
   not by global filtering.
4. Blank-valid values are correctly scoped to enums that declare a `''` option;
   numeric and non-blank-enum clears still work.
5. Yes — the flat `meta.<family>` bucket plus the `layoutOperatorOverrides` alias
   are a redundant second source of truth (P2-3) that Phase 3 should collapse
   before adding the switch node.

---

## Recommendation

Do not reopen Phase 1 or T022 against their written criteria — both are met and
green. Before starting Phase 3, close the follow-ups tracked in `tasks.md`:
T016, T017 (Phase 1 hardening) and T023, T024 (Phase 2 correctness + evidence).
The natural home for P2-1/P2-3 is the Phase 3 cook/switch work, which will own
render intent and the flat-alias collapse anyway.
