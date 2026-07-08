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

Docs-only spec packages 028 and 075 are merged to `main`; their feature
branches are deleted. Implementation starts on fresh `feat/<id>-<slug>` branches.

**076 is CLOSEOUT READY AGAIN (2026-07-07):** the Phase 6 review reopen is now
implemented and green on the real browser + server paths. The package stays on
`feat/076-tls-mermaid-cold-start-fit` pending Opus adversarial review and merge;
the resolved work kept TLS cert rows in the ELK graph, reconciled the wrapper
source model, fixed preview-wire `justify` loss, and raised browser/server
parity regressions. No Dagre.

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
2. **Spec 028 — Mermaid import** (`specs/028-diagram-interchange-mermaid-d2/`),
   reusing the 076 cluster->ELK lowering
   (`specs/076-tls-mermaid-cold-start-fit/`). No Dagre.

### Lane B — standing user-facing regressions (parallel, independent of Epic A)

These are isolated bugfixes; two different GPT agents can take them at once.

5. **Spec 061 — grid regression.** Its "hide grid affordances on non-grid engines"
   containment is a fast visible win; do that first, then root-cause.
6. **Spec 064 — arrow annotation label de-overlap.** Investigation-first.

### Lane C — independent features (parallel, outsource anytime)

7. **Spec 075 — preview folder workspaces.** (Also solves the folder-backed
   navigation backlog idea below.)
8. **Spec 070 — layers palette reorder.**

### Blocked (do not touch)

- **Spec 065 — interactive relayout contract.** Blocked on the uncaptured
  historical `baseline-fail.json` artifact. Leave parked until that is resolved.

### Parallelism summary (for outsourcing)

- Lanes A(1), A(2), B, C can all run **at the same time**.
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

> Completed-work notes and one-off session audits do not belong here. Put those
> in the `AGENTS.md` handover (transient) or the spec package they relate to.
