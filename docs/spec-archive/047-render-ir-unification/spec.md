# Feature Specification: Render IR unification

**Feature Branch**: `feat/047-render-ir-unification`

**Created**: 2026-06-16

**Status**: Merged to `main` and archived 2026-07-05

**Execution Gate**: Do not start implementation until spec 046 closeout bar is met

**Depends on**: spec 006, spec 044, spec 046

## Problem Statement

Preview and export still rely on multiple geometry/render paths:

- display-list IR string serialization
- legacy `svg-render.ts`
- client fresh render DOM emission
- `layout-bridge.js` incremental arrow patching
- interactive arrow waypoint DOM mutation

That split keeps producing drift. The current arrowhead regression is one example: one path used legacy `12/6` head geometry while canonical token values lived elsewhere.

This is not a sustainable architecture for a diagram system expected to scale to many engines and many preview/export lanes.

## Mission

Converge render geometry around one authoritative emitter, while preserving separate serializers for artifact SVG output and live preview DOM output.

## Product decision

The end state is **one geometry authority, two serializers**:

```text
FrameDiagram + layout
  -> display-list / render IR
    -> artifact SVG serializer
    -> preview DOM serializer
```

Fresh preview DOM output should not become the export artifact.
Export SVG should remain clean and tool-friendly, while preview DOM may include hit areas, metadata, and editor-only layers.

## Gate

This spec is intentionally parked behind spec 046.

Reason:

1. `editor.js` is still too large and still the higher-risk architectural blocker.
2. Large render convergence work would compete with the in-flight host decomposition.
3. We need a thin preview host before we rewire its render substrate.

## Scope

This spec covers:

- convergence of duplicated frame/arrow geometry emitters
- canonical arrow/token geometry sharing across all render paths
- a preview DOM serializer that consumes the same IR as export
- retirement or reduction of duplicate bridge/fresh-render geometry code

This spec does not cover:

- spec 046 editor-host closeout work
- changing YAML authoring semantics
- routing fresh-render DOM directly into export output
- draw.io serializer implementation unless a later slice explicitly adds it
- bespoke debug/diagnostic DOM such as `elk-debug-view.ts`, which is not an
  artifact or interactive diagram renderer

## Architectural position

- **Spec 046** remains the active top priority and must close first.
- **Spec 044** remains the nearby owner for bridge decomposition and browser contract cleanup.
- **Spec 047** captures the post-046 render convergence direction so the repo does not keep reintroducing parallel renderers.

## User Scenarios & Testing

### User Story 1 - Preview and export share the same geometry decisions (Priority: P1)

As a maintainer, I want arrowheads, frame geometry, and overlay placement to come from one geometry authority so preview and export cannot drift on basic shape math.

**Independent test**: the same diagram produces equivalent arrow/frame geometry in preview and export paths, with differences limited to preview-only metadata and hit targets.

### User Story 2 - Export SVG stays clean while preview stays interactive (Priority: P1)

As a user, I want exported SVG to stay artifact-clean and grouped for downstream tools, while preview DOM still supports interaction layers and editor metadata.

**Independent test**: preview output may include editor-only layers and metadata; export SVG must not.

### User Story 3 - New engines do not add new renderers (Priority: P1)

As a platform maintainer, I want future engine lanes to plug into a shared render substrate instead of creating more geometry emitters.

**Independent test**: a new engine lane integrates by producing layout data consumed by the shared IR path, not by adding a new bespoke SVG builder.

## Requirements

### Functional Requirements

- **FR-001**: Arrowhead, shaft, and frame geometry constants MUST come from shared canonical tokens or shared geometry helpers.
- **FR-002**: Preview and export render paths MUST share one geometry emitter rather than parallel hand-authored emitters.
- **FR-003**: Export SVG MUST preserve logical grouping for frames/arrows and MUST omit preview-only interaction chrome.
- **FR-004**: Preview DOM rendering MAY add hit targets, `data-*` metadata, or layer wrappers, but only in serializer-specific code.
- **FR-005**: New engine lanes MUST integrate through the shared IR/serializer contract instead of introducing new renderer-local geometry logic.

### Non-Functional Requirements

- **NFR-001**: This work MUST reduce renderer duplication, not merely rename it.
- **NFR-002**: The convergence plan SHOULD retire duplicated arrow builders in a staged way rather than attempt one unsafe cutover.
- **NFR-003**: The final design SHOULD make preview/export parity failures easier to detect with focused tests.

## Success Criteria

- **SC-001**: Arrowhead geometry cannot drift between preview full-render, bridge patch, interactive arrow edit, and export paths.
- **SC-002**: Fresh preview load and export SVG share a common geometry emitter.
- **SC-003**: Export SVG retains logical `<g>` grouping without inheriting preview-only editor chrome.
- **SC-004**: The repo can add future engine lanes without introducing another parallel renderer.

## Initial sequencing

1. Finish spec 046 first.
2. Land token/geometry hotfixes immediately when needed for user-visible regressions.
3. Converge shared arrow geometry helpers.
4. Refactor fresh preview render to consume IR rather than hand-building frame/arrow DOM.
5. Reduce or retire duplicate bridge arrow patch/render code once parity and performance are understood.

## Progress note

The start gate was satisfied on merged `main`: specs 044 and 045 are archived,
and spec 046 remains closed unless future work regresses legacy browser-shell
sinks. The live 047 slice was merged into `main` as a fast-forward on
2026-06-23 (`e7b3f65`), so the old "still on `feat/047-render-ir-unification`"
references are historical only. Shared frame-arrowhead geometry now lives in a
neutral TypeScript helper rather than in duplicated preview/export renderers,
and render parity coverage now compares arrowhead geometry plus short-segment
shaft truncation across legacy SVG and display-list serializers. The next
landed slice pushes the same convergence into frame rendering: frame box,
separator, icon, and wrapped text layout now flow through one shared frame
render plan consumed by preview patch, artifact SVG, and display-list emission,
while preview-only metadata remains owned by the preview serializer. A
follow-up slice now does the same for arrows: shaft truncation, head geometry,
authored-label placement, and display stacking order are shared across preview
DOM, legacy SVG, and display-list emission, and the remaining preview-only
metadata/layer owners are explicitly inventoried under
`render-owner-inventory.md`. The next cutover step now exists in code too:
shared display-list IR carries layer identity plus grouped text blocks,
`app-display-list-dom.ts` serializes that IR into preview DOM for frame,
overlay, and fresh-preview arrow layers, and `app-fresh-render.ts` now
consumes that path instead of hand-assembling those layers. The export side now
matches the same substrate: `svg-render.ts` is a thin wrapper over
`emitFrameDiagramDisplayList()` plus `renderDisplayListToSvg()`, including
embedded icon markup through shared IR items rather than a bespoke export loop.
The bridge/waypoint mutation lane is now explicitly bounded rather than a
renderer gap: incremental preview arrow patching remains a preview-only DOM
reuse optimization, and interactive waypoint edits still mutate DOM after the
shared geometry pass, but both consume shared arrow geometry primitives rather
than owning separate render math. Bridge frame relayout is the matching
preview-only DOM reuse path: `patchPreviewFrameGroup()` rebuilds live frame DOM
from `resolveFrameRenderPlan()` so inspector relayout can preserve preview
metadata and nodes without reserializing the full display-list IR, but it is
not a separate geometry owner. Cross-lane coverage now compares
`preview-smoke` fresh preview DOM geometry with export SVG geometry after
normalizing preview-only hit targets, layer wrappers, and metadata. At this
point the cutover bar is met: new engine lanes can enter through layout data
plus the shared IR/serializer contract without adding another bespoke
preview/export renderer.
