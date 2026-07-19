# Quickstart: Target Round-Trip Workflow

This describes the intended workflow; it is not implemented yet.

## Import and finish

1. Start the Figma local service and plugin.
2. Choose **Select YAML to import**.
3. Select or associate canonical YAML.
4. Complete supported layout refinements and Figma-only finishing.

The import records a baseline. Do not detach managed components or remove stable
identity if automatic update is expected.

## Update

1. Choose **Update YAML from Figma**.
2. Select current YAML if no safe source receipt exists.
3. Review supported operations, preserved concurrent YAML changes, conflicts,
   Figma-only finishing, validation, and write mode.
4. Resolve every conflict and confirm.

The plugin writes only through a permitted handle or guarded repo receipt.
Otherwise it downloads `<name>.figma-updated.yaml`.

After in-place update, the service reads YAML back, lays it out, compares
supported state, and stores the new baseline. Reimport should preserve accepted
changes.

## Conflict example

- Baseline gap: `24`
- Current YAML gap: `32`
- Current Figma gap: `16`

This conflicts. Choose explicitly or cancel.

## Initial boundary

V1 covers direction, gap, padding, legal sizing/fixed dimensions, direct child
order, and eligible absolute positions. Text/icon/variant changes follow stable
component-property identity. Waypoints follow stable arrow IDs. ELK changes
remain unsupported until an engine-specific mapping is proven.
