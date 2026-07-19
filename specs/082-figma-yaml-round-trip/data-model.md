# Data Model: Figma-to-YAML Round Trip

## RoundTripBaseline

Records schema version, stable diagram/document/source receipt identities,
source and supported-state hashes, engine, representation, mapping version, and
managed-node baselines.

## ManagedNodeReceipt

Records canonical `yamlNodeId`, current Figma locator, semantic/structural/
connector kind, parent/direct-child YAML IDs, representation, and normalized
mapped fields. Figma node IDs are locators only.

## PropertyMapping

One typed record per supported field:

- mapping/version and applicable engine/representation;
- Figma reader and normalization/tolerance;
- canonical YAML target/coercion;
- prerequisites such as absolute-position eligibility;
- conflict comparison and equivalence probe.

It references canonical persistence keys rather than redefining them.

## FigmaChangeSet

Contains baseline/diagram/mapping identities, normalized field changes keyed by
YAML node ID, structural observations, and unsupported/unmanaged observations.
It contains no writable filesystem path or credential.

## YamlUpdatePlan

Contains base/current/plan/candidate hashes, proposed operations, preserved YAML
changes, conflicts and allowed resolutions, unsupported observations, candidate
validation/equivalence, and eligible write modes.

## SyncTransactionReceipt

Records old/new hashes, accepted operations, versions, conflict choices, write
mode/result, validation summary, and time. Download-only is a candidate receipt,
not successful in-place sync, and does not advance the baseline.

## Three-way merge

| YAML vs baseline | Figma vs baseline | Result |
|---|---|---|
| same | same | no-op |
| same | changed | propose Figma |
| changed | same | preserve YAML |
| changed to X | changed to X | converged |
| changed to X | changed to Y | conflict |
| deleted/reparented | changed | structural conflict |

## Invariants

1. Every automatic operation targets an existing stable YAML node/field.
2. A Figma locator is never write authority.
3. Apply requires matching source and plan hashes.
4. Unsupported observations cannot become operations.
5. Computed dimensions cannot imply FIXED.
6. Child order contains direct YAML children only.
7. Baseline advancement requires write read-back and equivalence.
