# Spec 079 Figma Component Variant Import Reviews

## Opus Review - 2026-07-11 - component instance stale-handle architecture

Scope: strict adversarial review of `feat/079-figma-component-variant-import`
against the moving stale-node failures. Live Figma / MCP inspection was **not**
available for this pass, so the findings are grounded in the code, the recorded
live error sequence, the git history, and the documented Figma API constraints
already captured in `spec.md`. Where a claim needs live confirmation it is
flagged explicitly.

The short version: the moving `get_parent` / `get_name` / `get_children` errors
are not eight separate bugs. They are one architectural bug – the importer
treats live Figma component-instance sublayers as if they were ordinary,
freely-mutable scene nodes, and it detaches instances part-way through a
traversal that is still holding handles to those sublayers. Chasing the next
thrown id cannot converge, which is exactly what the git log shows.

---

## Findings (ordered by severity)

### P0-1 – The importer structurally mutates live component-instance sublayers

- Files:
  - `apps/figma-plugin/src/code.ts` – `populateComponentSlot` (`clearChildren(slot)` + `appendAutoLayoutChild(slot, body, ...)`)
  - `apps/figma-plugin/src/code.ts` – `replaceIconTarget` (`insertChildAt(parent, ...)` + `safeRemoveNode(target)`)
  - `apps/figma-plugin/src/code.ts` – `clearChildren` / `insertChildAt`
- Reason it is a real problem: `slot` comes from `findSlotNode(instance)` and
  `target` comes from `findIconTarget(instance)`. Both are **instance
  sublayers**. Figma does not allow adding, inserting, reordering, or removing
  children on an instance sublayer, and it does not allow removing an instance
  sublayer. `clearChildren`, `appendChild`, `insertChild`, and `remove` on those
  nodes throw. The live id in the last failure – `I76:555;58:16` – is the
  instance-sublayer id form (`I<instanceId>;<componentChildId>`), which confirms
  the code is operating on sublayer handles, not on normal nodes.
- Impact: every container node and every icon-replacement node hits an illegal
  mutation. The `try/catch` around it converts the illegal-mutation throw into a
  detach fallback, which then produces the *next* stale-handle error. This is
  the engine of the "just the id numbers change" loop.
- Recommended fix: never structurally mutate instance internals. Either detach
  the instance to a normal frame **before** any internal traversal (Option A
  below), or restrict variation to the component contract with no structural
  edits at all (Option B below). Delete the "mutate the live sublayer, catch,
  then detach" path.

### P0-2 – Detach happens mid-traversal and invalidates handles already captured

- Files:
  - `apps/figma-plugin/src/code.ts` – `buildComponentMappedNode`
  - `apps/figma-plugin/src/code.ts` – `populateSlotWithRuntimeStrategy`
  - `apps/figma-plugin/src/code.ts` – `detachMappedComponentInstance`
- Reason it is a real problem: `buildComponentMappedNode` runs, in order:
  `createInstance` → `applyInstanceTextOverrides(instance)` (captures text
  sublayer handles) → `applyInstanceIconOverride(instance)` (captures icon
  sublayer, may call `detachInstance`) → `populateSlotWithRuntimeStrategy`
  (captures slot sublayer, may call `detachInstance` again inside its own
  `catch`). `detachInstance()` returns a **new** node tree and invalidates the
  original instance and *every descendant handle captured before the detach*.
  So there are two independent detach points, each of which can strand handles
  taken earlier in the same node's construction, and the icon detach strands the
  slot lookup path. The result is a stale handle whose exact id depends on
  timing / which branch fired – hence a moving target.
- Impact: unpredictable `does not exist` errors that relocate every time an
  earlier symptom is patched. No amount of per-id patching converges because the
  detach boundary itself is the fault.
- Recommended fix: make detach a single, up-front decision per node. Decide
  "instance vs detached frame" *before* traversing internals, detach once if
  needed, and only ever hold handles that belong to the post-detach tree. Never
  detach after you have started reading/writing sublayers.

### P0-3 – The fake Figma model cannot reproduce the failing behaviour, so the green tests are false confidence

- Files:
  - `apps/figma-plugin/src/code.test.ts` – `FakeSceneNode.createInstance`, `detachInstance`, `cloneTree`, `appendChild`/`insertChild`/`remove`
- Reason it is a real problem: the fake models an instance as a fully
  independent, fully-mutable clone tree. Concretely it fails to model:
  1. Instance sublayers rejecting `appendChild` / `insertChild` / `remove`
     (the fake only rejects when a test manually sets `rejectChildMutation`,
     which the production path never triggers). `createInstance` therefore
     yields freely-mutable children, so `populateComponentSlot` and
     `replaceIconTarget` "succeed" in tests but throw live.
  2. Handle invalidation on detach. `detachInstance` sets `throwOnNameRead` on
     the root only; all descendant sublayer handles stay `removed = false` with
     valid `parent`/`children`. Live Figma invalidates the whole old subtree.
  3. Instance-sublayer id semantics (`I…;…`) and invalidation on
     `setProperties` / `resize` / structural change of the instance.
- Impact: T034 and T044/T045 "readback validation" tests are structurally
  fake-green. They assert the very operations that fail live. This is why the
  branch shipped "component instance" support that has never worked in Figma.
- Recommended fix: harden the fake first (see Tests section). Make instance
  sublayers reject structural mutation by default and make `detachInstance`
  recursively invalidate the old subtree. The current component/slot tests
  should turn red. Only then is a green test meaningful.

### P1-1 – Slot insertion is done by raw mutation, contradicting the spec's own API facts

- Files: `apps/figma-plugin/src/code.ts` – `populateComponentSlot`;
  `specs/079-figma-component-variant-import/spec.md` (External API Facts,
  2026-07-10 inspection outcome)
- Reason it is a real problem: `spec.md` correctly records that
  `InstanceNode.setProperties(...)` does not support `SLOT` properties and that
  "slot insertion remains the first live feasibility gate". The implementation
  does not attempt the documented, supported path at all; it instead performs
  `clearChildren` + `appendChild` directly on the slot sublayer, which is less
  supported than `setProperties`, not more. The spec's own gate was bypassed.
- Impact: the central promise of spec 079 – nested auto-layout inside a live
  component slot – is not achievable through the coded approach, and the code
  proceeds as though it were.
- Recommended fix: accept that arbitrary generated auto-layout cannot be pushed
  into a *live* instance slot via the plugin API. Any node with children must be
  detached (Option A) or the component must expose an instance-swap slot the
  importer can satisfy with pre-built instances (Option B). Update the spec to
  state this outcome instead of leaving it as an open gate that code silently
  stepped over.

### P1-2 – Status overclaim: feasibility gate unchecked while dependent phases marked complete

- Files: `specs/079-figma-component-variant-import/tasks.md`
- Reason it is a real problem: T002 (live slot probe) and T003 (document the
  selected slot strategy) are unchecked, and T004/T005/T006 are unchecked, yet
  T030–T034, T036, and the entire slot phase T040–T045 are marked `[x]`. The
  work that proves the approach is possible was skipped, but the work that
  assumes it is possible is marked done. T031/T035/T046/T047 – the tasks that
  would have forced the "use the component contract instead of procedural
  mutation" question – are also unchecked.
- Impact: `tasks.md` reads as mostly complete when the load-bearing feasibility
  claim is unproven. Anyone trusting the checkboxes would conclude the
  component/slot path works.
- Recommended fix: uncheck T030, T032, T034, T036, T040–T045 until they pass
  against a hardened fake and a real Figma probe. Complete T002/T003 first and
  record the honest result.

### P1-3 – `findFirstDescendant` / `findDescendants` over live instance internals is the wrong primitive here

- Files: `apps/figma-plugin/src/code.ts` – `findIconTarget`, `findSlotNode`,
  `applyInstanceTextOverrides`, `applyInstanceIconOverride`
- Reason it is a real problem: reading an instance's descendants is legal, but
  the returned handles are only safely usable while the instance is unchanged
  and undetached. The code captures these handles and then mutates/detaches,
  which is precisely the invalidation trigger. `findFirstDescendant` walking
  `node.children` also bypasses the `safeGetChildren` guards, so it can throw on
  a sublayer whose parent chain changed under it.
- Impact: contributes directly to P0-1/P0-2; also a latent crash source because
  it does not use the safe accessors.
- Recommended fix: only traverse internals of a *detached* frame, or only read
  the component master (not the instance) for structure decisions. Do not retain
  descendant handles across any mutation or detach.

### P2-1 – Icon "replace" path can only ever work after detach

- Files: `apps/figma-plugin/src/code.ts` – `replaceIconTarget`,
  `applyInstanceIconOverride`
- Reason it is a real problem: for a live instance, only `swapComponent` on an
  exposed nested instance is legal. `replaceIconTarget` (remove target + insert
  a clone into the sublayer's parent) is illegal on instance internals and only
  works on the detached branch. So the intact-instance icon path is limited to
  the `swapComponent` case, and the SVG-clone / cloneable-icon case forces a
  detach every time – which the code discovers only by throwing and catching.
- Impact: any box whose icon comes from a `.svg`-named cloneable node or a
  copied instance whose main component can't be resolved will always detach,
  making "native component instance" output the exception rather than the rule.
- Recommended fix: decide the icon strategy up front from the source kind. If
  the icon source is a component with an exposed instance-swap property → keep
  instance and `swapComponent`. Otherwise → detach-first. Do not probe by
  throwing.

### P2-2 – Broad `safe*` wrappers and `try/catch` convert hard failures into silent partial output

- Files: `apps/figma-plugin/src/code.ts` – `safeGetChildren`, `safeGetParent`,
  `safeGetNodeName`, `safeRemoveNode`, `getImportData`, plus the fallback
  `logImportFallback` sites; commit `e08584c` ("tolerate stale figma import
  handles")
- Reason it is a real problem: these guards suppress the `does not exist`
  exceptions rather than preventing the invalid access. When the underlying
  architecture is fixed they are harmless defensive code, but right now they
  mask the real failure and let the import produce structurally wrong output
  without erroring. "Tolerate stale handles" is treating the symptom.
- Impact: harder to diagnose; risk of shipping a silently broken import that the
  readback validator may or may not catch (and the validator itself walks
  `.children`, so it can throw on the same sublayers).
- Recommended fix: keep the safe accessors for genuine selection/cleanup edge
  cases, but stop using them to paper over sublayer access. Once detach-first is
  in place, an unexpected `does not exist` should surface as a real error.

### P3-1 – Text override matches lines to text nodes by flat index order

- Files: `apps/figma-plugin/src/code.ts` – `applyInstanceTextOverrides`
- Reason it is a real problem: it flattens all block lines and assigns them to
  discovered `TEXT` descendants by position. Any structural difference between
  the component's internal text layers and the payload's line count/order
  silently mismaps text. Not the current blocker, but it will produce wrong
  labels once the instance path works.
- Impact: quiet content corruption in mapped instances.
- Recommended fix: bind text by named component text properties or by stable
  layer names, not by traversal index.

---

## Root-cause diagnosis

There is a single root cause. The importer uses a **hybrid** strategy –
instantiate the native component, then traverse and structurally rewrite its
internals (replace the icon node, clear the slot, append generated
auto-layout), and detach only when a mutation throws. Two facts make this
guaranteed to fail:

1. Figma component-instance sublayers are not structurally mutable and their
   handles are ephemeral. You cannot add/remove/reorder their children, and any
   handle to a sublayer becomes invalid when the instance is detached (and can
   be invalidated by other structural changes / `setProperties` / resize).
2. The code both mutates those sublayers and detaches mid-traversal while
   holding earlier sublayer handles.

Because the detach boundary moves depending on which internal step throws first,
the resulting stale-handle error moves with it. Each `fix:` commit
(`003e690`, `e08584c`, `546f58f`, `517b115`, `e349434`, `92dff0b`) patched the
current thrown id or captured one value before the detach, which just shifts the
next failure to a different id. The git history is the fingerprint of this: eight
consecutive `fix:` commits, each named after the specific handle it tried to
rescue.

Answering the prompt's core questions directly:
1. No – it is not valid to traverse live instance sublayers, keep references,
   then mutate/detach nearby nodes in the same import.
2. Yes – instance sublayer handles are effectively ephemeral in this workflow;
   the rule is "do not retain a sublayer handle across any mutation or detach".
3. Yes for any node that needs structural change (slot children, icon-node
   replacement, sizing of internals) – detach that box up front, once.
4. Native instances are only safe when *all* variation is expressed through the
   component contract (variant properties, boolean properties, exposed
   nested-instance swaps, exposed text). No structural edits.
5. The hybrid is not defensible; it is the direct cause of the moving errors.
6. No – the plugin API does not let you push arbitrary generated auto-layout
   into a live instance's `Network.svg` placeholder or its slot without
   detaching. Live confirmation of the exact `swapComponent` shape for an
   *exposed nested instance* is still needed, but the generic-node replacement
   path is not supported on a live instance.
7. Yes – `findFirstDescendant(instance, …)` over live internals is a bug in this
   context. It should run only against a detached frame (or read the master
   component for structure decisions), never against a live instance whose
   sublayers you intend to change.
8. Copied current-file icon instances are viable only via `swapComponent` after
   resolving their main component, or by cloning into a *detached* box. Cloning
   into a live instance sublayer is not viable. A manifest of icon component keys
   would be more robust than name-matching arbitrary copied nodes.
9. Yes – the fake model gives false confidence (see P0-3).
10. Simplest robust architecture: detach-first for any node needing structural
    change; pure-instance only for leaves whose entire variation fits the
    component contract.

---

## Architecture recommendation

Pick one of two clean strategies. Do not keep the hybrid.

- Option A – detach-first (recommended for the next honest slice). As soon as a
  mapped node needs any structural change (it has children, or its icon must be
  a non-instance asset), call `detachInstance()` **immediately after
  `createInstance()`**, before touching internals, then treat the result as a
  normal frame tree and reuse the existing generic-frame builders for slot
  contents. Keep live instances only for leaf nodes whose variation is fully
  covered by variant/property/text/instance-swap. Trade-off: detached boxes are
  no longer live component instances, so later component edits won't propagate.
  This trade-off must be written into the spec and shown to the user, but it is
  reliable and testable today.

- Option B – pure component contract (correct long-term, needs user work). Keep
  every box a live instance and express *all* variation through the component:
  `Role` variant, boolean props for icon/title/body visibility, an exposed
  nested instance-swap property for the icon, exposed text layers, and – for
  nesting – an exposed instance-swap slot the importer fills with pre-built
  child instances rather than generated frames. This requires the user's `box`
  component to be authored with those properties. No `clearChildren`,
  `appendChild`, `insertChild`, `remove`, or node replacement on instance
  internals, ever.

Recommendation: ship Option A now to unblock, and record Option B as the target
end-state contingent on a documented component-property contract with the user.

---

## What to stop doing

- Stop patching individual thrown node ids. The next id is a symptom, not a bug.
- Stop calling `clearChildren` / `appendChild` / `insertChild` / `remove` /
  `swapComponent`-then-replace on live instance sublayers.
- Stop detaching mid-traversal. Decide detach once, up front, per node.
- Stop retaining `findSlotNode` / `findIconTarget` / text-descendant handles
  across a mutation or detach.
- Stop treating green fake-Figma tests as evidence for the component/slot path
  until the fake models instance-sublayer immutability and detach invalidation.
- Stop adding `try/catch` / `safe*` wrappers as the fix for `does not exist`.

---

## What to implement next (minimum honest slice)

1. Run T002 for real in Figma: instantiate the `box` `Role=Parent` variant,
   attempt to insert a generated auto-layout frame into `slot`, and record what
   the API actually allows. Write the outcome into T002/T003.
2. Implement Option A detach-first:
   - `buildComponentMappedNode`: after `createInstance`, if `node.children.length
     > 0` **or** the icon must be a non-instance asset, `detachInstance()`
     immediately, then build the interior with the existing generic-frame
     builders and the detected slot as the container.
   - Leaf nodes with a component-swappable icon and no children: keep the
     instance, set only variant/boolean/text properties and `swapComponent` the
     exposed icon.
   - Remove the icon "replace into sublayer" path and the second detach inside
     `populateSlotWithRuntimeStrategy`.
3. Guarantee no handle survives a detach: capture nothing from the instance
   before the detach decision.
4. Update `spec.md` and `tasks.md` to state the detach trade-off honestly and
   re-open the overclaimed checkboxes (P1-2).

---

## Tests that must be added or changed

- Harden `FakeSceneNode` first, or every new test stays fake-green:
  - Instances (`type === "INSTANCE"`) and their descendant sublayers must reject
    `appendChild` / `insertChild` / `remove` by default (not only when
    `rejectChildMutation` is manually set).
  - `detachInstance()` must recursively invalidate the old subtree: set
    `removed = true` and throw on `name` / `children` / `parent` reads for every
    descendant of the old instance, not just the root.
  - Give sublayers an id in the `I…;…` shape and invalidate handles on
    structural change so `get_children` / `get_parent` staleness is reproducible.
- After hardening, expect the current `validateImportedComponentStructure` and
  slot tests (T034/T044/T045) to fail. Treat that red as the correct baseline.
- Add a test proving detach-first: a container node produces a detached FRAME
  tree with the correct slot direction/child order, and no code reads any
  pre-detach handle.
- Add a test proving a leaf keeps its INSTANCE identity and only sets
  properties / swaps the icon component – with structural mutation of its
  sublayers asserted to throw.
- Add a negative test: attempting `appendChild` into a live instance slot throws
  and is not silently swallowed.

---

## Status honesty check

- `tasks.md` overclaims: T030/T032/T034/T036 and T040–T045 are marked done, but
  the feasibility gate (T002) and strategy doc (T003) they depend on are
  unchecked. The component/slot path has never worked in live Figma.
- The passing test suite does not model the failure and therefore does not
  support the "component instance import works" claim.
- `spec.md` is honest about the API constraints (it names the SLOT/setProperties
  limitation and the live gate); the *implementation* is what diverged from the
  spec, not the spec text. No overclaim found in `spec.md` itself beyond the
  Status still reading `Draft`, which is accurate.
- `AGENT-INBOX.md` contains no spec-079 claims (searched) – so no inbox
  overclaim, but it also means the live-failure history was never captured in
  live state; that history should be recorded.

---

## Merge recommendation

Do not merge. The branch's headline capability (map boxes to native component
instances with populated slots) does not work in Figma and is only green because
the test double cannot express the failing behaviour. Merging would encode a
false "component variant import" capability and lock in the mutate-live-sublayer
pattern that the spec-046 ratchet would later have to unwind.

Path to mergeable: complete T002/T003, adopt Option A detach-first, harden the
fake model, let the current tests go red and rebuild them, then re-review.

---

## Residual risks – acceptable vs blocking

Blocking (must resolve before merge):
- Structural mutation of live instance sublayers (P0-1).
- Mid-traversal detach invalidating captured handles (P0-2).
- Fake model that cannot reproduce the live failure (P0-3).
- Overclaimed task status on an unproven feasibility gate (P1-2).

Acceptable for a first honest slice (document, don't block):
- Detached boxes losing live-component propagation under Option A – acceptable
  if written into the spec and shown to the user, revisited under Option B.
- Icon coverage limited to component-swappable icons for the pure-instance leaf
  path, with detach-first covering the rest.
- Text index-order mapping (P3-1) – acceptable short-term once the instance path
  itself is stable, but fix before claiming refresh/override parity (Phase 5).

Could-not-verify (needs live Figma / MCP):
- The exact supported `swapComponent` shape for the exposed icon nested
  instance.
- Whether the user's `box` component exposes an instance-swap slot suitable for
  Option B.
- The precise trigger set that invalidates a sublayer handle (detach is
  confirmed by the code+error trail; `setProperties`/resize are strongly
  suspected but unverified here).

---

## Implementation Response - 2026-07-11 - strict SlotNode contract

After this review, the user converted the parent/section content placeholders
and icon placeholders to real Figma slots and chose Option B with no detach
fallback.

Implemented response:

- removed the mid-traversal `detachInstance()` fallback from component-mode
  import
- removed icon placeholder replacement / ordinary instance-sublayer mutation
- require content insertion targets to be real `SLOT` nodes named `slot`
- require icon insertion targets to be exactly one real non-content `SLOT` in
  each mapped box instance
- insert copied icon components, icon-sized instances, and `.svg` cloneable
  nodes into the icon `SLOT`
- fail import when a required slot is absent, ambiguous, or rejects child
  mutation
- hardened the fake Figma model so ordinary instance sublayers reject
  structural mutation and detach invalidates the old subtree
- updated tests to assert slot insertion and rejection instead of detach

Validation performed in-repo:

- `npm --prefix apps/figma-plugin test` -> 34/34 passing
- `npm --prefix apps/figma-plugin run build` -> passing

Still not closed:

- live Figma validation against the user's actual converted slots remains
  required before declaring spec 079 closeout-ready
- refresh and user-owned component override preservation remain later tasks
