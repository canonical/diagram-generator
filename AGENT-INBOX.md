# Agent Inbox

Machine-generated handoffs, long diagnostics, and cross-repo follow-up notes go here.

Do not use this file for user notes. User-authored async notes belong in `INBOX.md`.

The agent should triage anything durable from this file into `TODO.md`, `ROADMAP.md`, `STATUS.md`, `HISTORY.md`, or `docs/specs.md`, then empty this file back to this header template.

---

## Forward ontology contract landed (2026-05-27, from diagram-generator-planning)

The forward ontology contract is now implemented. Changes:

### Frame model (`scripts/frame_model.py`)
- `FrameDiagram` has 4 new optional fields: `diagram_type`, `abstraction_level`, `layout_engine`, `presentation_form`
- `svg_meta()` helper returns non-None fields as a dict for the renderer

### Frame loader (`scripts/frame_loader.py`)
- Reads a `meta:` block from v3 frame YAML and populates the new fields

### SVG renderer (`scripts/diagram_render_svg.py`)
- `_svg_open()`, `render_svg()`, `write_svg()` accept optional `meta` dict
- When meta is present, emits `xmlns:dg="https://canonical.com/ns/diagrams#"` and a `<metadata>` element with `dg:`-prefixed taxonomy fields

### JSON schema (`docs/diagram-schema.json`)
- New `meta` object with `diagram_type` (8-family enum), `abstraction_level` (4 C4 levels), `layout_engine` (6 engines), `presentation_form` (3 forms)

### Example YAML usage
```yaml
engine: v3
title: MAAS deployment
meta:
  diagram_type: infrastructure_and_network_topology
  abstraction_level: container
  layout_engine: elk-force
root:
  # ...
```

### Follow-up items for diagram-generator
- [ ] Wire `diagram.svg_meta()` into the build pipeline (`build_v2.py`, `build_outputs.py`) so generated SVGs carry metadata automatically
- [ ] Add a validation step to `frame_loader.py` that warns on unknown `diagram_type` or `abstraction_level` values (the allowed values list should come from the schema seed or the JSON schema enum)
- [ ] After the ontology-to-layout mapping layer lands, use `diagram_type` + `layout_engine` to auto-select the engine instead of hardcoding

