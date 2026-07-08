# Agent inbox — live state (single owner)

Session-start read for **what's happening right now**: current task, active
blockers, and last-known-green validation. This is the single owner of transient
state — no other file restates it. Keep it short; when a note is resolved or
superseded, **delete it** (git and the spec package hold the history). Do not park
session logs, spec inventories, resolved reviews, or validation transcripts here.

Other owners: invariants → [`AGENTS.md`](AGENTS.md) · operational how-to →
[`docs/agent-index.md`](docs/agent-index.md) · queue/order → [`TODO.md`](TODO.md) ·
spec catalog/status → [`docs/specs.md`](docs/specs.md) · human notes →
[`INBOX.md`](INBOX.md) · durable per-spec detail → `specs/<id>-<slug>/` ·
adversarial reviews → `docs/spec-reviews/`.

**Last-known-green (2026-07-08, spec 077 branch):** `layout-engine` **1005/1005**;
`export-frame-drawio` **13/13** (golden + positional assertions);
`check-browser-bundle-fresh.mjs` ok; `check-preview-shell-size-budgets.mjs` ok;
`check_no_new_python.mjs` ok. Adversarial review blockers addressed (display-list
adapter, layout dispatch, golden tests).

---

## Current handoff (2026-07-08) — spec 077 Phase 3-4 wiring REJECTED on review

**Active spec:** 077 (`specs/077-mermaid-elk-cluster-lowering-port/`). **Start
here:** [`specs/077-.../handoff.md`](specs/077-mermaid-elk-cluster-lowering-port/handoff.md)
for the branch bootstrap and hard rules, then [`tasks.md`](specs/077-mermaid-elk-cluster-lowering-port/tasks.md).

**Branch:** `feat/077-mermaid-elk-cluster-lowering-port`. Do **not** resume 076.

**Reviews:**
[phase 1-2](docs/spec-reviews/077-mermaid-elk-cluster-lowering-port-phase-1-2-review.md)
(Phase 1 accepted) · **[phase 3-4](docs/spec-reviews/077-mermaid-elk-cluster-lowering-port-phase-3-4-review.md)
— the current authority.**

**State:** Phase 0-2 **primitive** work is good and committed-worthy (LCA lowering,
native model order, `ORDERING_EDGE_PREFIX` removed, crash evidence). The **Phase
3-4 product wiring is rejected**: it re-implements the 076 pathology under new
names. The cluster-lowered path does not let ELK own geometry —
`shouldIncludeElkNode` still excludes annotation/cert leaves so they are hand-placed
after ELK, and `hydrateClusterLoweredShellFrames` resizes shells from child bboxes
(the `tls_provider` centering test failure is that symptom, not the last mile). The
architecture "ban test" asserts a function-rename, not the invariant. SC-001 render
proof (T050) is not done.

**Next step (do not patch the centering drift):**
1. make annotation/cert leaves first-class ELK nodes (stop excluding them in
   `shouldIncludeElkNode` on the cluster path) so ELK places/orders them;
2. delete the geometry work in `hydrateClusterLoweredShellFrames` — read ELK node
   rects + `edge.sections` verbatim, keep only `applyClusterLoweredThinStyles`;
3. rewrite the architecture test to assert the invariant (no node geometry mutated
   after `elk.layout()`; arrow points == ELK sections);
4. land SC-001: render the real TLS SVG and diff the reference before marking
   Phase 3-5 done. Full detail in the phase 3-4 review.

**Re-verified 2026-07-08 (post-`cdf4ba2`):** no rework since the rejection —
`elk-layout.ts` is untouched, `shouldIncludeElkNode` still excludes annotation
leaves (C1), `hydrateClusterLoweredShellFrames` still owns geometry (C2), no SC-001
render test (C4). The phase 3-4 review stands verbatim; steps 3 (T030/T031) and 4
(T040) remain **rejected**. Nothing new to review until GPT lands the 4 next-steps
above.
