# Interchange fidelity matrix

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

## Known import limitations

The Mermaid importer intentionally supports the corpus-facing hand-authored
subset in FR-004, not every production in Mermaid's flowchart grammar. Constructs
outside that table are diagnosed and cannot be written as empty/invalid YAML by
the CLI.

| Construct | Behaviour | Diagnostic |
|-----------|-----------|------------|
| Inline node declarations on an edge (`A[foo] --> B{bar}`), `&` multi-target links, edge ids/animation | Not in the FR-004 corpus-facing subset; statement is skipped. Declare nodes separately and use one chain to recover connectivity. | `IMPORT_MERMAID_UNSUPPORTED_EDGE` |
| Markdown strings, semicolon-separated statements, subgraph-local `direction`, newer `@{ shape: ... }` syntax | Not in the FR-004 corpus-facing subset; statement is skipped. | `IMPORT_MERMAID_UNSUPPORTED_SYNTAX` or `IMPORT_MERMAID_UNSUPPORTED_DIRECTION` |
| D2 shape whose block holds only styling (e.g. `x: label { class: leaf }`) | Imports as a heading container with empty children rather than a labelled leaf. The label text is preserved as `heading`; only the frame role differs, matching D2's container block semantics. | `IMPORT_D2_UNSUPPORTED_CLASS` |
| D2 chained connections (`a -> b -> c`) | Hand-authored D2 grammar expansion is deferred; the connection is diagnosed rather than partially imported. | `IMPORT_D2_MISSING_FRAME_REF` |

Accepted lossy Mermaid constructs listed in the lowering table remain warnings
under `--strict`; strict mode still fails for unsupported syntax, malformed
frontmatter/subgraphs/directions, unresolved references, and structural errors.
