# Tasks: Compatible engine switcher

## Phase 1 - Compatibility contract

- [x] T001 Define the typed compatibility contract each preview engine must expose
  - Extended `PreviewEngineCompatibility` with `description`
  - Added `CompatibilityResult` type
  - Added `evaluatePreviewEngineCompatibility()` with detailed reasons
  - Added `listPreviewEnginesWithCompatibility()` for switcher UI
  - All engines now have human-readable descriptions
  - AST-shape predicates prototyped then removed (YAGNI — no consumer); reintroduce
    only when a real engine needs structural gating beyond document kind
  - Tests: 11/11 pass in `preview-engine-registry.test.ts`
- [x] T002 Decide the canonical persistence path for the selected engine
  - Engine choice persists as `meta.layout_engine` in frame YAML
  - Added `layout_engine` field to `PersistOverridePayload`
  - Added `applyLayoutEngineChoice()` helper in persistence layer
  - Supports set, update, and clear (null) operations
  - Server `/api/overrides/{slug}` rejects a persisted `layout_engine` that is not a
    hostable grid engine (compatibility gate at the write boundary)
  - Tests: 11/11 pass in `frame-diagram.test.ts` (4 new spec 035 tests)
- [x] T003 Record example compatibility matrices for current and near-term engines
  - Current-engine matrix recorded in `plan.md`
  - Near-term matrix recorded as aspirational only: those document kinds are NOT yet
    representable until `PreviewDocumentKind` is widened (documented in `plan.md`)


## Phase 2 - Preview switcher

- [ ] T010 Add a manifest-driven engine switcher UI for compatible engines only
- [ ] T011 Rerender the current document through the selected engine without duplicating authored state
- [ ] T012 Add focused tests for hidden/disabled incompatible engines

## Phase 3 - Closeout

- [ ] T020 Document the contract for future engine lanes
- [ ] T021 Update repo tracking docs after implementation lands
- [ ] T022 Mark the spec complete only after compatibility filtering and persistence are validated
