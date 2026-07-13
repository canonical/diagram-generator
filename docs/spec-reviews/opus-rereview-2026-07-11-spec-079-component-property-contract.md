# Opus Re-review Prompt - Spec 079 component-property contract failure

Use this prompt with a single Opus re-review pass against branch
`feat/079-figma-component-variant-import`.

Paste the completed review into:

`docs/spec-reviews/079-figma-component-variant-import.md`

Use this heading in that file:

`## Opus Re-review - 2026-07-11 - component-property contract failure for Section title`

```text
Familiarize yourself with the `diagram-generator` repo, then perform a strict
adversarial re-review of spec 079 and its Figma plugin implementation.

This is not a broad review from scratch. Focus on the latest live Figma failure
after the master-slot/component-property implementation:

`Error: Mapped component Role=Section for services_layer must expose a title/text component property; refusing to edit live instance sublayers.`

The user correctly reports that we may be back in a per-error patch loop. Your
job is to decide whether this latest failure is:

1. A correct hard stop because the authored Figma `box` component is missing a
   required title text property.
2. An importer bug because the current component-property contract is too
   strict or incorrectly discovered.
3. A sign that Option B needs a different Figma authoring contract or
   implementation strategy.

Do not recommend sublayer mutation or detach. The user explicitly forbids
detaching, and ordinary live instance sublayer traversal/mutation already caused
the previous `get_children` failures.

Current review target:

- Branch: `feat/079-figma-component-variant-import`
- Relevant implementation:
  - `apps/figma-plugin/src/code.ts`
  - `apps/figma-plugin/src/code.test.ts`
  - `apps/figma-plugin/README.md`
- Relevant docs:
  - `AGENT-INBOX.md`
  - `docs/spec-reviews/079-figma-component-variant-import.md`
  - `docs/spec-reviews/opus-rereview-2026-07-11-spec-079-slotnode-id-errors.md`
  - `specs/079-figma-component-variant-import/spec.md`
  - `specs/079-figma-component-variant-import/plan.md`
  - `specs/079-figma-component-variant-import/tasks.md`
  - `specs/079-figma-component-variant-import/figma-inspection-2026-07-10.md`

Recent implementation summary:

- Removed `findSlotNodes` / `findContentSlotNode` / `findIconSlotNode`.
- Slot discovery now inspects the master component and addresses instance slots
  by `I<instanceId>;<masterSlotId>`.
- Text/helper/icon visibility now goes through component properties only.
- The importer refuses to edit live instance text/icon sublayers.
- The fake now throws when ordinary instance sublayer `.children` is read.
- The fake now throws if code reads `componentPropertyDefinitions` from a
  variant component; definitions must come from the component set.
- Last in-repo validation after the previous patch:
  - `npm --prefix apps/figma-plugin test` -> 37/37
  - `npm --prefix apps/figma-plugin run build` -> pass
  - broader layout/preview/Python checks were previously green before this
    latest live Figma error.

Known live/design evidence:

- Figma metadata for node `58:3` showed component set `box` with variants:
  `Role=Child`, `Role=Parent`, `Role=Section`.
- `get_design_context` for `Role=Parent` exposed generated props including
  `hasHelperText`, `networkSvg2`, and `slot`, but the visible title was rendered
  as the literal string `Parent`, not obviously as a title component property.
- The current live error is for `Role=Section` and semantic node
  `services_layer`, which needs the YAML title to replace the authored default
  section title.

Read first:

1. `AGENTS.md`
2. `AGENT-INBOX.md`
3. `docs/agent-index.md`
4. `docs/spec-reviews/079-figma-component-variant-import.md`
5. `specs/079-figma-component-variant-import/spec.md`
6. `apps/figma-plugin/src/code.ts`
7. `apps/figma-plugin/src/code.test.ts`

Primary questions:

1. Is the latest error the correct behavior for a component missing a title text
   property, or should the importer support this authored component another way?
2. Does Option B require every `box` variant to expose a text property for the
   main title? If yes, state that directly and give exact Figma authoring
   instructions.
3. If the main title is not exposed as a component property, is there any legal
   Figma plugin API path to set it while preserving a live instance and avoiding
   ordinary sublayer mutation? Do not guess; cite docs or mark NEEDS LIVE.
4. Is the importer discovering text properties correctly from
   `componentPropertyReferences.characters` on the master component tree, or is
   it missing a legitimate property shape/name that Figma uses?
5. Should the importer preflight the entire `box` contract before creating any
   imported nodes, instead of failing mid-import at `services_layer`?
6. Are `hasHelperText`, `networkSvg2`, and `slot` from design-context code
   evidence of real plugin component properties, React-code slots only, or
   insufficient evidence?
7. Is addressing instance slots by `I<instanceId>;<masterSlotId>` a supported
   and durable plugin strategy, or another brittle assumption that needs a live
   probe / different API?
8. Does the current fake still encode assumptions that live Figma rejects?
9. What exact live Figma probe should be run next before any more code changes?
10. What is the smallest next action that breaks the loop without faking output?

Audit these code areas:

1. Component-property discovery:
   - `safeGetComponentPropertyDefinitions`
   - `getComponentPropertyDefinitions`
   - `getComponentPropertyReferences`
   - `getReferencedProperty`
   - `analyzeBoxComponentContract`

   Check whether title, helper text, helper visibility, icon visibility, and
   icon/slot properties are discovered from the correct Figma objects. Confirm
   that reading the master component tree is acceptable while reading live
   instance sublayers is not.

2. Component contract enforcement:
   - `requireComponentProperty`
   - `getPayloadTextValues`
   - `applyInstanceComponentProperties`
   - `buildComponentMappedNode`

   Decide whether title should be required for every semantic node with payload
   text. If yes, should the requirement be validated once up front for each
   variant rather than at the first node using that role?

3. Slot addressing:
   - `getInstanceSublayerId`
   - `getInstanceSlotByMasterId`
   - `applyInstanceIconOverride`
   - `populateSlotWithRuntimeStrategy`

   Determine whether constructing `I<instanceId>;<masterSlotId>` is an
   acceptable strategy in real Figma plugin code. If not, identify the correct
   API-backed approach or required Figma authoring contract.

4. Fake Figma model:
   - `FakeSceneNode.componentPropertyDefinitions`
   - `FakeSceneNode.componentPropertyReferences`
   - `FakeSceneNode.setProperties`
   - `FakeFigma.getNodeById`
   - instance sublayer id modeling

   Identify any fake-green risks. The fake should reject the exact classes of
   live Figma failures we are seeing, not normalize them away.

5. Docs/status honesty:
   - `AGENT-INBOX.md`
   - `spec.md`
   - `plan.md`
   - `tasks.md`
   - `README.md`

   Make sure docs say clearly whether the current branch requires the user to
   expose title/helper/icon properties in Figma before import can succeed.

Required Figma component contract to validate or revise:

- Variant `Role=Child`, `Role=Parent`, and `Role=Section`.
- Main title text is exposed as a text component property on every variant.
- Helper/body text is exposed as a text component property where helper/body
  text exists.
- Helper visibility is exposed as a boolean component property.
- Icon visibility is exposed as a boolean component property.
- Icon slot/source replacement is either a real mutable `SLOT` proven by T002
  or a different explicit instance-swap/property contract.
- Parent/Section content slot is a real `SLOT` named `slot`, and T002 proves
  generated child layout insertion into that slot is legal on a live instance.

Review stance:

- Be adversarial.
- Do not propose another per-error patch unless it follows from a clear
  architectural decision.
- Do not recommend detaching.
- Do not recommend walking or mutating ordinary live instance sublayers.
- Do not accept "it passes the fake" as evidence.
- Do not ask GPT to guess component-property names; either discover them safely,
  require the user to author/expose them, or fail clearly.
- If the authored Figma component is insufficient for Option B, say exactly what
  the user must change in Figma.

Deliverable format:

- Findings first, ordered by severity.
- Each finding must include:
  - severity (`P0`, `P1`, `P2`, or `P3`)
  - file path(s)
  - exact reason it is a real problem
  - likely user or maintainer impact
  - concrete recommended fix or Figma authoring change
- Then include:
  - `Root-cause diagnosis`
  - `Is the latest error correct?`
  - `Required Figma authoring changes`
  - `Importer changes, if any`
  - `Preflight contract recommendation`
  - `Fake Figma hardening gaps`
  - `Live probe required next`
  - `What to stop doing`
  - `What to implement next`
  - `Tests that must be added or changed`
  - `Merge recommendation`

If live Figma/MCP inspection is unavailable, say exactly what could not be
verified and base the review on code plus the live error sequence above.

Paste the completed review into:

`docs/spec-reviews/079-figma-component-variant-import.md`

under:

`## Opus Re-review - 2026-07-11 - component-property contract failure for Section title`
```
