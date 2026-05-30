# Implementation Plan: Arrow routing redesign with explicit ports and obstacle model

**Branch**: `feat/006-arrow-routing-redesign` | **Date**: 2026-05-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-arrow-routing-redesign/spec.md`

## Summary

Implement phased routing redesign from architecture plan: explicit ports and nested path selectors, hierarchy-aware per-arrow obstacles, deterministic side inference, improved channel/wedge behavior, and layout-owned geometry emission.

## Technical Context

**Language/Version**: Python 3.11+ core routing implementation

**Primary Dependencies**: `scripts/layout_v3.py` routing functions, related model/parser modules, SVG render path emission

**Testing**: focused pytest suite plus new routing fixtures

**Target Platform**: v3 autolayout SVG output and preview routing behavior

**Constraints**: no renderer-owned routing decisions; no diagram-specific exception rules

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| Anti-patch protocol | PASS | redesign is subsystem-level, not one-off patching |
| Layer ownership | PASS | routing decisions move/remain in layout layer |
| Semantic model first | PASS | explicit endpoints and path syntax are semantic |
| Test rigor | PASS | routing fixtures and deterministic assertions required |

## Phase Mapping (from TODO)

1. Port model + `/` path syntax
2. Multi-factor side inference
3. Per-arrow obstacle sets with ancestor exclusion
4. Grid channels + generalized wedge + bend penalties
5. Pre-compute arrow geometry in layout pass
6. Optional crossing minimization (stretch)

## Workstreams

### WS1 - Endpoint model and parser updates (P1)

- extend endpoint grammar for side-qualified and nested selectors
- validate path resolution and error reporting
- add parser tests for valid/invalid selectors

### WS2 - Deterministic side inference (P2)

- replace binary edge-gap logic with weighted scoring model
- define tie-break order and test it
- expose debug trace hooks where practical

### WS3 - Hierarchy-aware obstacle modeling (P1)

- compute obstacles per arrow
- apply ancestor/descendant exclusion rules
- add nested-fixture tests that previously failed

### WS4 - Route shape quality (P2)

- introduce channel midpoint preferences
- generalize wedge handling beyond L-only special case
- tune bend penalties with deterministic outputs

### WS5 - Layer ownership cleanup (P1)

- move/keep geometry finalization in layout stage
- ensure renderer only serializes provided points
- add contract tests for renderer purity

### WS6 - Optional crossing minimization (P3)

- evaluate lightweight crossing penalties or ordering heuristics
- keep behind explicit phase gate

## Validation Gates

1. parser tests for selector grammar and path resolution pass
2. routing fixtures pass for nested and obstacle-heavy diagrams
3. renderer path emission tests confirm no reroute logic
4. corpus spot-check on known problematic diagrams passes

## Deliverables

- endpoint/port model updates
- routing algorithm refactor with obstacle and channel improvements
- test fixtures and deterministic assertions
- TODO/status updates once implementation lands

## Risks and Mitigations

- Risk: route quality improves in one corpus slice but regresses others
- Mitigation: add representative fixtures from multiple diagram families and run corpus spot-checks

- Risk: algorithm complexity growth hurts performance
- Mitigation: benchmark representative large diagrams before/after each phase
