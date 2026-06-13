# Adversarial Review: Implicit ELK side ports

## Status

Re-reviewed on 2026-06-14 after the native-ELK cleanup and compatibility sweep. The implementation now matches the tightened spec contract: midpoint ports are modeled as ELK inputs, while route geometry and edge-label placement stay ELK-authored.

## Findings

No open correctness findings remain after cleanup.

Resolved during this review:

- `packages/layout-engine/tests/elk-layout.test.ts` still treated `complex-routing-usecase.yaml` as a supported ELK case even though the preview compatibility gate now correctly rejects it as non-native. That regression test was removed so the suite no longer enshrines unsupported ELK fallback behavior.

## What was specifically re-checked

- Relationship-aware second-pass side selection still only affects ELK input modeling. It chooses `sourcePort` / `targetPort` references for midpoint ports, but it no longer inserts synthetic stems or reroutes returned sections.
- The concrete root cause of the corner attachments was an ELK API mismatch in the graph builder: we were emitting extended edges as `sources: ["nodeId"]` / `targets: ["nodeId"]` plus inert `sourcePort` / `targetPort` fields. Native ELK midpoint routing required the port ids to appear directly in `sources` / `targets`.
- `packages/graph-layout-elk/src/result-normalizer.ts` no longer rewrites section start/end points to port coordinates and no longer inserts orthogonal "repair" bendpoints. It now normalizes coordinates, tracks recovered port metadata, and leaves ELK section geometry intact.
- `packages/layout-engine/src/elk-layout.ts` no longer collapses ELK collinear points. It only removes exact consecutive duplicates so zero-length final segments do not break arrowheads.
- `packages/layout-engine/src/arrow-routing.ts` now treats `arrow.layoutPath` as authoritative geometry. It does not re-simplify ELK paths before rendering.
- Layered defaults now set `elk.edgeLabels.inline=false`, so edge labels are handled by ELK as detached label boxes instead of being forced inline on the shaft.
- The preview compatibility sweep now classifies `complex-routing-usecase.yaml` as `v3`-only and keeps `juju-bootstrap-machines-process.yaml` ELK-compatible, which matches fresh preview output from a restarted server.
- The real failing preview corpus, `juju-bootstrap-machines-process.yaml`, was re-checked from the routed data:
  - `step1`, `step2`, and `step5` leave `client` from the bottom midpoint
  - `step3` leaves `client` from the top midpoint and enters `cloud` at the bottom midpoint
  - each `arrow.layoutPath` now matches the ELK snapshot section points plus the diagram origin offset, with no extra routing points introduced afterward
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
