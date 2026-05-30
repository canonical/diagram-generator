# Implementation Plan: Style foundation unification and preview parity hardening

**Branch**: `feat/007-style-foundation-unification` | **Date**: 2026-05-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/007-style-foundation-unification/spec.md`

## Summary

Complete the unfinished interactive Python -> TypeScript migration by unifying style ownership, stabilizing temporary fallback behavior, and then converging to a single interactive execution path (TypeScript local layout only).

## Technical Context

**Language/Version**: Python 3.11+ (core engine), browser JavaScript (preview/editor)

**Primary Dependencies**:
- `scripts/frame_loader.py`
- `scripts/layout_v3.py`
- `scripts/preview/layout-bridge.js`
- `scripts/preview/editor.js`
- `scripts/preview_server.py`

**Testing**:
- focused Python suite: `python -m pytest scripts/test_layout_v3.py scripts/test_autolayout.py scripts/test_frame_loader.py scripts/test_parity.py -q`
- preview browser regression tests (existing + new targeted checks)

**Target Platform**: v3 preview/editor (`/view/v3:<slug>`) and generated SVG output

**Constraints**:
- anti-patch protocol: no diagram-specific logic
- renderer should consume style decisions, not invent them
- temporary fallback paths must preserve edit intent and visibility until migration closure
- final state must remove interactive server fallback as default behavior
- localStorage is not used in the v3 interactive editing path
- one override authority using in-place replacement of canonical fields in the original frame YAML only (no additive override-entry schema such as `overrideRole`, and no sidecar override YAML/JSON authority), plus one render contract across paths

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| Anti-patch protocol | PASS | Scope is systemic contract cleanup |
| Layer ownership | PASS (target) | Must remove remaining preview style heuristics and duplicate execution ownership |
| One source of truth | PASS (target) | Style semantics anchored to resolver contract |
| Test-first hardening | PASS | Add explicit migration-gate and single-path tests |

## Workstreams

### WS1 - Formal style contract for preview parity (P1)

- define canonical style semantics surface consumed by both local and server paths
- document mapping from inspector style options to semantic fields
- lock legacy alias behavior (`accent` -> `parent`) in compatibility contract

### WS2 - Local renderer ownership cleanup (P1)

- remove/replace remaining heuristic style derivation in local v3 renderer
- ensure local patching uses contract-aligned style state, not inferred container shape rules
- add code comments that identify ownership boundaries

### WS3 - Migration-mode robustness (P1)

- codify readiness predicate and ensure all gating paths depend on it
- guarantee server fallback on local failure/unready states for edit actions
- preserve selection/override UX continuity across mode transitions

### WS4 - Migration closure to single interactive path (P1)

- define migration closure gates (parity + regression + docs alignment)
- remove or hard-disable interactive server fallback after closure criteria are met
- delete dead dual-path glue and stale comments asserting conflicting behavior

### WS5 - Override schema and migration consistency (P2)

- validate edit persistence performs in-place replacement of canonical YAML fields (no additive override-entry layer)
- add compatibility handling tests for old payloads
- ensure save/load roundtrip consistency for style fields

### WS6 - Regression and parity validation (P1)

- add targeted browser-level regression test for the no-op style bug
- add parity checks local vs server for representative fixtures
- run focused engine suite + preview-specific tests

### WS7 - Adversarial review cadence (P1)

- run adversarial review after WS2 (local renderer cleanup)
- run adversarial review after WS4 (migration closure changes)
- run adversarial review after WS6 (final validation bundle)
- each review must explicitly check for reintroduced dual-path logic, shadow state, and renderer reinterpretation forks

## Validation Gates

1. Style dropdown changes produce visible SVG updates in both local-ready and temporary fallback modes.
2. Local/server parity tests for style semantics pass.
3. Interactive fallback removal gate passes and final single-path mode is validated.
4. No newly introduced style branch duplicates ownership already defined in resolver contract.
5. Focused Python suite and preview regression tests pass.
6. Adversarial review checkpoints pass for each major block (WS2, WS4, WS6).

## Deliverables

- contract doc updates in spec artifacts
- code changes in preview bridge/editor and any required serialization touchpoints
- automated tests for migration fallback, closure gates, and final single-path mode
- TODO updates linking this feature after implementation starts

## Risks and Mitigations

- Risk: hidden coupling between local patching and legacy SVG assumptions
- Mitigation: fixture-based parity tests and incremental replacement of heuristic branches

- Risk: fallback relayout causes temporary UI state churn
- Mitigation: explicit state reconciliation steps (selection + overrides + inspector refresh), plus closure gate to remove fallback

- Risk: migration stalls in permanent dual-path mode again
- Mitigation: closure tasks are explicit and blocking; docs must be updated in same change-set as fallback removal

- Risk: compatibility breaks for existing override files
- Mitigation: additive migration mapping and roundtrip tests
