# Two-pass review — preview editor (spec 051/052/053 era)

**Date:** 2026-06-26
**Scope:** the preview editor save/interaction stack after the spec 046 decomposition
and the 051/052/053 follow-ups. Triggered by repeated QA-surfaced bugs of the
"feature exists in the UI but the change cannot be saved / throws on save" shape
(most recently: arrow waypoint edits failing to persist).

**Method:** two independent review passes over the live code, not literal
sub-agents (this repo's `AGENTS.md` explicitly discourages multi-agent sweeps for
localized preview/persist work). Pass A = architecture. Pass B = low-level
interaction + persistence defects.

**Files read:** `apps/preview/src/persistence/frame-diagram.ts`,
`frame-engine-layout-namespaces.ts`, `frame-override-manifest.ts`,
`app-save-client.ts`, `app-arrow-waypoint-runtime.ts`, `app-arrow-waypoints.ts`,
`app-waypoint-host.ts`, `preview-engine/registry.ts`,
`scripts/preview/component-model.js`, `editor.js`, plus spec 053 spec/tasks and
the AGENT-INBOX handoff.

---

## Pass A — Architectural review

### A1. Persistence payload is shaped in untyped legacy JS; validation lives in TS. (root cause of the class of bugs)

`component-model.js::toOverridePayload()` (legacy JS, 658-line file) builds the
exact JSON that `frame-diagram.ts::persistFrameDiagramOverridePayloadToYaml()`
(typed) then validates and rejects. The producer and the validator are **not
type-linked**. There is no shared interface that says "these keys are emittable
and these are persistable", so any divergence is invisible until a user hits Save
and the server throws.

This is precisely the failure mode of the arrow bug (client emitted an arrow
override id the server's resolver never looked up) and it will keep recurring
while the save payload is born in JS. Per `AGENTS.md`, persistence logic is
supposed to live in TypeScript first; `toOverridePayload` is persistence logic
and is the highest-value remaining migration target after `editor.js`.

**Recommendation:** move override-payload assembly into a typed owner that shares
the allowlist/types with `frame-diagram.ts`, and have `component-model.js` call
into it. Until then, treat every new override-bearing feature as save-unsafe by
default and require a round-trip test.

### A2. Arrows have a second, undocumented allowlist outside the "single source of truth".

`frame-override-manifest.ts` is documented as the single source for frame
override keys (`PERSIST_FRAME_KEYS`, `RELAYOUT_FRAME_KEYS`,
`UNDO_RELAYOUT_FRAME_KEYS`). But the **arrow** allowlist lives inline in
`frame-diagram.ts`:

```
const SUPPORTED_ARROW_KEYS = new Set(["waypoints"]);
```

So arrows bypass the "single source of truth" entirely, and the relayout/undo
layers have no arrow entry at all. The arrow save regression lived exactly in
this gap. Arrow keys should be promoted into the manifest as a typed allowlist
with parallel persist/relayout/undo exports, mirroring frames.

### A3. Override→component resolution is positional/heuristic, not typed.

`persistFrameDiagramOverridePayloadToYaml` resolves each override id by trying
`findFrameData()` first, then `findArrowData()`. Component ids are not namespaced
(a frame id vs an arrow's `source->target` id). Consequences:

- Parallel edges with no explicit `id` collapse to the same component id
  (`source->target`) → `findArrowData` returns the **first** match (A/B6).
- A frame id that happens to equal an arrow shorthand id would resolve to the
  frame and the arrow edit would be silently lost.

The override model should carry an explicit component-kind tag (frame vs arrow)
rather than re-deriving it on the server.

### A4. Engine-layout namespace registry depends on init ordering.

`frame-engine-layout-namespaces.ts` registers persistable namespaces at module
load by iterating `listPreviewEngines().controlSpecs`. If any engine registers
*after* this module's top-level loop runs, its `persistNamespace` is silently
absent and control saves for that engine fail/are dropped. For a repo whose
stated north star is "port 50/150/500 engines", a load-order-sensitive registry
is a latent onboarding trap. Make registration explicit/lazy (resolve supported
keys per-save) rather than once at import time.

### A5. Engine compatibility predicate — clean, keep as-is.

`registry.ts::evaluatePreviewEngineCompatibility()` is the one predicate used by
both the switcher list and active-engine resolution, and the offer-vs-resolve
comment (`requiredLayoutEngineKey` is an offer filter, not a resolution gate) is
correct. This directly satisfies FR-006/007. Only smell: the dual
`unsupportedCarrierIds ?? unsupportedElkCarrierIds` fields are a transitional
mirror that should be collapsed to one.

---

## Pass B — Low-level interaction & persistence defects

Ordered by risk. Severity is my estimate; each has a concrete repro/verify step.

### B1. (HIGH — verify first) Frame drag/resize deltas can reach Save as `dx/dy/dw/dh` and be rejected.

`component-model.js` stores frame overrides as transient deltas
(`this.overrides[id] = { dx, dy, dw, dh, ... }`, see the comment at line 88 and
`setOverride`/`getOwnDelta`). `toOverridePayload()` returns `overrides:
this.overrides` **raw**. The server (`applyFrameOverride`) throws on exactly
those keys:

```
UNSUPPORTED_PERSIST_FRAME_KEYS = ['dx','dy','dw','dh','waypoints']
... "non-canonical transient keys that cannot be saved to YAML: dx, dy, ..."
```

`app-save-client.ts::saveOverrides()` does **not** convert deltas → canonical
(`x/y/width/height/position`) before POST. So if any override entry still carries
a delta at save time, Save fails with the same shape as the arrow bug. This works
today only if a relayout step rewrites deltas into canonical keys on *every* save
path. That invariant is undocumented and untested.

- **Verify:** drag a frame (and separately, resize one), click Save, assert the
  POST to `/api/overrides/<slug>` returns `ok:true` and the written YAML contains
  no `dx/dy/dw/dh`. Do the same for keyboard-nudge and multi-select drag, which
  are easy to miss in the conversion path.
- **Fix direction:** convert deltas to canonical keys in the typed payload owner
  (A1), and add a guard in `saveOverrides` that refuses to POST any key in
  `UNSUPPORTED_PERSIST_FRAME_KEYS` with a clear local message instead of a server
  500-style alert.

### B2. (MED) Parallel arrows / unlabeled duplicate edges mis-save.

`arrowComponentId()` falls back to `source->target`; `findArrowData()` returns
the first match. Two `a -> b` arrows → editing the second persists onto the
first. **Repro:** a frame YAML with two `a -> b` arrows, drag a waypoint on the
second, save, reload — the first arrow moves. **Fix:** disambiguate by explicit
`id` or by occurrence index.

### B3. (MED) Save-succeeds-but-reload-fails desyncs the model.

In `saveOverrides()`, after a successful POST the code clears
`model.removedIds = new Set()` and then `await reloadDiagram(...)`. If
`reloadDiagram` throws, the catch reports `Save failed: ...` even though the YAML
was already written, and the in-memory model has already dropped its removed-ids
state. The user sees a failure for a save that actually happened, and undo/redo
state is now inconsistent with disk. **Fix:** separate "persist failed" from
"reload-after-persist failed" messaging; don't mutate model state until reload
resolves.

### B4. (MED) Engine control values round-trip as strings.

`frame-engine-layout-namespaces.ts::applyEngineLayoutNamespaceOverrides()`
coerces every value with `String(value)` before writing `meta.elk` / `meta.dagre`.
Numeric/boolean controls therefore persist as quoted strings, and
`verifyElkLayoutPersisted()` also compares via `String(...)`, so the test cannot
catch the type narrowing. This is a quieter member of the same "value changes on
save" family. **Fix:** preserve the declared control value type from the manifest
`controlSpecs` rather than blanket-stringifying.

### B5. (LOW, latent) Waypoint persistence is integer-only.

`coerceArrowWaypoint()` uses `coerceInt` and throws on non-integers. The live
drag/insert path snaps to step 8 (`roundToStep`) so it is safe today, but any
non-snapped source (imported YAML with float waypoints, a future free-drag mode,
programmatic waypoints) throws on save. Either accept floats with rounding at the
boundary, or document the integer-only contract and validate it client-side.

### B6. (LOW) Shorthand arrow silently migrates to mapping form on first waypoint edit.

`findArrowData()` rewrites a string `"a -> b"` arrow into `{source, target,
waypoints}` in the YAML. Functionally fine, but it is a non-minimal, surprising
diff against authored YAML. Add a test asserting this migration is intentional and
preserves any other authored fields.

### B7. (LOW) Confirm synthetic `__body` ids never persist.

The 053 handoff notes that headed-container relayout mirrors `align` onto a
synthetic `__body` node. Add a regression asserting that a save never emits a
`__body` (or any synthetic) frame id into YAML, and that re-saving an
already-saved headed container is idempotent.

---

## Suggested prioritized actions

1. **B1 round-trip test** for frame drag/resize/nudge/multi-select save (highest
   risk; same shape as the arrow bug).
2. **A2 + B2:** promote arrow keys into `frame-override-manifest.ts` and
   disambiguate parallel arrows.
3. **A1:** move `toOverridePayload` payload assembly into a typed owner sharing
   the allowlist with `frame-diagram.ts`; add the `saveOverrides` pre-POST guard.
4. **B3:** split persist-failure vs reload-failure handling.
5. **B4:** stop stringifying engine control values.
6. **A4:** make engine-layout namespace registration order-independent.

## Verification commands (from `diagram-generator` repo root)

```
npm --prefix packages/layout-engine test
npm --prefix apps/preview test
npm --prefix apps/preview test -- src/persistence/frame-diagram.test.ts
npm --prefix packages/layout-engine run build:browser
node scripts/check-browser-bundle-fresh.mjs
node scripts/check_no_new_python.mjs
```

Plus the new B1/B2/B7 regressions above before declaring the save path durable.

## Caveat

I confirmed B1 up to the point that the client emits raw deltas and the server
rejects those keys with no conversion in `saveOverrides`. I did **not** fully
trace the typed interaction facade's drag/resize completion path, so B1 is filed
as a high-risk gap to verify with a round-trip test rather than a confirmed live
crash. Everything else above is read directly from current source.
