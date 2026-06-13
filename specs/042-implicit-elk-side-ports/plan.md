# Implementation Plan: Implicit ELK side ports

**Branch**: `feat/042-implicit-elk-side-ports` | **Date**: 2026-06-13 | **Spec**: [spec.md](spec.md)

## Goal

Give ELK layered deterministic edge attachment via generated side-midpoint ports, without introducing YAML authoring overhead, while keeping ELK authoritative for routes and edge labels.

## Design

### 1. Keep the IR extension minimal

- Extend `@diagram-generator/graph-layout-core` with optional node-owned port data and optional `sourcePort` / `targetPort` edge refs.
- Do not add a second route model on top of ELK; current consumers should rely on native ELK sections and labels.
- Re-export the new input-side types from `packages/graph-layout-core/src/index.ts`.

### 2. Keep implicit-port synthesis inside the ELK builder

- `packages/graph-layout-elk/src/elk-graph-builder.ts` remains the authority that turns port-capable IR into an ELK graph.
- Generate four midpoint ports (`top`, `right`, `bottom`, `left`) with stable ids derived from node id and side.
- Treat authored edge endpoint nodes as eligible. Structural carriers stay unported. Compound nodes only get ports when the authored arrow points to that compound id directly.
- Keep headed or icon-bearing compounds ELK-native. Their heading/body chrome should behave like decorative padding/background that moves with the box, while authored body children remain the ELK participants.
- Use ELK's native port API and edge-port refs only; do not plan a TypeScript reroute layer to compensate later.

### 3. Use supported ELK configuration, not a second routing algorithm

- Derive any preferred side choice through ELK inputs only: generated ports, supported `sourcePort` / `targetPort` refs, and supported ELK options.
- If a compatible native ELK option exists for shared-source fan-out or merged stems, we may enable it.
- If no compatible native option exists, keep default ELK behavior rather than emulating shared stems or bend patterns in TypeScript.
- Keep the first slice intentionally narrow: one logical port per side, no custom same-side lane policy.

### 4. Make ELK output authoritative in the render path

- `packages/graph-layout-elk/src/result-normalizer.ts` may translate or preserve ELK geometry, but it should not invent new route geometry beyond what ELK returned.
- `packages/layout-engine/src/elk-layout.ts` should forward ELK sections and ELK label positions as the authoritative route payload, while mapping native ELK compound child placements back through decorative headed-container wrappers.
- `packages/layout-engine/src/arrow-routing.ts` and `scripts/preview/layout-bridge.js` must not re-route ELK-managed arrows, synthesize fan-out stems, or simplify paths in ways that change final segment direction.
- Arrowheads should be drawn from the final ELK segment only.
- If arrows run through labels, treat that as an ELK input/config problem or default ELK behavior, not as a signal to add a post-layout rerouter.

### 5. Make `portConstraints` implementation-owned for now

- Remove `elk.portConstraints` from `ELK_LAYERED_PARAM_SPECS` so the preview stops presenting it as a meaningful authored control.
- Ensure generated-port nodes still enforce fixed-side semantics internally even when legacy YAML carries `meta.elk.elk.portConstraints: FREE`.
- Preserve the current persistence shape; no YAML migration or new author-facing schema is part of this slice.
- Scrub stale legacy `meta.elk.elk.portConstraints` on save so authored YAML does not advertise a dead control.

### 6. Keep same-size boxes separate and input-side only

- Same-size box behavior is acceptable only as an input-side sizing concern that does not alter ELK's returned routes.
- Do not couple box-size equalization to arrow fixes in this slice.

### 7. Validate with the existing ELK fixture surface

- Add builder-level coverage in `packages/graph-layout-elk/tests/elk-layered.test.ts` for stable port ids, side selection, and edge port refs.
- Reuse the existing ELK corpus fixtures (`corpus-juju-bootstrap-machines-process.graph.json` and `corpus-ubuntu-pro-wsl-deployment.graph.json`) to confirm routed endpoints stay on intended sides under native ELK geometry.
- Add one layout-engine regression in `packages/layout-engine/tests/elk-layout.test.ts` to prove rendered paths and arrowhead-bearing final segments follow native ELK output on a real frame diagram.
- Add headed-compound coverage so frames with headers/icons remain ELK-compatible and keep their chrome decorative.
- Keep preview validation focused on native-route consumption and control registry behavior; do not add new preview-only routing behavior.

## Files

- `packages/graph-layout-core/src/graph-ir.ts`
- `packages/graph-layout-core/src/index.ts`
- `packages/graph-layout-elk/src/elk-graph-builder.ts`
- `packages/graph-layout-elk/src/layered-options.ts`
- `packages/graph-layout-elk/src/elk-param-registry.ts`
- `packages/graph-layout-elk/src/result-normalizer.ts`
- `packages/layout-engine/src/elk-layout.ts`
- `packages/layout-engine/src/arrow-routing.ts`
- `packages/graph-layout-elk/tests/elk-layered.test.ts`
- `packages/layout-engine/tests/elk-layout.test.ts`
- `packages/layout-engine/tests/preview-engine-registry.test.ts`
- `apps/preview/src/persistence/frame-diagram.ts`
- `apps/preview/src/persistence/frame-diagram.test.ts`
- `scripts/preview/layout-bridge.js`

## Validation

- `npm --prefix packages/graph-layout-elk test`
- `npm --prefix packages/layout-engine run build:browser`
- `npm --prefix packages/layout-engine test`
- `npm --prefix apps/preview test`
- `node scripts/check_no_new_python.mjs`

## Risks

- Adding ports to the shared graph IR can sprawl if we let output-side geometry turn into a second routing contract.
- One midpoint port per side may still crowd multi-edge cases even though it improves determinism.
- Native ELK shared-stem behavior may not exist or may be incompatible with explicit port constraints; in that case we must accept default ELK fan-out rather than emulate it.
- The preview shell still has its own arrow rendering code, so route-authority drift is a concrete risk until ELK-managed arrows are consumed consistently.
- Legacy YAML may still contain `elk.portConstraints`; behavior must be deterministic even if the saved key remains inert.
