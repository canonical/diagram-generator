# Tasks: Folder Workspace Reliability

**Input**: `specs/084-folder-workspace-reliability/spec.md`  
**Plan**: `specs/084-folder-workspace-reliability/plan.md`  
**Branch**: `feat/084-folder-workspace-reliability`

## Phase 1: Reproduce and lock the regression

- [ ] T001 Record the current Chrome reproduction, exact local address, browser
      version, and visible folder-workflow DOM in
      `specs/084-folder-workspace-reliability/evidence/`.
- [ ] T002 [P] Add focused controller cases for open pending, cancellation,
      native-picker failure, and durable status transitions in
      `packages/layout-engine/src/preview-shell/local-folder-workspace.test.ts`.
- [ ] T003 [P] Add preview-host contracts for successful local-folder
      registration rendering a group before Bundled examples in
      `apps/preview/src/persistence/preview-host-contract.test.ts`.

## Phase 2: Foundational operation-state contract

- [ ] T004 Define the typed workspace operation/recovery presentation contract
      in `packages/layout-engine/src/preview-shell/local-folder-workspace.ts`.
- [ ] T005 Add stable, accessible workspace status/action hooks only in
      `scripts/preview/viewer-unified.html`; do not add behavior there.
- [ ] T006 Wire the typed operation state to the viewer hooks through
      `packages/layout-engine/src/browser-entry-preview-shell.ts` and the
      existing preview-shell bootstrap owner.

## Phase 3: User Story 1 — observable open folder (P1) 🎯 MVP

**Goal**: No Open-folder activation can silently fail.

**Independent Test**: In Chrome, trigger supported, cancelled, and rejected
picker paths and observe a durable visible result for each.

- [ ] T007 [US1] Implement pending, cancelled, unsupported, and picker-failure
      presentation in `packages/layout-engine/src/preview-shell/local-folder-workspace.ts`.
- [ ] T008 [US1] Extend controller tests for every US1 result in
      `packages/layout-engine/src/preview-shell/local-folder-workspace.test.ts`.
- [ ] T009 [US1] Build the browser bundle and verify the served `8100` asset
      exports the operation-state surface using
      `packages/layout-engine/build-browser.mjs` and
      `scripts/check-browser-bundle-fresh.mjs`.

## Phase 4: User Story 2 — immediate named sidebar group (P1)

**Goal**: Successful opening visibly proves workspace registration in Browse.

**Independent Test**: Open a valid folder and observe its named group above
Bundled examples without a manual refresh.

- [ ] T010 [US2] Make local-folder registration completion wait for/trigger the
      visible viewer navigation result in
      `packages/layout-engine/src/preview-shell/local-folder-workspace.ts`.
- [ ] T011 [US2] Preserve typed local-folder ordering and registration response
      semantics in `apps/preview/src/preview-host/builtin-host-runtime.ts` and
      `apps/preview/src/preview-host/builtin-server-routes.ts`.
- [ ] T012 [US2] Add grouped-navigation regressions in
      `apps/preview/src/persistence/preview-host-contract.test.ts` and
      `apps/preview/src/persistence/workspace-source.test.ts`.

## Phase 5: User Story 3 — restart and permission recovery (P2)

**Goal**: Recovery is adjacent, understandable, and reliable.

**Independent Test**: Restart after opening a folder, then prove granted restore
and denied/re-granted recovery both end in the named Browse group.

- [ ] T013 [US3] Implement persistent granted/denied restore and local-address
      guidance states in `packages/layout-engine/src/preview-shell/local-folder-workspace.ts`.
- [ ] T014 [US3] Add deterministic restore/reconnect contract tests in
      `packages/layout-engine/src/preview-shell/local-folder-workspace.test.ts`.
- [ ] T015 [US3] Verify a restarted host accepts the re-registration path in
      `apps/preview/src/preview-host/builtin-server-routes.ts` and its preview
      contract tests.

## Phase 6: User Story 4 — trustworthy status (P3)

**Goal**: The user can distinguish pending, success, cancellation, and failure.

**Independent Test**: Each outcome remains visible in the folder-workflow area
until a subsequent folder operation changes it.

- [ ] T016 [US4] Apply accessible status/action presentation to all workspace
      outcomes in `packages/layout-engine/src/preview-shell/local-folder-workspace.ts`.
- [ ] T017 [US4] Add keyboard and live-region contract assertions in
      `apps/preview/src/persistence/preview-host-contract.test.ts`.

## Phase 7: Native Chrome closeout

- [ ] T018 Record real Chrome evidence for native chooser open, cancellation,
      valid-folder open, Browse ordering, restart restore, revoked permission,
      re-grant, and save/reload in
      `specs/084-folder-workspace-reliability/evidence/`.
- [ ] T019 Run the full validation commands in `quickstart.md` and record
      results in the same evidence note.
- [ ] T020 Update `AGENT-INBOX.md`, `docs/specs.md`, and `TODO.md` with the
      verified outcome and commit the feature-scoped documentation together.

## Dependencies & Execution Order

- T001–T003 establish the regression contract before implementation.
- T004–T006 are foundational and block the user stories.
- US1 and US2 can proceed together after T004–T006; US3 depends on the same
  state contract and host registration path; US4 follows those outcomes.
- T018–T020 require all implementation and automated validation to be green.

## MVP

Complete T001–T009 first: an Open-folder click has a visible, trustworthy
outcome even before restart recovery polish lands.
