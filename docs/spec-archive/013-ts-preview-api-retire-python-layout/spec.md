# Spec 013 – TypeScript preview API (retire Python layout for preview)

**Branch**: `feat/013-ts-preview-api-retire-python-layout`  
**Created**: 2026-06-03  
**Status**: Complete (preview frame-tree/grid/tree are TS-only via `preview_ts_layout.py`; Python `layout_v3` remains for pytest parity only)  
**Depends on**: Spec 011 (`frame-yaml-loader.ts`), Spec 012 (TS-only SVG)

## Mission

End the confusing **“preview JSON”** path: the browser must not depend on Python `frame_loader` + `layout_v3` for `/api/frame-tree`, `/api/grid`, or component tree data.

**Frame YAML on disk is the single source of truth.** Anything served over HTTP is a **derived, disposable DTO** produced by TypeScript from that YAML—never a parallel authority.

## Why `/api/frame-tree` JSON exists today (and why it is not a second truth)

| What | Role |
|------|------|
| `scripts/diagrams/frames/<slug>.yaml` | **Authority** — saved edits, git history, CI |
| `/api/frame-tree/<slug>` JSON | **Wire DTO** — Python parsed YAML → JSON for `deserializeFrame()` in the browser |
| Editor overrides | Ephemeral until **persisted into YAML** via save |

Spec 008 already required YAML-only authority; the gap is implementation—the server still **builds** that DTO with Python. This spec moves DTO construction to TS and documents that JSON is transport only.

**Target end state (optional follow-up):** browser loads YAML directly; server only serves static YAML + assets. Until then, JSON remains a cache-friendly snapshot of parsed YAML, not authored state.

## User scenarios

### US1 – Frame tree from TS (P1)

**Given** a v3 frame YAML, **When** `GET /api/frame-tree/<slug>`, **Then** response is produced by `frame-yaml-loader.ts` + `serializeFrameDiagram()` with **no** `frame_loader.py`.

### US2 – Grid + component tree from TS layout (P1)

**Given** the same slug, **When** `GET /api/grid/<slug>` or tree sidebar refresh, **Then** `grid_info` and component bounds come from `layoutFrameTree()` + `buildGridInfo()` + `buildComponentTree()` in TS.

### US3 – Retire `_get_layout_result` Python (P1)

**Given** US1–US2, **When** grepping `preview_server.py`, **Then** no `layout_v3.layout_frame_diagram` for preview paths.

### US4 – Document transport vs authority (P2)

**Given** `copilot-instructions.md` and spec 008, **When** an agent reads them, **Then** the frame-tree JSON endpoint is explicitly labeled derived-from-YAML.

## Non-goals

- Removing JSON wire format entirely (browser still deserializes to `Frame`)
- Deleting `frame_loader.py` before all batch paths use TS YAML loader (can remain for pytest until migrated)

## Deliverables

1. `grid-info.ts`, `component-tree.ts`, `frame-serialize.ts`
2. `scripts/emit-frame-diagram-json.mjs`, `scripts/layout-frame-diagram.mjs`
3. `preview_server.py` calls Node helpers; Python layout cache removed for preview
4. Tests for grid + component tree shape

## Success criteria

- Preview editor loads with Python layout subprocess disabled (env flag or code removal)
- 212+ TS tests green; preview flow test still passes
