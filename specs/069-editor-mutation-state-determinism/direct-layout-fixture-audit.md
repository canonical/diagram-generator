# Direct Layout Fixture Audit

Spec 069 T041 audit for direct tests that read authored
`scripts/diagrams/frames/*.yaml`.

## Normalization Helper

- `packages/layout-engine/tests/helpers/frame-fixture-normalization.ts`
  provides `loadNormalizedFrameFixture(slug, { engine, engineLayout })`.
- It loads the authored fixture, serializes through the preview wire shape,
  replaces `layoutEngine`, drops legacy `elkLayout`, and replaces
  `engineLayout` with only the bucket requested by the test.
- Converted coverage:
  `packages/layout-engine/tests/app-fresh-render.test.ts` now uses the helper
  for the committed render-intent test instead of inheriting fixture engine
  metadata directly.

## Remaining Authored-Fixture Readers

- `packages/layout-engine/tests/elk-layout.test.ts`: intentional ELK direct
  layout/fidelity coverage. Tests that require a specific engine should use
  the helper when they are not explicitly asserting authored fixture metadata.
- `packages/layout-engine/tests/app-fresh-render.test.ts`: mixed direct reads;
  one engine-specific case is normalized, while authored-engine and
  incompatible-engine cases intentionally inspect source metadata.
- `packages/layout-engine/tests/preview-engine-fidelity-probes.test.ts`: engine
  offer/fidelity probes; retain authored metadata where the test is about the
  fixture, normalize if adding algorithm-specific assertions.
- `packages/layout-engine/tests/preview-engine-registry.test.ts`: registry
  compatibility/offer tests; authored metadata is part of the contract.
- `packages/layout-engine/tests/preview-engine-render.test.ts`: render-path
  tests on `support-engineering-flow`; normalize if the assertion becomes
  engine-option-specific.
- `packages/layout-engine/tests/inspector-single-options.test.ts`,
  `diagram-author-*`, `operator-autolayout-facade.test.ts`,
  `render-ir-parity.test.ts`, and `svg-golden-harness.ts`: fixture
  parser/export/operator/golden coverage; authored metadata is expected input.

## Grep Evidence

Command used:

```bash
rg "loadFrameYaml|FRAMES_DIR|scripts.*diagrams|diagrams.*frames" packages/layout-engine/tests packages/layout-engine/src -g "*.ts"
```

Conclusion: the mutable-authored-fixture risk is real but localized. New direct
layout tests that assert a specific engine or engine option state should use
`loadNormalizedFrameFixture`; tests whose purpose is authored metadata parsing,
engine offer eligibility, or golden rendering should keep direct fixture reads.
