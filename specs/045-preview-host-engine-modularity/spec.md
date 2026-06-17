# Feature Specification: Preview host engine modularity

**Feature Branch**: `feat/045-preview-host-engine-modularity`

**Created**: 2026-06-16

**Status**: In Progress

**Depends on**: spec 035 (complete), spec 038 (pivot / relocation seams), spec 043 (complete), spec 044 (in progress)

## Problem Statement

The repo now has a credible multi-engine core:

- typed preview-engine manifests and compatibility rules
- a Node preview app instead of a Python control plane
- a shrinking browser-shell monolith under specs 043 and 044

But the preview host itself is still too centralized for the next scale step:

- `apps/preview/src/server.ts` still mixes route handling, browse navigation, page-shell assembly, asset serving, and engine-lane wiring in one file
- adding a new engine lane still risks widening server-local conditionals and HTML assembly instead of starting from a typed host contract
- the grid lane and force lane still read as bespoke cases rather than two registrations in one scalable preview-host topology

That is acceptable for two engines. It is not a sound steady state for 20+ layouts, and it would become architectural drag before any eventual autolayout relocation into design-foundry.

## Mission

Turn the Node preview app into a typed preview host with explicit engine-lane descriptors, shared page-shell builders, and bounded route ownership so adding future layout engines starts from a modular host contract instead of widening `server.ts`.

## Architectural position

This spec does **not** replace spec 044.

- **Spec 044** continues to own browser-bundle shape, namespaced shell contracts, and `layout-bridge.js` decomposition.
- **Spec 045** owns the Node preview host surface: route/page assembly, lane descriptors, browse/nav generation, and server-side modularity for multi-engine growth.

## Scope

This spec covers:

- typed preview-host lane descriptors
- shared viewer/index page-shell assembly for the Node preview app
- reducing `apps/preview/src/server.ts` by moving engine-host concerns into concern-owned TS modules
- route and browse/nav modularity required to onboard many more engines without copy-pasted server logic
- the preview-host side of engine onboarding, distinct from browser-shell/editor ownership

This spec does not cover:

- rewriting `editor.js` or `layout-bridge.js` again outside spec 044
- making force and grid share one editor implementation
- changing YAML document semantics
- relocating code into design-foundry

## User Scenarios & Testing

### User Story 1 - Add a new preview lane without reopening the server monolith (Priority: P1)

As a maintainer, I want new engine lanes to start from a typed host descriptor so route and page work does not begin as ad hoc `server.ts` branching.

**Independent test**: a lane label, browse link shape, and viewer path can be defined in one preview-host module and consumed by the page builders without inlining those strings in `server.ts`.

### User Story 2 - Shared preview chrome is assembled once (Priority: P1)

As a maintainer, I want browse nav, select options, and shared viewer shell placeholders to live in one typed owner so grid and force lanes do not drift.

**Independent test**: both the grid viewer page and force viewer page are built through a shared page-shell helper rather than separate string-assembly blocks in the server.

### User Story 3 - The app topology remains aligned with the design-foundry port direction (Priority: P2)

As a maintainer, I want the preview host to treat engines as registered modules so the eventual `operator-autolayout` relocation stays a package move, not a preview-app redesign.

**Independent test**: host modularity work does not collapse engine logic back into the server or introduce a second source of truth beside the preview-engine registry and TypeScript engine packages.

## Requirements

### Functional Requirements

- **FR-001**: The preview app MUST define typed lane descriptors for server-hosted preview lanes.
- **FR-002**: Shared viewer-shell HTML assembly MUST move behind dedicated TypeScript modules rather than remain duplicated in `server.ts`.
- **FR-003**: Browse-nav and select-option generation MUST be driven from lane descriptors, not hard-coded string blocks per lane.
- **FR-004**: New engine-host work introduced while this spec is active MUST prefer extending the preview-host contract over widening server-local HTML or route branches.
- **FR-005**: This spec MUST preserve spec 035 preview-engine compatibility ownership and MUST NOT create a second engine registry in the preview app.
- **FR-006**: This spec MUST preserve spec 038 relocation seams and MUST NOT introduce design-foundry dependencies.
- **FR-007**: Adding a new preview lane SHOULD start with a descriptor/module change in `apps/preview/src/preview-host/` rather than direct edits to `server.ts` page-shell string assembly.
- **FR-008**: The preview host MUST keep lane registration distinct from browser-shell ownership; lane descriptors may choose a shell tier, but they MUST NOT absorb editor/bridge business logic.

### Non-Functional Requirements

- **NFR-001**: The migration MUST remain incremental; `server.ts` may continue to exist as the app entrypoint while its concerns are extracted.
- **NFR-002**: The preview host SHOULD make the current two lanes read like registrations in one topology, not bespoke app modes.
- **NFR-003**: The resulting host surface SHOULD make future engine onboarding legible to a cold-start maintainer from one spec package and one module folder.
- **NFR-004**: This spec SHOULD make clear that a preview-engine manifest is not, by itself, a complete preview-host plugin contract; host registration and browser-shell ownership remain separate concerns until later specs unify them further.

## Success Criteria

- **SC-001**: `apps/preview/src/server.ts` stops being the default home for new lane/page assembly logic.
- **SC-002**: Shared viewer-shell HTML assembly is owned by preview-host TS modules.
- **SC-003**: The current grid and force lanes are represented through typed host descriptors.
- **SC-004**: A cold-start maintainer can trace preview-host ownership from this package without reverse-engineering the full server file.
- **SC-005**: A maintainer can describe the minimum preview-host work for a future lane without saying "add another server branch and copy one of the existing page builders."

## Out of Scope

- framework rewrites
- one-shot route-handler decomposition for every API in the preview app
- changing force/grid shell semantics
- browser bundle splitting or `layout-bridge.js` decomposition beyond spec 044

## Engine onboarding rule

Adding a future engine lane should converge toward this shape:

1. Extend the TypeScript engine/manifest owner (`packages/layout-engine/src/preview-engine/*`).
2. Register or extend the preview-host lane/route surface in `apps/preview/src/preview-host/*`.
3. Load an existing browser shell tier where possible, or declare a distinct browser shell owner when not.
4. Avoid widening `server.ts` with bespoke page-shell HTML or lane-local browse-nav generation.

This spec owns step 2. Spec 044 owns the browser-shell side of step 3.
