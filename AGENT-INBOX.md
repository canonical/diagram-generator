# Agent inbox — live state

Current state only. Invariants live in `AGENTS.md`; operating guidance lives in
`docs/agent-index.md`; durable spec detail lives under `specs/`.

**Last-known-green (2026-07-13, spec 079):** `apps/figma-plugin` **42/42**;
plugin build and `check_no_new_python.mjs` pass; dev server health is 200 at
`http://localhost:3846`.

## Pre-merge handoff — spec 079

**Branch:** `feat/079-figma-component-variant-import`

The importer accepts selected YAML and maps semantic Section, Panel, and leaf
nodes to live variants of the current-file `box` component set. Parent/Section
content and icons use only real live `SLOT` nodes; there is no detach fallback
or ordinary instance-sublayer structural edit. V3 `kind: container` nodes are
raw generated auto-layout wrappers, not `Role=Parent` instances.

Figma can make inserted slot descendants opaque after insertion. The importer
checks sizing at mutation time and SlotNode `limitViolations`; post-build
readback uses global/direct handles when available and does not roll back a
valid diagram solely for opaque slot content. Effective V3 `FIXED` geometry is
reapplied after final auto-layout reparenting; HUG and FILL remain auto-layout
semantics.

**2026-07-13 Regional edge sizing fix:** the fixture's explicit
`regional_edge.sizing_h: fill` forced a fixed panel with a fill-sized synthetic
slot body, while its `regional_row1` children correctly hugged. Removing that
override restores the V3 effective vertical chain to panel/body/row `HUG`.
The real-telecom payload regression asserts the body is exactly as tall as the
row; it protects against a clipped final child without changing component
master layers.

The branch is queued for an independent adversarial merge review. Give Opus
[`docs/spec-reviews/opus-review-prompt-2026-07-13-spec-079-merge.md`](docs/spec-reviews/opus-review-prompt-2026-07-13-spec-079-merge.md);
it must write its verdict to
`docs/spec-reviews/opus-adversarial-review-2026-07-13-spec-079-merge.md`.

Remaining live gate: verify the rebuilt plugin against the actual Figma file
for sizing and visual component fidelity. Do not claim that gate passed without
recorded evidence in the spec inspection file.
