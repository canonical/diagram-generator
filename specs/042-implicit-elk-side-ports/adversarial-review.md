# Adversarial Review: Implicit ELK side ports

## Status

Re-reviewed on 2026-06-14 after the native-ELK cleanup, headed-compound fix, and compatibility sweep. The implementation now matches the tightened spec contract: midpoint ports are modeled as ELK inputs, route geometry and edge-label placement stay ELK-authored, and headed/icon-bearing groups remain ELK-compatible because their chrome is treated as decorative container padding rather than as routing participants.

## Findings

No open correctness findings remain after cleanup.

Resolved during this review:

- `complex-routing-usecase.yaml` had been treated as non-native only because headed authored groups were flattened out of the ELK graph and then wrapped again afterward. `packages/layout-engine/src/elk-layout.ts` now keeps those authored groups as native ELK compounds, feeds their authored body children into ELK, and reapplies returned child placements recursively.
- Nested compound endpoints in `packages/graph-layout-elk/src/result-normalizer.ts` drifted because node positions were normalized with snapped ancestor coordinates while recovered port positions were accumulated from unsnapped ancestors. Port recovery now uses the same snapped ancestry and only aligns the coordinate implied by the port side, which preserves native orthogonal final segments and arrowhead orientation.

## What was specifically re-checked

- Relationship-aware second-pass side selection still only affects ELK input modeling. It chooses `sourcePort` / `targetPort` references for midpoint ports, but it no longer inserts synthetic stems or reroutes returned sections.
- The concrete root cause of the corner attachments was an ELK API mismatch in the graph builder: we were emitting extended edges as `sources: ["nodeId"]` / `targets: ["nodeId"]` plus inert `sourcePort` / `targetPort` fields. Native ELK midpoint routing required the port ids to appear directly in `sources` / `targets`.
- `packages/graph-layout-elk/src/result-normalizer.ts` no longer inserts synthetic bendpoints or rewrites sections into a second route model. It now normalizes coordinates, recovers port metadata with the same snapped ancestry as node normalization, and only aligns the endpoint axis implied by the recovered ELK port side.
- `packages/layout-engine/src/elk-layout.ts` no longer collapses ELK collinear points. It only removes exact consecutive duplicates so zero-length final segments do not break arrowheads, and it keeps headed groups ELK-native by treating synthetic heading/body frames as decorative wrappers rather than as fallback triggers.
- `packages/layout-engine/src/arrow-routing.ts` now treats `arrow.layoutPath` as authoritative geometry. It does not re-simplify ELK paths before rendering.
- Layered defaults now set `elk.edgeLabels.inline=false`, so edge labels are handled by ELK as detached label boxes instead of being forced inline on the shaft.
- The preview compatibility sweep now keeps both `complex-routing-usecase.yaml` and `juju-bootstrap-machines-process.yaml` ELK-compatible, which matches fresh preview output from a restarted server.
- Headings and icons on compounds were re-checked as decorative chrome only: they move with the compound box, remain outside the ELK child-participant set, and no longer disqualify the diagram from ELK.
- The real failing preview corpus, `juju-bootstrap-machines-process.yaml`, was re-checked from the routed data:
  - `step1`, `step2`, and `step5` leave `client` from the bottom midpoint
  - `step3` leaves `client` from the top midpoint and enters `cloud` at the bottom midpoint
  - each `arrow.layoutPath` now matches the ELK snapshot section points plus the diagram origin offset, with no extra routing points introduced afterward
- `complex-routing-usecase.yaml` was re-checked from the laid-out data:
  - `planning`, `implementation`, and `delivery` remain native ELK compounds instead of post-layout wrappers
  - `planning__heading` stays above `planning__body`, and authored child nodes stay inside their body regions
  - `define -> implement` and `measure -> review` remain orthogonal and terminate on the target top edge span without preview-side repair
- Legacy `meta.elk.elk.portConstraints` scrubbing remains covered in preview persistence tests and still passes.

## Residual risks

- I did not do a screenshot-based browser review. The in-app browser plugin was unavailable in this environment (`iab` instance missing), so verification stayed geometry-driven from routed output plus tests.
- The input-edge fallback in `result-normalizer.ts` still assumes stable edge ids for the strongest match. That is acceptable in the current IR because edge ids are required, but if a future adapter emitted duplicate ids or stripped ids before normalization, the fallback would be less precise.

## Validation used

- `npm --prefix packages/graph-layout-elk test -- elk-layered.test.ts`
- `npm --prefix packages/layout-engine test -- elk-layout.test.ts preview-engine-registry.test.ts`
- `npm --prefix packages/layout-engine run build:browser`
- `npm --prefix apps/preview test`
- `node scripts/check_no_new_python.mjs`
