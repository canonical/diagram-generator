# Implementation Plan: Implicit ELK side ports

**Branch**: `feat/042-implicit-elk-side-ports` | **Date**: 2026-06-13 | **Spec**: [spec.md](spec.md)

## Goal

Give ELK layered deterministic edge attachment via generated side-midpoint ports, without introducing YAML authoring overhead.

## Design

### 1. Extend the graph IR to represent ports

- Add a minimal, engine-agnostic port shape to the graph IR.
- Keep the first slice small: node-owned ports plus edge endpoint references.
- Do not require authored YAML data in this phase.

### 2. Generate implicit ports in the ELK graph path

- Identify which nodes are eligible for implicit ports.
- Generate top/right/bottom/left midpoint ports for each eligible node.
- Assign stable port ids derived from node id and side.

### 3. Choose edge endpoint ports deterministically

- Define one initial side-selection policy for TB and LR graphs.
- Keep the policy explicit and testable rather than hidden in ad hoc heuristics.
- Use `portConstraints` only if it produces real value with the generated model.

### 4. Audit preview ELK controls

- Remove or relabel dead controls that still have no effect.
- Keep only options that map cleanly onto the generated graph model.

### 5. Validate on real diagrams

- Cover one narrow unit-level contract for port generation.
- Cover one ELK graph-builder test for endpoint mapping.
- Cover at least one real regression diagram where anchors currently drift or overlap badly.

## Files

- `packages/graph-layout-core/src/graph-ir.ts`
- `packages/graph-layout-elk/src/elk-graph-builder.ts`
- `packages/graph-layout-elk/src/elk-param-registry.ts`
- `packages/graph-layout-elk/src/*.test.ts`
- `packages/layout-engine/src/elk-layout.ts`
- `packages/layout-engine/tests/elk-layout.test.ts`
- `scripts/preview/layout-bridge.js`
- `scripts/preview/editor.js`

## Validation

- `npm --prefix packages/graph-layout-elk test`
- `npm --prefix packages/layout-engine test -- elk-layout.test.ts`
- `npm --prefix packages/layout-engine run build:browser`
- `npm --prefix packages/layout-engine test`
- `npm --prefix apps/preview test`
- `node scripts/check_no_new_python.mjs`

## Risks

- Adding ports to the shared graph IR is an architectural change, not just an ELK option toggle.
- The first side-selection policy may improve some diagrams while regressing others if it is too rigid.
- Compound nodes can complicate port eligibility and make the first slice larger than intended.
- Preview controls can drift from actual engine capability if the option audit is not part of the same change.
