# Plan: Compatible engine switcher

## Phase 1 - Compatibility contract

- define a typed engine-compatibility surface in the preview-engine registry
- decide whether compatibility keys evaluate against raw YAML metadata, compiled AST shape, or both
- define how canonical engine choice persists without shadow state

## Phase 2 - Preview switcher

- add a manifest-driven engine switcher UI that reads compatible engines for the current document
- rerender through existing preview-engine routing rather than bespoke shell paths
- show disabled or hidden engines consistently with an explainable reason

## Phase 3 - Validation and persistence

- confirm engine changes round-trip through canonical persisted state
- add focused preview tests for compatible filtering and rerender behavior
- document how future engine lanes participate in compatibility declarations