# Tasks: Preview engine drift closeout

## Phase 1 - Engine surface alignment

- [ ] T001 Define the single authoritative supported-engine surface
- [ ] T002 Either host `elk-force` cleanly or remove/fail-fast its premature acceptance path
- [ ] T003 Remove forbidden `localStorage` writes from the live preview path

## Phase 2 - Force save contract convergence

- [ ] T010 Return canonical persisted state from the force save endpoint
- [ ] T011 Rehydrate force preview from canonical save payloads instead of local-only authority
- [ ] T012 Add focused force save/reload regressions without widening scope into a controller rewrite

## Phase 3 - Compatibility groundwork and closeout

- [ ] T020 Add typed compatibility metadata/hooks to the preview-engine model
- [ ] T021 Add hostability/compatibility validation around manifest and runtime routing
- [ ] T022 Update repo tracking docs after focused validation is green
