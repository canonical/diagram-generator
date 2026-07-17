# Spec 028 review — diagram interchange (Mermaid & D2 import/export)

> **Historical review — superseded.** These findings describe an earlier branch
> state and their remediation. The current adversarial review is
> `opus-adversarial-review-findings-2026-07-17-spec-028.md`; do not treat the
> findings below as open.

**Reviewer:** Opus
**Scope:** Review only; no files modified by the reviewer.

## Summary

The export path is solid and well-tested. The exporter-round-trip import path
works correctly. The gap is real-world import: the importers were validated
exclusively against exporter output, which never contains frontmatter,
`:::class` node suffixes, D2 `class:` assignments, or alternate edge syntax.

## Findings

### BLOCKER B1 — Mermaid `:::class` node suffix drops the entire node

`import-mermaid.ts` anchors its node regex at the closing bracket. A node such
as `public_repo["Public<br/>repository"]:::section` is rejected, so the node
and every edge referencing it are lost. The fix is to strip optional trailing
`:::identifier` suffixes, including multiple suffixes, import the node, and
emit one `IMPORT_MERMAID_UNSUPPORTED_STYLE` diagnostic.

### BLOCKER B2 — D2 singular `class:` assignment creates phantom nodes

The D2 unsupported-key guard matches `classes` but not singular `class`. A
line such as `class: leaf` is parsed as a frame named `class`, producing
duplicate IDs and invalid serialized YAML. Add singular `class` to the
unsupported construct handling and diagnose/skip it.

### HIGH H1 — Mermaid YAML frontmatter floods diagnostics and breaks strict mode

Real corpus files begin with a YAML frontmatter block. Every line is currently
diagnosed as unsupported syntax, so `--strict` fails even when the Mermaid
body is supported. Parse a leading `--- ... ---` block as YAML, extract
`title` into import metadata, skip configuration fields, and optionally emit a
single frontmatter diagnostic for dropped metadata.

### HIGH H2 — Mermaid `-- "label" -->` edges are dropped

The importer supports `a --> b` and `a -->|label| b`, but not the common
`a -- "label" --> b` form. Support it and recover the label.

### MEDIUM M1 — D2 edges with trailing attribute blocks corrupt parsing

Some D2 connections have a trailing `{ ... }` block. The current edge parser
captures `{` as part of the label and the closing brace prematurely closes the
parent shape. Strip the trailing block from the edge label and skip its
contents.

### MEDIUM M2 — Mermaid header only accepts `flowchart TB|LR`

Accept `graph`, `TD` (equivalent to `TB`), and other direction tokens such as
`RL`/`BT` with the appropriate direction mapping or an explicit diagnostic.

### MEDIUM M3 — Mermaid import never populates `metadata.title`

Resolve with H1 so the fidelity matrix `title | Import = Y` row is implemented.

### LOW L1 — Mermaid unsupported-prefix regex false-positives on node IDs

Anchor style keywords to statement boundaries/word boundaries so IDs such as
`classifier` and `styleGuide` are not swallowed as style directives.

### LOW L2 — Mermaid subgraph labels are dropped

`subgraph id["label"]` currently keeps the container but drops its label.
This is documented as acceptable by the fidelity matrix, but retaining it as a
heading would better match D2 and preserve real-world human-readable context.

## Corpus validation reported by the review

| Source | Nodes | Arrows | Compiles? |
|---|---:|---:|---|
| `support-flowchart.mmd` | 7/7 | 3/3 | yes |
| `mongo-octavia-ha.mmd` | full | full | yes |
| `tls-certificate-provider-topology.mmd` | 20/20 | 12/13 | yes |
| `juju-4-architecture.mmd` | 8/~15 | 2/7 | yes, near-empty |
| `tiered-network-architecture.mmd` | 8 shells, no leaves | 0/13 | yes, empty |
| `juju-bootstrap-machines-process.d2` | 12/12 | 7/7 | yes |
| `juju-4-architecture.d2` | phantom class nodes | 1/~9 | no; 16 errors |

## Acceptance status

- Export hardening and exporter round trips: met.
- D2 import: met for exporter output; fails hand-authored `class:` D2.
- Mermaid import: met for exporter output; fails real on-brand `.mmd` with
  class suffixes/frontmatter.
- Round-trip CLI: present, but corpus compile acceptance is violated by
  `juju-4-architecture.d2`.
- Preview HTTP routes T060/T061: optional P3, not implemented.
- D2_BIN gate T051: optional, not implemented.

## Classification guidance

- Frontmatter: support and extract title.
- `subgraph id["label"]`: support the subgraph; preserving the label as a
  heading is recommended.
- `id["label"]:::class`: support the node, diagnose and skip only the class.
- Alternate labeled edges: support.
- Chained edges: may remain out of scope if explicitly diagnosed/documented.
- Mermaid class/style/linkStyle and D2 class/style/vars/icon: diagnose and
  skip.

## Remediation status

All findings B1, B2, H1, H2, M1, M2, M3, L1, and L2 were addressed on
`feat/028-diagram-interchange-mermaid-d2`.

- Mermaid imports now handle frontmatter titles, class suffixes, labeled
  subgraphs, direction aliases, and both labeled-edge forms.
- D2 imports diagnose singular/plural class assignments and skip trailing edge
  attribute blocks without losing the edge.
- Regression coverage increased the layout-engine suite from 1,029 to 1,031
  passing tests.
- Real-corpus validation produced zero YAML compile errors for the five
  selected Mermaid files and both D2 files listed in the review.

The P3 preview HTTP routes and optional `D2_BIN` gate were subsequently
implemented. The gate remains opt-in and is skipped unless `D2_BIN` is
configured.
