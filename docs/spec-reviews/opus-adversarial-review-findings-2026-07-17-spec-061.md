# Opus adversarial review findings — Spec 061 preview grid regression

**Branch:** `feat/061-preview-grid-regression` reviewed against `main`
**Reviewer role:** skeptical pre-merge maintainer (review only, no product edits)
**Date:** 2026-07-17

## Verdict: Merge ready (as of third pass)

> **Third-pass update (2026-07-17):** re-reviewed after commits `b1b5679` and
> `458c346`. **All five findings are resolved** and independently re-validated.
> Verdict raised from *Merge with follow-ups* to **Merge ready**. See
> [Third-pass re-review](#third-pass-re-review-2026-07-17) at the end — it is
> the authoritative closeout; the first/second-pass findings below are retained
> for audit trail.
>
> **Second-pass update (2026-07-17):** re-reviewed with the full test suites run.
> Verdict unchanged at the time, but the correctness case was stronger and two
> findings moved. See [Second-pass re-review](#second-pass-re-review-2026-07-17).

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

---

## Second-pass re-review (2026-07-17)

Re-ran on request with both full suites and a deeper trace of the branch's
actual change. Net: the shipped predicate is correct and now genuinely proven
green end to end; the remaining findings are bookkeeping/coverage debt, not
correctness defects. **Verdict stays Merge with follow-ups**, and follow-ups
F1 + the F3 doc half are trivial edits.

### New evidence

- **Full `packages/layout-engine` suite: 168 files, 1032 tests, all pass**
  (`npx vitest run`, ~4.6s tests / 58s collect).
- **Full `apps/preview` suite: 170 tests, all pass, 0 fail, 0 skipped**
  (`npm test`, ~43s). This is the definitive resolution of F1.

### F1 — CONFIRMED and upgraded

The full `apps/preview` run reports **170 passing, 0 failing**. The recorded
closeout state is doubly stale: not only was the previously "failing"
`editor-live-repaint-regression.test.ts` fixed on this branch (first pass), the
whole suite is green and the count is now 170, not the "168" in
[tasks.md](../../specs/061-preview-grid-regression/tasks.md) T034 or the "one
pre-existing ELK option-default failure" in
[docs/specs.md](../../docs/specs.md). Both must be corrected before merge; a
reviewer trusting either doc would believe validation is still red.

### F3 — CORRECTED (contract coverage is real; residual gap is narrower)

My first-pass claim that the only coverage was an "initial hidden state" HTML
check was **wrong and unfair to the branch**. The server contract genuinely
asserts a capability-driven `grid-controls-section hidden` decision across
multiple non-grid engines:

- [preview-host-contract.test.ts](../../apps/preview/src/persistence/preview-host-contract.test.ts#L380) "autolayout viewer hides native grid controls for ELK-family frames" loops `elk-layered`, `elk-force`, `elk-stress`, `elk-mrtree`, `elk-radial`, `elk-rectpacking`.
- [preview-host-contract.test.ts](../../apps/preview/src/persistence/preview-host-contract.test.ts#L417) covers `dagre`; force lane is covered separately; the V3 grid-capable case asserts the section present (unhidden) at [line 729](../../apps/preview/src/persistence/preview-host-contract.test.ts#L729).
- Because the section is emitted with the `hidden` attribute, it is natively out of tab order, so the "DOM + tab order" half of T031 is effectively satisfied for the grid-controls section.

So T031 is **mostly** satisfied by pre-existing coverage. The residual gap that
still justifies a follow-up is smaller than first stated:

1. These are **server-render initial-state** assertions for a document whose
   persisted engine is non-grid. They do **not** exercise the client-side
   **V3→ELK runtime switch**, which is the path this branch actually changed
   (`shouldShowAutolayoutInspector` re-evaluation via `syncPanelVisibility`).
2. They cover the grid-controls **section**, not the inspector **9-dot
   alignment widget** — the affordance the install-unit change gates.
3. No apps/preview test asserts the T031 clause **"no grid relayout is
   dispatched for the non-grid case."**

T032 is still miscoded: it was marked `[x]` although the finding chose *retire*,
its "if restore" precondition was never met, and no overlay-mount test was added.

### New positive confirmation — the branch's fix reaches display AND mutation

I verified the concern behind FR-001/FR-003 for the 9-dot widget is genuinely
closed in code (not just cosmetically):

- Display: [app-inspector-display-runtime.ts](../../packages/layout-engine/src/preview-shell/app-inspector-display-runtime.ts#L167) passes `shouldShowAutolayoutInspector()` into the renderer as both `showAutolayoutInspector` and `showLayoutEditingControls`, so the widget is not rendered when the predicate is false.
- Mutation: [app-inspector-mutation-runtime.ts](../../packages/layout-engine/src/preview-shell/app-inspector-mutation-runtime.ts#L100) gates `layoutEditingEnabled()` off the same predicate, so a stale layout-editing mutation resolves an inert capability transaction.

Combined with the runtime `capabilityGate` on the grid-control dispatch, the
same predicate now guards the section, the 9-dot widget's rendering, its
mutation path, and the relayout dispatch. This is a genuine single-authority
boundary.

### F4 — reinforced (fail-open default is now a 4-site pattern)

The `?? true` fail-open default I flagged in the `canEditGridControls` closure
also appears at [app-inspector-display-runtime.ts:167](../../packages/layout-engine/src/preview-shell/app-inspector-display-runtime.ts#L167), [:213](../../packages/layout-engine/src/preview-shell/app-inspector-display-runtime.ts#L213), and [app-inspector-mutation-runtime.ts:100](../../packages/layout-engine/src/preview-shell/app-inspector-mutation-runtime.ts#L100). Every consumer of `shouldShowAutolayoutInspector` defaults to *showing/enabling* layout editing when the predicate function is absent. In real wiring it is always provided, so this is not currently exploitable, but for a boundary whose sole purpose is to block a non-grid relayout, fail-closed (`?? false`) is the safer default and would harden the whole family at once.

### New low-severity observation — two predicate consumers resolve the active engine by different paths

`shouldShowAutolayoutInspector` builds its context from `resolveCurrentActiveEngine()` (→ `context.activeEngine`), while `syncPanelVisibility` builds a full `engineWorkspace` and lets `activeEngine(context)` prefer `workspace.activeEngine`. Both ultimately key capabilities off the same layout-engine id, so `gridEditing` should agree, but they are two resolution paths for "the active engine" feeding one predicate. Not a defect today; worth a note so a future engine-resolution change keeps them in lockstep.

### Second-pass validation commands

Ran (in addition to first pass):

- `npx vitest run` (packages/layout-engine, full) → **1032 passed / 168 files**.
- `npm test` (apps/preview, full) → **170 passed, 0 failed, 0 skipped**.

Still not run: a live V3 + guide-mode `all` overlay DOM probe (F5) — the one
gap that a code-reading review cannot close.

---

## Third-pass re-review (2026-07-17)

Re-reviewed commits `b1b5679` ("harden grid capability regression") and
`458c346` ("fail closed inspector grid capability"). The response resolves
every finding, and in two cases (F2, F4) goes further than requested — fixing
the root cause in product code rather than the test. I re-ran the relevant
suites myself rather than trusting the summary. **Verdict: Merge ready.**

### Finding-by-finding disposition

- **F1 — RESOLVED.** [tasks.md](../../specs/061-preview-grid-regression/tasks.md) T034 drops the stale "167/168 … unrelated" note; T032 is now explicitly `N/A` with the retire rationale; [docs/specs.md](../../docs/specs.md) row 061 replaces "one pre-existing ELK option-default failure" with the live-coverage summary; `AGENT-INBOX.md` handoff is rewritten to the remediation state. Bookkeeping now matches the shipped behavior.

- **F2 — RESOLVED at the root (better than requested).** The test-side `semanticElkLayoutOverrides` shim is deleted and the strict `assert.deepEqual` on ELK save→reload buckets is restored. The normalization moved into product: [layout-operator-overrides.ts](../../packages/layout-engine/src/preview-shell/layout-operator-overrides.ts#L89) `persistableLayoutOperatorOverrides` drops only blank-valued numeric controls (`value === '' && kind === 'number'`) at both writer paths in `writeLayoutOperatorOverrideBucketForManifest`. I confirmed the predicate is safe: numeric `0` (`0 !== ''`) and blank enums (non-numeric key) are retained; only an empty-string numeric — semantically "use default" — is dropped, which is exactly the asymmetry that previously made save→reload differ. [layout-operator-overrides.test.ts](../../packages/layout-engine/tests/layout-operator-overrides.test.ts#L184) proves blank numeric dropped / blank enum kept.

- **F3 — RESOLVED.** New live Chromium test *"V3 mounts grid guides and ELK removes grid and alignment affordances after a live switch"* ([editor-live-repaint-regression.test.ts](../../apps/preview/src/persistence/editor-live-repaint-regression.test.ts#L908)) exercises the actual client-side V3→ELK switch — the path the branch changed — and asserts on V3: `#dg-grid-overlay` mounts children, `#grid-controls-section` visible with `visibleTabStopsWithin > 0`, and `.dg-align-grid button` count `=== 9`; then on ELK: section not visible, `visibleTabStopsWithin === 0`, and `.dg-align-grid` count `=== 0`. The `visibleTabStopsWithin` helper filters on `disabled`, `tabIndex >= 0`, and non-zero client rects, so it is a genuine tab-order assertion, not a `[hidden]` proxy. T031's "no relayout dispatched" clause is covered by the new runtime dispatch test (below).

- **F4 — RESOLVED (fail-closed everywhere + regressions).** All five consumers now default `?? false`: the `canEditGridControls` closure at [app-grid-editor-runtime.ts](../../packages/layout-engine/src/preview-shell/app-grid-editor-runtime.ts#L429) (with a comment explaining the deliberate runtime fail-closed boundary), plus [app-inspector-display-runtime.ts](../../packages/layout-engine/src/preview-shell/app-inspector-display-runtime.ts#L167) (both single and multi), [app-inspector-mutation-runtime.ts](../../packages/layout-engine/src/preview-shell/app-inspector-mutation-runtime.ts#L100), and [app-inspector-selection-runtime.ts](../../packages/layout-engine/src/preview-shell/app-inspector-selection-runtime.ts#L94). Two new runtime regressions prove the composition my F4 said was untested: *"fails closed for stale grid callbacks after an engine switch"* drives the **real** `canEditGridControls` closure from V3→non-grid and asserts the dispatch returns `inert` without reading runtime state, marking dirty, or requesting relayout; *"fails closed when the grid capability callback is absent"* asserts `applicable: false`. The inspector display/mutation/selection tests were rewritten to *delete* the callback and rely on the fail-closed default, so the default itself is now under test; grid-capable harnesses declare `shouldShowAutolayoutInspector: () => true` explicitly.

- **F5 — RESOLVED.** The same live test's `#dg-grid-overlay > *` assertion after entering guide mode empirically confirms the V3 overlay mounts — closing the one gap a code-reading review could not. This upgrades the finding's (d) "intentional boundary" classification from code-reasoned to demonstrated.

### Independent validation I ran this pass

- `npx vitest run` on the 6 touched layout-engine files (`layout-operator-overrides`, `app-grid-editor-runtime`, three `app-inspector-*`, `preview-ui-context`) → **48 passed**.
- `node scripts/check-browser-bundle-fresh.mjs` → **fresh** (3 artifacts vs 2 source roots).
- `node --import tsx --test --test-name-pattern="V3 mounts grid guides and ELK removes" …` → **1 pass** (real Chromium, 4.4s).
- Prior passes already confirmed full layout-engine (1032) and full apps/preview (170) green; `git diff --stat` shows **no `scripts/preview/*.js` changes**, so the spec 046 ratchet holds and no new Python was added.

### Residual notes (non-blocking)

- The F2 fix assumes `writeLayoutOperatorOverrideBucketForManifest` is the sole persist path for layout-operator buckets. The now-strict live save→reload test passing on the real product path is empirical evidence this holds; no separate writer bypasses the normalization in the exercised flow.
- A `codex-adversarial-audit-2026-07-17-spec-061.md` was added alongside this file recording the remediation from the implementer side. It does not overwrite this review; both are preserved.

No further defects found. Ready to merge.
