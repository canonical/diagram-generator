# Tasks: renderable interchange import

**Spec**: 080-renderable-interchange-import

> **Implementation complete; first adversarial review remediated and follow-up pending.**
> Work was executed test-first on `feat/080-renderable-interchange-import`.
> Every task names an owner file/seam, expected behaviour, and proof. Do not mark
> a task `[ ]` → `[x]` until its named test passes and no existing test regresses.
>
> **Rules for the implementer**
> - All logic lives in TypeScript under `packages/layout-engine/src/diagram-author/`.
>   No new behaviour-heavy JS under `scripts/preview/` (spec-046 ratchet).
> - Work test-first: add the failing test named in each task, then make it pass.
>   Import tests live in `packages/layout-engine/tests/diagram-author-import.test.ts`
>   (add new files per area as noted).
> - Run `npm --prefix packages/layout-engine test -- diagram-author-import` after
>   each task; run the preview suite after Phase 4 tasks.
> - After changing browser-bundle-imported code, run
>   `npm --prefix packages/layout-engine run build:browser`.
> - Never edit files under `H:\WSL_dev_projects\mermaid` (read-only corpus).
> - Reference capability-matrix rows by id (MF-xx / D2-xx) in test names.

## Phase 0 — Structural-loss gate (blocking; do before parser work)

- [x] T000 **Add `category` to `Diagnostic`.** Owner: `src/diagram-author/types.ts`. Add `category?: 'structural' | 'visual' | 'type' | 'invalid'`. Update the `diagnostic()` factory in `import-result.ts` to accept and default it. Proof: type compiles; existing diagnostics still build.
- [x] T001 **Classify existing Mermaid diagnostics.** Owner: `import-mermaid.ts`. Tag `IMPORT_MERMAID_UNSUPPORTED_EDGE`, `_SYNTAX`, `_DIRECTION`, `_SUBGRAPH`, `MISSING_FRAME_REF` as `structural`; `_SHAPE`, `_STYLE`, `_EDGE_STYLE`, `_EDGE_DIRECTION` as `visual`; `_DIAGRAM_TYPE` as `type`; `_FRONTMATTER` as `invalid`. Proof: a unit test asserts the category of each code.
- [x] T002 **Make the shared gate block on `structural`/`invalid`/`type` regardless of strict.** Owner: `import-result.ts` `finishImport`. Any diagnostic with a blocking category becomes an error even in non-strict mode. Proof: `finishImport` test — a `structural` warning input yields a non-empty `errors` array in non-strict mode.
- [x] T003 **Add `ImportSummary` to the result.** Owner: `import-result.ts`. `DiagramImportResult` gains `summary: { preserved: number; downgraded: Diagnostic[]; blocked: Diagnostic[] }`. Proof: test asserts counts for a mixed input.
- [x] T004 **Regression: current screenshot input now blocks.** Owner: `tests/diagram-author-import.test.ts`. Import `power_on["Power On"]:::highlight --> load_spl["Load SPL"]:::leaf` (as spec 028 parses it) and assert it is now a blocking error (before Phase 2 makes it supported). This proves the gate closed the silent-loss hole. Proof: test red→green.
- [x] T005 **Wire the preview server gate to the shared classification.** Owner: `apps/preview/src/preview-host/frame-documents.ts` `importInterchangeForSlug`. Return the summary; keep the "already exists"/empty/recompile guards. Proof: `apps/preview/src/persistence/interchange-export.test.ts` extended — a structural-loss source returns an error and writes nothing.
- [x] T006 **Confirm local-folder path inherits the gate.** Owner: `src/preview-shell/local-folder-workspace.ts`. Verify no separate leniency: a blocked server response must not mirror a file. Proof: `tests/local-folder-workspace.test.ts` — blocked import does not call the folder write.
- [x] T007 **CLIs surface structural category.** Owner: `scripts/import-mermaid.mjs`, `scripts/import-d2.mjs`. Verify structural diagnostics appear in `result.errors` and exit non-zero. Proof: `tests/diagram-author-import-cli.test.ts` — structural-loss input exits non-zero, writes nothing.

## Phase 1 — Mermaid tokenizer + parser + IR

- [x] T010 **Define the flowchart IR.** Owner: new `src/diagram-author/mermaid/flowchart-ir.ts`. Types: `IrNode { id, label?, shape?, classes[] }`, `IrEdge { source, target, label?, connector, category-hints }`, `IrContainer { id, heading?, direction?, children[] }`, `IrFlowchart { direction, roots[], edges[] }`. Proof: type-only; consumed by later tasks.
- [x] T011 **Tokenizer.** Owner: new `mermaid/tokenize.ts`. Produce tokens for ids, bracketed shapes (`[]`, `()`, `{}`, `(())`, `([])`, `[[]]`, `[()]`, `{{}}`, `>]`), quoted strings, connectors (`-->`, `---`, `==>`, `-.->`, `<-->`, labelled variants), `&`, `:::class`, `;`, `subgraph`/`end`/`direction` keywords, comments, frontmatter. Bounded (FR-013). Proof: `tests/mermaid-tokenize.test.ts` covers each token kind and a malformed/oversized input.
- [x] T012 **Statement parser → IR.** Owner: new `mermaid/parse-flowchart.ts`. Consume tokens into `IrFlowchart`; handle statement separation by newline and `;` (MF-27). Proof: `tests/mermaid-parse.test.ts` — parse trees for representative statements; no behaviour wired to import yet.
- [x] T013 **Port every spec-028 import test onto the IR path (no output change).** Owner: `tests/diagram-author-import.test.ts`. Route `importMermaid` through tokenize→parse→lower (lowering stub reproducing current output) and keep all existing assertions green. Proof: existing suite passes unchanged. **This guards the rewrite.**

### Phase gate A — parser/IR proven before persistence integration

- [x] T014 **Gate A checkpoint.** All Phase 0–1 tests green; `importMermaid` fully on the IR path; no preview wiring changed beyond Phase 0. Record evidence in `validation.md`. Do not start Phase 4 before this is green.

## Phase 2 — IR lowering + supported/blocking constructs

- [x] T020 **IR → AST lowering with structural-loss detection.** Owner: new `mermaid/lower-flowchart.ts`. Pure transform IR→`AuthorFrameNode[]`+`AuthorArrow[]`; emit `structural` diagnostics when an edge endpoint or container cannot be represented. Proof: `tests/mermaid-lower.test.ts` topology/containment assertions.
- [x] T021 **MF-16/17: inline node declarations on edges.** Parse `id[...]:::class --> id[...]:::class`; create both frames with labels; create the arrow; class suffix → `visual` warning. Proof: US-1 acceptance tests; the screenshot edge now imports (both nodes + arrow), not blocks.
- [x] T022 **MF-18: chained inline declarations.** `a[A] --> b[B] --> c[C]` expands to arrows and creates each node. Proof: matrix-row test asserts 3 nodes, 2 arrows.
- [x] T023 **MF-19: later declaration refines an implicit node.** Edge first, `id["Label"]` later merges label into the existing node; no duplicate id. Proof: matrix-row test asserts one node with the refined label.
- [x] T024 **MF-20 (LR/TB): subgraph-local direction.** `direction LR|TB|TD` sets the container frame `direction`; not routed to `_SYNTAX`. Proof: US-2 acceptance test — container has `direction: horizontal`.
- [x] T025 **MF-26: multi-target fan-out.** `a --> b & c`, `a & b --> c` expand to the full arrow set, creating implicit endpoints; unexpandable → `structural` block. Proof: matrix-row test asserts arrow set.
- [x] T026 **MF-28/MF-30: blocking/downgrade edge cases.** Edge ids/animation (MF-28) block as `structural`; markdown node body (MF-30) downgrades text. Proof: matrix-row tests.
- [x] T027 **False-positive battery.** Self-loop (MF-31), parallel edges (MF-32), cycle (MF-33), disconnected components (MF-34): assert exact node/edge counts and parent links, not just compile. Proof: `tests/mermaid-topology.test.ts`.

## Phase 3 — canonical reverse direction + engine selection

- [x] T030 **Model task: reverse/orientation direction.** Owner: `types.ts` (`AuthorFrameNode.direction`, `FrameTemplate.direction`), `lower-to-frame.ts`, frame-model, ELK direction mapping in `packages/graph-layout-elk/src/elk-graph-builder.ts`. Add a canonical representation for `RL`/`BT` (`LEFT`/`UP`) or an explicit reverse flag. Proof: `lower-to-frame` test round-trips a reverse direction; ELK builder maps it to `LEFT`/`UP`.
- [x] T031 **MF-03 / MF-20(RL,BT): enable reverse directions.** Once T030 lands, reclassify RL/BT from block to supported; import sets the reverse direction. Proof: matrix-row tests; before T030, assert they block (T032).
- [x] T032 **Reverse-direction transition guard (superseded by T030/T031).** During implementation, `graph RL`/`graph BT` and subgraph `direction RL/BT` were required to block until the canonical model landed. The final model now preserves them and the permanent regression asserts `LEFT`/`UP` lowering instead of retaining a transient blocking test.
- [x] T033 **Engine selection.** Owner: new `src/diagram-author/select-import-engine.ts`. Implement the decision table using `@diagram-generator/graph-layout-elk` `engine-capabilities` (compounds, directions). Proof: `tests/select-import-engine.test.ts` — flat→v3, cross-container→ELK layered, unrenderable→block.
- [x] T034 **Persist selected engine.** Owner: import serializer path (`serializeDiagramYaml` inputs / `makeImportedDocument` source). Emit `meta.layout_engine` deterministically. Proof: test asserts the emitted YAML carries the selected engine and reload resolves it.

## Phase 4 — preview integration + persistence regressions

- [x] T040 **Import summary in the preview UI.** Owner: `src/preview-shell/app-save-client.ts` import handler (~L479-490). Replace `Imported with N warning(s)` with preserved/downgraded/blocked; a blocked import shows failure, does not set `ok` status, does not navigate. Proof: `tests/app-save-client.test.ts` — blocked response shows failure and no navigation; downgrade-only shows success with named downgrades.
- [x] T041 **Server-root persist→reload regression.** Owner: `apps/preview/src/persistence/*.test.ts`. Import a nested cross-container flowchart → persist → reload → assert topology, nesting, direction, persisted engine. Proof: new test.
- [x] T042 **Local-folder persist→reload regression.** Owner: `tests/local-folder-workspace.test.ts`. Same assertions via the local-folder mirror path. Proof: new test.

### Phase gate B — persistence proven

- [x] T043 **Gate B checkpoint.** No preview import path writes a structurally lossy diagram; both persist→reload regressions green; full layout-engine + preview suites green. Record in `validation.md`.

## Phase 5 — D2 parity (phased)

- [x] T050 **D2 through the shared gate.** Owner: `import-d2.ts`. Route D2 diagnostics through `category`; `IMPORT_D2_MISSING_FRAME_REF` for a real endpoint drop becomes `structural`. Proof: test — D2 structural loss blocks the write.
- [x] T051 **D2-06: chained connections.** `a -> b -> c` expands to arrows. Proof: matrix-row test.
- [x] T052 **D2-07: direction.** Map `direction: right|down` to container direction; reverse blocks until T030. Proof: matrix-row test.
- [x] T053 **D2-08/09: class/style mapping (fill/border).** Faithful props applied per FR-006; rest downgraded. Proof: matrix-row test.

## Phase 6 — hardening, corpus, docs

- [x] T060 **Bounded/malformed input.** Oversized source, deep nesting, unterminated subgraph, adversarial HTML label. Assert graceful failure with diagnostics, no crash, no injection. Proof: `tests/mermaid-robustness.test.ts`; verify against `scripts/preview_html_allowlist.txt`.
- [x] T061 **Corpus fixtures.** Convert 2–3 representative hand-authored files (including the screenshot boot/SPL shape) into `diagrams/1.input/`; each loads in preview and compiles clean. Proof: fixtures + a compile test.
- [x] T062 **Capability-matrix test index.** Ensure every `S`/`P`/`V`/`B`/`M` matrix row cites a passing test by id; add a checklist test or doc cross-reference. Proof: matrix rows annotated with test names.
- [x] T063 **Docs.** Update `docs/diagram-authoring.md` and `contracts/interchange-fidelity.md` (spec 028) to point at the spec-080 capability matrix as the import authority. Proof: docs updated; no contradictory "known limitations" claims remain for now-supported rows.

## Phase 7 — adversarial re-review remediation (2026-07-18, findings `opus-adversarial-review-findings-2026-07-18-spec-080-implementation.md`)

> These tasks close the matrix-truthfulness and false-block gaps found in the
> re-review. All are safe-blocking today (no data corruption), but they defeat the
> "faithful breadth" mission and make the normative matrix overclaim. Owner seams
> and named proofs below. Do not mark `[x]` until the named test passes red→green
> and no existing test regresses.

- [x] T070 **N-H1: unquoted labelled edges (`a -- Yes --> b`).** Owner: `src/diagram-author/mermaid/parse-flowchart.ts` `parseEdgeStatement`. Treat identifier/text tokens between a `--`/`==`/`-.` opener and the following arrow (`-->`/`==>`/`-.->`) as the edge label, matching the quoted and pipe forms. Split matrix row **MF-09** into a proven `S` sub-row (quoted/pipe) and this now-`S` sub-row. Proof: `tests/mermaid-parse.test.ts` + `tests/diagram-author-import.test.ts` — `a -- Yes --> b` imports one arrow labelled `Yes`, both endpoints, zero structural diagnostics; `a -- click me --> b` (multi-word) likewise.
- [x] T071 **N-M1: direction-less headers default to `TB`.** Owner: `parse-flowchart.ts` header branch. A bare `flowchart` / `graph` header (one token) MUST default `direction = 'TB'` instead of emitting `IMPORT_MERMAID_UNSUPPORTED_DIRECTION`. Keep the block for a malformed multi-token header (`flowchart LR extra`). Add an MF-01 sub-row. Proof: `tests/mermaid-parse.test.ts` — bare `flowchart`/`graph` parses with `direction: TB`; `graph LR extra` still blocks.
- [x] T072 **N-M2: D2 implicit connection endpoints.** Owner: `src/diagram-author/import-d2.ts`. Create implicit leaf frames for connection endpoints that were never declared (matching Mermaid MF-07), or — if kept phased — reclassify matrix rows **D2-03/D2-06** to `P` and annotate the pre-declaration requirement so the matrix stops overclaiming. Proof: `tests/d2-parity.test.ts` — bare `a -> b -> c` (no declarations) imports three frames + two arrows, zero structural diagnostics; OR a matrix/test note proving the `P` reclassification.
- [x] T073 **N-L1: conflicting inline labels for one id.** Owner: `src/diagram-author/mermaid/lower-flowchart.ts` `collectNodes`. When two explicit occurrences of the same id carry different non-empty labels, emit a diagnostic (`visual` naming the dropped label, or `invalid` blocking) instead of silently keeping the last. Proof: `tests/mermaid-lower.test.ts` — `a["First"] --> b` / `a["Second"] --> c` yields a named diagnostic, not a silent drop.
- [x] T074 **N-L2: catalogue `o--o` / `x--x` edge decorations.** Owner: `src/diagram-author/mermaid/tokenize.ts` + matrix. Either import as a plain directed arrow with a `visual` decoration downgrade (class `V`) or keep the block but add a matrix row with a reason. Proof: matrix row + `tests/mermaid-topology.test.ts` (or a new row test) asserting the chosen behaviour.
- [x] T075 **N-L3 (optional): verifiable corpus provenance.** Owner: `tests/imported-corpus-fixtures.test.ts`. Either check in a copy of each source `.mmd` and add a regenerate-and-diff test proving the fixture is importer-generated, or drop the "verifiable SHA-256 provenance" wording from `validation.md`. Proof: a passing provenance test, or the softened wording.

## Dependency order

```
T000→T001→T002→T003→T004→{T005,T006,T007}
   → T010→T011→T012→T013→[Gate A T014]
   → T020→{T021,T022,T023,T024,T025,T026,T027}
   → T030→{T031,T032}, T033→T034
   → {T040,T041,T042}→[Gate B T043]
   → {T050,T051,T052,T053}
   → {T060,T061,T062,T063}
   → {T070,T071,T072,T073,T074,T075}   # Phase 7 re-review remediation (green)
```
