# Spec 060: Output Pane Engine Tabs And Live Rerender

**Feature Branch**: `feat/060-output-pane-engine-tabs-rerender`  
**Status**: In Progress  
**Created**: 2026-06-28

## Problem

The current engine-workspace implementation for multi-engine frame previews does
not satisfy the intended product contract.

User reports and code inspection show three linked failures:

- engine switching chrome appears in the right aside instead of in the output
  area where the graph itself lives
- the chrome is rendered as ad hoc button rows / plain text instead of using
  baseline-foundry tab affordances
- switching the active engine updates local workspace state but does not
  reliably rerender the previewed graph, so the control can appear to work
  while the output stays stale

This is not a fixture-only issue. It is a broken ownership split between host
HTML placement, workspace chrome rendering, and the live preview rerender path.

## Goals

- Move multi-engine switching UI into the output pane header above the graph.
- Render compatible engines as real baseline-foundry tab affordances instead of
  a sidebar-local button cluster.
- Make engine tab switches rerender the active preview immediately in-browser.
- Preserve save semantics:
  - switching tabs is browser-local until Save
  - Save persists `meta.layout_engine`
  - reopening restores the persisted engine, not the last unsaved tab
- Keep single-engine and non-frame cases clean:
  - no empty tab rail
  - sequence documents remain label-only unless a true tabbed workspace exists

## Non-goals

- No broad redesign of engine compatibility heuristics beyond what is required
  to make the active tab and rerender path truthful.
- No fallback acceptance of a partially working sidebar switcher.
- No “looks correct in tests but stale in browser” closeout.

## Functional Requirements

- **FR-001**: Multi-engine frame previews must render the engine tab rail in the
  output pane header, adjacent to the active engine identity, not in the right
  aside.
- **FR-002**: The engine tab rail must use baseline-foundry tab semantics and
  active/inactive state, not plain text buttons.
- **FR-003**: Selecting a compatible engine must rerender the live previewed
  graph **with that engine actually driving layout** — not merely re-render the
  existing geometry. The chosen engine must be committed into the frame-tree the
  render path reads (`state.frameTreeJson.layoutEngine`) before render, and the
  rendered root SVG must carry `data-layout-engine` equal to the chosen engine.
  This must hold for documents with an authored `meta.layout_engine`.
- **FR-004**: Engine-specific right-aside panels must resync to the newly active
  engine after the rerender.
- **FR-005**: Save must persist the currently active tab’s engine id through the
  typed save path, and reopen must restore the persisted engine.
- **FR-006**: Sequence documents and single-engine cases must not render a dead
  or misleading tab rail.
- **FR-007**: A top-level page-direction change (autolayout horizontal↔vertical)
  must re-run layout and reroute arrows through the same engine-intent commit, so
  arrow attachments survive the change on `tiered-network-architecture`.
- **FR-008**: Chrome cleanup the author requested (INBOX): remove the stale
  `active-engine-label` "Engine: Native v3 autolayout" text and stray `elk-radial`
  tab markup; remove tab-button `margin-bottom` (use the baseline-foundry
  utility); remove the "Only engines compatible with this document are listed…"
  help paragraph; rename "Native v3 autolayout" → "Autolayout"
  (`builtins.ts:54`); keep output-pane padding when switching autolayout↔ELK.

## Root cause (verified 2026-06-28 adversarial review)

The prior closeout was false. Switching the engine tab updates
`__DG_CONFIG.layout_engine` and workspace state, then calls
`rerenderStageFromModel`. But the real render path
(`renderFreshPreviewSvg`, `app-fresh-render.ts:343`) resolves the engine from
`diagram.layoutEngine` = `state.frameTreeJson.layoutEngine`, which the switch
path **never updates**. On any document with an authored `meta.layout_engine`
(`mongo-octavia-ha`, `support-engineering-flow`, `juju-bootstrap-machines-process`)
clicking a tab cannot change the rendered engine. The earlier tests passed because
they mock `rerenderStageFromModel`, and the Playwright "proof" asserted an `svgHash`
change between two ELK engines — never engine identity, never the failing
authored-ELK → v3 case.

See `docs/spec-reviews/branch-060.md` and `docs/spec-reviews/README.md` §1.

## Closeout Gate (hardened — supersedes the previous gate)

Do not mark this spec complete until ALL are true:

1. The rendered root SVG exposes the engine it was laid out with
   (`data-layout-engine` on `#stage svg`, stamped in `renderFreshPreviewSvg`).
2. The active engine is the single source the render path reads: tab switch
   commits the chosen engine into the frame-tree the render consumes
   (`state.frameTreeJson.layoutEngine` via a typed setter), browser-local until
   Save. `__DG_CONFIG` and the render path must not be able to drift.
3. A test that runs the **real** `renderFreshPreviewSvg` (not a mock) asserts
   `data-layout-engine` equals the selected engine after a switch, on an
   **authored-engine** fixture (`mongo-octavia-ha`).
4. A Playwright self-check (per `docs/spec-reviews/README.md` §4) asserts engine
   **identity** (not hash) for authored-ELK → v3, v3 → elk-layered, and a
   sequence document (no dead rail). Script + JSON result committed under
   `evidence/`.
5. Direction-flip arrow reroute verified on `tiered-network-architecture`
   (horizontal→vertical keeps arrow attachments) — see FR-007.
6. The browser server was restarted fresh before verification (stale bootstrap
   cache invalidates any prior run).
7. Mock-only proof is not accepted for any user-visible behavior claim.

## Initial Owner Map

- Host HTML placement:
  `scripts/preview/viewer-unified.html`
- Preview host config / page assembly:
  `apps/preview/src/preview-host/builtin-autolayout-host.ts`
- Workspace state owner:
  `packages/layout-engine/src/preview-shell/preview-engine-workspace.ts`
- Workspace chrome owner:
  `packages/layout-engine/src/preview-shell/preview-engine-workspace-chrome.ts`
- Grid runtime / panel sync seam:
  `packages/layout-engine/src/preview-shell/app-grid-editor-install-unit.ts`
