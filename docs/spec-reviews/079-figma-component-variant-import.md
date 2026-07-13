# Spec 079 Figma Component Variant Import

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

---

## Opus Re-review - 2026-07-11 - residual instance-sublayer id errors and visual regressions after SlotNode fixes

Scope: strict adversarial re-review of `feat/079-figma-component-variant-import`
at commit `1994c4c` (`fix: avoid traversing stale figma instance sublayers`) and
`36c2c2a` (`fix: use figma slot nodes for component imports`). Live Figma / MCP
inspection was **not** available for this pass. `image copy 2.png` exists in the
workspace but I cannot visually decode PNG pixels, and `image copy.png` (the
hardcoded-height evidence) is not present locally. So the visual findings below
are grounded in the code paths that produce those symptoms plus the recorded
live error sequence, not in a pixel inspection. Anything needing live pixels or a
live plugin run is flagged `NEEDS LIVE`.

Bottom line up front: the "strict SlotNode" slice did not remove the failing
behaviour. It moved the illegal work from a detach fallback onto slot mutation,
but it **kept the full recursive descent of the live instance** as the primitive
for finding slots (`findSlotNodes` -> `findDescendants` -> `visitSceneTree`) and
**kept ordinary-instance-sublayer traversal + mutation** in the text-override
path. The `get_children` id error is therefore still structurally possible, and
the green test suite still cannot express it because the fake only throws stale
handles on `detachInstance` (which this slice removed) and treats all `SLOT`
children as freely mutable. This is the same class of false-green the prior
review flagged, relocated.

---

## Findings (ordered by severity)

### P0-1 - Slot discovery still fully walks the live instance's ordinary sublayers

- Files: `apps/figma-plugin/src/code.ts`
  - `findSlotNodes` (line ~1341) -> `findDescendants` (line ~1327) ->
    `visitSceneTree` (line ~1069)
  - callers: `findContentSlotNode`, `findIconSlotNode`,
    `getImportIndexChildren` (line ~857), `collectImportedNodes` (line ~864)
- Reason it is a real problem: `findSlotNodes(instance)` locates `SLOT` nodes by
  recursively descending the *entire* live instance subtree, reading
  `.children` on every ordinary sublayer (`contents`, `Text block`, `Main text`,
  `Helper text`, the default-icon `INSTANCE`, etc.). The recorded live id
  `I81:478;58:16` decodes to instance `81:478`, component-child `58:16`, which
  the prompt identifies as the Parent variant's `contents` sublayer - i.e. the
  exact node this descent reads `get_children` on. The slice's own claim that it
  "descends through SLOT nodes when encountering component instances" is not what
  the code does: `getImportIndexChildren` returns `findSlotNodes(node)` for an
  INSTANCE, and `findSlotNodes` must first walk *through* `contents` and its
  children to reach the slots. There is no pruning of `INSTANCE` subtrees; the
  walk enters them.
- Why `safeGetChildren` does not save it: `safeGetChildren` swallows a
  `get_children` throw and returns `[]`. Inside code.ts that means slot discovery
  can silently return empty/partial results (wrong output, or a misleading
  "does not contain a content SLOT" error), but it does **not** prevent the raw
  `get_children` error the user sees, because that error is thrown by a *native*
  Figma operation (see P0-2), not by the guarded JS read. So the guards convert
  one failure mode (silent wrong slot set) while leaving the native failure mode
  intact.
- Impact: the headline id-error loop is not closed; slot discovery is both
  unsafe and silently lossy.
- Recommended fix: stop discovering slots by walking the live instance. Read the
  **master component** (`instance.mainComponent` / the resolved `COMPONENT` from
  the set) once to learn slot layer ids/names, or require the box component to
  expose slots as named component/slot properties, then address the instance's
  slots by a stable handle obtained without a full sublayer descent. Never call
  `findDescendants` / `visitSceneTree` over a live `INSTANCE`.

### P0-2 - The importer still mutates slot contents and resizes/instantiates live instances, which is the native `get_children` trigger

- Files: `apps/figma-plugin/src/code.ts`
  - `clearSlotChildren` -> `clearChildren` -> `safeRemoveNode(child)` /
    `child.remove()` (lines ~1378, ~513)
  - `applyInstanceIconOverride`: `slot.appendChild(replacement)` (line ~1456)
  - `populateComponentSlot`: `slot.appendChild(body)` + `configureAutoLayoutFrame(slot, ...)` (lines ~1755-1788)
  - `buildComponentMappedNode`: `instance.resizeWithoutConstraints(...)` (line ~1841),
    `component.createInstance()` (line ~1835)
- Reason it is a real problem: even if every JS `.children` read is guarded,
  these are **native mutations on / around instance sublayers**: removing the
  default-icon child of the icon `SLOT`, appending a generated body into the
  content `SLOT`, reconfiguring the slot's auto-layout, and resizing the whole
  live instance. Whether Figma permits child mutation of a *converted slot inside
  a live instance* is exactly the feasibility question the spec's own **T002**
  probe was supposed to answer, and T002 is still unchecked. The code proceeds as
  if it is allowed. If it is not allowed, or if it internally reindexes the
  parent instance's sublayers (invalidating `contents` / `58:16`), the native
  call throws the `get_children` error that surfaces to the user. This is the new
  home of the old detach-loop fault.
- Impact: the central capability (populate a live component slot) may be
  fundamentally unsupported; the error is thrown from a native call the guards
  cannot intercept.
- Recommended fix: run T002 for real before any further code. If converted slots
  are not child-mutable on a live instance, Option B as coded is impossible - the
  component must instead expose an **instance-swap slot / component property**
  the importer satisfies with a pre-built instance, or the box must be detached
  (which the user forbids). Do not keep `clearChildren`/`appendChild` on slot
  sublayers until a live probe proves it is legal and non-invalidating.

### P0-3 - Ordinary-sublayer text mutation was NOT removed, contradicting Option B and the inbox claim

- Files: `apps/figma-plugin/src/code.ts` - `applyInstanceTextOverrides`
  (lines ~1383-1401), called unconditionally from `buildComponentMappedNode`
  (line ~1844)
- Reason it is a real problem: `applyInstanceTextOverrides` runs
  `findDescendants(instance, (candidate) => candidate.type === "TEXT")` - a full
  recursive walk of the live instance's ordinary sublayers - and then writes
  `.fontName` and `.characters` onto those sublayer `TEXT` nodes by flat index.
  `AGENT-INBOX.md` states the slice "removed icon placeholder replacement /
  ordinary instance-sublayer mutation", but text mutation of ordinary sublayers
  was left in place. The `candidate.type` read in the predicate is also
  **unguarded** (does not use `safeGetNodeType`), so it can throw on a stale
  sublayer handle. This both walks ordinary sublayers (P0-1 class) and mutates
  them, directly violating the user's Option B constraint "Never mutate ordinary
  live instance sublayers" and "Never traverse ordinary live instance sublayers".
- Impact: another live-unsafe traversal + mutation on the exact `contents`
  subtree the id error names; also silent text mismap (see P2-2).
- Recommended fix: set text only through exposed component **text properties**
  (`componentPropertyDefinitions` / `instance.setProperties`) discovered from the
  master, keyed by property name - not by walking sublayer `TEXT` nodes. If the
  component does not expose text properties, state that as a required contract
  gap rather than walking sublayers.

### P0-4 - Default placeholder icon and default helper text are never hidden

- Files: `apps/figma-plugin/src/code.ts`
  - `applyInstanceIconOverride` early-returns `iconOverrideOk()` when
    `node.icon` is falsy (lines ~1420-1422) without clearing the icon `SLOT`
  - `applyInstanceTextOverrides` only overrides `min(textNodes, lines)`
    (line ~1390), leaving surplus authored `TEXT` sublayers untouched
- Reason it is a real problem: when a semantic node has no icon, the component's
  authored `Default icon` (the `INSTANCE` inside the `Network.svg` SLOT in the
  fixture) is left visible - FR-013a explicitly says the importer "MUST NOT leave
  the component's default placeholder icon visible." Likewise, when the payload
  has fewer text lines than the component has `TEXT` layers (e.g. payload has a
  title but no helper text, component has `Main text` + `Helper text`), the
  authored `Helper text` default string is never cleared - FR-018 says default
  helper text "MUST be hidden or cleared". Both are the visual regressions the
  user reported, and both are blocking correctness bugs, not polish.
- Impact: imported boxes show stale placeholder icons and authored helper text
  the YAML never asked for.
- Recommended fix: drive icon and helper-text **visibility** from explicit
  component boolean/text properties. When `node.icon` is null, set the icon
  visibility property false (do not clear a slot by mutation); when a text slot
  has no payload line, set its text property to empty / its visibility false.
  This requires the box component to expose those properties - if it does not,
  name that as a required Figma contract (see Required Figma component contract).

### P1-1 - Hardcoded heights are introduced by unconditional instance resize and slot-body sizing

- Files: `apps/figma-plugin/src/code.ts`
  - `buildComponentMappedNode`: `instance.resizeWithoutConstraints(clampSize(node.width), clampSize(node.height))` (line ~1841)
  - `populateComponentSlot`: body created with `bodyHeight = node.bodyHeight ?? node.height` and resized via `finalizeFrameOwnSizing` (lines ~1760-1787)
  - `resizeFrameForFixedAxes` (lines ~298-327)
- Reason it is a real problem: the mapped instance is force-resized to the
  payload `width`x`height` **before** sizing modes are considered, baking a fixed
  height even for nodes whose `sizingH` is `HUG`/`FILL`. For slot bodies,
  `bodyHeight` defaults to the node's full `height` when `node.bodyHeight` is
  absent, so the generated container gets a large fixed height rather than
  hugging its children. FR-017 forbids component-mode hardcoded heights that
  contradict the payload's effective Fill/Hug/Fixed. T043a (the live hardcoded-
  height re-check) is unchecked.
- Impact: the reported hardcoded-height regression; boxes and slot bodies do not
  breathe with content.
- Recommended fix: never call `resizeWithoutConstraints` on an axis whose
  payload sizing is `HUG`/`FILL`; set sizing modes first and only resize `FIXED`
  axes. Default slot-body height to `HUG`, not `node.height`. NEEDS LIVE readback
  to confirm the fix against `image copy.png` (not present locally).

### P1-2 - Refresh/replace can duplicate on any stale-handle miss

- Files: `apps/figma-plugin/src/code.ts`
  - `upsertFrameDiagramPayload`: `findExistingImportedDiagram(importId)` then
    `safeRemoveNode(existing)` (lines ~1934, ~1960)
  - `findImportedNode` -> `collectImportedNodes` -> `getImportIndexChildren` ->
    `findSlotNodes` (full instance walk)
- Reason it is a real problem: the "replace" of a prior import depends on finding
  the existing root via `collectImportedNodes`, which for instances routes
  through `findSlotNodes` (the P0-1 unsafe walk). If any `get_children` throw is
  swallowed mid-walk, the existing root is not found and is **not removed**, so
  the new tree is appended alongside the old one - the reported duplicate
  parent/section instances. Partial-failure runs (which the current architecture
  produces readily) leave orphan instances that further pollute discovery.
  FR-019 / T044a (replace-not-append idempotence) is unchecked.
- Impact: duplicated diagrams and repeated wrappers accumulate across reruns.
- Recommended fix: identify prior imports by a flat, instance-safe index (e.g.
  top-level page children carrying the diagram-root import id) that never
  descends into instance sublayers; make replacement deterministic and assert
  post-run that exactly one importer-owned body exists per semantic node.

### P1-3 - Repeated `slot -> body` nesting is structural, not a bug to patch away

- Files: `apps/figma-plugin/src/code.ts` - `populateComponentSlot` (inserts a
  generated `body` auto-layout frame into the `slot`), recursively for each
  child that is itself a Parent/Section
- Reason it is a real problem: every mapped container yields
  `INSTANCE -> slot(SLOT) -> body(FRAME) -> child INSTANCE -> slot -> body ...`.
  For two real YAML levels (section -> parent) that is already two slot/body
  pairs; the user reporting "three nested slots" points at an extra wrapper
  (likely the generated `body` inside the slot on top of the component's own
  authored `contents`, plus root content). T046/T047 (wrapper budget / flatten
  text path) are unchecked. This is a design consequence of "generated frame
  inside a live slot", not a stray append.
- Impact: awkward, deep, hard-to-edit Figma trees; contradicts the spec-046
  thin-shell ratchet spirit for output structure.
- Recommended fix: decide the intended depth contract explicitly. If the slot
  must hold generated auto-layout, the generated container should BE the layout
  frame (no extra body wrapper), and authored `contents` should not duplicate
  header content. NEEDS LIVE tree dump to confirm the exact extra layer.

### P1-4 - The fake model still cannot reproduce the live failure class

- Files: `apps/figma-plugin/src/code.test.ts` - `FakeSceneNode`
  (`rejectsChildMutation`, `invalidateRemovedSubtree`, `cloneTree`, `findAll`)
- Reason it is a real problem: three modelling gaps keep the suite fake-green:
  1. `rejectsChildMutation()` returns `this.rejectChildMutation || (this.instanceSublayer && this.type !== "SLOT")` - i.e. it **unconditionally exempts `SLOT`** from mutation rejection. That hard-codes the unproven assumption from P0-2 (converted slots inside live instances are freely `appendChild`/`remove`-able) as ground truth in the test double.
  2. Stale-handle invalidation only happens in `invalidateRemovedSubtree`, called **only from `detachInstance`**. Since this slice removed detach from the production path, no production test ever triggers a stale `get_children`. Ordinary instance sublayers keep `throwOnChildrenRead === false`, so `findSlotNodes`/`findAll` walk them happily.
  3. Nothing invalidates sublayer handles on `resizeWithoutConstraints`, `createInstance`, slot `appendChild`, or slot child `remove` - the exact operations suspected in P0-2.
  The one test that pokes at staleness (`component validation ignores stale
  ordinary instance sublayer children`) sets `throwOnChildrenRead = true` on
  `contents` and asserts validation does **not** throw - i.e. it asserts the
  swallowing behaviour, which is the opposite of proving the architecture is
  safe. `upsertYamlDiagram rejects mapped instance when content SLOT mutation is
  rejected` only fires because the test manually sets `slotRejectsMutation`,
  which the real component may or may not do.
- Impact: 35/35 green tells you nothing about the live id error; the suite
  encodes the happy path Figma rejects.
- Recommended fix: harden the fake so (a) reading `.children` on an
  `instanceSublayer` node throws the `get_children (instance sublayer or table
  cell) ... does not exist` shape by default; (b) `SLOT` mutation legality is a
  configurable flag defaulting to the **unknown/behaves-like-live** state until
  T002 proves otherwise; (c) `createInstance`/`resize`/slot-append invalidate
  previously captured sublayer handles. Expect the current component/slot tests
  to go red; that red is the correct baseline.

### P2-1 - `safe*` wrappers now mask slot-discovery failure as silent wrong output

- Files: `apps/figma-plugin/src/code.ts` - `safeGetChildren`, `safeGetNodeType`,
  `safeGetParent`, `getImportData`, plus `findContentSlotNode` returning `null`
- Reason it is a real problem: because `findSlotNodes` runs over guarded reads, a
  live `get_children` failure mid-descent yields a shortened slot list, not an
  error. That can silently drop the content slot (then a confusing "does not
  contain a content SLOT" throw) or drop the icon slot (then default icon leaks,
  P0-4). The prior review's P2-2 concern is unresolved: guards are papering over
  unsafe access rather than the architecture avoiding it.
- Impact: nondeterministic, hard-to-diagnose partial imports.
- Recommended fix: once slot handles come from the master/contract (P0-1), an
  unexpected `get_children` should surface as a real error, not be swallowed.

### P2-2 - Text is still bound by flat index order

- Files: `apps/figma-plugin/src/code.ts` - `applyInstanceTextOverrides`
  (line ~1390)
- Reason it is a real problem: lines are assigned to discovered `TEXT` sublayers
  by position; any mismatch between the component's text-layer count/order and
  the payload silently mismaps labels (and, per P0-4, never clears surplus). This
  is the P3-1 finding from the prior review, still present.
- Impact: quiet content corruption once the instance path "works".
- Recommended fix: bind by named text component properties (folds into P0-3).

### P3-1 - Root header icon remains raw SVG even in component mode

- Files: `apps/figma-plugin/src/code.ts` - `buildDiagramFrameNode` routes
  `node.kind === "root"` to `buildContainerNode` (never component-mapped), whose
  header uses `createLeafIcon` -> `figma.createNodeFromSvg` (lines ~1585, ~787)
- Reason it is a real problem: the diagram root is intentionally not a component
  instance, so its header icon is a raw SVG recreation. Mapped leaf/child icons
  DO go through `instantiateIconSource` (component/clone), so in true component
  mode child icons are not raw SVG. If the user is seeing raw-SVG icons broadly,
  the likely cause is that component mapping is not resolving (the run reports
  `mode: generic-frame`) - a diagnostic pointer, NEEDS LIVE confirmation of the
  reported `mode`/`iconSources` counts in the plugin status line.
- Impact: mixed icon provenance; possible signal that component mode is silently
  off.
- Recommended fix: confirm the live status line shows `mode: box` with non-zero
  `componentInstanceCount`; decide whether the root header should also consume a
  copied icon source.

---

## Root-cause diagnosis

There is still a single root cause, unchanged in kind from the prior review and
merely relocated: **the importer treats a live component instance as a walkable,
mutable tree.** Slot discovery (`findSlotNodes`/`findDescendants`/`visitSceneTree`)
recursively reads `.children` on ordinary sublayers, text override walks and
writes ordinary sublayers, and slot population removes/append/reconfigures slot
sublayers and resizes the instance. The detach fallback was deleted, but the two
operations that actually throw - full sublayer descent and sublayer/slot mutation
- were kept. The `I81:478;58:16` id points at the Parent `contents` sublayer,
which is precisely the node the descent reads and the node adjacent to the slot
being mutated. The guards (`safe*`) hide the JS-side read failures but cannot
intercept the native `get_children` thrown by `createInstance`/`resize`/slot
`appendChild`/`remove`, so the id error survives.

Direct answers to the prompt's core questions:

1. No - recursive traversal of a live `INSTANCE` is not acceptable here, even to
   "only find SLOT nodes", because the walk must pass through ordinary sublayers
   to reach the slots.
2. Replacement contract: inspect the resolved master `COMPONENT` once for slot
   layer identity and text/icon property names; drive text/icon/visibility via
   `componentPropertyDefinitions` + `setProperties`; obtain slot handles without
   descending sublayers.
3. Unknown and unproven - whether converted slots are child-mutable on a live
   instance is T002, still unrun. The code and the fake both *assume* yes.
4. If mutable, handles must come from the master/contract, not a sublayer walk,
   and the importer must not touch sibling sublayers (`contents`) at all.
5. If not mutable enough, the box must expose an instance-swap slot / boolean +
   text + instance-swap properties the importer satisfies with pre-built
   instances; generated frames cannot go into a live slot.
6. Yes - component mode should fail fast (before creating any node) if the
   selected `box` does not expose the required slot/property contract.
7. `I...;58:16` = instance `81:478`, master child `58:16` = Parent `contents`
   sublayer, reached by `findSlotNodes`/`applyInstanceTextOverrides` descent and
   adjacent to the mutated icon/content slots.
8. Smallest next fix that does not reintroduce detach: replace `findSlotNodes`
   over the instance with master-component slot lookup + property-driven text/
   icon, and gate component mode on a verified contract; do not mutate sibling
   sublayers.
9. Live probe required before merge claims: T002 (insert generated auto-layout
   into a live converted slot and read back), plus a live run confirming no
   `get_children`, no default icon/helper text, no hardcoded height, single
   importer-owned body per node.
10. Tests must go red first (harden the fake per P1-4) before any green is
    meaningful.

---

## Current SlotNode strategy verdict

Not proven, and as coded it does not remove the failure. The strategy is sound in
intent (mutate only real `SLOT` nodes, never detach) but the implementation still
(a) finds those slots by walking the whole live instance and (b) resizes/instantiates/
mutates in ways that can invalidate sibling sublayers. It is green only in a fake
that exempts `SLOT` from all mutation rules and never invalidates a non-detached
sublayer handle. Verdict: **not merge-ready; treat SlotNode-as-implemented as
still fake-proven only.**

## Remaining unsafe traversal map

- `findSlotNodes` / `findContentSlotNode` / `findIconSlotNode` -> full instance
  descent (P0-1).
- `applyInstanceTextOverrides` -> full instance descent + `.characters`/
  `.fontName` mutation of ordinary sublayers, unguarded `.type` predicate (P0-3).
- `getImportIndexChildren` (INSTANCE branch) -> `findSlotNodes` -> full descent,
  invoked by `collectImportedNodes` during validation AND existing-root discovery
  (P0-1, P1-2).
- `clearSlotChildren`/`populateComponentSlot`/`applyInstanceIconOverride` ->
  native slot mutation + instance resize (P0-2).

## Required Figma component contract

If the user wants Option B (no detach), the authored `box` component must expose,
via component properties (not sublayer structure the plugin walks):

- a content slot the plugin can address by a **stable name/property**, proven
  child-mutable on a live instance (or an instance-swap slot the plugin fills
  with a pre-built child instance);
- an **icon boolean visibility** property + an **icon instance-swap** property
  (so no-icon nodes hide the default and matched icons swap in without slot
  mutation);
- **text properties** for each text layer (title, helper/body) so text is set and
  helper text hidden via `setProperties`, not sublayer writes;
- variant `Role` (already present) and any level/emphasis variants FR-006 needs.

If the component cannot expose these, Option B is not achievable and the review's
recommendation is to say so to the user rather than ship sublayer walking.

## Visual regression verdict

- Hardcoded heights: confirmed in code (P1-1). Blocking.
- Visible default helper text: confirmed in code (P0-4). Blocking.
- Visible default placeholder icons: confirmed in code (P0-4). Blocking.
- Raw-SVG icons: not confirmed for mapped children in code (they use instance/
  clone sources); root header icon is raw SVG by design; broad raw-SVG likely
  means component mode is off - NEEDS LIVE status-line confirmation.
- Duplicate instances / repeated slot-body wrappers: confirmed as reachable in
  code (P1-2 duplication on stale-handle miss; P1-3 structural depth). Blocking.
- Pixel-level inspection of `image copy 2.png` / `image copy.png`: NOT performed
  (cannot decode PNGs; `image copy.png` absent).

## What to stop doing

- Stop calling `findDescendants`/`visitSceneTree`/`findSlotNodes` over a live
  `INSTANCE`.
- Stop mutating ordinary instance sublayers, including `.characters`/`.fontName`
  in `applyInstanceTextOverrides`.
- Stop clearing/appending/reconfiguring slot sublayers and resizing live
  instances until T002 proves it legal and non-invalidating.
- Stop treating 35/35 green as evidence; the fake exempts `SLOT` and never
  invalidates non-detached sublayers.
- Stop relying on `safe*` swallowing to "handle" stale sublayers - it hides
  wrong output.

---

## Opus Re-review - 2026-07-11 - component-property contract failure for Section title

Scope: narrow adversarial pass on the single live failure after the
master-slot/component-property rewrite:

`Error: Mapped component Role=Section for services_layer must expose a title/text component property; refusing to edit live instance sublayers.`

Live Figma / MCP inspection was **not** available for this pass. Findings are
grounded in the current `code.ts`, the current `code.test.ts` fake, the recorded
live error sequence, and the design-context evidence quoted in
`AGENT-INBOX.md`. Every claim that needs a real Figma session is flagged
`NEEDS LIVE`.

Short version: **the latest error is correct behavior for the current
properties-only policy, not a new importer bug.** The `box` `Role=Section`
variant does not expose a title text component property, and the importer's
chosen strategy can only set text through component properties, so it hard-stops.
That is the right call given the policy. The real problems are three levels up:
(1) the policy that text may only be set through component properties is
**stricter than the Figma API actually requires** and appears to rest on a
misattributed root cause, (2) the failure is discovered lazily mid-import
instead of in a preflight, and (3) the fake hard-codes the ideal contract on
every variant, so 37/37 green can never reproduce the live failure. This is the
loop: the fake proves a world the authored component does not live in.

---

### Findings (ordered by severity)

#### P0-1 - The properties-only text policy is stricter than the Figma API requires, and is built on a misattributed root cause

- Files:
  - `apps/figma-plugin/src/code.ts` - `applyInstanceComponentProperties`, `requireComponentProperty` (lines ~1583-1666)
  - `apps/figma-plugin/src/code.ts` - `getInstanceSlotByMasterId` / `getInstanceSublayerId` (lines ~1421-1450)
- Reason it is a real problem: the branch history treats "sublayer mutation" as
  the cause of the earlier `get_parent` / `get_name` / `get_children` "node does
  not exist" failures. Those were **stale-handle-after-detach** failures (the
  prior P0-2 in this same file), not failures of writing a value to an addressed
  sublayer. The Figma instance restriction is **structural**: you cannot add,
  remove, reorder, or swap instance children. Setting an override value such as
  a TEXT node's `characters` on an addressed instance sublayer is an explicitly
  supported override and is exactly how instance text overrides work. The
  importer already owns a safe, non-structural, non-detaching way to address an
  instance sublayer by stable id - `getInstanceSublayerId` builds
  `I<instanceId>;<masterNodeId>` and `getNodeById` resolves it - and it uses that
  path today for the content slot and icon slot. The same addressing could set
  the title text node's `characters` without a component property, without
  detach, and without walking children. Requiring the user to re-author every
  `box` variant with a text property is therefore a **self-imposed policy**, not
  an API constraint.
- Impact: the user is being pushed into a Figma re-authoring contract (expose a
  text property on every variant) to work around a restriction that may not
  exist for targeted overrides. If the policy is wrong, that authoring work is
  wasted and the "per-error patch loop" continues, because each newly authored
  property just surfaces the next missing one (helper, icon visibility, ...).
- Recommended fix: make **one** explicit architectural decision before any more
  code changes (see `Root-cause diagnosis`). Do not silently keep the strict
  policy. If the policy stays, own it in the docs and add a preflight (P0-2). If
  the policy is wrong, the fix is to set `characters` on the stable-addressed
  title text sublayer using the mechanism that already works for slots. Confirm
  the write is legal and non-invalidating with a live probe first (`NEEDS LIVE`).
  This respects the "no detach, no structural mutation, no recursive sublayer
  walk" constraints while removing the title-property requirement.

#### P0-2 - The contract is enforced lazily per node, so a diagram fails mid-import instead of in a preflight

- Files:
  - `apps/figma-plugin/src/code.ts` - `applyInstanceComponentProperties` calling `requireComponentProperty` per node (lines ~1618-1666)
  - `apps/figma-plugin/src/code.ts` - `buildComponentMappedNode` (lines ~2087-2117)
  - contrast with the up-front analysis in the mapping resolver (`analyzeBoxComponentContract` per role, lines ~1536-1543)
- Reason it is a real problem: `analyzeBoxComponentContract` already runs for all
  three roles when the mapping is resolved, but the *requirement* that a title
  property exists is only thrown when the first node that needs it is built. A
  diagram made only of `Role=Child` / `Role=Parent` nodes would import "fine"
  even though `Role=Section` is missing its title property; the failure appears
  only when a section node is reached (`services_layer` here). That is the
  textbook "fails mid-import" symptom the prompt asks about.
- Impact: slow, confusing failures that depend on payload shape and traversal
  order; the user cannot see the full list of what Figma authoring is missing in
  one shot. Partial import is cleaned up (`cleanupCreatedNodes` runs in the outer
  catch, and there is a survivor/cleanup test), so this is not a canvas-junk bug,
  but it is a poor and non-deterministic failure surface.
- Recommended fix: after the mapping resolves and the payload is parsed, preflight
  every (role, required-property) pair that the actual payload will use, and throw
  once with a consolidated list of every missing Figma property across all roles
  in use. Fail before creating the first instance.

#### P0-3 - The fake hard-codes the ideal contract on every variant, so the live failure is structurally unreproducible (false green)

- Files:
  - `apps/figma-plugin/src/code.test.ts` - `makeBoxVariant` (lines ~716-768), `installBoxComponentSet` (lines ~771-786)
- Reason it is a real problem: `makeBoxVariant` unconditionally sets
  `mainText.componentPropertyReferences = { characters: "Title#title" }` on every
  variant, and `installBoxComponentSet` always defines `Title#title`,
  `Helper text#helper`, `Show helper#showHelper`, `Show icon#showIcon` on the set.
  There is no fixture for a variant that is missing a title text property, a
  helper property, or an icon-visibility property. So the exact live failure
  class - "authored component does not expose the required property" - cannot be
  produced by any test. 37/37 green is describing a Figma file the user does not
  have.
- Impact: this is the engine of the current loop. Each live error is a property
  the fake assumes exists and the real component does not. Because the fake can
  never surface that class, the loop only advances one property at a time in
  production, never in tests.
- Recommended fix: add fixtures for the failure classes: a variant with no title
  property, a variant with a default helper layer but no helper text/visibility
  property, a variant with a default icon but no icon-visibility property. Assert
  that the importer's preflight throws with the consolidated missing-property
  message. The fake should reproduce the live failure classes, not normalize them
  away.

#### P1-1 - `.children` throwing on ordinary instance sublayers models a policy, not the real API

- Files:
  - `apps/figma-plugin/src/code.test.ts` - `get children()` throws when `instanceSublayer && type !== "SLOT"` (lines ~95-99)
- Reason it is a real problem: real Figma allows reading `.children` of an
  instance and its sublayers; the illegal operations are structural writes. The
  fake throwing on any non-SLOT sublayer `.children` read encodes the team's
  self-imposed "never traverse sublayers" policy as if it were an API law. That
  is defensible as a guard-rail, but it also over-fits the fake to one policy and
  makes it easy to conclude "the API forbids this" when it does not - which is
  how P0-1 crept in.
- Impact: reinforces the misattributed root cause; obscures that a targeted
  override write is legal. Not wrong to keep as a lint-style guard, but it should
  be labelled a policy, not an API fact, in the test comments and docs.
- Recommended fix: keep the guard if the policy stays, but comment it as
  "policy: we do not walk live instance sublayers" rather than implying the API
  throws. Reconsider if P0-1 resolves toward targeted overrides.

#### P1-2 - Title vs helper disambiguation is name-heuristic based and can pick the wrong text property

- Files:
  - `apps/figma-plugin/src/code.ts` - `analyzeBoxComponentContract` title/helper split via `isHelperLayerName` (lines ~1376-1390)
  - `apps/figma-plugin/src/code.ts` - `isHelperLayerName` regex (lines ~1293-1296)
- Reason it is a real problem: title is chosen as "the first TEXT-referenced
  property on a layer whose name does not match the helper regex", and helper as
  "the first on a layer that does". If the user names the primary title layer
  `body`, `subtitle`, `description`, or similar, it is misclassified as helper and
  the title property is reported missing - producing the exact P0 error even when
  a title property exists. Conversely a helper layer named neutrally becomes the
  title.
- Impact: false "missing title property" failures and swapped title/helper text
  on correctly authored components. Hard for the user to diagnose because the
  message says "expose a title property" when one exists under a differently
  named layer.
- Recommended fix: prefer explicit, contract-named properties (for example a
  property literally named `Title` / `#title` and `Helper`) over layer-name
  heuristics, or document the required layer-naming contract precisely. At
  minimum, when discovery finds referenced TEXT properties but cannot classify a
  title, report the property names it *did* find so the user can see the mismatch.

#### P2-1 - `I<instanceId>;<masterSlotId>` addressing is plausible but unproven on live Figma

- Files:
  - `apps/figma-plugin/src/code.ts` - `getInstanceSublayerId`, `getInstanceSlotByMasterId` (lines ~1421-1450)
  - `apps/figma-plugin/src/code.test.ts` - `lookupNodeById` / `findInstanceSublayerBySourceId` (lines ~480-490, ~223-233)
- Reason it is a real problem: the id form `I<instanceId>;<mainComponentChildId>`
  is the documented Figma instance-sublayer id shape, and the fake resolves it,
  so the approach is reasonable. But two things are unverified live: (a) that the
  `masterSlotId` taken from the *variant COMPONENT* child (not the COMPONENT_SET)
  matches the suffix Figma uses for instances of that variant, and (b) that
  `getNodeByIdAsync` resolves that synthetic id on a live instance without a
  page-load or async caveat. The fake cannot prove either because it mints its
  own ids.
- Impact: if the live suffix differs (for example nested-instance ids of the form
  `I<a>;<b>;<c>`, or set-vs-variant id mismatch), `getInstanceSlotByMasterId`
  throws "cannot address its content slot by stable slot id", which would look
  like yet another importer bug. This is the next most likely live failure after
  the title-property one is resolved.
- Recommended fix: probe live (T002-style) - create one instance, read a known
  sublayer id from `getNodeByIdAsync`, and confirm the constructed id matches.
  Do this before shipping more code.

#### P2-2 - Design-context props (`hasHelperText`, `networkSvg2`, `slot`) are not proof of plugin component properties

- Files:
  - evidence only: `AGENT-INBOX.md`, prompt body
- Reason it is a real problem: those names came from `get_design_context`
  (Dev Mode / generated code), which surfaces React-style prop and slot names.
  They are **not** authoritative for the plugin `componentPropertyDefinitions`
  keys, which carry the `#id` suffix (for example `Title#title`). The importer
  correctly reads definitions from the set and references per node, so it does not
  depend on these strings - but they should not be used to conclude the title is
  or is not a property. The literal `Parent` title rendering is the stronger
  signal, and it suggests the title is a hard-coded per-variant string, not a
  property.
- Impact: risk of chasing prop names that do not exist in the plugin API.
- Recommended fix: only trust `componentPropertyDefinitions` from the set in a
  live probe. Ignore design-context names for the plugin contract.

---

### Root-cause diagnosis

The importer pivoted to a "text only via component properties, slots only by
stable id, never walk or mutate sublayers, never detach" architecture. That
architecture is internally consistent and the `Role=Section` error is its
correct output for a component that lacks a title text property. The problem is
that the no-mutation policy was adopted to fix failures that were actually
caused by detach-invalidated stale handles, not by targeted override writes. So
the policy over-corrects: it forbids a legal, safe operation (setting
`characters` on a stable-addressed sublayer) and instead demands the user
re-author every variant with text properties. Combined with a fake that
hard-codes those properties on every variant, the result is a loop where each
live import reveals one more property the fake already assumed.

### Is the latest error correct?

Yes, given the current policy. It is not a spurious importer bug and it is not
brittle discovery - `analyzeBoxComponentContract` correctly reads
`componentPropertyReferences.characters` per node and validates the name against
the set's `componentPropertyDefinitions` with type `TEXT`. If no such property
exists, refusing to edit is the correct behavior for a properties-only importer.
The error is "correct but premature and possibly unnecessary": premature because
it fires mid-import (P0-2), unnecessary if the policy itself is wrong (P0-1).

### Required Figma authoring changes (if the properties-only policy stays)

For each variant `Role=Child`, `Role=Parent`, `Role=Section`:

1. Select the main title text layer, in the right-hand properties panel click the
   diamond / "Create component property" next to the text content, choose
   **Text**, name it consistently (for example `Title`). This creates a
   `Title#<id>` definition on the `box` component set and sets
   `componentPropertyReferences.characters` on that text node.
2. Do the same for the helper/body text layer where one exists (for example
   `Helper text`).
3. For the helper text layer, create a **Boolean** property for its visibility
   (for example `Show helper`) via the layer's visibility "Create property".
4. For the icon layer/slot, create a **Boolean** visibility property (for example
   `Show icon`).
5. Keep the content slot as a real `SLOT` named exactly `slot` on `Role=Parent`
   and `Role=Section`.

Note: the importer's title/helper split is currently name-heuristic based
(P1-2), so avoid naming the title layer `body`/`subtitle`/`description`/
`secondary`, or the fix in P1-2 must land first.

### Importer changes, if any

- Decide P0-1 first. If policy stays: add the preflight (P0-2) and improve
  discovery messaging (P1-2). If policy is wrong: set title/helper `characters`
  on the stable-addressed text sublayer (reuse `getInstanceSublayerId`), gated by
  a live probe, and drop the hard title-property requirement.
- Either way, add the preflight - it is correct under both policies.

### Preflight contract recommendation

Add a single preflight that runs after mapping resolution and payload parse, and
before the first `createInstance`. Walk the payload, collect the set of roles
actually used and, per role, the properties actually needed (title always when a
node has title text; helper when helper text present or a default helper layer
exists; icon visibility when the node has no icon but the slot has default
content). Validate all of them against the resolved `roleContracts` and throw one
consolidated error listing every missing Figma property, grouped by role. This
converts N mid-import failures into one deterministic up-front message.

### Fake Figma hardening gaps

- No fixture for a variant missing a title text property (P0-3). Add one and
  assert the preflight message.
- No fixture for a default helper layer with no helper text/visibility property.
- No fixture for a default icon with no icon-visibility property.
- `.children` throwing on sublayers is a policy dressed as an API law (P1-1);
  comment it as policy.
- The fake mints its own instance-sublayer ids, so it cannot validate the live
  `I<instanceId>;<masterSlotId>` shape (P2-1) - this stays a live gap.

### Live probe required next

1. On the user's real file, create one instance of each `box` variant and read
   `componentPropertyDefinitions` from the **set**; record the exact keys.
   Confirms whether a title text property exists at all.
2. For the same instances, read a known sublayer id from `getNodeByIdAsync` and
   confirm it equals `I<instanceId>;<variantChildId>` built from the variant
   component child id (P2-1).
3. If P0-1 goes toward overrides: on a live instance, address the title text
   sublayer by stable id and set `.characters`; confirm it succeeds and does not
   invalidate the instance handle. This is the single decision-making probe.

### What to stop doing

- Stop adding one component property at a time in reaction to each live error.
- Stop treating 37/37 green as evidence; the fake hard-codes the contract the
  live file lacks.
- Stop asserting the Figma API forbids all sublayer access - it forbids
  structural writes, not targeted overrides.
- Do not detach and do not walk/recursively mutate sublayers (unchanged).

### What to implement next (smallest loop-breaking step)

Run the live probe (probe 1 + probe 3) to answer one question: does the real
`box` expose a title text property, and if not, does a stable-addressed
`characters` write succeed on a live instance? That single answer decides P0-1.
Do not write more code before it. Then, regardless of the answer, add the
preflight (P0-2) and the missing-property fixtures (P0-3).

### Tests that must be added or changed

- Variant-missing-title-property fixture -> preflight throws consolidated message.
- Default-helper-layer-without-helper-property fixture -> preflight throws.
- Default-icon-without-visibility-property fixture -> preflight throws.
- Title layer named with a helper-like word (`body`) -> asserts P1-2 behavior
  (either correctly classified or clearly reported).
- If overrides are adopted: a test that title/helper `characters` are set via the
  stable-addressed sublayer without structural mutation.

### Merge recommendation

**Do not merge.** The branch is blocked on an unmade architectural decision
(P0-1) and a false-green test surface (P0-3). Neither is fixable by another
per-error patch. Gate merge on: (a) the live probe result, (b) a preflight that
fails once with the full missing-property list, and (c) fake fixtures that
reproduce the missing-property failure classes. If the probe shows the title is
not a property and a stable-addressed `characters` write is legal, prefer that
over forcing Figma re-authoring; if re-authoring is chosen, the docs must state
plainly that import requires the user to expose title/helper/icon properties
first.

Could not verify live (no MCP/Figma session this pass): whether the real `box`
exposes a title text property, whether `I<instanceId>;<masterSlotId>` resolves on
the live instance, and whether a targeted `characters` write on a live instance
sublayer is legal and non-invalidating. All three are folded into the probe above.
- Stop checking `[x]` on T030/T032/T034/T036/T040-T045 while T002 is unchecked.

## What to implement next

1. Run T002 live and record the actual API behaviour for inserting generated
   auto-layout into a converted slot on a live instance (and whether it
   invalidates `contents`). This gates everything.
2. Replace instance-descent slot discovery with master-component slot lookup +
   stable handles.
3. Move text, helper-text visibility, and icon visibility/swap to component
   properties (`setProperties`), removing all ordinary-sublayer writes.
4. Fix sizing: set modes first, resize only FIXED axes, default slot bodies to
   HUG (P1-1).
5. Make prior-import discovery instance-safe and replacement deterministic
   (P1-2); assert one importer-owned body per node.
6. If the component contract is insufficient, stop and report the exact required
   properties to the user (no silent faking).

## Tests that must be added or changed

- Harden `FakeSceneNode` first (P1-4): default `get_children` throw on ordinary
  instance sublayers; `SLOT` mutation legality behind a flag defaulting to
  live-like; invalidate handles on `createInstance`/`resize`/slot mutation.
- Expect current component/slot tests to fail; rebuild them against the hardened
  fake. Rewrite `component validation ignores stale ordinary instance sublayer
  children` so it proves the code does NOT walk `contents`, rather than proving
  the throw is swallowed.
- Add: no-icon node hides default icon (visibility property set false, no slot
  mutation).
- Add: payload with fewer lines than component text layers clears/hides surplus
  helper text.
- Add: HUG-height node does not receive a fixed height; slot body hugs children.
- Add: rerun replaces the single importer-owned body and does not duplicate the
  root or wrappers.
- Add: negative test that slot discovery uses the master, not an instance walk
  (e.g. instance sublayer `.children` throwing must not affect discovery).

## Status honesty check

- `AGENT-INBOX.md` overclaims: "removed ... ordinary instance-sublayer mutation"
  (text mutation remains, P0-3); "Validation/result indexing uses a slot-aware
  safe traversal so stale ordinary instance sublayers are not walked" (false -
  `getImportIndexChildren` calls `findSlotNodes`, which walks ordinary sublayers
  to locate slots); "the prior fake-green component/slot tests now exercise the
  real architectural constraint" (the fake exempts `SLOT` and never invalidates
  non-detached sublayers, so the real constraint is still not exercised).
- `tasks.md`: same overclaim pattern the prior review flagged persists - T002
  (feasibility gate), T031/T031a/T036a/T043a/T044a/T046/T047/T061/T061a/T061b
  unchecked, yet T030/T032/T034/T036/T040-T045 checked. The load-bearing probe is
  unrun while dependent phases read done.
- `spec.md`: Status `Draft`, accurate; FR-013a/FR-017/FR-018/FR-019 correctly
  describe the required behaviour that the implementation does not yet meet - the
  spec is honest, the code diverges.

## Merge recommendation

Do not merge. The strict-SlotNode slice relocated the fault rather than fixing
it: live-instance sublayer traversal and slot/sublayer mutation remain, the
`get_children` id error is still structurally reachable, four blocking visual/
correctness regressions (default icon, helper text, hardcoded height, duplicate/
deep wrappers) are present in code, and the green suite cannot see any of it.
Path to mergeable: run T002, adopt the master-component + component-property
contract (or report the contract gap to the user), harden the fake, let the
tests go red and rebuild, then re-review with a live run.

## Residual risks - acceptable vs blocking

Blocking (must resolve before merge):
- Live-instance sublayer descent for slot discovery (P0-1).
- Native slot/instance mutation without a proven T002 (P0-2).
- Ordinary-sublayer text mutation (P0-3).
- Default icon + helper text left visible (P0-4).
- Hardcoded heights (P1-1); duplicate/deep wrappers (P1-2, P1-3).
- Fake that cannot express the failure (P1-4); overclaimed status.

Acceptable to defer (document, not block) once the above are fixed:
- Root header icon provenance (P3-1), pending the icon-source decision.
- Refresh user-owned override preservation (Phase 5), already deferred.

Could-not-verify (NEEDS LIVE / MCP):
- Whether converted slots are child-mutable on a live instance (T002).
- The exact native call that throws `get_children` on `58:16`.
- Pixel confirmation of hardcoded height / raw-SVG / duplication from the
  screenshots (`image copy.png` absent; PNG pixels not decodable here).
- The live plugin status line (`mode`, `componentInstanceCount`, `iconSourceCount`).

## Implementation Response - 2026-07-11 - master-slot and component-property contract

Implemented against the re-review findings:

- Removed recursive live-instance slot discovery. The importer no longer has
  `findSlotNodes` / `findContentSlotNode` / `findIconSlotNode`; it discovers
  slots on the master component and addresses instance slots by stable
  `I<instanceId>;<masterSlotId>` node id.
- Removed ordinary instance text mutation. Title/helper text and helper/icon
  visibility now use component properties discovered from
  `componentPropertyDefinitions` and sublayer `componentPropertyReferences`.
  Missing required properties fail with component-contract errors rather than
  walking sublayers.
- Pruned instance subtrees during component/icon discovery and validation.
  Readback validation uses normal frame traversal plus the current build
  context for generated slot bodies, not recursive instance descent.
- Fixed the hardcoded-height path in code by removing the unconditional
  component-instance resize and resizing only payload-`FIXED` axes.
- Added fake-Figma coverage where ordinary instance sublayers throw on
  `.children` reads by default, slots are resolved by instance-sublayer id, and
  tests cover hidden helper/default icon properties, component icon output, and
  rerun replace-not-append behavior.

Still needs live Figma before merge readiness:

- T002 remains unproven: real converted `SLOT` mutation on a live instance must
  be tested in the user's file.
- The real `box` component must expose title/helper text properties and
  helper/icon visibility properties. If those properties are absent, the new
  importer will fail clearly instead of faking output through sublayer edits.
- Pixel/live verification is still required for hardcoded heights, default
  helper/icon visibility, icon provenance, and wrapper depth.

Validation run after this response:

- `npm --prefix apps/figma-plugin test` -> 37/37
- `npm --prefix apps/figma-plugin run build` -> pass

Follow-up live error response:

- Live Figma reported
  `in get_componentPropertyDefinitions: Can only get component property definitions of a component set or non-variant component`.
- Fix: component-property definitions are now read from the `box` component set
  only, not from variant components. The fake Figma model now throws the same
  error for variant `componentPropertyDefinitions` reads, with a regression
  proving `resolveComponentMapping()` avoids that path.

---

## Opus Review – 2026-07-12 – "missing imported frame": live-slot insertion cannot satisfy Option B

Scope: strict adversarial review of the current `feat/079-figma-component-variant-import`
head (`1994c4c`) against the live failure the user reported:

```
Error: Figma rejected imported sizing:
ai_workflows/body: missing imported frame
kubeflow: missing imported frame
mlflow: missing imported frame
… (every nested container body + every nested box)
```

Live Figma / MCP inspection was **not** available for this pass. Findings are
grounded in the code at HEAD, the recorded error, the git history, and the API
facts already captured in the earlier reviews above. Live-only claims are
flagged. The user has chosen **Option B (keep boxes as live component
instances, no detach)** as the target. This review takes that constraint as
given and reports, adversarially, whether the current code moves toward it and
whether Option B as scoped is even reachable.

Short version: the new error is **not** a new bug. It is the same root cause as
every prior wave, surfacing one layer later. The branch has migrated the
symptom from "throw while mutating a live sublayer" to "silently produce
unaddressable slot content, then fail readback validation". The load-bearing
operation – pushing generated auto-layout into a **live** instance's slot – is
still an unsupported live-instance structural edit, and the readback validator
is architecturally incapable of ever seeing its output. Worse: pure Option B, as
currently scoped, has a hard ceiling that no amount of grunt work removes.
That ceiling needs to be decided before any more code is written.

---

### Findings (ordered by severity)

#### P0-1 – The build path still performs a live-instance structural edit; only the symptom moved

- Files:
  - [`apps/figma-plugin/src/code.ts`](../../apps/figma-plugin/src/code.ts#L2258-L2301) – `populateComponentSlot`
  - [`apps/figma-plugin/src/code.ts`](../../apps/figma-plugin/src/code.ts#L421-L433) – `appendAutoLayoutChild`
- Reason it is a real problem: `populateComponentSlot` builds a normal `body`
  auto-layout frame, tracks its id, then calls `appendAutoLayoutChild(slot, body)`
  where `slot` is a **live instance** `SLOT` sublayer resolved by
  `getInstanceSlotByMasterId`. `appendAutoLayoutChild` calls `parent.appendChild(child)`
  with no guard. Appending a generated node into a live instance's slot is a
  structural mutation of live instance internals – exactly the operation Option
  B forbids and the one the earlier reviews already named as unsupported. The
  branch removed *recursive* sublayer walking and *text* sublayer mutation, but
  the single most important sublayer mutation – inserting generated content into
  the slot – was kept and is still the whole point of `populateComponentSlot`.
- Impact: this is the direct engine of the current failure. Whether the append
  throws or silently re-parents, the generated body ends up as an instance
  sublayer (new `I…;…` id) that nothing downstream can address.
- This is not a regression from the SlotNode work; it is the SlotNode work. The
  earlier P1-1 finding ("slot insertion is done by raw mutation") was never
  actually resolved – it was relocated behind a stable-id lookup.

#### P0-2 – The readback validator can never see slot-hosted content, so this error class is structurally guaranteed

- Files:
  - [`apps/figma-plugin/src/code.ts`](../../apps/figma-plugin/src/code.ts#L901-L907) – `getImportIndexChildren` returns `[]` for any `INSTANCE`
  - [`apps/figma-plugin/src/code.ts`](../../apps/figma-plugin/src/code.ts#L910-L945) – `collectImportedNodes` / `collectImportedNodesById`
  - [`apps/figma-plugin/src/code.ts`](../../apps/figma-plugin/src/code.ts#L258-L266) – `trackImportedNode` captures the id **before** insertion
  - [`apps/figma-plugin/src/code.ts`](../../apps/figma-plugin/src/code.ts#L957-L989) – `validateImportedDiagramSizing`
- Reason it is a real problem: the validator resolves nodes two ways, and both
  are blind to slot-hosted content:
  1. Tree walk – `getImportIndexChildren` deliberately returns `[]` for `INSTANCE`,
     so it never descends into a mapped box. Any body appended into a slot is
     inside an instance and is invisible.
  2. Id map – `trackImportedNode(context, body, "${node.id}:body")` records the
     body's id **while it is still a free frame**, before `appendAutoLayoutChild(slot, body)`.
     Once the node is re-parented into the live instance slot it becomes a
     sublayer with a different `I…;…` id, so `getNodeById(capturedId)` returns
     null.
  Result: for every container, `${id}:body` and every nested box resolve to
  `undefined` → `missing imported frame`. The list the user pasted is exactly
  "every node that was routed through a slot".
- Impact: the build path and the validation path contradict each other. The
  build path depends on slot insertion; the validation path is designed to
  refuse to look inside instances. **This validation can never pass while
  content lives in a live slot**, no matter which node id is patched next. This
  is why the loop cannot converge – the same reason the earlier `get_children`
  loop could not converge.

#### P0-3 – Pure Option B cannot represent a container with variable children through a live slot (hard ceiling)

- Files: [`apps/figma-plugin/src/code.ts`](../../apps/figma-plugin/src/code.ts#L2338-L2372) – `buildComponentMappedNode`; `specs/079-figma-component-variant-import/spec.md` (External API Facts).
- Reason it is a real problem: this is the finding that must be decided before
  any more implementation. A live Figma instance's slot content is controlled by
  the component **contract**, not by free child insertion. The only contract-safe
  way to place a child into a live slot is an **instance-swap** property, which
  accepts exactly **one** swapped instance of a component. A diagram container
  (`ai_workflows`, `central_cloud`, `regional_edge`, …) holds a **variable
  number** of children laid out with direction and gap. There is no live-instance
  mechanism to push a variable-length, direction-aware auto-layout list of
  arbitrary generated boxes into a single slot and keep the parent a live
  instance. Exposed/"nested instance" properties expose *properties*, not free
  child mutation.
- Impact: **Option B, scoped as "every box stays a live instance including
  containers", is not reachable via the plugin API for arbitrary nesting.** No
  amount of grunt work closes this. Continuing to implement slot insertion is
  chasing an API capability that does not exist.
- This is the honest answer the user needs: the reason "all hell broke loose
  when we switched to passing content into component slots" is that live slots
  are not a container mechanism for generated content. They worked as primitives
  because primitives are ordinary, fully-addressable, fully-mutable frames.

#### P1-1 – Feasibility gate T002 is still unproven and the current error is the proof it is failing

- Files: `specs/079-figma-component-variant-import/tasks.md` (T002/T003 still unchecked in every prior pass).
- Reason it is a real problem: T002 ("instantiate a variant, attempt to insert a
  generated auto-layout frame into the converted `SLOT`, record what the API
  allows") has never been run live and recorded. The current `missing imported
  frame` wave is, in effect, T002 failing in production: either the append is
  rejected/re-homed, or it produces unaddressable sublayers. Either way the
  documented gate says "slot insertion remains the first live feasibility gate"
  and the code proceeded as if it had passed.
- Impact: the branch is still building on an unproven, and now actively
  contradicted, feasibility assumption.

#### P1-2 – The fake model still cannot reproduce slot-insertion invalidation, so 40/40 green is not evidence

- Files: `apps/figma-plugin/src/code.test.ts` – `FakeSceneNode` slot/append/id modelling.
- Reason it is a real problem: the fake mints its own sublayer ids and lets a
  slot accept an appended child that then remains addressable by its original
  handle. Live Figma re-parents slot content into the instance and changes its
  id. So the exact failure – captured id no longer resolves after slot insertion
  – cannot occur in the fake. The suite is green precisely because it models the
  operation as succeeding. This is the same false-confidence class flagged as
  P0-3 (2026-07-11) and P1-4 (re-review); it has not been closed for the slot
  path.
- Impact: every "slot works" test is fake-green. The `validateImportedDiagramSizing`
  test at [`code.test.ts`](../../apps/figma-plugin/src/code.test.ts#L1110) asserts
  the error string but with a fake that can also make it pass – it does not pin
  the real invalidation.

#### P1-3 – The `try`/`safe*` posture still converts an unsupported operation into silent wrong output

- Files: `safeGetChildren` / `safeGetParent` / `safeGetNodeId` and the
  `trackImportedNode`/validator interplay.
- Reason it is a real problem: `trackImportedNode` uses `safeGetNodeId` and
  silently records nothing on failure; the validator then reports a soft
  `missing imported frame` rather than the real cause ("slot insertion is not a
  supported live operation"). The user is shown a sizing-validation error, which
  is three layers downstream of the actual fault.
- Impact: the true failure ("you cannot host generated content in a live slot")
  is never surfaced; the operator sees a misleading sizing message and the agent
  patches ids.

#### P2-1 – Fix-loop signature is unchanged

- The git log is the fingerprint: `60e35d4`, `003e690`, `e08584c`, `546f58f`,
  `517b115`, `e349434`, `92dff0b`, `36c2c2a`, `1994c4c` – nine consecutive
  feat/fix commits, each named after the specific handle/error class it tried to
  rescue (`stale figma import handles`, `capture names before detach`, `use slot
  nodes`, `avoid traversing stale sublayers`). This is per-symptom patching of a
  fixed API limitation, exactly as diagnosed on 2026-07-11.

---

### Root-cause diagnosis

One root cause, unchanged across every wave: **the importer treats a live
component instance as a container it can fill with generated content.** Figma
does not allow that. Live instance internals are contract-controlled, not
free-form. The branch has progressively narrowed *which* live edit it performs
(dropped recursive walks, dropped text-sublayer edits) but kept the one edit
that defines the feature – inserting generated auto-layout into the slot – which
is the unsupported one. The validator, meanwhile, is hard-coded to refuse to see
inside instances, so even a hypothetically-successful insertion fails readback.

Answering the architecture question directly:

1. Is the current path architecturally correct for Option B? **No.**
   `appendAutoLayoutChild(slot, body)` on a live instance is the same class of
   live-sublayer structural edit Option B forbids; it only looks different
   because the slot is resolved by stable id first.
2. Is pure Option B (every box, including containers, stays a live instance)
   reachable? **No, not for containers with variable children.** Live slots
   accept a single instance-swap, not a generated variable auto-layout. This is
   an API ceiling, not a bug to be ground out (P0-3).
3. Is the current failure a new bug? **No.** It is the guaranteed output of a
   build path that inserts into live slots plus a validator that cannot see slot
   content (P0-1 + P0-2).

---

### Architecture recommendation (feasible under "no detach")

Do **not** keep instantiating containers. The reachable design that honours the
user's "no detach, keep components" intent is **hybrid by depth**, and crucially
it never needs a detach because it never creates a container instance to detach:

- **Leaf boxes (`Role=Child`) → live `box` instances.** All variation via the
  component contract already built (variant, boolean visibility, text
  properties, icon instance-swap). No structural edits. This is true Option B and
  it works today.
- **Container boxes (`Role=Parent` / `Role=Section`) → native generated frames**,
  built by the same primitive builders that worked before the slot switch. The
  container body is an ordinary auto-layout frame that holds the child **live
  instances** directly. No live slot is involved, so there is nothing to mutate
  illegally and nothing for the validator to be blind to.
  - If the container's header/chrome must stay on-brand, embed a live
    header-`box` instance inside the generated container frame, or express the
    container border/padding/header through the generator's existing token-driven
    frame styling (that is what produced correct output in the primitives era).

Why this is the honest recommendation despite the user choosing "Option B
absolutely": Option B is fully achievable for leaves and header chrome, and that
is where component fidelity actually matters (icon, title, helper, variant
styling). Container *layout* (variable children, direction, gap) is inherently
generator-owned and cannot be a live slot. This keeps every semantically
meaningful box a live instance while removing the one operation the API refuses.

If the user rejects generated container frames and insists containers must also
be live instances, then the only remaining options are (a) accept detach for
containers (explicitly forbidden), or (b) author each container as a
fixed-arity instance-swap layout, which does not scale to arbitrary diagrams.
Both should be put back to the user as a decision, not implemented speculatively.

---

### What to stop doing

- Stop calling `appendChild` / `appendAutoLayoutChild` / `clearSlotChildren` on
  live instance slot sublayers. That is the unsupported edit (P0-1).
- Stop building on T002 as if it passed. It is failing right now (P1-1).
- Stop trusting the 40/40 suite for the slot path; it is fake-green (P1-2).
- Stop patching the next `missing imported frame` id. The next id is a symptom
  of P0-2/P0-3, not a bug.
- Stop describing the current branch as "Option B". It still performs a live
  slot structural edit.

---

### What to implement next (loop-breaking, in order)

1. **Decide P0-3 with the user before writing code.** Confirm containers may be
   native generated frames holding live child instances (recommended), or get an
   explicit instruction otherwise. This is a product decision, not an
   implementation detail.
2. Run **T002 for real** in the user's file and record the outcome in
   `tasks.md`: create one `Role=Parent` instance, attempt `appendChild` of a
   generated frame into the converted content `SLOT`, and note whether it is
   rejected, silently re-homed, or produces an `I…;…`-id sublayer. This closes
   the feasibility gate honestly.
3. If P0-3 is confirmed: change `buildDiagramFrameNode` so container roles route
   to the native container builder (`buildContainerNode`) and only leaves route
   to `buildComponentMappedNode`. Delete `populateComponentSlot` /
   `populateSlotWithRuntimeStrategy` slot-insertion. Container bodies become
   ordinary frames again; children are appended into a normal frame, so
   `getImportIndexChildren` no longer needs the `INSTANCE`→`[]` special case for
   them and the validator will see everything.
4. Harden the fake so slot insertion into a live instance either throws or
   re-parents-and-reissues the id, so the current tests turn red and prove the
   real limitation before rebuilding them.

---

### Merge recommendation

**Do not merge.** The headline capability (map every box to a live component
instance with a populated slot) is not achievable through the plugin API for
containers, the current error is a structural consequence of that, and the green
suite cannot see the failure. Path to mergeable: settle P0-3 with the user,
prove T002, adopt the leaf-instance / frame-container split, harden the fake,
let the slot tests go red and rebuild them, then re-review.

### Residual risks – acceptable vs blocking

Blocking (must resolve before merge):
- Live-slot structural insertion (P0-1).
- Validator blindness to slot content guaranteeing the error (P0-2).
- Pure-Option-B container ceiling undecided (P0-3).
- Unproven feasibility gate T002 (P1-1).
- Fake-green slot suite (P1-2).

Acceptable for the feasible slice (document, don't block):
- Container layout owned by the generator rather than the component. This is the
  correct division of responsibility, but must be written into `spec.md` so it
  is not later mistaken for an Option B regression.
- Container header fidelity carried by an embedded header-instance or by
  token-driven frame styling.

Could-not-verify (needs live Figma / MCP):
- Whether `appendChild` into a converted live `SLOT` throws or silently re-homes
  (T002).
- The exact id form the inserted node takes after slot insertion (strongly
  inferred to be `I…;…` from the error shape).
- Whether the user's `box` container variants expose any instance-swap slot at
  all (relevant only if the user rejects the recommended frame-container split).

---

## Correction – 2026-07-13 – P0-3 was wrong; SlotNode is a freeform container and Option B is reachable

I am retracting **P0-3** from the 2026-07-12 review above and the architecture
recommendation that followed from it ("containers become native generated
frames"). It was based on an incorrect belief that a live Figma slot only
accepts a single instance-swap. That is false. Verified against the official
Figma Plugin API docs on 2026-07-13:

- [`SlotNode`](https://developers.figma.com/docs/plugins/api/SlotNode/): "A
  SlotNode represents a slot within a component **or instance**. In Figma, a
  slot is a child frame of a component that has **freeform content editing**."
  `SlotNode` exposes `appendChild(child: SceneNode)`, `insertChild(...)`, and
  full auto-layout properties (`layoutMode`, `itemSpacing`, padding,
  `layoutSizingHorizontal/Vertical`). It is **not** limited to instance swaps.
- [`SlotSettings`](https://developers.figma.com/docs/plugins/api/SlotSettings/):
  `minChildren` / `maxChildren` / `allowPreferredValuesOnly` /
  `stretchChildOnInsert`. Crucially: "Edits that cause violations … **do not
  fail or cause runtime errors**"; violations surface via
  `SlotNode.limitViolations`.

Consequence: **Option B as the user scoped it is achievable** – keep every
semantic box (containers included) a live `box` instance, and put exactly one
generated auto-layout body frame into its real `SLOT`. The boxes inside stay
live instances and keep master propagation. GPT's rebuttal is correct on this
central point; my P0-3 conflated a SLOT with an instance-swap property.

What survives from the 2026-07-12 review (unchanged and still the real fault):

- **P0-1 / P0-2 mechanism of the current `missing imported frame` error stands**,
  but it is an **indexing/ordering bug**, not evidence that slots can't be
  populated. The code records a body/child id *before* it is reparented into the
  slot, and the readback refuses to descend into instances. Fix = record ids
  **after** the final `appendChild` into the `SLOT`, resolve via
  `getNodeByIdAsync`, and assert `slot.limitViolations.length === 0` instead of
  walking instance children.
- **Only ever call `appendChild` on a node whose `type === 'SLOT'`.** The earlier
  `get_children` / `I…;…` failures were ordinary instance sublayers (text
  wrappers, a plain `contents` frame), which are not slots and must never be
  structurally mutated. The authored `box` component must expose real slots
  created via `ComponentNode.createSlot` (each creates a corresponding SLOT
  component property), not frames named "contents".
- **T002 is still unproven and still the loop-breaker.** The docs strongly
  support instance-slot `appendChild`, but appending into a *live instance's*
  slot sublayer has never been run in the user's file. Run it before more code.
- **The fake model is still false-green (P1-2 / prior P0-3 / P1-4).** It cannot
  reproduce reparent-induced id change or the SLOT-vs-ordinary-sublayer
  distinction, so neither the bug nor the fix is actually covered.

Corrected recommendation: implement GPT's sequence — build the body frame, append
child instances, append the body into the live `SLOT`, then record ids and
validate via `getNodeByIdAsync` + `limitViolations`. Do **not** convert
containers to plain frames. Keep the live container instances.

### Implementation disposition – 2026-07-13

The corrected sequence is now implemented and protected by a fake-Figma
regression: moving generated content into a live `SLOT` re-keys that subtree
and can make it opaque to both global id lookup and a prior direct handle. The
importer refreshes its direct-id index only after slot insertion, uses readback
when available, and otherwise retains successful mutation-time sizing plus the
empty SlotNode `limitViolations` assertion rather than rolling back a valid
diagram. It still never descends through an ordinary instance. The remaining
unverified gate is T002 against the user's real Figma file.
