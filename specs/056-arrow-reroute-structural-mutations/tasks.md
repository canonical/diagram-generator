# Tasks: Spec 056 Arrow Reroute Structural Mutations

**Input**: `specs/056-arrow-reroute-structural-mutations/spec.md`  
**Branch**: `feat/056-arrow-reroute-structural-mutations`

## Phase 0: Reproduce and Map

- [x] **T000** Reproduce the reported direction-change and resize arrow failures.
      **Verify**: capture the exact failing mutation path and owner list.

- [x] **T001** Map reroute invalidation ownership.
      **Do**: trace the mutation path through preview-shell interaction,
      relayout, rerender, routing, and persistence owners.
      **Verify**: bounded owner map exists before code changes.

## Phase 1: Typed Reroute Invalidation

- [x] **T010** Define a typed reroute invalidation trigger set.
      **Verify**: `npm --prefix packages/layout-engine test`

- [x] **T011** Route page-direction and resize edits through that trigger set.
      **Verify**: focused runtime tests.

## Phase 2: Persistence and Reload

- [x] **T020** Add persist->reload coverage for route-bearing structural edits.
      **Verify**: `npm --prefix apps/preview test`

- [x] **T021** Confirm authored arrow identity survives reroute-bearing edits.
      **Verify**: focused routing/persistence tests.

## Phase 3: Validation

- [x] **T030** Full validation.
      **Verify**:
      `npm --prefix packages/layout-engine test`;
      `npm --prefix apps/preview test`;
      `node scripts/check_no_new_python.mjs`
