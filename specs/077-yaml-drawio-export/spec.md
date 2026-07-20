# Spec 077: YAML frame → draw.io export

**Feature Branch**: `feat/077-yaml-drawio-export`
**Status**: Active
**Created**: 2026-07-07
**Context**: `docs/specs.md` (draw.io references), `DIAGRAM.md`, archived spec 022 interchange adapters, retained Python draw.io lane (`scripts/export_drawio_batch.py`).

## Problem

The product path compiles authored frame YAML through TypeScript layout and SVG export (`export-frame-svg.mjs`), but there is no YAML → `.drawio` path. The retained Python batch exporters are not wired to frame YAML and must not grow (`check_no_new_python` ratchet).

Manual diagrams.net verification found a theme issue: when the editor follows a
dark OS/browser appearance, exported diagrams can render against the dark editor
surface instead of the intended Canonical light diagram surface. The exporter
currently writes `background="light-dark(#ffffff, #ffffff)"` and
`adaptiveColors="none"` on `mxGraphModel`, but that is not sufficient evidence
that draw.io will preserve the intended light canvas and colours in all supported
open/export paths.

## Goals

- CLI: `node packages/layout-engine/scripts/export-frame-drawio.mjs --slug <name>` writes `diagrams/2.output/draw.io/<slug>.drawio`.
- Pipeline: compile author-v1 YAML → v3 layout (respect `meta.layout_engine` where the batch path supports it) → map positioned frame tree + routed arrows to draw.io mxGraph XML.
- Reuse draw.io style semantics from `scripts/drawio_style_presets.py` (ported to TypeScript constants).
- v1 coverage: rect vertices (section/parent/leaf/annotation, heading synthesis), icons, labeled edges.
- Theme contract: exported `.drawio` files must either define an intentional
  adaptive light/dark palette or explicitly pin the Canonical light theme so the
  diagram remains legible when diagrams.net is in Light, Dark, or Automatic
  appearance.

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
- **FR-008**: Theme handling is researched against diagrams.net/draw.io's
  adaptive-colour model before implementation. The accepted fix must document
  whether the exporter uses per-page adaptive colours, disables adaptation and
  pins the light canvas, or emits paired light/dark style values.
- **FR-009**: The generated XML includes a repo-owned, testable theme contract:
  page background, shape fills, strokes, text, icons, and arrow colours remain
  legible when opened in diagrams.net with Light, Dark, and Automatic
  appearance.

## Success criteria

- **SC-001**: `npm --prefix packages/layout-engine test` passes including new draw.io suite.
- **SC-002**: `node scripts/check_no_new_python.mjs` passes.
- **SC-003**: All three ai-infra slugs export `.drawio` files that open in diagrams.net (manual verification documented in test plan).
- **SC-004**: Theme verification is documented for at least one representative
  ai-infra export in diagrams.net Light, Dark, and Automatic appearance. The
  note must say whether the final contract is adaptive or pinned-light, and name
  the XML attributes/style fields that enforce it.

## Theme research notes

- draw.io treats dark mode as an editor appearance that may follow the browser or
  OS when Appearance is set to Automatic.
- draw.io adaptive colours are saved per diagram page and can define specific
  light and dark values for shapes, connectors, text, and the diagram page
  background.
- The docs explicitly allow using the same colour value in both light and dark
  fields when the intent is to keep a colour unchanged across modes.
- Exported draw.io/PDF/HTML/URL and light-mode image paths are documented as
  displaying the light background and light palette, but opening a `.drawio` in a
  dark editor can still apply the editor's dark-mode rendering model. The spec
  must therefore verify the editable `.drawio` open path, not only image export.

Primary references:

- <https://www.drawio.com/docs/manual/editor/appearance/adaptive-colours/>
- <https://www.drawio.com/docs/manual/editor/appearance/dark-mode/>
- <https://www.drawio.com/docs/manual/editor/appearance/>
- <https://www.drawio.com/blog/dark-mode-diagrams/>

## Test plan

1. Run targeted suite: `npm --prefix packages/layout-engine test -- export-frame-drawio`.
2. Batch export:
   ```bash
   node packages/layout-engine/scripts/export-frame-drawio.mjs --slug ai-infra-telecom-services-stack
   node packages/layout-engine/scripts/export-frame-drawio.mjs --slug ai-infra-telco-value-map
   node packages/layout-engine/scripts/export-frame-drawio.mjs --slug ai-infra-production-contract
   ```
3. Open each output under `diagrams/2.output/draw.io/` in [diagrams.net](https://app.diagrams.net/) (File → Open from → Device). Confirm boxes, icons, and labeled physical-row edges render without XML errors.
4. Theme verification: for at least one representative export, switch
   diagrams.net through Settings/Appearance Light, Dark, and Automatic. Confirm
   the diagram canvas remains intentionally light or intentionally adaptive, and
   that black/grey text, icons, borders, and orange arrows remain legible.
5. Inspect Page Setup / adaptive-colour settings and the saved XML after any
   manual experiment. Record the specific `mxGraphModel` attributes and style
   fields needed by the implementation before changing exporter code.
