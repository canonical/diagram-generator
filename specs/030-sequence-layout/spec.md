# Feature Specification: Sequence layout

**Feature Branch**: `feat/030-sequence-layout`

**Spec Package**: `030-sequence-layout`

**Created**: 2026-06-06

**Status**: Complete

**Depends on**: spec 022 (complete), spec 025 (complete), spec 026 (complete), spec 028 (draft, compatible)

**Input**: Canonical engineers already use Mermaid `sequenceDiagram` heavily for service interactions, request flows, and actor handoffs. This repo should support that layout family natively in TypeScript with Canonical branding, left-aligned text, editable SVG output, and preview-shell integration. Mermaid compatibility is a language and interchange target, not the runtime layout engine.

## Problem Statement

The repo can currently export Mermaid flowcharts, but it does not have a first-party sequence layout engine. That leaves a gap between two important needs:

- engineers want a familiar sequence-diagram authoring and sharing shape
- the project needs branded, editable, geometry-owned output rather than whatever Mermaid's renderer happens to do

Depending on Mermaid at runtime would keep the same limitations we want to escape:

- weak control over typography and text alignment
- limited control over branded spacing and participant box treatment
- limited editor integration and save semantics
- no clean route to draw.io-style editable outputs later

This feature should therefore be a **direct porting slice**, not a dependency-install slice.

## Mission

Build a first-party TypeScript sequence layout engine and preview lane that can represent the high-value subset of Mermaid `sequenceDiagram`, while producing branded output under this repo's own layout and rendering rules.

## Authored state and AST authority

The canonical persisted source of truth for this lane is a top-level YAML `sequence:` block owned by the repo's existing TypeScript authoring compiler.

- `compileDiagramYaml()` normalizes `sequence.participants`, `sequence.messages`, `sequence.notes`, and `sequence.groups` into the repo-owned AST.
- Mermaid is not allowed to become a shadow authority for this lane. If Mermaid familiarity is supported, it must be import/export around this AST rather than a second persisted runtime representation.
- The first `030` persistence slice therefore lives in `packages/layout-engine/src/diagram-author/` and `packages/layout-engine/src/sequence-layout/`, not in browser storage or preview-only transforms.

## Initial supported subset

The bounded first subset for `sequenceDiagram` familiarity is:

- participants with ids, labels, and bounded actor-type variants (`participant`, `actor`, `boundary`, `control`, `entity`, `database`)
- ordered directed messages with canonical `from`, `to`, `label`, and generated stable ids when omitted
- participant-scoped notes with bounded placements: `left-of`, `right-of`, and `over`
- grouped spans keyed by start/end message ids

Explicitly out of scope for this first slice:

- Mermaid runtime rendering
- activation bars, autonumbering, destruction markers, and complete parity chasing
- browser-only authoritative state or a second Mermaid-authored save format

## Bounded v1 closeout note

The validated fixture for this completed slice is a corpus-backed redraw of Landscape package reporting, surfaced through the normal preview route and paired with the tracked source image in the shared Input and Both tabs.

The reference image still contains unsupported sequence affordances such as activation bars and the sleep bracket. Those remain visible fidelity gaps for a future follow-up slice; they are not faked in the shell or patched into unrelated primitives.

## User Scenarios & Testing

### User Story 1 - Branded sequence diagrams for docs and architecture reviews (Priority: P1)

As an author, I want to create participant-based interaction diagrams with ordered messages, notes, and grouped steps, so I can replace raw Mermaid screenshots with editable, on-brand diagrams.

**Independent test**: the bounded corpus-backed fixture renders with stable lifeline placement, ordered messages, and branded participant headers while the Input and Both tabs show the tracked source image for direct fidelity checking.

### User Story 2 - Mermaid familiarity without Mermaid runtime dependence (Priority: P1)

As an engineer used to Mermaid, I want the new lane to support the common `sequenceDiagram` concepts directly, so I do not need Mermaid as the rendering authority.

**Independent test**: the supported Mermaid subset maps into the repo's own AST / layout model and renders without calling Mermaid in the live layout path.

### User Story 3 - Preview editing stays inside the multi-engine shell contract (Priority: P2)

As a maintainer, I want sequence layout to onboard through the preview-engine registry and shell boundaries from specs 025 and 026, so a new layout lane does not turn `editor.js` into another unbounded integration surface.

**Independent test**: preview-engine registration and any engine-specific scripts remain manifest-owned; `editor.js` only keeps shared bootstrap glue.

## Requirements

### Functional Requirements

- **FR-001**: The implementation MUST provide a first-party TypeScript sequence layout engine; Mermaid MUST NOT be used as the runtime layout/render authority.
- **FR-002**: The engine MUST support the high-value `sequenceDiagram` concepts needed by the Canonical corpus: participants, ordered messages, notes, and grouped spans.
- **FR-003**: Participant headers and message text MUST render with Canonical branding and left-aligned text treatment where appropriate.
- **FR-004**: The feature MUST integrate through the preview-engine contract from spec 025 rather than hard-coded shell branching.
- **FR-005**: The layout MUST produce stable SVG geometry owned by this repo's TypeScript path, suitable for later export and editor workflows.
- **FR-006**: Mermaid compatibility, where provided, MUST be implemented as import/export or adapter logic around the repo's own AST and layout model.

### Non-Functional Requirements

- **NFR-001**: TypeScript remains the authority for layout, measure, and SVG generation.
- **NFR-002**: YAML or AST-backed authored state remains the source of truth; no browser storage or Mermaid-rendered shadow state may become authoritative.
- **NFR-003**: The first delivery should target a bounded, well-tested subset rather than claiming full Mermaid sequence parity.

## Non-Goals

- Embedding Mermaid's runtime renderer into preview.
- Chasing complete `sequenceDiagram` parity on day one.
- Solving swimlane workflows, state machines, or ER/class diagrams in the same slice.
- Reopening the broader preview-shell architecture.

## Success Criteria

1. A first-party sequence engine exists in TypeScript and renders a branded participant/message fixture without Mermaid runtime help.
2. The new lane supports the common Canonical doc use cases for actor/service interaction diagrams.
3. Preview onboarding happens through the multi-engine registry rather than one-off shell branches.
4. The spec explicitly protects the project from backsliding into “install Mermaid and accept its renderer limitations.”
5. The validated preview surface includes the corpus reference image in Input and Both so authors can compare the reproduction against the original without leaving the editor shell.