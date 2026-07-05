# Implementation Plan: ELK sizing and interaction follow-up

## Technical Context

- Product path: Node + TypeScript.
- Authored source of truth: `scripts/diagrams/frames/*.yaml`.
- ELK layout authority:
  - `packages/layout-engine/src/elk-layout.ts`
  - `packages/graph-layout-elk/src/*`
  - `packages/graph-layout-core/src/graph-ir.ts`
- Preview interaction authority:
  - `packages/layout-engine/src/preview-shell/app-live-resize.ts`
  - `packages/layout-engine/src/preview-shell/app-resize-host.ts`
  - `packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts`
  - `packages/layout-engine/src/preview-shell/app-relayout-runtime.ts`
- Legacy JS files must remain adapters, not behavior owners.

## Architecture Direction

Fix ELK behavior in TypeScript at the owning layer:

- ELK sizing semantics belong in `elk-layout.ts` and adjacent tests.
- HarfBuzz/text remeasurement and live resize belong in typed preview-shell
  runtime owners.
- ELK option-surface and debug visibility belong in ELK/preview-engine typed
  owners.

Do not route fixes through `scripts/preview/editor.js`,
`scripts/preview/layout-bridge.js`, or new behavior-heavy JS.

## Implementation Phases

### Phase 1 - ELK Fill Sizing Contract

Add a focused regression for `request-to-hardware-stack`:

- apply `sizing_w: FILL` / `sizing_h: FILL` to `user`, `orch`, `runtime`,
  `kernel`, `driver`, and `hardware`
- compare the native semantic sizing contract to the ELK output
- assert the ELK lane preserves equal semantic sizes while retaining ELK rank
  and routing authority

Then adjust ELK sizing handoff:

- keep semantic sizes from `collectSemanticLayoutSnapshot(...)`
- avoid letting ELK compound expansion overwrite semantic Fill sizes for the
  author-facing frame when the native layout contract has equalized the peer
  set
- keep fixed sizes authoritative
- keep synthetic heading/body placements valid

### Phase 2 - Width Remeasurement And Live Resize

Trace manual width edit and resize flows through typed preview-shell owners.
Make live updates rerun HarfBuzz/text wrapping through the same final layout
path used on drop, preferably coalesced by RAF or an equivalent bounded update
mechanism.

### Phase 3 - Parent Text Inset Parity

Add a focused ELK vs v3 fixture for parent/headed text inset. Fix the owner in
`heading-synthesis.ts`, `layout.ts`, or `elk-layout.ts` depending on where the
drift originates.

### Phase 4 - ELK Option Surface And Debug View

Audit `ELK_LAYERED_PARAM_SPECS` and related save/UI surfaces. Keep inert or
implementation-owned options hidden. Add a contract test that fails if a new
ELK option is exposed without coverage.

Add structured debug data for:

- authored frame tree
- ELK input graph after selective flattening

Keep it debug-only and non-persistent.

## Validation

Use the narrowest targeted test first:

```bash
npm --prefix packages/layout-engine test -- elk-layout.test.ts
```

Then run owning packages after code changes:

```bash
npm --prefix packages/layout-engine test
npm --prefix packages/graph-layout-elk test
npm --prefix apps/preview test
node scripts/check_no_new_python.mjs
```

If browser exports used by preview JS change:

```bash
npm --prefix packages/layout-engine run build:browser
```

No Playwright screenshots unless explicitly requested.
