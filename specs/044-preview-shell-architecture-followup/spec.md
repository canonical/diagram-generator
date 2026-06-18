# Feature Specification: Preview shell architecture follow-up

**Feature Branch**: `feat/044-preview-shell-architecture-followup`

**Created**: 2026-06-15

**Status**: In Progress

**Phase state**: Design package complete; contract migration and bridge decomposition pilots ongoing.

Progress note: the bridge pilot work now includes typed arrow render/patch and
frame/SVG patch owners in
`packages/layout-engine/src/preview-shell/app-arrow-render.ts` and
`packages/layout-engine/src/preview-shell/app-frame-svg.ts`.
`layout-bridge.js` is down to about 623 lines in the current working tree after
bridge-state/bootstrap and local-vs-ELK relayout orchestration moved behind
`packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts`.
Spec 044 remains open for the remaining ELK debug/raw-view and compatibility
fallback cleanup, not for core bridge ownership.

**Depends on**: spec 043 (complete), spec 038 (pivot / relocation seams), spec 035 (archived complete)

## Problem Statement

Spec 043 achieved its remit: shared preview behavior now lives in typed `preview-shell` modules instead of a 6k-line `editor.js` monolith. That leaves a second-stage architecture problem which 043 intentionally did not solve:

- browser integration still flows through a flat `LayoutEngine.*` bag with 200+ exports
- the preview browser bundle is still multi-megabyte and unshaped
- `layout-bridge.js` remains a large runtime seam with implicit ownership
- `editor.js` is coordinator-like now, but still pays for callback-bag wiring because the shell contract is not explicit

Continuing to stretch spec 043 would blur its decomposition remit and encourage more incremental churn without defining the next stable architecture.

## Mission

Define the post-043 preview-shell architecture so future work stops expanding a global export bag and starts landing behind explicit shell contracts, bundle boundaries, and staged runtime ownership.

## Product direction carried forward

The preview shell is intentionally output-only. This spec must not reintroduce the removed Input / Output / Both compatibility UI unless a later product decision explicitly reverses that direction.

## Scope

This spec covers:

- browser-facing shell contract / registry design
- `LayoutEngine` browser export-surface reduction plan
- bundle-boundary and load-surface strategy
- staged `layout-bridge.js` decomposition map
- high-risk callback hubs such as inspector action routing when they need a typed registry rather than bigger switch blocks

This spec does not cover:

- reopening 043 extraction slices except where a small pilot is needed to prove the new contract
- restoring Input / Output / Both UI compatibility
- unrelated ELK / force product features
- cross-repo design-foundry migration work

## Requirements

- **FR-001**: Define a typed browser contract that future preview-shell features can consume without adding new flat `LayoutEngine.*` globals.
- **FR-002**: Document the migration path from the current flat browser entry surface to the new contract without forcing a one-shot rewrite.
- **FR-003**: Produce a bundle-boundary plan that identifies what must stay in the main preview bundle, what can move behind lazy or segmented loading, and how success will be measured.
- **FR-004**: Publish a staged ownership/decomposition plan for `layout-bridge.js` with clear slice candidates and flow-map references.
- **FR-005**: Keep the shell output-only unless a new product spec says otherwise.
- **FR-006**: Preserve spec 038 seams and avoid new direct design-foundry dependencies.

## Success Criteria

- **SC-001**: A cold-start reviewer can identify the intended post-043 shell contract from this package without reverse-engineering `browser-entry.ts`.
- **SC-002**: New preview-shell work no longer defaults to "add another export to `LayoutEngine`".
- **SC-003**: `layout-bridge.js` has a documented staged decomposition path instead of remaining a generic future-problem note.
- **SC-004**: The output-only shell decision is reflected consistently in active docs and TODOs.
