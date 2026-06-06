# Implementation Plan: Diagram authoring AST

**Branch**: `feat/022-diagram-authoring-ast` | **Date**: 2026-06-05 | **Spec**: [spec.md](spec.md)

## Summary

Introduce a **diagram compiler** in `packages/layout-engine` that parses the existing frame YAML shape plus additive authoring sugar (concise `arrows`, `defaults` / `use`), validates it, produces a strict frame-tree-native `DiagramDocument` AST, lowers to existing `FrameDiagram` for SVG layout, and exposes **Mermaid** and **D2** exporters that consume only the AST.

Canonical authored structure remains `root` + `arrows`. This spec does **not** introduce a replacement `layout` / `edges` / `node` / `group` schema.

## Technical context

| Item | Value |
|------|-------|
| Language | TypeScript (compiler + exporters); Python passthrough optional later |
| Primary deps | `yaml`, existing `frame-model.ts`, existing `frame-yaml-loader.ts` semantics |
| Storage | `scripts/diagrams/frames/*.yaml` (authoring); no DB |
| Testing | Vitest in `packages/layout-engine`; golden Mermaid/D2 strings |
| Target | Node (preview bridge, batch CLIs) |
| Constraints | No new semantics in `scripts/preview/editor.js`; TS authoritative per copilot-instructions |

**Existing entry points to wire**

- `packages/layout-engine/src/frame-yaml-loader.ts` — becomes `parse → compile → lower`
- `packages/layout-engine/scripts/export-frame-svg.mjs` — unchanged; still uses lowered `FrameDiagram`
- `scripts/frame_loader.py` — document lag; optional thin wrapper calling TS compile JSON in later task

**New modules (proposed)**

```text
packages/layout-engine/src/diagram-author/
  parse-yaml.ts           # raw → untyped document
  normalize-arrows.ts     # shorthand/object arrows → normalized records
  expand-defaults.ts      # use: template expansion on frame entries
  validate.ts             # errors + warnings
  build-ast.ts            # AuthorDocument → DiagramDocument
  lower-to-frame.ts       # DiagramDocument → FrameDiagram
  compile.ts              # orchestrator: compileDiagramYaml()
  arrow-shorthand.ts      # "a -> b" parser
  ref-grammar.ts          # base-id extraction for anchor refs
  types.ts                # DiagramDocument, CompileResult, diagnostics

packages/layout-engine/src/export-mermaid.ts
packages/layout-engine/src/export-d2.ts

packages/layout-engine/src/diagram-author/*.test.ts
packages/layout-engine/src/export-mermaid.test.ts
packages/layout-engine/src/export-d2.test.ts
```

## Constitution / policy gates

- [x] Engine semantics in TS only
- [x] Preview shell maintain-only (compiler called from bridge/server, not editor grammar)
- [x] No Mermaid/D2 as canonical format
- [x] Incremental delivery with compat path
- [x] Canonical authoring remains frame-tree-native (`root` + `arrows`)
- [ ] Adversarial review before marking spec Complete

## Phase 0 — Design (this spec package)

- [x] spec.md, research.md, data-model.md, plan.md, tasks.md, quickstart.md, contracts/

## Phase 1 — Compiler core (P1 stories)

1. Types + `compileDiagramYaml` skeleton with staged pipeline
2. Arrow shorthand + object normalization
3. Frame-tree AST shape + frame index
4. `defaults` + `use` expansion with override precedence
5. Validation (errors) + warnings collector
6. `lowerToFrameDiagram` — map AST to existing `Frame` tree + `arrows`
7. Wire `frame-yaml-loader.ts` to compiler (public API unchanged)

**Verification**

```bash
npm --prefix packages/layout-engine test
# Existing layout/golden tests still pass on corpus via compiler path
```

## Phase 2 — Tests and fixtures (P1/P2)

- Unit tests per `tasks.md` T020–T035
- Add `scripts/diagrams/frames/tiered-network-architecture.author-v1.yaml` as an additive-sugar reference while keeping canonical `root` + `arrows`
- Regression: SVG output unchanged for existing corpus post-lower

## Phase 3 — Export adapters (P2/P3)

- `exportMermaid(ast)` + golden test (tiered-network shape)
- `exportD2(ast)` + golden test
- CLI scripts for batch export
- Warning emission for unsupported layout hints and anchor-qualified refs

## Phase 4 — Docs, migration, persistence (P2)

- `docs/diagram-authoring.md` (or extend `docs/stakeholder-guide.md` section)
- `migrate-diagram-yaml.mjs` optional rewriter for shorthand arrows and `defaults` extraction
- Keep `frame_yaml_persistence.py` save format unchanged in v1 — editor saves remain canonical `root` + `arrows`

## Project structure (documentation)

```text
specs/022-diagram-authoring-ast/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── tasks.md
├── quickstart.md
└── contracts/
    ├── authoring-schema.md
    └── migration-example.md
```

## Risk controls

| Risk | Control |
|------|---------|
| Loader regression | Compiler lowers mechanically to current `FrameDiagram`; golden SVG unchanged post-lower |
| Arrow shorthand ambiguity | Dedicated scalar parser; reject ambiguous lines |
| Narrowing the live arrow contract | Preserve container endpoints and anchor-qualified refs; validate base ids only |
| Preview save drift | Do not change canonical `root` / `arrows` save format in v1 |
| Exporter overpromising | Warn on unsupported layout hints and anchor-qualified refs |

## Out of scope (v1)

- Renaming `FrameDiagram.arrows` to `edges` in the runtime model
- Replacing `root` with `layout`
- Introducing `node:` / `group:` as the primary authoring schema
- Full corpus rewrite to author-v1 sugar
- Python compiler parity
- Perfect Mermaid/D2 layout fidelity# Implementation Plan: Diagram authoring AST

**Branch**: `feat/022-diagram-authoring-ast` | **Date**: 2026-06-05 | **Spec**: [spec.md](spec.md)

## Summary

Introduce a **diagram compiler** in `packages/layout-engine` that parses the existing frame YAML shape plus additive authoring sugar (concise `arrows`, `defaults` / `use`), validates it, produces a strict frame-tree-native `DiagramDocument` AST, lowers to existing `FrameDiagram` for SVG layout, and exposes **Mermaid** and **D2** exporters that consume only the AST.

Canonical authored structure remains `root` + `arrows`. This spec does **not** introduce a replacement `layout` / `edges` / `node` / `group` schema.

## Technical context

| Item | Value |
|------|-------|
| Language | TypeScript (compiler + exporters); Python passthrough optional later |
| Primary deps | `yaml`, existing `frame-model.ts`, existing `frame-yaml-loader.ts` semantics |
| Storage | `scripts/diagrams/frames/*.yaml` (authoring); no DB |
| Testing | Vitest in `packages/layout-engine`; golden Mermaid/D2 strings |
| Target | Node (preview bridge, batch CLIs) |
| Constraints | No new semantics in `scripts/preview/editor.js`; TS authoritative per copilot-instructions |

**Existing entry points to wire**

- `packages/layout-engine/src/frame-yaml-loader.ts` — becomes `parse → compile → lower`
- `packages/layout-engine/scripts/export-frame-svg.mjs` — unchanged; still uses lowered `FrameDiagram`
- `scripts/frame_loader.py` — document lag; optional thin wrapper calling TS compile JSON in later task

**New modules (proposed)**

```text
packages/layout-engine/src/diagram-author/
  parse-yaml.ts           # raw → untyped document
  normalize-arrows.ts     # shorthand/object arrows → normalized records
  expand-defaults.ts      # use: template expansion on frame entries
  validate.ts             # errors + warnings
  build-ast.ts            # AuthorDocument → DiagramDocument
  lower-to-frame.ts       # DiagramDocument → FrameDiagram
  compile.ts              # orchestrator: compileDiagramYaml()
  arrow-shorthand.ts      # "a -> b" parser
  ref-grammar.ts          # base-id extraction for anchor refs
  types.ts                # DiagramDocument, CompileResult, diagnostics

packages/layout-engine/src/export-mermaid.ts
packages/layout-engine/src/export-d2.ts

packages/layout-engine/src/diagram-author/*.test.ts
packages/layout-engine/src/export-mermaid.test.ts
packages/layout-engine/src/export-d2.test.ts
```

## Constitution / policy gates

- [x] Engine semantics in TS only
- [x] Preview shell maintain-only (compiler called from bridge/server, not editor grammar)
- [x] No Mermaid/D2 as canonical format
- [x] Incremental delivery with compat path
- [x] Canonical authoring remains frame-tree-native (`root` + `arrows`)
- [ ] Adversarial review before marking spec Complete

## Phase 0 — Design (this spec package)

- [x] spec.md, research.md, data-model.md, plan.md, tasks.md, quickstart.md, contracts/

## Phase 1 — Compiler core (P1 stories)

1. Types + `compileDiagramYaml` skeleton with staged pipeline
2. Arrow shorthand + object normalization
3. Frame-tree AST shape + frame index
4. `defaults` + `use` expansion with override precedence
5. Validation (errors) + warnings collector
6. `lowerToFrameDiagram` — map AST to existing `Frame` tree + `arrows`
7. Wire `frame-yaml-loader.ts` to compiler (public API unchanged)

**Verification**

```bash
npm --prefix packages/layout-engine test
# Existing layout/golden tests still pass on corpus via compiler path
```

## Phase 2 — Tests and fixtures (P1/P2)

- Unit tests per `tasks.md` T020–T035
- Add `scripts/diagrams/frames/tiered-network-architecture.author-v1.yaml` as an additive-sugar reference while keeping canonical `root` + `arrows`
- Regression: SVG output unchanged for existing corpus post-lower

## Phase 3 — Export adapters (P2/P3)

- `exportMermaid(ast)` + golden test (tiered-network shape)
- `exportD2(ast)` + golden test
- CLI scripts for batch export
- Warning emission for unsupported layout hints and anchor-qualified refs

## Phase 4 — Docs, migration, persistence (P2)

- `docs/diagram-authoring.md` (or extend `docs/stakeholder-guide.md` section)
- `migrate-diagram-yaml.mjs` optional rewriter for shorthand arrows and `defaults` extraction
- Keep `frame_yaml_persistence.py` save format unchanged in v1 — editor saves remain canonical `root` + `arrows`

## Project structure (documentation)

```text
specs/022-diagram-authoring-ast/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── tasks.md
├── quickstart.md
└── contracts/
    ├── authoring-schema.md
    └── migration-example.md
```

## Risk controls

| Risk | Control |
|------|---------|
| Loader regression | Compiler lowers mechanically to current `FrameDiagram`; golden SVG unchanged post-lower |
| Arrow shorthand ambiguity | Dedicated scalar parser; reject ambiguous lines |
| Narrowing the live arrow contract | Preserve container endpoints and anchor-qualified refs; validate base ids only |
| Preview save drift | Do not change canonical `root` / `arrows` save format in v1 |
| Exporter overpromising | Warn on unsupported layout hints and anchor-qualified refs |

## Out of scope (v1)

- Renaming `FrameDiagram.arrows` to `edges` in the runtime model
- Replacing `root` with `layout`
- Introducing `node:` / `group:` as the primary authoring schema
- Full corpus rewrite to author-v1 sugar
- Python compiler parity
- Perfect Mermaid/D2 layout fidelity