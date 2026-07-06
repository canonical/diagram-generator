# Spec 076: TLS certificate provider Mermaid cold-start fit

**Feature Branch**: `feat/076-tls-mermaid-cold-start-fit`
**Status**: Draft
**Created**: 2026-07-06
**Priority**: Example-specific investigation requested after spec 074 retired
Dagre as an `elk-layered` duplicate.
**Context**: `scripts/diagrams/frames/tls-certificate-provider-topology.yaml`,
`docs/spec-archive/074-layout-algorithm-consolidation/`, sibling
`../mermaid/AGENTS.md`, and this package's `images/` + `references/` assets.

## Problem

Spec 074 removed Dagre because, at the algorithm-class level, it duplicated the
same layered / Sugiyama slot already covered by `elk-layered`, while ELK kept
the stronger capability surface. That consolidation decision should not be
reopened casually.

The TLS certificate provider topology is a concrete pressure test against that
decision. The reference appears Mermaid-originated and behaves like a clustered
flowchart with ordered `subgraph` groups. Mermaid's default flowchart layout is
Dagre, so the source rendering likely benefits from a cluster-aware layered
graph input. Our current canonical YAML lowering expresses the same picture as a
frame layout with fill-sized carriers and helper rows. Under that lowered shape:

- current native `v3` is structurally closer than forced ELK renders
- `elk-force` is clearly the wrong family for this diagram
- `elk-layered` on the **current lowered frame shape** still diverges
- the diagram is currently `v3`-only in compatibility terms because of
  fill-sized structural carriers, not because of deep nesting

That distinction matters. This example may expose a **representation gap**
between Mermaid clustered flowcharts and the current YAML/ELK input shape, not a
reason to undo the Dagre retirement.

We currently lack a cold-start pack that lets another agent reproduce that
judgment from scratch without relying on prior chat history.

## Goals

- Create a self-contained example package for this diagram so a cold-start agent
  can reproduce the question from reference image -> Mermaid draft -> canonical
  YAML -> engine comparison.
- Make the Mermaid-side first step explicit: add a cross-repo handoff so the
  sibling `../mermaid/` repo can attempt a canonical `.mmd` recreation using its
  mandatory input-fit workflow.
- Record the exact current blocker in this repo: this diagram is not ELK-hostile
  because of deep nesting or non-tree arrows; it is blocked by fill-sized
  structural carriers in the current lowering.
- Define a testable decision path: either this example remains explicitly
  `v3`-only until a cluster-preserving lowering/shim exists, or a future change
  proves a typed `elk-layered` path with repo-owned regression coverage.
- Give Opus a precise validation protocol that does not depend on tribal memory.

## Non-goals

- No Dagre resurrection in this spec.
- No broad Mermaid import implementation here; that remains spec 028.
- No promise that raw `elk-layered` applied to the current YAML must match the
  Mermaid source.
- No behavior-heavy preview work in `scripts/preview/*.js`.
- No global engine re-ranking based on one example; this spec is about honest
  diagnosis and reproducibility.

## Cold-start asset pack

This package MUST stay self-contained enough for a new agent to understand the
example without the original chat:

- `images/01-source-mermaid-reference.png`
  - the visual source of truth; this is the "before" image
- `images/02-engineer-elk-force-attempt.png`
  - the field engineer's first ELK-force comparison; this is an external
    "after" attempt, not the in-repo canonical render path
- `images/03-current-v3-render.png`
  - current in-repo `v3` render from the canonical YAML fixture
- `images/04-current-elk-layered-render.png`
  - current in-repo forced `elk-layered` render on the same fixture
- `images/05-current-elk-force-render.png`
  - current in-repo forced `elk-force` render on the same fixture
- `references/tls-certificate-provider-topology.mmd`
  - draft Mermaid reconstruction for cross-repo seeding
- `scripts/diagrams/frames/tls-certificate-provider-topology.yaml`
  - canonical YAML fixture in this repo

## Image context and interpretation

These assets are not five interchangeable screenshots. They represent three
different stages of the question:

1. **Source truth**
   - `images/01-source-mermaid-reference.png`
   - This is the target look and the likely Mermaid-origin diagram behavior.
   - The important visual properties are:
     - a top provider cluster
     - two lower sibling clusters
     - ordered endpoint rows within the right-hand cluster
     - a layered top-to-bottom fanout from one provider node

2. **Field-engineer downstream attempt**
   - `images/02-engineer-elk-force-attempt.png`
   - This is not the canonical in-repo reproduction. It is the field engineer's
     external ELK-force attempt that triggered the question "why is autolayout
     showing more of the intended structure than ELK?"
   - Treat this as evidence that a naive ELK-force try was unsatisfactory, not
     as proof that ELK in general is wrong.

3. **Controlled in-repo comparison**
   - `images/03-current-v3-render.png`
   - `images/04-current-elk-layered-render.png`
   - `images/05-current-elk-force-render.png`
   - These three are the real apples-to-apples comparison because they all come
     from the same canonical YAML fixture in this repo.

## Why the current attempts fail

The current failure mode should be stated explicitly so Opus can challenge it.
The leading hypothesis from this repo's investigation is:

- The source diagram is probably best understood as a **clustered layered
  graph**.
- The current YAML fixture is lowered as a **frame layout** with
  fill-sized structural carriers and helper rows.
- `v3` gets closer because it is designed to honor frame rows, fill carriers,
  and authored box-group structure directly.
- `elk-force` fails because it is the wrong algorithm family for this source:
  it is an organic / force layout, so it does not preserve the ordered layered
  cluster structure the reference depends on.
- `elk-layered` on the current YAML still fails to match the source because the
  lowered structure it receives is not a clean clustered graph. It sees
  full-width carriers and helper rows rather than a graph-native cluster model,
  so "switching to a layered algorithm" is not enough by itself.

This yields the core hypothesis under review:

- the problem may be **better structured YAML / better Mermaid-to-YAML lowering
  / a typed shim**
- rather than "bring Dagre back"

## Current behavior (must be treated as baseline, not conjecture)

- The authored frame fixture exists at
  `scripts/diagrams/frames/tls-certificate-provider-topology.yaml`.
- The current compatibility judgment is `v3` only.
- The current fill-carrier blockers are:
  - `provider_stack`
  - `services_row`
  - `load_balancer_endpoint_row`
- The arrow graph is a connected tree, so "only diagrams connected by arrows"
  is **not** the blocker here.
- The structure is not deeply nested by repo standards; deep nesting is **not**
  the reason ELK is withheld here.
- The meaningful current question is:
  - can a Mermaid-origin clustered flowchart be lowered into a more graph-native
    ELK input shape than the current fill-carrier-heavy frame layout?

## Questions Opus must answer

Opus should not validate only whether the current ELK output looks bad. Opus
should answer the narrower architectural question:

1. Is Dagre actually the missing solution for this example?
2. Or is the real fix a better structured YAML / better lowering from Mermaid
   cluster intent into this repo's typed model?
3. If Opus believes Dagre really is the missing solution, what exact capability
   does Dagre provide here that `elk-layered` cannot match once the input shape
   is corrected?
4. If Opus believes better YAML / lowering is the real fix, which specific
   aspects of the current fixture shape are the blockers:
   - fill-sized structural carriers
   - helper rows standing in for cluster-local ordering
   - loss of subgraph/cluster semantics
   - some other typed gap

The spec should be considered successful only if this choice becomes auditable,
not if the output merely "looks somewhat closer."

## User stories

### US1: Cold-start recreation

As a new agent on a new machine, I can open this spec package and reproduce the
diagram question without prior chat context.

**Independent test**: using only this package, the YAML fixture, and repo docs,
an agent can identify the source image, the engineer comparison, the draft
Mermaid source, and the current render comparisons.

**Acceptance scenarios**

1. **Given** a cold-start agent, **When** they open this package, **Then** they
   can locate the original visual reference, the failed ELK comparison, and the
   current in-repo fixture without searching chat history.
2. **Given** the draft Mermaid source in `references/`, **When** the sibling
   Mermaid repo picks up the handoff, **Then** it has a concrete first-pass
   structure to refine rather than starting from prose alone.

### US2: Honest current classification

As a maintainer, I can see exactly why this example is not currently ELK-ready,
without blaming the wrong cause.

**Independent test**: a repo-owned compatibility probe on this fixture asserts
that only `v3` is compatible and names the exact fill-carrier ids above.

**Acceptance scenarios**

1. **Given** the current fixture, **When** compatibility is summarized,
   **Then** the spec and future probe both report `v3` only.
2. **Given** the same fixture, **When** the question "is deep nesting the
   blocker?" is asked, **Then** the answer is explicitly "no".

### US3: Future ELK claim must be real

As a reviewer, I can reject hand-wavy claims that "ELK layered should be the
same as Mermaid/Dagre here" unless the implementation changes the lowered shape
or adds a justified shim and proves it on this fixture.

**Independent test**: any future claim that `elk-layered` supports this example
must come with a repo-owned regression on this fixture covering compatibility
and the core cluster/ordering geometry.

**Acceptance scenarios**

1. **Given** a future change that keeps the current fill carriers,
   **When** it claims ELK parity anyway, **Then** the claim is rejected.
2. **Given** a future change that makes `elk-layered` compatible,
   **When** it is reviewed, **Then** it includes a fixture-owned regression and
   a written explanation of the new lowering/shim.

## Functional requirements

- **FR-001**: This spec package MUST include the cold-start asset pack listed
  above and keep the assets named/stable enough to reference from other repos.
- **FR-002**: The first cross-repo action for this example MUST be a handoff in
  `../mermaid/AGENT-INBOX.md` requesting a canonical Mermaid recreation of this
  diagram using the sibling repo's input-fit workflow.
- **FR-003**: The spec MUST record the current state precisely: `v3` only,
  blocked by `provider_stack`, `services_row`, and `load_balancer_endpoint_row`;
  not blocked by deep nesting; not blocked by a non-tree arrow graph.
- **FR-004**: This spec MUST NOT treat the Dagre retirement as the bug. The
  live question is whether the current frame lowering is the wrong ELK input
  shape for Mermaid-origin clustered flowcharts.
- **FR-005**: The spec MUST name the only acceptable future directions for this
  example:
  - keep it explicitly `v3`-only and document why
  - add a cluster-preserving Mermaid-to-YAML/graph lowering or typed shim
  - prove another typed path with the same or stronger evidence bar
- **FR-006**: Any future implementation that claims `elk-layered` support for
  this example MUST add a repo-owned regression on this exact fixture that
  covers both compatibility and the core geometry expectations.
- **FR-007**: The validation protocol for this example MUST be written in this
  package so Opus can audit the work from cold start.
- **FR-008**: The spec MUST explain the photo context explicitly:
  source truth, field-engineer external attempt, and in-repo controlled
  comparisons.
- **FR-009**: The spec MUST state the current failure reasoning explicitly:
  `elk-force` is the wrong family for this source, and `elk-layered` on the
  current lowered YAML is still receiving the wrong problem shape.
- **FR-010**: Opus validation MUST explicitly decide between:
  - Dagre is the missing solution
  - better structured YAML / better lowering / typed shim is the missing
    solution

## Validation Protocol (Opus)

Opus validation for this example should follow this exact order:

1. Inspect `images/01-source-mermaid-reference.png`.
2. Inspect `images/02-engineer-elk-force-attempt.png`.
3. Inspect `images/03-current-v3-render.png`,
   `images/04-current-elk-layered-render.png`, and
   `images/05-current-elk-force-render.png` as the controlled in-repo
   comparison set.
4. Read `references/tls-certificate-provider-topology.mmd`.
5. Read `scripts/diagrams/frames/tls-certificate-provider-topology.yaml`.
6. Confirm the spec's current-state claims:
   - `v3` only today
   - blocker ids are the three fill carriers above
   - deep nesting is not the reason
   - arrow-tree eligibility is not the reason
7. Evaluate the failure reasoning:
   - Is `elk-force` failing for the reason claimed here, namely wrong algorithm
     family for a clustered layered source?
   - Is `elk-layered` failing mainly because the current YAML/lowering loses the
     cluster intent and replaces it with fill carriers/helper rows?
8. Decide which path the implementation is actually taking:
   - explicit `v3`-only classification
   - cluster-preserving lowering/shim before ELK
   - Dagre restoration
   - some other typed path
9. Answer the architectural question directly:
   - "Dagre is the missing solution here"
   - or
   - "better structured YAML / better lowering is the missing solution here"
   - or
   - "both are needed," with the exact reason why
10. Reject any proposed fix that is only "switch to ELK layered" on the current
    lowered frame shape without a fixture-owned regression.

## Success criteria

- **SC-001**: This spec package is committed with the image pack and Mermaid
  draft so the example survives cold start.
- **SC-002**: `../mermaid/AGENT-INBOX.md` contains a concrete request to add the
  example there, with links back to the assets in this repo.
- **SC-003**: A future repo-owned compatibility probe is defined for this
  fixture so the `v3`-only baseline is explicit until changed on purpose.
- **SC-004**: The spec makes the Dagre/ELK distinction honest: Dagre removal
  stays a consolidation decision, while this example is framed as a lowering /
  representation problem until proven otherwise.
- **SC-005**: The context of each before/after image is explicit enough that a
  cold-start reviewer can tell source truth from downstream attempts.
- **SC-006**: The spec gives Opus an explicit review question:
  "Dagre or better structured YAML/lowering?"
- **SC-007**: A future ELK-support claim on this fixture cannot close without a
  fixture-owned regression and a written explanation of the new lowering/shim.

## Risks

- It is easy to misdiagnose this as "ELK is worse than Mermaid" when the real
  issue may be the current frame lowering, especially the fill carriers.
- It is also easy to smuggle Dagre back in through example frustration. FR-004
  blocks that shortcut.
- A Mermaid reconstruction can still be a weak fit if the source image hides
  authoring details. The sibling repo must follow its no-guess fit workflow and
  call that out explicitly if needed.
