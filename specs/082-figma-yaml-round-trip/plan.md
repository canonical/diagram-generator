# Implementation Plan: Figma-to-YAML Round Trip

**Branch**: `feat/082-figma-yaml-round-trip` | **Date**: 2026-07-19  
**Spec**: [`spec.md`](spec.md)

## Summary

Import records a versioned baseline and stable managed-node receipts. The plugin
scans current managed Figma state, normalizes only declared properties, and
sends a change set plus current YAML to a typed local service. The service
reuses canonical persistence rules, performs a field-level three-way merge,
validates a candidate, presents a non-mutating plan, and applies it only through
a safe write route after confirmation.

## Technical Context

**Language/Version**: TypeScript, Node.js 20+, Figma Plugin API  
**Primary Dependencies**: `apps/figma-plugin`, frame YAML loader/persistence,
layout engine, YAML document library, existing build/test tooling  
**Storage**: Shared plugin data for bounded receipts; local service for larger
baselines; YAML remains canonical  
**Testing**: Unit/fixture/property tests, dev-server integration, fake Figma,
persist→reload, file-mode probes, and live Figma evidence  
**Constraints**: Explicit confirmation, no path/secret leakage, no duplicated
persistence rules, no Python product logic

## Constitution Check

- [x] Branch/package share ID 082.
- [x] Spec 079 remains the import dependency.
- [x] Authority is bounded per property.
- [x] Existing persistence allowlists remain the single source.
- [x] Persist→reload is a closeout gate.
- [x] Product logic is TypeScript/Node.
- [x] External writes require confirmation and current hashes.
- [x] Unsupported changes fail visibly.

## Architecture

```text
YAML import
   -> payload + baseline + managed-node receipts
   -> Figma designer edits
   -> typed Figma scanner -> unsupported report
   -> normalized FigmaChangeSet
   -> baseline + current YAML
   -> three-way merge + canonical YAML patch
   -> YamlUpdatePlan
   -> user resolve/confirm
      -> writable handle | guarded repo write | candidate download
   -> read-back + fresh-layout equivalence
   -> advance baseline + receipt
```

## Proposed ownership

| Owner | Responsibility |
|---|---|
| `packages/layout-engine` or small shared typed persistence package | Canonical patch allowlists/coercion, document preservation, validation |
| `apps/figma-plugin/src/round-trip/` | Scan, normalization, baseline/receipt bridge |
| Figma local service via extracted handlers | Prepare/apply, allowed roots, atomic write/read-back |
| Plugin UI | Update action, plan/conflicts, confirmation, handle/download |

Phase 0 chooses the smallest shared persistence owner. Do not import app-private
preview code or copy its key lists.

## Core decisions

### Baseline

Store diagram/source identity, source and supported-state hashes, mapping/schema
versions, engine, and per-managed-node YAML identity, representation, parent/
child identity, locator, and normalized field baseline.

### Delta capture

Read managed nodes and declared mappings only. Normalize computed noise. Emit
supported operations and unsupported observations, never a scene serialization.

### Three-way merge

For each `<nodeId, field>`: baseline is last accepted value, source is current
YAML, and Figma is current normalized state. Only-Figma changes are proposed;
only-YAML changes are preserved; equal changes converge; divergent changes
conflict. Structural identity changes conflict.

### Write modes

1. Writable handle if the Figma context grants permission.
2. Opaque source receipt for an allowed repo file.
3. Candidate download, with no in-place-sync claim.

## Parallel implementation lanes

After the Phase 1 contract gate:

| Lane | Owns | Avoids |
|---|---|---|
| A — shared persistence | patch/merge/validation core | Figma API/UI |
| B — Figma scanner | receipts, capture, normalization, unsupported report | disk writes |
| C — service/file safety | endpoints, source receipts, atomic write/read-back | scene traversal |
| D — UI/workflow | plan, conflicts, confirmation, handle/download | persistence semantics |
| E — evidence/docs | live fixtures, support matrix, registry receipts | product logic |

## Phases

1. Audit spec 079 tree/metadata, persistence, file APIs, and source identity.
2. Freeze contracts, property mappings, receipts, tolerances, and import baseline.
3. Implement capture and a non-mutating report.
4. Implement merge, canonical patch, and candidate validation.
5. Implement write modes, read-back, equivalence, and receipts.
6. Add refresh protection, live proof, docs, and adversarial review.

## Validation gates

1. Contract/mapping fixtures pass.
2. Existing spec 079 tests remain green.
3. No-op produces byte-identical YAML.
4. V1 matrix passes merge and persist→reload.
5. Unsupported edits never become operations.
6. Stale/unsafe writes block.
7. Comments/unrelated YAML survive.
8. Fresh payload matches accepted supported Figma state.
9. Refresh warns on unsynced supported edits.
10. Live Figma evidence and adversarial review close.

## Risks

- Computed geometry appears authored: sizing-aware capture and tolerance.
- Figma wrappers leak into YAML: stable managed YAML IDs only.
- Source cannot be located safely: explicit selection/receipt/download.
- Persistence rules fork: extract/reuse typed owner before apply.
- Concurrent edits are lost: three-way merge and apply-time hashes.
- ELK is overclaimed: scoped mapping and fail-closed default.
