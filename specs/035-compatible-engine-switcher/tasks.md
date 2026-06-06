# Tasks: Compatible engine switcher

## Phase 1 - Compatibility contract

- [ ] T001 Define the typed compatibility contract each preview engine must expose
- [ ] T002 Decide the canonical persistence path for the selected engine
- [ ] T003 Record example compatibility matrices for current and near-term engines

## Phase 2 - Preview switcher

- [ ] T010 Add a manifest-driven engine switcher UI for compatible engines only
- [ ] T011 Rerender the current document through the selected engine without duplicating authored state
- [ ] T012 Add focused tests for hidden/disabled incompatible engines

## Phase 3 - Closeout

- [ ] T020 Document the contract for future engine lanes
- [ ] T021 Update repo tracking docs after implementation lands
- [ ] T022 Mark the spec complete only after compatibility filtering and persistence are validated