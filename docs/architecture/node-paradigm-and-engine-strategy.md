# Node paradigm and engine strategy (bigger-picture vision)

> **Not cold-start reading.** This file is intentionally outside the agent
> cold-start path (`AGENTS.md`, `docs/agent-index.md`, `DIAGRAM.md`, task
> files). It is the durable architectural intent for the layout/engine system.
> Point an agent here explicitly — "read `docs/architecture/node-paradigm-and-engine-strategy.md`
> for the bigger picture" — when it needs the why behind the engine model, not
> the per-task how.

## One-line thesis

The diagram generator is a **node-based layout system**. Houdini is the mental
model: a small set of well-chosen operator nodes, each with a typed parameter
interface, composed in a network, with parameters shown in a pane when you
select a node. We are building the diagram equivalent, and its long-term home is
the `design-foundry` node-based UI.

## The Houdini mapping

| Houdini | Here | Notes |
|---------|------|-------|
| Contexts (SOP / DOP / COP / ROP) | **Pipeline stages** and **document kinds** | The "context" is the stage (author → layout → render → export) or the input type, not a grouping of operators. |
| Operator node (e.g. `polyextrude`) | **A layout algorithm** (ELK layered, tree, radial, force, …) | One node type per algorithm, with a typed parameter interface. This is the spec 071 interpreter node. |
| Parameter pane (select node → see params) | **The right-hand contextual aside** | Select a layout → edit its parameters. Every algorithm, including force, uses this one shared pane. |
| Network / cook | **The spec 071 node graph** (source → interpreter[] → switch → render) | Deterministic cook; one render owner. |
| (there is no "polyextrude family") | **There is no algorithm "family"** | See below. |

## Hard rules that follow from this

### 1. No "family" abstraction

A "family" would only make sense if we kept several backends of the same
algorithm and wanted to group them. We do not. With one implementation per
algorithm, a family always has exactly one member and is dead weight. Layout
algorithms are **node types**. Any menu grouping is a **cosmetic tag** for the
create menu, never a behavioural contract. (Enforced in spec 073.)

### 2. One implementation per algorithm — hard contract, no duplicates

The real algorithms are far fewer than the tool-specific names. Sugiyama =
ELK layered = Dagre = Mermaid flowchart = Graphviz `dot` = D2 default — that is
**one algorithm**, not six engines. We keep the single most robust
implementation per capability and **retire duplicates**. We do not maintain
five slightly-different Sugiyamas.

- **Dagre is a decided removal** — it is a less-capable duplicate of ELK
  layered. No dupes.
- Replacing an implementation with a better one is a **migration** (saved
  diagrams carry engine-specific overrides and deterministic geometry), not a
  silent default swap.
- The evidence-based survey and the per-algorithm choice/retire matrix live in
  spec 074; the no-duplicate contract is enforced there.

### 3. Render is its own stage

Layout produces geometry; render turns geometry into an SVG/display list.
They are separate stages (`render-ir` / `display-list` already sit downstream of
layout). Render family (visual treatment) is orthogonal to the layout
algorithm.

### 4. Diagram types are input schemas, not parallel workflows

Different diagram types need different **structured input** — a Sankey, a
Sugiyama flow, and a force graph genuinely differ in what the user authors
(e.g. force needs a `nodes:` + `links:` graph, not a nested frame tree). That is
legitimate. The rule is: **as different as needed, and no more.**

- A new diagram type may introduce its own input format when the data really
  differs. Ask "what is the best format for this input?" and use it.
- It must **not** introduce a bespoke parallel pipeline — its own host, routes,
  persistence stack, and UI — when the shared pipeline already does that job.
  No pointless adapters, no busywork duplication.
- **Force is a diagram type / engine, not a workflow.** It should be one of the
  engines, distinguished only by its input schema, flowing through the same
  stages and the same parameter pane as every other layout. The current force
  implementation grew as a bespoke pipeline bolted onto the UI (ported without
  reading the repo architecture); that is technical debt to converge onto the
  shared seams. The convergence can be deprioritised until we next build on
  force or until the debt blocks new work — but the target end-state is force as
  a first-class engine, not a separate workflow.

### 5. One shared parameter pane

Every layout algorithm surfaces its parameters through one shared param-pane
contract. Selecting autolayout, ELK layered, ELK radial, or force shows that
node's parameters the same way. No algorithm keeps a bespoke parameter UI.

## Long-term home: design-foundry

`packages/layout-engine/` is the portable core. It is planned to move into the
sibling `design-foundry` repo as `@design-foundry/operator-autolayout`, where the
node-based UI lives (see `../design-foundry/PIVOT.md`). This is why:

- the layout engine keeps a **stable public API** (recorded in the project
  constitution) — it is the de-facto interface for the port;
- the engine stays **UI-agnostic and node-shaped** (operator facade,
  registration-only onboarding, no central engine branching);
- we invest in the node model now so the design-foundry ingest is a port, not a
  rewrite.

## Where this is executed

- **Spec 071** — the node-graph substrate (source → interpreter[] → switch →
  render). Merged.
- **Spec 073** — layout-algorithm node model + parameter-pane unification;
  drops "family"; folds force parameters into the shared pane; renames the
  `grid` shell lane to `frame`.
- **Spec 074** — evidence-based consolidation to one implementation per
  algorithm; the no-duplicate hard contract; Dagre removal.

This document is the intent; the specs are the execution. If they disagree with
this file on strategy, this file is the tie-breaker for *direction* — but it is
not a task list and is not read at cold start.
