# Tasks: Spec 074 Layout algorithm survey and best-of-breed consolidation

**Input**: `specs/074-layout-algorithm-consolidation/spec.md`
**Plan**: `specs/074-layout-algorithm-consolidation/plan.md`
**Branch**: `feat/074-layout-algorithm-consolidation`

## Phase 1: Derive the required-algorithm list from the corpus

- [ ] T001 Read the planning-repo taxonomy/crosswalks/ontology under
      `diagram-generator-planning/docs/taxonomy/` and the layout mapping
      (`docs/audit/layout_mapping.py`, `docs/audit/human-readable-categories.md`,
      `docs/audit/layout-benchmark-corpus/`). Scope reads to these surfaces; do
      not trawl raw scrape/output trees.
- [ ] T002 Enumerate the layout algorithms the audited diagrams actually need,
      each justified by the diagram types (from the taxonomy) that require it.
      Record in `decision-matrix.md` (required-algorithm section).

## Phase 2: Inventory current implementations

- [ ] T010 For each in-repo engine
      (`packages/layout-engine/src/preview-engine/engines/*.engine.ts`) and the
      `graph-layout-core|elk|dagre` packages, record algorithm class,
      capabilities (ports, compound nodes, edge routing, direction),
      determinism, licence, and bundle cost.
- [ ] T011 Flag the suspected duplicates explicitly: Dagre vs ELK layered,
      mindmap-tree vs ELK mrtree, force vs ELK force vs ELK stress.

## Phase 3: Survey candidates and choose one per algorithm

- [ ] T020 For each required algorithm, evaluate external + in-repo candidates
      (ELK, Dagre, d3-force/d3-hierarchy, Graphviz/viz.js, cytoscape, cola,
      Mermaid, D2) on the FR-002 criteria.
- [ ] T021 Select exactly one implementation per algorithm and record the
      criteria-based rationale in `decision-matrix.md`.
- [ ] T022 Write the explicit keep/retire verdict for every current engine
      (FR-003), including the Dagre / tree / force-trio decisions. "Keep"
      requires a concrete distinct capability the chosen impl lacks.

## Phase 4: Migration discipline and sequencing

- [ ] T030 Document the backend-swap migration discipline (FR-004): how saved
      diagrams, engine-specific overrides, and deterministic geometry are handled
      when one implementation replaces another; a swap is a migration with a
      persist→reload proof, not a silent default change.
- [ ] T031 Name the downstream port/retire specs implied by the matrix (FR-006)
      so the bulk-port work (Dagre/Mermaid/Graphviz/D2) is sequenced.

## Phase 5: Remove Dagre (decided) + enforce the no-duplicate contract

- [ ] T040 Remove Dagre from the registry/builtins
      (`packages/layout-engine/src/preview-engine/builtins.ts`,
      `engines/dagre.engine.ts`, `dagre-controls.ts`) and its tests. Cover the
      migration for any diagram saved against Dagre with a repo-owned
      persist→reload proof; keep the suites green.
- [ ] T041 Add a **hard no-duplicate-algorithm guard**: each engine declares its
      algorithm class, and a repo-owned test fails if two registered engines
      declare the same class. This is the standing contract (FR-007).
- [ ] T042 For any other in-repo engine the survey deems a pure duplicate (e.g.
      mindmap-tree vs mrtree, force trio), either retire it here with a
      persist→reload proof if conclusive, or file the named downstream spec.

## Phase 6: Verification

- [ ] T050 Confirm `decision-matrix.md` satisfies SC-001/SC-002/SC-003/SC-004
      (corpus-justified list, per-algorithm choice + evidence, keep/retire
      verdicts, migration discipline, downstream specs named).
- [ ] T051 After the Dagre removal + no-duplicate guard (Phase 5), run
      `npm --prefix packages/layout-engine test`,
      `npm --prefix apps/preview test`, and
      `node scripts/check_no_new_python.mjs`; confirm green (SC-005/SC-006).

## Notes

- This spec's output is primarily a **decision artifact**, not code. Do not let
  it drift into the actual bulk port — that is downstream, per-algorithm, and
  cites this matrix.
- Vision/evidence discipline (planning-repo rule): corpus-derived claims must be
  grounded in the taxonomy/mapping evidence, not assumed from tool names.
