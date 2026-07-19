# Feature Specification: Figma-to-YAML Round Trip

**Feature Branch**: `feat/082-figma-yaml-round-trip`  
**Created**: 2026-07-19  
**Status**: Draft  
**Depends on**: Spec 079 Figma component variant import  
**Input**: Take layout changes made during Figma designer finishing and
translate the supported subset safely back into canonical diagram YAML.

## Scope and product boundary

Spec 079 imports canonical YAML into native Figma component instances and
protects selected Figma-owned overrides during a later import. It does not read
Figma changes back into YAML. This spec adds that missing reverse path.

This is a guarded round trip, not a claim that every Figma edit has a YAML
equivalent. The plugin must identify managed nodes through stable IDs, compare
current Figma with an import baseline, separate supported changes from
Figma-only finishing, three-way merge with current YAML, preview conflicts and
operations, and validate/read back the YAML before advancing the baseline.

Canonical YAML remains the structural source of truth. Figma is an editable
finishing source for supported properties and an authoritative design artifact
for unsupported finishing. Both roles must be visible; silent
last-writer-wins is forbidden.

## User Scenarios & Testing

### User Story 1 - Apply supported Figma layout changes to YAML (Priority: P1)

After importing a YAML diagram and improving its layout in Figma, a visual
designer can choose **Update YAML from Figma**, review supported changes, and
write those changes back to the selected YAML.

**Independent Test**: Import an autolayout fixture, change container direction,
gap, padding, fixed size, child order, and one supported absolute position in
Figma, then update the YAML and prove a fresh generator render reproduces those
changes within the declared tolerance.

**Acceptance Scenarios**:

1. **Given** a managed Figma diagram with a valid baseline, **When** update is
   requested, **Then** the plugin lists supported changed fields by stable YAML
   node ID before writing.
2. **Given** supported changes and unchanged YAML, **When** the designer
   confirms, **Then** only corresponding canonical fields change.
3. **Given** no supported changes, **When** update is requested, **Then** the
   YAML is not rewritten.
4. **Given** a successful update, **When** the YAML is imported again, **Then**
   accepted supported Figma changes are not reverted.

---

### User Story 2 - Preserve unsupported designer finishing (Priority: P1)

A designer can retain effects, freeform composition, unmapped component
overrides, and unsupported connector edits in Figma without the plugin inventing
lossy YAML or claiming they were synchronized.

**Independent Test**: Make supported layout edits and unsupported visual edits,
then verify only supported edits become YAML operations and every unsupported
edit appears in a categorized report.

**Acceptance Scenarios**:

1. **Given** unsupported visual changes, **When** the plugin scans, **Then** it
   reports them as Figma-only and emits no approximate YAML.
2. **Given** unmanaged annotation nodes, **When** the plugin scans, **Then** they
   remain untouched and receive no false YAML identity.
3. **Given** a detached, ambiguously swapped, or structurally changed managed
   subtree, **When** update is requested, **Then** automatic update of that
   subtree is blocked with an actionable diagnostic.

---

### User Story 3 - Detect and resolve YAML/Figma conflicts (Priority: P1)

If YAML changed after the Figma import, the designer sees a three-way comparison
between baseline, current YAML, and current Figma.

**Independent Test**: Change different fields on each side and one same field
to different values. Verify non-overlapping edits merge, the overlapping field
conflicts, and no write occurs until resolution.

**Acceptance Scenarios**:

1. **Given** non-overlapping YAML and Figma changes, **When** a plan is prepared,
   **Then** an automatic field-level merge is proposed.
2. **Given** the same field changed differently on both sides, **When** a plan
   is prepared, **Then** it is a conflict and no implicit write occurs.
3. **Given** a deleted/reparented YAML node still present in Figma, **When**
   update is requested, **Then** explicit resolution is required.
4. **Given** the YAML hash changes after plan preparation, **When** apply is
   attempted, **Then** it is rejected and a new plan is required.

---

### User Story 4 - Update safely in different file environments (Priority: P2)

The workflow writes in place when it has a writable file handle or a
server-approved repository receipt. Otherwise it downloads a validated
candidate and clearly says the original was not changed.

**Independent Test**: Exercise writable-handle, guarded repository-write, and
download-only modes with the same update plan.

### User Story 5 - Extend coverage deliberately (Priority: P2)

Maintainers add a supported Figma/YAML property through one typed registry with
capture, normalization, conflict, patch, and equivalence tests.

## Supported v1 change matrix

| Figma change | Canonical YAML target | V1 status |
|---|---|---|
| Auto-layout direction | `direction` | Supported for managed layout owners |
| Item spacing | `gap` | Supported |
| Per-side padding | `padding_*` or canonical shorthand | Supported |
| Fixed width/height | `width`, `height`, `sizing_w`, `sizing_h` | Supported with explicit FIXED transition |
| Hug/fill mode | `sizing_w`, `sizing_h` | Supported only for legal parent/child combinations |
| Managed child reorder | `children_order` | Supported when every direct child has a stable YAML ID |
| Absolute managed-node move | `position`, `x`, `y` | Supported only for eligible absolute-position nodes |
| Title/helper text | existing canonical text field | P2 after deterministic component-property mapping |
| Icon substitution | canonical icon field | P2 after stable icon identity mapping |
| Component role/variant | `style`/`level` where lossless | P2; otherwise unsupported/conflict |
| Connector waypoints | arrow `waypoints` | Later, after managed connectors carry stable arrow IDs |
| Add/delete/reparent semantic nodes | YAML tree | Not v1; explicit conflict/report |
| Effects, arbitrary transforms/colour | none | Figma-only unless separately mapped |
| Unmanaged annotations | none | Preserved and excluded |

ELK diagrams require an engine-specific mapping into the existing namespaced
engine-layout override contract. V1 fails closed where no reviewed mapping
exists; it must not write v3/autolayout fields and imply ELK parity.

## Requirements

### Functional Requirements

- **FR-001**: The plugin MUST expose **Update YAML from Figma** separately from
  import/refresh; import MUST NOT silently write source.
- **FR-002**: Managed roots/nodes MUST carry versioned metadata for diagram ID,
  YAML node ID, representation, engine, mapping version, baseline supported
  state, and baseline source hash.
- **FR-003**: Stable YAML IDs—not Figma node IDs, names, or scene order—MUST
  identify update targets.
- **FR-004**: Scanning MUST stay inside the managed root and distinguish
  semantic nodes, structural nodes, connectors, and unmanaged content.
- **FR-005**: The updater MUST compute supported deltas against the last
  accepted baseline; it MUST NOT serialize the computed Figma scene wholesale.
- **FR-006**: One typed registry MUST declare each property reader,
  normalization/tolerance, YAML target, representation/engine applicability,
  conflict semantics, and equivalence validator.
- **FR-007**: The registry MUST consume existing YAML persistence allowlists and
  coercion rules; it MUST NOT duplicate `PERSIST_FRAME_KEYS`, integer/lowercase
  coercion, child-order validation, or arrow rules.
- **FR-008**: V1 MUST implement the matrix above for autolayout/component
  imports and fail closed for unmapped engine/representation combinations.
- **FR-009**: `children_order` MUST contain only uniquely resolved direct YAML
  children, never slots, wrappers, or component internals.
- **FR-010**: Movement in auto-layout becomes child order or remains Figma-only.
  `x`/`y` are emitted only for YAML nodes eligible for absolute positioning.
- **FR-011**: Fixed resizing MUST update sizing mode and dimensions. Computed
  HUG/FILL dimensions MUST NOT become authored fixed dimensions.
- **FR-012**: Figma values MUST use explicit tolerance, integer rounding, enum
  mapping, and shorthand normalization to avoid meaningless YAML churn.
- **FR-013**: Unsupported edits MUST be categorized as Figma-only, unmanaged,
  ambiguous, structurally conflicting, or engine-unsupported.
- **FR-014**: The system MUST three-way merge import/sync baseline, current
  YAML, and current Figma at field granularity.
- **FR-015**: Non-overlapping changes MAY merge automatically. Divergent
  same-field edits, delete/edit, ambiguous identity, and structural changes
  MUST require explicit resolution.
- **FR-016**: Before confirmation, show source identity/hash, operations,
  conflicts, unsupported edits, validation, and expected write mode.
- **FR-017**: Preparing/previewing an update MUST mutate neither source.
- **FR-018**: A typed local prepare/validate/apply boundary MUST validate schema,
  hashes, allowed roots, IDs, allowlists, engine applicability, and payload size.
- **FR-019**: Repository writes MUST be confined to configured YAML roots,
  reject traversal/symlinks, require current source/plan hashes, use atomic
  replacement, and return read-back content/hash.
- **FR-020**: Without a safe in-place route, emit a validated
  `<name>.figma-updated.yaml` download and state the original is unchanged.
- **FR-021**: Patching MUST preserve comments, unrelated nodes, metadata,
  arrows, and unknown supported fields except for selected canonical changes.
- **FR-022**: Before write, the candidate MUST parse, pass persistence/schema
  validation, lay out with its declared engine, and retain referenced IDs.
- **FR-023**: After write, read back, hash, regenerate a payload, and compare
  supported state with accepted Figma changes within tolerance.
- **FR-024**: Advance the baseline only after successful write/read-back;
  failed or download-only operations MUST NOT claim in-place sync.
- **FR-025**: Store a receipt with old/new hashes, mapping version, accepted
  operations, conflict resolutions, mode, timestamp, and source identity—never
  YAML content or credentials.
- **FR-026**: Refresh MUST warn before overwriting unsynced supported Figma
  edits since the baseline.
- **FR-027**: Tests MUST cover no-op, noise, supported delta, non-overlap,
  same-field conflict, delete/reparent ambiguity, unsupported edits, stale
  plan/hash, unsafe path, atomic failure, download, and persist→reload.
- **FR-028**: Product logic MUST be TypeScript/Node in typed owners. No new
  behavior-heavy `scripts/preview/` logic.

### Non-Goals

- Full arbitrary-Figma-to-YAML serialization.
- Treating Figma as the unconditional source of truth.
- Automatic semantic add/delete/reparent in v1.
- Last-writer-wins conflict resolution.
- ELK parity before engine-specific equivalence tests.
- Waypoint capture before stable canonical arrow IDs exist in Figma.
- Syncing unmanaged finishing or arbitrary component internals.

## Key Entities

- **RoundTripBaseline**: Last accepted common YAML/Figma supported state.
- **ManagedNodeReceipt**: Stable YAML identity and Figma locator/mapping.
- **FigmaChangeSet**: Supported deltas plus unsupported observations.
- **YamlUpdatePlan**: Three-way merge result, conflicts, validation, and modes.
- **PropertyMapping**: Typed Figma-to-YAML field mapping.
- **SyncTransactionReceipt**: Auditable apply result.

## Success Criteria

- **SC-001**: Direction, gap, padding, fixed sizing, legal HUG/FILL, direct
  child order, and eligible absolute positions round-trip through fresh import.
- **SC-002**: No-op/sub-tolerance noise creates byte-identical YAML.
- **SC-003**: Non-overlap merges; every divergent same-field edit conflicts.
- **SC-004**: Unsupported finishing remains in Figma with no invented YAML.
- **SC-005**: Stale hashes, unsafe paths, ambiguous IDs, and invalid candidates
  block writes before source changes.
- **SC-006**: Successful writes pass parse, layout, persist→reload, and
  supported-state equivalence and advance the baseline.
- **SC-007**: One plan contract supports handle, guarded repo, and download.
- **SC-008**: New mappings require capture, normalization, conflict,
  persistence, and fresh-import equivalence fixtures.

## Edge Cases

- An instance is detached, swapped, duplicated, or moved out of the managed root.
- Figma computes new HUG/FILL dimensions without an authored sizing change.
- Child order passes through an intermediate slot/body wrapper.
- YAML IDs were renamed, duplicated, deleted, or reparented.
- A same-named but unrelated YAML file is selected.
- A copied Figma document contains stale baseline metadata.
- A downloaded candidate was never installed.
- Write succeeds but read-back/layout fails.
- Git/agent/preview changes YAML after plan preparation.
- An ELK-derived change has no engine mapping.

## Assumptions

- First supported route is spec 079 autolayout/component instances.
- Bounded metadata fits on managed roots/nodes; larger baselines may live in the
  local service behind opaque receipts.
- File System Access capabilities vary, so guarded local writes and download
  remain required.
- Existing YAML persistence can be exposed through a shared typed owner instead
  of copied.
