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

## Current handoff (2026-07-08) — 076 paused for Opus direction review

**Branch:** `feat/076-tls-mermaid-cold-start-fit`

**Current state:**
- The TLS fixture source model was corrected from 5 shortcut edges to the 13
  reference edges through the certificate/interface nodes.
- The Mermaid reconstruction was updated to the same 13-edge topology.
- The preview regression now asserts the 13 expected edges, rejects the old
  `manual_tls_certificates -> endpoint` shortcuts, and checks that the SVG emits
  13 arrows.
- Implementation is intentionally paused before more ELK work. The current
  diagnosis is that raw ELK is still structurally wrong and the product path
  still owns too much after ELK.

**Review gate now in repo:**
- Spec reset: `specs/076-tls-mermaid-cold-start-fit/spec.md`
  (`## 2026-07-08 Research Reset`)
- Opus prompt:
  `docs/spec-reviews/076-tls-mermaid-cold-start-fit-opus-review-prompt-2026-07-08.md`
- Local Mermaid oracle:
  `/Users/l/work/brand-aligned-mermaid/README.md`
  and `/Users/l/work/brand-aligned-mermaid/PLAYBOOK.md`

**Key technical pressure points for the next reviewer:**
- `packages/layout-engine/src/elk-layout.ts:1053` still lowers graph edges as
  flat leaf-to-leaf edges.
- `packages/layout-engine/src/elk-layout.ts:1177` still clears routed geometry
  after post-ELK movement.
- `packages/layout-engine/src/elk-layout.ts:1474` still runs substantial
  post-ELK ownership passes.
- Mermaid harness guidance now confirms two relevant source-shape constraints:
  fan-out labels should route through a hub, and containers should not be used
  as edge endpoints.

**Last-known validation on this branch work:**
- `node --import tsx --test src/persistence/tls-render-regression.test.ts`
  (from `apps/preview`) passed after the topology/test update.
- `npm --prefix packages/layout-engine test -- preview-engine-fidelity-probes.test.ts`
  passed during the same cycle.

**Next step:**
- Run the fresh Opus adversarial review against the current branch plus working
  tree diagnosis before landing more ELK/product-path changes.
