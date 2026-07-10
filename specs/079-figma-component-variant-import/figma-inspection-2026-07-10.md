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

### Third Pass / User-Confirmed Icon Copy

The user then copied the icon assets into the `Diagram generator figma test`
file under node `64:2`, inside frames/folders, with names matching the project
icon names. A broad connector metadata query for `64:2` was too large to use as
reliable recorded evidence, so this file does not claim exact live tree
metadata for every copied icon.

Implementation consequence:

- the component-mode importer now treats the current Figma file as the icon
  source of truth for this slice
- icon sources are matched by the same normalized stable name used for YAML icon
  names
- Figma `COMPONENT` nodes can be used for native icon instance swaps
- `.svg`-named cloneable nodes such as copied `FRAME`, `GROUP`, `VECTOR`, or
  `INSTANCE` assets can be cloned into the box icon position
- descendants of the `box` component set and previously imported diagram
  subtrees are excluded from icon-source discovery so placeholder icons are not
  mistaken for real library assets
- missing or unapplied icons remain hard failures rather than silently falling
  back to raw SVG drawing

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

The slot strategy still needs a live probe. Current Figma docs state that
`InstanceNode.setProperties(...)` does not support `SLOT` properties and throws
for slot properties. That means the importer must not assume it can populate a
Figma component slot by setting a slot component property.

The next branch must prove one concrete strategy against the user's actual box
component:

- preserve an intact instance and mutate a discoverable nested slot target, if
  Figma allows that operation
- detach the instance before inserting generated child layout, with the loss of
  component-instance linkage documented
- wrap the component instance and generated child auto-layout container in a
  plugin-owned frame, if intact slot mutation is not possible
- use another explicitly proven strategy

The readback validator must record which strategy was used; visual similarity is
not enough.

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
