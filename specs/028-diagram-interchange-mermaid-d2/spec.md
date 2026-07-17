# Feature Specification: Diagram interchange (Mermaid & D2 import/export)

**Feature Branch**: `feat/028-diagram-interchange-mermaid-d2`

**Spec Package**: `028-diagram-interchange-mermaid-d2`

**Created**: 2026-06-06

**Status**: Closeout Ready

**Depends on**: spec **022** (diagram authoring AST — compile, validate, lower, **export** adapters landed in v1).

**Input**: Extend spec 022 export-only adapters into a documented **interchange layer**: stable export from `DiagramDocument`, lossy **import** from Mermaid flowchart and D2 subsets back into canonical frame-tree YAML/AST, explicit fidelity matrix, and CLIs for round-trip workflows used by integrators, field engineers, and the `../d2/` proof-of-concept repo. Mermaid code must be treated as a first-class raw-material input, not merely an internal parse target.

## Problem Statement

Spec 022 established frame YAML as the **only canonical** authoring format and added **one-way** exporters:

- `exportMermaid(ast)` — lossy; no arrow labels; subgraph-only containers
- `exportD2(ast)` — preserves nested blocks and arrow labels; still lossy on layout/icons/styling

There is **no import path** from Mermaid or D2 back into the AST, no documented round-trip expectations, and no unified interchange API. Integrators experimenting in D2 (see `../d2/juju-4-architecture.d2`) cannot merge structural edits back into frame YAML without manual rewrite.

Adversarial review of the D2 exporter ([`docs/spec-archive/022-diagram-authoring-ast/adversarial-review-d2-export.md`](../../docs/spec-archive/022-diagram-authoring-ast/adversarial-review-d2-export.md)) identified silent-loss gaps that interchange work should close.

## Mission

Provide a **bidirectional, explicitly lossy** interchange layer between:

| Format | Role |
|--------|------|
| Frame YAML / `DiagramDocument` | Canonical source of truth |
| Mermaid flowchart | Lightweight sharing, docs, GitHub rendering |
| D2 | Nested architecture diagrams, ELK/sketch layouts, Terrastruct tooling |

**Import never replaces YAML authority** — imported documents are validated, annotated with diagnostics, and may require human cleanup before merge.

## Scope revision (2026-07-17) — Mermaid-first hand-authored import

This revision supersedes the narrow "v1 subset" wording in **FR-004** below.
It is the authoritative scope for the next implementation slice. Implement it
exactly as written; where an older paragraph conflicts, this section wins.

**Why:** the first pass validated the importers only against the diagram
generator's *own* exporter output. Real hand-authored Mermaid (see the corpus at
`H:\WSL_dev_projects\mermaid`) relies on constructs the exporter never emits —
implicit nodes, chained edges, bidirectional edges — so it imported to empty or
broken diagrams. Mermaid is the priority format for our users, so Mermaid
**flowchart** import must handle real hand-authored files, not just round-trips.

### In scope (this slice)

1. **Mermaid `flowchart` / `graph` import must accept the enumerated
   corpus-facing hand-authored subset.** Concretely it MUST handle every
   construct in the "Required Mermaid flowchart coverage" table in FR-004,
   including implicit nodes created by edges, chained edges
   (`a --> b --> c`), edge labels, bidirectional edges, the listed legacy node
   shapes, `%%` comments, and large YAML frontmatter.
2. **A clear unsupported-diagram-type guard** (FR-008). The engine only has a
   frame renderer and a sequence renderer — it has no Sankey, pie, gantt, class,
   ER, state, C4, mindmap, etc. renderer. Importing any non-flowchart Mermaid
   diagram MUST fail with **one** understandable error that names the detected
   type, instead of emitting a cascade of per-line syntax warnings or a phantom
   diagram.
3. **No import path may emit invalid or empty canonical YAML** (FR-009). This
   closes findings F1/F2 from the 2026-07-17 adversarial review.
4. **Three converted corpus examples** land in `diagrams/1.input/` so a reviewer
   can open them in the preview editor and judge conversion quality (FR-010).

### Out of scope / deferred (this slice)

- **D2 hand-authored import is deferred.** The existing D2 import + export code
  (exporter round-trip level) stays as-is — do **not** delete or rewrite its
  grammar, and do **not** invest in broadening D2 parsing now. The shared
  structural-diagnostic, empty-output, and recompile-before-write safety gates
  in FR-009 apply to D2 as well.
- **Mermaid non-flowchart types are rejected, not converted** (sequence, class,
  state, ER, gantt, pie, journey, gitGraph, mindmap, timeline, quadrant, radar,
  requirement, sankey, C4, block, packet, kanban, xychart, venn, wardley, etc.).
  Note: the engine *does* have a sequence model, so Mermaid `sequenceDiagram`
  import is a plausible **future** follow-up — but it is a separate parser and is
  explicitly out of this slice.
- Visual/on-brand styling parity (colours, icons, class-based fills). Class and
  style directives are diagnosed and dropped, as today.

### Reasonableness note (read before implementing)

"Anything Mermaid supports should be convertible" is **not** literally
achievable: Mermaid has ~25 diagram grammars and the diagram generator can only
render frame diagrams (and sequences). Even Mermaid flowchart has productions
outside this slice (inline node declarations on edges, `&` multi-target links,
edge ids/animation, markdown strings, semicolon-separated statements,
subgraph-local directions, and newer shape attributes). The honest boundary is:
**support the FR-004 corpus-facing hand-authored flowchart subset, diagnose
unsupported flowchart statements, and reject every other Mermaid diagram type
with one clear message.** Broader diagram types need an engine renderer and
separate parser spec; broader flowchart syntax can extend the fidelity matrix in
a follow-up.

## User Scenarios & Testing

### User Story 1 — Documented export surface (Priority: P1)

As an integrator, I want one documented export contract for Mermaid and D2 so I know which AST fields survive and which emit warnings.

**Independent test**: `contracts/interchange-fidelity.md` lists every `AuthorFrameNode` / `AuthorArrow` field with Export(Mermaid), Export(D2), Import(Mermaid), Import(D2) columns; unit tests assert warning codes for each lossy export field on the tiered-network fixture.

**Acceptance scenarios**

1. **Given** a compiled tiered-network AST, **When** exported to Mermaid and D2, **Then** warning codes match the fidelity matrix for icons, layout, anchors, and arrow metadata.
2. **Given** export CLIs, **When** run with `--strict`, **Then** export warnings fail the process (same as compile strict mode).

---

### User Story 2 — D2 import to AST (Priority: P1)

As an integrator, I want to parse a **supported D2 subset** into `DiagramDocument` so structural edits made in D2 can be merged back into frame YAML.

**Independent test**: Parse `../d2/juju-bootstrap-machines-process.d2` (exporter output) → AST → lower → `FrameDiagram` loads without errors; frame ids and arrow endpoints match modulo documented loss.

**Acceptance scenarios**

1. **Given** nested D2 blocks `{ ... }`, **When** imported, **Then** AST `root` tree mirrors nesting (synthetic `page` wrapper allowed).
2. **Given** D2 connections `a.b -> c.d: "label"`, **When** imported, **Then** AST `arrows` list contains matching `source`, `target`, and `label` lines.
3. **Given** unsupported D2 constructs (classes, styles, markdown blocks, sequences), **When** imported, **Then** `IMPORT_D2_UNSUPPORTED_*` warnings are emitted and ignored sections are listed in diagnostics.

---

### User Story 3 — Mermaid code to canonical YAML (Priority: P2)

As an integrator or field engineer, I want to provide Mermaid flowchart code directly and receive canonical frame YAML so document/code pipelines can bypass image interpretation and use Mermaid as precise diagram-generator input.

**Independent test**: Golden import of a minimal flowchart (tiered-network Mermaid export round-trip) recovers frame ids and edges, multiline `<br/>` labels become `label:` arrays, and the emitted YAML passes `compileDiagramYaml` unchanged.

**Acceptance scenarios**

1. **Given** `subgraph` blocks, **When** imported, **Then** container frames are created with `children`.
2. **Given** `node["label"]` syntax, **When** imported, **Then** leaf frames receive multiline labels.
3. **Given** a Mermaid source file or pasted `.mmd` content, **When** run through the Mermaid import CLI, **Then** the primary artifact is canonical `engine: v3` YAML suitable for preview/save/export without manual AST editing.
4. **Given** anchor or styling syntax Mermaid allows but YAML does not, **When** imported, **Then** `IMPORT_MERMAID_UNSUPPORTED_*` warnings are recorded.

---

### User Story 4 — Round-trip CLI workflows (Priority: P2)

As a maintainer, I want CLIs to convert between formats with visible diagnostics.

**Independent test**:

```bash
# Export (exists — harden per matrix)
node packages/layout-engine/scripts/export-d2.mjs --slug tiered-network-architecture --out /tmp/t.d2
node packages/layout-engine/scripts/export-mermaid.mjs --slug tiered-network-architecture --out /tmp/t.mmd

# Import (new)
node packages/layout-engine/scripts/import-d2.mjs --in /tmp/t.d2 --out /tmp/frame.yaml
node packages/layout-engine/scripts/import-mermaid.mjs --in /tmp/t.mmd --out /tmp/frame.yaml
```

**Acceptance scenarios**

1. **Given** YAML → D2 → import-D2 → YAML, **When** compared, **Then** structural diff (ids, nesting, arrows) is empty and lossy fields are listed.
2. **Given** import output, **When** passed through `compileDiagramYaml`, **Then** no errors on strict corpus fixtures.

---

### User Story 5 — Export hardening from adversarial review (Priority: P2)

As a maintainer, I want D2/Mermaid exporters to fail loudly on invalid refs and warn on all ignored arrow/frame metadata.

**Independent test**: Unit tests for `D2_MISSING_FRAME_REF`, `D2_UNSUPPORTED_ARROW_STYLE`, shared layout-field warnings; optional `d2 compile` check when `D2_BIN` is set.

---

### User Story 6 — Optional preview / HTTP export (Priority: P3)

As a preview user, I want to download Mermaid/D2 for the loaded slug from the preview server (parity with SVG export discoverability).

**Independent test**: `GET /api/export/mermaid?slug=` and `GET /api/export/d2?slug=` return `text/plain` compiled from on-disk YAML (not live overrides unless explicitly specified).

## Functional Requirements

### FR-001 — Canonical authority

- Frame YAML (`engine: v3`, `root`, `arrows`) remains the **only** authoritative authoring format.
- Import produces YAML or `DiagramDocument` suitable for `compileDiagramYaml`; it does not bypass validation.

### FR-002 — Export (extend 022)

- `exportMermaid(ast)` and `exportD2(ast)` remain pure functions on `DiagramDocument`.
- All ignored frame/arrow fields MUST emit documented `*_UNSUPPORTED_*` warnings (no silent loss for fields listed in fidelity matrix).
- Invalid arrow endpoints MUST emit `D2_MISSING_FRAME_REF` / `MERMAID_MISSING_FRAME_REF`.

### FR-003 — D2 import subset

> **Deferred (2026-07-17).** D2 hand-authored import is out of scope for the
> current slice. The existing D2 importer (exporter round-trip level) and its
> tests remain in place unchanged. Do not delete, rewrite, or broaden D2 import
> in this slice. The requirements below describe the already-landed D2 behaviour
> and are frozen, not new work.

Minimum construct support for v1:

- Top-level and nested shape blocks: `id: { ... }`, `id: label`, `id: "multi\nline"`
- Connections: `src -> dst`, `src -> dst: label`
- Dot-path endpoints resolving to nested frames
- Optional `vars.d2-config.layout-engine` → `meta.layout_engine` hint on export only (import may ignore or round-trip as comment)

Out of scope for v1 import: `classes`, per-shape `style`, icons, SQL tables, sequences, markdown blocks.

### FR-004 — Mermaid import (hand-authored flowchart)

**This requirement is rewritten by the 2026-07-17 scope revision.** Mermaid
`flowchart` / `graph` import MUST accept real hand-authored files, not only
diagram-generator exporter output. The importer produces validated canonical
`engine: v3` YAML as its primary deliverable.

**Required Mermaid flowchart coverage.** Every row MUST be handled. "Import"
means a frame/arrow is produced; "Diagnose + drop" means a single documented
warning is emitted and the construct is skipped without breaking neighbours.

| # | Construct | Example | Required behaviour |
|---|-----------|---------|--------------------|
| M1 | Header + direction | `flowchart TB`, `graph LR`, `graph TD/RL/BT` | Set root `direction` (LR/RL → horizontal, else vertical). |
| M2 | Explicit node + label | `api["API service"]` | Frame with label. |
| M3 | Multiline label | `api["Line 1<br/>Line 2"]` | `label:` array, one entry per line. |
| M4 | Node shapes | `a(round)`, `b{diamond}`, `c((circle))`, `d([stadium])`, `e[[subroutine]]`, `f[(cylinder)]`, `g{{hexagon}}`, `h>flag]` | Import as a labelled frame (shape geometry is not preserved; emit **one** `IMPORT_MERMAID_UNSUPPORTED_SHAPE` warning per non-rectangular shape, but keep the node and its label). |
| M5 | **Implicit node from edge** | `A --> B` with no `A[...]`/`B[...]` declaration | Create frames `A` and `B` on demand (label = id). This is the dominant real-world case and the main gap today. |
| M6 | Simple edge | `a --> b` | Directed arrow. |
| M7 | Labelled edge | `a -->|label| b`, `a -- "label" --> b` | Directed arrow with label. |
| M8 | **Chained edge** | `a --> b --> c --> d` | Expand to arrows `a→b`, `b→c`, `c→d`; create any implicit endpoints. |
| M9 | Chained edge with labels | `a -->|x| b -->|y| c` | Expand to labelled segments. |
| M10 | Bidirectional edge | `a <--> b`, `a <-->|label| b` | Emit **one** directed arrow `a→b` plus a documented `IMPORT_MERMAID_UNSUPPORTED_EDGE_DIRECTION` warning (the engine arrow model is directed-only — see `AuthorArrow.kind`). Do not drop the connection. |
| M11 | Other link styles | `a --- b` (open), `a ==> b` (thick), `a -.-> b` (dotted) | Import as a directed arrow + `IMPORT_MERMAID_UNSUPPORTED_EDGE_STYLE` warning; do not drop the connection. |
| M12 | Subgraph (id only) | `subgraph core` … `end` | Container frame. |
| M13 | Subgraph with label | `subgraph core["Core services"]` … `end` | Container frame with `heading`. |
| M14 | Nested subgraphs | subgraph inside subgraph | Nested container frames. |
| M15 | `:::class` suffix | `api["API"]:::leaf`, `subgraph x["X"]:::section` | Import node/subgraph; drop class with `IMPORT_MERMAID_UNSUPPORTED_STYLE` (already implemented). |
| M16 | Style / interaction statements | `classDef`, `class`, `style`, `linkStyle`, `click` | Diagnose + drop (already implemented). |
| M17 | Comments | `%% comment` | Ignore silently. |
| M18 | Frontmatter | `--- \n title: … \n config: {…big block…} \n ---` | Extract `title` only; ignore the rest without error (already implemented — keep working against the large `config`/`themeVariables`/`themeCSS` blocks in the corpus). |

**Canonical YAML emission:** imported Mermaid is serialized directly to
validated `engine: v3` YAML (arrows always emitted as objects). The emitted YAML
MUST pass `compileDiagramYaml` with zero errors (see FR-009).

**Diagnostics quality:** when an edge endpoint cannot be resolved *after*
implicit-node creation (should be rare), the message must say the endpoint could
not be created, not merely "missing frame ref". Non-flowchart input is handled
by the FR-008 guard, not by per-line syntax warnings.

### FR-005 — Interchange fidelity matrix

- Maintain normative matrix in `contracts/interchange-fidelity.md` (export + import columns).
- Tests reference matrix rows by field name.

### FR-006 — CLIs

| Script | Direction | Status |
|--------|-----------|--------|
| `export-mermaid.mjs` | YAML → `.mmd` | Exists (022) |
| `export-d2.mjs` | YAML → `.d2` | Exists (022) |
| `import-mermaid.mjs` | `.mmd` → YAML | New |
| `import-d2.mjs` | `.d2` → YAML | New |
| `interchange-roundtrip.mjs` | YAML → format → YAML + diff report | New (optional) |

All CLIs support `--strict`, `--out`, and stderr diagnostics consistent with
compile CLIs. Strict mode fails unsupported syntax and structural diagnostics;
the explicitly accepted lossy Mermaid downgrades in M4/M10/M11/M15/M16 remain
warnings so strict mode does not reject a construct FR-004 promises to import.

### FR-007 — Preview export UI

- The preview Document section MUST keep Save as the primary persistence action
  and provide one separate Export action for generated artifacts.
- The Export control MUST offer SVG, draw.io, Mermaid, and D2 formats from one
  format selector rather than adding one button per format.
- Export MUST download the selected format without changing dirty state or
  persisting overrides.
- Mermaid and D2 downloads MUST use the preview HTTP export routes and preserve
  the authored-slug filename (`.mmd` / `.d2`).
- The Document section MUST provide a collapsed Import diagram disclosure with
  Mermaid/D2 format selection, source-file selection, and a safe new-diagram
  name field.
- Import MUST create a new YAML diagram and navigate to it; it MUST refuse to
  overwrite an existing slug.
- The existing **Copy overrides** debug action MUST remain available; the
  consolidated artifact Export selector does not replace it.

### FR-008 — Unsupported diagram-type guard (Mermaid)

- Before parsing statements, the Mermaid importer MUST detect the diagram type
  from the first non-comment, non-frontmatter token.
- If the type is **not** `flowchart` / `graph`, the importer MUST return a single
  **error** (not a warning, not per-line noise) with code
  `IMPORT_MERMAID_UNSUPPORTED_DIAGRAM_TYPE`, naming the detected type and stating
  that only Mermaid flowcharts are supported. Example message:
  `Mermaid 'sequenceDiagram' is not supported. The diagram generator can only import Mermaid flowcharts (flowchart/graph). Detected diagram type: sequenceDiagram.`
- The guard MUST recognise at least these keywords and reject them:
  `sequenceDiagram`, `classDiagram`, `stateDiagram`, `stateDiagram-v2`,
  `erDiagram`, `journey`, `gantt`, `pie`, `quadrantChart`, `requirementDiagram`,
  `gitGraph`, `mindmap`, `timeline`, `sankey-beta`, `sankey`, `xychart-beta`,
  `block-beta`, `block`, `packet-beta`, `kanban`, `architecture-beta`,
  `radar-beta`, `C4Context`, `C4Container`, `C4Component`, `C4Dynamic`.
- An unknown/unrecognised first token (not a flowchart and not in the list) MUST
  also produce `IMPORT_MERMAID_UNSUPPORTED_DIAGRAM_TYPE` naming the token, rather
  than falling through to statement parsing.
- The error MUST surface identically through the CLI (`import-mermaid.mjs` exits
  non-zero with the message) and the preview import route (HTTP 400 with the
  message; nothing written to disk).

### FR-009 — No invalid or empty canonical YAML (closes review F1/F2)

- The import result MUST surface **all** structural validation diagnostics from
  `buildFrameIndex` (notably `DUPLICATE_FRAME_ID` and `FRAME_MISSING_ID`) as
  import errors. Today `makeImportedDocument` discards them, so the CLIs can
  write YAML that fails to compile. Fix at the shared import layer so both CLI
  and preview paths benefit.
- The synthetic root wrapper id (`page`) MUST NOT collide with an imported node
  of the same name. Either namespace the wrapper or detect the collision and
  raise a clear diagnostic — importing a node literally named `page` must not
  produce duplicate ids.
- `--strict` MUST fail for real diagnostics; it MUST NOT fail for constructs the
  FR-004 table promises to accept.
- If **zero** frames are imported, the CLI MUST exit non-zero with a clear
  message (parity with the preview route, which already throws `No diagram nodes
  could be imported`). It MUST NOT silently write an empty `children: []` diagram
  and exit 0.
- Every emitted YAML MUST pass `compileDiagramYaml` with zero errors. Add a CLI
  self-check (or reuse the preview re-compile pattern) so this cannot regress.

### FR-010 — Converted corpus examples (reviewer-visible deliverable)

Using the Mermaid import CLI, convert three files from the lightly-styled corpus
at `H:\WSL_dev_projects\mermaid\examples\custom\flowchart\mmd\mermaid-on-brand\`
into `diagrams/1.input/` so a reviewer can open them in the preview editor:

| Complexity | Source `.mmd` | Output slug (`diagrams/1.input/<slug>.yaml`) |
|------------|---------------|----------------------------------------------|
| Simple | `support-flowchart.mmd` | `mermaid-support-flowchart` |
| Medium | `mongo-octavia-ha.mmd` | `mermaid-mongo-octavia-ha` |
| Very complex | `707a041175dc9abe-lifecycle-details.mmd` | `mermaid-lifecycle-details` |

- Generate each with `import-mermaid.mjs --in <source> --out diagrams/1.input/<slug>.yaml`.
- Each output MUST load in the preview editor without errors and MUST compile
  cleanly (`compileDiagramYaml` → 0 errors).
- The medium example has a hand-authored analogue already in the repo
  (`diagrams/1.input/mongo-octavia-ha.yaml`); note in the PR how the converted
  version compares so the reviewer can judge fidelity.
- Record conversion statistics and warning summaries (expanded chain segments,
  dropped classes/styles, shape and direction/style downgrades) in the PR
  description.

## Non-Functional Requirements

- **NFR-001**: Import parsers live under `packages/layout-engine/src/diagram-author/import-*` mirroring export module layout.
- **NFR-002**: No new runtime dependency on D2/Mermaid binaries for **import** (pure TS parsing).
- **NFR-003**: Optional `D2_BIN` env for export golden compile checks in CI/dev only.
- **NFR-004**: Shared warning collector for layout fields used by both exporters.

## Non-Goals

- Mermaid or D2 as canonical authoring formats
- Full syntax coverage for either language
- Visual/on-brand styling parity in interchange formats (colors, icons, stroke tokens stay in TS SVG path)
- Automatic merge of imported D2 into live preview overrides without Save
- Replacing `../d2/` hand-crafted styled diagrams — those remain reference assets for styling experiments

## Success Criteria

1. Fidelity matrix published and referenced by tests.
2. D2 import recovers tiered-network and juju-bootstrap **structure** from exporter output.
3. Mermaid import recovers tiered-network **structure** from exporter output and emits canonical YAML suitable as first-pass authoring material.
4. Adversarial review items D2-01, D2-03, D2-06 closed in code/docs.
5. `docs/specs.md` and `docs/diagram-authoring.md` describe interchange as spec 028 scope.

### Added by the 2026-07-17 Mermaid-first slice

6. Every construct in the FR-004 "Required Mermaid flowchart coverage" table has
   a passing test using **hand-authored** input (implicit nodes, chained edges,
   bidirectional edges, node shapes) — not only exporter round-trips.
7. Importing each non-flowchart Mermaid type produces a single
   `IMPORT_MERMAID_UNSUPPORTED_DIAGRAM_TYPE` error naming the type (verified with
   real corpus files: Sankey, pie, sequence).
8. No import path emits invalid or empty canonical YAML: duplicate ids and the
   `page`-wrapper collision are surfaced as errors; empty imports exit non-zero
   from the CLI; every emitted YAML compiles with zero errors (review F1/F2
   closed).
9. The three FR-010 corpus examples exist in `diagrams/1.input/`, load in the
   preview editor, and compile cleanly.

## Related artifacts

| Artifact | Path |
|----------|------|
| D2 export adversarial review | `docs/spec-archive/022-diagram-authoring-ast/adversarial-review-d2-export.md` |
| D2 PoC repo | `../d2/` (`juju-4-architecture.d2`, `juju-bootstrap-machines-process.d2`) |
| Authoring docs | `docs/diagram-authoring.md` |
