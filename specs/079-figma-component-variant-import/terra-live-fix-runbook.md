# Terra runbook: break the live Figma component-import error loop

## Why this is a live-Figma task

The TypeScript side has already removed the architectural causes of the earlier
moving-id failures:

- no detach fallback;
- no recursive traversal of live instance sublayers;
- slots are discovered on the master variant and reacquired on the instance by
  `I<instance-id>;<master-slot-id>`;
- title/helper text prefer component properties and otherwise use targeted
  master-id text overrides; helper visibility uses a component property and an
  icon-less node clears its real icon SlotNode when no icon property exists;
- the whole payload/component contract is checked before the first instance is
  created;
- only payload-`FIXED` axes are explicitly resized.

The remaining decisions depend on the actual `box` component and Figma's live
SlotNode behavior. Do not add another catch, stale-handle guard, generic-frame
fallback, detach path, or per-node exception before completing this runbook.

## Known baseline

- Branch: `feat/079-figma-component-variant-import`
- Figma component set: `box` (`58:3` in the current test file)
- Variants: `Role=Child`, `Role=Parent`, `Role=Section`
- Content slot: exactly one real `SLOT` named `slot` on Parent and Section
- Icon target: exactly one real non-content `SLOT` on every used variant
- Regression fixture: `diagrams/1.input/ai-infra-telecom-services-stack.yaml`
- First known contract failure: Section node `services_layer` had no exposed
  title text component property.
- Repo baseline on 2026-07-13: Figma plugin tests 41/41 and plugin build green.

The importer records generated-body and mapped-child ids only after their final
reparenting, refreshes the direct id index after a live-slot insertion, and
uses global/direct readback when Figma permits it. If Figma makes an
already-inserted descendant opaque, the successful mutation-time sizing and
empty SlotNode `limitViolations` assertion remain authoritative for that run;
the importer must not discard the diagram only because it cannot reread a live
slot descendant. The fake re-keys, hides, and invalidates such a subtree.

## 1. Prepare one reproducible run

1. Check out the branch above and preserve unrelated worktree changes.
2. Run:

   ```bash
   npm --prefix apps/figma-plugin test
   npm --prefix apps/figma-plugin run build
   npm run preview
   ```

3. In Figma Desktop, import/reload `apps/figma-plugin/manifest.json` so Figma is
   running the just-built `dist/code.js`.
4. Open the test Design file, not FigJam. Make `Page 1`, `Components`, and
   `Brand icons` available in the same file.
5. Delete prior failed test imports or use a clean page. Do not edit the master
   component while an import is running.
6. Record the first complete plugin error, including operation and node id. Do
   not patch the literal id.

Expected precondition: the plugin either reports the entire missing component
contract before creating any diagram object, or reaches SlotNode insertion. A
single missing-property error discovered after objects appear is a regression.

## 2. Author the required `box` contract in Figma

Apply the contract consistently to all variants that contain the corresponding
layer. Use Figma's **Create component property** controls; do not merely rename a
layer or rely on Dev Mode's generated React prop names.

| Surface | Required Figma authoring | Importer evidence |
|---|---|---|
| Main title | Prefer a Text component property on Child, Parent, and Section; otherwise retain exactly one identifiable title `TEXT` layer | Property reference resolves to `TEXT`, or the importer can address the one master title node directly |
| Helper/body text | Prefer a Text property wherever the layer exists; otherwise retain exactly one identifiable helper `TEXT` layer | Property reference resolves to `TEXT`, or the importer can address the one master helper node directly |
| Helper visibility | Expose the helper layer's visibility as a Boolean property | Reference resolves to a `BOOLEAN` definition |
| Icon visibility | Prefer an icon SlotNode/layer Boolean property; otherwise retain exactly one real icon SlotNode | Reference resolves to `BOOLEAN`, or the importer clears the one master-addressed icon slot for icon-less nodes |
| Content | Parent and Section each have exactly one real SlotNode named `slot` | Master-tree node type is `SLOT`; name is exactly `slot` |
| Icon | Every variant used with YAML icons has exactly one non-content SlotNode | Master-tree node type is `SLOT`; it is not named `slot` |

Use clear display names such as `Title`, `Helper text`, `Show helper`, and
`Show icon`. Generated `#...` suffixes are expected and must not be copied into
code. The importer follows each layer's property reference to the exact
definition key.

For each SlotNode, inspect its slot settings:

- `maxChildren` must allow the importer to insert one generated body/icon;
- `minChildren` must not make the cleared state invalid during replacement;
- if preferred values are enforced, the generated frame or copied icon source
  must be allowed; otherwise disable preferred-values-only for this slice;
- the slot must remain visible when it is populated.

After authoring, rerun the telecom fixture. A missing title/helper property is
not itself a failure when the variant supplies one identifiable master text
node: the importer performs a stable, non-structural `characters` override. If
preflight still fails, record the full consolidated message and inspect the
referenced layer/property in Figma. Do not add name-based special cases to
TypeScript.

## 3. Complete T002 with an atomic live SlotNode probe

Use one Parent instance before attempting the full diagram:

1. Create a fresh `Role=Parent` instance from the master.
2. Confirm its main component is still `Role=Parent`.
3. From the master Parent variant, record:
   - component id;
   - content SlotNode id and name;
   - icon SlotNode id and name.
4. Record the live instance id. Resolve each slot with
   `I<instance-id>;<master-slot-id>` through `getNodeByIdAsync`.
5. Assert each resolved node exists and has `type === "SLOT"` without walking
   `instance.children`.
6. In the content slot, remove/reset default slot content, append one generated
   auto-layout frame, and append one small child frame to that body.
7. In the icon slot, replace its default content with one copied Brand icon
   component/instance.
8. Reacquire both SlotNodes after each mutation; do not retain a slot handle
   across unrelated instance/property mutations.
9. Read back:
   - the box remains an `INSTANCE` with the same main component;
   - both targets remain `SLOT` nodes;
   - `limitViolations` is empty for both slots;
   - content has exactly one generated body;
   - icon content is a component/instance-derived node;
   - no `get_children`, `get_parent`, or stale-id error occurred.

Record the exact result in `figma-inspection-2026-07-10.md` and check T002 only
if every assertion passes. A screenshot is optional; the node types, ids,
component identity, child counts, slot violations, and error text are required.

## 4. Run the full regression fixture

Import `ai-infra-telecom-services-stack.yaml` twice. Inspect at least:

- `services_layer` (Section);
- one Parent with children;
- one Child/leaf with an icon;
- one node without helper text and one without an icon.

The second import must replace the old diagram root and preserve its canvas
position. Prove all of the following:

- every semantic box is an intact mapped component instance;
- YAML titles replace authored defaults;
- absent helper text is hidden/cleared;
- absent icons do not expose the default placeholder;
- present icons come from copied Figma component/instance sources;
- Parent/Section content contains exactly one importer-owned `:body` frame;
- every additional slot/body level corresponds to a real YAML hierarchy level;
- HUG/FILL axes were not converted to fixed pixel heights;
- component and sizing readback validators complete;
- rerun creates no duplicate diagram root, mapped instance, or slot body.

Add the observed counts and representative node ids to the inspection file,
then complete T043a, T061, T061a, and T061b only when their evidence exists.

## 5. Decision table for the next failure

| Live outcome | Owner and next action |
|---|---|
| Consolidated missing title/helper override target | Figma component contract: retain one identifiable title/helper `TEXT` layer or add a text property, then rerun. No code patch. |
| Constructed instance-slot id resolves to `null` | Importer addressing: record instance/master/actual slot ids and page-load state. Patch only `getInstanceSlotByMasterId`; add the exact case to the fake. |
| Resolved node is not `SLOT` | Figma component contract: convert the correct layer to a slot or fix ambiguous master-slot discovery. |
| `appendChild`/clear fails on a real live SlotNode | First fix slot settings and inspect `limitViolations`. If legal settings still fail, mark T002 failed and stop component-mode nesting; do not detach or fall back. Escalate the representation decision in spec 079. |
| `setProperties` succeeds but a later slot handle is stale | Importer ordering: reacquire slot handles after property mutation. Never retain or recursively rediscover instance descendants. |
| Import succeeds but a default icon remains visible | Confirm the matching icon SlotNode was resolved and cleared for an icon-less node, or that the Boolean visibility property was set false. |
| Fixed heights or duplicate body wrappers remain | Capture payload sizing plus actual layout sizing/child import ids. Patch the owning sizing/replacement algorithm, not component discovery. |

## Stop conditions

Stop and report rather than improvising if:

- T002 fails after legal SlotNode settings are confirmed;
- the user does not want to retain the visible text/icon Slot targets or expose
  the helper-visibility component property required by FR-013b;
- success would require detaching, ordinary instance-sublayer structural
  mutation, generic-frame fallback, or raw-SVG icon fallback;
- a proposed change weakens the preflight or readback validator just to let the
  import continue.

At a stop condition, update `tasks.md` and the inspection file with the exact
failed assertion and recommend either re-authoring the Figma component or
revising spec 079's target representation.
