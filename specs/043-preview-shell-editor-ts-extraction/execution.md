# Execution contract

Use this file to keep spec 043 on track across cold-start sessions. It is the anti-drift companion to `spec.md`, `plan.md`, and `boundaries.md`.

## Primary objective

Replace `scripts/preview/editor.js` as the default authority for shared preview behavior.

Near-term success means:

- the standalone repo remains lean and stable to use
- shared shell behavior becomes easier to change without regressions
- adding more engines gets cheaper because shared-shell coupling goes down

Long-term success is only a guardrail here:

- preserve the spec 038 seams so later relocation stays possible
- do not actively optimize this work around cross-repo migration

## Non-negotiable rules

1. Shared browser logic lands in `packages/layout-engine/src/preview-shell/`.
2. Browser-facing exports route through `packages/layout-engine/src/browser-entry.ts`.
3. `scripts/preview/editor.js` may coordinate DOM and event hookup, but it should not remain the owner of view-model rules, interaction state, or engine integration logic.
4. Do not move behavior into another trap file such as `layout-bridge.js` just to shrink `editor.js`.
5. Do not add new direct dependencies on `design-foundry`.
6. Do not pay for broad temporary test suites. Add the narrowest durable test that proves the extracted contract.

## Slice order

### Slice 1: Inspector view-model extraction

Move first:

- primary-selection resolution
- multi-selection action grouping
- selection-derived same-parent / unsupported-state decisions
- inferred distribution gap rules
- top-level multi-selection inspector view-model flags

Done means:

- these decisions live in TS under `preview-shell/`
- `editor.js` only maps live model data into the TS helper inputs and renders the returned state
- one targeted TS unit test file covers the extracted rules

Do not move yet:

- inspector HTML string assembly
- inline event handlers
- style picker rendering
- single-selection control rendering

### Slice 2: Inspector field/state resolution

Move next:

- single-selection inspector summary flags
- sizing/autolayout display-state resolution
- mixed-value resolution for multi-select fields

Done means:

- inspector rendering consumes typed resolved state instead of reading raw model/override data inline
- renderer branches get shorter without changing the live shell contract

### Slice 3: Interaction state and controllers

Move next:

- selection-depth transitions
- drag/resize/nudge controller state
- non-trivial keyboard dispatch

Done means:

- DOM events stay in JS if needed
- state transitions and controller decisions live in TS
- one focused controller or browser regression path exists per landed interaction slice

### Slice 4: Grid controls

Move next:

- grid control value resolution
- grid override dispatch rules
- local overlay recompute coordination that is not DOM-trivial

Done means:

- grid form rendering reads a typed state object
- persistence and relayout hooks stop being inline form logic

### Slice 5: Bootstrap normalization

Move last:

- `loadSVG()` coordination leftovers
- generic shell hooks used by multiple engines
- stale compatibility helpers

Done means:

- `editor.js` reads like bootstrap wiring, not application logic
- new engines can integrate through typed registries or hook contracts

## Review checklist for every slice

- Did shared logic move to TS, or did we only move helper lines around?
- Did we reduce hidden global coupling?
- Did we keep the change inside one bounded responsibility?
- Did we avoid pushing logic into `layout-bridge.js`?
- Did we avoid broad temporary tests?
- If browser exports changed, did we rebuild with `npm --prefix packages/layout-engine run build:browser`?

## Current recommended next step

Current next step:

- keep inspector rendering in `editor.js` for now
- keep pushing interaction state out first, because that is now shrinking `editor.js` faster than inspector HTML work
- do not start a full inspector renderer rewrite

The current highest-value move is:

1. finish the remaining drag / resize / nudge controller state, especially keyboard dispatch and resize persist/commit cleanup
2. add one focused shell-level regression path for the landed interaction slices if an existing browser/DOM hook can cover it cheaply
3. only return to inspector field formatting where it removes real branching rather than relocating markup
