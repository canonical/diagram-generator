# Tasks: Spec 058 Layer Tree And Inspector Selection Ergonomics

**Input**: `specs/058-layer-tree-inspector-selection-ergonomics/spec.md`  
**Branch**: `feat/058-layer-tree-inspector-selection-ergonomics`

## Phase 0: Reproduce

- [ ] **T000** Reproduce the tree-keyboard and variant-display regressions.
      **Verify**: capture the current typed owner path for each failure.

## Phase 1: Typed Owner Fixes

- [ ] **T010** Restore typed layer-tree keyboard traversal behavior.
      **Verify**: focused tree-selection tests.

- [ ] **T011** Restore effective variant/style resolution for supported child-box
      selections.
      **Verify**: focused inspector tests.

## Phase 2: Validation

- [ ] **T020** Full validation.
      **Verify**:
      `npm --prefix packages/layout-engine test`;
      `npm --prefix apps/preview test`;
      `node scripts/check_no_new_python.mjs`
