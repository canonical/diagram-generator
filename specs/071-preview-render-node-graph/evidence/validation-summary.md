# Validation summary

Spec 071 T050 validation run on `feat/071-preview-render-node-graph`.

## Commands

- `npm --prefix packages/layout-engine run build:browser`
  Result: pass
- `npm --prefix packages/layout-engine test`
  Result: pass (`157` files, `953` tests)
- `npm --prefix apps/preview test`
  Result: pass (`156` tests, including the real-browser repaint/canvas-parity regressions)
- `node scripts/check-browser-bundle-fresh.mjs`
  Result: pass
- `node scripts/check-preview-shell-size-budgets.mjs`
  Result: pass
- `node scripts/check_no_new_python.mjs`
  Result: pass

## Environment note

The worktree initially had no installed `node_modules`, so validation required
`npm ci` in the root, `packages/layout-engine`, `packages/graph-layout-core`,
`packages/graph-layout-dagre`, `packages/graph-layout-elk`, and `apps/preview`
before the declared command set could run successfully.
