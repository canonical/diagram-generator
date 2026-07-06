# Agent inbox

Focused last-session -> next-session handoff only. Keep this short.

- **Human notes:** [`INBOX.md`](INBOX.md) — author -> agent.
- **Execution order & what to do next:** [`TODO.md`](TODO.md) — read at session start; it owns the priority queue.
- **Active-spec catalog + status:** [`docs/specs.md`](docs/specs.md).
- **Durable per-spec detail:** `specs/<id>-<slug>/` (`spec.md` + `plan.md` + `tasks.md`).
- **Adversarial reviews:** `docs/spec-reviews/`.

Do not park full session logs, spec inventories, resolved adversarial reviews, or
validation transcripts here — those belong in the relevant `specs/<id>-<slug>/`
package or in git history. If a review is resolved, delete it from this file.

---

## Cold-start: what to do next (2026-07-06)

**Read order:** this note → [`TODO.md`](TODO.md) (priority queue) → the chosen
spec's `spec.md`/`plan.md`/`tasks.md`. `TODO.md` is authoritative for order; this
inbox does not duplicate it.

**Repo state:** clean. `main` is pushed to `origin` (in sync). No mid-refactor —
the substrate specs (046, 047, 052, 071–074) are merged and archived. Doc-only
spec packages 028, 075, 076 are merged to `main`; their branches are deleted.

**Roles:**
- Claude/Opus — planning, architecture, spec authoring, and adversarial review.
- GPT — implements specs exactly as written on a fresh `feat/<id>-<slug>` branch,
  then hands back for Opus review. If a spec is ambiguous, STOP and ask.

**Next up (full detail + parallel lanes in [`TODO.md`](TODO.md)):**
- **Epic A — Mermaid composite diagrams.** Gated: planning audit (in
  `diagram-generator-planning`) → **spec 076 T0 spike FIRST** (prove a compound
  ELK graph reproduces the reference; report PASS/FAIL and stop) → 076 port →
  spec 028 Mermaid import. No Dagre; port `@mermaid-js/layout-elk`'s cluster
  lowering. See `docs/spec-reviews/076-tls-mermaid-cold-start-fit.md`.
- **Lane B (parallel):** specs 061 (grid regression) and 064 (arrow label
  de-overlap) — isolated regressions.
- **Lane C (parallel):** specs 075 (folder workspaces), 070 (palette reorder).
- **Blocked:** spec 065 — parked on the uncaptured `baseline-fail.json`.

**Last known-green validation baseline:** `packages/layout-engine` 989/989,
`apps/preview` 164/164, `check_no_new_python`, `check-preview-shell-size-budgets`,
`check-browser-bundle-fresh` all ok. Rerun before closing any spec.

## Spec 076 T0 — Opus verdict (2026-07-07): do NOT reintroduce Dagre

GPT's T0 spike concluded "ELK failed, use Dagre." **Adversarial review rejects
that pivot.** Full reasoning in
[`docs/spec-reviews/076-tls-mermaid-cold-start-fit.md`](docs/spec-reviews/076-tls-mermaid-cold-start-fit.md)
(section "T0 evidence review — 2026-07-07"). Summary:

- The spike (`tmp/elk-cluster-spike.mts`) set **no** ELK ordering options
  (`considerModelOrder` / `crossingMinimization` / model-order): ELK was never
  asked to preserve row order, so the misordering proves nothing.
- The dagre "match" needs a **fabricated** `octavia_k8s --- traefik_public` edge
  (GPT's own README excludes it as non-source) — doctored dagre vs ordering-off
  ELK is not a fair test.
- The real blocker is an **uninvestigated `elkjs` crash** when combining
  `INCLUDE_CHILDREN` + model-order. Root-cause it; do not retire the engine.

**Next (GPT, bounded spike, no product code):** run the specific ELK-ordering
experiment in the review doc — model-order on the ordering rows only, keep those
rows `SEPARATE_CHILDREN`, route cross-cluster edges via containers/ports. Report
PASS/FAIL with the option set. Spec 074's Dagre retirement stands.
