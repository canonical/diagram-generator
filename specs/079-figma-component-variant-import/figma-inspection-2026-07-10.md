# Figma inspection outcome - 2026-07-10

## Links Requested

- Box component:
  `https://www.figma.com/design/oO0QdUZSf53hxQzBMrg54F/Diagram-generator-figma-test?node-id=58-3`
- Icon library:
  `https://www.figma.com/design/IZNSmD2orK51T7wZlaTTf1/Brand-icons---Assets-library?node-id=0-1`

## What Was Actually Visible

### First Pass

The Figma connector was attached to a different active Figma context: a FigJam
canvas named `MMD4` with root canvas `320:58`. It was not attached to the linked
Figma Design file.

Observed connector responses:

- `get_metadata` and `get_design_context` for node `58:3` were rejected because
  the active context was FigJam, not a Figma Design file.
- `get_figjam` for node `58:3` reported no such node in the active document.
- `get_figjam` without a node id returned the unrelated `MMD4` FigJam canvas.
- `get_screenshot` for node `58:3` reported no such node in the active
  document.
- Unauthenticated Figma REST requests for both file keys returned `403
  Forbidden`.

Therefore no reliable metadata was available for the user's box component
variants or icon library contents in this pass. Any exact variant names, slot
layer names, component property names, or icon component names still require
live inspection with the target Figma Design file/library active in Figma
Desktop or an authenticated Figma API path.

### Second Pass

After the user selected the master component, the connector could inspect node
`58:3`.

Observed structure:

- selected node: `58:3`, name `box`
- child variant/component nodes:
  - `58:4`, name `Role=Child`, size `287x64`
  - `58:15`, name `Role=Parent`, size `287x136`
  - `58:38`, name `Role=Section`, size `287x136`
- visible variant property from node names: `Role` with values `Child`,
  `Parent`, and `Section`
- all variants have a `contents` layer containing a `Text block` and
  `Network.svg`
- `Role=Parent` has a nested layer named `slot` at `58:26`
- `Role=Section` has a nested layer named `slot` at `58:49`
- design variables visible through the connector:
  - `color/text/root = #000000`
  - `color/text/muted = #00000099`
  - `color/text/muted/root = #636363`
  - `color/border/highlighted/root = #000000`
  - `color/background/layer2 = #f8f8f8`

The screenshot call for the selected node timed out, so this pass is structural
metadata/design-context evidence, not screenshot evidence.

The separate Brand icons library was still not inspected in this pass. The
active connector context was the box component file; unauthenticated REST access
to the icon file had already returned `403 Forbidden`.

The design file's top-level pages later visible through the connector were:

- `0:1` - `Page 1`
- `64:2` - `Brand icons`
- `58:2` - `Components`

This matters operationally: the import target page is not necessarily the same
page as the `box` component or copied icon assets. The plugin resolver must
load/search all file pages before deciding that component mode is unavailable.

### Third Pass / User-Confirmed Icon Copy

The user then copied the icon assets into the `Diagram generator figma test`
file under node `64:2`, inside sections/frames. A connector metadata pass on
`64:2` showed copied Brand icon assets as 48x48 Figma `INSTANCE` nodes named
without the `.svg` suffix, for example `AI`, `App data`, `CPU`, `Cloud`,
`Cloud with container`, `Cluster`, `Lock`, `Network`, `Networking`, `Server`,
`Storage object`, and `containers`. These names normalize to the authored YAML
icon names such as `AI.svg` and `Storage object.svg`.

Implementation consequence:

- the component-mode importer now treats the current Figma file as the icon
  source of truth for this slice
- icon sources are matched by the same normalized stable name used for YAML icon
  names
- Figma `COMPONENT` nodes can be instantiated into a component-owned icon slot
- icon-sized copied Figma `INSTANCE` nodes named with or without `.svg` can be
  cloned into a component-owned icon slot
- `.svg`-named cloneable nodes such as copied `FRAME`, `GROUP`, `VECTOR`, or
  `INSTANCE` assets can also be cloned into the component-owned icon slot
- live Figma reruns showed copied icon sources were discovered but replacement
  into the old `Network.svg` placeholder inside the live `box` instance was
  rejected; after the user converted icons to actual Figma slots, the selected
  importer strategy changed to strict `SLOT` insertion with no detach fallback
- descendants of the `box` component set and previously imported diagram
  subtrees are excluded from icon-source discovery so placeholder icons are not
  mistaken for real library assets
- missing or unapplied icons must never silently fall back to raw SVG drawing
  or leave the authored placeholder visible; the importer must either fail
  clearly or use an explicit missing-icon policy that hides/clears the icon
  slot or visibility control

## Can We Instantiate The Correct Box Variant?

Yes, for the visible `box` component, subject to plugin API readback. The
resolver should first target component set `box` and choose a variant by
`Role`:

- semantic `leaf`, `annotation`, and likely `highlight` -> `Role=Child`
- semantic `panel`/parent -> `Role=Parent`
- semantic `section` -> `Role=Section`

The plugin can instantiate the correct variant if the mapping resolver can
access the component set in one of these ways:

- the component set already exists in the current Figma file
- the component or component-set key is configured and can be imported with
  Figma's component import API
- the component has stable discoverable names/plugin-data markers in the current
  file

The implementation should not depend on transient node ids from the design URL.
It should resolve the component set by stable configured identity, inspect
`componentPropertyDefinitions`, match the desired variant properties, create an
instance, and use `InstanceNode.setProperties(...)` for supported variant,
boolean, text, and instance-swap properties.

The first resolver should support a fallback where component children are
matched by variant component names like `Role=Parent`, because that is what was
visible in connector metadata.

## Slot/Nesting Conclusion

Current Figma docs state that `InstanceNode.setProperties(...)` does not support
`SLOT` properties and throws for slot properties. Converted slots are instead
first-class `SlotNode` containers with child APIs.

After the user converted the parent/section content placeholders and icon
placeholders to actual Figma slots, the selected strategy is:

- preserve each mapped `box` as an intact live component instance
- find content insertion by a real `SLOT` named `slot`
- find icon insertion by exactly one real non-content `SLOT` in the mapped
  instance
- clear and append only inside those `SLOT` nodes
- never replace ordinary instance sublayers
- never detach as fallback

The in-repo fake Figma model now rejects structural mutation on ordinary
instance sublayers and only allows it on `SLOT` nodes. Live Figma validation is
still required before closeout; visual similarity is not enough.

## 2026-07-11 Parent Variant Design Context

After the master-slot/property implementation, a smaller connector
`get_design_context` pass on node `58:15` (`Role=Parent`) succeeded. It produced
generated component props including:

- `hasHelperText?: boolean`
- `networkSvg2?: React.ReactNode | null`
- `slot?: React.ReactNode | null`
- `role?: "Child" | "Parent"`

This supports the expected helper-visibility, icon-slot, and content-slot
contract direction, but it is not a plugin API readback of
`componentPropertyDefinitions` / `componentPropertyReferences`. The generated
code still rendered the parent title as the literal string `Parent`, so the
actual title text component property remains unverified. The importer prefers a
title/text component property but can target one identifiable master `TEXT`
layer with a non-structural `characters` override when the property is absent.

The required screenshot call for node `58:15` timed out, so this pass records
design-context metadata only.

## Can We Navigate The Icon Library Automatically?

Yes, conditionally. The plugin can automate icon selection if the icon library
is exposed through a stable mapping:

- preferred: YAML icon id -> Figma icon component key, then import by key and
  set an instance-swap property or swap an exposed nested icon instance
- acceptable for local files: YAML icon id -> stable icon component name or
  plugin-data marker, discovered from components already in the current file
- unsafe: fuzzy matching arbitrary icon layer names without a manifest

Because the original icon library file was not visible and unauthenticated REST
access was forbidden, no remote icon component keys were verified in this pass.
For the current implementation slice, the supported contract is current-file
copied icon sources named to match YAML icon names.

## Required Next Inspection Gate

Before implementation replaces the generic frame builder, open the linked
`Diagram generator figma test` design file in Figma Desktop with node `58:3`
visible or selected, and open/import the Brand icons library components needed
for automatic icon selection. Then rerun the connector inspection and record:

- component set name/key
- variant property names and values
- text/body/icon component property names, including any generated `#...`
  suffixes
- slot layer name or marker
- whether slot content can be mutated while preserving instance semantics
- icon component names/keys for every YAML icon id used by the target diagrams
