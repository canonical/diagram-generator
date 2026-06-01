# Roadmap

## Purpose

Turn this repo into Canonical's shared diagram production system and a validation harness for the design language: constrained generation from structured input, fallback guardrails for manual tools, and a live regression surface for the canonical spacing, typography, and grid specs.

## Long-term direction

- The long-term target is a Structurizr-inspired separation of domain, model, view, style, layout, and app surfaces.
- Multiple layout engines remain a future goal, but only after they prove useful on real brand-constrained diagrams.
- The current production system is narrower: Frame YAML is the authored truth, v3 autolayout is the live engine, and TypeScript owns local relayout.
- Diagrams should become a fourth tier in the Canonical design-language specs rather than a one-off exception.
- Decision gate: no future engine or app layer becomes architecture until it survives real corpus validation.

## Completed stages

Stages 1-12 and 15.5 are complete. See `HISTORY.md` for details.

## Active and future stages

### Stage 10a - Component model unification

Make every Frame participate uniformly in layout, selection, inspection, drag, override, and serialisation regardless of role. Finish the remaining heading-child and box-interior cleanup so new component roles stop requiring editor special cases.

### Stage 10b - Arrow routing

Replace the current naive routing with an obstacle-aware, port-based router in TypeScript. Python retains only the existing A* router for batch/export parity. Keep this as a separate algorithm milestone from Stage 10a rather than mixing it into component-model cleanup.

### Stage 13 - Brand constraint enforcement (paused)

Resume once Stage 10a is stable. Constraint enforcement should stay type-agnostic and operate at model level, not through role-specific exceptions.

### Stage 14 - Design-language harness

Complete the validation harness around upstream specs: token change -> rebuild -> diff, visual regression, compliance scoring, and cross-format consistency checks. The goal is to use this repo as a reliable proof surface for spacing, type, and grid changes.

### Stage 15 - Cross-cutting zones

Add true semantic zones for groupings that span across panels and resolve them post-layout as overlays. Network-boundary panels should remain ordinary panel styling, not a separate structural concept.

### Stage 15a - Domain schema and model layer

Introduce typed domain schemas, model definitions, and view selection so diagrams can be validated before layout. This is where the future model/view/style split becomes real rather than aspirational prose.

### Design-foundry port checkpoint

Port `packages/layout-engine/` into design-foundry only when a real consumer exists there. Until then this repo remains the single autolayout codebase, and design-foundry should not grow a parallel implementation.

### Stage 16 - Layout algorithm survey and integration

Evaluate which additional engines are worth adding beyond v3 autolayout and D3-force, then prove them on real diagrams under brand constraints. Shared output contracts and final grid-snap enforcement matter more than engine count.

### Stage 17 - Self-service app

Evolve the preview/editor into a standalone tool with YAML editing, schema validation, templates, and production packaging. Build from the existing preview surface rather than starting a second app.

### Stage 18 - Agent workflow surface

Move the agent workflow up to typed YAML and validated views instead of layout code. Human review and manual polish should happen inside the app without breaking regeneration.

### Stage 19 - Fallback guardrails for manual tools

Support the unavoidable manual lane with draw.io and Penpot libraries, guidance, review checklists, and token exports. This stays an exception path, not the primary architecture.

### Stage 20 - Cross-team adoption

Pilot with real users, prove the validation harness, and expand to self-serve use across Canonical. Adoption only matters after the system is constrained and repeatable.

### Stage 21 - Compositor

Add a separate constraint/compositor layer for overlap, venn membership, weak or strong containment, and similar cases that do not fit simple tree or routed-edge models.
