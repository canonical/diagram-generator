# Spec 074: Layout algorithm survey and best-of-breed consolidation

**Feature Branch**: `feat/074-layout-algorithm-consolidation`
**Status**: Closeout Ready
**Created**: 2026-07-05
**Context**: chat decision 2026-07-05 (do not maintain N implementations of the
same algorithm; keep one robust implementation per algorithm, replace only if a
better one exists; **Dagre is a decided removal**; **hard no-duplicate
contract**). Strategy doc: `docs/architecture/node-paradigm-and-engine-strategy.md`.
Sibling corpus/taxonomy repo: `diagram-generator-planning`. Consumes spec 073's
node model. Gates any future bulk-port of Mermaid / Graphviz / D2.

**Status note (2026-07-05):** Phases 2-6 are complete. `decision-matrix.md`
records the current engine/package capability and cost surface, the candidate
survey and chosen implementation per required algorithm, the explicit engine
keep/retire verdicts, the backend-swap migration discipline, and the downstream
spec queue. Dagre is removed from the builtin registry/render surfaces, legacy
Dagre saves migrate onto the canonical `elk-layered` / `meta.elk` lane with
persist->reload coverage, every builtin preview engine now declares an
`algorithmClass`, the duplicate-algorithm guard is enforced in the registry and
repo-owned tests, and validation is green (`packages/layout-engine` `975/975`,
`apps/preview` `160/160`, `check_no_new_python` ok).

**Review reconciliation (2026-07-05):** Phase 7 resolved the adversarial review
findings. `registerPreviewEngine(...)` now rejects missing/blank
`algorithmClass` values at runtime, the load-path Dagre migration strips orphan
`meta.dagre*` buckets even when they translate to zero supported ELK keys, and
`decision-matrix.md` no longer cites radial / rectpacking inventory as
corpus-required without planning-repo evidence. Phase 8 reconciled the full
suite after that hardening: the registry now preserves manifest identity while
normalizing `algorithmClass`, all synthetic install-unit/onboarding fixtures
declare explicit unique algorithm classes, and full validation reran green in
this worktree (`packages/layout-engine` `978/978`, `apps/preview` `160/160`,
`check_no_new_python` ok).

**Follow-up reconciliation (2026-07-05):** Phase 9 closed the remaining
tooling/docs gap from the post-closeout audit. `graph-layout-dagre` is no
longer wired into the active layout-engine build/test/browser-bundle path or
the preview-server alias/watch surface, and the live agent/spec docs now
describe Dagre as retired rather than current product path.

## Problem

The repo has ~12 registered engines (v3, force, sequence, mindmap-tree, dagre,
elk-layered/radial/force/mrtree/rectpacking/stress/algorithm), but the real
algorithm count is far smaller. Sugiyama/layered is implemented (or ported)
under multiple names across tools (ELK layered, Dagre, Mermaid flowchart,
Graphviz `dot`, D2). Maintaining several slightly-different implementations of
the same algorithm is waste and drift.

The decision is: **one robust implementation per algorithm capability.** Keep
the best; replace it only if a better implementation exists under a different
name; do not run five near-duplicate Sugiyamas. This spec is the evidence-based
survey and decision that produces the consolidation and port/retire plan. It
does **not** design the UI/node model (that is spec 073).

### Known duplication signal (to confirm, not assume)

- **Dagre ≈ ELK layered — DECIDED REMOVAL (2026-07-05).** Both are
  Sugiyama/layered; ELK layered is the more capable and actively maintained
  (ports, compound nodes, orthogonal routing, richer options). Dagre is a
  less-capable duplicate and is removed. This is not pending the survey; the
  survey only records the migration and confirms no distinct capability is lost.
- **mindmap-tree ≈ ELK mrtree** (both tree layout). Confirm and dedup.
- **force vs ELK force vs ELK stress.** `force` (ported d3-style), ELK force,
  and ELK stress overlap; stress-majorization is arguably distinct. The survey
  must pick the most robust force implementation and decide whether stress is a
  separate capability or dropped.

## Goals

- Enumerate the layout **algorithms actually required**, driven by the audited
  diagram corpus and taxonomy in `diagram-generator-planning`, not by the set of
  tools that happen to expose an engine.
- For each required algorithm, survey candidate implementations
  (ELK, Dagre, d3-force/d3-hierarchy, Graphviz/viz.js, cytoscape, cola, Mermaid,
  D2, etc.) and pick **one** on evidence: robustness, maintenance/licence,
  bundle cost, capability (ports, compound nodes, routing, direction), and
  layout determinism.
- Produce a committed **decision matrix**: algorithm → chosen implementation →
  rationale → explicit retire list of duplicate/near-duplicate engines.
- Define the **backend-swap migration discipline**: replacing an implementation
  is a migration (saved diagrams carry engine-specific overrides and
  deterministic geometry), not a drop-in.
- Enforce a **hard no-duplicate contract**: a repo-owned guard MUST fail if two
  registered engines implement the same algorithm class. Duplicates are not
  allowed to accumulate again.
- **Remove Dagre** as the first concrete consolidation action (decided
  2026-07-05): it is a less-capable duplicate of ELK layered.

## Non-goals

- **No UI / node-model / param-pane work** — that is spec 073.
- **No bulk port of new tools here.** This spec decides *what* to port/keep/
  retire and produces the plan; each actual port is a downstream spec that
  consumes the decision matrix. It MAY retire an obvious in-repo duplicate if
  the survey is conclusive and the migration is covered.
- No new algorithms invented; this is consolidation, not expansion.

## Inputs (evidence sources)

- `diagram-generator-planning/docs/taxonomy/` (crosswalks, ontology,
  stakeholder-models) — what diagram types exist and how they map.
- `diagram-generator-planning/docs/audit/layout_mapping.py`,
  `docs/audit/layout-benchmark-corpus/`, `docs/audit/human-readable-categories.md`
  — corpus-derived layout categories and any benchmark material.
- In-repo engines under `packages/layout-engine/src/preview-engine/engines/` and
  `graph-layout-*` packages — the current implementations and their capabilities.

## Functional requirements

- **FR-001**: Produce a committed **required-algorithm list**
  (`decision-matrix.md`) derived from the audited corpus/taxonomy in
  `diagram-generator-planning`, each algorithm justified by the diagram types
  that need it. Do not derive the list from the current engine set.
- **FR-002**: For each required algorithm, evaluate candidate implementations on
  explicit criteria — robustness, maintenance status, licence, bundle cost,
  capability (ports / compound nodes / edge routing / direction), and layout
  determinism — and select exactly one, with the evidence recorded.
- **FR-003**: Record an explicit **retire/keep verdict for every current
  engine**, including the Dagre-vs-ELK-layered, mindmap-tree-vs-mrtree, and
  force-trio dedup decisions. "Keep" requires a concrete distinct capability the
  chosen implementation lacks.
- **FR-004**: Define the **backend-swap migration discipline**: how saved
  diagrams / engine-specific overrides / deterministic geometry are handled when
  one implementation replaces another. A swap MUST be treated as a migration
  with a persist→reload proof, not a silent default change.
- **FR-005**: This spec MUST remove Dagre (decided). Removal MUST cover the
  migration for any diagram currently saved against Dagre (persist→reload proof)
  and keep the suites green. For any *other* in-repo engine, retire it here only
  if the survey conclusively deems it a pure duplicate AND the migration is
  covered; otherwise the retire lands in a downstream per-algorithm spec citing
  this matrix.
- **FR-007**: Add a **hard no-duplicate-algorithm guard** (repo-owned test) that
  fails if two registered engines declare the same algorithm class. Each engine
  MUST declare its algorithm class so the guard can enforce uniqueness. This is
  the standing contract that prevents duplicate accumulation, independent of the
  one-time survey.
- **FR-006**: The decision matrix MUST name the downstream port specs implied by
  the plan (e.g. "port Graphviz dot as the layered backend" or "retire Dagre")
  so the bulk-port work is sequenced, not ad-hoc.

## User stories

### US1: One implementation per algorithm, chosen on evidence

As an architect, I have a committed matrix that says, for each required layout
algorithm, which single implementation we use and why, with the near-duplicates
explicitly retired or justified.

**Acceptance**: `decision-matrix.md` lists every required algorithm, its chosen
implementation with criteria-based rationale, and a keep/retire verdict for each
current engine.

### US2: Corpus-driven, not tool-driven

As an architect, the required-algorithm list comes from the audited diagram
corpus/taxonomy, so we port what our diagrams actually need, not what a tool
happens to offer.

**Acceptance**: each required algorithm cites the diagram types (from the
planning taxonomy) that justify it.

### US3: Swaps are safe migrations

As a maintainer, replacing one implementation with a better one does not
silently change saved diagrams.

**Acceptance**: the migration discipline is documented and any in-spec retire
carries a persist→reload proof.

## Success criteria

- **SC-001**: `specs/074-layout-algorithm-consolidation/decision-matrix.md`
  exists with: required-algorithm list (corpus-justified), per-algorithm chosen
  implementation + criteria evidence, and a keep/retire verdict for every
  current engine.
- **SC-002**: The Dagre-vs-ELK-layered, tree dedup, and force-trio decisions are
  explicit and evidence-backed in the matrix.
- **SC-003**: The backend-swap migration discipline is documented; the Dagre
  removal and any other retire performed in this spec has a repo-owned
  persist→reload proof.
- **SC-004**: The matrix names the downstream port/retire specs so bulk-porting
  Mermaid/Graphviz/D2 is sequenced against it.
- **SC-006**: Dagre is removed from the registry/builtins and its tests, with the
  suites green; the hard no-duplicate-algorithm guard (FR-007) exists and passes.
- **SC-005**: If any engine is retired here,
  `npm --prefix packages/layout-engine test`,
  `npm --prefix apps/preview test`, and `node scripts/check_no_new_python.mjs`
  pass; if this spec is decision-only, those still pass unchanged.

## Risks

- Corpus/taxonomy inputs in the planning repo are large; scope the read to the
  taxonomy/crosswalk and layout-mapping surfaces, not the raw scrape trees
  (respect the planning repo's token discipline).
- "Retire Dagre" is tempting but must clear FR-003's bar (no distinct capability
  lost) and FR-004's migration bar before removal.
- Do not let this spec drift into the actual bulk port; it is the decision +
  plan. Ports are downstream specs (FR-006).
- Layout determinism differs per implementation; a swap changes geometry, so the
  migration discipline (FR-004) is mandatory, not optional.
