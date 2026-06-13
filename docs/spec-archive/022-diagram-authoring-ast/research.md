# Research: Diagram authoring AST (spec 022)

**Date**: 2026-06-05

## Current authoring format (v3 frame YAML)

| Aspect | Current state |
|--------|----------------|
| Engine marker | `engine: v3` on every frame diagram |
| Connections | Top-level `arrows:` array of `{ source, target, ... }` |
| Hierarchy | Top-level `root:` recursive tree; every child uses `id:` |
| Container vs leaf | Derived from presence of `children`, not a separate authoring keyword |
| Templates | None today — repeated labels/icons are copy-pasted |
| Loader (TS) | `packages/layout-engine/src/frame-yaml-loader.ts` → `FrameDiagram` |
| Loader (Py) | `scripts/frame_loader.py` — legacy parity |
| Persistence | `scripts/frame_yaml_persistence.py` writes canonical `root` + `arrows` |
| Runtime edges | `FrameDiagram.arrows: Arrow[]` in `frame-model.ts` |
| Preview | Deserializes JSON DTO; does not re-parse YAML grammar |

## Important project-context findings

1. **`root` + `arrows` is not legacy drift.** It is the live authored contract used by the TS loader and the preview save path.
2. **Arrows are not leaf-only.** The runtime arrow contract uses string refs and can target any frame id, including containers; routing code also already allows anchor-qualified refs like `foo.right`.
3. **A second tree shape would be expensive drift.** Replacing the authored frame tree with `layout` / `node` / `group` would create a compiler-only schema beside the preview/editor persistence model.
4. **The useful compression is local, not structural.** The obvious wins are arrow shorthand and `defaults` / `use`, not replacing the whole frame grammar.

## Example verbosity pain (`tiered-network-architecture.yaml`)

- 13 arrow objects × 2 lines each ≈ 26 lines for connectors alone
- repeated client/server label+icon blocks (no `defaults`)
- frame tree itself is already the right semantic shape for this repo; the pain is repetition, not the presence of `root`

## Related but separate schemas

- **`docs/diagram-schema.json`** — ontology/components schema for agent tooling; different shape (`components`, `meta.diagram_type`). This spec does **not** merge with that file in v1; document cross-link only.
- **Mermaid workspace** (`../mermaid/`) — separate repo; no Mermaid exporter in diagram-generator today.

## Export landscape

| Target | Exists? | Notes |
|--------|---------|-------|
| SVG (on-brand) | Yes | `svg-render.ts`, `export-frame-svg.mjs` |
| draw.io | Partial | Python/batch legacy |
| Mermaid | No | To add as AST adapter |
| D2 | No | To add as AST adapter |

## Recommended integration point

Add compiler module under `packages/layout-engine/src/diagram-author/`:

```text
compileDiagramYaml(raw: string): CompileResult
  → { ast: DiagramDocument, warnings, deprecations }
  → lowerToFrameDiagram(ast): FrameDiagram
```

Wire `frame-yaml-loader.ts` to call the compiler (thin wrapper) so existing `loadFrameYaml(path)` API stays unchanged.

Exporters:

- `packages/layout-engine/src/export-mermaid.ts`
- `packages/layout-engine/src/export-d2.ts`
- CLI: `packages/layout-engine/scripts/export-mermaid.mjs`, `export-d2.mjs`

## Risks

| Risk | Mitigation |
|------|------------|
| Breaking corpus diagrams | Lower mechanically to current `FrameDiagram`; keep golden SVG unchanged |
| Narrowing arrow refs | Preserve full string ref contract; validate base ids only |
| Duplicating loader/persistence logic | Single TS compiler; do not invent a second top-level authoring schema |
| Preview persistence writes old shape | Treat that shape as canonical in v1 |
| Exporters drift from renderer | Exporters read AST only; golden tests per adapter |

## Open decisions (resolve in implementation)

1. **`schema: author-v1` field** — optional additive-sugar marker alongside `engine: v3`
2. **Strict mode** — CLI flag to fail on warnings/deprecations
3. **Default/template scope** — frame templates only in v1; arrow templates deferred
4. **Migration utility scope** — shorthand-arrow rewrite and `defaults` extraction only; no key renames# Research: Diagram authoring AST (spec 022)

**Date**: 2026-06-05

## Current authoring format (v3 frame YAML)

| Aspect | Current state |
|--------|----------------|
| Engine marker | `engine: v3` on every frame diagram |
| Connections | Top-level `arrows:` array of `{ source, target, ... }` |
| Hierarchy | Top-level `root:` recursive tree; every child uses `id:` |
| Container vs leaf | Derived from presence of `children`, not a separate authoring keyword |
| Templates | None today — repeated labels/icons are copy-pasted |
| Loader (TS) | `packages/layout-engine/src/frame-yaml-loader.ts` → `FrameDiagram` |
| Loader (Py) | `scripts/frame_loader.py` — legacy parity |
| Persistence | `scripts/frame_yaml_persistence.py` writes canonical `root` + `arrows` |
| Runtime edges | `FrameDiagram.arrows: Arrow[]` in `frame-model.ts` |
| Preview | Deserializes JSON DTO; does not re-parse YAML grammar |

## Important project-context findings

1. **`root` + `arrows` is not legacy drift.** It is the live authored contract used by the TS loader and the preview save path.
2. **Arrows are not leaf-only.** The runtime arrow contract uses string refs and can target any frame id, including containers; routing code also already allows anchor-qualified refs like `foo.right`.
3. **A second tree shape would be expensive drift.** Replacing the authored frame tree with `layout` / `node` / `group` would create a compiler-only schema beside the preview/editor persistence model.
4. **The useful compression is local, not structural.** The obvious wins are arrow shorthand and `defaults` / `use`, not replacing the whole frame grammar.

## Example verbosity pain (`tiered-network-architecture.yaml`)

- 13 arrow objects × 2 lines each ≈ 26 lines for connectors alone
- repeated client/server label+icon blocks (no `defaults`)
- frame tree itself is already the right semantic shape for this repo; the pain is repetition, not the presence of `root`

## Related but separate schemas

- **`docs/diagram-schema.json`** — ontology/components schema for agent tooling; different shape (`components`, `meta.diagram_type`). This spec does **not** merge with that file in v1; document cross-link only.
- **Mermaid workspace** (`../mermaid/`) — separate repo; no Mermaid exporter in diagram-generator today.

## Export landscape

| Target | Exists? | Notes |
|--------|---------|-------|
| SVG (on-brand) | Yes | `svg-render.ts`, `export-frame-svg.mjs` |
| draw.io | Partial | Python/batch legacy |
| Mermaid | No | To add as AST adapter |
| D2 | No | To add as AST adapter |

## Recommended integration point

Add compiler module under `packages/layout-engine/src/diagram-author/`:

```text
compileDiagramYaml(raw: string): CompileResult
  → { ast: DiagramDocument, warnings, deprecations }
  → lowerToFrameDiagram(ast): FrameDiagram
```

Wire `frame-yaml-loader.ts` to call the compiler (thin wrapper) so existing `loadFrameYaml(path)` API stays unchanged.

Exporters:

- `packages/layout-engine/src/export-mermaid.ts`
- `packages/layout-engine/src/export-d2.ts`
- CLI: `packages/layout-engine/scripts/export-mermaid.mjs`, `export-d2.mjs`

## Risks

| Risk | Mitigation |
|------|------------|
| Breaking corpus diagrams | Lower mechanically to current `FrameDiagram`; keep golden SVG unchanged |
| Narrowing arrow refs | Preserve full string ref contract; validate base ids only |
| Duplicating loader/persistence logic | Single TS compiler; do not invent a second top-level authoring schema |
| Preview persistence writes old shape | Treat that shape as canonical in v1 |
| Exporters drift from renderer | Exporters read AST only; golden tests per adapter |

## Open decisions (resolve in implementation)

1. **`schema: author-v1` field** — optional additive-sugar marker alongside `engine: v3`
2. **Strict mode** — CLI flag to fail on warnings/deprecations
3. **Default/template scope** — frame templates only in v1; arrow templates deferred
4. **Migration utility scope** — shorthand-arrow rewrite and `defaults` extraction only; no key renames