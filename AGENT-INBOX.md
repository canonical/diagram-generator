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

**Last-known-green (2026-07-10, spec 078 branch):** `packages/layout-engine`
**1009/1009**; `apps/preview` **166/166**; `apps/figma-plugin` **13/13**;
Figma plugin build ok; preview build ok; browser-bundle freshness ok;
`check_no_new_python.mjs` ok.

---

## Current handoff (2026-07-10) — spec 079 drafted

**Branch:** `feat/079-figma-component-variant-import`

Spec 078 is merged to `main` and archived. Spec 079 is the follow-up for
mapping diagram boxes to user-authored native Figma component variants,
direction-aware component slots, and arbitrary selected YAML import.

Spec package:
[`specs/079-figma-component-variant-import/`](specs/079-figma-component-variant-import/).

First implementation gate: inspect the user's component variants and prove the
slot insertion strategy in live Figma before replacing the generic frame builder.
