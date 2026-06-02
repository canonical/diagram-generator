# TODO

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
6. Canonical project state lives only in `STATUS.md`, `TODO.md`, `ROADMAP.md`, `HISTORY.md`, `INBOX.md`, `AGENT-INBOX.md`, and `docs/specs.md`.

## Architecture

### Diagram language contract

- `DIAGRAM.md` is the canonical plain-text diagram language spec. It owns tokens, rules, output constraints, and all visual-language decisions.
- `.github/copilot-instructions.md` owns workflow discipline and the anti-patch protocol.
- Workflow skills under `.github/skills/` hold repeatable procedures that reference `DIAGRAM.md` for rules.
- Do not duplicate visual rules across files. If the same rule appears in two places, delete one.

## Active TODO

### Priority 1 – Spec-kit tracked work

#### ~~DIAGRAM.md token audit and HUG sizing fix (spec 010) – DONE~~

Feature package: `specs/010-diagram-token-audit/` – 46/46 tasks, all 3 phases complete.

- ~~Part 1: Audit every hardcoded value in DIAGRAM.md – classify as invariant / default / sample-artifact~~
- ~~Part 2: Remove the `BLOCK_WIDTH` (192px) floor from HUG leaf measurement in both engines~~
- ~~Part 3: Column-span conditional display in the width inspector (P2, independent)~~

#### Autolayout hardening – semantic mutation removal (spec 005) – NEXT

Feature package: `specs/005-autolayout-hardening/` – 0/24 tasks done.

The corpus visual audit is complete (all 23 diagrams verified). The code hardening work – eliminating Frame tree mutation during layout – has not started. This is the top architecture debt item.

**Key problem:** `layout_v3.py` directly mutates `frame.width` and `frame.sizing_w` during col_span resolution and FILL/HUG coercion. Layout should use derived-only fields and stop mutating semantic Frame fields.

- [ ] `[H]` **H1. Layout mutates Frame tree.** `col_span` rewrites `width`/`sizing_w`; FILL/HUG coercion rewrites parent sizing; root width save/mutate/restore is fragile. Fix: layout-only derived fields, stop mutating semantic Frame fields.
- [ ] `[H]` **H3. Heading synthetic child incomplete.** `__body` no longer copies `wrap`, `fill_weight`, `justify` from parent. Corpus audit shows no regressions, but the behaviour is intentional – document as settled.
- [ ] `[M]` **H5. Leaf measure vs render padding mismatch.** Measurement uses INSET, rendering uses per-side padding + 1px hack. Fix: use `frame.padding_*` in measurement.

#### Repo coherence – resolved-style snapshot (spec 008 Phase 5)

Feature package: `specs/008-repo-coherence-rewrite/` – Phases 1–4 and 6–8 complete. Phase 5 (T040–T047, 8 tasks) is the remaining work.

Resolved-style fields exist in concept but the full snapshot pipeline (model fields → population → consumer replacement → tests) is not wired end-to-end.

- [ ] `[S]` T040–T044: Define resolved-style snapshot fields, populate in resolvers, replace raw contrast branches in renderers.
- [ ] `[S]` T045–T047: Write resolved-style regression tests and run full suites.

### Priority 2 – Standalone bugs and code quality

#### Highlight text contrast bug

- [ ] `[M]` **Highlight children have black text on black fill.** In `android-security-comparison`, the "Virtualized Android" panel uses highlight style (black fill), but its child boxes render black text instead of white. The highlight variant should propagate white text/icon colour to children. Likely a resolved-style propagation gap – the parent's highlight semantics aren't reaching nested leaves through the style resolver. (Note: original screenshot `image-3.png` deleted; reproduce by opening `v3:android-security-comparison` in preview.)

#### Top-level containers should default to FILL sizing

- [ ] `[M]` **Annotations and other top-level containers still default to HUG** instead of FILL, so they don't land on the grid. We planned to default top-level containers to FILL so they span their grid columns. The document grid is also often constrained to an area smaller than the full diagram canvas — review how root grid width is determined.

#### Root element editable width/height

- [ ] `[S]` **Make root element width/height editable in the inspector.** Options: explicit value | HUG. Currently the root element's dimensions aren't editable.

#### Code quality – adversarial audit items

Full audit: `docs/architecture/adversarial-audit-2026-05-27.md`.

- [ ] `[M]` **M2. `ARROW_CLEARANCE` 3x defined (8/8/12).** Fix: one canonical value.
- [ ] `[M]` **M4. Silent enum fallbacks.** Bad `sizing`/`direction`/`align`/`variant` silently default. Fix: warn on unknown values.
- [ ] `[M]` **M5. Preview JSON contract stale.** Missing `justify`, `col_span`.
- [ ] `[S]` **M6. `estimate_line_width` duplicated.** `diagram_shared.py` vs `text_metrics.py`.

### Test gaps

- [ ] `[M]` Arrow routing tests
- [ ] `[S]` Constrained re-measurement tests
- [ ] `[S]` Layout idempotency test
- [ ] `[S]` Negative parser tests for invalid enums

### Arrow routing redesign (spec 006)

Feature package: `specs/006-arrow-routing-redesign/` – 0/25 tasks done. Future work, not blocking.

The current A* router is functional but has structural issues. The redesign adds a port model, multi-factor side inference, per-arrow obstacle sets, and crossing minimization. See `docs/architecture/arrow-routing-redesign.md`.

### Forward ontology – build pipeline integration

- [ ] `[M]` **After ontology-to-layout mapping lands, use `diagram_type` + `layout_engine` to auto-select the engine.** Depends on the mapping layer from `diagram-generator-planning`.

### Overlays – remaining items

- [ ] `[M]` **Mermaid structured import/export adapter.** Parse/emit the `structured-beta` DSL format for interchange with canonical/mermaid. Low priority – may be obsolete.

### Interactive/editor follow-ups

- [ ] `[S]` **`preview_server.py` decomposition (post-port).** Extract file watcher, layout cache, override manager, and SSE broadcaster into focused modules.
- [ ] `[L]` **Security hardening before Stage 17.** Add schema validation for incoming JSON. Add CSRF when server becomes network-accessible. Not urgent while server is local-only.
- [ ] `[S]` **`EditorState` container.** Introduce structured state container with pure update functions and event emitter. Replace 40+ globals.

### Force ↔ grid editor unification

- [ ] `[S]` **Swappable engine interface — Phase 3+.** Create concrete `GridEngine` / `ForceEngine` adapter subclasses implementing `EngineAdapter`.
- [ ] `[S]` **Constraint enforcement.** Run the same checks on force nodes.
- [ ] `[S]` **Arrow waypoint editing / endpoint attachment.**
- [ ] `[S]` **Consistent stroke/outline weight.**
- [ ] `[S]` **Force → frame YAML round-trip.**
- [ ] `[L]` **Grid overlay toggle (W) for force preview.**
- [ ] `[L]` **Double-click depth cycling for force nodes.**

### Ongoing maintenance

- [ ] `[S]` Manual draw.io desktop smoke test when draw.io is available locally.
- [ ] `[S]` Manual Illustrator desktop smoke test when Illustrator is available locally.
- [ ] `[S]` Keep refining `DIAGRAM.md` as more diagram types appear.
- [ ] `[S]` Re-audit generator helpers when the starter block changes.
- [ ] `[S]` Keep preview-shell experiments on the vendored BF application shell.
