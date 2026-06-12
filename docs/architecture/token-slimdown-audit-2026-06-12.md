# Token Slimdown Note — 2026-06-12

Purpose: keep the repo aligned to the live YAML -> TypeScript -> SVG path with minimal non-runtime baggage.

Removed:

- Python oracle files
- Python preview tests and harnesses
- Python one-off utilities outside draw.io
- large stale audit/history markdown files

Retained Python:

- `scripts/diagram_shared.py`
- `scripts/drawio_review_workflow.py`
- `scripts/drawio_style_presets.py`
- `scripts/drawio_style_sync.py`
- `scripts/drawio_style_tokens.py`
- `scripts/export_drawio_batch.py`
- `scripts/export_drawio_library.py`
- `scripts/export_layer3_mpls.py`
- `scripts/export_memory_wall_drawio.py`

Validation:

```bash
node scripts/check_no_new_python.mjs
npm --prefix apps/preview test
npm --prefix packages/layout-engine test
```
