# Plan: renderable interchange import

**Spec**: 080-renderable-interchange-import
**Status**: Draft (authored during review; no product code implemented)

## Architecture

```
.mmd / .d2 source
    │
    ▼
┌──────────────────────────────┐
│  tokenizer + statement parser │  (Mermaid; new — replaces per-line regex)
│         → semantic IR         │
└──────────────┬────────────────┘
               │  typed IR: nodes, edges, containers, directions, styles
               ▼
┌──────────────────────────────┐
│   IR → canonical AST lowering │  (pure transform)
│   + structural-loss detection │  → diagnostics carry `category`
└──────────────┬────────────────┘
               │
               ▼
   DiagramImportResult { ast, diagnostics(category), summary }
               │
      ┌────────┴─────────┐
      ▼                  ▼
 shared gate       engine selection (reads engine-capabilities.ts)
 (block if any     → meta.layout_engine persisted
  structural/                │
  invalid/type)              ▼
      │            serializeDiagramYaml → compile check → write
      ▼
 preview route / local-folder / CLI  (all use the same gate)
```

The key architectural change: a typed semantic IR is the single place topology,
containment, and direction are decided. Lowering, structural-loss detection, and
engine selection are pure functions over that IR. The regex-per-line dispatch in
`import-mermaid.ts` is retired.

## Owner files / seams

| Concern | Owner file | Change |
|---------|-----------|--------|
| Diagnostic category (`structural`/`visual`/`type`/`invalid`) | `packages/layout-engine/src/diagram-author/types.ts` (`Diagnostic`) | add `category` field |
| Shared blocking gate | `packages/layout-engine/src/diagram-author/import-result.ts` (`finishImport`) | block on `structural`/`invalid`/`type` regardless of strict; build summary |
| Import summary struct | `import-result.ts` | new `ImportSummary { preserved, downgraded, blocked }` on result |
| Mermaid tokenizer + parser + IR | new `packages/layout-engine/src/diagram-author/mermaid/` (`tokenize.ts`, `parse-flowchart.ts`, `flowchart-ir.ts`) | new |
| IR → AST lowering | new `mermaid/lower-flowchart.ts` | new |
| Mermaid entry | `import-mermaid.ts` | becomes thin: tokenize → parse → lower → finishImport |
| D2 gate parity + chained/direction | `import-d2.ts` | route through shared gate; phased grammar |
| Engine selection | new `packages/layout-engine/src/diagram-author/select-import-engine.ts` | reads `@diagram-generator/graph-layout-elk` capabilities |
| Canonical reverse direction | `types.ts` (`AuthorFrameNode.direction`, `FrameTemplate.direction`), `lower-to-frame.ts`, frame-model, ELK builder direction mapping | model task (FR-009) |
| Preview server gate | `apps/preview/src/preview-host/frame-documents.ts` (`importInterchangeForSlug`) | consume shared gate + return summary |
| Local-folder gate | `packages/layout-engine/src/preview-shell/local-folder-workspace.ts` | rely on server gate; no separate leniency |
| Import UI summary | `packages/layout-engine/src/preview-shell/app-save-client.ts` (import handler ~L479-490) | render preserved/downgraded/blocked, no false success |
| CLIs | `packages/layout-engine/scripts/import-mermaid.mjs`, `import-d2.mjs` | already block on errors; verify structural category surfaces |

## Phases

| Phase | Deliverable | Gate |
|-------|-------------|------|
| 0 | Diagnostic `category` + shared blocking gate + import summary; wire all entry points; regression that a structural warning now blocks | — |
| 1 | Mermaid tokenizer + statement parser + typed flowchart IR (no behaviour change to output yet) | — |
| 2 | IR lowering with structural-loss detection; inline-node-on-edge (MF-16/17/18/19), fan-out (MF-26), semicolons (MF-27), subgraph-local LR/TB direction (MF-20) | **Phase gate A**: parser/IR proven before preview persistence integration |
| 3 | Canonical reverse-direction model (MF-03 / RL / BT); engine selection + persisted `meta.layout_engine` (FR-010) | — |
| 4 | Preview integration: import→persist→reload→render regressions for server-root and local-folder; import UI summary | **Phase gate B**: preview persistence proven |
| 5 | D2 parity: shared gate, chained connections, direction, class/style mapping (phased) | — |
| 6 | Bounded/malformed input, security, corpus fixtures, docs, capability-matrix test wiring | — |

**Phase gate A** (after Phase 2): the Mermaid IR + lowering must pass every
`S`/`P` matrix row test and block every `B`/`M` row, on hand-authored input, with
zero preview wiring, before Phase 4 touches persistence. This prevents shipping a
parser that "compiles" but falsifies topology.

**Phase gate B** (after Phase 4): no preview import path may write a structurally
lossy diagram; server-root and local-folder persist→reload regressions are green.

## Test strategy

- **Capability-matrix tests**: one focused test per matrix row, referenced by row id (MF-xx / D2-xx), on hand-authored input. `S`/`P` rows assert topology + no structural diagnostic; `V` rows assert the named warning and no block; `B`/`M` rows assert a blocking error and no write.
- **False-positive guards**: assert node/edge/containment counts and parent links, not merely "no parser error" or "compiles". A test that only checks compile success is insufficient.
- **Corpus fixtures**: at least one representative real-world hand-authored file per complexity tier (reuse `H:\WSL_dev_projects\mermaid` corpus, read-only), plus the screenshot's boot/SPL flowchart shape as a minimal regression.
- **Persist → reload**: server-root and local-folder, asserting topology, nesting, direction, persisted engine, and summary categories.
- **Bounded/malformed**: oversized input, deep nesting, unterminated subgraph, cyclic frontmatter, adversarial label content (HTML) - all fail gracefully with diagnostics.

## Risks

| Risk | Mitigation |
|------|-----------|
| Parser rewrite regresses the FR-004 spec-028 subset | Port every existing `diagram-author-import.test.ts` case first; keep them green through the rewrite. |
| Reverse-direction model change ripples through lowering/ELK | Isolate in Phase 3 behind the model task; block RL/BT until it lands rather than rushing. |
| Engine selection misclassifies and picks a non-rendering engine | Decision table is capability-driven and tested per branch; default to blocking when uncertain. |
| Widening preview JS shell | All logic in TS owners; preview handler only renders the summary and calls typed code (spec-046 ratchet). |

## Constitution / ratchet check

- Product path stays Node + TypeScript; no new Python.
- No new behaviour-heavy JS under `scripts/preview/`; `app-save-client.ts` change is UI rendering of a typed summary, delegating classification to TS.
- One active spec per branch (`feat/080-renderable-interchange-import`).
- Preview import/write changes carry persist→reload regressions (spec-075/046 gate).
