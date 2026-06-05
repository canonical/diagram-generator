# Implementation Plan: Diagram authoring AST

**Branch**: `feat/022-diagram-authoring-ast` | **Date**: 2026-06-05 | **Spec**: [spec.md](spec.md)

## Summary

Introduce a **diagram compiler** in `packages/layout-engine` that parses author-friendly YAML (concise `edges`, `node`/`group` layout, `defaults`/`use`), validates it, produces a strict `DiagramDocument` AST, lowers to existing `FrameDiagram` for SVG layout, and exposes **Mermaid** and **D2** exporters that consume only the AST.

Legacy `arrows` + `root:` YAML remains supported via normalization with deprecation warnings.

## Technical context

| Item | Value |
|------|-------|
| Language | TypeScript (compiler + exporters); Python passthrough optional later |
| Primary deps | `yaml` (or existing YAML parse in loader), existing `frame-model.ts` |
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
  normalize-legacy.ts     # arrows→edges, root→layout, id→node/group inference
  expand-defaults.ts      # use: template expansion
  validate.ts             # errors + warnings
  build-ast.ts            # AuthorDocument → DiagramDocument
  lower-to-frame.ts       # DiagramDocument → FrameDiagram
  compile.ts              # orchestrator: compileDiagramYaml()
  edge-shorthand.ts       # "a -> b" parser
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
- [ ] Adversarial review before marking spec Complete

## Phase 0 — Design (this spec package)

- [x] spec.md, research.md, data-model.md, plan.md, tasks.md, quickstart.md, contracts/

## Phase 1 — Compiler core (P1 stories)

1. Types + `compileDiagramYaml` skeleton with staged pipeline
2. Edge shorthand + object normalization
3. Legacy `arrows` compat + deprecation diagnostic
4. `layout` / `node` / `group` parsing + legacy `root` inference
5. `defaults` + `use` expansion with override precedence
6. Validation (errors) + warnings collector
7. `lowerToFrameDiagram` — map AST to existing `Frame` tree + `arrows`
8. Wire `frame-yaml-loader.ts` to compiler (public API unchanged)

**Verification**

```bash
npm --prefix packages/layout-engine test
# Existing layout/golden tests still pass on corpus via compat path
```

## Phase 2 — Tests and fixtures (P1/P2)

- Unit tests per `tasks.md` T020–T035
- Add `scripts/diagrams/frames/tiered-network-architecture.author-v1.yaml` as new-style reference (keep legacy file for compat test)
- Regression: SVG output unchanged for legacy YAML post-lower

## Phase 3 — Export adapters (P2/P3)

- `exportMermaid(ast)` + golden test (tiered-network shape)
- `exportD2(ast)` + golden test
- CLI scripts for batch export
- Warning emission for unsupported layout hints

## Phase 4 — Docs, migration, persistence (P2)

- `docs/diagram-authoring.md` (or extend `docs/stakeholder-guide.md` section)
- `migrate-diagram-yaml.mjs` optional rewriter
- Update `frame_yaml_persistence.py` / bridge save path — **opt-in** new schema emission (separate task; do not break editor saves by default)

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
| Loader regression | Compat normalizer + existing corpus golden SVG |
| YAML edge shorthand ambiguity | Dedicated scalar parser; reject ambiguous lines |
| Scope creep (rename runtime Arrow) | Defer; map edges→arrows at lower boundary only |

## Out of scope (v1)

- Renaming `FrameDiagram.arrows` to `edges` in runtime model
- Full corpus rewrite to author-v1 YAML
- Python compiler parity
- Perfect Mermaid/D2 layout fidelity
