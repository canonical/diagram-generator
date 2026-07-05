# TODO — execution order

## Purpose

**This file owns one thing: the order specs are executed in.** It is the single
priority queue for "what to work on next", plus a scratch backlog of ideas not
yet promoted to a numbered spec.

Role split — do not duplicate content across these:

| File | Owns (single source of truth) | Must NOT contain |
|------|-------------------------------|------------------|
| `TODO.md` (this file) | Execution **order**; un-numbered backlog ideas | Per-spec status, summaries, task lists |
| `docs/specs.md` | The spec **catalog**: every package, its status, one-line summary, path (by id) | Priority / what-next ordering |
| `specs/<id>-<slug>/tasks.md` | The executable task list for one spec | Cross-spec ordering |

Spec-kit has no cross-spec ordering concept (it is per-feature: specify → plan →
tasks → implement). Ordering across specs is a repo concern and lives here.

Conflict rule: for a spec's **status**, trust `docs/specs.md`; for **what to do
next**, trust this file.

**Jira:** Stream E (constrained editor) under
[DE-941](https://warthogs.atlassian.net/browse/DE-941).

---

## Next spec to tackle (priority order)

Reordered 2026-07-05 after the engine-architecture decisions. Cold-start agents:
read [`AGENT-INBOX.md`](AGENT-INBOX.md) "START HERE" first, and the strategy in
[`docs/architecture/node-paradigm-and-engine-strategy.md`](docs/architecture/node-paradigm-and-engine-strategy.md).
Specs 071, 062, 063, 072 are complete.

**Decided architecture work (implement first):**

1. **Spec 074 — layout algorithm consolidation.** Remove Dagre (decided) + add
   the hard no-duplicate-algorithm guard, then the corpus-driven survey +
   `decision-matrix.md`. Inputs from `diagram-generator-planning`.
2. **Spec 073 — layout node model + param-pane unification.** Drop "family",
   rename `grid`→`frame`, make panel/lane registration data-driven (closes
   spec 046 T073), route force params through the shared pane. Force input
   format stays; pipeline convergence (T060) is deprioritised.

**Standing user-facing regressions:**

3. **Spec 061 — grid regression investigation.** (061's "hide affordances now"
   containment can be slotted earlier for a fast visible win.)
4. **Spec 064 — arrow annotation label de-overlap.**

**Independent feature:**

5. **Spec 070 — layers palette reorder.**

**Bookkeeping (fast, low-risk, do between slices):** specs 046 and 047 are done
and archived (2026-07-05). Still outstanding: archive the 13 merged-but-
unarchived specs (`048, 051, 052, 054–060, 062, 063, 071`) and refresh the stale
`feat/*` branch references in the `AGENTS.md` handover. Detail in
`AGENT-INBOX.md`.

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
- Frame authoring: nested children default to autolayout **fill** not fixed
  width (gap regression on fresh diagrams); root sizing / direction-change.
- Contract hardening: arrow clearance, invalid-enum diagnostics, preview JSON
  schema freshness, parser negatives, layout idempotency.
- Later: ontology-driven engine selection, security hardening, arrow waypoint
  editing, `DIAGRAM.md` refinement.

> Completed-work notes and one-off session audits do not belong here. Put those
> in the `AGENTS.md` handover (transient) or the spec package they relate to.
