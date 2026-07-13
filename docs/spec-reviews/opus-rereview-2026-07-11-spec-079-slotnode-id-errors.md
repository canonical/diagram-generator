# Opus Re-review Prompt - Spec 079 residual Figma id errors and visual regressions

Use this prompt with a single Opus re-review pass against branch
`feat/079-figma-component-variant-import`.

Paste the completed review into:

`docs/spec-reviews/079-figma-component-variant-import.md`

Use this heading in that file:

`## Opus Re-review - 2026-07-11 - residual instance-sublayer id errors and visual regressions after SlotNode fixes`

```text
Familiarize yourself with the `diagram-generator` repo, then perform a strict
adversarial re-review of spec 079 and its Figma plugin implementation.

This is a follow-up to the prior Opus review:

- Prompt:
  `docs/spec-reviews/opus-adversarial-review-2026-07-11-spec-079.md`
- Completed review:
  `docs/spec-reviews/079-figma-component-variant-import.md`
- Original root cause found:
  the importer mutated live component-instance sublayers and detached instances
  mid-traversal while holding stale sublayer handles.

Since then, the branch attempted to adopt the user's chosen Option B:

- no detaching allowed
- parent/section content placeholders are real Figma slots
- icon placeholders are also real Figma slots
- the importer should preserve live `box` component instances
- the importer should mutate only real `SLOT` nodes
- ordinary live instance sublayers must not be structurally mutated or walked in
  ways that can trigger stale Figma handle errors

Current review target:

- Branch: `feat/079-figma-component-variant-import`
- Latest relevant commits:
  - `1994c4c fix: avoid traversing stale figma instance sublayers`
  - `36c2c2a fix: use figma slot nodes for component imports`
  - earlier stale-id/detach/swap commits visible in `git log`
- Spec package:
  - `specs/079-figma-component-variant-import/`
- Relevant implementation:
  - `apps/figma-plugin/src/code.ts`
  - `apps/figma-plugin/src/code.test.ts`
  - `apps/figma-plugin/src/dev-server.ts`
  - `apps/figma-plugin/src/dev-server.test.ts`
- Relevant docs:
  - `AGENT-INBOX.md`
  - `docs/spec-reviews/079-figma-component-variant-import.md`
  - `specs/079-figma-component-variant-import/spec.md`
  - `specs/079-figma-component-variant-import/plan.md`
  - `specs/079-figma-component-variant-import/tasks.md`
  - `specs/079-figma-component-variant-import/figma-inspection-2026-07-10.md`

Read first:

1. `AGENTS.md`
2. `AGENT-INBOX.md`
3. `docs/agent-index.md`
4. `docs/spec-reviews/079-figma-component-variant-import.md`
5. `specs/079-figma-component-variant-import/spec.md`
6. `specs/079-figma-component-variant-import/plan.md`
7. `specs/079-figma-component-variant-import/tasks.md`
8. `apps/figma-plugin/src/code.ts`
9. `apps/figma-plugin/src/code.test.ts`

Problem statement:

The branch removed explicit detach fallback and icon placeholder replacement,
and added a safe imported-node traversal that descends through `SLOT` nodes when
encountering component instances. Despite this, live Figma still reports
instance-sublayer/table-cell id errors. The recent observed shape is:

`Error: in get_children: The node (instance sublayer or table cell) with id "..."`

Concrete recent example:

`Error: in get_children: The node (instance sublayer or table cell) with id "I81:478;58:16" does not exist`

Treat this as proof that some path still reads, stores, traverses, mutates, or
validates live instance sublayers unsafely. Do not chase the literal id.

Additional visual regression evidence:

- Inspect this screenshot if it is available in the workspace:
  `H:\WSL_dev_projects\diagram-generator-worktrees\diagram-generator-yaml-drawio\image copy 2.png`
- The user also reported hardcoded-height evidence at:
  `H:\WSL_dev_projects\diagram-generator-worktrees\diagram-generator-yaml-drawio\image copy.png`
  That file may not be present locally; if unavailable, treat it as
  user-reported live Figma evidence and say it could not be visually inspected.

The screenshot evidence and user reports add these symptoms to the review:

- hardcoded heights are appearing as a new regression
- authored default helper text is visible where the YAML payload does not need
  helper text
- parent/section default placeholder icons remain visible when no resolved icon
  should be shown
- icons appear to be raw SVG recreations rather than copied Figma
  component/instance sources
- duplicate parent/section instances and repeated slot/body wrappers are
  visible; the importer appears to append generated content rather than replace
  one importer-owned generated body/container in a slot
- the user sees three nested slots where the expected maximum is one slot with
  one generated container for a parent, or section -> parent for two real YAML
  hierarchy levels

Critical constraint from the user:

- No detaching.
- Do not guess.
- If the Figma component contract is insufficient, say exactly what must be
  authored/exposed in Figma instead of silently faking the output.

Current intended architecture to audit:

- Create live `box` component instances for semantic boxes.
- Use the correct `Role=Child`, `Role=Parent`, or `Role=Section` variant.
- Find content insertion only by real `SLOT` named `slot`.
- Find icon insertion only by exactly one real non-content `SLOT`.
- Insert generated child layout only into the content `SLOT`.
- Insert copied icons only into the icon `SLOT`.
- Never mutate, remove, insert into, resize, reorder, or clear ordinary live
  instance sublayers.
- Never traverse ordinary live instance sublayers for validation/result
  indexing after a mutation if that can touch stale handles.
- Preserve Figma live component-instance semantics.

Primary question:

Why are instance-sublayer id errors still possible after commits `36c2c2a` and
`1994c4c`?

Audit these exact risk zones in `apps/figma-plugin/src/code.ts`:

1. Slot discovery:
   - `findSlotNodes`
   - `findContentSlotNode`
   - `findIconSlotNode`
   - `findDescendants`
   - `visitSceneTree`
   - `safeGetChildren`

   Determine whether discovering slots by recursively walking the live instance
   is itself unsafe after or during mutations. If it is unsafe, recommend a
   better strategy: e.g. inspect the master component once, use exposed
   instances/slot handles, require plugin-data markers, require Figma component
   properties, or another API-backed contract.

2. Text overrides:
   - `applyInstanceTextOverrides`
   - `findDescendants(instance, candidate.type === "TEXT")`

   Determine whether text override traversal is still walking ordinary live
   instance sublayers. If so, decide whether text must be set through exposed
   text component properties only, or whether sublayer text mutation can ever be
   safe.

3. Icon insertion:
   - `applyInstanceIconOverride`
   - `instantiateIconSource`
   - `clearSlotChildren`
   - `safeRemoveNode(replacement)` on failure

   Determine whether inserted icon instances/components bring their own live
   sublayers into later traversal, and whether cleanup/validation can touch
   those sublayers unsafely.

4. Content slot insertion:
   - `populateSlotWithRuntimeStrategy`
   - `populateComponentSlot`
   - `clearSlotChildren`
   - generated body frame insertion

   Determine whether clearing/appending inside a `SLOT` node is actually
   supported in live plugin API for converted slots, or whether the code has
   simply moved the illegal mutation from normal sublayers to slot sublayers.

5. Component discovery and icon discovery:
   - `collectCandidateRoots`
   - `findBoxComponentSets`
   - `collectIconSources`
   - `visitSceneTree`
   - `hasImportedAncestor`
   - `isDescendantOf`

   Determine whether these page/document traversals can walk into stale
   imported component-instance sublayers from previous failed runs or current
   selection, and whether they should prune `INSTANCE` subtrees entirely except
   for explicit top-level copied icon instances.

6. Result indexing and validation:
   - `collectImportedNodes`
   - `getImportIndexChildren`
   - `collectImportedNodesById`
   - `findImportedNode`
   - `validateImportedDiagramSizing`
   - `validateImportedComponentStructure`
   - `countImportedSubtreeNodes`

   The latest patch tries to walk only slots under instances. Confirm whether
   this is enough, or whether `findSlotNodes(instance)` still requires an
   unsafe full instance traversal that can throw `get_children`.

7. Cleanup and refresh:
   - `cleanupCreatedNodes`
   - `safeRemoveNode`
   - `findExistingImportedLeaf`
   - `findExistingImportedDiagram`
   - prior imported-root removal

   Determine whether cleanup after partial failure leaves stale handles in
   `createdNodes`, selection, or page traversal, or removes nodes in an order
   that invalidates handles still needed by validation.

8. Fake Figma model:
   - `FakeSceneNode`
   - `createInstance`
   - `cloneTree`
   - `children` getter
   - `findAll`
   - `detachInstance`
   - slot modeling

   Determine whether the fake still gives false confidence. In particular:
   - Does it allow `findAll` / recursive traversal through instance sublayers
     when live Figma would throw?
   - Does it model `SLOT` nodes inside live instances accurately?
   - Does it model converted Figma slots versus React-generated "slot props"?
   - Does it model handle invalidation after slot mutation / setProperties /
     resize / appendChild?

9. Visual/component contract regressions:
   - hardcoded heights
   - helper text visibility
   - icon slot visibility and source type
   - duplicate parent/section instances
   - repeated `slot -> body -> slot -> body` wrappers
   - refresh/reimport replacement semantics

   Determine whether the implementation sizes component instances or generated
   slot containers from authored component defaults instead of the payload's
   effective sizing. Find any `resize`, `resizeWithoutConstraints`,
   `layoutSizingHorizontal`, `layoutSizingVertical`, min/max, or hardcoded
   dimension path that can create fixed heights not present in the payload.

   Determine how helper text and icon placeholder visibility are controlled.
   If the component requires explicit boolean/text/visibility properties, say
   exactly which contract the importer needs. Default helper text or default
   icons remaining visible is a blocking correctness bug, not acceptable polish.

   Determine whether resolved icon output is truly a Figma component/instance
   source or whether the code still falls back to raw SVG/vector creation in
   component mode. If copied icon sources exist, raw SVG output is a failure.

   Determine why repeated parent/section/slot nesting appears. Audit whether
   `clearSlotChildren`, `populateComponentSlot`, import IDs, existing-root
   cleanup, and rerun refresh actually replace one importer-owned generated
   body/container, or whether they append another body inside prior generated
   content.

10. Docs/status honesty:
   - `AGENT-INBOX.md`
   - `spec.md`
   - `plan.md`
   - `tasks.md`
   - `docs/spec-reviews/079-figma-component-variant-import.md`

   Identify any overclaims that the SlotNode strategy is proven in live Figma
   when it is only proven in the fake.

Core questions to answer:

1. Is recursive traversal of a live `INSTANCE` ever acceptable in this plugin,
   even if the code only intends to find `SLOT` nodes?
2. If not, what exact replacement contract should be used to locate slots,
   text fields, and icon targets without walking ordinary instance sublayers?
3. Are real Figma converted slots mutable via `clearChildren`/`appendChild` in
   plugin code while the parent remains a live instance?
4. If real slots are mutable, how should the importer obtain stable handles to
   them without triggering stale `get_children` on sibling sublayers?
5. If real slots are not mutable enough for generated nested auto-layout, what
   exact Figma component-property/slot/instance-swap contract must the user
   author?
6. Should component mode fail before import if the selected `box` component does
   not expose all needed variation through properties/slots?
7. Which remaining code path can produce `I...;58:16` specifically? Infer from
   the component metadata if useful: `58:16` was previously the Parent variant's
   `contents` sublayer.
8. What is the smallest next fix that stops the id-error loop without
   reintroducing detach or generic-frame fallback?
9. What live-Figma probe must be run before claiming merge readiness?
10. What tests must turn red first, and how should the fake be hardened so this
    failure class cannot stay fake-green?
11. Where are hardcoded heights introduced, and how should live readback prove
    mapped instances and generated slot containers still match payload
    Fill/Hug/Fixed?
12. What component properties, slot operations, or visibility controls are
    required to hide unused helper text and placeholder icons without detaching?
13. Why would copied icon sources be discovered but output still look like raw
    SVG nodes, and what code/test should prove component/instance icon output?
14. Why can a rerun or nested parent create repeated slots/bodies, and what is
    the exact replace-not-append algorithm for importer-owned slot content?
15. Does the authored `box` component expose enough contract surface for Option
    B, or must the user add/rename properties/slots before implementation can
    be correct?

Review stance:

- Be adversarial.
- Do not assume `SLOT` means all descendant traversal is safe.
- Do not accept broad try/catch wrappers as a root fix.
- Do not accept "ignore stale handles" if the code still depends on traversing
  those handles.
- Do not accept visual correctness if Figma output is detached, generic, or
  silently missing component slots/icons.
- Do not accept visible default helper text, visible default placeholder icons,
  hardcoded heights, raw-SVG icon fallback, or duplicate generated slot bodies
  as acceptable intermediate states for merge readiness.
- Do not recommend more per-id patches.
- Do not recommend detaching; the user explicitly forbids it.
- If the current Option B cannot work with the component as authored, say so
  directly and specify the required Figma component contract.

Deliverable format:

- Findings first, ordered by severity.
- Each finding must include:
  - severity (`P0`, `P1`, `P2`, or `P3`)
  - file path(s)
  - exact reason it is a real problem
  - likely user or maintainer impact
  - concrete recommended fix
- Then include:
  - `Root-cause diagnosis`
  - `Current SlotNode strategy verdict`
  - `Remaining unsafe traversal map`
  - `Required Figma component contract`
  - `Visual regression verdict`
  - `What to stop doing`
  - `What to implement next`
  - `Tests that must be added or changed`
  - `Status honesty check`
  - `Merge recommendation`
  - `Residual risks acceptable vs blocking`

If live Figma/MCP inspection is unavailable, say exactly what could not be
verified and base the review on code plus the live error sequence above.

Paste the completed review into:

`docs/spec-reviews/079-figma-component-variant-import.md`

under:

`## Opus Re-review - 2026-07-11 - residual instance-sublayer id errors and visual regressions after SlotNode fixes`
```
