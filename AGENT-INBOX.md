# Agent inbox

Focused last-session -> next-session handoff only. Keep this short.

- **Human notes:** [`INBOX.md`](INBOX.md) — author -> agent.
- **Execution order & backlog:** [`TODO.md`](TODO.md) (read at session start).
- **Active-spec index:** [`docs/specs.md`](docs/specs.md).
- **Durable per-spec detail:** `specs/<id>-<slug>/`.

Do not park full session logs, spec inventories, or validation transcripts
here — those belong in the relevant `specs/<id>-<slug>/` package.

---

## START HERE — cold-start plan (2026-07-05)

You are picking up after a planning session that (a) audited the "Closeout
Ready" specs, (b) decided an engine-architecture strategy, and (c) drafted the
specs to implement it. Read this section, then `docs/specs.md` for the catalog.

**Read the strategy first (the *why*):**
[`docs/architecture/node-paradigm-and-engine-strategy.md`](docs/architecture/node-paradigm-and-engine-strategy.md).
It is not cold-start prose — read it once now because the tasks below implement
it. Houdini paradigm; layout algorithms are nodes; **no "family"**; **one
implementation per algorithm (hard no-dupe contract)**; **Dagre is removed**;
force is an engine/diagram-type, not a workflow; design-foundry is the long-term
node-UI home.

**Locked decisions (do not relitigate):**
- One robust implementation per algorithm; duplicates are removed and blocked by
  a guard. **Dagre is a decided removal.**
- No `algorithmFamily` construct. Menu grouping, if any, is a cosmetic tag.
- Force stays a distinct **input schema** but must stop being a bespoke parallel
  pipeline; phase 1 is param-pane unification only.
- Render is a separate stage. Grid shell lane is renamed `frame`.

**Priority order (implement in this order unless the user reprioritises):**

1. **Spec 074 — layout algorithm consolidation.** Start concrete and decided:
   remove Dagre (`engines/dagre.engine.ts`, `dagre-controls.ts`, `builtins.ts`,
   tests) with a persist→reload migration proof, and add the **hard
   no-duplicate-algorithm guard** (each engine declares its algorithm class).
   Then do the corpus-driven survey + `decision-matrix.md`. Inputs from
   `diagram-generator-planning/docs/taxonomy` + `docs/audit/layout_mapping.py`.
   See `specs/074-layout-algorithm-consolidation/tasks.md`.
2. **Spec 073 — layout node model + param-pane unification.** Drop "family",
   rename `grid`→`frame` (compat alias), make panel/lane registration
   data-driven (**this closes the spec 046 T073 residual**), and route force
   params through the shared param pane. Do NOT delete the force input format;
   the force-pipeline convergence (T060) is deprioritised. See
   `specs/073-layout-node-model-param-unification/tasks.md`.
3. **Spec 061 — grid regression** and **Spec 064 — arrow label de-overlap.**
   Standing user-facing regressions; both are investigation-first with a
   required `findings.md`. Do after the architecture slices, or slot 061's
   "hide the broken grid affordances now" containment earlier if the user wants
   a fast visible win. See their `tasks.md`.
4. **Spec 070 — layers palette reorder.** Independent editor feature; pick up
   when the above are moving.

**Bookkeeping (fast, low-risk — do opportunistically between slices):**
- **Specs 046 and 047 are DONE** — both merged to `main` and archived under
  `docs/spec-archive/` on 2026-07-05 (046's Phase 7 reconciliation landed:
  `T034` is resolved to "met"; 047 was a fast-forward merge). Do not reopen.
- **Still outstanding: archive the 13 merged-but-unarchived specs**
  (`048, 051, 052, 054–060, 062, 063, 071`) per the "closeout ⇒ merged ⇒
  archived" rule. They are all still in `specs/`. Also refresh the now-stale
  branch references in the `AGENTS.md` handover (it still cites deleted
  `feat/046`, `feat/047`, etc.).

**Validation baseline (2026-07-05, rerun before closing anything):**
`packages/layout-engine` **975/975**, `apps/preview` **160/160**,
`check_no_new_python` ok, `check-preview-shell-size-budgets` ok.

Use a matching `feat/<id>-<slug>` branch per spec; one active spec per branch.

---

## Handoff — 2026-07-04 — spec 072 merged

Re-reviewed the closeout commit `e127dda` against my four prior findings, and
independently reran validation (not taken on trust). **The fixes are real and
the committed work is merge-ready.**

Verified fixed:
1. **Render-node fit — structurally enforced (was the main risk).**
   `mountPreviewRenderNode.fitSvgToContent` is now a **required** param and is
   called unconditionally; `app-scene-host` and `app-load` **throw** if the
   underlying fit is ever missing (fail-fast, not silent skip); and
   `preview-render-node.test.ts` now source-scans every `mountPreviewRenderNode(`
   caller and asserts `missingFitCallers` is empty. This is the structural
   guarantee I asked for, not a convention.
2. **Skip guard added.** `playwright-test-support.ts::launchChromiumOrSkip`
   `t.skip()`s on chromium launch failure, so a browserless env no longer reds
   the suite.
3. **T010 badge removed.** `active-engine-label` is gone from src + templates
   (grep-confirmed); chrome owner shed ~35 lines; tests updated.
4. **T013 spacing.** `SHARED_BOX_RHYTHM.headingBottomGap = INSET + 8`; SVG
   goldens refreshed to match.

Independently reran (green):
- `packages/layout-engine` → `973/973`
- `apps/preview` → `160/160`, **skipped 0** (the Playwright padding / canvas-parity
  / layered-radial-dagre isolation / save→reload proofs actually executed)
- `check_no_new_python`, `check-browser-bundle-fresh`, `check-preview-shell-size-budgets` → ok

`feat/072-preview-engine-hardening` is now merged to `main`, and the 072
package is moved under `docs/spec-archive/072-preview-engine-hardening/`.

Two non-blocking caveats before/after merge:
- **INBOX.md is still not drained** (uncommitted `M INBOX.md`). It is *not* part
  of the merge (uncommitted), so the committed work is clean — but the human
  bug backlog still duplicates spec-tracked items. Drain into 061/064/closed as
  a follow-up; do not silently delete.
- **Substrate done ≠ symptoms gone.** Merging 072 hardens the render/engine
  architecture; it does **not** close the reported user symptoms (mongo-octavia
  layout, sequence styling contract, unknown-variant, horizontal→vertical arrow
  break, “box styling does nothing”). Those live in 056/057/058/059/063/069 and
  the 061/064 queue. Do not mark user bug reports resolved on this merge.

Next queue after 072 merge: 061 (grid regression) → 064 (arrow label de-overlap).

---

## Adversarial review — 2026-07-05 — are the "Closeout Ready" specs actually ready?

Audited every spec that `docs/specs.md` marks `Closeout Ready`, against git,
tasks.md, regression coverage, and a fresh full validation run. **Short answer:
most are genuinely ready at the product level, but two carry dishonest or stale
status lines, and the whole cohort sits in a "merged but not archived" limbo
that makes the catalog hard to trust.**

### Evidence (independently reran, not taken on trust)

- `packages/layout-engine` → **975/975 pass** (161 files).
- `apps/preview` → **160/160 pass**, 0 skipped.
- `check_no_new_python` → ok (9 py files, no new product-path).
- `check-preview-shell-size-budgets` → within limits.
- Trap-file line counts at HEAD: `editor.js` **316**, `layout-bridge.js` **77**,
  `editor-base.js` 587, `component-model.js` 640, `force.js` 1,436.
- Required regressions exist on disk: `frame-diagram.test.ts`,
  `editor-live-repaint-regression.test.ts`, `editor-grid-change.test.ts`,
  `editor-hug-resize-regression.test.ts`, `engine-switcher.test.ts`,
  plus 047's `render-ir-parity.test.ts` / `svg-render-style.test.ts` /
  `app-display-list-dom.test.ts`.

### Genuinely ready (tasks 0-open, on `main`, green, regression present)

`048, 051, 052, 054, 055, 056, 057, 058, 059, 060, 062, 063, 071`.
All landed on `main` (confirmed via `git log --grep` and/or merge commits), all
tasks checked, suites green. The **only** defect is process: they are still in
`specs/` as "Active packages", not archived, despite being merged. Per the
repo's own rule ("closeout ⇒ merged to `main` ⇒ archived"), these should be
moved under `docs/spec-archive/` or the catalog should restate them as
"merged, pending archive". Until then `docs/specs.md` is in limbo.

### Not honestly ready as labeled — 2 specs (both now investigated deeper 2026-07-05)

- **046 Editor host endgame — status is STALE, but the bar is actually MET.**
  Deep re-audit verdict: **the code does support 50/150/500 engines through
  typed registration points, not through `editor.js`/`layout-bridge.js`.** The
  `T034` reopened note is stale bookkeeping — its own later tasks `T046` and
  `T068` are both marked done and both already conclude "the honest answer is
  yes". Evidence (file-level): decentralized registry
  (`preview-engine/registry.ts` `registerPreviewEngine`/`resolvePreviewEngine`
  via `.find()`, no central enum); no central engine-id switch (grep-verified);
  document-kind is handler-registered + `(string & {})` extensible with the old
  central sequence-vs-frame detection replaced (T057/T058) and proven by
  `mindmap-lite-install-unit.test.ts`; `editor.js` 316 / `layout-bridge.js` 77
  are thin adapters auto-guarded by `check-preview-shell-size-budgets.mjs`
  (≤320/≤80); registration-only onboarding locked by
  `preview-node-onboarding.test.ts` + no-central-branching guards (052/071/072).
  Adding engine N+1 of an existing family = new engine file + one line in
  `builtins.ts`. **One honest, bounded residual (does NOT block the bar):** a
  brand-new *shell family* (beyond grid/force) adds panels via the typed
  `PREVIEW_PANEL_REGISTRY` in `preview-shell/preview-ui-context.ts` (~30-50
  lines, one-time per family, typed owner — not the legacy JS sinks). The
  `T032`/`T033` line-count text (1,601 / 395) is stale; real is 316 / 77.
  **What it takes to close:** reconciliation, not engineering — see the new
  `specs/046-editor-host-endgame/tasks.md` **Phase 7 (T070–T075)**.

- **047 Render IR unification — actually MERGED, provenance was a fast-forward.**
  Correction to the first-pass finding: `git reflog` shows
  `merge feat/047-render-ir-unification: Fast-forward` at `main@{29}` (`e7b3f65`).
  047 **was merged then the branch deleted**; the fast-forward left no merge
  commit and no "047" in any message, which is why the keyword grep found
  nothing. The deliverable (`render-ir.ts`, `display-list.ts`, `svg-render.ts` +
  `render-ir-parity.test.ts`, `svg-render-style.test.ts`,
  `app-display-list-dom.test.ts`) is on `main` and green. 047 is genuinely
  ready; only the "on `feat/047`" branch reference is stale. **Fix:** restate as
  "merged to `main`" and archive.

### Also worth flagging

- **`AGENTS.md` handover is stale on locations.** It still names `feat/047`,
  `feat/051`, `feat/052-*`, etc. as current homes; those branches are deleted
  (correct per workflow) but the handover reads as if they're live. Refresh to
  "merged to `main`".
- **065 is correctly NOT closeout-ready** (`Active / blocked` on the uncaptured
  `baseline-fail.json`) — consistent.

---

## GPT bootstrap — remaining closeout-reconciliation work

> **Superseded by "START HERE" at the top of this file (2026-07-05).** Items 1
> and 2 below are **DONE**: spec 046 landed its Phase 7 reconciliation (T034
> resolved to "met") and is archived; spec 047 is archived; the T073
> panel-registry decision became **spec 073** (do it there, do not reopen 046).
> Only item 3 (archive the 13) and item 4 (refresh AGENTS.md handover) remain.
> Kept below for the audit trail.

All of the following is bookkeeping/reconciliation with green tests already
proven at HEAD. No product engineering is required unless the user opts into the
046 T073 decomposition.

1. ~~**046 — execute Phase 7 (T070–T075).**~~ **DONE + archived 2026-07-05.**
   T073 panel-registry decomposition is now owned by **spec 073**.
2. ~~**047 — restate as "merged to `main`" and archive.**~~ **DONE + archived
   2026-07-05** (fast-forward merge; branch deleted).
3. **Archive the 13 genuinely-ready merged specs** (`048, 051, 052, 054–060,
   062, 063, 071`) under `docs/spec-archive/` per the
   "closeout ⇒ merged ⇒ archived" rule. **Still outstanding** — all 13 are in
   `specs/`.
4. **Refresh `AGENTS.md` handover** to stop citing deleted feature branches.
   **Still outstanding.**

Validation baseline at 2026-07-05 (rerun before closing): `packages/layout-engine`
**975/975**, `apps/preview` **160/160**, `check_no_new_python` ok,
`check-preview-shell-size-budgets` ok. Product readiness is real; the failure was
bookkeeping honesty, and 046's veto was stale rather than unmet.

---

## Adversarial review — 2026-07-05 — spec 073 layout node model and param-pane unification

Reviewed the spec 073 branch diff against the implemented force-shell,
preview-engine, and panel-registry changes. The panel registration and shell-mode
normalization work look directionally correct, but the force param-pane
unification is **not actually closeout-ready**. Two blockers remain:

1. **P1 — shared force controls are wired through a no-op setter, so force
   parameter edits do not apply.**
   `scripts/preview/force.js:148-164` initializes
   `PreviewEngineLayoutControls` with a real setter, then immediately calls
   `PreviewEngineShellController.wirePanel()` after configuring the controller
   with `setLayoutOverrides: () => {}` and `requestLayoutRelayout: () => null`.
   The generic control runtime writes changes through `setOverrides(next)` and
   `controller.applyLayoutOverrides(next)` before scheduling relayout
   (`packages/layout-engine/src/preview-engine/layout-params-controls.ts:554-567`).
   In force mode those writes resolve to no-ops, so the pane rebuilds from the
   unchanged `committedSnapshot` and user edits snap back instead of updating
   the live force preview. The new SC-001 test
   (`packages/layout-engine/tests/preview-engine-elk-runtime.test.ts:112-204`)
   only checks that labels render; it never exercises a write path, so this
   regression currently ships green.

2. **P1 — the new shared Render control is dead: `curve_handle_ratio` never
   reaches the force runtime state.**
   The shared force override reader now advertises
   `curve_handle_ratio` from `snapshot.render`
   (`scripts/preview/force.js:121-126`), and writes it back through
   `updateForceSimulationParams(...)` (`scripts/preview/force.js:130-141`).
   But `updateForceSimulationParams` only mutates `state.spec.simulation` fields
   and ignores render-scoped keys entirely
   (`packages/layout-engine/src/force-runtime.ts:582-606`), so the new
   "Render / Curve handle ratio" control cannot affect the live preview or the
   saved YAML. I confirmed that with a targeted runtime probe:
   `updateForceSimulationParams(snapshot, { curve_handle_ratio: 0.7 })`
   left `snapshot.render.curve_handle_ratio` unchanged at `0.35`.

Recommended follow-up before re-marking 073 `Closeout Ready`:
- Fix the force shared-pane bridge so force edits write through one real setter
  path and trigger the intended live update/repaint flow.
- Add a force-specific regression that changes a shared-pane value and asserts
  the runtime snapshot and rendered/exported state both update.
- Either extend the force runtime update path to handle render-scoped overrides
  such as `curve_handle_ratio`, or route render controls through a dedicated
  updater and cover that with a test.
