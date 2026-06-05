# Research: Diagram authoring AST (spec 022)

**Date**: 2026-06-05

## Current authoring format (v3 frame YAML)

| Aspect | Current state |
|--------|----------------|
| Engine marker | `engine: v3` on every frame diagram |
| Connections | Top-level `arrows:` array of `{ source, target, ... }` |
| Hierarchy | Top-level `root:` recursive tree; every child uses `id:` |
| Node vs container | **Not distinguished** — any frame with `children` is a container |
| Templates | **None** — copy/paste labels and icons |
| Loader (TS) | `packages/layout-engine/src/frame-yaml-loader.ts` → `FrameDiagram` |
| Loader (Py) | `scripts/frame_loader.py` — legacy parity |
| Persistence | `scripts/frame_yaml_persistence.py` still writes `arrows` |
| Runtime edges | `FrameDiagram.arrows: Arrow[]` in `frame-model.ts` |
| Preview | Deserializes JSON DTO; does not re-parse YAML grammar |

## Example verbosity pain (`tiered-network-architecture.yaml`)

- 13 arrow objects × 2 lines each ≈ 26 lines for edges alone
- Every hierarchy item uses `id:` + nested structure without role discrimination
- Repeated client/server label+icon blocks (no `defaults`)

## Related but separate schemas

- **`docs/diagram-schema.json`** — ontology/components schema for agent tooling; different shape (`components`, `meta.diagram_type`). This spec does **not** merge with that file in v1; document cross-link only.
- **Mermaid workspace** (`../mermaid/`) — separate repo; no Mermaid exporter in diagram-generator today.

## Export landscape

| Target | Exists? | Notes |
|--------|---------|-------|
| SVG (on-brand) | Yes | `svg-render.ts`, `export-frame-svg.mjs` |
| draw.io | Partial | Python/batch legacy |
| Mermaid | **No** | To add as AST adapter |
| D2 | **No** | To add as AST adapter |

## Recommended integration point

Add compiler module under `packages/layout-engine/src/diagram-author/`:

```
compileDiagramYaml(raw: string): CompileResult
  → { ast: DiagramDocument, warnings, deprecations }
  → lowerToFrameDiagram(ast): FrameDiagram
```

Wire `frame-yaml-loader.ts` to call compiler (thin wrapper) so existing `loadFrameYaml(path)` API unchanged.

Exporters:

- `packages/layout-engine/src/export-mermaid.ts`
- `packages/layout-engine/src/export-d2.ts`
- CLI: `packages/layout-engine/scripts/export-mermaid.mjs`, `export-d2.mjs`

## Risks

| Risk | Mitigation |
|------|------------|
| Breaking 18-diagram corpus | Compat normalizer + golden SVG unchanged post-lower |
| Duplicating frame_loader logic | Single TS compiler; Python reads TS JSON or lags |
| Preview persistence writes old shape | Phase 2: persistence emits new schema opt-in |
| Exporters drift from renderer | Exporters read AST only; golden tests per adapter |

## Open decisions (resolve in implementation)

1. **`schema: author-v1` field** — add alongside `engine: v3` vs bump `engine: v4`
2. **Strict mode** — CLI flag to fail on warnings/deprecations
3. **Group connectable** — defer `connectable: true` to phase 2 unless needed by corpus
4. **Persistence format** — when editor saves, emit new or legacy YAML (default: legacy until migration task)
