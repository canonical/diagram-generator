# Plan: Spec 077 — Mermaid ELK cluster lowering port

**Spec**: [`spec.md`](./spec.md) · **Branch**: `feat/077-mermaid-elk-cluster-lowering-port`

## Approach

Restore the invariant "ELK owns geometry; the product styles thinly on top." Port
Mermaid's layout-only lowering (`render.ts`, MIT) into
`packages/graph-layout-elk` + `packages/layout-engine`, keeping our `elkjs` and our
renderer. Delete the post-ELK box-moving and arrow-rerouting the 076 approach
depended on.

## Owner boundaries

| Concern | Owner | Note |
|---|---|---|
| Pure LCA + border-trim utilities | `packages/graph-layout-elk/src/` | Ported, unit-tested (FR-001) |
| Compound graph build + ELK options | `packages/graph-layout-elk/src/elk-graph-builder.ts` (extend) | Structure-driven (FR-002, G5) |
| Edge LCA lowering + `INCLUDE_CHILDREN` promotion | `packages/graph-layout-elk` | Replaces flat `buildGraphEdges` (FR-003) |
| Read-back to frame geometry | `packages/layout-engine/src/elk-layout.ts` | Verbatim node rects + ELK sections (FR-005) |
| Remove post-ELK geometry passes | `packages/layout-engine/src/elk-layout.ts` | Delete/gate G2/G3 functions (FR-006) |
| Thin styling | frame renderer / style path | No geometry (FR-007, G4) |
| Render gate | `apps/preview/src/persistence/` or `packages/layout-engine/tests/` | Actual SVG (SC-001..SC-004) |

## Reference map (Mermaid `render.ts` → this repo)

- `buildSubgraphLayoutOptions` (L55–74) → per-compound option builder.
- `addVertices`/`addVertex` (L~95–260) → compound graph build, measured via our adapter.
- `find-common-ancestor.ts` → port verbatim (MIT, ~30 lines).
- `addEdges` + `calcOffset` (L295–530) → LCA edge attachment + ancestor `INCLUDE_CHILDREN`.
- root options + `elk.layout` (L734–884) → single layout call with native model order.
- section read-back (L916–940) → absolute edge sections; `geometry.ts` border trim.

## Sequencing

Phase 0 utilities → Phase 1 compound graph → Phase 2 edge LCA lowering →
Phase 3 read-back + delete post-ELK passes → Phase 4 thin styling →
Phase 5 render gate + portability fixture. Each phase independently reviewable.

## Out of scope

Mermaid/D2 import (spec 028), Dagre (spec 074 retired), arrow-routing redesign
(spec 006). This spec consumes ELK routing as-is.
