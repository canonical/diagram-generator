# ELK option discoverability audit

Date: 2026-07-11

T044 is implemented as a code-backed audit, not a prose-only checklist.

## Source of truth

- Local `elkjs` metadata: `new ELK().knownLayoutAlgorithms()`
- Repo classification: `packages/graph-layout-elk/src/elk-option-audit.ts`
- Registry/UI bridge: `packages/layout-engine/tests/preview-engine-graph-control-inventory.test.ts`

## Current enabled-algorithm inventory

| Algorithm | elkjs options | Authorable + exposed | Other classified |
|---|---:|---:|---:|
| `org.eclipse.elk.layered` | 143 | 43 | 100 |
| `org.eclipse.elk.force` | 26 | 11 | 15 |
| `org.eclipse.elk.stress` | 13 | 5 | 8 |
| `org.eclipse.elk.mrtree` | 29 | 10 | 19 |
| `org.eclipse.elk.radial` | 20 | 12 | 8 |
| `org.eclipse.elk.rectpacking` | 26 | 12 | 14 |

Every enabled-algorithm option is now classified as one of:

- `authorable-and-exposed`
- `implementation-owned`
- `invalid-for-current-ir`
- `unsafe-or-too-low-level`
- `unsupported-by-elkjs`
- `needs-follow-up`

Every `authorable-and-exposed` option must have a typed registry spec with label,
group, description, default, and numeric bounds or enum values. The preview engine
inventory test proves registry specs are surfaced through the layout-params UI.

## Newly exposed in this pass

Layered now exposes additional safe graph-level controls for component splitting,
aspect/randomness, component/self-loop/base spacing, edge-node spacing between
layers, high-degree fan-out treatment, compaction, thoroughness, greedy-switch
threshold, hierarchical sweepiness, node-placement dampening, node-promotion
iterations, and model-order crossing weights.

Force now exposes edge-label spacing, inline edge-label mode, and repulsive power.

## Explicit non-exposure

Topdown sizing options remain `needs-follow-up`. They are the relevant ELK family
for same-size hierarchical nodes, but they require dedicated IR/viewer handling
(`topdownLayout`, node types, fixed graph size, scale factors) rather than a raw
checkbox in the generic layout-params pane.

Implementation-owned keys such as `padding`, `edgeRouting`, `portConstraints`,
`nodeSize.*`, node/port-label placement, positions, margins, and edge thickness
remain non-authorable because exposing them would bypass renderer and graph-builder
geometry invariants.

## Validation

- `npm --prefix packages/graph-layout-elk test` => 74/74
- `npm --prefix packages/layout-engine test -- preview-engine-elk-runtime.test.ts preview-engine-graph-control-inventory.test.ts preview-engine-registry.test.ts browser-entry-contract.test.ts` => 57/57
- `node --import tsx --test src/persistence/frame-diagram.test.ts` from `apps/preview/` => 49/49
