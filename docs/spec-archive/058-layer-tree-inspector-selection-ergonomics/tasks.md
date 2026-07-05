# Tasks: Spec 058 Layer Tree And Inspector Selection Ergonomics

**Input**: `docs/spec-archive/058-layer-tree-inspector-selection-ergonomics/spec.md`  
**Branch**: `feat/058-layer-tree-inspector-selection-ergonomics`

## Phase 0: Reproduce

- [x] **T000** Reproduce the tree-keyboard and variant-display regressions.
      **Verify**: capture the current typed owner path for each failure.

## Phase 1: Typed Owner Fixes

- [x] **T010** Restore typed layer-tree keyboard traversal behavior.
      **Verify**: focused tree-selection tests and
      `docs/spec-archive/058-layer-tree-inspector-selection-ergonomics/evidence/layer-tree-inspector-browser-check.mjs`
      real-DOM `Enter` / `Shift+Enter` dispatch.

- [x] **T011** Restore effective variant/style resolution for supported child-box
      selections.
      **Verify**: focused inspector tests, including the real
      `test-deep-nesting.yaml` unstyled child-box fixture path, plus browser
      evidence that `vm_2` displays `default` instead of `Unknown variant`.

## Phase 2: Validation

- [x] **T020** Full validation.
      **Verify**:
      `npm --prefix packages/layout-engine test`;
      `npm --prefix apps/preview test`;
      `node scripts/check_no_new_python.mjs`;
      `node docs/spec-archive/058-layer-tree-inspector-selection-ergonomics/evidence/layer-tree-inspector-browser-check.mjs`
