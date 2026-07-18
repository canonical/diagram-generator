# Interchange fidelity matrix

> Historical spec-028 contract. Import breadth and diagnostic severity are now
> governed by the
> [spec-080 capability matrix](../../080-renderable-interchange-import/contracts/import-capability-matrix.md).
> Where this document describes a narrower importer or warning-only structural
> loss, spec 080 supersedes it.

Normative reference for spec **028**. Status column reflects **v1 today** (022 export only); target column is **028 complete**.

Legend:

- **Y** — preserved
- **N** — dropped silently today (bug — fix in 028 phase 0)
- **W** — dropped with `*_UNSUPPORTED_*` warning
- **—** — not applicable

## Frame node fields (`AuthorFrameNode`)

| Field | Export Mermaid | Export D2 | Import Mermaid (target) | Import D2 (target) |
|-------|----------------|-----------|---------------------------|---------------------|
| `id` | Y | Y | Y | Y |
| `children` / nesting | Y (subgraph) | Y (block) | Y | Y |
| `label[]` | Y (`<br/>`) | Y (quoted `\n`) | Y | Y |
| `heading` | W (container) | Y (block header) | Y (labelled subgraph) | Y |
| `icon` / `iconFill` | W | W | — | W |
| `direction`, `gap`, padding* | W | W | direction Y (coarse); others — | — |
| sizing / width / height* | W | W | — | — |
| `align`, `justify`, `wrap` | W | W | — | — |
| `level`, `variant`, `role` | W | W | — | — |
| `position`, `x`, `y` | W | W | — | — |
| `fill`, `border` | W | W | — | — |
| `use` (template) | — (expanded at compile) | — | — | — |

## Arrow fields (`AuthorArrow`)

| Field | Export Mermaid | Export D2 | Import Mermaid (target) | Import D2 (target) |
|-------|----------------|-----------|---------------------------|---------------------|
| `source` / `target` | Y (base id) | Y (dot path) | Y | Y |
| Anchor-qualified refs | W | W | — | W |
| `label[]` | W (ignored) | Y | Y | Y |
| `style`, `color` | N → **W** (028) | N → **W** (028) | — | — |
| `labelGap` | N → **W** (028) | N → **W** (028) | — | — |
| `waypoints` | W | W | — | — |
| Missing frame ref | N → **W** (028) | N → **W** (028) | implicit frame, otherwise W | W |

## Mermaid hand-authored flowchart lowering

| Construct | Import Mermaid | Diagnostic |
|-----------|----------------|------------|
| Implicit endpoints (`a --> b`) | Y; creates labelled frames at document scope unless explicitly declared elsewhere | — |
| Chained edges | Y; expands to one arrow per segment and preserves per-segment labels | — |
| Bidirectional edge (`a <--> b`) | W; preserves one directed `a -> b` arrow | `IMPORT_MERMAID_UNSUPPORTED_EDGE_DIRECTION` |
| Open/thick/dotted edge | W; preserves one standard directed arrow | `IMPORT_MERMAID_UNSUPPORTED_EDGE_STYLE` |
| Standard non-rectangular node shapes | W; preserves id/label as a rectangular frame | `IMPORT_MERMAID_UNSUPPORTED_SHAPE` |
| `:::class`, class/style/link/click statements | W; preserves supported neighbours and drops styling/interaction | `IMPORT_MERMAID_UNSUPPORTED_STYLE` |
| Non-flowchart Mermaid diagram | Error; imports no frames and emits exactly one type error | `IMPORT_MERMAID_UNSUPPORTED_DIAGRAM_TYPE` |

## Document / meta

| Field | Export Mermaid | Export D2 | Import (target) |
|-------|----------------|-----------|-------------------|
| `title` | — | — | Y (YAML top-level) |
| `meta.layout_engine` (elk) | — | Y (coarse `vars`) | W |
| `meta.elk` tuning | — | N | — |
| `defaults` / templates | — | — | — (compile-time only) |

## Synthetic AST transforms (both directions)

| Transform | Export | Import (target) |
|-----------|--------|-----------------|
| Omit `page` wrapper when it only groups children | Y | Re-insert `page` wrapper |
| Flatten sibling export roots | Y | Nest under `page` |

## Warning code namespaces

| Prefix | Meaning |
|--------|---------|
| `MERMAID_UNSUPPORTED_*` | Export loss |
| `D2_UNSUPPORTED_*` | Export loss |
| `MERMAID_MISSING_*` | Export invalid ref |
| `D2_MISSING_*` | Export invalid ref |
| `IMPORT_MERMAID_UNSUPPORTED_*` | Import skip |
| `IMPORT_D2_UNSUPPORTED_*` | Import skip |

## Import authority

The former exporter-shaped limitations table was removed because inline
declarations, `&` expansion, semicolon statements, local/reverse directions,
attribute-shape syntax, and D2 chained connections are implemented by spec 080.
See the spec-080 matrix for current supported, downgraded, blocked, and
out-of-scope classifications.
