# Veto Removal Plan

> Execution note (2026-06-22): the veto described in this file has now been
> removed on `feat/046-editor-host-endgame`. Keep this document as historical
> context for how the closeout bar was cleared; the current verdict now lives
> in [tasks.md](./tasks.md) and `AGENT-INBOX.md`.

Execution plan for removing spec 046's honest-closeout veto.

This repo now passes important builtin host/document/render/persistence seams,
but spec 046 remains open until the answer to "can we add 50, 150, and 500
engines without widening the legacy browser shell?" is honestly **yes**.

Document-family registry closure and a real Mermaid-lite, D2-lite, or
Dagre-lite install proof still block closeout.

This document lists the remaining work needed to get there in dependency order.
The detailed implementation architecture lives in
[remaining-implementation-plan.md](./remaining-implementation-plan.md).

## Current honest answer

Not yet.

Why not:

1. `editor.js` is still a large coordinator with too much option-bag assembly
   and callback/runtime wiring
2. `layout-bridge.js` is still ELK/debug/global shaped rather than a generic
   engine capability adapter
3. `V3` and `ELK` vocabulary still leaks across typed owners, tests, and compat
   surfaces more broadly than the final many-engine platform should allow
4. document-family onboarding still has central detection and engine-resolution
   stop points
5. builtin install is still more central-list based than package-install based
6. the large TypeScript barrels and oversized contract harnesses are still a
   latent replacement-monolith risk
7. no real Mermaid-lite, D2-lite, or Dagre-lite install proof exists yet that
   traverses the full typed path without touching legacy JS sinks or central
   document-kind branches

## Planning rules

1. No new behavior-heavy JS under `scripts/preview/`.
2. Each phase must remove a real many-engine blocker, not just rename code.
3. Compatibility aliases may remain temporarily, but they must no longer be the
   primary vocabulary or the primary registration surface.
4. If a phase would widen `editor.js`, `layout-bridge.js`, or central preview
   host files, redesign the phase before coding it.

## Remaining blockers

| Blocker | Evidence in current tree | Required end state |
|--------|---------------------------|--------------------|
| `editor.js` still reads like a coordinator | the file is still 1,601 physical lines with too much option-bag assembly, callback shaping, and repo-local runtime glue | reduce it to a thin browser adapter around one typed installer and compat adapter |
| `layout-bridge.js` still reads ELK/debug/global shaped | the file is still 395 physical lines and still exposes ELK-shaped raw/debug/runtime concepts in the primary bridge path | reduce it to a generic engine capability adapter with ELK aliases at the boundary only |
| Document-family onboarding is not registry-closed | central helpers such as `determineFrameYamlKind` and `resolveFramePreviewEngineResolution` still own family detection and engine resolution | handlers own `match`, `parse`, and `resolve` so document kinds stop branching centrally |
| Builtin install is documented but not yet proven against a foreign-shaped engine | `install-unit-pattern.md` describes the desired shape, but the current real proof is still close to builtin families | land a skeletal Mermaid-lite, D2-lite, or Dagre-lite install unit that exercises the full path without central edits |
| TypeScript still risks becoming the replacement monolith | `browser-entry.ts`, `preview-shell/index.ts`, and `engine-contract-consumers.test.ts` are all still very large | split contracts, barrels, and harnesses by owner/capability family |
| The substrate is still too ELK-shaped | graph-layout-core and adjacent contracts still imply ELK-first semantics for some size/port/constraint concerns | make the substrate engine-open enough for Mermaid, D2, Dagre, and other families |

## Ordered phases

### Phase A - `editor.js` adapter cutover

Goal: reduce `editor.js` to browser bootstrap and compat wiring only.

Authoritative architecture: Workstream A in
[remaining-implementation-plan.md](./remaining-implementation-plan.md).

### Phase B - `layout-bridge.js` adapter and capability cleanup

Goal: reduce `layout-bridge.js` to generic bridge/runtime bootstrap plus compat
aliases only.

Authoritative architecture: Workstream B in
[remaining-implementation-plan.md](./remaining-implementation-plan.md).

### Phase C - Document-family registry closure

Goal: move document-family detection, parse, resolve, save, and export authority
behind handlers rather than central helpers.

Authoritative architecture: Workstream C in
[remaining-implementation-plan.md](./remaining-implementation-plan.md).

### Phase D - Real install-unit proof

Goal: prove the package-first architecture with a skeletal Mermaid-lite,
D2-lite, or Dagre-lite install unit.

Authoritative architecture: Workstream D in
[remaining-implementation-plan.md](./remaining-implementation-plan.md).

### Phase E - Barrel and harness split

Goal: stop `browser-entry.ts`, `preview-shell/index.ts`, and the VM harness from
becoming the replacement monolith.

Authoritative architecture: Workstream E in
[remaining-implementation-plan.md](./remaining-implementation-plan.md).

### Phase F - Algorithm substrate readiness

Goal: make the substrate engine-open enough for Mermaid, D2, Dagre, and other
non-ELK families.

Authoritative architecture: Workstream F in
[remaining-implementation-plan.md](./remaining-implementation-plan.md).

### Phase G - Honest closeout audit

Goal: rerun the adversarial closeout audit only after phases A-F land.

Authoritative architecture: final review prompts and acceptance checklist in
[remaining-implementation-plan.md](./remaining-implementation-plan.md).

## Immediate execution order

The next implementation batch should stay on **Phase A** until `editor.js`
stops reading like the default coordinator.

Reason:

- the biggest remaining sink risk is still concentrated in `editor.js`
- `layout-bridge.js`, document-family closure, and install-proof work depend on
  the adapter boundaries becoming explicit
- the final audit is not honest until the adapter cutover and follow-on proof
  work are done

## Validation expectations

After each phase, run the narrowest honest batch that proves the architectural
contract:

- `npm --prefix packages/layout-engine test`
- `npm --prefix apps/preview test`
- `npm --prefix apps/preview run build`
- `npm --prefix packages/layout-engine run build:browser` when browser exports change
- `node scripts/check_no_new_python.mjs`
