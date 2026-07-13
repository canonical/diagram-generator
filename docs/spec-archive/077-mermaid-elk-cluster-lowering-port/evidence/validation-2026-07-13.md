# Spec 077 validation — 2026-07-13

The post-rebase focused TLS and portability checks are green:

- `npm --prefix packages/graph-layout-elk test`: **74/74**.
- `npm --prefix packages/layout-engine test -- tests/elk-cluster-portability.test.ts tests/elk-layout-architecture.test.ts tests/elk-thin-style.test.ts tests/elk-layout.test.ts`: **24/24**.
- `node --import tsx --test src/persistence/tls-render-regression.test.ts src/persistence/tls-browser-parity-regression.test.ts` from `apps/preview`: **2/2**.
- `node scripts/check-browser-bundle-fresh.mjs`: pass.
- `node scripts/check_no_new_python.mjs`: pass.
- `node scripts/check-preview-shell-size-budgets.mjs`: pass.

The draw.io reference mismatch was resolved on 2026-07-13. The committed
reference had captured an older layout even though its YAML selected ELK; it was
regenerated from the current deterministic exporter.

- `npm --prefix packages/layout-engine test`: **1024/1024**.

## Closeout rerun

The complete required set passed after rebuilding the browser bundle:

- `npm --prefix packages/graph-layout-elk test`: **74/74**.
- `npm --prefix packages/layout-engine test`: **1024/1024**.
- `npm --prefix apps/preview test`: pass.
- `npm --prefix apps/preview test -- editor-live-repaint-regression.test.ts`:
  pass. The earlier failure was against outdated built browser code.
- `npm --prefix packages/layout-engine run build:browser`: pass.
- `node scripts/check-browser-bundle-fresh.mjs`: pass.
- `node scripts/check_no_new_python.mjs`: pass.
- `node scripts/check-preview-shell-size-budgets.mjs`: pass.

The unrelated root PNG artifacts remain preserved in the named pre-rebase stash
and are not part of the TLS branch.
