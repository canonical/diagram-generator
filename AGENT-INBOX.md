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

## Current handoff (2026-07-08) — spec 077, rebased + validated

**Branch:** `feat/077-yaml-drawio-export` (uncommitted).

**Done this session:**

- Re-homed draw.io export as `render-adapter/drawio.ts` over
  `emitFrameDiagramDisplayList` (no parallel frame/arrow plan walker).
- Thin shell: `drawio-render.ts` + `layoutFrameDiagramForExport` (preview-engine
  dispatch; ELK for `ai-infra-production-contract`).
- Golden `.drawio` under `specs/077-yaml-drawio-export/golden/`; structural +
  geometry assertions in `export-frame-drawio.test.ts`.
- Fixture level-promotion fixes on ai-infra YAML (`level: 1` where required).
- `public-api-contract.ts` includes `exportFrameDiagramToDrawio`.
- Rebased onto latest `origin/main`; no replay required because the branch was
  already based on the current remote tip.
- Re-ran `npm --prefix packages/layout-engine test`,
  `check-browser-bundle-fresh`, preview-shell size budgets, and
  `check_no_new_python`.

**Still open before closeout:**

- **T021** — manual open-in-draw.io verification of all three slugs.
- **T024** — commit fixtures + goldens.
- Commit + PR when user asks.

**Review doc:** [`docs/spec-reviews/branch-077.md`](docs/spec-reviews/branch-077.md)
