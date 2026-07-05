# ELK sizing and interaction flow

## Pipeline

```text
frame YAML
  -> loadFrameYaml
  -> applyPreviewOverridesToFrameTree
  -> native semantic layout snapshot
  -> ELK graph input construction
  -> layoutLayeredForFamily
  -> apply ELK placement/routes
  -> restore authored frame semantics where required
  -> render SVG / preview patch
```

## Key Files

- `packages/layout-engine/src/elk-layout.ts`
- `packages/layout-engine/src/layout.ts`
- `packages/layout-engine/src/heading-synthesis.ts`
- `packages/layout-engine/src/preview-shell/app-relayout.ts`
- `packages/layout-engine/src/preview-shell/app-live-resize.ts`
- `packages/layout-engine/src/preview-shell/app-resize-host.ts`
- `packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts`
- `packages/graph-layout-elk/src/elk-layered.ts`
- `packages/graph-layout-elk/src/elk-param-registry.ts`

## Tests To Start With

- `packages/layout-engine/tests/elk-layout.test.ts`
- `packages/layout-engine/tests/app-live-resize.test.ts`
- `packages/layout-engine/tests/app-resize-host.test.ts`
- `packages/layout-engine/tests/heading-synthesis.test.ts`
- `packages/graph-layout-elk/tests/elk-layered.test.ts`
- `packages/graph-layout-elk/tests/elk-param-registry.test.ts`

## Known Limits

- ELK owns rank/order/routing, but repo-native semantic sizing still owns the
  author-facing Fill/Hug/Fixed contract.
- Structural carrier wrappers should be selectively flattened before ELK.
- Real compounds that are arrow endpoints should stay native ELK compounds.
- Debug visibility for authored tree vs ELK input graph must not become a
  persisted behavior toggle.
- Do not use screenshots as default validation.
