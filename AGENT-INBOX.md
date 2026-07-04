# Agent inbox

Focused last-session -> next-session handoff only. Keep this short.

- **Human notes:** [`INBOX.md`](INBOX.md) — author -> agent.
- **Execution order & backlog:** [`TODO.md`](TODO.md) (read at session start).
- **Active-spec index:** [`docs/specs.md`](docs/specs.md).
- **Durable per-spec detail:** `specs/<id>-<slug>/`.

Do not park full session logs, spec inventories, or validation transcripts
here — those belong in the relevant `specs/<id>-<slug>/` package.

---

## Handoff — 2026-07-04

- **Branch / tree:** `feat/072-preview-engine-hardening`, based on spec 063
  closeout commit `8e58b81`.
- **Queue (per `TODO.md`):** 061 → 064 → 072. 072 is a directed hardening slice
  added after the existing Opus order; 061 and 064 stay ahead of it in the
  queue.
- **Validation on current tree (green):** layout-engine `973/973`, preview
  `160/160`, `check_no_new_python` ok, browser bundle fresh.

---

## Adversarial review request — spec 072 hardening slice

```text
Adversarial review request.

Scope: review everything landed after commit 8e58b81
("feat(063): align auto-style contract and repaint path"), with the goal of
verifying that the spec 072 hardening slice actually fixes the padding and
engine-independence review gaps without over-claiming the remaining open items.

Repository: diagram-generator
Primary branch: feat/072-preview-engine-hardening
Baseline commit: 8e58b81

Required sources:
- TODO.md
- docs/specs.md
- AGENTS.md
- AGENT-INBOX.md
- specs/072-preview-engine-hardening/
- packages/layout-engine/src/preview-shell/preview-render-node.ts
- packages/layout-engine/src/preview-shell/app-diagram-data.ts
- packages/layout-engine/src/preview-shell/app-fresh-render.ts
- packages/layout-engine/src/preview-engine/{builtins.ts,builtin-install-units.ts,render.ts,index.ts}
- packages/layout-engine/tests/{preview-render-node.test.ts,no-engine-id-branching.test.ts,preview-engine-install-units.test.ts,app-diagram-data.test.ts,app-fresh-render.test.ts,app-load.test.ts,app-scene-host.test.ts,preview-engine-registry.test.ts}
- apps/preview/src/persistence/editor-live-repaint-regression.test.ts
- any other touched files in the current diff

Review goals:
1. Verify the canvas-padding fix is real. Do not accept indirect proof alone:
   the new browser assertion must actually prove right/bottom padding survives
   `Autolayout -> ELK layered` on `mongo-octavia-ha`, and the render-node
   fit/mount order change must be the right owner-level fix.
2. Verify finding A is truly addressed: the no-central-branching guard must now
   catch `v3` / `sequence` style branches in shared source paths, and the old
   central `kind === 'sequence'` branches in `app-diagram-data.ts` and
   `app-fresh-render.ts` must really be gone rather than merely moved sideways.
3. Verify finding B is truly addressed: builtin install-unit registration should
   now be data-driven from one shared builtin collection rather than an O(n)
   manual call ladder.
4. Verify finding C is truly addressed: the browser regression must prove live
   save -> reload -> switch-back state for layered/radial/dagre, not just
   serialized buckets hidden in JS state.
5. Check that the branch does not over-claim the still-open 072 items:
   active-engine badge removal and section-heading bottom-spacing are supposed
   to remain open unless you see real implementation for them.

Output format:
- Findings first, ordered by severity, with file/line references.
- Then open questions / assumptions.
- Then a short change summary only if needed.

Important:
- Do not re-review pre-8e58b81 history unless a later change appears to regress
  it.
- Assume tests can be wrong. If the visible contract is not truly proven, mark
  that as a finding.
```
