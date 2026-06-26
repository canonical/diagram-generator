# Spec 053: Preview Editor Post-Refactor Correctness

**Feature Branch**: `feat/053-preview-editor-post-refactor-correctness`
**Status**: Draft
**Created**: 2026-06-26
**Owner doc**: this file + `tasks.md` + `preview-editor-post-refactor-flow.md`

## 1. Problem

The preview editor now has typed owners for inspector mutation, engine
compatibility, sidebar visibility, and per-engine controls. The visible editor
state has not fully caught up with that refactor.

Inbox triage on 2026-06-26 produced five symptoms:

| Symptom | Evidence | User impact |
|---|---|---|
| Parent alignment changes in the sidebar do not reliably affect layout. | `evidence/alignment-left.png`, `evidence/alignment-bottom.png`, `scripts/diagrams/frames/test-alignment-grid.yaml` | Users can click left/bottom alignment and see stale layout until reload, or no visible effect. |
| `/view/v3:test-deep-nesting` shows an empty layout-engine field although it is v3. | `evidence/v3-engine-field-empty.png` | The editor does not communicate the active engine truthfully. |
| `/view/v3:tiered-network-architecture.author-v1` lists incompatible new engines. | `evidence/incompatible-engines-listed.png` | Users can choose engines that should be rejected by compatibility rules. |
| Non-layered engine selections still show only ELK layered options, and those options do not affect the selected engine. | `evidence/wrong-engine-controls.png` | Multi-engine onboarding exists, but the UI still behaves partly like a single ELK-layered panel. |
| Switching v3 horizontal/vertical direction leaves the page container or canvas size stale. | `evidence/v3-direction-stage-stale.png` | The canvas can stop matching the relaid-out page after a direction change. |

These are product bugs, not new architecture work. Fixes should remain in
`packages/layout-engine/src/preview-shell/`, `packages/layout-engine/src/preview-engine/`,
and `apps/preview/src/preview-host/`, with only tiny browser-entry delegation if
needed.

## 2. Goal

Restore the post-refactor editor UI contract:

1. Alignment controls apply immediately, rerender the selected frame, and
   persist/reload through YAML for fixed-size parent/frame cases.
2. v3 direction changes rerender the page and resize the stage/canvas to the new
   layout bounds.
3. The engine switcher always displays the active layout engine, including
   implicit `v3` when no `meta.layout_engine` is authored.
4. Compatible engine lists are derived from the same registry compatibility logic
   used by save/reload, and incompatible engines are not selectable.
5. Per-engine controls render from the active manifest's `controlSpecs` and save
   to that engine's declared `persistNamespace`.

## 3. Non-Goals

- No new layout engines.
- No right-aside redesign beyond correcting stale or misleading controls.
- No broad CSS restyling.
- No new behavior-heavy ownership in `scripts/preview/*.js`.
- No frame YAML schema changes except minimal fixtures needed for reproduction.

## 4. Reference Files

| Area | Files |
|---|---|
| Alignment actions | `packages/layout-engine/src/preview-shell/app-inspector-mutation-host.ts`, `app-inspector-selection-runtime.ts`, `frame-prop-actions.ts` |
| Alignment panels | `packages/layout-engine/src/preview-shell/inspector-single-panel.ts`, `inspector-multi-panel.ts`, `inspector-single-options.ts`, `inspector-multi-options.ts` |
| Relayout/stage sizing | `packages/layout-engine/src/preview-shell/app-relayout.ts`, `app-frame-svg.ts`, `app-stage-svg.ts`, `app-shell-resize.ts` |
| Engine registry | `packages/layout-engine/src/preview-engine/registry.ts`, `types.ts`, `builtins.ts` |
| Engine UI context | `packages/layout-engine/src/preview-shell/preview-ui-context.ts`, `app-shell-panels.ts` |
| Engine controls | `packages/layout-engine/src/preview-engine/elk-layout-controls.ts`, `elk-shell-controller.ts`, `dagre-controls.ts`, `scripts/preview/graph-layout-controls.js` |
| Preview host | `apps/preview/src/preview-host/frame-documents.ts`, `builtin-autolayout-host.ts`, `frame-document-actions.ts` |
| Tests | `apps/preview/src/persistence/preview-host-contract.test.ts`, `engine-switcher.test.ts`, `preview-engine-controller-contract.test.ts`, `editor-frame-align.test.ts`, `packages/layout-engine/tests/preview-ui-context.test.ts` |

## 5. Requirements

- **FR-001**: Clicking a single-frame alignment button must update the selected
  frame's effective align value, rerender the SVG in the same session, update
  the inspector active state, and save a canonical `align` override when saved.
- **FR-002**: Clicking bottom/left/center/right alignment for a fixed-size parent
  with a smaller child must visibly reposition the child after relayout, without
  requiring a manual page reload.
- **FR-003**: Multi-selection alignment controls must continue to align selected
  frame bounds, while the nine-point parent alignment widget must continue to set
  the selected frame's own `align` property.
- **FR-004**: Changing v3 direction between horizontal and vertical must relayout
  the tree and resize the page container/stage/canvas to the new bounds.
- **FR-005**: A v3 frame document with no authored `meta.layout_engine` must
  expose `layout_engine: "v3"` in `window.__DG_CONFIG` and render the engine UI
  as v3, not blank.
- **FR-006**: The engine switcher must list only engines for which
  `evaluatePreviewEngineCompatibility()` returns compatible for the current
  preview document kind and frame summary.
- **FR-007**: If an authored `meta.layout_engine` is incompatible, the editor
  must show it as invalid/repairable without silently treating every registered
  engine as compatible.
- **FR-008**: ELK-family engines must render the ELK layout section using the
  active engine's `controlSpecs`, not hard-coded `elk-layered` controls.
- **FR-009**: Dagre must render the generic graph-layout section with
  `meta.dagre` controls, and ELK-only controls must be hidden and inert.
- **FR-010**: Engine control saves must write only supported namespaces and keys
  from the active manifest.

## 6. Success Criteria

- **SC-001**: A focused alignment test proves `test-alignment-grid` can move a
  child left and bottom through the sidebar action path, then reload saved YAML
  and preserve the effective alignment.
- **SC-002**: A focused v3 direction test proves horizontal/vertical switching
  changes the rendered layout bounds and stage/canvas size in the same session.
- **SC-003**: Preview host tests prove `test-deep-nesting` resolves and displays
  active engine `v3` when no explicit `meta.layout_engine` exists.
- **SC-004**: Preview host tests prove `tiered-network-architecture.author-v1`
  does not list incompatible graph engines when its frame summary fails their
  requirements.
- **SC-005**: DOM/controller tests prove `elk-force`, `elk-stress`, `elk-mrtree`,
  `elk-radial`, and `elk-rectpacking` each render their own ELK control set,
  while `dagre` renders graph-layout controls.
- **SC-006**: Save-contract tests prove an ELK control edit writes supported
  `meta.elk` keys and a Dagre edit writes supported `meta.dagre` keys.
- **SC-007**: Closeout validation passes:
  `npm --prefix packages/layout-engine test`;
  `npm --prefix apps/preview test`;
  `npm --prefix packages/layout-engine run build:browser`;
  `node scripts/check-browser-bundle-fresh.mjs`;
  `node scripts/check_no_new_python.mjs`.

## 7. Notes

- Screenshot evidence was moved from repo-root `image*.png` files into this
  spec's `evidence/` directory during inbox triage.
- Local dirty frame YAML files are reproduction aids. Read them before editing
  and keep fixture diffs minimal.
