# Import capability matrix (spec 080)

Normative reference for spec **080**. This matrix replaces the exporter-shaped
import boundary of spec 028 with a capability-based classification. Every
interchange construct is classified into exactly one class. A construct may only
be imported without blocking if it is in a **supported** class and cites a
passing test.

## Classes

| Code | Class | Import behaviour |
|------|-------|------------------|
| **S** | Faithfully supported now | Imported; no diagnostic (or informational only). |
| **P** | Representable now, parser/import UX missing | MUST become importable in this spec; renderable chain already exists, only the parser/lowering wiring is missing. |
| **M** | Requires canonical-model or lowering work | Blocks until the named prerequisite task lands, then reclassified to S. Never silently dropped. |
| **V** | Presentation-only downgrade | Imported; construct's visual detail dropped with a named warning. Never blocks. |
| **B** | Structurally unrepresentable / import-blocking | Blocks the write with a diagnostic naming what would be lost. |
| **X** | Separate grammar/renderer, out of scope | Rejected with one clear message (spec 028 FR-008 guard). |

The renderable chain each **S**/**P** row must satisfy:
`source syntax → semantic IR → canonical YAML/AST → engine capability → rendered result → persisted reload`.

## Mermaid flowchart constructs

| # | Construct | Example | Class | Chain / prerequisite | Diagnostic |
|---|-----------|---------|-------|----------------------|------------|
| MF-01 | Header + vertical direction | `flowchart TB`, `graph TD` | S | root `direction: vertical` | — |
| MF-02 | Header + horizontal direction | `graph LR` | S | root `direction: horizontal` | — |
| MF-03 | Header + reverse direction | `graph RL`, `graph BT` | **M** | needs canonical reverse/orientation field (FR-009); ELK layered has `LEFT`/`UP` but frame model + lowering cannot express it | blocks until model task; then reclassify S |
| MF-04 | Explicit node + label | `api["API service"]` | S | frame + label | — |
| MF-05 | Multiline label `<br/>` | `api["A<br/>B"]` | S | `label[]` array | — |
| MF-06 | Non-rectangular shapes | `a(...)`, `b{...}`, `c((...))`, etc. | V | frame + label; geometry dropped | `IMPORT_MERMAID_UNSUPPORTED_SHAPE` |
| MF-07 | Implicit node from edge | `A --> B` (undeclared) | S | on-demand frames (already works) | — |
| MF-08 | Simple edge | `a --> b` | S | directed arrow | — |
| MF-09 | Labelled edge | `a -->|x| b`, `a -- "x" --> b` | S | directed arrow + label | — |
| MF-10 | Chained edge | `a --> b --> c` | S | one arrow per segment (already works) | — |
| MF-11 | Bidirectional edge | `a <--> b` | V | one directed arrow `a→b`; arrow model is directed-only | `IMPORT_MERMAID_UNSUPPORTED_EDGE_DIRECTION` |
| MF-12 | Link styles (thick/dotted/open) | `a ==> b`, `a -.-> b`, `a --- b` | V | standard directed arrow | `IMPORT_MERMAID_UNSUPPORTED_EDGE_STYLE` |
| MF-13 | Subgraph (id only) | `subgraph core ... end` | S | container frame | — |
| MF-14 | Subgraph with label | `subgraph core["Core"] ... end` | S | container + `heading` | — |
| MF-15 | Nested subgraphs | subgraph in subgraph | S | nested containers; verify ELK compounds | — |
| MF-16 | **Inline node decl on edge** | `a["A"] --> b["B"]` | **P** | both frames + arrow; parser rebuild (FR-004, FR-012) | — |
| MF-17 | **Inline decl + class suffix** | `a["A"]:::x --> b["B"]:::y` | **P** (+V) | topology imported; class suffix downgraded | `IMPORT_MERMAID_UNSUPPORTED_STYLE` per suffix |
| MF-18 | **Chained inline declarations** | `a[A] --> b[B] --> c[C]` | **P** | expand + create each node (FR-004) | — |
| MF-19 | Later declaration refining implicit node | edge first, `a["Label"]` later | **P** | merge label into existing node (FR-004) | — |
| MF-20 | **Subgraph-local direction** | `direction LR` inside subgraph | **P** (LR/TB) / **M** (RL/BT) | container `direction`; LR/TB representable now, RL/BT needs MF-03 model | — / blocks until model |
| MF-21 | `:::class` on standalone node | `api["API"]:::leaf` | V | node imported; class dropped | `IMPORT_MERMAID_UNSUPPORTED_STYLE` |
| MF-22 | `classDef`/`class`/`style` with colour props | `style a fill:#f00` | V (map fill/border if faithful, else drop; FR-006) | node imported; mappable props applied, rest downgraded | `IMPORT_MERMAID_UNSUPPORTED_STYLE` for unmapped |
| MF-23 | `linkStyle`, `click` | `click a "url"` | V | dropped | `IMPORT_MERMAID_UNSUPPORTED_STYLE` |
| MF-24 | Comments | `%% ...` | S | ignored | — |
| MF-25 | Frontmatter (title only) | `--- title: X ---` | S | title extracted | — |
| MF-26 | **Multi-target fan-out** | `a --> b & c`, `a & b --> c` | **P** | expand to full arrow set (FR-007) | — |
| MF-27 | Semicolon-separated statements | `a-->b; c-->d` | **P** | split then parse per statement (FR-012 IR) | — |
| MF-28 | Edge ids / animation | `e1@{ ... }`, `a e1@--> b` | B | no faithful arrow representation for id/animation semantics | `IMPORT_MERMAID_UNSUPPORTED_EDGE` (blocking) |
| MF-29 | New `@{ shape: ... }` node syntax | `a@{ shape: cyl }` | P (shape→V) | parse new syntax, import as frame, shape downgraded | `IMPORT_MERMAID_UNSUPPORTED_SHAPE` |
| MF-30 | Markdown string node body | `` a["`**md**`"] `` | V | strip markdown to text | `IMPORT_MERMAID_UNSUPPORTED_STYLE` |
| MF-31 | Self-loop | `a --> a` | S | arrow with equal endpoints; verify renderer | — |
| MF-32 | Parallel edges | `a --> b` twice | S | both arrows preserved (verify no dedupe) | — |
| MF-33 | Cycle | `a-->b-->c-->a` | S | all arrows preserved | — |
| MF-34 | Disconnected components | two unlinked subtrees | S | all frames preserved | — |
| MF-35 | Non-flowchart diagram type | `sequenceDiagram`, `pie`, ... | X | rejected by spec 028 FR-008 guard | `IMPORT_MERMAID_UNSUPPORTED_DIAGRAM_TYPE` |

### Behavioural change from spec 028

Rows **MF-16, MF-17, MF-18, MF-19, MF-20, MF-26, MF-27** are currently dropped by
spec 028 as `IMPORT_MERMAID_UNSUPPORTED_EDGE` / `_SYNTAX` warnings (structural
loss surfaced as warnings). Under spec 080 they either become supported (P) or
block (B/M) - none may remain silent warning-only drops.

Row **MF-03 / MF-20(RL,BT)**: spec 028 silently collapses `RL`/`BT` to
`LR`/`TB`. Under spec 080 this is structural loss and blocks until the model task
lands.

## D2 constructs (phased parity)

| # | Construct | Example | Class | Notes |
|---|-----------|---------|-------|-------|
| D2-01 | Nested blocks | `a: { b: {} }` | S | container frames (already works) |
| D2-02 | Shape + label | `a: "Label"` | S | leaf frame |
| D2-03 | Connection | `a -> b` | S | directed arrow |
| D2-04 | Labelled connection | `a -> b: "x"` | S | arrow + label |
| D2-05 | Dot-path endpoints | `a.b -> c.d` | S | resolve to nested frames |
| D2-06 | Chained connections | `a -> b -> c` | **P** | currently deferred (`IMPORT_D2_MISSING_FRAME_REF`); expand to arrows |
| D2-07 | `direction` | `direction: right` | **P**(LR/TB) / **M**(reverse) | mirror MF-20 semantics; currently dropped as style |
| D2-08 | class/style with colour | `a.style.fill: red` | V | map fill/border if faithful (FR-006); else downgrade |
| D2-09 | `classes` block | `classes: { ... }` | V | resolve then apply/downgrade |
| D2-10 | icons | `a.icon: ...` | V | dropped |
| D2-11 | SQL tables, sequence, markdown blocks | `a: { shape: sql_table }` | X | separate grammar/renderer, out of scope |
| D2-12 | vars / config | `vars: { ... }` | V | layout hint; dropped or mapped to `meta` |

D2 structural-loss constructs (a connection whose endpoint cannot be resolved
after import, a container relationship that would be dropped) MUST block through
the same shared gate as Mermaid (FR-002), not emit `IMPORT_D2_MISSING_FRAME_REF`
as a non-blocking warning.

## Engine-selection decision table (FR-010)

| Graph property | v3 autolayout | ELK layered | Decision |
|----------------|---------------|-------------|----------|
| Flat / tree, default vertical or horizontal | faithful | faithful | v3 |
| Nested containers, edges only within a container | faithful | faithful | v3 |
| Nested containers, cross-container edges | not faithful | faithful (compounds + common-ancestor) | ELK layered |
| Reverse direction (RL/BT) | no | `LEFT`/`UP` (needs model, MF-03) | ELK layered after MF-03 model lands; block before |
| Cycle / high fan-in / dense graph | limited | faithful | ELK layered |
| Neither can render faithfully | — | — | block (B) |

Engine selection MUST read `packages/graph-layout-elk/src/engine-capabilities.ts`
(`ELK_LAYERED_GRAPH_LAYOUT_ENGINE.capabilities.compounds.nestedChildren`,
`.directions`) rather than hard-coded ids.

## Diagnostic categories (FR-002)

Every diagnostic MUST carry a category:

| Category | Blocks write? | Examples |
|----------|---------------|----------|
| `structural` | yes | dropped edge, dropped node, dropped containment, dropped/reversed direction, dropped multiplicity |
| `visual` | no | shape geometry, class fill without faithful mapping, icon, link stroke style, bidirectional glyph |
| `type` | yes (whole import) | non-flowchart Mermaid type (spec 028 guard) |
| `invalid` | yes | duplicate id, missing id, empty import, YAML that fails recompile |

`strict` mode may additionally upgrade `visual` to blocking for CLI users who
want zero loss, but `structural`/`type`/`invalid` block in all modes.
