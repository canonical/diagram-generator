# Spec 054 adversarial architectural review — 2026-06-27

**Branch:** `feat/054-preview-persistence-model-typescript`
**Reviewed commit:** `ed333b9` ("Close spec 054 save path")
**Base:** `origin/main`
**Reviewer stance:** adversarial; assume the migration is incomplete or save-unsafe until proven otherwise.

## Verdict

**054 is genuinely Closeout Ready.** The save-payload bug class identified in spec
053 is removed *at its source*: payload assembly now lives in a typed owner
(`preview-override-model.ts`), the emitted payload is canonical before it reaches
the normalizer, the normalizer is correctly demoted to a guard layer, contract
keys are single-sourced, and there is real `persist -> reload` coverage for the
frame-move/resize and arrow workflows that previously broke.

A small number of low-severity structural observations remain (behavior
narrowing on engine-layout namespaces, a now-vestigial JS shim, and a thinner
removal "reload" leg than the spec text implies). None block closeout.

## Validation performed (all green)

| Command | Result |
|---|---|
| `npm --prefix packages/layout-engine test` | **831 passed / 143 files** |
| `npm --prefix apps/preview test` | **143 passed / 0 fail** |
| `npm --prefix packages/layout-engine run build:browser` | OK (manifest emitted) |
| `node scripts/check-browser-bundle-fresh.mjs` | "browser bundle fresh (3 artifacts)" |
| `node scripts/check_no_new_python.mjs` | "spec 038 ratchet: ok" |

Branch diff scope: 22 files, +1190/-255. Commits are atomic and bisectable
(spec → typed-owner move → contract linkage → closeout). Working tree carries
only unrelated dirt (`INBOX.md`, untracked `image.png`), consistent with the
inbox handoff note.

---

## Severity-ordered findings

### SEV-3 — Engine-layout namespace support was silently narrowed to `meta.*`

**Files:** `packages/layout-engine/src/preview-shell/frame-yaml-engine-layout-contract.ts`
(`isFrameYamlEngineLayoutNamespace`, lines 12-14, 20-23);
`apps/preview/src/persistence/frame-engine-layout-namespaces.ts` (old
`supportedSpecsByNamespace`, now removed).

The shared contract that both the typed owner and the server validator now
consume only accepts namespaces matching `meta.<x>` (`startsWith('meta.') &&
length > 'meta.'.length`). The previous `apps/preview` implementation accepted
**any** non-empty `persistNamespace`. All shipped engines declare `meta.elk` /
`meta.dagre` (confirmed by `preview-engine-registry.test.ts:91,111,127` and the
052 onboarding checklist mandate), so there is no regression today. But this is
an undocumented contract tightening: a future engine that declared a non-`meta.`
namespace would have its overrides **silently filtered out at save** rather than
erroring. The narrowing is convention-aligned and arguably safer, but it should
be stated explicitly in the contract module or the 052 onboarding checklist so
it is a deliberate rule, not an accidental side effect of consolidation.

### SEV-3 — Unsupported engine-layout keys now silently dropped client-side instead of erroring server-side

**Files:** `preview-override-model.ts::readPreviewPersistedLayoutOverrides`
(via `filterSupportedFrameYamlEngineLayoutOverrides`);
`frame-engine-layout-namespaces.ts::assertSupportedFrameYamlEngineLayoutOverrides`.

The typed owner now pre-filters engine-layout overrides down to keys present in
the active engine's `controlSpecs` before POST (test "routes explicit non-ELK
layout namespaces…" proves `transient: 'ignored'` is dropped). The server-side
`assert…` guard therefore never sees an unsupported key on the normal path. This
is correct defense-in-depth for legitimate UI flows, but it means a *producer
bug* that emits an unsupported engine key is now swallowed silently on save
rather than surfaced by the server assertion. Acceptable as designed (the
assertion remains as a guard for bad/legacy callers), but worth noting that the
safety net moved from "throw" to "drop" for this category.


### SEV-3 — `ComponentModel.toOverridePayload()` is now vestigial on the live save path

**Files:** `scripts/preview/component-model.js` (lines 582-590);
`packages/layout-engine/src/preview-shell/app-save-client.ts` (line 340).

The live save runtime calls `createPreviewOverridePayload(model)` **directly**;
it no longer calls `model.toOverridePayload()`. A repo-wide search confirms the
only remaining references to `toOverridePayload()` are the JS method definition,
the contract test, and historical docs. The JS method is now a thin
delegate-or-throw shim with no production caller. This matches the spec intent
(FR-005: "retain only thin browser-shell compatibility delegation"), but the
shim and its `component-model-contract.test.ts` now protect a method nothing in
the live flow invokes. Consider either deleting the shim in a follow-up (once no
external/legacy caller remains) or documenting it as an intentional
compatibility stub. Not a correctness risk.

### SEV-3 — Removal "reload" leg is thinner than SC-003 / T031 imply

**Files:** `apps/preview/src/persistence/frame-diagram.test.ts` (removal test at
~line 520 is write-only `assertYamlEqual`, no `loadFrameYaml` reload assertion);
`packages/layout-engine/tests/preview-override-model.test.ts`
(`collectPreviewTopLevelRemovalIds`).

SC-003 and T031 list "node removal" / "removal-state save/reload behavior" as
round-trip coverage. In practice removal is covered as: (a) unit test of
top-level removal collection in the typed owner, and (b) a persist-level YAML
assertion that the removed frame is pruned. There is no explicit
`persist -> loadFrameYaml -> assert node absent` reload assertion for removals,
unlike the frame-position and arrow tests which do round-trip. The behavior is
almost certainly correct (pruning happens in `frame-diagram.ts` and the YAML is
asserted), but the literal "reload" leg for removals is weaker than the spec
wording claims. Low risk; consider adding one reload assertion to fully match
SC-003.

---

## What was verified as correct (adversarial checks that passed)

### Ownership truly moved out of `component-model.js` — YES
`toOverridePayload()` is reduced from a ~60-line payload assembler to a 9-line
delegate that throws if the typed factory is absent. The diff deletes all
JS-side delta math, grid filtering, and ELK alias plumbing. The live path
(`app-save-client.ts`) bypasses the JS entirely and calls the typed
`createPreviewOverridePayload`. `component-model.js` shrank 45 lines net.

### Typed owner and persistence validators share one contract — YES
`preview-override-model.ts` imports `PERSIST_FRAME_KEYS`, `PERSIST_ARROW_KEYS`,
`UNSUPPORTED_PERSIST_FRAME_KEYS` from `frame-override-manifest.ts` and namespace
helpers from `frame-yaml-engine-layout-contract.ts`. The server-side
`frame-engine-layout-namespaces.ts` was refactored to consume the **same**
`getSupportedFrameYamlControlSpecsForNamespace` /
`isSupportedFrameYamlEngineLayoutNamespace` exports, deleting its own duplicate
`supportedSpecsByNamespace()`. `app-save-payload.ts` now re-exports its model
types from `preview-override-model.ts` (single type owner). No parallel key
lists remain.

### Arrow identity / routing consistency for duplicate edges and `arrow:<id>` — YES
The model classifies arrows via `isPreviewArrowComponentId` and filters to
`PERSIST_ARROW_KEYS` (waypoints only), stripping transient `color`/`selected`
(proved by `preview-override-model.test.ts`). `frame-diagram.test.ts` adds
round-trips for duplicate authored edges (occurrence-index disambiguation),
explicit arrow ids, mixed named+implicit sequences, and `arrow:<id>` branch
attachments — each asserting `persist -> loadFrameYaml` waypoint placement on the
correct edge. Client emission and server resolution both route through
`collectPreviewArrowComponentEntries`, so no producer/validator id drift.

### Engine-layout namespace persistence is contract-linked and init-order safe — YES
`frame-yaml-engine-layout-contract.ts` does a side-effecting
`import '../preview-engine/install-builtins.js'` to force builtin registration,
then recomputes `supportedFrameYamlControlSpecsByNamespace()` **on every call**
(not memoized at module load). This directly addresses the load-order-sensitivity
flagged in the archived 053 review: a late-registered engine is picked up on the
next call rather than being permanently absent from a module-load snapshot. The
default `meta.elk` and legacy `elkLayoutOverrides` alias are preserved
(`DEFAULT_FRAME_YAML_ENGINE_LAYOUT_NAMESPACE`), and the legacy alias hydration is
unit-tested (`preview-override-model.test.ts`).

### Canonicalization is single-sourced; normalizer demoted to a guard — YES (FR-004 / T022)
`canonicalizeFrameOverrideEntry` (typed owner) is now the only place that
converts `dx/dy/dw/dh` to canonical `x/y/width/height` + `position`/`sizing_*`.
`app-save-payload.ts::normalizeFrameOverride` was stripped of all conversion math
and only asserts that no transient keys *remain* (raising errors for
bad/legacy callers). No double conversion. The model also adds an
`authored_x/authored_y` base fallback that the old normalizer lacked, which is a
robustness improvement matching the app-save-client fixtures.

### Reload-after-save / removal-state handling — UNCHANGED and correct
The `removedIdsBeforeSave` capture/clear/restore logic in `app-save-client.ts`
(lines 375-409) is pre-054 code and is not modified by this branch. As written,
the clear (`model.removedIds = new Set()`) runs *before* `reloadDiagram` and the
restore runs in the `catch`, so the rollback is live (the dead-code concern from
the 053 review does not apply to this state). Removal *collection* moved cleanly
into `collectPreviewTopLevelRemovalIds` with ancestor-pruning unit coverage.

### New tests cover the bug class structurally — YES
The transient-delta → canonical bug class is covered at two layers: emission
(`preview-override-model.test.ts` + the rewritten `app-save-client.test.ts`,
which now asserts canonical drag/nudge/multi-select/resize output incl.
`format_version: 1`) and persistence (`frame-diagram.test.ts` adds
`persist -> reload` round-trips for absolute positions across drag/nudge/
multi-select). Genuine structural coverage of the failure mode, not a fixture
spot check.

### Docs / closeout state credible — YES
`docs/specs.md` adds the 054 row as Closeout Ready and keeps the explicit
`persist -> reload` closeout gate; `AGENTS.md` adds the same gate to spec
workflow and updates the active-spec handoff; `docs/agent-index.md` marks
`component-model.js` persistence-critical and broadens the `dist/**` search-
hygiene guidance (SC-004 / SC-005 met). Browser-entry barrels, `index.ts`, and
the bootstrap/state barrels all export `createPreviewOverridePayload` and the new
contract helpers; `browser-entry-contract.test.ts` asserts the bootstrap
namespace exposes it, so the JS shim's `previewShell.bootstrap` lookup resolves.

---

## Structural risk assessment

No structural blockers remain. The migration achieves its stated goal: preview
override state and save-payload assembly are TypeScript-owned, emitted payloads
are canonical and contract-linked before the normalizer, and the JS surface is
thin delegation. The four SEV-3 items are clean-up / documentation follow-ups,
not save-safety defects, and can be tracked without reopening the branch.

**Recommendation:** approve closeout. Optionally fold the SEV-3 namespace-
narrowing note into the 052 onboarding checklist and add the one removal reload
assertion to fully satisfy SC-003's literal wording.

---

# Re-review addendum — 2026-06-27 (second pass)

**New HEAD:** `f389e85` ("fix(054): fail fast on unsupported frame-yaml overrides")
**Prior reviewed commit:** `ed333b9`
**Why:** the branch advanced one commit after the first pass. This addendum
re-validates at the new HEAD and supersedes the first-pass verdict where they
differ.

## Updated verdict

**Still Closeout Ready, and materially stronger than at `ed333b9`.** Commit
`f389e85` directly resolves three of the four first-pass SEV-3 items and removes
a side-effect I would otherwise have raised. No new defects in the committed
code. The only red flag — failing test suites — is caused entirely by
**uncommitted local working-tree fixture dirt**, not by the branch.

## Re-validation (committed tree, fixture dirt stashed)

| Command | Dirty tree | Clean tree (fixtures stashed) |
|---|---|---|
| `npm --prefix packages/layout-engine test` | **1 failed / 833** | **833 passed** |
| `npm --prefix apps/preview test` | **1 failed / 143** | **143 passed** |
| `build:browser` | OK | OK |
| `check-browser-bundle-fresh.mjs` | fresh | fresh |
| `check_no_new_python.mjs` | ok | ok |

The single failing test in each suite is
`preview-engine-registry.test.ts > resolves real container-endpoint authored
diagrams to their authored engine` (and the parallel `preview-host-contract`
expectation). Both assert `example-platform-architecture` resolves to
`elk-layered`. The working tree has an **uncommitted** edit flipping that
fixture's `meta.layout_engine` from `elk-layered` to `v3` (plus similar
uncommitted flips on `mongo-octavia-ha`, `preview-smoke`,
`support-engineering-flow`). Stashing `scripts/diagrams/frames/` makes both
suites fully green (833 + 143). `AGENT-INBOX.md:171-177` already documents this
exact local-dirt mismatch as "local fixture state, not a result of the fix."

**Action for the author:** these fixture edits are unrelated local dirt and must
not be committed on this branch (`AGENTS.md` commit rule: do not commit unrelated
frame fixture reformats). Confirm they are reverted or intentionally owned
elsewhere before merge. They do not reflect a code regression.

## First-pass SEV-3 items resolved by `f389e85`

- **SEV-3 #2 (unsupported engine keys silently dropped) — RESOLVED.**
  `app-save-payload.ts` now adds `validateFrameYamlEngineLayoutOverrides`, which
  reads the **raw model** layout overrides and the emitted payload's
  `engine_layout_overrides`/`elk_layout_overrides`, and pushes hard errors for
  (a) non-`meta.*` namespaces, (b) unsupported `meta.*` namespaces, and
  (c) unsupported keys within a supported namespace. `app-save-client.ts` already
  aborts the POST when `normalized.errors` is non-empty, so an unsupported key is
  now a blocked save with a user-facing reason rather than a silent drop. Two new
  `app-save-client.test.ts` cases assert the block + `fetch` not called.
- **SEV-3 #1 (silent `meta.*` narrowing undocumented) — RESOLVED.**
  `isFrameYamlEngineLayoutNamespace` is now exported with a doc comment citing
  spec 052's `meta.<engine>` lane rule and a named
  `FRAME_YAML_ENGINE_LAYOUT_NAMESPACE_PREFIX` constant. The narrowing is now an
  explicit, tested contract (non-`meta.` → blocked save).
- **SEV-3 #3 (vestigial `toOverridePayload` shim) — PARTIALLY ADDRESSED.**
  The shim now carries a comment stating it is legacy browser-shell compatibility
  only and that the live runtime calls the typed owner directly; the contract
  test was renamed to "keeps a compatibility shim." Still present (not deleted),
  but now honestly labeled. Downgrade to a non-issue.

## New observation introduced by `f389e85`

### SEV-4 (informational) — Emitter "drops" vs validator "errors" use different policies, reconciled by ordering
The emitter (`preview-override-model.ts::readPreviewPersistedLayoutOverrides`)
**filters** layout overrides to supported keys via
`filterSupportedFrameYamlEngineLayoutOverrides`, while the new validator
(`app-save-payload.ts::validateFrameYamlEngineLayoutOverrides`) reads the **raw
model** and **errors** on unsupported keys. These look contradictory but are
not: `normalizePreviewSavePayload` runs the validator against `model.*` before
trusting the (already-filtered) payload, so an unsupported key in `model.layout
Overrides` is caught and blocks the save *even though* the emitted payload would
have silently dropped it. Net effect is fail-fast, which is the stronger
behavior and matches the commit intent. The mild smell is two different
mechanisms (filter vs assert) over the same contract; a future cleanup could let
the emitter surface rejected keys directly rather than relying on the validator
re-reading the raw model. Not a correctness risk — covered by the two new
client tests and the updated `preview-override-model.test.ts` (which now asserts
the model aliases are **not** mutated, confirming the removed side effect).

## Net

The migration is intact and the new commit hardens the engine-layout save path
from "silently drop" to "block with reason," with tests proving it. All five
closeout commands pass on the committed tree. The only pre-merge action is
hygiene: do not commit the unrelated local frame-YAML engine flips that are
currently breaking the registry/host-contract tests in the dirty working tree.


