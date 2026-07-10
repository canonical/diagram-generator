# Implementation Plan: Spec 079 Figma component variant import

**Branch**: `feat/079-figma-component-variant-import`
**Spec**: [`spec.md`](spec.md)
**Status**: Draft

## Technical Context

Spec 078 already owns the hard part of translating diagram-generator YAML into a
Figma-legal effective auto-layout payload. Spec 079 should keep that payload and
validator path, then replace the generic box construction strategy with a
component-mapping strategy.

Current plugin facts:

- UI has two hardcoded actions: sample leaf and telecom diagram.
- Main code fetches `/api/sample-leaf` or `/api/frame-diagram?slug=...`.
- The server reads slug-based YAML from `scripts/diagrams/frames/`.
- Import creates plugin-authored frames, text, rectangles, and SVG icon nodes.
- Readback validation already proves effective Fill/Hug/Fixed sizing.

The new work should keep layout authority in the local Node server and keep
Figma-specific document mutation in the plugin main context.

## Design Direction

1. Replace the demo UI with a selected-file import workflow.
   - Primary control: **Select YAML to import**.
   - Use `showOpenFilePicker()` where available.
   - Provide `<input type="file" accept=".yaml,.yml">` fallback because the file
     picker API is not baseline.
   - Send raw YAML text and source filename to the plugin main context.

2. Add a server endpoint for arbitrary YAML.
   - Accept raw YAML text over localhost.
   - Load via `loadFrameYamlFromString`.
   - Run the same resolve/layout/effective-sizing serialization as slug import.
   - Include source metadata in the payload so import IDs are stable enough for
     refresh. If no durable path exists, derive a content hash plus filename.

3. Introduce an explicit component mapping contract.
   - Do not map by transient node ID alone.
   - Prefer stable component-set names, variant/property names, component keys,
     or plugin-data markers.
   - First slice can require components to exist in the current Figma file.
   - Add an inspectable manifest and a validator that reports missing or
     ambiguous mappings before creating nodes.

4. Prove the slot strategy before broad implementation.
   - Figma docs say `InstanceNode.setProperties()` cannot set `SLOT`
     properties.
   - Run a live Figma probe against the user's component variants.
   - Decide one explicit strategy:
     - intact instance with mutable named child slot, if Figma allows it
     - detach-for-slot with documented loss of instance linkage
     - wrapper-slot where the instance and generated child layout are siblings
       inside an owning frame
     - another proven strategy that keeps readback verifiable
   - Record the result before marking implementation closeout-ready.

5. Build mapped instances and generated slot containers.
   - Resolve component/variant for each semantic node.
   - Instantiate, set component properties, text/icon overrides, and stable
     import plugin data.
   - Insert one generated slot container for children.
   - Slot container direction comes from payload body/layout direction.
   - Slot container sizing uses the spec 078 effective sizing rules.

6. Extend validation.
   - Keep existing Fill/Hug/Fixed readback checks.
   - Add component identity and property readback.
   - Add slot existence, direction, child order, and generated-subtree checks.
   - Negative tests must fail for missing mapping, ambiguous mapping, and wrong
     slot direction.

## Phases

### Phase 0 - Component and Slot Probe

Goal: avoid committing to an impossible Figma slot architecture.

Deliverables:

- A short findings file or validation section recording the user's component
  set names, expected variants, slot marker, and live mutation result.
- A minimal live or fake-Figma probe that proves the chosen slot approach.
- A decision on whether mapped imports preserve intact instances or intentionally
  detach/wrap for nested content.

### Phase 1 - Arbitrary YAML Payloads

Goal: remove hardcoded telecom/sample import from the production path.

Deliverables:

- `ui.html` selected-file workflow.
- New local server endpoint for raw YAML payload creation.
- Tests proving two different YAML inputs create valid frame-diagram payloads.
- Existing slug endpoint may remain for tests/debug, but the UI should no
  longer present sample-specific buttons.

### Phase 2 - Component Mapping

Goal: resolve semantic nodes to user-authored component variants explicitly.

Deliverables:

- Mapping manifest/schema.
- Resolver that finds component sets in the current file and validates variant
  properties.
- Negative tests for absent, duplicated, and unmapped components.
- User-visible report before import if mapping is incomplete.

### Phase 3 - Slot-Based Nesting

Goal: preserve nested graph structure inside component slots.

Deliverables:

- Slot target discovery by stable marker/name/property.
- Generated slot container with horizontal/vertical auto-layout.
- Recursive import that places mapped children inside the slot container.
- Readback validation for slot direction, child order, and sizing.

### Phase 4 - Refresh and Override Ownership

Goal: rerun imports without destroying user-owned Figma component overrides.

Deliverables:

- Import ID scheme for selected YAML sessions.
- Owned versus user-owned property list in the mapping contract.
- Refresh tests for updated YAML and preserved user-owned property.

### Phase 5 - Closeout

Goal: prove component-variant import works honestly.

Deliverables:

- In-repo tests for payload, resolver, slot, refresh, and validator behavior.
- Live Figma validation notes with screenshots optional only if the user asks.
- Spec docs updated with actual component/slot decision and residual risks.
- Adversarial review prompt focused on slot feasibility and no-silent-fallback.

## Risks

- Figma may not permit inserting children into the desired component slot while
  preserving instance semantics.
- Component property names for text/boolean/instance-swap controls can include
  generated suffixes, so matching by display name alone may be ambiguous.
- Remote library components may be inaccessible unless imported by key; first
  slice should require local components in the open file.
- A generic fallback frame path could hide mapping failures. Tests and readback
  must prove when component instances are expected.
- File picker behavior may differ between Figma Desktop and browser; fallback
  input is required.

## Validation Gates

- `npm --prefix apps/figma-plugin test`
- `npm --prefix apps/figma-plugin run build`
- `npm --prefix packages/layout-engine test`
- `node scripts/check-browser-bundle-fresh.mjs` if layout-engine browser
  exports change
- `node scripts/check_no_new_python.mjs`
- Live Figma validation against the user's component variants before closeout
