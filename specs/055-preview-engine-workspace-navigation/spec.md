# Spec 055: Preview Engine Workspace Navigation

**Feature Branch**: `feat/055-preview-engine-workspace-navigation`  
**Status**: Closeout Ready  
**Created**: 2026-06-27

## Problem

The preview shell exposes layout-engine switching as a thin dropdown with weak
navigation semantics and unclear compatibility boundaries.

Inbox reports show the same structural problem from several angles:

- some examples expose engines that appear technically selectable but are poor
  fits for the current document or styling surface
- users cannot move between compatible engines quickly the way they can move
  between examples
- engine-specific chrome can remain visible in a disabled state instead of
  disappearing cleanly when the active engine changes
- reopening a document does not have an explicit contract for which engine and
  unsaved engine-local state should come back
- non-frame routes such as sequence examples do not present engine identity
  consistently

This needs an explicit workspace model, not more ad hoc switcher glue.

## Goals

- Replace the one-off engine switcher model with a typed engine workspace model.
- Show only engines that are actually compatible with the active document.
- Add fast engine navigation affordances: prev/next controls and a compatible
  engine tab rail.
- Define engine-switch session semantics clearly:
  - reopening loads the last persisted engine
  - switching engines without saving does not silently rewrite YAML
  - unsaved state is preserved per engine tab for the current browser session
- Hide engine-specific chrome when the active engine does not own it.
- Show active engine identity consistently across frame and non-frame preview
  routes.

## Non-goals

- No addition of new layout engines.
- No reopening of spec 046 by widening legacy JS ownership.
- No fixture-specific compatibility allowlists.
- No persistence-schema redesign beyond what engine switching needs.

## Status Notes

- 2026-06-27: T000 inventoried the current engine-workspace owner chain in
  [`engine-workspace-flow.md`](./engine-workspace-flow.md). The active path is:
  frame-YAML handler -> preview-engine registry compatibility -> preview-host
  viewer context -> preview-shell panel registry -> legacy `engine-switcher.js`
  save/reload glue.
- 2026-06-27: T001 recorded the current failure matrix in
  [`engine-workspace-flow.md`](./engine-workspace-flow.md). The current baseline
  confirms three gaps before implementation work:
  `support-engineering-flow` still offers `elk-rectpacking` because the registry
  is the only compatibility filter, `preview-smoke` is a valid multi-engine
  frame baseline but still uses dropdown-only navigation, and
  `service-handshake-sequence` has a compatible `sequence` engine with no visible
  engine-identity surface because the switcher is frame-only and the output
  header remains static.
- 2026-06-27: T010/T011 introduced a typed engine-workspace owner in
  `packages/layout-engine/src/preview-shell/preview-engine-workspace.ts`.
  Preview-shell and preview-host callers now derive active engine, compatible
  engine ids, persisted reopen defaults, invalid persisted-engine state, and
  per-engine unsaved session state from the same TypeScript model.
- 2026-06-27: T020/T021/T022 moved engine-workspace chrome into
  `packages/layout-engine/src/preview-shell/preview-engine-workspace-chrome.ts`
  and reduced `scripts/preview/engine-switcher.js` to a thin bootstrap wrapper.
  The output header now exposes active-engine identity plus compatible-engine
  prev/next and tab-rail controls, while the preview shell hides inactive
  engine chrome and still shows engine identity for sequence documents.
- 2026-06-27: T030 validation is green. `npm --prefix packages/layout-engine test`,
  `npm --prefix apps/preview test`, and `node scripts/check_no_new_python.mjs`
  all pass with the typed engine-workspace model and chrome wired through the
  preview host.
- 2026-06-27: Review follow-up T031-T033 wired the live browser path back into
  the typed workspace model. Engine tab changes now stay browser-local until
  Save, the save path persists the active workspace engine instead of rewriting
  YAML on tab click, runtime panel-visibility sync reads host-provided
  `document_kind` / active-engine config instead of a hard-coded frame default,
  and validation bootstrap now prebuilds the graph-layout deps plus the
  layout-engine node/browser artifacts before the advertised test commands run.

## Grouped Inbox Notes

- `support-engineering-flow` exposes `elk-rectpacking` even though the result
  appears structurally wrong for the example.
- Users want prev/next affordances and a compatible-engine tab strip.
- Save/reopen semantics across engine tabs are currently undefined.
- Engine-specific controls are still visible disabled instead of hidden.
- `service-handshake-sequence` does not show an engine identity.

## Functional Requirements

- **FR-001**: The preview shell must compute a typed compatible-engine set for
  the active document and render engine navigation from that set only.
- **FR-002**: The engine workspace must expose prev/next controls with the same
  edge-disabled behavior used by the example picker.
- **FR-003**: The engine workspace must expose a compatible-engine tab rail in
  the output header or equivalent stable shell region.
- **FR-004**: Switching engine tabs without saving must preserve unsaved
  per-engine editor state for the current browser session.
- **FR-005**: Reloading or reopening a document must default to the last
  persisted engine, not the last merely-viewed unsaved tab.
- **FR-006**: Saving from a different engine tab must persist that engine as the
  new reopen default.
- **FR-007**: Engine-specific chrome must be hidden and unfocusable when the
  active engine does not own the relevant sidebar section or control family.
- **FR-008**: Active engine identity must be visible for sequence and other
  non-frame document kinds when an engine concept applies.
- **FR-009**: The implementation must remain TypeScript-owned in preview-shell
  and preview-engine owners.

## Success Criteria

- **SC-001**: Focused tests prove only compatible engines appear for
  representative v3, ELK, Dagre, and sequence documents.
- **SC-002**: Tests prove unsaved state is preserved per engine tab and the last
  persisted engine still controls reopen default.
- **SC-003**: Tests prove inactive engine chrome is hidden, not merely disabled.
- **SC-004**: `npm --prefix packages/layout-engine test`,
  `npm --prefix apps/preview test`, and
  `node scripts/check_no_new_python.mjs` pass.

## Dependencies

- Spec 051 for broader contextual aside cleanup.
- Spec 057 for compatibility/fidelity rules that decide which engines are safe
  to expose here.
