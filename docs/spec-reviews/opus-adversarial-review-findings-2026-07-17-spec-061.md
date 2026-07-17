# Opus adversarial review findings — Spec 061 preview grid regression

**Branch:** `feat/061-preview-grid-regression` reviewed against `main`
**Reviewer role:** skeptical pre-merge maintainer (review only, no product edits)
**Date:** 2026-07-17

## Verdict: Merge with follow-ups

The core containment change is real and correct: the branch collapses two
previously divergent grid predicates into one typed authority
(`previewContextSupportsGridEditing`), routes the inspector's 9-dot widget
through it, and preserves the spec 046 ratchet (no `editor.js` /
`layout-bridge.js` growth, no new Python). The runtime inert-dispatch boundary
is rigorously unit-tested.

However, the branch ships with stale/contradictory closeout bookkeeping, two
checkbox claims that do not match the artifacts actually added on this branch,
a save→reload test relaxation that is tangential to the spec's stated scope,
and no end-to-end proof that the *real* ELK wiring resolves the capability gate
to inert. None of these are correctness defects in the shipped predicate, but
several directly contradict the documented closeout, so I cannot call this
Merge ready as written.

## What actually changed on this branch

`git diff main..HEAD` product/test surface is small:

- [preview-ui-context.ts](../../packages/layout-engine/src/preview-shell/preview-ui-context.ts) — extracts `previewContextSupportsGridEditing` and makes `gridControlsVisible` delegate to it.
- [app-grid-editor-install-unit.ts](../../packages/layout-engine/src/preview-shell/app-grid-editor-install-unit.ts#L753) — `shouldShowAutolayoutInspector` now calls the shared predicate instead of reading `capabilities.gridEditing` directly.
- [preview-ui-context.test.ts](../../packages/layout-engine/tests/preview-ui-context.test.ts) — one new predicate test.
- [editor-live-repaint-regression.test.ts](../../apps/preview/src/persistence/editor-live-repaint-regression.test.ts#L256) — new `semanticElkLayoutOverrides` normalization applied to ELK save→reload assertions.
- Spec package + `docs/specs.md` + `AGENT-INBOX.md` bookkeeping.

Everything else the finding leans on — `dispatchPreviewGridControlChange`'s
inert branch, its `app-grid-host.test.ts` coverage, the `canEditGridControls`
closure, the `preview-host-contract.test.ts` `grid-controls-section hidden`
assertion — **already existed on `main`**. `findings.md` acknowledges this
("main already contains the first containment slice"). That framing matters for
the checkbox findings below.

## Positive confirmations

- **Single typed authority is real.** The predicate feeds both consumers:
  - inspector display gate: [app-grid-editor-install-unit.ts](../../packages/layout-engine/src/preview-shell/app-grid-editor-install-unit.ts#L756) sets `shouldShowAutolayoutInspector` from the predicate and passes it to `browser.shouldShowAutolayoutInspector`.
  - runtime capability gate: [app-grid-editor-runtime.ts](../../packages/layout-engine/src/preview-shell/app-grid-editor-runtime.ts#L428) `canEditGridControls` derives `gridEngineApplicable` from `options.browser.shouldShowAutolayoutInspector?.()`, then feeds it into `dispatchPreviewGridControlChangeHost` as `capabilityGate`.
  Before this branch these were two different checks (`gridControlsVisible` gated on frame shell + frame-diagram + capability, while `shouldShowAutolayoutInspector` gated only on `capabilities.gridEditing`). Unifying them is the substantive fix and satisfies FR-002.
- **Inert dispatch is genuinely proven at unit level.** [app-grid-host.test.ts](../../packages/layout-engine/tests/app-grid-host.test.ts#L226) throws on every write/relayout side effect and asserts `kind: 'inert'` with `relayoutPolicy: 'none'`. A stale grid-control callback with the gate false cannot read runtime state, mark dirty, record undo, or schedule relayout.
- **Ratchet preserved.** `git diff --stat main..HEAD` shows no `scripts/preview/*.js` changes. `node scripts/check_no_new_python.mjs` → `ok (9 Python files scanned, no new product-path files)`.
- **Scene geometry is unit-covered.** [grid-overlay-scene.test.ts](../../packages/layout-engine/tests/grid-overlay-scene.test.ts#L32) proves guideMode `all` yields non-empty margin/column/row/baseline/slack shapes (pre-existing, unmodified).

## Findings

### F1 — Contradictory closeout: the "pre-existing ELK failure" was fixed on this branch (Medium, review integrity)

- [tasks.md](../../specs/061-preview-grid-regression/tasks.md) T034 records: *"167/168 passed; the existing `editor-live-repaint-regression.test.ts` ELK option-default mismatch is unrelated to Spec 061."*
- [docs/specs.md](../../docs/specs.md) status line for 061 says: *"preview validation has one pre-existing ELK option-default failure."*
- But commits `59a900a` and `bbfe7ec` on this branch modified that exact test, adding `semanticElkLayoutOverrides` so the previously-failing assertion now passes.
- **Proof:** I ran `node --import tsx --test src/persistence/editor-live-repaint-regression.test.ts` → **5/5 pass** (39.8s, real Chromium, not skipped).
- **Impact:** The documented state is internally contradictory. Either the failure is unrelated to 061 (then the branch should not fix it here and the note stands) or it is fixed by 061 (then both the T034 annotation and the `docs/specs.md` "one pre-existing failure" summary are stale and the closeout gate "full validation green" is now actually satisfiable for that file). A reviewer trusting the docs would believe validation is still red.
- **Smallest safe disposition:** Update T034 and the `docs/specs.md` summary to reflect that the test now passes, and justify (or move out) the fix — see F2.

### F2 — `semanticElkLayoutOverrides` relaxes a strict save→reload assertion and is out of spec 061 scope (Medium)

- [editor-live-repaint-regression.test.ts](../../apps/preview/src/persistence/editor-live-repaint-regression.test.ts#L256) now strips `elk.aspectRatio` and `elk.layered.spacing.baseValue` from both expected and actual override maps *only when their value is `""`*, before `assert.deepEqual`.
- **Adversarial check (requested):** the normalization is correctly narrow. It filters only when `value === "" && blankNumericDefaultKeys.has(key)`. Blank enum values (`""` on any other key) are retained and still compared, so meaningful blank-enum loss is still detected. A meaningful (non-blank) value for the two numeric keys is also retained, so real loss of those is detected. It is applied symmetrically, so it can only hide a difference where one side has `""`-for-those-two-keys and the other omits them.
- **Residual concern:** it still *relaxes* a previously strict save→reload invariant and papers over a real behavioral asymmetry the comment itself describes: those blank numeric defaults are *"present after reload or omitted after a relayout."* That asymmetry (reload persists an empty-string numeric override that a relayout drops) is a genuine persistence-normalization quirk in the ELK save path, now masked rather than fixed. This change is also tangential to spec 061's stated scope (grid affordance capability gate); it belongs to the ELK option-bucket persistence area, not the grid regression.
- **Impact:** low user-visible risk (empty numeric override ≈ no override), but it weakens a regression guard and folds unrelated persistence work into this spec.
- **Smallest safe disposition:** keep the normalization if the asymmetry is accepted, but (a) file a follow-up to make the ELK save path emit the two blank numeric defaults consistently across reload and relayout, and (b) note in the spec that this test change is a scoped exception, not part of the grid fix.

### F3 — T031 / T032 checkboxes do not match artifacts added on this branch (Medium, review integrity)

- **T031** ("*Add* an apps/preview contract/DOM test proving grid affordances are absent on a non-grid engine (DOM + tab order) and present on a grid-capable one, and that no grid relayout is dispatched") is marked `[x]`, but no new apps/preview test was added on this branch. The only matching assertion is pre-existing [preview-host-contract.test.ts](../../apps/preview/src/persistence/preview-host-contract.test.ts#L332) `assert.match(html, /id="grid-controls-section" hidden/)`, which:
  - checks the **initial server-rendered HTML** only (everything starts hidden before JS runs), not the dynamic non-grid-engine state;
  - does **not** assert tab-order removal;
  - does **not** assert "present on a grid-capable engine";
  - does **not** assert "no grid relayout dispatched."
- **T032** ("*If and only if* the finding chooses an in-scope restore, add a focused overlay-mount test") is marked `[x]`, but the finding chose **retire**, not restore, and no overlay-mount test was added. Its precondition was not met, so it should read `[ ]` / N/A.
- **Impact:** the tasks ledger overstates test coverage produced by this branch. A maintainer reading `[x] T031` would believe a dedicated non-grid DOM+tab-order+no-relayout test exists; it does not.
- **Smallest safe disposition:** either add the T031 test as written (a live DOM probe that switches to ELK and asserts the grid section/9-dot widget are absent from DOM and tab order and that no relayout fires), or downgrade the checkboxes to reflect the pre-existing coverage relied upon and mark T032 N/A.

### F4 — SC-002 "unreachable" is proven only across two disconnected unit levels (Medium)

The request warns: *do not accept a green unit test or a hidden DOM element as proof that a stale interaction or engine-switch path cannot still schedule relayout.*

- The inert-dispatch test ([app-grid-host.test.ts](../../packages/layout-engine/tests/app-grid-host.test.ts#L229)) **injects** `capabilityGate: () => ({ applicable: false })`. It proves the dispatch is inert *given* a false gate.
- The predicate test ([preview-ui-context.test.ts](../../packages/layout-engine/tests/preview-ui-context.test.ts)) proves the predicate returns false for ELK/Force/Sequence.
- **Nothing tests the composition that joins them.** The real gate is the closure at [app-grid-editor-runtime.ts](../../packages/layout-engine/src/preview-shell/app-grid-editor-runtime.ts#L428): `applicable = (browser.shouldShowAutolayoutInspector?.() ?? true) && rootSelected`. I confirmed via `grep` that no test in `apps/preview` or `packages/layout-engine/tests` exercises `canEditGridControls`, an engine-switch → relayout path, or a stale-callback-after-switch path.
- **Latent nit inside that closure:** `?? true` makes the gate **fail-open** if `shouldShowAutolayoutInspector` is ever unwired. In the shipped install-unit it is always provided, so this is not currently exploitable, but a fail-closed default (`?? false`) would be safer for a boundary whose entire purpose is to block a non-grid relayout.
- **Impact:** the end-to-end guarantee that an ELK document (or a V3→ELK switch with a pending repaint, or a stale direct callback) cannot schedule relayout rests on manual tracing, not a test. Regressions in the closure or its wiring would pass CI.
- **Smallest safe disposition:** add one live/integration test that drives the real closure with an ELK engine + selected root and asserts the dispatch returns inert and no relayout is requested; assert the same across a V3→ELK switch.

### F5 — The V3 "lost grid" report is refuted by code-reading, not by a live artifact (Low/Medium)

The original INBOX report had two parts. The branch fixes part 2 (ELK affordance leak + relayout error). For part 1 ("the layout grid is lost… controls make no sense against what the stage shows", `image-3.png`), `findings.md` classifies it as **(d) intentional boundary + stale/ambiguous report** and concludes the V3 overlay path is intact because the mount/geometry/update seams "are present and covered by focused tests."

- That reasoning is code-grounded and fair as far as it goes: `loadGridInfo`/`renderGridOverlay`/`app-scene-host` seams exist, default guide mode is deliberately `off` ([app-grid-runtime.ts](../../packages/layout-engine/src/preview-shell/app-grid-runtime.ts) `guideMode = options.initialGuideMode ?? 'off'`), and scene geometry is unit-proven for guideMode `all`.
- **But there is no live proof** that a real V3 document mounts a non-empty `#dg-grid-overlay` into the stage SVG when guide mode is cycled to `all`. The scene-generation unit test does not exercise the DOM mount/replace path in `app-scene-host.ts`. FR-004/SC-004 ("grid-capable documents keep working grid controls, or the finding records none currently do and why") is asserted, not demonstrated.
- **Impact:** if the user's original "grid makes no sense" state was a real V3 mount/geometry defect (not just guide-mode `off`), this spec closes without catching it and without a repro. The classification could be quietly wrong.
- **Smallest safe disposition:** before closeout, run one no-screenshot live probe on a V3 grid document — cycle guide mode to `all`, assert `#dg-grid-overlay` exists with non-empty children, then change a grid control and assert the overlay updates — and record the result (pass = classification confirmed; fail = reopen part 1). This is exactly the T032/T036 style probe that was skipped because "restore" was not chosen.

## AGENTS.md closeout gate check

- **Ratchet (no `editor.js`/`layout-bridge.js` growth):** PASS — no `scripts/preview` changes in the diff.
- **No new Python:** PASS — guard run, ok.
- **"Touches the preview override/save path ⇒ needs a repo-owned persist→reload regression":** BORDERLINE. The product change is visibility/capability gating and does not modify `PERSIST_FRAME_KEYS` or save code, so it arguably does not "touch" persistence. The only persistence-adjacent change is the *relaxation* of an existing save→reload test (F2), which is the opposite of adding a regression. If the gate is considered to affect whether grid overrides can be persisted for non-grid engines, a `persist→reload` test proving grid overrides never survive on an ELK document is missing.

## Validation commands

Ran:

- `npx vitest run tests/preview-ui-context.test.ts tests/app-grid-host.test.ts` (packages/layout-engine) → **22 passed**.
- `node --import tsx --test src/persistence/editor-live-repaint-regression.test.ts` (apps/preview) → **5/5 passed**, real Chromium, ~39.8s.
- `node scripts/check_no_new_python.mjs` → **ok** (9 files, no new product-path Python).

Did not run (declared, not claimed green):

- Full `npm --prefix packages/layout-engine test` (whole vitest suite) — ran only the two grid-relevant files.
- Full `npm --prefix apps/preview test` (all ~168 browser tests) — ran only the modified ELK file. The T033–T035 closeout claim of a full green suite is therefore **not independently re-verified here**; F1 shows the recorded count/status is already stale.
- Live V3 + guide-mode `all` overlay probe (F5) and a live ELK non-grid engine-switch relayout probe (F4) — not executed. Because I have findings, I am not asserting "No findings"; the request's live-exercise precondition applies only to a No-findings verdict.

## Summary of required follow-ups before Merge ready

1. Reconcile F1: fix the contradictory T034 note and `docs/specs.md` status; re-run and record the full `apps/preview` suite result.
2. Resolve F3: make T031/T032 checkboxes match reality, or add the T031 DOM+tab-order+no-relayout test as written and mark T032 N/A.
3. Address F4: one composition/integration test of the real `canEditGridControls` closure for ELK + engine-switch; consider `?? false` fail-closed default.
4. Address F5: one live V3 overlay probe to confirm (or refute) the (d) classification of the original "lost grid" report.
5. Scope-clarify F2: justify the save→reload normalization as an accepted exception and file the ELK blank-numeric-default consistency follow-up.
