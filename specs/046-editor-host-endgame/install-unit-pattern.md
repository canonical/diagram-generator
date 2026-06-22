# Preview Engine Install-Unit Pattern

Spec 046 needs one durable answer to:

> Where does a new engine package start?

The answer is an install unit, not a list of central files.

This pattern is necessary for closeout, but it is not sufficient by itself.
Spec 046 still requires one foreign-shaped skeletal proof such as Mermaid-lite,
D2-lite, or Dagre-lite that uses this pattern without reopening central sinks.

## Required install-unit shape

An engine or document-family package should contribute only the pieces it
actually owns:

1. `preview-engine` manifest registration
2. frame render adapter registration when it owns a frame-family renderer
3. preview-document SVG renderer registration when it owns a non-frame document
   family
4. optional preview-host module registration when it needs viewer/API routes
5. optional browser shell/controller glue when it reuses an existing shell tier
6. focused tests that prove the package installs through those seams

Those pieces map to the current durable seams:

| Concern | Durable seam |
|--------|--------------|
| Engine identity, shell tier, capabilities, scripts | `packages/layout-engine/src/preview-engine/registry.ts` via `registerPreviewEngine(...)` |
| Frame render/export ownership | `packages/layout-engine/src/preview-engine/render.ts` via `registerPreviewFrameDiagramRenderAdapter(...)` |
| Non-frame document render/export ownership | `packages/layout-engine/src/preview-engine/render.ts` via `registerPreviewDocumentSvgRenderer(...)` |
| Viewer/API installation | `apps/preview/src/preview-host/modules.ts` via `registerPreviewHostModule(...)` |
| Browser shell behavior | engine-local controller/runtime exported through `preview-engine` or thin JS wrappers that delegate immediately to typed owners |

## What must not be part of onboarding

A new install unit must not begin by editing:

- `scripts/preview/editor.js`
- `scripts/preview/layout-bridge.js`
- `apps/preview/src/server.ts`
- central `save/spec/export` branching
- central viewer-page mode switches

If onboarding starts there, 046 still fails.

## Current builtin examples

| Family | Install-unit evidence |
|--------|-----------------------|
| `v3` | manifest only; reuses shared frame-native render path and shared autolayout host lane |
| `elk-layered` | manifest + frame render adapter + engine-local shell controller/layout-controls wrappers |
| `force` | manifest + force-specific host module/routes + force render/save/spec flows |
| `sequence` | manifest + non-frame document renderer + shared autolayout host lane + real host/browser proof |
| `mindmap-lite` | manifest + non-frame document renderer + frame-YAML document-kind handler + shared autolayout host lane + custom save namespace + SVG export + browser refresh/load proof |

The important part is not that every builtin has identical pieces. The
important part is that each builtin fits the same registration model instead of
teaching contributors to widen central sinks.

Current limitation:

- the builtin examples are still close to the current platform's native shapes
- `mindmap-lite` now proves document-family detection/resolution closure and a
  foreign-shaped install unit through typed seams
- the remaining blocker is no longer install-unit absence; it is the large
  TypeScript barrel/harness surface plus the ELK-shaped algorithm substrate

## Validation standard

The install-unit pattern is only real if it is locked by tests.

Current proof points:

- `packages/layout-engine/tests/preview-engine-registry.test.ts`
- `packages/layout-engine/tests/preview-engine-render.test.ts`
- `apps/preview/src/persistence/preview-host-contract.test.ts`
- `apps/preview/src/persistence/mindmap-lite-install-unit.test.ts`

Minimum expectation for a future engine package:

1. one test that registers its manifest/renderer through the shared registries
2. one host test if it owns viewer/API routes
3. one browser-shell test if it owns panel/debug/controller behavior
4. one end-to-end proof if it owns a foreign-shaped document family or
   algorithm family

## 046 closeout implication

T044 is only satisfied when a reviewer can answer:

1. where does a new engine start?
   Answer: one install-unit pattern
2. where does it not start?
   Answer: not `editor.js`, `layout-bridge.js`, or central preview-host branching

That foreign-shaped proof now exists as `mindmap-lite`.

Spec 046 still remains open because the large TypeScript barrel/harness surfaces
and the ELK-shaped substrate remain unfinished.
