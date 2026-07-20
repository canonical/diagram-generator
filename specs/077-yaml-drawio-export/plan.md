# Plan: Spec 077 YAML frame → draw.io export

## Approach

Mirror the SVG batch export shell (`export-frame-svg.mjs`) and reuse the same layout + routing owners as `emitFrameDiagramDisplayList`:

1. **Style port** — `packages/layout-engine/src/drawio/style-presets.ts` ports `scripts/drawio_style_presets.py` field semantics (rect, label, image, edge) without growing Python.
2. **mxGraph builder** — `packages/layout-engine/src/drawio/mxgraph-builder.ts` emits `mxfile` / `mxGraphModel` XML (behavior reference: `DrawioBuilder` in `scripts/export_drawio_batch.py`).
3. **Display-list adapter** — `packages/layout-engine/src/render-adapter/drawio.ts` consumes `emitFrameDiagramDisplayList`, registers connectable cells by frame id, and maps the shared render IR to mxGraph cells.
4. **CLI** — `packages/layout-engine/scripts/export-frame-drawio.mjs` loads YAML, HarfBuzz adapter, icons, writes `diagrams/2.output/draw.io/<slug>.drawio`.
5. **Theme owner** — `packages/layout-engine/src/drawio/theme.ts` maps canonical
   diagram colors to explicit draw.io `light-dark(light,dark)` pairs and keeps
   mxGraph `adaptiveColors="none"` so draw.io does not apply automatic adaptive
   heuristics on top of the exported theme.

## File map

| Path | Role |
|------|------|
| `packages/layout-engine/src/drawio/style-presets.ts` | Canonical draw.io style strings |
| `packages/layout-engine/src/drawio/mxgraph-builder.ts` | Cell/edge XML builder |
| `packages/layout-engine/src/drawio/icon-uri.ts` | Inline SVG data URIs for icons |
| `packages/layout-engine/src/drawio/rich-text.ts` | Label HTML values |
| `packages/layout-engine/src/render-adapter/drawio.ts` | Display-list → draw.io mapper |
| `packages/layout-engine/src/drawio/theme.ts` | draw.io light/dark color contract |
| `packages/layout-engine/scripts/export-frame-drawio.mjs` | CLI entry |
| `packages/layout-engine/tests/export-frame-drawio.test.ts` | ai-infra fixture regressions |
| `specs/077-yaml-drawio-export/theme-findings.md` | draw.io Light/Dark/Automatic research and chosen contract |

## Verification

- `npm --prefix packages/layout-engine test -- export-frame-drawio`
- `node scripts/check_no_new_python.mjs`
- Manual open-in-draw.io step per `spec.md` test plan, including Light, Dark,
  and Automatic appearance verification
