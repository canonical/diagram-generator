# Validation: renderable interchange import

**Spec**: 080-renderable-interchange-import
**Status**: Implementation complete — first adversarial review remediated; follow-up review pending.

Evidence below was recorded on Windows in
`feat/080-renderable-interchange-import` on 2026-07-18.

## Verification commands

```bash
# focused import tests
npm --prefix packages/layout-engine test -- diagram-author-import
npm --prefix packages/layout-engine test -- mermaid-tokenize mermaid-parse mermaid-lower mermaid-topology
npm --prefix packages/layout-engine test -- select-import-engine app-save-client local-folder-workspace

# preview persistence
npm --prefix apps/preview test

# full suites + repo gates
npm --prefix packages/layout-engine test
npm --prefix packages/layout-engine run build:browser
npm --prefix apps/preview test
npm run clean:src-artifacts
node scripts/check-browser-bundle-fresh.mjs
node scripts/check_no_new_python.mjs
git diff --check
```

## Required evidence by phase

### Phase 0 — structural-loss gate
- [x] `finishImport` blocks `structural`/`invalid`/`type` in non-strict mode (unit).
- [x] The screenshot input first proved the blocking gate, then Phase 2 converted
  it to a faithful two-frame/one-arrow import with visual class downgrades.
- [x] Preview server route writes nothing on structural loss; Mermaid and D2 CLIs
  exit non-zero and write nothing; local-folder import does not mirror a blocked
  response.

### Phase 1 + Gate A
- [x] Tokenizer/parser tests green for every token kind and malformed/oversized input.
- [x] Every pre-existing `diagram-author-import.test.ts` assertion passes on the IR path (T013).
- [x] **Gate A**: `importMermaid` is fully on the IR path. Focused evidence:
  `6 files / 43 tests passed` from the import, CLI, tokenizer, parser, lowerer,
  and topology suites on 2026-07-18.

### Phase 2 — supported/blocking constructs
- [x] Matrix rows MF-16/17/18/19/20(LR,TB)/26/27 import faithfully (topology + counts asserted, not just compile).
- [x] Matrix row MF-28 blocks; MF-30 strips markdown to plain text and downgrades visually.
- [x] Self-loop, parallel edges, cycle, and disconnected-component tests assert exact topology and parent containment.

### Phase 3 — reverse direction + engine selection
- [x] The transitional guard required `RL`/`BT` to block until the canonical
  `flowDirection` model landed; final regressions now prove preservation instead
  of retaining the superseded block.
- [x] Top-level and subgraph-local reverse directions import; the ELK graph
  builder maps `RL`/`BT` to `LEFT`/`UP`.
- [x] Engine selection is capability-driven: compatible flat DAG→v3;
  reverse/cross-container/cyclic/fan-in→ELK layered; missing required
  capabilities→structural block.
- [x] Emitted YAML persists `meta.layout_engine`; reload resolves the same engine.

### Phase 4 + Gate B
- [x] Import UI shows preserved/downgraded/blocked; blocked import shows failure,
  no `ok` status, no navigation; downgrade success names bounded reasons.
- [x] Server-root `import → persist → reload` regression asserts topology,
  nesting, local reverse direction, and selected engine.
- [x] Local-folder `import → persist → reload` regression asserts the same and
  proves blocked imports are not mirrored.
- [x] **Gate B**: no preview import path writes a structurally lossy diagram.
  Full evidence: layout-engine `179 files / 1118 tests passed`; preview
  `190 passed / 1 expected Windows symlink skip / 0 failed`.

### Phase 5 — D2 parity
- [x] D2 structural loss blocks through the shared gate.
- [x] D2-06 chained connections, D2-07 four-way direction, and D2-08/09
  direct/class fill and border mapping are proven by matrix-row tests.

### Phase 6 — hardening
- [x] Source, token, delimiter, line, node, edge, and subgraph-depth ceilings are
  enforced; the 1,000-edge corpus regression has a concrete two-second budget.
- [x] Malformed input fails gracefully; adversarial HTML is reduced to inert text
  with a named visual downgrade.
- [x] Three representative imported corpus fixtures retain source path and SHA-256
  provenance, compile cleanly, and select ELK layered.
- [x] Every capability-matrix `S`/`P`/`V`/`B`/`M` row cites passing-test evidence.

### Phase 7 — adversarial re-review remediation

- [x] N-H1: unquoted and multi-word Mermaid decision-edge labels import without
  structural diagnostics; quoted and pipe forms remain green.
- [x] N-M1: bare `flowchart` / `graph` headers default to canonical `TB`, while
  malformed multi-token headers still block.
- [x] N-M2: simple implicit D2 endpoints and chains materialize as leaf frames in
  their containing block; dotted endpoints still block when containment cannot
  be inferred.
- [x] N-L1: conflicting explicit inline labels emit a named visual diagnostic
  that states which label was retained and which was dropped.
- [x] N-L2: `o--o` / `x--x` preserve arrow topology and emit a named endpoint
  decoration downgrade.
- [x] N-L3: corpus tests require provenance headers and re-compute all three
  SHA-256 values when the read-only sibling Mermaid corpus is available; only
  external-source absence is an allowed skip.
- [x] Phase 7 focused evidence: `8 files / 74 tests passed`.

## Recorded suite evidence

- Focused interchange, parser, lowering, engine, CLI, preview-client, and
  local-folder coverage: `12 files / 94 tests passed`.
- Full layout engine after Phase 7: `179 files / 1133 tests passed` in 6.23 seconds.
- Full preview: `190 passed / 1 expected Windows symlink skip / 0 failed`.
- Browser rebuild/freshness, no-new-Python ratchet, source-artifact cleanup, and
  `git diff --check`: green.

## Closeout gate

Per `AGENTS.md`, the preview import/write closeout requires repo-owned
`import → persist → reload` regressions for both server-root and local-folder
sources. T041/T042 and the full suites are green. The first Opus implementation
review is on disk and its six findings are remediated; final status remains
Review until the follow-up adversarial pass confirms the Phase 7 changes.
