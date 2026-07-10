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

**Last-known-green (2026-07-10, spec 077 TLS focus):**
`packages/graph-layout-elk test` **70/70**; `apps/preview test` **168/168**;
TLS/layout-engine focused suites green; layout-engine package build steps,
`packages/layout-engine build:browser`,
`check-browser-bundle-fresh.mjs`, `check-preview-shell-size-budgets.mjs`,
`check_no_new_python.mjs`, and `git diff --check` green (line-ending warnings
only). Full `packages/layout-engine test` is not green because of the unrelated
dirty draw.io golden noted below.

---

## Current handoff (2026-07-10) — spec 077 TLS topology

**Active spec:** 077 (`specs/077-mermaid-elk-cluster-lowering-port/`).
**Branch:** `feat/077-mermaid-elk-cluster-lowering-port`.

Durable current-state details live in
`specs/077-mermaid-elk-cluster-lowering-port/handoff.md` and
`specs/077-mermaid-elk-cluster-lowering-port/evidence/tls-raw-styled-parity.md`.
The TLS fixture now uses configured, generic mechanisms: `meta.frame_roles`,
`meta.layout_profiles.same_layer_compound_heights`, and typed ELK
fan-out/order options. Raw ELK and product SVG agree on visible frame geometry,
edge-label geometry, shared consumer fan-out stem, section/parent role styling,
and equal lower-compound heights.

**Review done (2026-07-10):**
[`docs/spec-reviews/077-mermaid-elk-cluster-lowering-port-adversarial-review-2026-07-10.md`](docs/spec-reviews/077-mermaid-elk-cluster-lowering-port-adversarial-review-2026-07-10.md).
Readiness: **review blocker addressed on the current branch.** The first attempt
matched Mermaid's inline-label option but exposed a product-render overlap because
our arrow labels are transparent by design. The current fix keeps the behavior
configurable: layered ELK labels default to detached (`elk.edgeLabels.inline:
false`), expose documented label spacing/side/layer controls, and TLS pins those
controls in YAML. Product tests now assert no arrow segment crosses an ELK-owned
label box. T051 (second cold-start fixture) and T054 (full validation, blocked
only by the unrelated draw.io golden below) still block spec closeout.


**Still open at spec level:**
- T044 ELK option inventory/discoverability audit remains open: every
  YAML-admitted option must be visible in the layout-params UI, and omitted
  official ELK options need an explicit reason instead of becoming hidden knobs.
- T051 second cold-start clustered fixture remains open.
- T054 full layout-engine validation remains blocked by the unrelated draw.io
  golden below; focused TLS/layout and full graph-layout/preview validation are
  green.
- Full `npm --prefix packages/layout-engine test` currently fails only in
  `export-frame-drawio.test.ts` for
  `specs/077-yaml-drawio-export/golden/ai-infra-production-contract.drawio`.
  Those draw.io golden files were already dirty/unrelated; do not revert or sweep
  them into the TLS branch without an explicit decision.
