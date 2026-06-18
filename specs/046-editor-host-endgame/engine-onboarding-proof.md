# Engine Onboarding Proof

Spec 046 closeout proof for the browser shell.

## What 046 changed

- `scripts/preview/editor.js` no longer names `ElkPreviewController` directly for bootstrap, save, or relayout-mode decisions.
- The grid shell now resolves engine-specific panel/save behavior through typed preview-shell owners in `packages/layout-engine/src/preview-shell/app-bootstrap.ts`.
- The bootstrap tail now enters that owner through `previewShell.bootstrap.bootstrapPreviewEditorRuntime(...)`, so `editor.js` no longer hand-assembles host-only save/toolbar/SSE/build-status wiring inline.
- Engine-local browser hooks now have a generic registration point:
  - `PreviewEngineShellController`
  - `previewShell.bootstrap.ensurePreviewEngineShellController(...)`
  - `previewShell.bootstrap.isPreviewEngineShellLayoutActive(...)`
  - `previewShell.bootstrap.initPreviewEngineShellPanel(...)`
  - `previewShell.bootstrap.collectPreviewEngineSavePayload(...)`
- The current ELK implementation is now an engine-local adapter in `scripts/preview/elk-controller.js` that conforms to that generic shell-controller seam while preserving the old `ElkPreviewController` alias for compatibility.

## Typed onboarding path

For an engine that reuses an existing shell tier, the browser-shell answer must start here:

1. Add or extend the engine manifest in `packages/layout-engine/src/preview-engine/registry.ts`.
2. Use manifest capabilities and shell mode to choose an existing lane when possible.
3. If the engine needs browser-side panel/save hooks, provide an engine-local shell controller adapter rather than editing `editor.js`.
4. If a new host lane is truly required, register it in the preview-host owners under `apps/preview/src/preview-host/`.

The answer must not start with `scripts/preview/editor.js`.

## Representative engine classes

### External dependency-backed engine

Example: another graph library in the ELK family of needs.

- Reuse the grid shell when inspector/selection behavior still applies.
- Register the engine manifest and scripts through `preview-engine`.
- Provide an engine-local shell controller adapter for panel/save hooks.
- Do not add new engine-name branches to `editor.js`.

### Ported diagram-family engine

Example: Mermaid-derived diagram types.

- Prefer a typed renderer/host registration under `preview-engine` and preview-host owners.
- Reuse `grid` or `sequence` shell tiers when the interaction model matches.
- If the engine does not need grid-shell interaction, route it through a dedicated host lane instead of widening `editor.js`.
- The browser-shell seam is now test-backed with a representative non-ELK controller in `packages/layout-engine/tests/app-bootstrap.test.ts` (`mermaid-flowchart`).

### Bespoke in-house engine

- Start from manifest + capability registration.
- Reuse the closest shell tier.
- Add engine-local adapters in TypeScript or thin engine-local shell glue only when a tier-specific hook is genuinely required.
- The same test file now exercises a bespoke representative controller (`bespoke-grid`) through the generic bootstrap/save/panel seam without any `editor.js` changes.

## Test-backed proof

- External dependency-backed class: live ELK adapter in `scripts/preview/elk-controller.js`, covered by `packages/layout-engine/tests/app-bootstrap.test.ts` and `apps/preview/src/persistence/engine-contract-consumers.test.ts`.
- Ported diagram-family class: representative `mermaid-flowchart` controller exercised in `packages/layout-engine/tests/app-bootstrap.test.ts`.
- Bespoke in-house class: representative `bespoke-grid` controller exercised in `packages/layout-engine/tests/app-bootstrap.test.ts`.

This is still a browser-shell proof, not a claim that Mermaid or D2 product lanes are fully launched.

## Acceptance answers

### Can a future engine reuse the shell without editing `editor.js`?

Yes structurally for bootstrap, save-path, and shell-controller wiring.

The active engine now enters the grid shell through the typed `PreviewEngineShellController` seam rather than through direct ELK calls in `editor.js`.

That is not enough to close spec 046 by itself: `editor.js` still carries a
large callback-assembly surface, so the file does not yet read like obvious
bootstrap-only glue.

### Can a future engine onboarding start from typed registration points?

Yes for the preview-shell portion.

Cold-start answer:

1. `preview-engine/registry.ts`
2. preview-host lane registration only if needed
3. typed preview-shell owner or engine-local controller adapter

Not:

1. `scripts/preview/editor.js`

But the full 150-engine browser answer is still provisional. The branch now
proves the three-class browser-shell path with test-backed representative
controllers, and the registration path no longer starts in the legacy JS sink
files. Spec 046 still remains open because the residual host is not yet thin
enough to satisfy the closeout bar.

## Honest veto

Spec 046 does **not** get to ignore `layout-bridge.js`.

- `editor.js` is no longer the default engine-onboarding sink for preview-shell work.
- `layout-bridge.js` no longer owns bridge state, text-adapter readiness, or
  local-vs-ELK relayout dispatch; those now enter through
  `previewBridge.host` and `app-layout-bridge-runtime.ts`.
- The remaining bridge risk is narrower: compatibility wrappers and the growing
  browser-entry / preview-shell barrel cold-start surface still need cleanup
  under spec 044, but ELK debug/raw-view DOM ownership no longer lives inline
  in the JS façade.

Honest answer today:

- **Preview-shell / editor path**: structurally green for future engine
  onboarding. Engine panel/save/bootstrap work should not start in `editor.js`.
- **Three-class browser-shell proof**: green at the shell-contract level. ELK,
  representative Mermaid-family, and representative bespoke controllers now
  pass through the same typed bootstrap/panel/save seam in tests.
- **Full 150-engine browser answer**: not yet unconditional green. The answer
  now starts in typed registration points (`preview-engine`, preview-host lane
  registration when needed, and typed shell owners), not in the legacy JS trap
  files, but spec 046 still fails the thin-host closeout bar.
