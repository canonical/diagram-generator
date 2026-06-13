# Plan: Spec 013 – TS preview API

## Phase 1 – TS layout artifacts (this PR)

- `buildGridInfo(diagram, root)` — port from `layout_v3._build_grid_info`
- `buildComponentTree(root)` — port from `layout_v3._build_component_tree`
- `serializeFrameDiagram(diagram)` — mirror `_serialize_frame_diagram` field names

## Phase 2 – Node CLIs

- `emit-frame-diagram-json.mjs --slug X` → stdout JSON for frame-tree endpoint
- `layout-frame-diagram.mjs --slug X` → `{ width, height, gridInfo, componentTree, coerced }`

## Phase 3 – Wire preview_server

- Replace `_load_frame_diagram` / `_serialize_frame_diagram` / `_get_layout_result` preview usages
- Keep Python loader only if TS subprocess fails (temporary), then remove

## Phase 4 – Docs + delete Python preview layout

- Update spec 008/009 references
- Remove `_layout_cache` Python path when TS stable
