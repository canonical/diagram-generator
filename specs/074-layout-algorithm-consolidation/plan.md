# Plan: Spec 074 Layout algorithm survey and best-of-breed consolidation

## Working theory

The ~12 engines collapse to roughly 4-6 real algorithms:

- **layered / Sugiyama** — ELK layered, Dagre (dupe), + Mermaid/Graphviz/D2
  candidates.
- **tree** — ELK mrtree, mindmap-tree (likely dupe), + d3-hierarchy candidate.
- **radial** — ELK radial (+ d3 radial candidate).
- **force-directed** — force (d3-style port), ELK force (overlap).
- **stress** — ELK stress (possibly distinct from force, possibly droppable).
- **packing** — ELK rectpacking (mostly unique).
- (`elk-algorithm` generic passthrough and `v3` autolayout are the in-house
  baseline, evaluated separately.)

This spec turns that hunch into an evidence-based, corpus-justified decision:
one implementation per required algorithm, with explicit retire verdicts.

## Method

1. **Derive the required-algorithm list from the corpus, not the tools.** Read
   the planning-repo taxonomy/crosswalks and layout mapping to enumerate which
   layout categories the audited diagrams actually need.
2. **Inventory current implementations + capabilities.** For each in-repo engine
   and `graph-layout-*` package, record algorithm class, capabilities (ports,
   compound nodes, routing, direction), determinism, and licence/bundle.
3. **Survey external candidates per algorithm** on the same criteria.
4. **Pick one per algorithm; write the retire/keep verdicts.**
5. **Define the migration discipline** for any swap.
6. **Name the downstream port/retire specs.**

## Inputs (scope the reads tightly)

- `diagram-generator-planning/docs/taxonomy/{crosswalks,ontology,stakeholder-models}/`
- `diagram-generator-planning/docs/audit/layout_mapping.py`,
  `docs/audit/layout-benchmark-corpus/`,
  `docs/audit/human-readable-categories.md`
- `packages/layout-engine/src/preview-engine/engines/*.engine.ts`,
  `packages/graph-layout-core|elk|dagre/`

Respect the planning repo's token discipline: read the taxonomy/mapping
surfaces, not the raw scrape/output trees.

## Deliverable

`specs/074-layout-algorithm-consolidation/decision-matrix.md`:

| Required algorithm | Diagram types needing it (corpus) | Candidates evaluated | Chosen impl | Rationale (robustness/maintenance/licence/bundle/capability/determinism) | Current engines: keep/retire | Downstream spec |

Plus a short "backend-swap migration discipline" section.

## Verification shape

- The matrix is the primary artifact; it must be corpus-justified and cite
  evidence, not assertion.
- If an in-repo engine is retired here, add a persist→reload proof for the swap
  and keep the full suite green.
- If decision-only, the suite stays green unchanged.

## Relationship to other specs

- **073**: provides the node/param model the chosen implementations plug into;
  074 decides which implementations exist. 073 does not wait on 074, but 074's
  retire verdicts should land before 073 removes any backend.
- **Downstream port specs**: each actual port/retire (e.g. "port Graphviz dot
  layered backend", "retire Dagre") is its own spec citing this matrix (FR-006).
