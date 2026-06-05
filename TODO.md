# TODO

## Purpose

Active execution queue for `diagram-generator`. All new work targets TypeScript first. Python receives matching changes only for batch/export correctness.

**Jira:** This repo is Stream E (constrained editor) under [DE-941](https://warthogs.atlassian.net/browse/DE-941). Milestone-level issues tracked on Jira; detailed execution stays here and in `specs/`. See `diagram-generator-planning` for the broader project (corpus, taxonomy, Coda pages).

## Active TODO

### Priority 1 — Spec-kit tracked work

#### Force layout restoration (spec 023)

Feature package: `specs/023-force-layout-restoration/`.

- [ ] `[H]` **Finish the remaining spec 023 cleanup.** Save persistence, shared frame-style variants, and stable live inspector interactions are now back on the TS force lane. Remaining work: rewrite or retire `scripts/benchmark_force.py`, add focused automated coverage for force demo discovery/routes, and add focused save/reset/export/browser tests.

#### PNG export (spec 018)

Feature package: `specs/018-png-export/`.

- [ ] `[H]` **Build the TS-SVG-to-PNG export path.** Add the CLI/server raster path, preview Save PNG action, and validation for Windows/WSL behavior.

#### Diagram authoring AST (spec 022)

Feature package: `specs/022-diagram-authoring-ast/`.

- [ ] `[H]` **Start the authoring compiler slice.** AST types, YAML compile pipeline, legacy normalization, lower-to-frame, and Mermaid/D2 exporters are all still untouched.

#### Arrow routing redesign (spec 006)

Feature package: `specs/006-arrow-routing-redesign/`.

- [ ] `[H]` **Keep spec 006 parked as the next major routing slice.** Entire routing redesign plan remains open; not blocking the current editor work.

### Priority 2 — Standalone items

#### Top-level containers should default to FILL sizing

- [ ] `[M]` **Annotations and other top-level containers still default to HUG** instead of FILL, so they don't land on the grid.

#### Root element editable width/height

- [ ] `[S]` **Make root element width/height editable in the inspector.** Options: explicit value | HUG.

#### Code quality — adversarial audit items

#### Root direction change should reset children sizing to hug

- [ ] `[M]` **Switching root `direction` vertical→horizontal leaves top-level children as FILL on the old axis.** They should reset to HUG so authors re-opt in. Fix in the preview inspector direction handler (`editor.js`) and optionally in `frame_yaml_persistence.py` when `direction` is saved on `page`. Reported during a preview editor pass on 2026-06-04.
- [ ] `[H]` **Add drag-and-drop reordering in the layers palette.** Needed to repair cases like `complex-routing-usecase` where an absolute-positioned overlay (`dev team`) should be a separate protruding layer rather than living inside the wrong container.
- [ ] `[M]` **Absolute-positioned items resize incorrectly from the left edge.** Left-edge resize currently expands the right side instead of moving the left boundary.
- [ ] `[M]` **Wrapped text in the parent variant loses consistent heading styling across lines.** A parent-frame line that wraps to two visual lines currently renders the first line bold and the second line non-bold; both lines should carry the same resolved style.

Full audit: `docs/architecture/adversarial-audit-2026-05-27.md`.

- [ ] `[M]` **M2. `ARROW_CLEARANCE` 3x defined (8/8/12).** Fix: one canonical value.
- [ ] `[M]` **M4. Silent enum fallbacks.** Bad `sizing`/`direction`/`align`/`variant` silently default. Fix: warn on unknown values.
- [ ] `[M]` **M5. Preview JSON contract stale.** Missing `justify`, `col_span`.
- [ ] `[S]` **M6. `estimate_line_width` duplicated.** `diagram_shared.py` vs `text_metrics.py`.
- [ ] `[L]` **Legacy Python parity harness drift.** `scripts/test_parity.py` still reconstructs the pre-WS3 heading/body model, so full `pytest scripts -q` has 5 stale failures. Either realign it with the current loader contract or retire it as a non-gating legacy oracle; do not block TS work on it.

### Lower priority

- [ ] `[M]` Arrow routing tests
- [ ] `[S]` Constrained re-measurement tests
- [ ] `[S]` Layout idempotency test
- [ ] `[S]` Negative parser tests for invalid enums
- [ ] `[M]` Forward ontology — auto-select engine from `diagram_type` + `layout_engine`
- [ ] `[S]` `preview_server.py` decomposition (post-port)
- [ ] `[L]` Security hardening before Stage 17
- [ ] `[S]` `EditorState` container — replace 40+ globals
- [ ] `[S]` Swappable engine interface — Phase 3+
- [ ] `[S]` Constraint enforcement on force nodes
- [ ] `[S]` Arrow waypoint editing / endpoint attachment
- [ ] `[S]` Consistent stroke/outline weight
- [ ] `[S]` Force → frame YAML round-trip
- [ ] `[L]` Grid overlay toggle (W) for force preview
- [ ] `[L]` Double-click depth cycling for force nodes
- [ ] `[S]` Keep refining `DIAGRAM.md` as more diagram types appear
