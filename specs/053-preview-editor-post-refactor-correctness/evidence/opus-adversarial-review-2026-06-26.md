# Adversarial review — feat/053-preview-editor-post-refactor-correctness

Reviewer pass against the working tree on 2026-06-26. Findings first, ordered by
severity, then answers to the prompt's five questions.

Method: read current source + `git diff origin/main` (which includes the
working tree), ran `npm --prefix packages/layout-engine test -- preview-arrow-component-ids app-arrow-render app-save-client`
(13 pass) and `npm --prefix apps/preview test` (139 pass / **1 fail**).

---

## Findings

### SEV-1 — The entire claimed branch is uncommitted / untracked

`git diff --stat HEAD` reports 25 modified files (+1098/-192) and `git status`
lists 4 untracked product/test files. **Nothing is staged. HEAD (`51d02db`)
contains none of the headline work**, and `origin/feat/053…` is even further
back at `33d74a5`.

Untracked (do not exist in any commit):
- `packages/layout-engine/src/preview-arrow-component-ids.ts`
- `packages/layout-engine/src/preview-shell/app-save-payload.ts`
- `packages/layout-engine/tests/preview-arrow-component-ids.test.ts`
- `specs/054-…/`

Unstaged (the routing-identity fix, persistence hardening, override manifest,
save-client wiring, all new tests) lives only in the working tree.

Impact: anyone reviewing the branch as committed sees *none* of this. The
"Closeout Ready" claim in `AGENTS.md`/`docs/specs.md` is not credible until the
work is committed and pushed. There is also real work-loss risk. **This must be
committed before any closeout/review judgement is meaningful.**

### SEV-1 — Full preview suite is RED; "Validation is green" is misleading

`npm --prefix apps/preview test` fails one test (the repo's documented
validation command — see `AGENTS.md` "Validation"):

```
✖ real frame fixtures resolve authored layout engines without silent v3 fallback
  example-platform-architecture: actual 'v3', expected 'elk-layered'
  apps/preview/src/persistence/preview-host-contract.test.ts:460
```

Root cause is a **tracked** working-tree edit to
`scripts/diagrams/frames/example-platform-architecture.yaml` (part of this
branch's change set, not stray untracked noise): `meta.layout_engine` flipped
`elk-layered → v3`, plus added fixed widths, `position: absolute`, `x/y`, and a
full `meta.elk` block — i.e. a real editor-save artifact.

The handover frames this as "local fixture drift," but it is staged for the same
diff as the product code and it breaks a committed contract test. The
"Validation is green" claim only holds for cherry-picked focused tests. Before
closeout the author must *deliberately* either revert the fixture or update the
contract test — silently shipping it makes the branch red on `main`.

Sub-note: the saved fixture keeps a full `meta.elk` block while
`layout_engine: v3`. That suggests switching engine to v3 does **not** clear
the previous engine-namespace overrides on save (orphaned `meta.elk`). Worth
confirming whether that is intended or a persistence-correctness gap.

### SEV-2 — Arrow save allowlist is waypoints-only and hard-blocks the whole save

`PERSIST_ARROW_KEYS = ['waypoints']` (`frame-override-manifest.ts:112`).
`normalizeArrowOverride` (`app-save-payload.ts:48-64`) pushes an error for any
other key, and `app-save-client.ts:361-366` turns *any* normalization error into
`alertFn(...)` + early `return` — i.e. one unsupported arrow key aborts the
entire save (all frame edits included). `applyArrowOverride`
(`frame-diagram.ts:491`) likewise throws on any non-waypoint key.

If the inspector can mutate any other arrow property (color, label, etc.), this
is a save-blocking regression, not just an arrow-save no-op. Confirm arrows are
truly waypoint-only editable; if not, this is a real defect.

### SEV-2 — Reload-failure rollback in app-save-client is effectively dead code

`app-save-client.ts` now captures `removedIdsBeforeSave` and, on reload failure,
does `if (removedIdsBeforeSave && model.removedIds !== removedIdsBeforeSave) { model.removedIds = removedIdsBeforeSave; }`.
But the clearing `model.removedIds = new Set()` was **moved to after** the
reload. So before the reload `model.removedIds === removedIdsBeforeSave`, the
guard is always false, and the rollback never executes. The intended
"preserve deletion state if reload fails" is a no-op.

Separately, this ordering change means reload now runs while `removedIds` is
still populated (previously it was cleared first). If `reloadDiagram` consults
`removedIds`, behavior may differ. Tighten the guard or re-order, and add a test
for the reload-fails-after-successful-save path.

### SEV-3 — Test gaps on the new identity module

`preview-arrow-component-ids.test.ts` covers only `resolvePreviewArrowComponentId`
(2 cases). The load-bearing invariant — that source/target names containing
`->` or `#` survive via `encodeURIComponent` so the edge-id separator/occurrence
suffix can't be spoofed — is **untested**. Also untested: explicit-id
`create → parse` round-trip and `isPreviewArrowComponentId`. The `app-arrow-render`
attachment test (`routes arrow:<id> … without clobbering authored ids`) is good
and does prove the core routing-identity fix, but add an adversarial-name
round-trip test for the encoder.

### SEV-3 — `normalizeFrameOverride` resize base may double-count

`app-save-payload.ts:92-110` computes `baseWidth = override.width ?? nodeData.width`
then persists `base + dw`. If `nodeData.width` already reflects a prior
delta-applied (laid-out) width during repeated live resizes, this can
accumulate. Lower confidence (depends on what populates `node.data.width` vs the
authored base). Add a test asserting two successive resize deltas don't compound.

### SEV-3 — `syntheticComponentId` suffix match is brittle

`app-save-payload.ts:37-42` drops any componentId that `endsWith('__body')` or
`'__heading')`. A legitimately authored id ending in those suffixes would have
its override silently dropped. Prefer exact synthetic-id detection.

### SEV-3 — Namespace registry enumeration semantics changed

`frame-engine-layout-namespaces.ts` no longer eagerly registers built-in `meta.*`
descriptors; they are created lazily in `getFrameYamlEngineLayoutNamespace` and
**not** stored in `frameYamlEngineLayoutNamespaces`. The lookup test passes, but
any code that enumerates the map keys will no longer see built-ins. Confirm
nothing iterates the map. Also `verifyElkLayoutPersisted` switched to
`Object.is(got, raw)` alongside native-type coercion — correct but brittle if
any caller passes string-typed expectations.

---

## Answers

1. **Highest-severity remaining defects:** (a) the whole branch is uncommitted/
   untracked — not in a reviewable/closeout state; (b) the documented full
   preview validation is RED due to a tracked fixture edit flipping
   `example-platform-architecture` to `v3`.

2. **Client/server contract drift:** Frame keys are consistent — the client
   normalizer emits `position/x/y/width/height/sizing_w/sizing_h`, all present in
   server `PERSIST_FRAME_KEYS`. The arrow contract is consistent but extremely
   narrow (waypoints-only) and fails *closed* by aborting the entire save; that
   is a contract risk if arrows gain other editable props. Routing identity is
   correctly split: `routedById` keys on authored `arrow.id`, `routed.componentId`
   carries the preview id.

3. **Hidden regressions in the identity split:** None proven in selection/save/
   refs — the attachment test confirms `arrow:<id>` routing survives and ids are
   distinct. Residual risks: duplicate authored ids collapse to first match
   (pre-existing), and the encoder's separator-safety is untested.

4. **Are the new tests sufficient?** Mostly for the routing fix (good attachment
   test) and the persistence happy paths. Gaps: encoder round-trip with
   adversarial names, reload-fails-after-save path, repeated-resize
   non-accumulation, and arrow non-waypoint-key rejection behavior at the
   save-client level.

5. **Fix before closeout:**
   - Commit + push the work (it currently exists only in the working tree).
   - Resolve the RED contract test deliberately (revert the fixture or update the
     test) and re-run the full `apps/preview` suite.
   - Decide arrow allowlist policy / stop one bad arrow key from aborting the
     whole save.
   - Fix or remove the dead reload-rollback guard.
   - Add the encoder round-trip and reload-failure tests.
   - Confirm v3 switch intentionally retains/clears `meta.elk`.
