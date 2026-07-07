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
992/992, `apps/preview` 166/166; `build:browser`, `check-browser-bundle-fresh`,
`check_no_new_python`, and preview-shell size budgets all green.

---

## Current handoff (2026-07-07) — 076 REOPENED, ready for a cold-start GPT

**Task:** fix the TLS diagram render so it matches the Mermaid reference, then
re-close 076 against a real render gate. The earlier closeout was premature: the
tests passed but the rendered diagram is broken.

**Start here (read in order):**

1. `specs/076-tls-mermaid-cold-start-fit/spec.md` — read the
   "REOPENED 2026-07-07 — closeout was premature" section. It is the authoritative
   work list (bar, defects D1–D5, ordered steps). Ignore any "merged/archived"
   wording elsewhere in that file; it is history.
2. `specs/076-tls-mermaid-cold-start-fit/tasks.md` — Phase 5, tasks `T050`–`T056`.
   All open. Do them in order; `T051` (failing render regression) comes before any
   fix.

**The bar (non-negotiable):** the live render of
`tls-certificate-provider-topology` must reach visual parity with the Mermaid
reference:
- `specs/076-tls-mermaid-cold-start-fit/images/01-source-mermaid-reference.png`
- sister harness `H:\WSL_dev_projects\mermaid-wt-076-tls\tmp-final-canonical.png`

Engine-resolution probes and geometry-snippet asserts are NOT sufficient — that
is exactly what let the broken render pass last time.

**Confirmed defects:**
- D1 grey two-line annotation nodes render as single-line bare text — the second
  label line (`interface: tls-certificates`) is dropped and the grey box chrome is
  gone.
- D2 top-down clustered structure is cramped, not the clean provider fanout.
- D3 endpoint / relation rows are not clean horizontal rows.
- D4 certificate text is truncated.
- D5 the `:8100` preview is stale (no server-side TS hot reload) and shows an even
  older render — reproduce on a fresh server or the export route, never `:8100`.

**Rules:** no Dagre (spec 074 retirement holds); no behaviour-heavy
`scripts/preview/*.js`; the fixture YAML is correct (both label lines are
authored) so the bug is in the render path, not the YAML. Work on a fresh
`feat/076-...-reopen` branch.

**Root cause of the false green:**
`packages/layout-engine/tests/preview-engine-fidelity-probes.test.ts` only proves
the fixture resolves to `elk-layered`;
`packages/layout-engine/tests/elk-layout.test.ts` only asserts two geometry facts.
Neither renders the SVG. The annotation-rendering bug likely lives in the
frame-render vs ELK position read-back path in
`packages/layout-engine/src/elk-layout.ts`.


