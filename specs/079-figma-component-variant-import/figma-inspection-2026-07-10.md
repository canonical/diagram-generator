# Figma inspection outcome - 2026-07-10

## Links Requested

- Box component:
  `https://www.figma.com/design/oO0QdUZSf53hxQzBMrg54F/Diagram-generator-figma-test?node-id=58-3`
- Icon library:
  `https://www.figma.com/design/IZNSmD2orK51T7wZlaTTf1/Brand-icons---Assets-library?node-id=0-1`

## What Was Actually Visible

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

## Can We Instantiate The Correct Box Variant?

Yes, conditionally. The plugin can instantiate the correct variant if the
mapping resolver can access the component set in one of these ways:

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

The exact mapping cannot be written yet because node `58:3` was not visible to
the connector.

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

Because the icon library file was not visible and unauthenticated REST access
was forbidden, no icon names, component keys, or grouping structure were
verified in this pass.

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
