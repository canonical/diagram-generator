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

**Last-known-green (2026-07-07):** `graph-layout-elk` 44/44, `layout-engine`
992/992, `apps/preview` 167/167; `build:browser`, `check-browser-bundle-fresh`,
`check_no_new_python`, and preview-shell size budgets all green.

---

## Current handoff (2026-07-07) — 076 reopened Phase 5 is complete on branch

**Task status:** `feat/076-tls-mermaid-cold-start-fit` now has the reopened TLS
render fixes and is ready for review / commit. The prior false-green closeout is
repaired: the repo now owns a real product-path SVG regression plus evidence.

**Key outputs:**

1. `apps/preview/src/persistence/tls-render-regression.test.ts`
   - renders the real product SVG and asserts both annotation label lines, grey
     annotation chrome, one horizontal endpoint row, and no truncation
2. `specs/076-tls-mermaid-cold-start-fit/evidence/tls-render-reopen-baseline.svg`
   - fresh broken baseline captured before the fixes
3. `specs/076-tls-mermaid-cold-start-fit/evidence/tls-render-reopen-fixed.svg`
   - fresh product render after the fixes
4. `specs/076-tls-mermaid-cold-start-fit/evidence/tls-render-reopen-2026-07-07.md`
   - comparison note linking the Mermaid reference, sister harness, baseline, and
     fixed render

**Implemented fix owners:**

- YAML line normalization now preserves single-entry mapping lines like
  `interface: tls-certificates` as literal label text.
- Borderless grey annotation leaves keep their grey fill.
- Omitted annotation descendants use semantic text-fit sizing, so their full
  label fits instead of wrapping into extra `tspan`s.
- ELK-stacked horizontal rows normalize back to their semantic row shape, and
  affected ELK edge routes are cleared so the standard router reroutes against
  the corrected boxes.

**If resuming 076:** start with `specs/076-tls-mermaid-cold-start-fit/tasks.md`
and `evidence/tls-render-reopen-2026-07-07.md`; the spec catalog row is now
`Closeout Ready 2026-07-07 — reopened Phase 5 complete`.


