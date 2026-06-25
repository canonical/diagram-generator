# TODO

## Purpose

This file is a pointer, not an implementation queue.

Active implementation tasks belong in `specs/<id>-<slug>/tasks.md`. The
canonical active-spec index is `docs/specs.md`; if this file ever disagrees
with `docs/specs.md`, trust `docs/specs.md`.

**Jira:** This repo is Stream E (constrained editor) under
[DE-941](https://warthogs.atlassian.net/browse/DE-941). Milestone-level issues
are tracked on Jira. Repo execution should route through spec-kit packages.

## Current Cold-Start Focus

1. `specs/047-render-ir-unification/` is architecturally ready to close on
   `feat/047-render-ir-unification`. Fresh preview and export SVG both consume
   the shared display-list IR path; only merge/archive/admin work should remain
   on that branch.
2. `specs/051-preview-editor-contextual-aside/` is the active UI cleanup draft
   for engine/selection-driven right-aside visibility and grouping.
3. `specs/048-elk-sizing-interaction-followup/` is Closeout Ready; reopen only
   for fallout that directly affects the ELK sizing/interaction contracts.
4. `specs/046-editor-host-endgame/` remains architecturally closed. Reopen only
   if future work regresses by widening legacy JS sinks or central
   engine/document branches.
5. Other open work should be selected from `docs/specs.md`, then executed from
   that spec package's own `tasks.md`.

## Open Spec Pointers

Use `docs/specs.md` as the source of truth for active status, summaries, and
open package paths. Once an agent chooses a package, execute from that package's
`tasks.md`, not from this file.

## Spec Candidates

The old TODO contained implementation bullets for the areas below. Draft or
activate a spec-kit package before doing product work on them:

- Additional layout engines: state/lifecycle, tree/mindmap, swimlane workflow,
  ER/class orthogonal, and an additive `elk-force` preview lane.
- Editor workflow: folder-backed app navigation, cross-engine multi-select
  align/distribute, and bulk pin/unpin.
- Preview shell polish: output-only shell chrome consistency and Baseline
  Foundry-owned styling.
- Frame authoring polish: top-level container sizing defaults, root sizing and
  direction-change behavior, layers reordering, absolute left-edge resize, and
  parent wrapped-heading styling. Also harden the cold-start authoring rule so a
  new agent makes children nested inside a parent box use autolayout **fill**
  (not fixed width), preventing the gaps seen on freshly generated diagrams vs
  the iteratively authored example set (INBOX 2026-06-24).
- Contract hardening: canonical arrow clearance, invalid enum diagnostics,
  preview JSON schema freshness, parser negatives, constrained remeasurement,
  and layout idempotency coverage.
- Later backlog: ontology-driven engine selection, security hardening,
  force-node constraints/round-trip, arrow waypoint editing, stroke consistency,
  force grid/depth controls, and continued `DIAGRAM.md` refinement.
