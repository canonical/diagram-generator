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
  graph immediately without a full page reload.
- **FR-004**: Engine-specific right-aside panels must resync to the newly active
  engine after the rerender.
- **FR-005**: Save must persist the currently active tab’s engine id through the
  typed save path, and reopen must restore the persisted engine.
- **FR-006**: Sequence documents and single-engine cases must not render a dead
  or misleading tab rail.

## Closeout Gate

Do not mark this spec complete until all of the following are true:

1. Repo tests covering host HTML placement, workspace chrome behavior,
   rerender-on-switch, and save/reopen semantics are green.
2. A real browser verification proves the graph itself changes when a tab is
   clicked on at least one multi-engine frame fixture.
3. The browser verification uses Playwright or an equivalent scripted browser
   assertion, not a visual guess or DOM-only check.

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
