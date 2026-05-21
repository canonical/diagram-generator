# v3 Engine Audit

Date: 2026-05-21
Branch: `frame-layout-engine`

## Scope

This audit reviews the native frame-YAML / `layout_v3.py` pipeline and the preview/editor relayout bridge, with one question in mind: is v3 still moving toward a clean Figma/Penpot-style autolayout model, or are we starting to compensate for missing engine concepts in the UI?

## Judgment

The core direction is still correct.

- The engine model itself is coherent: `Direction`, per-axis `Sizing`, `Align`, bottom-up measure, top-down place, and coercion for circular HUG/FILL cases are the right primitives.
- The main risk has been preview-side ownership drift: when the editor invents or reconstructs layout facts that the engine should own, regressions look like patch-on-patch behavior.

The right guardrail is simple: Brockman grid stays, but grid semantics, text metrics, and relayout truth must live in the engine contract rather than in preview-only reconstruction code.

## Findings

### 1. Engine-owned Brockman grid is the correct path

Before this slice, v3 Brockman grid data was synthesized in the preview from root gap/padding and SVG size. That made the editor the authority for row/column gutters even though the layout engine was the real source of spatial truth.

This session moved Brockman metadata into the v3 result contract:

- `FrameDiagram` now carries explicit grid settings.
- `layout_frame_diagram(...)` now returns authoritative `grid_info`.
- `/api/relayout-v3/<slug>` now accepts `grid_overrides` and returns updated `grid_info`.
- The editor now consumes server-owned grid metadata instead of rebuilding it locally for the common path.

Why this matters: this is the difference between a clean engine boundary and a UI shim that slowly becomes a second layout engine.

Remaining follow-up:

- Add explicit `grid:` blocks to the active frame YAML files instead of leaning on fallback defaults.
- Treat the editor-side Brockman synthesis fallback as temporary compatibility code only.

### 2. Text measurement was drifting away from rendered behavior

The previous v3 text measurement path estimated wrapped height locally in `layout_v3.py`, while the SVG renderer wrapped lines separately. Mixed heading/body content could therefore be measured with different rules from the ones used to render it.

This session fixed the most concrete part of that drift:

- Shared `wrap_text_lines(...)` now lives in `diagram_shared.py`.
- Shared stepped line-height accumulation now lives in `diagram_shared.py`.
- `layout_v3.py` and `diagram_render_svg.py` now use the same wrap primitive.
- A regression test now covers mixed line-step leaf content.

Remaining follow-up:

- Re-audit any legacy callers that still assume “first line step wins” semantics through older helper paths.
- Add one browser/API regression covering wrapped headings with mixed text tiers.

### 3. Loader defaults are useful but too implicit

The loader currently treats omitted sizing as `fill` and infers `fixed` when width/height is set without an explicit sizing override.

That may be the right authored experience, but it is currently encoded as parser behavior rather than an explicit schema-level contract. The active frame YAML files already rely on those omissions, so the behavior must stay frozen intentionally rather than by accident.

Mitigation landed in this session:

- `scripts/test_frame_loader.py` now freezes the omission semantics, per-axis override behavior, padding defaults, and `grid:` parsing.

Required follow-up:

- Document the default sizing rules in the native frame-YAML contract.
- Keep the new loader tests aligned with any future contract changes instead of treating parser inference as an implementation detail.

### 4. Browser/API coverage still needs one more layer

The current v3 direction is much safer than the earlier “stack features and hope” phase, but the browser/API lane still needs a few focused regressions:

- Direct API test for `/api/relayout-v3/<slug>`
- Browser smoke for `Save SVG`
- Browser/API round-trip for separate Brockman `col_gap` / `row_gap`

Those are small tests, but they close the gap between a principled engine and a fragile editor shell.

## Current Direction

v3 is not patch-on-patch yet.

It is still a clean redesign as long as these rules hold:

1. Figma/Penpot behavior questions are answered in engine terms first.
2. Preview code may request relayout and display metadata, but it does not invent layout semantics.
3. YAML omissions do not silently become architecture; they are documented and tested.
4. Each new interaction feature gets a narrow behavior check before the next one lands.

## Recommended Next Slices

1. ~~Add explicit `grid:` config to the active frame YAMLs and remove dependence on editor-side Brockman defaults.~~ **Done** — all 4 active YAMLs now have `grid:` blocks.
2. ~~Add `/api/relayout-v3/<slug>` request/response tests for `grid_overrides`, coercion, and style overrides.~~ **Done** — 29 tests in `scripts/test_relayout_v3.py`.
3. ~~Document the native frame-YAML omission semantics that are now frozen in `scripts/test_frame_loader.py`.~~ **Done** — documented in `TODO.md` Milestone 10 section.
4. Continue using real diagrams one at a time, but only after each engine/preview slice is browser-verified.