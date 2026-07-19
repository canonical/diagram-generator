# Tasks: Spec 077 YAML frame → draw.io export

**Input**: `specs/077-yaml-drawio-export/spec.md`
**Plan**: `specs/077-yaml-drawio-export/plan.md`
**Branch**: `feat/077-yaml-drawio-export`

## Phase 1: Spec + fixtures

- [x] T001 Create spec package and index `docs/specs.md`.
- [x] T002 Copy `ai-infra-*` frame YAML fixtures from the ai-infra worktree.

## Phase 2: TypeScript export core

- [x] T010 Port draw.io style presets to `packages/layout-engine/src/drawio/style-presets.ts`.
- [x] T011 Implement `mxgraph-builder.ts` for vertex/edge XML.
- [x] T012 Implement draw.io export via display-list adapter (`drawio-render.ts` + `render-adapter/drawio.ts`).
- [x] T013 Wire `export-frame-drawio.mjs` CLI and `package.json` script.

## Phase 2b: Reuse the render contract

- [x] T014 Re-home exporter as `render-adapter/drawio.ts`; consume `emitFrameDiagramDisplayList` and map each `DisplayListItem` kind to mxCells.
- [x] T015 Honour authored padding via display-list geometry (not fixed INSET).
- [x] T016 Stack multiple text blocks at their plan Y; do not clamp block height to box.
- [x] T017 Emit overlay groups from `diagram.overlays`.
- [x] T018 Preserve elkLabels and per-edge geometry; offset parallel same-endpoint edges.
- [x] T019 Carry `strokeStyle.width`; render icon-missing placeholder rect.

## Phase 3: Layout dispatch + closeout

- [x] T023 Honour `meta.layout_engine` via shared preview-engine dispatch (`layoutFrameDiagramForExport`).
- [x] T020 Golden `.drawio` per fixture in spec package; positional + unsupported-engine assertions.
- [ ] T021 Manual open-in-draw.io for all three slugs; attach screenshots or signed note.
- [x] T022 Run FULL `npm --prefix packages/layout-engine test` + browser-bundle-fresh + preview-shell size budgets + `check_no_new_python`.
- [ ] T024 Commit `diagrams/1.input/ai-infra-*.yaml` + goldens.
- [x] T025 Rebase onto current main (post reopened-076); add export to `public-api-contract.ts` or keep off barrel.

## Phase 3b: Draw.io theme control

- [x] T026 Research diagrams.net adaptive colors, dark mode, and
  `light-dark(...)` support; record findings in `theme-findings.md`.
- [x] T027 Add a TypeScript draw.io theme owner that maps page, fill, stroke,
  text, muted labels, and arrow colors to explicit light/dark pairs.
- [x] T028 Apply theme pairs through mxGraph model attributes, style presets,
  rich-text HTML, edges, and embedded SVG icon attributes.
- [x] T029 Refresh draw.io goldens and add targeted tests for
  `adaptiveColors="none"` plus exported `light-dark(...)` values.
- [ ] T030 Manually open all three exported diagrams in diagrams.net Light,
  Dark, and Automatic modes; specifically verify embedded SVG icon behavior.
