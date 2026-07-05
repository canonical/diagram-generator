# Opus Adversarial Review Prompt — Mainline after specs 073 + 074

Use this prompt with a single Opus review pass against the current `main` branch.

```text
Familiarize yourself with the `diagram-generator` repo, then perform a strict adversarial review of the current `main` branch as of July 5, 2026.

This is not a self-review request. Review the repo as an external, skeptical engineer. Prioritize bugs, regressions, architectural dishonesty, stale status claims, migration leftovers, and merge damage over compliments or summaries.

Current review target:
- Branch: `main`
- HEAD should include these mainline commits:
  - `1a57904` `merge: integrate specs 073 and 074`
  - `281ab1e` `docs: archive specs 073 and 074`
- Recent merged work includes:
  - spec 073: archived at `docs/spec-archive/073-layout-node-model-param-unification/`
  - spec 074: archived at `docs/spec-archive/074-layout-algorithm-consolidation/`

What changed recently, at a high level:
- Spec 073 unified layout-node / param-pane behavior:
  - renamed preview shell lane `grid` -> canonical `frame` with compatibility aliasing
  - made panel/lane registration data-driven
  - routed force params through the shared layout-params pane
  - kept the `force-spec` doc kind, with some force-pipeline and host-template residuals intentionally deferred
- Spec 074 consolidated layout algorithms:
  - removed Dagre from runtime and active build/preview tooling
  - canonicalized legacy Dagre saves onto `elk-layered` / `meta.elk`
  - enforced unique non-empty `algorithmClass` declarations across preview engines
  - archived merged closeout specs and refreshed handover/catalog docs

Required source files to inspect first:
- `AGENTS.md`
- `docs/specs.md`
- `AGENT-INBOX.md`
- `docs/spec-archive/073-layout-node-model-param-unification/spec.md`
- `docs/spec-archive/073-layout-node-model-param-unification/tasks.md`
- `docs/spec-archive/074-layout-algorithm-consolidation/spec.md`
- `docs/spec-archive/074-layout-algorithm-consolidation/tasks.md`

Then inspect the actual owners affected by the merge:
- `packages/layout-engine/src/preview-engine/`
- `packages/layout-engine/src/preview-shell/`
- `packages/layout-engine/src/force-runtime.ts`
- `apps/preview/src/preview-host/`
- `apps/preview/src/persistence/`
- `scripts/preview/force.js`

Review goals:
1. Find any real product bugs or behavioral regressions introduced or left behind by the spec 073 + 074 merge.
2. Check whether the architecture still matches the stated project goals:
   - typed registration points instead of central branching
   - no reopened spec 046 regressions
   - one implementation per algorithm
   - no dead `algorithmFamily` abstraction
   - force integrated into shared param-surfacing without silently breaking force-specific workflows
3. Check whether Dagre is truly retired from the active product/build/tooling path, not just hidden from one surface.
4. Check whether the `grid` -> `frame` normalization is complete and honest:
   - no broken compatibility seams
   - no accidental shell-mode mismatches
   - no stale docs that still describe `grid` as canonical where it no longer is
5. Check whether docs/status/handover are honest:
   - `AGENTS.md`
   - `docs/specs.md`
   - `AGENT-INBOX.md`
   - archived spec packages
   - any contradictions about what is active, archived, deferred, or complete
6. Check whether the merged archive move is clean:
   - no stale pointers to `specs/073-*` or `specs/074-*` where archive paths should now be used
   - no catalog/handover inconsistencies
7. Check repo hygiene:
   - orphaned debug screenshots or stale evidence files
   - folder organization problems caused by growth
   - obviously stale temp/scratch artifacts that should not be part of the intended steady-state repo

Important constraints for your review:
- Do not spend time praising what looks good.
- Do not propose speculative rewrites unless they are tied to a concrete current risk.
- Treat “Closeout Ready”, “Merged”, and “Archived” as claims to verify, not trust.
- Assume the validation run was green; still look for gaps green tests would miss.
- If you think a claimed residual is honestly deferred and not a blocker, say that explicitly instead of escalating it.

Deliverable format:
- Findings first, ordered by severity.
- Each finding must include:
  - severity (`P0`, `P1`, `P2`, or `P3`)
  - file path(s)
  - exact reason it is a real problem
  - the likely user or maintainer impact
- After findings, include:
  - `Open questions / assumptions`
  - `Status honesty check`
  - `Residual risks that are acceptable vs not acceptable`

If you find no material issues, say so explicitly, but still include:
- residual risks
- testing blind spots
- any places where the docs/handover are still heavier or messier than they should be
```
