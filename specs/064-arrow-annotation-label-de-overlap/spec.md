# Spec 064: Arrow annotation label de-overlap

**Feature Branch**: `feat/064-arrow-annotation-label-de-overlap`
**Status**: Draft
**Created**: 2026-07-05
**Priority**: Spec candidate promoted from INBOX; part of the current
open-work queue alongside spec 061 and spec 070.
**Context**: `INBOX.md` ("annotation labels on arrows get placed on top of one
another ... this is very broken and you [repeatedly] tell me it is fixed; deep
architectural sweep on this pls to discover the real cause", `image.png`), arrow
render owners under `packages/layout-engine/src/`.

## Problem

Arrow annotation labels stack directly on top of one another after an engine or
layout-option change. The reported trigger is changing node placement to network
simplex, after which many arrow labels land in the same place and become
unreadable. Previous attempts reported this as fixed while the underlying cause
persisted, so this spec explicitly requires a deep, evidence-based sweep to find
the **real** cause before implementing a de-overlap fix.

Two candidate causes must be distinguished, because they have different owners:

1. **Genuine geometric overlap.** Arrow labels are anchored per-arrow at the
   shaft midpoint offset by a fixed `labelGap`
   (`resolveArrowLabelAnchor` in `arrow-render-plan.ts`). There is no
   cross-label collision or de-overlap pass, so when a layout change clusters
   several arrow midpoints, their labels legitimately overlap.
2. **Stale render-node artifact.** Labels from a previous layout/engine may not
   be cleared on an engine or option switch, so old labels remain painted under
   new ones — a render/mount-lifecycle bug in spec 071 territory rather than a
   placement gap.

The spec must first prove which cause (or combination) is real for the reported
fixtures, then fix the real one. It must not ship another placement tweak that
"looks fixed" on one example while the class of bug survives.

## Goals

- Determine the real cause of stacked arrow annotation labels after engine and
  layout-option changes, with committed evidence, distinguishing genuine
  geometric overlap from stale-render-node artifacts.
- Fix the real cause so arrow annotation labels do not sit on top of one another
  after engine/option changes.
- If the cause is geometric, add a deterministic label de-overlap pass so
  repeated layouts converge to readable, non-overlapping label placement.
- If the cause is a stale-render artifact, route the fix through the spec 071
  render/switch node lifecycle rather than adding an ad-hoc clear.
- Protect the fix with a repository-owned regression on a reproducing fixture so
  the class of bug cannot silently return.

## Non-goals

- No change to arrow **routing** geometry (shaft path) beyond what label
  placement needs; routing redesign is spec 006.
- No change to annotation typography/one-font-size work (that is the 059-class
  styling contract) except where a label's own size is needed to compute its
  bounds.
- No grid work (spec 061) and no auto-style/nesting work (spec 063).
- No new behavior-heavy logic in `scripts/preview/*.js`.
- No widening of `scripts/preview/editor.js` or `scripts/preview/layout-bridge.js`.

## Current behavior (as found)

- Arrow label plans are built in
  `packages/layout-engine/src/arrow-render-plan.ts`
  (`ArrowRenderLabelPlan`, `normalizeArrowLabelLines`, `resolveArrowLabelAnchor`).
- `resolveArrowLabelAnchor` places a single label per arrow at the shaft
  midpoint, offset along the shaft normal by `labelGap`
  (`options.arrow.labelGap ?? GRID_GUTTER`). It considers only that one arrow —
  there is no awareness of other arrows' labels.
- DOM label rendering is owned by
  `packages/layout-engine/src/preview-shell/app-arrow-render.ts`; shaft geometry
  by `arrow-geometry.ts` / `arrow-routing.ts`.
- There is no cross-arrow label collision/de-overlap step anywhere in the plan
  path, so clustered midpoints yield stacked labels.
- Whether stale labels persist across an engine/option switch depends on the
  spec 071 render/switch-node lifecycle and must be confirmed, not assumed.

## Functional requirements

### Investigation (prove the real cause first)

- **FR-001**: The spec MUST produce a committed finding
  (`findings.md`) that reproduces the stacked-label symptom on a named fixture
  after an engine/layout-option change, and classifies the cause as (a) genuine
  geometric overlap, (b) stale render-node artifact, or (c) both, with
  file+symbol references and reproduction steps.
- **FR-002**: The finding MUST explicitly check the stale-render hypothesis
  against the spec 071 render/switch-node lifecycle before concluding the cause
  is geometric, so the fix lands in the correct owner.

### Fix (route to the real owner)

- **FR-003**: If the cause is geometric, a deterministic label de-overlap pass
  MUST be added so that no two arrow annotation labels render with overlapping
  bounds for the reproducing fixtures, and repeated relayouts of the same input
  produce the same label placement (deterministic, order-stable).
- **FR-004**: If the cause is a stale render-node artifact, the fix MUST clear or
  re-derive arrow labels through the spec 071 render/switch-node lifecycle rather
  than an ad-hoc DOM clear in legacy JS.
- **FR-005**: The de-overlap pass (if added) MUST compute label bounds from the
  label's actual measured line box, not a fixed guess, and MUST keep each label
  associated with its arrow (no orphaned/reassigned labels).
- **FR-006**: The fix MUST NOT regress single-arrow label placement: an arrow
  whose label does not collide keeps its current midpoint+`labelGap` anchor.
- **FR-007**: The fix MUST be stable across the reported trigger (node placement
  set to network simplex and other layout-option/engine changes): switching
  options and back MUST not leave labels stacked.
- **FR-008**: All work MUST stay TypeScript-first in the arrow render/preview
  owners and MUST NOT widen `editor.js` or `layout-bridge.js`.

## User stories

### US1: Labels stay readable after a layout-option change

As an editor user, when I change node placement (for example to network simplex)
or switch engines, arrow annotation labels do not stack on top of each other.

**Acceptance**: on the reproducing fixture, after the option/engine change, no
two arrow labels overlap and each label stays attached to its arrow.

### US2: The cause is proven, not patched

As a maintainer, I can read a committed finding that shows the real cause
(geometric vs stale render) with references, so I trust the fix addresses the
class of bug and not one screenshot.

**Acceptance**: `specs/064-arrow-annotation-label-de-overlap/findings.md`
reproduces the symptom, classifies the cause per FR-001/FR-002, and points at
the owner the fix lands in.

### US3: The regression cannot silently return

As a maintainer, a repository-owned test fails if arrow labels start overlapping
again on the protected fixture.

**Acceptance**: a repo-owned regression asserts non-overlapping arrow label
bounds (or the corrected lifecycle behavior) on the reproducing fixture.

## Success criteria

- **SC-001**: `findings.md` reproduces the stacked-label symptom on a named
  fixture and classifies the cause (geometric / stale-render / both) with
  file+symbol references and reproduction steps.
- **SC-002**: A repo-owned test proves the fix: for the reproducing input, no two
  arrow annotation labels have overlapping bounds (geometric fix), or stale
  labels are cleared across the engine/option switch (lifecycle fix).
- **SC-003**: A repo-owned test proves determinism/no-regression: repeated
  relayout of the same input yields identical label placement, and a
  non-colliding single arrow keeps its midpoint+`labelGap` anchor.
- **SC-004**: A real-gesture or DOM-contract proof shows the reported trigger
  (node placement → network simplex, and an engine switch and back) no longer
  leaves labels stacked.
- **SC-005**: `npm --prefix packages/layout-engine test`,
  `npm --prefix apps/preview test`, and `node scripts/check_no_new_python.mjs`
  pass.

## Risks

- The bug has been declared fixed before while surviving. FR-001/FR-002 force a
  written, referenced root cause so the fix targets the class, not one example.
- Geometric de-overlap can become non-deterministic or oscillate across
  relayouts. FR-003 requires order-stable, deterministic placement.
- The real cause may be a stale-render lifecycle issue owned by spec 071; do not
  bolt a geometric pass onto a lifecycle bug. FR-002 gates this.
- Label bounds depend on measured text; using a fixed-size guess (FR-005
  forbids) would reintroduce overlap at other font sizes.
