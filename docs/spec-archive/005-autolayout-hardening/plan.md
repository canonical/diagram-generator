# Implementation Plan: Autolayout hardening and contract cleanup

**Branch**: `feat/005-autolayout-hardening` | **Date**: 2026-05-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-autolayout-hardening/spec.md`

## Summary

Harden the v3 autolayout engine by removing semantic mutation, unifying style ownership, formalizing heading/body synthesis behavior, and aligning measure/render padding. Deliver this as architecture-safe refactors with strict regression testing.

## Technical Context

**Language/Version**: TypeScript (primary engine in `packages/layout-engine/src/layout.ts`). Python receives equivalent changes only for parity verification.

**Primary Dependencies**: `packages/layout-engine/src/layout.ts`, `packages/layout-engine/src/frame-model.ts`, `packages/layout-engine/src/resolve-styles.ts` (TS); `scripts/layout_v3.py`, `scripts/frame_loader.py` (Python parity)

**Testing**:
```bash
npm --prefix packages/layout-engine test          # TS tests (primary)
python -m pytest test_frame_loader.py test_autolayout.py test_layout_v3.py test_parity.py -q  # Python parity
```

**Target Platform**: TS layout engine runs client-side via `layout-bridge.js`; Python engine for batch SVG export only

**Project Type**: Engine refactor and contract hardening

**Constraints**: Anti-patch protocol; no per-diagram logic forks

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| Anti-patch protocol | PASS | Work is contract-level, not diagram-specific |
| Layer ownership | PASS | style in loader/shared resolver, renderer as projection |
| DIAGRAM.md alignment | PASS | no new visual language introduced |
| Test-first rigor | PASS | add idempotency, propagation, and padding contract tests |
| Semantic YAML | PASS | parser validation hardening supports semantics |

## Workstreams

### WS1 - Derived layout state isolation (P1)

- introduce layout-only derived fields / runtime context
- remove in-place rewrites of semantic sizing/width fields
- add idempotency test and mutation-guard test

### WS2 - Style resolution single source (P1)

- centralize default fill/stroke/text treatment in one resolver
- remove renderer-side style reinterpretation branches
- add resolver snapshot tests and render fidelity checks

### WS3 - Heading/body synthesis contract (P1)

- document explicit propagation matrix for synthetic nodes
- codify behavior in loader tests
- reject/flag ambiguous inheritance paths explicitly

### WS4 - Measure/render padding parity (P2)

- use per-side padding values in measurement code path
- remove legacy compensating hacks where no longer needed
- add tests that compare measure assumptions vs SVG placement

### WS5 - Validation and corpus audit (P1)

- run focused test suite
- run corpus render checks for all frame YAMLs
- browser-spot-check high-risk diagrams

## Validation Gates

1. focused layout tests pass
2. new mutation/idempotency tests pass
3. no new lint/type/test errors introduced by refactor
4. representative corpus spot-check confirms no regressions

## Deliverables

- implementation changes in loader/layout/renderer ownership boundaries
- tests covering mutation, style ownership, heading/body propagation, and padding parity
- updated TODO references after merge

## Risks and Mitigations

- Risk: hidden coupling breaks older diagrams
- Mitigation: run full focused suite plus corpus render sweep before completion

- Risk: refactor shifts public behavior unintentionally
- Mitigation: snapshot-style tests and explicit acceptance scenarios from spec
