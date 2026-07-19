# Tasks: Figma-to-YAML Round Trip

## Phase 0 - Baseline audit

- [ ] T001 Record spec 079 tree shape, plugin-data keys, stable IDs, source
  identity, and refresh ownership in `research.md`.
- [ ] T002 Inventory canonical frame/arrow persistence, allowlists, coercion,
  comment preservation, and persist→reload tests.
- [ ] T003 Probe Figma Desktop/browser writable handles, permission restoration,
  downloads, and local-service access.
- [ ] T004 Capture a sanitized real-Figma component/autolayout fixture.
- [ ] T005 Decide the shared typed persistence owner.

## Phase 1 - Contracts and import baseline

- [ ] T010 Finalize change-set schema and positive/negative fixtures.
- [ ] T011 Finalize update-plan schema and conflict/write-mode fixtures.
- [ ] T012 Define typed property mappings for all v1 fields.
- [ ] T013 Define baseline, managed-node, and transaction receipt types.
- [ ] T014 Extend import to record hashes, engine, mapping version, normalized
  baseline, and managed YAML identities.
- [ ] T015 Add duplicate-document, stale-receipt, absent-baseline, and legacy
  import fixtures.

## Phase 2 - Figma capture lane

- [ ] T020 Implement managed-root discovery and ambiguous-root failure.
- [ ] T021 Scan managed nodes without treating wrappers/names as YAML identity.
- [ ] T022 Capture direction, gap, padding, sizing, fixed dimensions, eligible
  absolute position, and managed child order.
- [ ] T023 Categorize unsupported/unmanaged/structural/engine observations.
- [ ] T024 Prove no-op/noise stability and protect HUG/FILL dimensions.
- [ ] T025 Test malformed, detached, swapped, duplicated, and reparented nodes.

## Phase 3 - Shared persistence and merge lane

- [ ] T030 Expose canonical typed patching without copying allowlists/coercion.
- [ ] T031 Implement field-level baseline/YAML/Figma merge.
- [ ] T032 Implement non-overlap, convergence, divergent, delete/edit, and
  structural cases.
- [ ] T033 Patch YAML while preserving comments, unrelated data, and arrows.
- [ ] T034 Validate IDs, child order, sizing, engine, schema, and fresh layout.
- [ ] T035 Add no-op byte stability and representative persist→reload tests.

## Phase 4 - Service and file safety lane

- [ ] T040 Add bounded prepare/validate/apply handlers.
- [ ] T041 Add opaque receipts for approved repo YAML files.
- [ ] T042 Reject traversal, symlinks, wrong roots, stale hashes/plans, duplicate
  IDs, and unapproved extensions.
- [ ] T043 Add atomic replacement and read-back; preserve original on failure.
- [ ] T044 Add writable-handle mode where supported.
- [ ] T045 Add validated candidate download without baseline advancement.

## Phase 5 - Plugin UI and workflow lane

- [ ] T050 Add **Update YAML from Figma** separately from import/refresh.
- [ ] T051 Show hashes, operations, unsupported edits, conflicts, validation,
  and write mode.
- [ ] T052 Add explicit conflict resolution; no default last-writer-wins.
- [ ] T053 Recheck source/plan hashes at confirmation.
- [ ] T054 Store receipt and advance baseline after successful read-back.
- [ ] T055 Warn before refresh overwrites unsynced supported Figma edits.

## Phase 6 - Coverage expansion

- [ ] T060 Add deterministic title/helper capture through component properties.
- [ ] T061 Add stable icon capture or retain explicit unsupported status.
- [ ] T062 Define managed connector/arrow-ID prerequisite for waypoints.
- [ ] T063 Define ELK mapping gate and fail-closed tests.

## Phase 7 - Documentation and closeout

- [ ] T070 Update plugin README for update/conflict/mode/recovery workflows.
- [ ] T071 Add visual-designer quickstart and troubleshooting.
- [ ] T072 Run plugin, layout, persistence, file, secret/path, and diff gates.
- [ ] T073 Record live Figma supported/concurrent/unsupported/apply/reimport proof.
- [ ] T074 Obtain adversarial review, remediate, archive, merge, and clean up.

## Dependencies and parallel work

- T001–T005 define the baseline.
- T010–T015 freeze the contract.
- Capture, persistence/merge, service/file safety, and UI then run in parallel.
- T060–T063 follow v1 and cannot weaken it.
- T073/T074 require all P1 gates and live Figma.
