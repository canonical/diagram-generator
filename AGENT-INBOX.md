# Agent inbox — live state

Current state only. Invariants live in `AGENTS.md`; operating guidance lives in
`docs/agent-index.md`; durable spec detail lives under `specs/`.

**Last-known-green (2026-07-13, spec 079):** `apps/figma-plugin` **47/47**;
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

**2026-07-13 semantic grouping and sizing fix:** headingless groups serialize
as raw `container` frames, even if they have an explicit source level; every
non-leaf node with frame-owned visible text receives a live semantic component
(Parent or Section), including authored level-1 panels. This prevents the
master placeholder `Parent` chrome and unnecessary slots from leaking into
structural groups while keeping headed semantic boxes live. Explicit vertical
`sizing_h: fill` overrides were removed from content-driven fixture panels, so
their panel/body/row chains use V3 `HUG`; the tallest child now determines the
height. Payload regressions cover both contracts without changing component
master layers.

**2026-07-13 slot-body and icon contract correction:** a mapped content slot
contains exactly one raw directional frame. If a semantic node has one
automatic structural child, that child is inserted directly as the slot body;
the importer does not add a redundant `<semantic-id>/body`. Structural frames
are neutral (zero padding, transparent/no stroke, no component chrome). The
component contract recognizes a Boolean `hasIcon` definition even without a
direct icon-layer reference and always sets it false for icon-less payload
nodes; no detachment or ordinary instance edit is involved.

The adversarial re-review verdict is **Merge with follow-ups**. The headed
level-1 container classification defect is fixed: headed non-leaf containers
become live panels, explicit grey/solid panel chrome is preserved, and
value-map payload and component-mode regressions guard the behavior. The full
review history is in
`docs/spec-reviews/opus-adversarial-review-2026-07-13-spec-079-merge.md`.

The two re-review follow-ups are implemented in the working tree: upstream
`resolveStyles` normalizes headed level-1 containers to panel chrome, and
headed containers nested directly in a panel remain structural to avoid nested
Parent boxes. Real-Figma visual verification remains a release gate.

Remaining live gate: verify the rebuilt plugin against the actual Figma file
for sizing and visual component fidelity. Do not claim that gate passed without
recorded evidence in the spec inspection file.
