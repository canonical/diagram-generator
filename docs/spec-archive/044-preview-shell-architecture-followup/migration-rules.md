# Preview Shell Migration Rules

Operational rules for browser-surface changes during spec 044.

## Default rule

If a new browser-facing helper is needed, do **not** add it as another free `LayoutEngine.*` export by default.

Choose an owner first:

- `LayoutEngine.core`
- `LayoutEngine.previewShell.bootstrap`
- `LayoutEngine.previewShell.inspector`
- `LayoutEngine.previewShell.interaction`
- `LayoutEngine.previewShell.scene`
- `LayoutEngine.previewBridge`
- `LayoutEngine.previewEngines`

## Rules for new work

1. New preview-shell browser helpers must land behind a concern namespace in the 044 contract docs before they are wired into consumers.
2. If a helper is consumed only by `layout-bridge.js`, route it through `previewBridge`, not `previewShell`.
3. If a helper is engine-specific, route it through `previewEngines`, not generic shell buckets.
4. Root-level `LayoutEngine.*` exports may remain temporarily for compatibility, but they are migration shims, not the target architecture.
5. Update the owning spec doc when a new namespace bucket is introduced or widened materially.

## Consumer migration order

1. `editor.js`
   Reason: most visible call-site count and the best signal for whether the contract is coherent.
2. `layout-bridge.js`
   Reason: most dangerous trap file and the main bridge ownership problem.
3. engine-owned browser code
   Reason: depends on the generic shell/bridge contract being stable first.

## Compatibility policy

- Preserve `window.LayoutEngine` during the migration.
- Prefer nested namespace aliases before destructive removal.
- Remove flat aliases only after the owning trap-file consumer is migrated and verified.

## Pilots landed so far

- `editor-state.js` proves a thin shell consumer can depend on `previewShell.bootstrap` without root aliases.
- `editor.js` now routes scene-owned helpers through `previewShell.scene` and inspector/text-edit helpers through `previewShell.inspector`.
- `editor.js` now routes bootstrap/load helpers through `previewShell.bootstrap`.
- `elk-layout-controls.js` and `elk-controller.js` prove engine-owned ELK browser helpers can resolve through `previewEngines`.
- `force.js` now resolves engine metadata and force runtime helpers through `previewEngines` first, while retaining the flat fallback.
- `editor.js` now routes bridge-owned restore/relayout/render helpers through `previewBridge` first, while keeping the flat fallback.
- `layout-bridge.js` now routes override-entry normalization through `previewBridge.relayout`, establishing the first direct bridge-file dependency on the staged contract.

## Shared browser shims

- The shell now resolves `previewBridge.*` and `previewShell.*` contracts through shared getters in `scripts/preview/editor-base.js`.
- Prefer extending those shared shims over duplicating namespace-resolution helpers in `editor.js`, `layout-bridge.js`, or engine-owned browser files.

## Inspector action routing decision (T012)

Decision: **do not build a typed inspector action registry yet** as part of the design-only phase.

Reason:

- current switch blocks are bounded and tested
- 044 should first establish the higher-level browser contract
- if inspector routing grows again, the registry should land as a pilot under `previewShell.inspector`, not as an isolated side project

Trigger to reopen this decision:

- new inspector action families start adding more switch branches in `editor.js`
- delegated action routing needs engine-owned extensibility
- browser contract migration reaches the inspector namespace and the switch becomes the clear last monolithic hotspot
