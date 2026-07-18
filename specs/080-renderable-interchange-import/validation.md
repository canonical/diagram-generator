# Validation: renderable interchange import

**Spec**: 080-renderable-interchange-import
**Status**: Implementation active — Gate A green.

This file records the evidence each phase must produce. It is empty of results
until implementation runs; the review pass only defines the required proofs.

## Verification commands

```bash
# focused import tests
npm --prefix packages/layout-engine test -- diagram-author-import
npm --prefix packages/layout-engine test -- mermaid-tokenize mermaid-parse mermaid-lower mermaid-topology
npm --prefix packages/layout-engine test -- select-import-engine app-save-client local-folder-workspace

# preview persistence
npm --prefix apps/preview test

# full suites + repo gates (before Gate B / closeout)
npm --prefix packages/layout-engine test
npm run clean:src-artifacts
node scripts/check-browser-bundle-fresh.mjs
node scripts/check_no_new_python.mjs
npm --prefix packages/layout-engine run build:browser   # if browser surface changed
```

## Required evidence by phase

### Phase 0 — structural-loss gate
- [x] `finishImport` blocks `structural`/`invalid`/`type` in non-strict mode (unit).
- [x] The screenshot input first proved the blocking gate, then Phase 2 converted
  it to a faithful two-frame/one-arrow import with visual class downgrades.
- [ ] Preview server route writes nothing on structural loss and the Mermaid CLI
  exits non-zero. Local-folder proof awaits the spec-075 dependency rebase; the
  D2 CLI proof awaits T050.

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
- [ ] Before T030: `RL`/`BT` (top-level and subgraph-local) **block** (no silent collapse).
- [ ] After T030/T031: reverse directions import; `lower-to-frame` + ELK builder map to `LEFT`/`UP`.
- [ ] Engine selection decision table proven: flat→v3, cross-container→ELK layered, unrenderable→block; reads `engine-capabilities.ts`, not hard-coded ids.
- [ ] Emitted YAML persists `meta.layout_engine`; reload resolves the same engine.

### Phase 4 + Gate B
- [ ] Import UI shows preserved/downgraded/blocked; blocked import shows failure, no `ok` status, no navigation.
- [ ] Server-root `import → persist → reload → render` regression: topology, nesting, direction, engine asserted.
- [ ] Local-folder `import → persist → reload → render` regression: same assertions.
- [ ] **Gate B**: no preview import path writes a structurally lossy diagram; full layout-engine + preview suites green. Record here.

### Phase 5 — D2 parity
- [ ] D2 structural loss blocks through the shared gate.
- [ ] D2-06 chained connections, D2-07 direction, D2-08/09 fill/border mapping proven by matrix-row tests.

### Phase 6 — hardening
- [ ] Bounded-input ceiling documented and enforced; NFR-003 time budget: import of the largest corpus fixture completes under **[set concrete ms budget during implementation]**.
- [ ] Malformed input fails gracefully; adversarial HTML label does not inject (checked against `scripts/preview_html_allowlist.txt`).
- [ ] Corpus fixtures load in preview and compile clean.
- [ ] Every capability-matrix `S`/`P`/`V`/`B`/`M` row cites a passing test by id.

## Closeout gate

Per `AGENTS.md`, this spec touches the preview import/write path, so it **cannot**
claim Closeout Ready without the repo-owned `import → persist → reload` regressions
for both server-root and local-folder sources (T041, T042) green, plus the full
layout-engine and preview suites, browser-bundle freshness, and no-new-Python
checks green.
