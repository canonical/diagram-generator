# Opus Adversarial Review Prompt - Spec 079 Figma component variant import

Use this prompt with a single Opus review pass against branch
`feat/079-figma-component-variant-import`.

Paste the completed review into:

`docs/spec-reviews/079-figma-component-variant-import.md`

Use this heading in that file:

`## Opus Review - 2026-07-11 - component instance stale-handle architecture`

```text
Familiarize yourself with the `diagram-generator` repo, then perform a strict
adversarial review of spec 079 and its Figma plugin implementation.

This is not a normal code review and not a request to patch the next thrown
node id. Treat the last several failures as evidence of an architectural
problem until proven otherwise.

Current review target:
- Branch: `feat/079-figma-component-variant-import`
- Spec package: `specs/079-figma-component-variant-import/`
- Relevant implementation:
  - `apps/figma-plugin/src/code.ts`
  - `apps/figma-plugin/src/code.test.ts`
  - `apps/figma-plugin/src/dev-server.ts`
  - `apps/figma-plugin/src/dev-server.test.ts`
- Prior spec context:
  - `docs/spec-reviews/078-figma-autolayout-plugin.md`
  - `docs/spec-archive/078-figma-autolayout-plugin/`

Read first:
- `AGENTS.md`
- `AGENT-INBOX.md`
- `docs/agent-index.md`
- `docs/specs.md`
- `specs/079-figma-component-variant-import/spec.md`
- `specs/079-figma-component-variant-import/plan.md`
- `specs/079-figma-component-variant-import/tasks.md`
- `specs/079-figma-component-variant-import/figma-inspection-2026-07-10.md`
- `apps/figma-plugin/src/code.ts`
- `apps/figma-plugin/src/code.test.ts`

Problem statement:
Spec 079 is trying to import arbitrary YAML diagrams into Figma using a human
authored `box` component set plus copied Brand icon assets. The current branch
has repeatedly patched individual Figma node-handle failures instead of proving
the component-instance strategy is sound.

Observed live Figma failures so far:
- `Error: Found 8 candidate "box" component sets ...` when imported instances
  were mistaken for master component sets.
- `Error: in get_parent: The node with id "70:864" does not exist`
- `Error: in get_parent: The node with id "71:6243" does not exist`
- Missing icons even though copied Brand icons were present.
- Later diagnostic proved icon discovery was correct:
  `143 current-file icon sources discovered`, including `AI`, `App data`,
  `Cloud`, `Server`, etc.
- Then icon application failed because Figma rejected replacement inside the
  live `box` instance's `Network.svg` placeholder.
- The branch added a fallback that detaches affected boxes for icon replacement.
- Then live Figma failed with:
  `Error: in get_name: The node with id "75:465" does not exist`
- The branch patched stale name reads after detach.
- Current live failure is:
  `Error: in get_children: The node (instance sublayer or table cell) with id "I76:555;58:16" does not exist`

Review stance:
Assume the issue is not the literal ids. Assume the real problem may be that the
plugin is traversing or mutating Figma component instance sublayers as if they
were stable scene nodes. Determine whether the current approach violates Figma
plugin API constraints around instance sublayers, detach, nested component
targets, component properties, or stale handles.

Core questions to answer:
1. Is it architecturally valid to traverse live component instance sublayers,
   keep references to them, then mutate/detach/remove nearby nodes during the
   same import?
2. Are instance sublayer handles fundamentally ephemeral in this workflow?
   If yes, what rule should the implementation follow instead?
3. Should the importer detach every imported `box` instance up front whenever it
   needs to change text, icons, slot children, layout, or sizing?
4. Should native component instances be used only when all required variation is
   expressed through component properties / exposed nested instance swaps?
5. Is the current hybrid strategy - instantiate, traverse internals, try swap,
   try replace, detach only on failure - defensible, or is it why stale
   `get_parent` / `get_name` / `get_children` errors keep moving around?
6. Does Figma support reliably replacing the `Network.svg` placeholder in the
   user's component without detaching? If yes, what exact API shape should be
   used? If no, say so directly.
7. Is `findFirstDescendant(instance, ...)` over live instance internals a bug?
   Should it only run after detach, or only against master components, or not at
   all?
8. Is using copied icon instances from the current file viable? Should the
   importer resolve their main component keys and use `swapComponent`, clone
   them, detach them, or require a manifest?
9. Is the fake Figma test model currently giving false confidence? Identify
   concrete API behaviors it fails to model.
10. What would be the simplest robust architecture that stops chasing stale
    Figma handles?

Specific code paths to inspect:
- Component discovery:
  - `loadDocumentPagesForMapping`
  - `findBoxComponentSets`
  - `collectCandidateRoots`
  - `visitSceneTree`
- Icon discovery:
  - `normalizeIconName`
  - `collectIconSources`
  - `isCopiedIconInstanceSource`
  - `formatIconSourceSummary`
- Component instance construction:
  - `buildComponentMappedNode`
  - `applyInstanceTextOverrides`
  - `applyInstanceIconOverride`
  - `findIconTarget`
  - `replaceIconTarget`
  - `trySwapIconComponent`
  - `resolveIconComponentFromInstance`
- Slot mutation / detach:
  - `populateSlotWithRuntimeStrategy`
  - `populateComponentSlot`
  - `detachMappedComponentInstance`
  - `clearChildren`
- Stale-handle guards:
  - `isNodeAvailable`
  - `safeGetNodeName`
  - `safeGetChildren`
  - `safeGetParent`
  - `safeRemoveNode`
  - `getImportData`
- Validation:
  - `validateImportedComponentStructure`
  - `validateImportedDiagramSizing`

Review goals:
1. Identify the root architectural cause of the moving stale-node errors.
2. Decide whether spec 079 should continue with native component instances,
   detach-first component clones, generic Figma frames, or a stricter component
   property contract.
3. Separate "must fix now" from "future component ergonomics".
4. Flag any overclaims in `AGENT-INBOX.md`, `spec.md`, `plan.md`, or `tasks.md`.
5. Identify tests that are fake-green because fake Figma does not model real
   instance sublayer invalidation.
6. Recommend the minimum next implementation slice that can be honestly tested.

Important constraints:
- Do not recommend chasing the next thrown id.
- Do not accept broad `try/catch` wrappers as a root fix.
- Do not accept silent fallback to raw SVG icons or generic frames unless the
  spec explicitly changes and the user-facing tradeoff is documented.
- Do not assume a live Figma instance sublayer behaves like a normal page node.
- Do not trust green tests unless they model the Figma behavior that caused the
  live failure.
- Preserve the user goal: imported Figma output should match the preview YAML
  layout and use the user's component variants/icons where technically viable.

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
  - `Architecture recommendation`
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
`## Opus Review - 2026-07-11 - component instance stale-handle architecture`
```
