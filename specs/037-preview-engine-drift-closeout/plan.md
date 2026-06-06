# Plan: Preview engine drift closeout

## Phase 1 - Engine surface alignment

- decide the single authority for supported engine ids across schema, loader, manifest, and runtime
- either host `elk-force` cleanly or remove/fail-fast its premature acceptance surface
- remove forbidden `localStorage` usage from the live preview path

## Phase 2 - Force save contract convergence

- return canonical persisted state from force save
- thread canonical save payloads back through the force preview reload path
- keep the implementation bounded to save/shell authority work rather than a broad force rewrite

## Phase 3 - Compatibility groundwork and validation

- add typed compatibility data/hooks to the preview-engine model as groundwork for spec 035
- add focused tests for engine-id hostability, compatibility, and save-contract behavior
- update repo tracking/docs once the drift surface is closed
