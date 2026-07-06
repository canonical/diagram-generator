# Agent inbox

Focused last-session -> next-session handoff only. Keep this short.

- **Human notes:** [`INBOX.md`](INBOX.md) — author -> agent.
- **Execution order & backlog:** [`TODO.md`](TODO.md) (read at session start).
- **Active-spec index:** [`docs/specs.md`](docs/specs.md).
- **Durable per-spec detail:** `specs/<id>-<slug>/`.

Do not park full session logs, spec inventories, or validation transcripts
here — those belong in the relevant `specs/<id>-<slug>/` package.

---

## Adversarial review — 2026-07-06 — specs 073 + 074 delta (`06d2f896..901a4c9` + uncommitted)

Hostile review of the merged 073/074 range plus the uncommitted
`frame-style.ts` picker-label fix. Findings first, ordered by severity. Product
code only; archive/doc churn ignored except where it hides risk. Nothing here is
a "do not merge" blocker, but P2s are real correctness gaps the closeout claims
do not mention. **Next agent: work these top-down; each has a concrete file:line.**

### P2 — legacy dagre overrides silently overwrite authored ELK overrides on key collision

When a document carries **both** a `meta.dagre` and a `meta.elk` bucket (e.g. a
doc that was switched engines and never cleaned), migration merges the
dagre-translated keys **over** the authored elk keys. Both
[legacy-layout-engine-migration.ts](packages/layout-engine/src/preview-engine/legacy-layout-engine-migration.ts#L181)
(`nextEngineLayout[migratedOverrides.namespace] = { ...existing, ...translated }`)
and the persistence twin
[frame-diagram.ts](apps/preview/src/persistence/frame-diagram.ts#L107)
(`migratedMeta[metaKey] = { ...existing, ...migrated }`) spread the migrated
dagre value last, so e.g. a real authored `elk.direction` is clobbered by a
translated legacy `dagre.rankdir`. Order is object-key-order dependent, so it is
also non-deterministic-looking. No test exercises the both-namespaces-present
case (the unit + persistence tests only ever have one of the two). Decide the
precedence explicitly (authored elk should win) and add a collision test.

### P2 — force param pane init was removed; only browser-path, no unit coverage

[force.js](scripts/preview/force.js#L148) dropped the
`previewEngineLayoutControls().init({ getOverrides, setOverrides })` call and now
relies solely on `controller.wirePanel()` + a `collectOverrides()` fallback in
`requestLayoutRelayout`. `collectOverrides` is real
([layout-params-controls.ts](packages/layout-engine/src/preview-engine/layout-params-controls.ts#L114)),
so the relayout path resolves — but nothing unit-tests that the force param
inputs still **render and populate** without the removed `init`. This is exactly
the "force params gone / relayout does nothing" class of user report. Validation
gap: add a force param-pane render+relayout regression (or a Playwright check),
do not trust the green TS suites here — the changed code is browser-only JS.

### P3 — unmapped dagre override keys are dropped silently

[legacy-layout-engine-migration.ts](packages/layout-engine/src/preview-engine/legacy-layout-engine-migration.ts#L96)
`continue`s on any key absent from the 4-entry `DAGRE_TO_ELK_KEY_MAP`
([L12](packages/layout-engine/src/preview-engine/legacy-layout-engine-migration.ts#L12)).
Probably intentional (only 4 dagre knobs map cleanly) but it is undocumented
data loss and the only unit test asserts the all-unsupported → `{}` case, which
*looks* like coverage but actually only proves the drop, never the translate.
Add a comment stating the drop is deliberate and cover a mixed
supported+unsupported input.

### P3 — node IDs are run through the engine-key alias map

[legacy-layout-engine-migration.ts](packages/layout-engine/src/preview-engine/legacy-layout-engine-migration.ts#L125)
applies `canonicalPreviewLayoutEngineKey(rawNodeId)` to **node-bucket keys**,
which are node IDs, not engine keys. A node literally named `dagre` would be
renamed to `elk-layered` in its per-node override bucket. Edge case, but it is a
category error — node IDs should be trimmed, not alias-mapped.

### P3 — migrated dagre docs can resolve to no engine (persisted vs active drift)

`dagre` canonicalizes to `elk-layered`, but `elk-layered` requires
`minArrowCount: 1` and `rejectFillCarrierIdsWithoutDiagramType`
([elk-layered.engine.ts](packages/layout-engine/src/preview-engine/engines/elk-layered.engine.ts#L21)).
`resolvePreviewEngine` returns **undefined** when the explicit key is
incompatible ([registry.ts](packages/layout-engine/src/preview-engine/registry.ts#L86)),
so a legacy dagre doc with fill-sized carriers and no authored `diagramType`
migrates to a persisted `layout_engine: elk-layered` that then renders via the
native fallback — persisted engine and rendered engine disagree. Masked by the
`engineManifest?.layoutEngineKey ?? authoredLayoutEngine` fallback in
[frame-documents.ts](apps/preview/src/preview-host/frame-documents.ts#L417), so
it is drift, not a crash — but it matches the "switch to autolayout, still shows
elk" report. Confirm migration only rewrites the key when the target is actually
resolvable, or surface `invalidPersistedEngine` in this path.

### P3 — panel visibility now silently skips any malformed owner

[app-shell-panels.ts](packages/layout-engine/src/preview-shell/app-shell-panels.ts#L127)
replaced the explicit `PANEL_ELEMENT_IDS` map with a regex parse of
`owner` (`file#id`). Correct for today's 13 entries, but a future registry entry
with an owner not matching `file#id` returns `null` and is skipped with **no
error** — a registration foot-gun the old map would have made obvious. Consider
throwing (or a registration-time guard) when an entry has a
`visibilityPlaceholder` but an unparseable owner.

### P3 — `migrateLegacyDocumentMeta` rewrites `meta` on every save

[frame-diagram.ts](apps/preview/src/persistence/frame-diagram.ts#L760) runs on
every persist and rebuilds `document.meta` from scratch, dropping any
empty record-valued meta entry. Non-legacy docs get re-serialized meta churn,
and an intentionally-empty engine namespace would be silently removed. Low risk,
but worth a guard so migration is a no-op when nothing legacy is present.

### Uncommitted style-picker fix — correct and covered, one residual

[frame-style.ts](packages/layout-engine/src/preview-shell/frame-style.ts#L157)
now labels the reset option `Authored variant (<label>)` so it no longer renders
identically to the concrete style option; the test asserts the exact HTML
([frame-style.test.ts](packages/layout-engine/tests/frame-style.test.ts#L277)).
Semantically right and sufficient for the reported symptom. Residual: no test for
the case where `originalLabel` matches the *selected* concrete key (both would
show a `selected` marker on different options) — cosmetic, low priority.

### Residual risks / validation gaps

- The INBOX user reports (elk params gone on switch, padding drop on
  autolayout→elk, tab clicks no-op, mongo-octavia layout) are **live-symptom**
  claims. The plumbing is present (`__DG_syncPreviewEngineWorkspacePanels` fires
  after tab switch in
  [preview-engine-workspace-chrome.ts](packages/layout-engine/src/preview-shell/preview-engine-workspace-chrome.ts#L418)),
  but nothing in this delta proves the *rendered* result on a real fixture.
  These need a live check on `mongo-octavia-ha` / `juju-bootstrap-machines-process`,
  not just green unit suites.
- `legacy-layout-engine-migration.test.ts` is a single strip-all case; the
  interesting translate/collision paths live only in `frame-diagram.test.ts`.
  Fine for now, but the unit file over-claims coverage.

### Reconciliation — 2026-07-06

Addressed in the current working tree; no active 2026-07-06 review findings
remain open.

Resolved:

1. **Legacy dagre collisions no longer clobber authored ELK state.**
   Both `migrateLegacyFrameDiagramEngineState(...)` and
   `migrateLegacyDocumentMeta(...)` now preserve existing canonical ELK /
   `meta.elk_nodes` values when legacy dagre buckets collide, and regression
   coverage locks the both-namespaces-present case.
2. **Force shared param-pane wiring is now exercised through the live runtime.**
   `preview-engine-controller-contract.test.ts` now boots the real
   `PreviewEngineLayoutControls` + `PreviewEngineShellController` runtimes for
   the force engine, asserts the shared controls render, and proves both setter
   and relayout paths hit the live override owner.
3. **Legacy dagre migration intent is documented and covered.**
   Unsupported dagre-only keys are now explicitly documented as intentionally
   dropped, mixed supported+unsupported inputs are covered, and node-bucket ids
   are trimmed instead of being alias-mapped as engine keys.
4. **Incompatible canonicalized persisted engines now fall back to a real
   compatible viewer engine.**
   `resolveFramePreviewViewerContext(...)` now prefers the first compatible
   engine when the persisted explicit engine cannot resolve for the current
   document shape, and coverage locks the migrated `dagre` -> incompatible-ELK
   case.
5. **Malformed panel owners now fail fast instead of silently skipping
   visibility sync.**
   `syncPreviewPanelVisibility(...)` throws when a registry owner is not
   parseable as `<file>#<id>`, with a regression covering the foot-gun.
6. **Non-legacy `meta` records no longer churn on every save.**
   Legacy-meta migration now short-circuits unless an actual legacy entry is
   present, and intentionally empty canonical namespaces survive unrelated
   saves.
7. **The uncommitted style-picker label fix remains correct and covered.**
   The reset option is now labelled `Authored variant (<label>)`, which removes
   the duplicate concrete-option text reported by the user.

Validation last rerun green after the fixes:

- `npm --prefix packages/layout-engine test` -> `989/989`
- `npm --prefix apps/preview test` -> `164/164`
- `node scripts/check_no_new_python.mjs`
- `node scripts/check-preview-shell-size-budgets.mjs`
- `node scripts/check-browser-bundle-fresh.mjs`

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

Specs 073 and 074 are no longer active. Both are merged to `main` and archived
under `docs/spec-archive/` on 2026-07-05. Do not reopen them unless new
findings appear.

1. **Spec 061 — grid regression** and **Spec 064 — arrow label de-overlap.**
   Standing user-facing regressions; both are investigation-first with a
   required `findings.md`. Do after the architecture slices, or slot 061's
   "hide the broken grid affordances now" containment earlier if the user wants
   a fast visible win. See their `tasks.md`.
2. **Spec 070 — layers palette reorder.** Independent editor feature; pick up
   when the above are moving.

**Bookkeeping (fast, low-risk — do opportunistically between slices):**
- **Specs 046 and 047 are DONE** — both merged to `main` and archived under
  `docs/spec-archive/` on 2026-07-05 (046's Phase 7 reconciliation landed:
  `T034` is resolved to "met"; 047 was a fast-forward merge). Do not reopen.
- **Closeout catalog reconciliation is DONE** — specs
  `048, 051, 052, 054–060, 062, 063, 071, 073, 074` were archived under
  `docs/spec-archive/` on 2026-07-05, and `AGENTS.md` handover now cites
  merged/archive locations instead of deleted feature branches.

**Validation baseline (2026-07-05, rerun before closing anything):**
`packages/layout-engine` **985/985**, `apps/preview` **161/161**,
`build:browser` pass, `check-browser-bundle-fresh` ok,
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

- ~~**`AGENTS.md` handover is stale on locations.** It still names `feat/047`,
  `feat/051`, `feat/052-*`, etc. as current homes; those branches are deleted
  (correct per workflow) but the handover reads as if they're live. Refresh to
  "merged to `main`".~~ **Resolved 2026-07-05**: the handover now points at the
  archived package locations.
- **065 is correctly NOT closeout-ready** (`Active / blocked` on the uncaptured
  `baseline-fail.json`) — consistent.

---

## GPT bootstrap — remaining closeout-reconciliation work

> **Superseded by "START HERE" at the top of this file (2026-07-05).** Items 1
> and 2 below are **DONE**: spec 046 landed its Phase 7 reconciliation (T034
> resolved to "met") and is archived; spec 047 is archived; the T073
> panel-registry decision became **spec 073** (do it there, do not reopen 046).
> Items 3 and 4 were also completed on 2026-07-05. Kept below for the audit
> trail.

All of the following is bookkeeping/reconciliation with green tests already
proven at HEAD. No product engineering is required unless the user opts into the
046 T073 decomposition.

1. ~~**046 — execute Phase 7 (T070–T075).**~~ **DONE + archived 2026-07-05.**
   T073 panel-registry decomposition is now owned by **spec 073**.
2. ~~**047 — restate as "merged to `main`" and archive.**~~ **DONE + archived
   2026-07-05** (fast-forward merge; branch deleted).
3. ~~**Archive the 13 genuinely-ready merged specs** (`048, 051, 052,
   054–060, 062, 063, 071`) under `docs/spec-archive/` per the
   "closeout ⇒ merged ⇒ archived" rule. **Still outstanding** — all 13 are in
   `specs/`.~~ **DONE 2026-07-05.**
4. ~~**Refresh `AGENTS.md` handover** to stop citing deleted feature branches.
   **Still outstanding.**~~ **DONE 2026-07-05.**

Validation baseline at 2026-07-05 (rerun before closing): `packages/layout-engine`
**975/975**, `apps/preview` **160/160**, `check_no_new_python` ok,
`check-preview-shell-size-budgets` ok. Product readiness is real; the failure was
bookkeeping honesty, and 046's veto was stale rather than unmet.

---

## Spec 073 adversarial review reconciliation - 2026-07-05

No active spec 073 adversarial-review findings remain in this inbox. The review
reopened the spec three times; each actionable issue is now fixed on
`feat/073-layout-node-model-param-unification`, and the only remaining work is
explicitly deferred follow-up, not active closeout work.

Resolved review findings:

1. **Shared force pane writes now hit the live override owner.**
   `initializeSharedForceParamPane()` in `scripts/preview/force.js` routes both
   `setLayoutOverrides` and `requestLayoutRelayout` through the real force
   controller instead of no-op callbacks, so shared force-param edits persist.
2. **Mixed force param updates now persist simulation and render keys together.**
   `updateForceSimulationParams(...)` in
   `packages/layout-engine/src/force-runtime.ts` applies render-scoped keys such
   as `curve_handle_ratio` without incorrectly forcing a simulation restart.
3. **Force mode now really exposes the shared layout-params pane.**
   `viewer-unified.html` no longer tags `#layout-params-section` as
   `dg-grid-only`, and contract coverage fails if that shared section is hidden
   from force mode again.
4. **Panel DOM binding no longer depends on a central runtime id map.**
   `syncPreviewPanelVisibility(...)` now resolves DOM nodes from each registry
   entry's typed `owner` selector, and a regression proves a synthetic panel id
   binds without new runtime plumbing.
5. **Builtin viewers no longer duplicate the template placeholder table.**
   `resolvePreviewTemplateSectionVisibilityPlaceholders()` now derives the
   `%..._HIDDEN%` mapping from the typed preview panel registry, and coverage
   locks that registry as the single source of truth.

Regression coverage added for the landed review fixes:

- `apps/preview/src/persistence/preview-engine-controller-contract.test.ts`
  locks the live force controller wiring.
- `packages/layout-engine/tests/force-runtime.test.ts` locks mixed
  simulation/render param patch updates.
- `apps/preview/src/persistence/preview-host-contract.test.ts` locks the shared
  layout-params section visibility contract and the registry-derived host
  placeholders.

Validation last rerun green for the landed review fixes:

- `npm --prefix packages/layout-engine run build:browser`
- `npm --prefix packages/layout-engine test` -> `981/981`
- `npm --prefix apps/preview test` -> `161/161`
- `node scripts/check_no_new_python.mjs`
- `node scripts/check-preview-shell-size-budgets.mjs`

Still explicitly deferred, not active inbox work:

- **Host-template section provisioning is not yet fully registration-only.**
  The actual DOM section shells / placeholders still live in
  `scripts/preview/viewer-unified.html`, so full registration-only host-template
  provisioning belongs in a dedicated follow-up if new lane families or host
  templates need end-to-end panel registration.
- **Force host/route/persistence convergence remains deferred.**
  `builtin-force-host`, `/api/force-spec/`, and `persistForceSpecToYaml` stay on
  the existing parallel force pipeline until a dedicated follow-up spec chooses
  to converge them onto the shared seams.

---

## Adversarial review — 2026-07-05 — spec 074 layout algorithm consolidation

Resolved on `feat/074-layout-algorithm-consolidation` during the review-fix
phase:

- `registerPreviewEngine(...)` now rejects missing/blank `algorithmClass`
  values at runtime and normalizes surrounding whitespace. Coverage lives in
  `packages/layout-engine/tests/preview-engine-registry-contract.test.ts`.
- `migrateLegacyFrameDiagramEngineState(...)` now overwrites `engineLayout`
  whenever that bucket was present on input, so unsupported legacy
  `meta.dagre*` payloads cannot survive the load/import/undo path merely
  because translation produced zero supported ELK keys. Coverage lives in
  `packages/layout-engine/tests/legacy-layout-engine-migration.test.ts`.
- `specs/074-layout-algorithm-consolidation/decision-matrix.md` no longer
  overstates `elk-radial` / `elk-rectpacking` as corpus-required algorithms.
  They are now called out as inventory-backed candidate lanes pending
  planning-repo evidence.
- The stricter runtime guard no longer regresses the wider suite: the registry
  keeps the original manifest object identity while normalizing
  `algorithmClass`, and every synthetic install-unit/onboarding test manifest
  now declares an explicit unique algorithm class.

Validation in this worktree:

- `npm --prefix packages/layout-engine exec vitest run tests/preview-engine-registry-contract.test.ts tests/legacy-layout-engine-migration.test.ts` -> passed
- `npm --prefix packages/layout-engine exec vitest run tests/preview-engine-render.test.ts tests/preview-node-onboarding.test.ts tests/app-fresh-render.test.ts tests/define-graph-layout-engine.test.ts tests/engines/elk-force.contract.test.ts tests/engines/elk-mrtree.contract.test.ts tests/engines/elk-radial.contract.test.ts tests/engines/elk-rectpacking.contract.test.ts tests/engines/elk-stress.contract.test.ts` -> passed
- `npm --prefix packages/layout-engine test` -> passed (`978/978`)
- `npm --prefix apps/preview test` -> passed (`160/160`)
- `node scripts/check_no_new_python.mjs` -> passed

---

## Adversarial review — 2026-07-05 — spec 074 follow-up findings resolved

Resolved on the `feat/074-layout-algorithm-consolidation` line after the
post-fix audit reopened two honest leftovers:

1. **Dagre is now removed from the active build/tooling path as well as the
   runtime lane.**
   `packages/layout-engine/package.json`,
   `packages/layout-engine/build-browser.mjs`,
   `apps/preview/src/server.ts`, and
   `scripts/check-browser-bundle-fresh.mjs` no longer build, alias, watch, or
   freshness-check `@diagram-generator/graph-layout-dagre`.
2. **The live docs no longer describe Dagre as a current product path.**
   `docs/agent-index.md` drops the retired package from the main-path table, and
   `docs/specs.md` now describes spec 052/074 in post-retirement terms instead
   of implying Dagre remains part of the active product surface.

Validation in this worktree for the follow-up reconciliation:

- `npm --prefix packages/graph-layout-core run build` -> passed
- `npm --prefix packages/layout-engine run build:browser` -> passed
- `node scripts/check-browser-bundle-fresh.mjs` -> passed
- `node --import tsx --test src/persistence/preview-host-contract.test.ts` (from `apps/preview/`) -> passed
- `node scripts/check_no_new_python.mjs` -> passed
