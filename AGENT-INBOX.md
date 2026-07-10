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

## Current handoff (2026-07-10) — spec 078 ready for Opus review

**Branch:** `feat/078-figma-autolayout-plugin`

Spec 078 is **Closeout Ready** pending Opus adversarial review. User/Opus
confirmed the live Figma import now preserves Fill/Hug/Fixed sizing from the
same YAML used by the preview editor.

Review prompt:
[`docs/spec-reviews/opus-adversarial-review-2026-07-10-spec-078.md`](docs/spec-reviews/opus-adversarial-review-2026-07-10-spec-078.md).

Closeout evidence:
[`specs/078-figma-autolayout-plugin/validation.md`](specs/078-figma-autolayout-plugin/validation.md).
