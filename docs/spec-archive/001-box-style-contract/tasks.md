# Tasks: Box style contract – three-tier level system

**Branch**: `feat/001-box-style-contract` | **Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md)

## Phase 1: Test infrastructure (blocking prerequisite)

- [x] T001 Create a minimal test YAML (`test-box-styles.yaml`) with one container (heading + icon + 2 leaf children) and one standalone leaf. No explicit fill/border/weight.
- [x] T002 Write pytest tests in `test_frame_loader.py` that assert the expected resolved styles after loading: container→grey fill, no border; leaf→transparent fill, solid border; heading→weight 700; label→weight 400.
- [x] T003 Write a pytest test that loads `test-box-styles.yaml`, runs layout + render, and asserts the FrameBox primitives have the correct fill/stroke values.

**Checkpoint**: Tests exist and fail (red) because the current loader doesn't resolve styles into a single path.

## Phase 2: Consolidate style resolution into frame_loader.py

- [x] T004 Add a `resolve_styles()` post-processing pass in `frame_loader.py` that runs after `_apply_frame()`. This pass walks the Frame tree and sets `fill`, `border`, stroke colour, and text weight to their correct resolved values based on the two-tier rules + variant overlays. Every box gets a 1px stroke; the stroke colour matches the fill for invisible borders (`#F3F3F3` for grey, `transparent` for annotations, `#000000` for highlight and outlined).
- [x] T005 Ensure `resolve_styles()` handles: (a) leaf defaults, (b) container defaults, (c) explicit YAML overrides preserved, (d) variant overlays applied last.
- [x] T005b Delete the `+1px` padding compensation hack from `_render_frame()` in `layout_v3.py`. With universal 1px strokes, padding is uniform and the hack is no longer needed.
- [x] T006 [P] Ensure heading lines synthesised for containers always get `weight: 700` and are positioned top-left.

**Checkpoint**: T002 tests pass (green). The loader now produces fully resolved styles.

## Phase 3: Simplify renderer to read resolved styles

- [x] T007 Refactor `_render_frame()` in `layout_v3.py` to remove the style-derivation block (lines ~1140–1165). Replace with direct reads from `frame.fill.value` and `frame.border` – no more `is_container` checks or fill coercion at render time.
- [x] T008 Verify T003 rendering tests pass.
- [x] T009 Run full regression: `python -m pytest test_frame_loader.py test_autolayout.py test_layout_v3.py test_parity.py -q` – all must pass.

**Checkpoint**: Renderer is a thin reader of resolved Frame properties. All tests green.

## Phase 4: Visual regression

- [x] T010 Render all diagrams (`glob diagrams/frames/*.yaml`) and confirm no errors.
- [x] T011 Browser-verify request-to-hardware-stack at `http://127.0.0.1:8100/view/v3:request-to-hardware-stack` – must match reference screenshot.
- [x] T012 Browser-verify lt-diagram-generator – highlight variant still produces black boxes with white text.
- [x] T013 Browser-verify android-security-comparison – heading text must be top-left, not centred.
- [x] T014 Browser-verify support-engineering-flow – cards with bold title + regular body text render correctly.

**Checkpoint**: All visual checks pass. Feature complete.

## Phase 5: Documentation

- [x] T015 Update DIAGRAM.md to document level system, semantic YAML principle, and allowed box styles.
- [x] T016 Commit engine changes and YAML cleanup.

## Phase 6: Three-tier level system (evolved from two-tier)

- [x] T017 Implement `_classify_levels()` bottom-up walk: L0 (root/wrapper/separator/headingless), L1 (leaf), L2 (heading + no panel descendants), L3 (heading + panel descendants).
- [x] T018 Update `resolve_styles()` to map levels to visual treatments: L2→grey fill, L3→outlined + small-caps bold heading.
- [x] T019 Add `variant: highlight` and `variant: annotation` overlay system in `_apply_variant()`.
- [x] T020 Update DIAGRAM.md with level table, semantic YAML principle, and non-rectangular shapes ban.

## Phase 7: HarfBuzz text measurement

- [x] T021 Replace fontTools glyph-advance-sum with uharfbuzz shaping in `diagram_shared.py`.
- [x] T022 Support OpenType features (`smcp`, `c2sc`) via `features` kwarg on `measure_text_width()`.
- [x] T023 Update SVG rendering to use `font-variant-caps: all-small-caps` on `<tspan>` (remove letter-spacing hack).
- [x] T024 Update `test_parity.py` mock to accept `features` kwarg.

## Phase 8: Semantic spacing defaults

- [x] T025 Change `frame_loader.py` gap defaults: panels→`INSET`(8), wrappers→`GRID_GUTTER`(24).
- [x] T026 Change grid defaults: `col_gap`/`row_gap`/`outer_margin` default to `GRID_GUTTER` when `grid:` section exists.
- [x] T027 Strip redundant `fill: grey/white` from all 31 frame YAMLs, convert `fill: black` + `icon_fill` to `variant: highlight`.
- [x] T028 Strip redundant `gap: 8`, `gap: 24`, `padding: 8`, and grid defaults from all YAMLs (140+ lines removed, zero visual changes).
- [x] T029 Visual regression: all 31 diagrams build, 226 tests pass, browser-verified key diagrams.

## Phase 9: Spec-kit artifact sync

- [x] T030 Update spec.md, plan.md, tasks.md to reflect three-tier system, HarfBuzz, and semantic spacing.

## Notes

- Tasks marked `[P]` can be parallelised with adjacent tasks.
- T004–T006 are the core implementation. T017–T028 evolved during implementation as the two-tier model proved insufficient.
- If any existing YAML breaks because it relied on the renderer's ad-hoc style coercion, fix the YAML (configuration change), not the engine.
