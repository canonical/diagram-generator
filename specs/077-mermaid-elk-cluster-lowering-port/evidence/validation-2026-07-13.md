# Spec 077 validation — 2026-07-13

The post-rebase focused TLS and portability checks are green:

- `npm --prefix packages/graph-layout-elk test`: **74/74**.
- `npm --prefix packages/layout-engine test -- tests/elk-cluster-portability.test.ts tests/elk-layout-architecture.test.ts tests/elk-thin-style.test.ts tests/elk-layout.test.ts`: **24/24**.
- `node --import tsx --test src/persistence/tls-render-regression.test.ts src/persistence/tls-browser-parity-regression.test.ts` from `apps/preview`: **2/2**.
- `node scripts/check-browser-bundle-fresh.mjs`: pass.
- `node scripts/check_no_new_python.mjs`: pass.
- `node scripts/check-preview-shell-size-budgets.mjs`: pass.

The required full suites still have unrelated baseline failures:

- `npm --prefix packages/layout-engine test`: **1023/1024**; the only failure is
  `export-frame-drawio.test.ts` for the already-unrelated
  `specs/077-yaml-drawio-export/golden/ai-infra-production-contract.drawio`.
- `npm --prefix apps/preview test`: **167/168**; the only failure is the existing
  `editor-live-repaint-regression.test.ts` default ELK-options assertion, where
  two blank fields differ (`elk.aspectRatio` and
  `elk.layered.spacing.baseValue`).

The unrelated draw.io edits and root PNG artifacts remain preserved in the named
pre-rebase stash and are not part of the TLS branch.
