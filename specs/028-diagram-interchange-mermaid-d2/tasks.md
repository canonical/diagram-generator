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
- [ ] T051 Optional vitest gate when `D2_BIN` set (compile exported `.d2`)
- [x] T052 Document `../d2/` workflow in `docs/diagram-authoring.md`

## Phase 5: Preview HTTP export (P3)

- [ ] T060 Preview routes `GET /api/export/mermaid` and `/api/export/d2`
- [ ] T061 Cache by slug + YAML mtime (mirror SVG pool spirit)

## Traceability

| User story | Tasks |
|------------|-------|
| US1 Documented export | T010–T017 |
| US2 D2 import | T020–T024 |
| US3 Mermaid import | T030–T034 |
| US4 Round-trip CLIs | T023, T033, T040–T042, T050 |
| US5 Export hardening | T011–T016 |
| US6 Preview HTTP | T060–T061 |
