# Spec 077: YAML frame → draw.io export

**Feature Branch**: `feat/077-yaml-drawio-export`
**Status**: Active
**Created**: 2026-07-07
**Context**: `docs/specs.md` (draw.io references), `DIAGRAM.md`, archived spec 022 interchange adapters, retained Python draw.io lane (`scripts/export_drawio_batch.py`).

## Problem

The product path compiles authored frame YAML through TypeScript layout and SVG export (`export-frame-svg.mjs`), but there is no YAML → `.drawio` path. The retained Python batch exporters are not wired to frame YAML and must not grow (`check_no_new_python` ratchet).

## Goals

- CLI: `node packages/layout-engine/scripts/export-frame-drawio.mjs --slug <name>` writes `diagrams/2.output/draw.io/<slug>.drawio`.
- Pipeline: compile author-v1 YAML → v3 layout (respect `meta.layout_engine` where the batch path supports it) → map positioned frame tree + routed arrows to draw.io mxGraph XML.
- Reuse draw.io style semantics from `scripts/drawio_style_presets.py` (ported to TypeScript constants).
- v1 coverage: rect vertices (section/parent/leaf/annotation, heading synthesis), icons, labeled edges.

## Non-goals (v1)

- Replacing hand-authored Python batch exporters.
- `drawio_review_workflow` / `style_sync` rewrites.
- Full fidelity parity with SVG preview for ELK-heavy diagrams.
- Preview UI export button (CLI first).

## Functional requirements

- **FR-001**: Export CLI accepts `--slug <name>` or a frame YAML path and optional `--out`.
- **FR-002**: Export uses `loadFrameYaml` + `layoutFrameTree` + arrow routing consistent with SVG display-list emit.
- **FR-003**: Rect frames emit draw.io vertices with canonical fill/stroke styles (white/grey/black, dashed borders).
- **FR-004**: Text blocks emit label cells with Ubuntu Sans and multiline HTML values.
- **FR-005**: Icons embed as `data:image/svg+xml` URIs from `assets/icons/*.svg`.
- **FR-006**: YAML arrows emit orthogonal orange edges with labels when authored.
- **FR-007**: Regression tests compile + export all three `ai-infra-*` fixtures without error.

## Success criteria

- **SC-001**: `npm --prefix packages/layout-engine test` passes including new draw.io suite.
- **SC-002**: `node scripts/check_no_new_python.mjs` passes.
- **SC-003**: All three ai-infra slugs export `.drawio` files that open in diagrams.net (manual verification documented in test plan).

## Test plan

1. Run targeted suite: `npm --prefix packages/layout-engine test -- export-frame-drawio`.
2. Batch export:
   ```bash
   node packages/layout-engine/scripts/export-frame-drawio.mjs --slug ai-infra-telecom-services-stack
   node packages/layout-engine/scripts/export-frame-drawio.mjs --slug ai-infra-telco-value-map
   node packages/layout-engine/scripts/export-frame-drawio.mjs --slug ai-infra-production-contract
   ```
3. Open each output under `diagrams/2.output/draw.io/` in [diagrams.net](https://app.diagrams.net/) (File → Open from → Device). Confirm boxes, icons, and labeled physical-row edges render without XML errors.
