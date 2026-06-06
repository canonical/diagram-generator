# Implementation plan: Sequence layout

## Goal

Port the first Mermaid-heavy layout family into a first-party TypeScript engine: sequence diagrams with Canonical branding, stable geometry, and preview-engine integration.

## Summary

This is a direct porting slice, not a dependency-integration slice. The project should own sequence layout semantics in the same way it owns frame autolayout, ELK layered integration, and the D3/quadtree force lane. Mermaid remains relevant as a language surface and a comparison target, but not as the runtime renderer.

## Technical Context

| Item | Detail |
| --- | --- |
| **Primary user demand** | Mermaid `sequenceDiagram` familiarity in engineering docs |
| **Ontology family** | `interaction_and_sequence` |
| **Rendering authority** | TypeScript layout + SVG renderer in this repo |
| **Shell integration** | spec 025 preview-engine registry, spec 026 shell boundaries |
| **Interchange relationship** | spec 028 may later import/export a sequence subset |

## Approach

### Phase 1 - Define the authored model (P1)

1. Define the minimal sequence-domain model needed for a branded lane:
   - participants
   - ordered messages
   - notes / annotations
   - grouped spans or sections
2. Decide how that model maps onto the current AST / YAML direction without inventing a second ad hoc persistence format.
3. Keep the first slice bounded to the high-value subset.

### Phase 2 - Build the core layout kernel (P1)

1. Implement participant column placement and lifeline geometry in TypeScript.
2. Implement vertical ordering for messages and notes.
3. Add branded spacing rules, participant box sizing, and left-aligned text behavior.
4. Keep geometry stable and testable.

### Phase 3 - Render and preview integration (P1)

1. Add a manifest-owned sequence preview engine lane.
2. Render participant headers, lifelines, arrows, and notes through the repo's SVG renderer path.
3. Keep `editor.js` on shared bootstrap only.

### Phase 4 - Mermaid adapter boundary (P2)

1. Define the supported `sequenceDiagram` subset.
2. Add import/export only after the core layout exists.
3. Treat Mermaid as a compatibility layer around the repo's own model, never the geometry owner.

## Architecture constraints

- No Mermaid runtime dependency in the interactive layout path.
- No new preview-only geometry authority.
- No unbounded `editor.js` changes.
- No claim of full Mermaid parity until the bounded subset is stable.

## Feasibility note

This layout is a good first direct-port target because it is domain-specific and structurally bounded. Unlike ELK layered interactive behavior, it does not depend on recovering hidden semantics from a third-party graph engine. The repo can own the algorithm directly.

## Validation gates

```bash
npm --prefix packages/layout-engine test
# add focused sequence-layout tests once the first slice lands
```

Closeout validation for the bounded v1 slice includes the live preview route with a corpus-backed reference image visible in Input and Both, so fidelity can be judged against the original source without leaving the shared shell.

## Risks

| Risk | Mitigation |
| --- | --- |
| Scope expands into full Mermaid parity | Freeze a bounded supported subset in spec and tests |
| Shell work swells into another `editor.js` integration blob | Require preview-engine manifest onboarding |
| Domain model drifts from interchange surfaces | Reuse spec 022 AST direction and align later with spec 028 |

## Project Structure

```text
specs/030-sequence-layout/
├── spec.md
├── plan.md
└── tasks.md
```