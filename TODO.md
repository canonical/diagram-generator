*# TODO

## Purpose

This is the active execution queue for `diagram-generator`.

## Goal

Provide a cold-start-safe workflow and a consistent on-brand SVG system for redesigning batches of diagrams quickly, without re-deriving the style language from chat history every time.

## Scope

**In:** source-image intake, reference inspection, SVG redraws, icon selection from local assets, typography/layout normalization, reference-scaled proportions, workflow documentation, completed-work archiving.

**Out:** ad hoc extra markdown status files, new visual systems invented per diagram, non-local icon sourcing unless explicitly requested, rasterized final deliverables by default.

## Principles

1. Cold starts must be reliable: the next agent should not need prior chat context to continue.
2. Reference first: `diagrams/0.reference/sample.svg`, `diagrams/0.reference/sample.png`, and the user-updated `diagrams/0.reference/onbrand-svg-starter.svg` now define the canonical new-work block, arrow proportion, and overall visual weight; `diagrams/0.reference/_BRND-3284.drawio.svg` remains a secondary connector/layout reference.
3. For new diagrams, build from the sample block system: literal geometry, live text, natural-size local icons, and no hidden SVG reuse constructs.
4. Reuse exact style snippets: `diagrams/0.reference/onbrand-svg-starter.svg` is now the copy source for the canonical block proportions, inset rhythm, and literal orange arrow geometry.
5. Editable SVG over screenshots or embedded raster exports.
6. The imported dense application and documentation mapping from `canonical-specs` remains the reference tier, and the current diagram tier now uses `18px` body copy with `24px` line height to keep live text proportionate to the standard `48px` icon treatment inside the `192px` block system.
7. Orange is reserved for arrows and arrowheads; boxes do not get orange fills.
8. Geometry stays tight and reference-scaled; do not casually upscale diagrams.
9. Use local icons only, and omit the icon entirely when no suitable icon exists in `assets/icons/`.
10. The current canonical output exemplar is `diagrams/2.output/svg/memory-wall-onbrand.svg` (generated locally by `build_v2.py`); inspect it before treating any other output as precedent.
11. Canonical project state lives only in `STATUS.md`, `TODO.md`, `ROADMAP.md`, `HISTORY.md`, `INBOX.md`, `AGENT-INBOX.md`, and `docs/specs.md`.

## Architecture

### Safe draw.io evolution lane

- draw.io shape libraries and the scratchpad are copy-based insertion tools: they improve reuse for future additions, but changing a library item later does not retroactively update shapes already placed in diagrams.
- draw.io default shape and connector styles are editor-scoped convenience settings, useful during a manual edit session but not a durable repo-wide source of truth.
- For repo-wide style changes such as reducing top padding on text-bearing boxes, the real solution is a tokenized batch-update path over the diagram XML, not relying on manual paste-style passes.
- draw.io custom stencils are still useful for reusable special shapes because they can define geometry, connection points, and local style overrides while inheriting fill and stroke from the applied style when appropriate.
- Direct XML editing through draw.io and git-versioned `.drawio` files makes a deterministic merge and revert workflow feasible, provided generator-owned cells carry stable identity and provenance metadata.
- `assets/drawio/diagram-generator-primitives.mxlibrary` is the tracked reusable library export for the current canonical primitives, and `scripts/export_drawio_library.py` regenerates it during the canonical batch build.
- Generated draw.io cells now carry `data-dg-source`, `data-dg-role`, `data-dg-style-tokens`, and matching `tags`, so generator-owned cells can be filtered safely before any batch rewrite or merge logic touches them.
- `scripts/drawio_style_sync.py` is the batch rewrite entrypoint for tokenized style changes such as `spacingTop`, text spacing, connector styles, and dash patterns.
- Protected manual-edit workflow: when a manually polished draw.io file needs changes, create a mirrored review copy under `diagrams/2.output/draw.io/review/`, edit only that copy first, let the user review it, and promote it back only after checkpointing the original under `diagrams/2.output/draw.io/checkpoints/`.
- Use `scripts/drawio_review_workflow.py` for the routine copy-review-promote steps so the original manually edited file is never the first place changes land.

### Cold-start shareability findings

- The repo is runnable from the tracked workflow docs, starter-block references, icon library, draw.io primitive library, and generator scripts, so a fresh clone still preserves the core on-brand style system.
- The repo now carries the main input, output, compare, and reference lanes needed for internal cold starts without relying on a separate broader brand-language raster reference.
- The tracked corpus now includes the main reference, input, output, compare, and draw.io working lanes, so a fresh internal clone has enough material to inspect the end-to-end workflow without reconstructing missing assets.
- Compare pages resolve `diagrams/1.input/`, so the tracked HTML review lane stays self-contained for the current internal corpus.
- Conclusion: the repo is now cold-start-safe for internal sharing. The remaining PM-shareability work is curation and guided onboarding, not recovering missing tracked files.

### Diagram language contract

- `DIAGRAM.md` is the canonical plain-text diagram language spec. It owns tokens, rules, output constraints, and the default redraw workflow.
- `.github/copilot-instructions.md` keeps the short always-on guardrails.
- Workflow skills under `.github/skills/` hold repeatable procedures that should not bloat the permanent docs.

## Active TODO

### Editor UX

- [x] `[H]` **Resizable / auto-fit artboard.** ~~Resizing a box can push content off-canvas.~~ `autoFitArtboard()` now expands the SVG viewBox after move/resize when content overflows.
- [x] `[S]` **Text editing: literal `\n` instead of line breaks.** Textarea was joining/splitting on escaped `\\n` instead of real newlines, making the editor show `\n` characters and rendering all lines on one visual line. Fixed: use actual `\n` in join/split.
- [x] `[S]` **Arrow keys move box during text edit.** Document-level keydown handler did not guard against `TEXT_EDITING` mode; arrow keys nudged the selected box instead of navigating within the textarea. Fixed: added mode check + `stopPropagation` on all textarea keydown events.
- [x] `[S]` **Text editor line-height mismatch.** Textarea CSS had `line-height: 1.43` while SVG text uses 18px/24px = 1.333. Fixed: updated CSS to `1.333`.
- [x] `[H]` **Text reflow on box resize.** ~~Resizing a box changes the rect but text positions are static SVG coordinates.~~ Text now reflows on width change: `reflowTextInGroup()` measures each tspan against available width and wraps at word boundaries. Box height auto-expands (snapped to 8px grid) to fit wrapped text, and all subsequent grid rows shift down uniformly so nothing overlaps. Arrow endpoints track the reflow-induced shifts via the updated `sideShift` function.
- [x] `[S]` **Annotation autolayout.** ~~Right-column annotation text is laid out at fixed coordinates by the Python engine.~~ Root-level components now participate in grid relayout via `model.diagramGrid`. Resizing a box shifts same-row annotations automatically.
- [x] `[H]` **Click selection misses or selects wrong box.** `findComponentAtDepth` used model data from the Python layout engine for hit testing, but model coordinates diverge from the actual SVG rect positions (different widths, cumulative Y drift). Fixed: hit testing, resize handles, inspector position, and artboard fitting all now read from the SVG DOM + CSS transforms instead of stale model data.

### Code quality — from audits

- [x] `[H]` **`GridSpec` is dead code.** ~~Layout engine reads raw `panel.cols` etc. instead of `effective_*`.~~ Fixed: both `Panel` and `Diagram` now route through `effective_*` properties that respect `GridSpec`.
- [x] `[M]` **Diagonal arrows produce invisible arrowheads.** Fixed: `_polyline_arrow` now computes proper triangular geometry from the unit vector.
- [x] `[M]` ~~Resolve Python/YAML definition drift.~~ Preview server now falls back to YAML loader; build deduplicates colliding slugs; file watcher covers YAML/JSON.
- [ ] `[H]` Unify the parent-scoped equal-split/outdent math across `scripts/diagram_layout.py` and `scripts/preview/component-model.js`. Preview now consumes declared slots/spans and measured gutters, but the equal-split/outdent math itself is still duplicated between Python and JS.
- [ ] `[S]` **draw.io renderer uses spatial containment for parenting.** `_find_children` in `diagram_render_drawio.py` uses bounding-box overlap instead of `component_id`, which can mis-parent elements at shared edges. Fix: match by `component_id`.
- [ ] `[S]` **`_uniform_row_height` ignores Annotations/Helpers.** Rows containing only annotations get `BOX_MIN_HEIGHT` regardless of content. The post-hoc helper expansion partially compensates but runs after uniform equalization.
- [x] `[S]` Normalize active spec-provenance paths to `canonical-specs`. `DIAGRAM.md`, `README.md`, `STATUS.md`, `TODO.md`, and `docs/specs.md` now point at a sibling repo that actually exists in this workspace.
- [ ] `[S]` Triage the secondary audit findings: stale-v2 comparison risk in `build_outputs.py`, preview text-width mismatch vs renderer text width, dead helper layout code, stale architectural line-count notes in `STATUS.md`.
- [ ] `[S]` Triage the current `build_v2.py` corpus blockers separately from the 2026-05-13 autolayout slice: clearance violations on `example-platform-architecture`, `lightning-talk-engine`, `lt-diagram-generator`, `lt-a4-generator`, and `lt-summit-identity`, plus warning-only baseline-grid drift on several older diagrams.
### Force ↔ grid editor unification

Goal: the force and grid editors share one editor shell; swapping the layout engine should not duplicate interaction code. The audit below lists every grid-editor capability and its force-editor status. Items are ordered by user-facing impact.

**Architecture prerequisite**

- [ ] `[H]` **Single editor shell with swappable engine.** Refactor so `editor.js` and `force.js` share one interaction layer (select, drag, resize, text-edit, style, undo, keyboard, inspector, constraints). The layout back-end (grid relayout vs force tick) plugs in behind a common `LayoutEngine` interface. No duplicated DOM wiring.

**Stage interaction parity**

- [ ] `[H]` **Resize handles.** Force nodes need the same 8-handle resize affordance as grid components. Resize should update node `width`/`height` in the force session and restart the solver.
- [ ] `[S]` **Text editing.** Double-click a force node to edit its label in-place, same as the grid editor's `tspan` editing path.
- [ ] `[S]` **Multi-select.** Shift+click to select multiple force nodes; enable distribute/align controls on the multi-selection.
- [ ] `[S]` **Hover highlighting.** Show visual hover class on force nodes.
- [ ] `[L]` **Snap guides.** Show alignment snap guides during force-node drag (peer edge/center, 6px threshold).

**Inspector parity**

- [ ] `[S]` **Dirty flag and save-button state.** Track whether force session state differs from last save; disable Save when clean.
- [ ] `[S]` **Constraint enforcement.** Run the same fill/stroke/highlight-limit/containment checks on force nodes and display violations in the sidebar.
- [ ] `[L]` **Override highlight in tree.** Accent-color tree items that have overrides, matching the grid editor's convention.

**Persistence and undo**

- [ ] `[H]` **Undo/redo for force.** Add an undo stack (max 50 commands) covering move/pin, style change, text edit, and resize, using the same command-record pattern as the grid editor.
- [ ] `[S]` **Stale-definition detection.** Warn if the force spec JSON changes on disk while a session is live.

**Connectors and arrows**

- [ ] `[S]` **Arrow waypoint editing.** Allow dragging force-link control points (curve handles) interactively, with double-click to add/remove, matching the grid editor's waypoint path.
- [ ] `[S]` **Arrow endpoint attachment.** Force links should follow node moves via side-aware offset instead of recalculating from scratch.

**Keyboard shortcuts**

- [ ] `[L]` **Grid overlay toggle (W).** Decide whether force preview needs a baseline-grid overlay or if that concept doesn't apply.
- [ ] `[L]` **Keyboard nudge.** Arrow-key nudge (8px default, 24px with Shift) for pinned force nodes.
- [ ] `[L]` **Double-click depth cycling.** Decide whether force nodes need a depth-drill concept (probably N/A for flat graphs).

**Visual scale consistency**

- [ ] `[S]` **Consistent stroke/outline weight.** Force preview currently renders at a larger apparent scale, making outlines look thinner relative to text. Normalize the SVG viewBox / coordinate system so 1px strokes match the grid editor's visual weight.

**Export round-trip**

- [ ] `[S]` **Force → declarative pipeline.** Decide how force-preview exports feed back into `scripts/diagrams/*.py` or `build_v2.py`. Currently exports snapped JSON/SVG but does not round-trip.

### Force-specific UI controls

These controls only make sense for the force engine and don't need grid-editor parity.

- [ ] `[S]` **Link distance slider.** Expose `link_distance` (currently JSON-only) as a live inspector control; restart solver on change.
- [ ] `[S]` **Link strength slider.** Expose `link_strength` as a live inspector control.
- [ ] `[S]` **Charge strength slider.** Expose `charge_strength` as a live inspector control.
- [ ] `[S]` **Collision padding slider.** Expose `collision_padding` as a live inspector control.
- [ ] `[S]` **Velocity decay slider.** Expose `velocity_decay` as a live inspector control.
- [ ] `[S]` **Curve handle factor.** Expose the Bézier `handle_factor` (or `curve_offset`) as a live inspector control so the user can tune connector curvature interactively.
- [ ] `[L]` **Alpha min / alpha decay.** Expose convergence thresholds if users need to tune settle behavior.
- [ ] `[L]` **Preview port-kill on Windows.** `preview_server.py` runs `Stop-Process -Force` on any PID holding the port, even if it's an unrelated service. Fix: log the target PID or require `--force`.
- [ ] `[L]` **`_relayout` gap comparison uses reloaded module.** After `importlib.reload(mod)`, `orig_col_gap` reads from the new module state, not the pre-reload snapshot. Fix: capture originals before reload.

### Ongoing maintenance

- [ ] `[S]` Manual draw.io desktop smoke test for `diagrams/2.output/draw.io/*-onbrand.drawio` and `assets/drawio/diagram-generator-primitives.mxlibrary` when draw.io is available locally.
- [ ] `[S]` Manual Illustrator desktop smoke test for the SVG batch when Illustrator is available locally.
- [ ] `[S]` Keep refining `DIAGRAM.md` as more diagram types appear.
- [ ] `[S]` Re-audit generator helpers when the starter block changes, to prevent drift back into mixed inset or line-height rules.
- [ ] `[S]` Keep preview-shell experiments on the vendored BF application shell unless there is an explicit repo-wide reason to introduce new preview CSS.

### v2 declarative pipeline — defect registry

The audited canonical diagrams pass the compare/audit checks, but full `python scripts/build_v2.py` still exits nonzero on the known clearance blockers listed above. Use `python scripts/_compare_3way.py` for visual comparison and `python scripts/_audit_v2.py` for element counts. Arrow clearance and crossing remain enforced at build time.

| Diagram | Status |
|---|---|
| attention-qkv | OK |
| gpu-waiting-scheduler | OK |
| inference-snaps | OK |
| logic-data-vram | OK |
| memory-wall | OK |
| request-to-hardware-stack | OK |
| rise-of-inference-economy | OK |