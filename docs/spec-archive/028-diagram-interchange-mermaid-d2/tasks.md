# Tasks: 028 Diagram interchange (Mermaid & D2)

## Phase 0: Export hardening + fidelity matrix (022 follow-up)

- [x] T010 Publish `contracts/interchange-fidelity.md` from spec acceptance criteria
- [x] T011 Extract shared export warning helpers (`export-shared.ts`)
- [x] T012 D2: `D2_MISSING_FRAME_REF` when arrow endpoint absent from `frameIndex`
- [x] T013 D2: `D2_UNSUPPORTED_ARROW_STYLE` for `style`, `color`, `labelGap`
- [x] T014 Mermaid: `MERMAID_MISSING_FRAME_REF` parity with D2
- [x] T015 Mermaid: warn on arrow `style` / `color` if still silent
- [x] T016 Expand `data-model.md` D2 warning code table
- [x] T017 Update `docs/specs.md` row for 022 (D2 export landed)

## Phase 1: D2 import

- [x] T020 Create `import-d2.ts` — nested blocks, labels, connections subset
- [x] T021 `IMPORT_D2_UNSUPPORTED_*` diagnostics for classes/styles/icons
- [x] T022 Tests: parse exporter output for juju-bootstrap + tiered-network
- [x] T023 CLI `import-d2.mjs` (`--in`, `--out`, `--strict`)
- [x] T024 Round-trip test: YAML → exportD2 → importD2 → structural equality

## Phase 2: Mermaid import

- [x] T030 Create `import-mermaid.ts` — flowchart TB/LR subset
- [x] T031 `IMPORT_MERMAID_UNSUPPORTED_*` diagnostics
- [x] T032 Tests: parse exporter output for tiered-network
- [x] T033 CLI `import-mermaid.mjs`
- [x] T034 Mermaid-first workflow proof: `.mmd` input emits canonical `engine: v3` YAML directly, with one real-world multi-subgraph golden fixture

## Phase 3: AST → YAML serialization

- [x] T040 `serialize-diagram-yaml.ts` — canonical `engine: v3` shape
- [x] T041 Preserve arrow object vs shorthand policy (documented: imports always emit arrow objects)
- [x] T042 Wire import CLIs to emit YAML via serializer

## Phase 4: Integration & optional CI

- [x] T050 `interchange-roundtrip.mjs` diff report (structural vs lossy fields)
- [x] T051 Optional vitest gate when `D2_BIN` set (compile exported `.d2`)
- [x] T052 Document `../d2/` workflow in `docs/diagram-authoring.md`

## Phase 5: Preview HTTP export (P3)

- [x] T060 Preview routes `GET /api/export/mermaid` and `/api/export/d2`
- [x] T061 Cache by slug + YAML mtime (mirror SVG pool spirit)
- [x] T062 Preview Document section export control with SVG, draw.io, Mermaid, and D2 format choices
- [x] T063 Preview Import diagram disclosure for Mermaid/D2 files as new YAML diagrams

## Phase 6: Mermaid-first hand-authored import (2026-07-17 scope revision)

> Implements the FR-004 rewrite + FR-008/FR-009/FR-010. Read the "Scope
> revision (2026-07-17)" section of `spec.md` first. **Mermaid grammar only** —
> do not broaden `import-d2.ts` or touch `export-*.ts`. Shared structural
> diagnostics and the empty/recompile write guard apply to both import CLIs
> under T600/T602.
>
> **Rules for the implementer**
> - All new logic lives in `packages/layout-engine/src/diagram-author/import-mermaid.ts`
>   and `import-result.ts`. No new behaviour-heavy JS under `scripts/preview/`.
> - Work test-first: add the failing test named in each task, then make it pass.
>   Mermaid/import tests live in
>   `packages/layout-engine/tests/diagram-author-import.test.ts`.
> - Run `npm --prefix packages/layout-engine test -- diagram-author-import` after
>   each task. Do not mark a task `[x]` until its test passes and no existing
>   test regresses.
> - After changing anything imported by the browser bundle, run
>   `npm --prefix packages/layout-engine run build:browser` (only needed if
>   preview surface changes; pure parser changes do not).
> - Never edit files under `H:\WSL_dev_projects\mermaid` — it is a read-only
>   source corpus.

### Fix the review defects first (blocking, do before feature work)

- [x] T600 **Surface structural validation in import results (FR-009, review F2).**
  In `import-result.ts` `makeImportedDocument`, stop discarding
  `buildFrameIndex(root).diagnostics`. Return them so `finishImport` includes
  `DUPLICATE_FRAME_ID` / `FRAME_MISSING_ID` as errors. Test: importing Mermaid
  with two `A[...]` declarations yields an import **error** (not silent), and the
  emitted YAML is never written by the CLI.
- [x] T601 **Avoid the synthetic `page` wrapper id collision (FR-009).** When an
  imported top-level node is named `page`, the current wrapper produces duplicate
  ids. Either rename the wrapper deterministically or raise a clear diagnostic.
  Test: importing `flowchart TB\n page["Home"]` compiles with zero errors (no
  `DUPLICATE_FRAME_ID`).
- [x] T602 **CLI empty-import guard (FR-009, review F1c).** In
  `scripts/import-mermaid.mjs`, if the import produced zero frames, print a clear
  message to stderr and exit non-zero (mirror the preview route). Also re-compile
  the serialized YAML (`compileDiagramYaml`) before writing and fail on errors.
  Apply the same write-safety gate to `scripts/import-d2.mjs` without broadening
  D2 grammar. Test: script-level assertions that empty input → non-zero exit.

### Diagram-type guard (FR-008)

- [x] T603 **Detect and reject non-flowchart diagram types.** In
  `import-mermaid.ts`, after frontmatter handling, read the first non-comment
  token. If it is not `flowchart`/`graph`, return a single
  `IMPORT_MERMAID_UNSUPPORTED_DIAGRAM_TYPE` **error** naming the detected type;
  do not parse further statements. Cover the keyword list in FR-008 (and unknown
  tokens). Tests: `sequenceDiagram`, `pie`, `sankey-beta`, and an unknown token
  each yield exactly one error with the type named and zero phantom frames.

### Real hand-authored flowchart coverage (FR-004 table)

- [x] T604 **Implicit nodes from edges (M5).** Create frames for edge endpoints
  that were never declared (label = id), attached at document scope unless the
  endpoint is later declared inside a subgraph. Tests: `flowchart TD\n A --> B`
  imports two frames + one arrow, compiles clean. Re-run the F1 reproduction
  (`graph TD\n A --> B\n B --> C`) → three frames, two arrows, no
  `MISSING_FRAME_REF`.
- [x] T605 **Chained edges (M8/M9).** Expand `a --> b --> c` into segments
  `a→b`, `b→c`, creating implicit endpoints; carry per-segment labels for
  `a -->|x| b -->|y| c`. Tests assert the exact arrow list.
- [x] T606 **Bidirectional + alternate link styles (M10/M11).** Handle `<-->`,
  `---`, `==>`, `-.->`. Emit one directed arrow per connection plus the
  documented downgrade warning (`IMPORT_MERMAID_UNSUPPORTED_EDGE_DIRECTION` /
  `IMPORT_MERMAID_UNSUPPORTED_EDGE_STYLE`); never drop the connection. Tests
  assert the arrow exists and the warning code is present.
- [x] T607 **Node shapes (M4).** Accept `(round)`, `{diamond}`, `((circle))`,
  `([stadium])`, `[[subroutine]]`, `[(cylinder)]`, `{{hexagon}}`, `>flag]`.
  Import each as a labelled frame + one `IMPORT_MERMAID_UNSUPPORTED_SHAPE`
  warning; keep node and label. Tests: one assertion per shape.
- [x] T608 **Regression: styling + frontmatter robustness (M15–M18).** Add a test
  that imports a file containing a large `config`/`themeVariables` frontmatter
  block, `%%` comments, `:::class` suffixes, `classDef`/`class`/`style`/`linkStyle`
  lines, and nested labelled subgraphs, and still recovers the intended frames
  and arrows. (Guards against re-breaking already-working behaviour.)

### Diagnostics + matrix

- [x] T609 **Reword post-resolution missing-ref diagnostic (FR-004).** After
  implicit-node creation an unresolved endpoint should say the endpoint could not
  be created, not "missing frame ref". Update the fidelity matrix
  (`contracts/interchange-fidelity.md`): add rows for implicit nodes, chained
  edges, bidirectional/alt-style edges, node shapes, and the diagram-type guard.
  Update the "Known import limitations (v1)" table accordingly.

### Corpus example deliverables (FR-010)

- [x] T610 **Convert simple example.** Run
  `node packages/layout-engine/scripts/import-mermaid.mjs --in "H:\WSL_dev_projects\mermaid\examples\custom\flowchart\mmd\mermaid-on-brand\support-flowchart.mmd" --out diagrams/1.input/mermaid-support-flowchart.yaml`.
  Verify it loads in the preview editor and `compileDiagramYaml` → 0 errors.
- [x] T611 **Convert medium example.**
  `mongo-octavia-ha.mmd` → `diagrams/1.input/mermaid-mongo-octavia-ha.yaml`.
  Compare against the existing `diagrams/1.input/mongo-octavia-ha.yaml` and note
  differences in the PR.
- [x] T612 **Convert very-complex example.**
  `707a041175dc9abe-lifecycle-details.mmd` →
  `diagrams/1.input/mermaid-lifecycle-details.yaml`. Verify preview load + clean
  compile. Record the warning summary (chained-edge expansions, dropped classes)
  in the PR.
- [x] T613 **Guard-file smoke check (FR-008).** Confirm the CLI rejects, with one
  clear message each and non-zero exit:
  `…\examples\custom\sankey\mmd\mermaid-on-brand\baseline.mmd`,
  `…\examples\custom\pie\mmd\mermaid-on-brand\support-pie.mmd`,
  `…\examples\custom\sequence\mmd\mermaid-on-brand\baseline.mmd`.
  These files are **not** committed to this repo; they stay in the corpus.

### Docs + closeout

- [x] T614 Update `docs/diagram-authoring.md`: Mermaid import now handles
  hand-authored flowcharts (implicit nodes, chained/bidirectional edges, node
  shapes) and rejects non-flowchart types with a clear message. State that D2
  hand-authored import is deferred.
- [x] T615 Run the full layout-engine + preview test suites green; update
  `docs/specs.md` status. Do not claim closeout until T600–T613 pass.

## Traceability

| User story | Tasks |
|------------|-------|
| US1 Documented export | T010–T017 |
| US2 D2 import | T020–T024 |
| US3 Mermaid import | T030–T034 |
| US4 Round-trip CLIs | T023, T033, T040–T042, T050 |
| US5 Export hardening | T011–T016 |
| US6 Preview HTTP | T060–T061 |
| FR-004 Mermaid hand-authored (rev) | T604–T609 |
| FR-008 Unsupported-type guard | T603, T613 |
| FR-009 No invalid/empty YAML | T600–T602 |
| FR-010 Corpus examples | T610–T612 |
