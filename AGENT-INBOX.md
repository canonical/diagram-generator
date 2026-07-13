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

**Last-known-green (2026-07-13, spec 077 closeout focus):**
`packages/graph-layout-elk test` **74/74**; focused layout/TLS/portability
validation **26/26**; focused TLS preview render/browser tests **2/2**;
`packages/layout-engine build:browser`, `check-browser-bundle-fresh.mjs`,
`check-preview-shell-size-budgets.mjs`, and `check_no_new_python.mjs` green.
Full layout-engine validation is **1023/1024** and full preview validation is
**167/168**, with only the unrelated baselines recorded below.

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

T044 ELK option discoverability audit is complete:
`specs/077-mermaid-elk-cluster-lowering-port/evidence/elk-option-discoverability-audit.md`.
Every enabled `elkjs` option is now either authorable/exposed in the layout-params
UI or intentionally classified in code.

**Review done (2026-07-10):**
[`docs/spec-reviews/077-mermaid-elk-cluster-lowering-port-adversarial-review-2026-07-10.md`](docs/spec-reviews/077-mermaid-elk-cluster-lowering-port-adversarial-review-2026-07-10.md).
Readiness: **review blocker addressed on the current branch.** The first attempt
matched Mermaid's inline-label option but exposed a product-render overlap because
our arrow labels are transparent by design. The current fix keeps the behavior
configurable: layered ELK labels default to detached (`elk.edgeLabels.inline:
false`), expose documented label spacing/side/layer controls, and TLS pins those
controls in YAML. Product tests now assert no arrow segment crosses an ELK-owned
label box. T051 is now complete via the non-TLS portability fixture and product
SVG regression. T054 remains open pending clean full-suite baselines.


**Still open at spec level:**
- T054 full validation remains open: the layout-engine suite has one unrelated
  draw.io golden mismatch against the committed exporter baseline, and the
  preview suite has one unrelated
  editor-live-repaint default-options failure. Focused TLS/layout/portability
  validation is green.
- Full `npm --prefix packages/layout-engine test` currently fails only in
  `export-frame-drawio.test.ts` for
  `specs/077-yaml-drawio-export/golden/ai-infra-production-contract.drawio`.
  The mismatch is outside TLS scope but is now a committed baseline discrepancy;
  do not mark T054 complete until it is triaged and the full suite is green.
