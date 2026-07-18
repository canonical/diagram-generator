# Feature specification: renderable interchange import

**Feature branch**: `feat/080-renderable-interchange-import`

**Spec package**: `080-renderable-interchange-import`

**Created**: 2026-07-18

**Status**: Draft (authored during Opus adversarial review; no product code implemented)

**Depends on**: spec **028** (Mermaid & D2 interchange, merged), spec **022** (diagram authoring AST), the ELK layered engine in `packages/graph-layout-elk/`, and the preview folder-workspace import route from spec **075**.

**Supersedes the import breadth boundary of**: spec 028 FR-004 and its "Known import limitations" table in `specs/028-diagram-interchange-mermaid-d2/contracts/interchange-fidelity.md`.

## Origin

This spec was created from the 2026-07-18 adversarial review recorded in
[`docs/spec-reviews/opus-adversarial-review-findings-2026-07-18-renderable-interchange-import.md`](../../docs/spec-reviews/opus-adversarial-review-findings-2026-07-18-renderable-interchange-import.md).
Read that findings file first. The review reproduced a folder-workspace Mermaid
import that reported "Imported with 41 warning(s)" while silently dropping edges,
both endpoint nodes of those edges, and a subgraph-local `direction` statement.
That is a materially lossy import presented as success.

## Problem statement

Spec 028 shipped a Mermaid-first, hand-authored flowchart importer plus a frozen
exporter-round-trip D2 importer. It is correct for the enumerated FR-004 corpus
subset, but it has two structural defects that this spec must close:

1. **Structural loss is surfaced as a warning, not a block.** The preview import
   route (`importInterchangeForSlug` in
   `apps/preview/src/preview-host/frame-documents.ts`) blocks a write only when
   `imported.errors.length > 0`. Dropping an entire edge
   (`IMPORT_MERMAID_UNSUPPORTED_EDGE`), a whole statement
   (`IMPORT_MERMAID_UNSUPPORTED_SYNTAX`), or a direction
   (`IMPORT_MERMAID_UNSUPPORTED_DIRECTION`) is a **warning**, so the falsified
   diagram is written to disk and the UI shows a success toast. Warning count is
   not a fidelity measure; a diagram that dropped a topology-carrying edge is a
   *wrong* diagram even though the resulting YAML compiles.

2. **The importer is narrower than the rendering substrate.** Several constructs
   the review flagged are representable today with no renderer work: inline node
   declarations on an edge (`a["A"]:::x --> b["B"]:::y`), chained inline
   declarations, subgraph-local `direction`, and multi-target fan-out. The
   line-oriented regex parser rejects them wholesale. A smaller set (reverse
   directions `RL`/`BT`, some `:::class`/`style` semantics) needs canonical-model
   or lowering work before it can be imported faithfully.

The honest boundary is capability-based, not exporter-shaped: import every
construct whose graph meaning can be lowered into canonical frame YAML and
rendered by at least one supported engine; downgrade only genuinely
unrepresentable presentation with an explicit diagnostic; and **block** import
when topology, containment, endpoint, direction, or other meaning would be lost.

## Normative definitions

### "Renderable"

An interchange construct is **renderable** if and only if there is a complete,
verified path:

`source syntax → parsed semantic IR → canonical frame YAML/AST → capability of at least one registered engine (v3 autolayout or an ELK engine) → rendered result → persisted YAML that reloads and recompiles with zero errors.`

If any link in that chain is missing, the construct is **not renderable yet** and
this spec must either (a) add the prerequisite task, or (b) declare it a non-goal
with a reason. ELK's option catalog is not a Mermaid grammar: the ability of ELK
to arrange arbitrary graphs does not by itself make any source syntax renderable.

### "Structural loss"

An import causes **structural loss** if the imported-and-persisted diagram would
differ from the source in any of the following graph-meaning dimensions:

- **Topology** – a declared edge is dropped, redirected, or its endpoints changed.
- **Containment** – a node's parent/child (subgraph) relationship is dropped or changed.
- **Endpoint identity** – a declared node participating in an edge is dropped or merged.
- **Direction** – a declared graph or subgraph direction is dropped or reversed into a different orientation than the source specified.
- **Multiplicity** – a multi-target or chained edge is collapsed so that some declared connections disappear.

Structural loss is distinct from **visual downgrade** (see below) and must
**block** the write.

### "Visual downgrade"

A **visual downgrade** drops presentation-only detail that does not change graph
meaning: non-rectangular node shape geometry, class/style fills and borders that
have no faithful frame-field mapping, icons, link stroke style (thick/dotted/open
rendered as a standard directed arrow), and bidirectional glyphs collapsed to a
directed arrow. Visual downgrades remain **warnings** and never block, but each
must be named explicitly in the import diagnostics.

## Mission

Replace the exporter-shaped import boundary with a capability-based contract:

| Guarantee | Behaviour |
|-----------|-----------|
| No silent structural loss | Any dropped edge, node, containment, direction, or multiplicity blocks the write and is reported as an error. |
| No false success | The import UI must never report success for a diagram that lost graph meaning. |
| Faithful breadth | Every construct with a verified renderable path is imported, not just what our own exporter emits. |
| Honest downgrade | Presentation-only loss is a named warning, never a block, never silent. |
| Deterministic engine | Import chooses and persists an engine deterministically based on what the graph needs. |

Frame YAML remains the only canonical authoring format. Import produces YAML that
passes `compileDiagramYaml` unchanged; it never bypasses validation.

## User scenarios & testing

### User story 1 — an inline-declared edge imports faithfully (Priority: P1)

As a field engineer pasting hand-authored Mermaid, when my flowchart declares
nodes inline on the edge (`power_on["Power On"]:::highlight --> load_spl["Load SPL"]:::leaf`),
I want both nodes and the directed edge imported, with the class suffix reported
as a visual downgrade, not the whole line dropped.

**Independent test**: import a flowchart whose only edge uses inline declarations
on both sides. Assert two frames with the decoded labels, one directed arrow
between them, one `*_UNSUPPORTED_STYLE` visual-downgrade warning for each class
suffix, and zero structural-loss diagnostics. The emitted YAML compiles with zero
errors.

**Acceptance scenarios**

1. **Given** `a["A"] --> b["B"]`, **when** imported, **then** frames `a`, `b` with labels `A`, `B` and one arrow `a→b` exist.
2. **Given** `a["A"]:::x --> b["B"]:::y`, **when** imported, **then** the same topology plus two visual-downgrade warnings, and the write is **not** blocked.
3. **Given** `a["A"] --> b["B"] --> c{"C"}` (chained inline), **when** imported, **then** arrows `a→b`, `b→c` and three frames exist; the diamond shape emits one shape downgrade warning.

### User story 2 — subgraph-local direction is preserved or honestly blocked (Priority: P1)

As an author whose subgraph declares `direction LR` inside an otherwise `TB`
diagram, I want that local direction preserved on the container frame, or - if
the model genuinely cannot express it - a clear structural-loss block, never a
silent success.

**Independent test**: import a subgraph containing `direction LR`. Assert the
container frame carries `direction: horizontal` and the import is not blocked, OR
(if the phased model work is not yet landed) assert a single structural-loss
error names the dropped direction and the write is blocked. The behaviour must be
one of those two - never a silent warning-only success.

**Acceptance scenarios**

1. **Given** a subgraph with `direction LR`, **when** imported after model support lands, **then** the container frame has `direction: horizontal`.
2. **Given** the same input before model support lands, **when** imported, **then** a structural-loss error blocks the write and names the dropped direction.

### User story 3 — structural loss blocks the write (Priority: P1)

As any importer (preview folder workspace, preview server root, or CLI), when a
construct would drop an edge, node, containment, direction, or multiplicity, I
want the import to fail before writing, with a diagnostic that names exactly what
would be lost.

**Independent test**: feed a source containing one genuinely unrepresentable
construct that carries topology. Assert the import returns an error (not a
warning), nothing is written to disk, and the preview route returns HTTP 400 with
the same message. Assert the CLI exits non-zero. Assert the local-folder path
does not mirror any file.

**Acceptance scenarios**

1. **Given** a construct that would drop an edge, **when** imported through any path, **then** an error blocks the write.
2. **Given** the folder-workspace path, **when** a structural-loss error occurs, **then** no `.yaml` is mirrored into the opened folder.
3. **Given** a source with only visual downgrades and no structural loss, **when** imported, **then** the write succeeds and the UI names each downgrade.

### User story 4 — the import result reports preserved / downgraded / blocked (Priority: P2)

As a preview user, when I import a diagram, I want the result to tell me what was
preserved, what was downgraded (and why), and what was blocked, instead of a bare
"Imported with N warning(s)".

**Independent test**: the import result carries a structured summary
(`preserved`, `downgraded`, `blocked` counts plus per-item reasons). The preview
UI renders those three categories. A structural-loss import shows the blocked
category and does not show a success status.

### User story 5 — deterministic engine selection and persistence (Priority: P2)

As a maintainer, I want import to choose an engine deterministically: v3
autolayout when it can preserve the graph, ELK layered when the graph needs
capabilities v3 lacks (for example nested compounds with cross-container edges or
non-default directions), and a block when neither can render the graph
faithfully. The chosen engine must be persisted in the emitted YAML so reload
renders identically.

**Independent test**: import a flat single-direction flowchart and assert
`engine: v3`. Import a nested-subgraph flowchart with cross-subgraph edges and
assert the persisted engine is the ELK engine that supports compounds. Reload
each and assert the rendered engine matches the persisted engine.

### User story 6 — D2 parity is planned, not silently narrower (Priority: P3)

As a maintainer, I want the same capability contract applied to D2: constructs
already representable by the shared graph IR (nested blocks, dot-path endpoints,
labelled connections) import faithfully and block on structural loss; broader D2
grammar is phased explicitly rather than left as an exporter-round-trip-only
importer.

**Independent test**: the capability matrix classifies every audited D2 construct;
D2 structural loss blocks the write through the same shared gate as Mermaid; the
phased D2 tasks are listed and not marked complete.

## Functional requirements

### FR-001 — Capability-based import contract

- Import MUST accept every construct classified "faithfully supported now" or "representable now, parser/import UX missing" in `contracts/import-capability-matrix.md`.
- Import MUST block (error, before write) every construct classified "structurally unrepresentable / import-blocking".
- Import MUST downgrade (warning, never block, never silent) every construct classified "presentation-only downgrade".
- "Requires canonical-model or lowering work" constructs MUST block until the prerequisite task lands, then move to a supported class. They MUST NOT be silently dropped in the interim.

### FR-002 — Structural-loss gate is shared and blocking

- A single shared gate (owner: `packages/layout-engine/src/diagram-author/import-result.ts`) MUST classify each diagnostic as `structural` (blocking) or `visual` (non-blocking) via an explicit diagnostic category field, not by string code lists duplicated per call site.
- All import entry points MUST use this gate: the preview server route (`importInterchangeForSlug`), the local-folder workspace path (`local-folder-workspace.ts`), and both CLIs (`import-mermaid.mjs`, `import-d2.mjs`).
- A `structural` diagnostic MUST block the write regardless of strict mode. Strict mode is not required to make structural loss fail.
- The current preview call `importMermaid(source)` (no options) MUST NOT be able to write a structurally lossy diagram.

### FR-003 — No false-success reporting

- The import result MUST expose a structured summary: counts and per-item detail for `preserved`, `downgraded`, and `blocked`.
- The preview UI MUST replace the bare `Imported with N warning(s)` string with a summary that separates visual downgrades from a blocked/failed import.
- A structural-loss import MUST NOT show a success status (`setStatus('Imported', 'ok')`) and MUST NOT navigate to the imported slug.

### FR-004 — Inline node declarations on edges (screenshot priority)

- The Mermaid importer MUST parse node declarations on either side of an edge: `id[...]`, `id(...)`, `id{...}`, `id((...))`, `id([...])`, `id[[...]]`, `id[(...)]`, `id{{...}}`, `id>...]`, each optionally followed by a `:::class` suffix.
- Both endpoints MUST become frames with their decoded labels; the directed edge MUST be created.
- Chained inline declarations (`a[A] --> b[B] --> c[C]`) MUST expand to one arrow per segment, creating every declared node.
- A shape geometry loss on an inline-declared node emits one visual-downgrade warning per node (as today for standalone shapes). A `:::class` suffix emits one visual-downgrade warning.
- A later declaration that refines an implicit node (edge first, `id["label"]` later) MUST update that node's label rather than create a duplicate id.

### FR-005 — Directions: axis and orientation

- Top-level and subgraph-local `TB`, `TD`, `LR`, `RL`, `BT` MUST be handled explicitly.
- `TB`/`TD` → vertical; `LR` → horizontal (existing behaviour) MUST be preserved.
- Subgraph-local `direction` MUST set the container frame's `direction` rather than routing to `IMPORT_MERMAID_UNSUPPORTED_SYNTAX`.
- `RL` (reverse horizontal) and `BT` (reverse vertical) carry orientation the current `'vertical' | 'horizontal'` model cannot express. Until the canonical model gains a reverse/orientation field (see FR-009), `RL` and `BT` MUST be treated as structural loss and block, naming the dropped orientation. They MUST NOT be silently collapsed to `LR`/`TB` as they are today.

### FR-006 — Class / style property mapping

- For each Mermaid `:::class`, `classDef`, `class`, and `style` property, the importer MUST map to an existing frame/arrow field when a faithful mapping exists (candidates to evaluate: `fill`, `border`; explicitly out of scope for auto-mapping: `level`, `variant`, `role`, which are structural encodings, not colour hints).
- Properties with no faithful field MUST emit a visual-downgrade warning and be dropped; they MUST NOT block.
- The capability matrix MUST record, per property, whether it maps or downgrades. This spec does not require colour parity; it requires that mappable properties are not discarded blindly and unmappable ones are named.

### FR-007 — Multi-target and fan-out expansion

- Multi-target links that expand deterministically to ordinary directed arrows (for example Mermaid `a --> b & c`, `a & b --> c`) MUST expand to the full set of directed arrows, creating implicit endpoints.
- If an expansion cannot be represented (no faithful directed-arrow set), it MUST block as structural loss, not drop silently.

### FR-008 — Nested subgraphs and cross-subgraph edges

- Nested subgraphs MUST import as nested container frames (existing behaviour) and MUST be verified against the ELK graph builder's compound support (`packages/graph-layout-elk/src/elk-graph-builder.ts`, `findCommonAncestor`).
- Cross-subgraph edges (endpoints in different containers) MUST be preserved. If the selected engine cannot route a cross-container edge, engine selection (FR-010) MUST pick one that can, or block.
- Compound endpoints (an edge to/from a subgraph container id) MUST either be preserved faithfully or blocked with a diagnostic; they MUST NOT be silently reattached to a child.

### FR-009 — Canonical-model prerequisites (no magic)

- Any construct whose faithful representation needs a new canonical field MUST have an explicit model task before its import is enabled. Known prerequisites from this review:
  - reverse/orientation direction (`RL`/`BT`) needs a canonical direction representation beyond `'vertical' | 'horizontal'` (`AuthorFrameNode.direction`, `FrameTemplate.direction`, and the lowering in `lower-to-frame.ts` and the frame model).
  - persisted engine selection needs the import serializer to emit `meta.layout_engine` deterministically.
- Until a prerequisite lands, the dependent construct blocks (FR-005), it is not silently downgraded.
- No task may assume "ELK supports it" is sufficient. Each enabled construct MUST trace the full renderable chain in its task proof.

### FR-010 — Deterministic engine selection and persistence

- Import MUST select an engine by a documented, deterministic rule:
  - v3 autolayout when the graph is a nesting-compatible tree/DAG that v3 renders faithfully.
  - ELK layered (or another registered ELK engine whose `capabilities` cover the need) when the graph requires compounds with cross-container edges, non-default direction, or other capability v3 lacks.
  - block when neither can render the graph faithfully.
- The selected engine MUST be persisted in the emitted YAML (`meta.layout_engine`) so reload renders identically.
- Engine selection MUST read declared engine capabilities (`packages/graph-layout-elk/src/engine-capabilities.ts`), not hard-coded engine ids.

### FR-011 — Original source preservation

- On a blocked import, nothing is written; the caller keeps the original source to retry.
- On a successful import, the importer MUST preserve enough provenance to explain the conversion (at minimum: the import summary is returned to the caller; optional stretch: record the source format in `meta`). It MUST NOT overwrite or delete the source `.mmd`/`.d2` input.

### FR-012 — Parser architecture

- The Mermaid flowchart importer MUST move from per-line regex dispatch to a small tokenizer + statement parser that produces a typed semantic IR, then lowers the IR to frames/arrows. Rationale and evidence are in the findings file (the regex approach cannot express inline-declaration edges without ad hoc special cases and does not scale to fan-out/chained-inline).
- The IR MUST be the single place topology, containment, and direction are decided; lowering to canonical YAML MUST be a pure transform over the IR.
- Node ids MUST be deterministic; duplicate declarations MUST be merged or flagged per the structural-loss rules; diagnostic locations MUST carry line numbers.

### FR-013 — Security and bounded input

- Input MUST be bounded (max bytes, max lines, max nesting depth, max nodes/edges) with a clear diagnostic when exceeded; no unbounded backtracking regex on attacker-influenced input.
- Malformed input MUST fail with diagnostics, never crash the preview server or CLI.
- Imported labels MUST remain data (no HTML/script injection into the preview through label text); verify against the existing preview HTML allowlist.

### FR-014 — D2 parity (phased)

- The capability matrix MUST classify every audited D2 construct with the same six classes as Mermaid.
- D2 import MUST route through the same shared structural-loss gate (FR-002).
- Broader D2 grammar (chained connections, class/style mapping) is phased in explicit tasks; those tasks are authored here but not implemented in this pass.

### FR-015 — Preview persist → reload regression coverage

- Every changed preview import/write path MUST have a repo-owned `import → persist → reload → render` regression for both the server-root and local-folder sources, per the spec-075 and spec-046 gates.
- The regressions MUST assert topology, nesting, direction, engine, and the summary categories - not merely "no parser error" or "compiles".

## Non-functional requirements

- **NFR-001**: All import logic stays in TypeScript under `packages/layout-engine/src/diagram-author/`. No new behaviour-heavy JS under `scripts/preview/` (spec-046 ratchet). Preview wiring delegates to typed owners.
- **NFR-002**: No new runtime dependency on external Mermaid/D2 binaries for import (pure TS parsing).
- **NFR-003**: Import of a bounded corpus fixture completes within a documented time budget (set a concrete ceiling in `validation.md`).
- **NFR-004**: The structural-loss category is data-driven (a field on the diagnostic), not duplicated string lists across call sites.

## Non-goals

- Non-flowchart Mermaid diagram types (sequence, class, state, ER, gantt, pie, journey, gitGraph, mindmap, timeline, quadrant, requirement, sankey, C4, block, packet, kanban, xychart) remain rejected by the FR-008 guard of spec 028. A `sequenceDiagram` importer targeting the existing sequence model is a plausible separate spec, not this one.
- Full visual/on-brand styling parity (colour palettes, icon libraries) - only faithful field mapping (FR-006) is in scope.
- Mermaid or D2 as canonical authoring formats.
- Automatic merge of imported diagrams into live preview overrides without an explicit write.
- Constructs classified "structurally unrepresentable" in the matrix (for example arbitrary edge animation, markdown node bodies with embedded diagrams) stay blocked with a diagnostic until a future spec proves a renderable path.

## Success criteria

1. The screenshot's two failures are fixed: inline-declared edges import with both nodes and the arrow (FR-004); subgraph-local `direction` is preserved or honestly blocked (FR-005), never a silent warning-only success.
2. No import path can write a structurally lossy diagram; the shared gate blocks edges/nodes/containment/direction/multiplicity loss through preview server, local folder, and both CLIs (FR-002).
3. The import UI distinguishes preserved / downgraded / blocked and never reports success for a structurally lossy import (FR-003).
4. Engine selection is deterministic and persisted; reload renders with the persisted engine (FR-010).
5. The capability matrix in `contracts/import-capability-matrix.md` classifies every Mermaid flowchart construct and every audited D2 construct into the six classes, and every "supported" row cites a passing test.
6. `import → persist → reload → render` regressions exist for server-root and local-folder sources and assert topology, nesting, direction, engine, and summary (FR-015).
7. Bounded-input and malformed-input tests pass; no crash, no unbounded regex (FR-013).
