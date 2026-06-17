# TODO

## Purpose

Active execution queue for `diagram-generator`. All new work targets TypeScript first. Python remains only in the retained draw.io lane.

**Jira:** This repo is Stream E (constrained editor) under [DE-941](https://warthogs.atlassian.net/browse/DE-941). Milestone-level issues tracked on Jira; detailed execution stays here and in `specs/`. See `diagram-generator-planning` for the broader project (corpus, taxonomy, Coda pages).

## Active TODO

### Priority 1 — Spec-kit tracked work

#### Compatible engine switcher (spec 035)

Feature package: `docs/spec-archive/035-compatible-engine-switcher/`.

- [ ] `[H]` **ELK layered drops headings and icons on parent containers.** Headed panels (e.g. Planning / Implementation / Delivery in `complex-routing-usecase`) lose title + icon treatment under `elk-layered`; headers should remain in the container chrome ELK lays out. Investigate, draft spec-kit fix package, add tier-2 flow map. Reported via inbox 2026-06-12.
- [ ] `[H]` **ELK layered does not honor non-fixed authored sizing semantics consistently on switched frame diagrams.** Switching a valid frame diagram from `v3` to `elk-layered` can collapse equal-width `FILL` stacks into uneven intrinsic widths because `layoutElkFrameDiagram()` currently measures nodes and hands ELK concrete box sizes instead of preserving the repo's non-fixed sizing behavior end-to-end. Explicit `FIXED` sizing should remain supported (including bulk "set same fixed size" editing); investigate on `support-engineering-flow` and `tiered-network-architecture`, then decide the TS-owned contract for ELK `FILL` / `HUG` per axis. Reported via inbox 2026-06-13.
- [ ] `[M]` **ELK parent/container text inset drifts from v3.** Top spacing above text, especially in parent-styled frames, varies under ELK compared with v3; align the chrome/text inset contract across engines.

#### ELK force core port (branch-only additive lane)

- [ ] `[H]` **Port the ontology's second-highest-demand ELK engine as an additional core package path.** The planning ontology ranks `elk-force` behind `elk-layered`; the first bounded core slice is now in `packages/graph-layout-elk` with `layoutForceForFamily()`. Next: expose it as an additive `elk-force` preview engine alongside the existing D3/quadtree `force` lane, not as a replacement for that engine.

#### Proposed next layout spec-kit packages

- [ ] `[H]` **`specs/031-state-machine-layout/` — branded state/lifecycle layout.** Target Mermaid `stateDiagram-v2` parity with Canonical typography, left-aligned labels, clear transition routing, and compound-state handling. Ontology: `state_and_lifecycle` is a confident keep.
- [ ] `[H]` **`specs/032-tree-mindmap-layout/` — tidy tree and mindmap layout.** Cover Mermaid `mindmap`-style and tree-form concept maps with branded node treatment, left-aligned text, and controllable branch spacing. Ontology: `concept_and_relationship_mapping` explicitly wants tree-form alternatives.
- [ ] `[H]` **`specs/033-swimlane-workflow-layout/` — lane-based workflow layout.** Bring a branded lane layout to process diagrams that currently stretch box layout. Target Mermaid-heavy engineering usage around flowcharts, subgraphs, and journey-like procedural flows. Ontology: `process_and_workflow` is high-volume and currently defers swimlanes.
- [ ] `[H]` **`specs/034-er-class-orthogonal-layout/` — branded ER/class relationship layout.** Support Mermaid-adjacent `erDiagram` / `classDiagram` usage with left-aligned entity text, orthogonal connectors, cardinality labels, and schema-friendly grouping. Ontology: `data_model_and_relationships` is smaller but structurally distinct and currently underserved.

#### Folder-backed editor app + nav unification (new spec needed)

- [ ] `[H]` **Draft a spec-kit package for a folder-backed editor app shell.** The preview should open a user-chosen diagram folder, populate the left nav from that folder instead of the fixed test list, and remove the duplicate diagram picker UI in favor of one coherent sidenav-driven navigation model.

#### Preview shell editor TS extraction (spec 043)

Review-closeout status: archived package `docs/spec-archive/043-preview-shell-editor-ts-extraction/` is extraction-complete. Only reopen it for a concrete browser-edge regression; registry/bundle/`layout-bridge.js` work moved to spec 044.

#### Preview shell architecture follow-up (spec 044)

- [ ] `[H]` **Define the post-043 shell contract and bundle plan.** Spec package: `specs/044-preview-shell-architecture-followup/`. Scope: replace the flat browser `LayoutEngine` bag with a staged contract/registry plan, define bundle boundaries, and map the `layout-bridge.js` decomposition path without reopening 043 as another long-running extraction spec.
- [ ] `[H]` **Finish the 044 review hardening passes.** Retire transitional root-level browser-entry aliases, split the oversized browser contract VM harness into smaller owner-scoped suites, and keep shrinking `layout-bridge.js` so it does not remain the browser-side integration sink.
- [ ] `[H]` **Grid-shell width changes must remeasure text immediately.** Manual width edits and resize interactions should re-run HarfBuzz/text wrapping so widened boxes unwrap and live preview matches the final dropped state.
- [ ] `[H]` **Interactive grid-shell resize should update during drag, not only on drop.** Investigate the live relayout/RAF path so resize feels responsive enough for Figma-like editing rather than delayed post-drop recompute.

#### Editor host endgame (spec 046)

- [ ] `[H]` **Finish the `editor.js` monolith reduction before adding more engine pressure.** Spec package: `specs/046-editor-host-endgame/`. Scope: explicit endgame for the remaining ~2.8k-line grid-shell entrypoint so it becomes genuinely thin bootstrap/event glue instead of a legacy browser trap file.

#### Render IR unification (spec 047, gated after 046)

- [ ] `[M]` **Park the renderer-convergence work until spec 046 is closed enough.** Spec package: `specs/047-render-ir-unification/`. Scope: converge preview/export geometry around one render IR authority with separate export-SVG and preview-DOM serializers, but do not start until the `editor.js` endgame is out of the critical path.

#### Preview host engine modularity (spec 045)

- [ ] `[H]` **Modularize the Node preview host for many more engine lanes.** Spec package: `specs/045-preview-host-engine-modularity/`. Scope: typed lane descriptors, shared page-shell builders, and staged `apps/preview/src/server.ts` shrink so new engines stop starting as server-local route/UI branches.

#### Output-only preview-shell chrome consistency (new spec needed)

- [ ] `[M]` **Draft a spec-kit package for output-only shell-chrome consistency.** The preview shell is intentionally output-only; unavailable reference content should degrade with placeholders rather than reintroducing Input / Output / Both compatibility panes. Preserve the existing editor demo structure and replace ad hoc preview-app CSS with Baseline Foundry-owned styling rather than inventing new UI.

#### Cross-engine multi-select align/distribute + bulk pin actions (new spec needed)

- [ ] `[H]` **Draft a new spec-kit package for multi-select align/distribute and bulk pin/unpin.** Investigate force first, then whether ELK can support the same UX through native constraints. Keep this separate from spec 024 unless the investigation proves the same data contract and controller shape can serve both.

#### PNG export (spec 018)

Feature package: `specs/018-png-export/`.

- [ ] `[H]` **Build the TS-SVG-to-PNG export path.** Add the CLI/server raster path, preview Save PNG action, and validation for Windows/WSL behavior.

#### Arrow routing redesign (spec 006)

Feature package: `specs/006-arrow-routing-redesign/`.

- [ ] `[H]` **Close the remaining spec 006 review follow-ups on this branch.** Browser router convergence is done; remaining major gaps are the full route-aware gap classifier (T080/T081), arrow dependency ordering + cycle diagnostics (T094), and moving final arrow geometry ownership out of the renderer path (T050-T052 / FR-005).
- [ ] `[H]` **Arrow routing breaks when container direction flips vertical ↔ horizontal.** v3 router convergence works in one orientation; inspector direction changes leave stale or wrong arrow geometry. Owner: spec 006 (`arrow-routing.ts`, `layout-bridge.js` patchArrowsSvg). Reported via inbox 2026-06-12.

#### Implicit ELK side ports (spec 042)

Feature package: `specs/042-implicit-elk-side-ports/`.

- [ ] `[H]` **Add automatic side-midpoint ports to ELK layered without YAML authoring.** Extend the shared graph IR, generate implicit ports in TypeScript, audit `portConstraints`, and validate on real drift-prone diagrams.

### Priority 2 — Standalone items

#### Top-level containers should default to FILL sizing

- [ ] `[M]` **Annotations and other top-level containers still default to HUG** instead of FILL, so they don't land on the grid.

#### Root element editable width/height

- [ ] `[S]` **Make root element width/height editable in the inspector.** Options: explicit value | HUG.

#### Code quality — adversarial audit items

#### Root direction change should reset children sizing to hug

- [ ] `[M]` **Switching root `direction` vertical→horizontal leaves top-level children as FILL on the old axis.** They should reset to HUG so authors re-opt in. Fix in the preview inspector direction handler (`editor.js`) and optionally in `apps/preview/src/persistence/frame-diagram.ts` when `direction` is saved on `page`. Reported during a preview editor pass on 2026-06-04.
- [ ] `[H]` **Add drag-and-drop reordering in the layers palette.** Needed to repair cases like `complex-routing-usecase` where an absolute-positioned overlay (`dev team`) should be a separate protruding layer rather than living inside the wrong container.
- [ ] `[M]` **Absolute-positioned items resize incorrectly from the left edge.** Left-edge resize currently expands the right side instead of moving the left boundary.
- [ ] `[M]` **Wrapped text in the parent variant loses consistent heading styling across lines.** A parent-frame line that wraps to two visual lines currently renders the first line bold and the second line non-bold; both lines should carry the same resolved style.

- [ ] `[M]` **M2. `ARROW_CLEARANCE` 3x defined (8/8/12).** Fix: one canonical value.
- [ ] `[M]` **M4. Silent enum fallbacks.** Bad `sizing`/`direction`/`align`/`variant` silently default. Fix: warn on unknown values.
- [ ] `[M]` **M5. Preview JSON contract stale.** Missing `justify`, `col_span`.

### Lower priority

- [ ] `[M]` Arrow routing tests
- [ ] `[S]` Constrained re-measurement tests
- [ ] `[S]` Layout idempotency test
- [ ] `[S]` Negative parser tests for invalid enums
- [ ] `[M]` Forward ontology — auto-select engine from `diagram_type` + `layout_engine`
- [ ] `[L]` Security hardening before Stage 17
- [ ] `[S]` Swappable engine interface — Phase 3+
- [ ] `[S]` Constraint enforcement on force nodes
- [ ] `[S]` Arrow waypoint editing / endpoint attachment
- [ ] `[S]` Consistent stroke/outline weight
- [ ] `[S]` Force → frame YAML round-trip
- [ ] `[L]` Grid overlay toggle (W) for force preview
- [ ] `[L]` Double-click depth cycling for force nodes
- [ ] `[S]` Keep refining `DIAGRAM.md` as more diagram types appear
