# TODO

## Purpose

Active execution queue for `diagram-generator`. All new work targets TypeScript first. Python receives matching changes only for batch/export correctness.

**Jira:** This repo is Stream E (constrained editor) under [DE-941](https://warthogs.atlassian.net/browse/DE-941). Milestone-level issues tracked on Jira; detailed execution stays here and in `specs/`. See `diagram-generator-planning` for the broader project (corpus, taxonomy, Coda pages).

## Active TODO

### Priority 1 — Bugs

#### Highlight text contrast bug

- [ ] `[M]` **Highlight children have black text on black fill.** In `android-security-comparison`, the "Virtualized Android" panel uses highlight style (black fill), but child boxes render black text instead of white. Likely a resolved-style propagation gap. Reproduce: `v3:android-security-comparison`.

#### Fixed height input loses value on blur

- [ ] `[M]` **Inspector height input clears on focus-out instead of applying the value.** Set height to Fixed, type `128`, blur — the value disappears and the element doesn't resize. See `image-3.png`.

### Priority 2 — Spec-kit tracked work

#### Autolayout hardening — semantic mutation removal (spec 005) — NEXT

Feature package: `specs/005-autolayout-hardening/` — 0/24 tasks done. **Target: TypeScript `layout.ts` as primary engine.** Python receives equivalent changes only for parity verification.

The code hardening work — eliminating Frame tree mutation during layout — has not started. This is the top architecture debt item. The key problem is that `layout.ts` (and `layout_v3.py`) directly mutate `frame.width` and `frame.sizing_w` during col_span resolution and FILL/HUG coercion. Layout should use derived-only fields and stop mutating semantic Frame fields.

- [ ] `[H]` **H1. Layout mutates Frame tree.** `col_span` rewrites `width`/`sizing_w`; FILL/HUG coercion rewrites parent sizing; root width save/mutate/restore is fragile. Fix: layout-only derived fields.
	Coercion bookkeeping no longer mutates semantic fields in TS or Python, and the preview editor no longer saves runtime auto-coercion back into overrides/YAML. Remaining slice: root-width temporary mutation and `col_span` width rewriting.
- [ ] `[H]` **H3. Heading synthetic child incomplete.** `__body` no longer copies `wrap`, `fill_weight`, `justify` from parent. Document as settled.
- [ ] `[M]` **H5. Leaf measure vs render padding mismatch.** Measurement uses INSET, rendering uses per-side padding + 1px hack. Fix: use `frame.padding_*` in measurement.

#### Repo coherence — resolved-style snapshot (spec 008 Phase 5)

Feature package: `specs/008-repo-coherence-rewrite/` — Phases 1–4 and 6–8 complete. Phase 5 (T040–T047, 8 tasks) is the remaining work.

- [ ] `[S]` T040–T044: Define resolved-style snapshot fields, populate in resolvers, replace raw contrast branches.
- [ ] `[S]` T045–T047: Resolved-style regression tests and full suites.

### Priority 3 — Standalone items

#### Top-level containers should default to FILL sizing

- [ ] `[M]` **Annotations and other top-level containers still default to HUG** instead of FILL, so they don't land on the grid.

#### Root element editable width/height

- [ ] `[S]` **Make root element width/height editable in the inspector.** Options: explicit value | HUG.

#### Code quality — adversarial audit items

Full audit: `docs/architecture/adversarial-audit-2026-05-27.md`.

- [ ] `[M]` **M2. `ARROW_CLEARANCE` 3x defined (8/8/12).** Fix: one canonical value.
- [ ] `[M]` **M4. Silent enum fallbacks.** Bad `sizing`/`direction`/`align`/`variant` silently default. Fix: warn on unknown values.
- [ ] `[M]` **M5. Preview JSON contract stale.** Missing `justify`, `col_span`.
- [ ] `[S]` **M6. `estimate_line_width` duplicated.** `diagram_shared.py` vs `text_metrics.py`.

### Priority 4 — Future specs

#### Arrow routing redesign (spec 006)

Feature package: `specs/006-arrow-routing-redesign/` — 0/25 tasks done. TS-only. Not blocking.

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
