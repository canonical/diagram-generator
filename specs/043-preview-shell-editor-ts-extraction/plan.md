# Implementation Plan: Preview shell editor TypeScript extraction

**Branch**: `feat/043-preview-shell-editor-ts-extraction` | **Date**: 2026-06-14 | **Spec**: [spec.md](spec.md)

Execution guardrail: [execution.md](execution.md)

## Goal

Finish the remaining `editor.js` decomposition work in bounded, cold-start-friendly slices so the preview shell stops using one 6k-line JS file as its default integration surface, the standalone repo becomes leaner and stabler to work in, and the shell can absorb many more engines without centralizing them in another monolith.

## Design

### 1. Stay standalone-first and preserve spec 038 seams

- Treat design-foundry relocation as a far-goal constraint, not the near-term workstream.
- Do not introduce new cross-repo coupling or direct design-foundry dependencies in this extraction.
- Preserve the spec 038 seam work already present in `operator-autolayout/facade`, `render-ir`, `text-adapter/shape-compatible`, and `public-api-contract`.

### 2. Treat spec 026 as baseline, not current execution authority

- Keep the spec 026 boundary work as historical context only.
- Use this package, especially `boundaries.md`, as the active guide for the remaining extraction work.
- Refresh the active shell-boundary notes when the first slice lands so later sessions do not need to reopen archive 026 first.

### 3. Make the browser-side TypeScript landing contract explicit

- Shared browser-consumed logic lands under `packages/layout-engine/src/preview-shell/`.
- Browser-facing exports route through `packages/layout-engine/src/browser-entry.ts`.
- After changing browser exports or browser-consumed TS modules, run `npm --prefix packages/layout-engine run build:browser`.
- Do not count extraction as complete if the logic still effectively lives in ad hoc legacy JS.

### 4. Prioritize the highest-regression editor responsibilities first

Extraction order should favor the areas that currently create the most cross-cutting risk:

1. inspector view-model / field resolution
2. inspector DOM rendering and dispatch
3. selection + interaction state
4. pointer drag / resize / nudge controllers
5. grid control view-model + update dispatch
6. shell application coordinator cleanup

This order reduces the chance that every future ELK, force, sequence, or new-engine bugfix still has to thread through `editor.js`.

### 5. Split logic ownership from DOM ownership

- Move data shaping, state transitions, and dispatch logic into TypeScript modules first.
- Allow temporary JS adapters for DOM event hookup while the page still loads browser scripts directly.
- Avoid counting “moved helper functions” as a successful slice unless the ownership boundary actually changes.

### 6. Keep engine lanes outside the shared shell core

- ELK, force, sequence, and future lanes should continue to integrate through the preview-engine contract, engine-owned browser scripts, and TypeScript-owned registries.
- This spec is not the place to add more engine-specific shell branching.
- If an engine slice uncovers missing shell hooks, add a generic hook, typed boundary, or registry entry rather than another per-engine branch in `editor.js`.
- Measure success partly by whether new lanes can be added without reopening the shell monolith.

### 7. Make cold-start continuation explicit

Each slice should leave behind:

- one updated boundary note in `specs/043-preview-shell-editor-ts-extraction/boundaries.md`
- one targeted validation path
- one narrow list of remaining responsibilities still owned by `editor.js`

That makes future sessions additive instead of rediscovery-heavy.

## Proposed module targets

These names are directional; exact filenames can adapt to the existing preview-shell layout.

- `packages/layout-engine/src/preview-shell/inspector-*`
  - inspector view-models
  - field grouping / visibility rules
  - multi-select value resolution
- `packages/layout-engine/src/preview-shell/interaction-*`
  - selection state
  - drag/resize/nudge state machines
  - keyboard dispatch that is not DOM-trivial
- `packages/layout-engine/src/preview-shell/grid-*`
  - grid control state resolution
  - grid override dispatch helpers
- `packages/layout-engine/src/preview-shell/app-*`
  - shared bootstrap/coordinator state
  - generic shell hooks used across engines
- `scripts/preview/editor.js`
  - thin DOM coordinator
  - bootstrap wiring
  - event hookups that still require direct browser globals during transition

## Slice plan

### Slice A - Refresh the active shell boundary map

- Produce a current editor responsibility map from the live code, not from archive 026 assumptions alone.
- Record which responsibilities remain in `editor.js`, which already moved, and which will move next in `boundaries.md`.
- Keep the map short enough for cold starts.

### Slice B - Extract inspector view-model logic to TS

- Move selection-derived inspector state, field visibility, and merge logic into TypeScript.
- Keep the initial DOM rendering surface thin if needed.
- Add targeted tests for field resolution and multi-select behavior where practical.

### Slice C - Extract interaction state and controller logic

- Move selection state transitions, drag/resize mode transitions, and nudge/keyboard rules into TS-owned modules.
- Keep direct DOM pointer event hookup shallow in JS until a later pass if necessary.
- Add targeted tests for the extracted interaction state transitions plus one focused controller/DOM/browser regression path.

### Slice D - Extract grid control state resolution

- Move grid-control value shaping and update dispatch out of `editor.js`.
- Keep only DOM binding and widget hookup in the shell if required.
- Validate against the existing preview persistence path and relayout path.

### Slice E - Shrink bootstrap and retire obsolete inline helpers

- Reassess what remains in `editor.js`.
- Remove stale compatibility helpers and redundant state mirrors introduced before the TS slices existed.
- Normalize shared shell hooks so future engine lanes do not need bespoke `editor.js` wiring.
- Update the active boundary doc and any shell tests again.

## Files

- `scripts/preview/editor.js`
- `scripts/preview/component-model.js`
- `scripts/preview/layout-bridge.js`
- `scripts/preview/viewer-unified.html`
- `packages/layout-engine/src/preview-shell/`
- `packages/layout-engine/src/browser-entry.ts`
- `packages/layout-engine/src/index.ts`
- `packages/layout-engine/tests/*.test.ts`
- `docs/agent-index.md`
- `specs/043-preview-shell-editor-ts-extraction/*`
- `specs/043-preview-shell-editor-ts-extraction/boundaries.md`

## Validation

Minimum per-slice validation:

- targeted `packages/layout-engine` tests for the extracted TS modules
- `npm --prefix packages/layout-engine run build:browser` after changing browser exports
- `npm --prefix packages/layout-engine test`
- `npm --prefix apps/preview test`
- `node scripts/check_no_new_python.mjs`

Recommended targeted checks by slice:

- inspector slices: existing preview persistence tests plus any extracted TS unit tests
- interaction slices: extracted TS controller tests plus one focused preview-shell DOM/browser regression path
- boundary updates: narrow grep/assertion checks that new business logic is not being re-added to `editor.js`

## Risks

- The page still loads legacy browser scripts directly, so some transitional JS glue is unavoidable.
- Interaction code is tightly coupled to DOM hit-testing and SVG patch timing; moving it without explicit state boundaries can create regressions that look random.
- If slices extract only helpers and not ownership, the repo will pay migration cost without actually shrinking the monolith risk.
- `layout-bridge.js` remains large; later sessions may be tempted to solve editor problems by pushing more code into another trap file instead of into TS-owned modules.
- Without an explicit hook/registry contract, `editor.js` can shrink in line count while still remaining the real integration bottleneck for future engines.
