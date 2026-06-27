# Tasks: Spec 054 Preview Persistence Model TypeScript Migration

**Input**: `specs/054-preview-persistence-model-typescript/spec.md`  
**Branch**: `feat/054-preview-persistence-model-typescript`

## Phase 0: Bound the Migration

- [x] **T000** Confirm branch and local-state scope.
      **Do**: verify the active branch and list pre-existing dirty files that are
      not part of this spec package.
      **Verify**: `git branch --show-current`; `git status --short`
      **Accept**: branch is `feat/054-preview-persistence-model-typescript` and
      non-spec dirt is clearly bounded before implementation starts.

- [x] **T001** Inventory the current preview save path.
      **Do**: map the cross-layer path from preview mutations to
      `component-model.js::toOverridePayload()`, `app-save-payload.ts`,
      `app-save-client.ts`, and `frame-diagram.ts`.
      **Files**: `scripts/preview/component-model.js`,
      `packages/layout-engine/src/preview-shell/app-save-payload.ts`,
      `packages/layout-engine/src/preview-shell/app-save-client.ts`,
      `apps/preview/src/persistence/frame-diagram.ts`
      **Verify**: capture the bounded owner list and contract seams in the spec
      or implementation notes before moving state.
      **Accept**: the migration has a single named TS owner target and no
      ambiguous JS-vs-TS persistence ownership remains.

## Phase 1: Typed Override Model Design

- [x] **T010** Define the typed preview override model.
      **Do**: introduce a TS owner that models frame, arrow, grid, removal, and
      engine-layout override state explicitly instead of a loose JS bag.
      **Files**: `packages/layout-engine/src/preview-shell/*override*`,
      `preview-shell-state-barrel.ts`, `index.ts`
      **Verify**: `npm --prefix packages/layout-engine test`
      **Accept**: the model has typed entry shapes and a canonical emitted
      payload contract.

- [ ] **T011** Link emitted payload keys to the persistence allowlists.
      **Do**: ensure the typed owner imports and uses
      `frame-override-manifest.ts`, namespace persistence contracts, and arrow
      identity helpers rather than re-declaring save keys.
      **Files**: `frame-override-manifest.ts`,
      `frame-engine-layout-namespaces.ts`,
      `preview-arrow-component-ids.ts`
      **Verify**: `npm --prefix packages/layout-engine test`;
      `npm --prefix apps/preview test`
      **Accept**: canonical emitted keys are sourced from the same TS contract
      owners the server path uses.

## Phase 2: Replace JS-Owned Payload Assembly

- [x] **T020** Delegate frame payload assembly out of `component-model.js`.
      **Do**: move frame payload assembly into the typed override model and
      reduce JS ownership to thin delegation.
      **Files**: `scripts/preview/component-model.js`,
      `packages/layout-engine/src/preview-shell/*override*`
      **Verify**: `npm --prefix packages/layout-engine test`
      **Accept**: frame payload emission is TS-owned and emitted payloads are
      already canonical.

- [x] **T021** Delegate arrow/grid/removal/engine-layout payload assembly out of
      JS.
      **Do**: move the remaining save-bearing payload categories behind the same
      typed owner so `toOverridePayload()` no longer owns persistence behavior.
      **Files**: `scripts/preview/component-model.js`,
      `packages/layout-engine/src/preview-shell/*override*`,
      `apps/preview/src/persistence/frame-engine-layout-namespaces.ts`
      **Verify**: `npm --prefix packages/layout-engine test`;
      `npm --prefix apps/preview test`
      **Accept**: JS no longer owns persistence branching or save-payload shape
      decisions.

- [ ] **T022** Demote `app-save-payload.ts` from converter to assertion layer.
      **Do**: keep the normalizer as a guard for impossible or legacy states,
      but remove its responsibility for routine payload conversion.
      **Files**: `app-save-payload.ts`, `app-save-client.ts`
      **Verify**: `npm --prefix packages/layout-engine test -- app-save-client.test.ts`
      **Accept**: the normalizer finds nothing to fix on the normal save path
      and only guards against bad/legacy callers.

## Phase 3: Save Round-Trip Contract Matrix

- [ ] **T030** Add round-trip coverage for canonical frame saves.
      **Do**: add or extend repo-owned tests for drag, resize, keyboard nudge,
      and multi-select drag so each asserts `persist -> reload` with canonical
      payload/YAML output.
      **Files**: `apps/preview/src/persistence/frame-diagram.test.ts`,
      `packages/layout-engine/tests/app-save-client.test.ts`
      **Verify**: `npm --prefix apps/preview test`;
      `npm --prefix packages/layout-engine test`
      **Accept**: repeated edits do not accumulate transient deltas and reload
      matches the saved canonical state.

- [ ] **T031** Add round-trip coverage for arrow/removal saves.
      **Do**: cover duplicate edges, explicit arrow ids, `arrow:<id>` branch
      attachments, waypoint saves, and removal-state save/reload behavior.
      **Files**: `frame-diagram.test.ts`,
      `preview-arrow-component-ids.test.ts`,
      `app-save-client.test.ts`
      **Verify**: `npm --prefix apps/preview test`;
      `npm --prefix packages/layout-engine test`
      **Accept**: arrow and removal workflows round-trip without client/server
      drift or reload-state loss.

## Phase 4: Documentation and Closeout Gate

- [ ] **T040** Fix agent guidance for persistence work.
      **Do**: update `docs/agent-index.md` and any related handoff text so
      `component-model.js` is marked persistence-critical and `dist/**` search
      hygiene is explicit.
      **Files**: `docs/agent-index.md`, `AGENTS.md`
      **Verify**: doc review + targeted grep for stale trap-file guidance
      **Accept**: agents are routed to the right owners and warned away from the
      persistence hotspot.

- [ ] **T041** Encode the save round-trip closeout gate.
      **Do**: update the repo’s spec guidance so persistence-touching specs
      cannot claim closeout without a repo-owned save round-trip regression.
      **Files**: `docs/specs.md`, `AGENTS.md`
      **Verify**: doc review
      **Accept**: the closeout gate is explicit and matches the failure class
      that spec 053 exposed.

- [ ] **T042** Full validation and branch closeout.
      **Verify**:
      `npm --prefix packages/layout-engine test`;
      `npm --prefix apps/preview test`;
      `npm --prefix packages/layout-engine run build:browser`;
      `node scripts/check-browser-bundle-fresh.mjs`;
      `node scripts/check_no_new_python.mjs`
      **Accept**: all commands pass before this spec can move beyond Draft.

## Closeout Notes

- This package exists to remove the save bug class at its source, not just add
  more nets over legacy JS payload assembly.
- Keep migration steps small and contract-driven: frame payloads first, then
  arrow/grid/removal/engine-layout categories, then documentation gatekeeping.
