# TODO — execution order

**Single owner of cross-spec execution order** (what to work on next) plus an
un-numbered backlog. Nothing else lives here: for a spec's **status** trust
[`docs/specs.md`](docs/specs.md); for live/current-task state trust
[`AGENT-INBOX.md`](AGENT-INBOX.md); for one spec's task list trust
`specs/<id>-<slug>/tasks.md`. Spec-kit has no cross-spec ordering concept — that is
why it lives here.

Jira: Stream E (constrained editor) under [DE-941](https://warthogs.atlassian.net/browse/DE-941).

## Next spec to tackle (priority order)

Refreshed 2026-07-06. Specs 071, 062, 063, 072, **073, and 074 are complete and
archived** (see `docs/specs.md`) — do **not** start 073/074; they are done. The
merged-spec bookkeeping is also done: 048, 051, 052, 054–060, 062, 063, 071, 073,
074 are archived under `docs/spec-archive/`.

Spec 075's committed implementation is present on `main` through the spec-080
merge, while its separate worktree is retained for native picker/regrant
evidence and Opus closeout. Spec 028 is merged to `main`; after user
verification, archive its package and delete its feature branch and worktree
before any follow-up syntax expansion.

**076 is RETIRED (2026-07-08) — superseded by 077.** The post-mortem proved 076
never used Mermaid's algorithm: it lowered cross-cluster edges flat, owned geometry
after ELK (box-moving + local arrow rerouting), and closed on non-rendering snippet
asserts, so the raw-ELK view is structurally wrong and nothing cold-starts. Do not
resume 076.

**077 Mermaid ELK cluster lowering port is complete (2026-07-13).** Its generic
cluster-lowering seam is now available to Epic A work; the completed package is
archived at
[`docs/spec-archive/077-mermaid-elk-cluster-lowering-port/`](docs/spec-archive/077-mermaid-elk-cluster-lowering-port/).
No Dagre or `@mermaid-js/layout-elk` dependency was added.

### Roles (do not blur these)

- **Claude / Opus** — planning, architecture, spec authoring, and **adversarial
  review** of finished work. Does NOT implement these features.
- **GPT (grunt implementation)** — implements the specs below **exactly as
  written**, on a fresh `feat/<id>` branch, then hands back for Opus review.
- If a spec is ambiguous, STOP and ask; do not invent scope. Every spec below has
  `spec.md` + `plan.md` + `tasks.md` — execute the numbered tasks in order.

### Epic A — Mermaid composite diagrams (grouping/parenting). Highest priority.

Goal: render Mermaid-style clustered/nested diagrams. This is **one epic in three
gated stages**. Do them in this order; do not skip the gate.

1. **Planning audit (research, parallel-ok).** The
   `diagram-generator-planning` repo owns a new audit
   (`specs/004-mermaid-composite-lowering-audit/`, requested in that repo's
   `AGENT-INBOX.md`) of every Mermaid ELK lowering trick. Not this repo's code.
2. **Spec 028 — Mermaid import: merged, pending verification**
   (`specs/028-diagram-interchange-mermaid-d2/`). After user verification in the
   primary worktree, archive the package and delete the feature branch/worktree.
   Any broader Mermaid grammar work is a follow-up; no Dagre.
3. **Spec 080 — renderable interchange import (follow-up to 028): complete.**
   Merged to `main` and archived 2026-07-18 after T070–T077 remediation.
   The capability matrix and archived validation record are the closeout
   evidence.

### Lane B — standing user-facing regressions (parallel, independent of Epic A)

These are isolated bugfixes; two different GPT agents can take them at once.

5. **Spec 061 — grid regression.** Its "hide grid affordances on non-grid engines"
   containment is a fast visible win; do that first, then root-cause.
6. **Spec 064 — arrow annotation label de-overlap.** Investigation-first.

### Lane C — independent features (parallel, outsource anytime)

7. **Spec 075 — preview folder workspaces.** Its committed implementation is now
   present on `main`; keep the matching feature worktree until its dirty
   user-verification artifacts are reconciled. The remaining gates are native OS
   picker/regrant evidence and Opus closeout review. (Also solves the
   folder-backed navigation backlog idea below.)
8. **Spec 070 — layers palette reorder.**

### Lane D — reusable review tooling (parallel, contract-first)

9. **Spec 081 — diagram review workspace and feedback loop.** The isolated
   branch `feat/081-diagram-review-workspace` freezes the neutral review-set and
   findings contracts and extracts the proven Mermaid/planning FigJam tooling.
   Phase 0 baseline evidence and the Phase 1 schema gate must land first; after
   that, the core/CLI, plugin, adapters, and documentation lanes have disjoint
   ownership and can be assigned in parallel. The intended distribution home is
   neutral (`canonical-diagram-review`), not another route-local plugin copy.

### Blocked (do not touch)

- **Spec 065 — interactive relayout contract.** Blocked on the uncaptured
  historical `baseline-fail.json` artifact. Leave parked until that is resolved.

### Parallelism summary (for outsourcing)

- Lanes A(1), A(2), B, C, and D can all run **at the same time**.
- A(3) and A(4) are the only sequential spine, gated on A(2) passing.
- Every implemented slice returns to **Opus for adversarial review** before merge.

The `defineGraphLayoutPreviewEngine` factory + per-engine `engines/*.engine.ts`
substrate is already in place (decentralized `registerPreviewEngine`, no central
engine list); engine breadth should consume the Spec 071 node contract rather
than the current shared render paths.

Other open work: pick a package from `docs/specs.md`, then execute from that
package's `tasks.md`.

---

## Backlog ideas (not yet numbered specs)

Promote to a numbered `specs/<id>-<slug>/` package (and add a `docs/specs.md`
row) before coding. Bugs already captured by a numbered spec live in
`docs/specs.md`, not here.

- `editor-base.js` thinning — true spec 046 follow-up; ~587 lines of legacy
  interaction state still not decomposed.
- Engine breadth on the spec 071 node contract: state/lifecycle, tree/mindmap,
  swimlane, ER/class orthogonal, `elk-force` lane polish.
- Editor workflow: folder-backed navigation, cross-engine multi-select
  align/distribute, bulk pin/unpin.
- Layers palette follow-up after spec 070: cross-parent move/reparent and
  drag-and-drop between containers, not just same-parent reorder.
- Frame authoring: nested children default to autolayout **fill** not fixed
  width (gap regression on fresh diagrams); root sizing / direction-change.
- Performance/stability: investigate preview or generation jobs that saturate
  CPU/RAM and can lock a workstation under heavy diagram loads.
- Rich node content blocks: heading + paragraph + bullet-list content inside one
  node without abusing grey annotation children.
- Contract hardening: arrow clearance, invalid-enum diagnostics, preview JSON
  schema freshness, parser negatives, layout idempotency.
- Later: ontology-driven engine selection, security hardening, arrow waypoint
  editing, `DIAGRAM.md` refinement.
- make the project more user-friendly for people on lower models and on terminal rather than vscdoe: slash commands for import,export, convert from inputs (pasted image, verbal description, .mmd, .drawio) to outputs (svg, png, drawio, mermaid).

> Completed-work notes and one-off session audits do not belong here. Put those
> in the `AGENTS.md` handover (transient) or the spec package they relate to.
