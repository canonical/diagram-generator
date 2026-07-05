# Spec 054 post-merge evidence - `8baea34..bee91b9`

Reviewer: post-merge adversarial pass on `main` (`bee91b9`) against pre-merge
base `8baea34`. Companion summary lives in `AGENT-INBOX.md` (2026-06-27 entry).

## Scope reviewed

Full commit range `8baea34..bee91b9`:

- `6d5cca4` chore(frames): persist authored engine fixture choices
- `c10ffa1` merge feat/054-preview-persistence-model-typescript
- `bee91b9` spec: draft 055-059 follow-up packages

## Validation (all green)

| Gate | Result |
|------|--------|
| `npm --prefix packages/layout-engine test` | 143 files / 833 tests pass |
| `npm --prefix apps/preview test` | 143 tests pass, 0 fail |
| `npm --prefix packages/layout-engine run build:browser` | built + manifest emitted |
| `node scripts/check-browser-bundle-fresh.mjs` | fresh, 3/3 artifacts |
| `node scripts/check_no_new_python.mjs` | ratchet ok, 9 files scanned |

Working tree clean except untracked `image.png` (ignored per review request).

## 054 save-path correctness evidence

- `packages/layout-engine/src/preview-shell/preview-override-model.ts` is the
  single canonical payload producer (`createPreviewOverridePayload`). It:
  - drops synthetic `__body`/`__heading` ids,
  - canonicalizes transient `dx/dy/dw/dh` to `x/y/width/height` (+`position`/
    `sizing_w`/`sizing_h`) against override or node base values, rounding via
    `Math.round`,
  - filters frame vs arrow keys through `PERSIST_FRAME_KEYS` /
    `PERSIST_ARROW_KEYS` (frame-override-manifest.ts) and arrow identity through
    `isPreviewArrowComponentId`,
  - resolves engine-layout namespace via
    `resolveFrameYamlEngineLayoutNamespaceForOverrides` and filters keys via
    `filterSupportedFrameYamlEngineLayoutOverrides`,
  - emits `elk_layout_overrides` only for the default `meta.elk` namespace,
  - does **not** mutate model aliases (`layoutOverrides`/`elkLayoutOverrides`),
    verified by `preview-override-model.test.ts` (the old JS path mutated both).
- `app-save-payload.ts` is reduced to guard/normalize/validate; it re-detects
  transient keys and reports errors rather than producing payloads.
- `app-save-client.ts` calls `createPreviewOverridePayload(model)` directly and
  no longer requires `model.toOverridePayload`.
- `scripts/preview/component-model.js::toOverridePayload()` is a delegating shim
  that resolves `previewShell.bootstrap.createPreviewOverridePayload`; proven by
  `apps/preview/src/persistence/component-model-contract.test.ts`.
- `apps/preview/src/persistence/frame-engine-layout-namespaces.ts` now consumes
  the shared `frame-yaml-engine-layout-contract.ts` owners instead of a local
  `supportedSpecsByNamespace` copy.

## Round-trip coverage confirmed present

- `app-save-client.test.ts` asserts canonical drag/nudge/multi-select/resize
  overrides in the POST body (transient deltas resolved, synthetic ids stripped).
- `preview-override-model.test.ts` covers grid-key stripping, top-level removal
  collapse, generic vs legacy ELK alias precedence, and explicit non-ELK
  (`meta.dagre`) namespace routing without alias mutation.
- `frame-diagram.test.ts` retains the `persist -> reload` round-trip through
  `loadFrameYaml` + `resolvePreviewEngine`.

## Authored engine flips

| Fixture | Change | Identity re-resolves |
|---------|--------|----------------------|
| `example-platform-architecture.yaml` | `elk-layered -> v3` | yes; `preview-host-contract.test.ts` expectation updated to `v3` |
| `mongo-octavia-ha.yaml` | `v3 -> elk-layered` | yes; apps/preview suite green |
| `preview-smoke.yaml` | `v3 -> elk-layered` | yes; apps/preview suite green |
| `support-engineering-flow.yaml` | `elk-rectpacking -> elk-force` | yes; used as FRAME_FIXTURE, persist tests override engine explicitly |

Gap: no committed render-fidelity regression asserting these engines lay out the
specific compound/container fixtures acceptably. Tracked by draft spec 057.

## Findings carried to AGENT-INBOX.md

- S3 stale routing-identity caveat in `AGENT-INBOX.md` (resolved but misleading).
- S3 no render-fidelity gate for authored engine flips (deferred to 057).
- S4 producer/guard helper duplication between override-model and save-payload.
- S4 `toOverridePayload` throws without bootstrap (legacy-only path, test-covered).

No correctness or architecture blockers in the range.
